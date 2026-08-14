import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Ad } from '../models/Ad';
import { AdSet } from '../models/AdSet';
import { Campaign } from '../models/Campaign';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

const campaignSchema = z.object({
  name: z.string().trim().min(1).max(200),
  objective: z.enum(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION']),
  dailyBudgetCents: z.number().int().positive().optional(),
  lifetimeBudgetCents: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const campaignUpdateSchema = campaignSchema.partial();

const adSetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  targeting: z.record(z.unknown()),
  optimizationGoal: z.string().default('LINK_CLICKS'),
  billingEvent: z.string().default('IMPRESSIONS'),
  dailyBudgetCents: z.number().int().positive().optional(),
  lifetimeBudgetCents: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reachEstimate: z.number().optional(),
  subAudienceIndex: z.number().int().optional(),
});

const adSchema = z.object({
  name: z.string().trim().min(1).max(200),
  creative: z.object({
    message: z.string().min(1).max(5000),
    headline: z.string().max(255).optional(),
    description: z.string().max(255).optional(),
    linkUrl: z.string().url(),
    callToAction: z.string().max(100).optional(),
    imageUrl: z.string().url().optional(),
    imageHash: z.string().optional(),
    pageId: z.string().optional(),
  }),
});

const adSetDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  targeting: z.record(z.unknown()),
  optimizationGoal: z.string().default('LINK_CLICKS'),
  billingEvent: z.string().default('IMPRESSIONS'),
  dailyBudgetCents: z.number().int().positive().optional(),
  lifetimeBudgetCents: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reachEstimate: z.number().optional(),
  subAudienceIndex: z.number().int().optional(),
  ads: z.array(z.object({
    id: z.string().optional(),
    name: z.string().trim().min(1).max(200),
    creative: z.object({
      message: z.string().min(1).max(5000),
      headline: z.string().max(255).optional(),
      description: z.string().max(255).optional(),
      linkUrl: z.string().url(),
      callToAction: z.string().max(100).optional(),
      imageUrl: z.string().url().optional(),
      imageHash: z.string().optional(),
      pageId: z.string().optional(),
    }),
  })),
});

const configureSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  objective: z.enum(['OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION']).optional(),
  dailyBudgetCents: z.number().int().positive().optional().nullable(),
  lifetimeBudgetCents: z.number().int().positive().optional().nullable(),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  adSets: z.array(adSetDraftSchema).optional(),
});

async function getOwnedCampaign(userId: string, campaignId: string) {
  if (!mongoose.isValidObjectId(campaignId)) {
    throw ApiError.notFound('Campaign not found');
  }
  const campaign = await Campaign.findOne({ _id: campaignId, userId, status: { $ne: 'archived' } });
  if (!campaign) {
    throw ApiError.notFound('Campaign not found');
  }
  return campaign;
}

async function getOwnedAdSet(userId: string, campaignId: string, adSetId: string) {
  if (!mongoose.isValidObjectId(adSetId)) {
    throw ApiError.notFound('Ad set not found');
  }
  const adSet = await AdSet.findOne({ _id: adSetId, userId, campaignId });
  if (!adSet) {
    throw ApiError.notFound('Ad set not found');
  }
  return adSet;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaigns = await Campaign.find({ userId: user!._id, status: { $ne: 'archived' } }).sort({ createdAt: -1 });
    const adSetCounts = await AdSet.aggregate([
      { $match: { userId: user!._id } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } },
    ]);
    const countByCampaign = new Map(adSetCounts.map((row) => [String(row._id), row.count]));

    res.json({
      success: true,
      campaigns: campaigns.map((c) => ({
        id: String(c._id),
        name: c.name,
        objective: c.objective,
        status: c.status,
        metaCampaignId: c.metaCampaignId ?? null,
        dailyBudgetCents: c.dailyBudgetCents ?? null,
        lifetimeBudgetCents: c.lifetimeBudgetCents ?? null,
        startTime: c.startTime ?? null,
        endTime: c.endTime ?? null,
        adSetCount: countByCampaign.get(String(c._id)) ?? 0,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  })
);

router.post(
  '/',
  requireAuth,
  validateBody(campaignSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const body = req.body as z.infer<typeof campaignSchema>;
    const campaign = await Campaign.create({ ...body, userId: user!._id });
    res.status(201).json({ success: true, campaign: { id: String(campaign._id), ...body } });
  })
);

router.get(
  '/:campaignId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaign = await getOwnedCampaign(String(user!._id), req.params.campaignId);
    const adSets = await AdSet.find({ campaignId: campaign._id }).sort({ createdAt: 1 });
    const ads = await Ad.find({ campaignId: campaign._id }).sort({ createdAt: 1 });

    res.json({
      success: true,
      campaign: {
        id: String(campaign._id),
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status,
        metaCampaignId: campaign.metaCampaignId ?? null,
        dailyBudgetCents: campaign.dailyBudgetCents ?? null,
        lifetimeBudgetCents: campaign.lifetimeBudgetCents ?? null,
        startTime: campaign.startTime ?? null,
        endTime: campaign.endTime ?? null,
        metaError: campaign.metaError ?? null,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
      },
      adSets: adSets.map((adSet) => ({
        id: String(adSet._id),
        name: adSet.name,
        status: adSet.status,
        targeting: adSet.targeting,
        optimizationGoal: adSet.optimizationGoal,
        billingEvent: adSet.billingEvent,
        reachEstimate: adSet.reachEstimate ?? null,
        subAudienceIndex: adSet.subAudienceIndex ?? null,
        metaAdSetId: adSet.metaAdSetId ?? null,
        metaError: adSet.metaError ?? null,
        ads: ads
          .filter((ad) => String(ad.adSetId) === String(adSet._id))
          .map((ad) => ({
            id: String(ad._id),
            name: ad.name,
            status: ad.status,
            creative: ad.creative,
            metaAdId: ad.metaAdId ?? null,
            metaCreativeId: ad.metaCreativeId ?? null,
            metaError: ad.metaError ?? null,
          })),
      })),
    });
  })
);

router.put(
  '/:campaignId/configure',
  requireAuth,
  validateBody(configureSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaign = await getOwnedCampaign(String(user!._id), req.params.campaignId);
    const body = req.body as z.infer<typeof configureSchema>;

    if (body.name !== undefined) campaign.name = body.name;
    if (body.objective !== undefined) campaign.objective = body.objective;
    campaign.dailyBudgetCents = body.dailyBudgetCents ?? campaign.dailyBudgetCents;
    campaign.lifetimeBudgetCents = body.lifetimeBudgetCents ?? campaign.lifetimeBudgetCents;
    campaign.startTime = body.startTime ?? campaign.startTime;
    campaign.endTime = body.endTime ?? campaign.endTime;
    if (campaign.status === 'draft' || campaign.status === 'error') {
      campaign.status = 'ready';
    }
    await campaign.save();

    if (body.adSets) {
      const incomingAdSetIds: string[] = [];
      for (const [index, adSetDraft] of body.adSets.entries()) {
        let adSet;
        if (adSetDraft.id && mongoose.isValidObjectId(adSetDraft.id)) {
          adSet = await AdSet.findOne({ _id: adSetDraft.id, campaignId: campaign._id, userId: user!._id });
        }
        if (!adSet) {
          adSet = new AdSet({ campaignId: campaign._id, userId: user!._id });
        }
        adSet.name = adSetDraft.name;
        adSet.targeting = adSetDraft.targeting;
        adSet.optimizationGoal = adSetDraft.optimizationGoal;
        adSet.billingEvent = adSetDraft.billingEvent;
        adSet.dailyBudgetCents = adSetDraft.dailyBudgetCents;
        adSet.lifetimeBudgetCents = adSetDraft.lifetimeBudgetCents;
        adSet.startTime = adSetDraft.startTime;
        adSet.endTime = adSetDraft.endTime;
        adSet.reachEstimate = adSetDraft.reachEstimate;
        adSet.subAudienceIndex = index;
        if (adSet.status === 'draft' || adSet.status === 'error') adSet.status = 'ready';
        await adSet.save();
        incomingAdSetIds.push(String(adSet._id));

        const incomingAdIds: string[] = [];
        for (const adDraft of adSetDraft.ads) {
          let ad;
          if (adDraft.id && mongoose.isValidObjectId(adDraft.id)) {
            ad = await Ad.findOne({ _id: adDraft.id, adSetId: adSet._id, userId: user!._id });
          }
          if (!ad) {
            ad = new Ad({ adSetId: adSet._id, campaignId: campaign._id, userId: user!._id });
          }
          ad.name = adDraft.name;
          ad.creative = adDraft.creative;
          if (ad.status === 'draft' || ad.status === 'error') ad.status = 'ready';
          await ad.save();
          incomingAdIds.push(String(ad._id));
        }

        await Ad.deleteMany({ adSetId: adSet._id, _id: { $nin: incomingAdIds } });
      }

      await AdSet.deleteMany({ campaignId: campaign._id, _id: { $nin: incomingAdSetIds } });
      await Ad.deleteMany({ campaignId: campaign._id, adSetId: { $nin: incomingAdSetIds } });
    }

    res.json({ success: true, campaign: { id: String(campaign._id), status: campaign.status } });
  })
);

router.patch(
  '/:campaignId',
  requireAuth,
  validateBody(campaignUpdateSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaign = await getOwnedCampaign(String(user!._id), req.params.campaignId);
    const body = req.body as z.infer<typeof campaignUpdateSchema>;
    Object.assign(campaign, body);
    await campaign.save();
    res.json({ success: true, campaign: { id: String(campaign._id) } });
  })
);

router.delete(
  '/:campaignId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaign = await getOwnedCampaign(String(user!._id), req.params.campaignId);
    campaign.status = 'archived';
    await campaign.save();
    res.json({ success: true });
  })
);

router.post(
  '/:campaignId/ad-sets',
  requireAuth,
  validateBody(adSetSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const campaign = await getOwnedCampaign(String(user!._id), req.params.campaignId);
    const body = req.body as z.infer<typeof adSetSchema>;
    const adSet = await AdSet.create({ ...body, campaignId: campaign._id, userId: user!._id });
    res.status(201).json({ success: true, adSet: { id: String(adSet._id) } });
  })
);

router.patch(
  '/:campaignId/ad-sets/:adSetId',
  requireAuth,
  validateBody(adSetSchema.partial()),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const adSet = await getOwnedAdSet(String(user!._id), req.params.campaignId, req.params.adSetId);
    Object.assign(adSet, req.body);
    await adSet.save();
    res.json({ success: true, adSet: { id: String(adSet._id) } });
  })
);

router.delete(
  '/:campaignId/ad-sets/:adSetId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const adSet = await getOwnedAdSet(String(user!._id), req.params.campaignId, req.params.adSetId);
    await Ad.deleteMany({ adSetId: adSet._id });
    await adSet.deleteOne();
    res.json({ success: true });
  })
);

router.post(
  '/:campaignId/ad-sets/:adSetId/ads',
  requireAuth,
  validateBody(adSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const adSet = await getOwnedAdSet(String(user!._id), req.params.campaignId, req.params.adSetId);
    const body = req.body as z.infer<typeof adSchema>;
    const ad = await Ad.create({ ...body, adSetId: adSet._id, campaignId: adSet.campaignId, userId: user!._id });
    res.status(201).json({ success: true, ad: { id: String(ad._id) } });
  })
);

router.delete(
  '/:campaignId/ad-sets/:adSetId/ads/:adId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    await getOwnedAdSet(String(user!._id), req.params.campaignId, req.params.adSetId);
    const ad = await Ad.findOne({ _id: req.params.adId, userId: user!._id, adSetId: req.params.adSetId });
    if (!ad) {
      throw ApiError.notFound('Ad not found');
    }
    await ad.deleteOne();
    res.json({ success: true });
  })
);

export default router;
