import { Ad } from '../models/Ad';
import { AdSet } from '../models/AdSet';
import { Campaign } from '../models/Campaign';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { getMetaClientForUser } from './meta';
import { mapMetaStatus } from './deployment';

async function syncStatuses() {
  const campaigns = await Campaign.find({
    status: { $in: ['active', 'launching', 'paused'] },
    metaCampaignId: { $ne: null },
  });

  for (const campaign of campaigns) {
    try {
      const user = await User.findById(campaign.userId);
      if (!user) continue;
      const client = await getMetaClientForUser(user);

      const campaignStatus = await client.getObjectStatus(campaign.metaCampaignId!);
      campaign.status = mapMetaStatus(campaignStatus.status ?? campaignStatus.effectiveStatus);
      await campaign.save();

      const adSets = await AdSet.find({ campaignId: campaign._id, metaAdSetId: { $ne: null } });
      for (const adSet of adSets) {
        const status = await client.getObjectStatus(adSet.metaAdSetId!);
        adSet.status = mapMetaStatus(status.status ?? status.effectiveStatus);
        await adSet.save();
      }

      const ads = await Ad.find({ campaignId: campaign._id, metaAdId: { $ne: null } });
      for (const ad of ads) {
        const status = await client.getObjectStatus(ad.metaAdId!);
        ad.status = mapMetaStatus(status.status ?? status.effectiveStatus);
        await ad.save();
      }
    } catch (error) {
      logger.warn('Status sync failed for campaign', {
        campaignId: String(campaign._id),
        error: (error as Error).message,
      });
    }
  }
}

export function startSchedulers(): NodeJS.Timeout {
  // Run once shortly after boot, then on a fixed cadence.
  setTimeout(() => {
    syncStatuses().catch((error) => logger.error('Initial status sync failed', { error }));
  }, 5000);

  const interval = setInterval(() => {
    syncStatuses().catch((error) => logger.error('Status sync failed', { error }));
  }, 15 * 60 * 1000);
  interval.unref();
  logger.info('Scheduler started (status sync every 15 minutes)');
  return interval;
}
