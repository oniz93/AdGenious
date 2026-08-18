import { Ad } from '../models/Ad';
import { AdSet } from '../models/AdSet';
import { Campaign, CampaignDocument, ICampaign } from '../models/Campaign';
import { UserDocument } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { getMetaClientForUser } from './meta';

function formatMetaTime(value?: string): string | undefined {
  if (!value) return undefined;
  // If the frontend only supplied a date, convert it to an ISO timestamp.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00+0000`;
  }
  return value;
}

function normalizeOptimizationGoal(goal: string): string {
  // Conversions require a pixel/offline event set; fall back to link clicks
  // when the wizard has not configured a pixel yet.
  if (goal === 'CONVERSIONS' || goal === 'VALUE') {
    return 'LINK_CLICKS';
  }
  return goal;
}

function mapMetaStatus(status?: string): ICampaign['status'] {
  switch (status) {
    case 'ACTIVE':
      return 'active';
    case 'PAUSED':
      return 'paused';
    case 'IN_PROCESS':
    case 'PENDING_REVIEW':
      return 'launching';
    case 'WITH_ISSUES':
    case 'DISAPPROVED':
      return 'error';
    case 'DELETED':
    case 'ARCHIVED':
      return 'archived';
    default:
      return 'launching';
  }
}

export async function launchCampaign(user: UserDocument, campaign: CampaignDocument) {
  if (campaign.status === 'active' || campaign.status === 'launching') {
    throw ApiError.conflict('Campaign is already launching or active');
  }
  if (!user.selectedAdAccountId) {
    throw ApiError.badRequest('Select an ad account before launching. Visit Settings → Meta connection.');
  }

  const client = await getMetaClientForUser(user);
  const adAccountId = user.selectedAdAccountId;

  try {
    if (!campaign.metaCampaignId) {
      const metaCampaign = await client.createCampaign(adAccountId, campaign.name, campaign.objective, 'PAUSED');
      campaign.metaCampaignId = metaCampaign.id;
      campaign.status = 'launching';
      await campaign.save();
    }

    const pages = await client.getPages();
    const pageId = pages[0]?.id;
    if (!pageId) {
      throw ApiError.badRequest('No Facebook page found. Create a page and connect it to your Facebook account.');
    }

    const adSets = await AdSet.find({ campaignId: campaign._id, status: { $ne: 'archived' } });
    for (const adSet of adSets) {
      if (!adSet.metaAdSetId) {
        const metaAdSet = await client.createAdSet(adAccountId, {
          name: adSet.name,
          campaignId: campaign.metaCampaignId,
          targeting: adSet.targeting,
          optimizationGoal: normalizeOptimizationGoal(adSet.optimizationGoal),
          billingEvent: adSet.billingEvent,
          dailyBudgetCents: adSet.dailyBudgetCents ?? campaign.dailyBudgetCents,
          lifetimeBudgetCents: adSet.lifetimeBudgetCents ?? campaign.lifetimeBudgetCents,
          startTime: formatMetaTime(adSet.startTime ?? campaign.startTime),
          endTime: formatMetaTime(adSet.endTime ?? campaign.endTime),
          status: 'PAUSED',
        });
        adSet.metaAdSetId = metaAdSet.id;
        adSet.status = 'launching';
        adSet.metaError = undefined;
        await adSet.save();
      }

      const ads = await Ad.find({ adSetId: adSet._id, status: { $ne: 'archived' } });
      for (const ad of ads) {
        if (!ad.metaAdId) {
          let imageHash = ad.creative.imageHash;
          if (!imageHash && ad.creative.imageUrl) {
            const uploaded = await client.uploadImageFromUrl(adAccountId, ad.creative.imageUrl);
            imageHash = uploaded.hash;
            ad.creative.imageHash = imageHash;
          }

          const metaCreative = await client.createAdCreative(adAccountId, {
            name: ad.name,
            pageId,
            message: ad.creative.message,
            linkUrl: ad.creative.linkUrl,
            imageHash,
            headline: ad.creative.headline,
            description: ad.creative.description,
            callToAction: ad.creative.callToAction,
          });

          const metaAd = await client.createAd(adAccountId, {
            name: ad.name,
            adSetId: adSet.metaAdSetId,
            creativeId: metaCreative.id,
            status: 'PAUSED',
          });

          ad.metaAdId = metaAd.id;
          ad.metaCreativeId = metaCreative.id;
          ad.status = 'launching';
          ad.metaError = undefined;
          await ad.save();
        }
      }
    }

    // Activate the hierarchy. Ads inherit pause state, so activate all three levels.
    await client.updateStatus(campaign.metaCampaignId, 'ACTIVE').catch((error) => {
      logger.warn('Failed to activate campaign', { campaignId: String(campaign._id), error: (error as Error).message });
    });
    for (const adSet of adSets) {
      if (adSet.metaAdSetId) {
        await client.updateStatus(adSet.metaAdSetId, 'ACTIVE').catch(() => undefined);
      }
    }
    const ads = await Ad.find({ campaignId: campaign._id, metaAdId: { $ne: null } });
    for (const ad of ads) {
      if (ad.metaAdId) {
        await client.updateStatus(ad.metaAdId, 'ACTIVE').catch(() => undefined);
      }
    }

    campaign.status = 'active';
    campaign.metaError = undefined;
    await campaign.save();
    await AdSet.updateMany({ campaignId: campaign._id }, { status: 'active', metaError: undefined });
    await Ad.updateMany({ campaignId: campaign._id }, { status: 'active', metaError: undefined });

    logger.info('Campaign launched to Meta', { campaignId: String(campaign._id), metaCampaignId: campaign.metaCampaignId });

    return {
      campaignId: String(campaign._id),
      metaCampaignId: campaign.metaCampaignId,
      adSets: adSets.map((adSet) => ({ id: String(adSet._id), metaAdSetId: adSet.metaAdSetId })),
      ads: ads.map((ad) => ({ id: String(ad._id), metaAdId: ad.metaAdId })),
    };
  } catch (error) {
    campaign.status = 'error';
    campaign.metaError = error instanceof Error ? error.message : 'Launch failed';
    await campaign.save();
    throw error;
  }
}

export { mapMetaStatus };
