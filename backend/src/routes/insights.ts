import { Router } from 'express';
import mongoose from 'mongoose';
import { Ad } from '../models/Ad';
import { AdSet } from '../models/AdSet';
import { Campaign } from '../models/Campaign';
import { PerformanceStats } from '../models/PerformanceStats';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ingestInsights } from '../services/insights';

const router = Router();

interface Totals {
  impressions: number;
  clicks: number;
  spendCents: number;
  reach: number;
}

function sumRows(rows: Array<{ impressions: number; clicks: number; spendCents: number; reach?: number }>): Totals {
  return rows.reduce<Totals>(
    (acc, row) => {
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.spendCents += row.spendCents;
      acc.reach += row.reach ?? 0;
      return acc;
    },
    { impressions: 0, clicks: 0, spendCents: 0, reach: 0 }
  );
}

router.get(
  '/overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const [stats, activeCampaigns, adCount] = await Promise.all([
      PerformanceStats.find({ userId: user!._id }),
      Campaign.countDocuments({ userId: user!._id, status: { $in: ['active', 'launching'] } }),
      Ad.countDocuments({ userId: user!._id, status: 'active' }),
    ]);

    const totals = sumRows(stats);
    const spend = totals.spendCents / 100;
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? spend / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.spendCents / 100 / totals.impressions) * 1000 : 0;

    res.json({
      success: true,
      overview: {
        impressions: totals.impressions,
        clicks: totals.clicks,
        reach: totals.reach,
        spend,
        ctr,
        cpc,
        cpm,
        activeCampaigns,
        activeAds: adCount,
      },
    });
  })
);

router.get(
  '/campaigns/:campaignId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    if (!mongoose.isValidObjectId(req.params.campaignId)) {
      res.status(404).json({ success: false, error: { message: 'Campaign not found' } });
      return;
    }

    const campaign = await Campaign.findOne({ _id: req.params.campaignId, userId: user!._id });
    if (!campaign) {
      res.status(404).json({ success: false, error: { message: 'Campaign not found' } });
      return;
    }

    const stats = await PerformanceStats.find({ userId: user!._id, campaignId: campaign._id });
    const adSets = await AdSet.find({ campaignId: campaign._id });
    const ads = await Ad.find({ campaignId: campaign._id });

    const dailyMap = new Map<string, { date: string; impressions: number; clicks: number; spend: number }>();
    for (const row of stats) {
      const current = dailyMap.get(row.date) ?? { date: row.date, impressions: 0, clicks: 0, spend: 0 };
      current.impressions += row.impressions;
      current.clicks += row.clicks;
      current.spend += row.spendCents / 100;
      dailyMap.set(row.date, current);
    }

    const statsByAd = new Map(stats.map((row) => [String(row.adId), row]));
    const adRows = ads.map((ad) => {
      const row = statsByAd.get(String(ad._id));
      return {
        id: String(ad._id),
        name: ad.name,
        impressions: row?.impressions ?? 0,
        clicks: row?.clicks ?? 0,
        spend: row ? row.spendCents / 100 : 0,
      };
    });

    const statsByAdSet = new Map(stats.map((row) => [String(row.adSetId), row]));
    const adSetRows = adSets.map((adSet) => {
      const row = statsByAdSet.get(String(adSet._id));
      return {
        id: String(adSet._id),
        name: adSet.name,
        impressions: row?.impressions ?? 0,
        clicks: row?.clicks ?? 0,
        spend: row ? row.spendCents / 100 : 0,
      };
    });

    res.json({
      success: true,
      insights: {
        daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        adSets: adSetRows,
        ads: adRows,
      },
    });
  })
);

router.post(
  '/refresh',
  requireAuth,
  asyncHandler(async (_req, res) => {
    await ingestInsights();
    res.json({ success: true, message: 'Insights refresh started' });
  })
);

export default router;
