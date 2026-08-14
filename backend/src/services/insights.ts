import { Ad } from '../models/Ad';
import { PerformanceStats } from '../models/PerformanceStats';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { getMetaClientForUser } from './meta';

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function centsFrom(value: unknown): number {
  return Math.round(numberOrZero(value) * 100);
}

export async function ingestInsights(): Promise<void> {
  const ads = await Ad.find({ status: 'active', metaAdId: { $ne: null } });

  for (const ad of ads) {
    try {
      const user = await User.findById(ad.userId);
      if (!user) continue;
      const client = await getMetaClientForUser(user);

      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const rows = await client.getInsights(ad.metaAdId!, since);

      for (const row of rows) {
        const date = String(row.date_start ?? new Date().toISOString().slice(0, 10));
        await PerformanceStats.updateOne(
          { adId: ad._id, date },
          {
            $set: {
              userId: ad.userId,
              campaignId: ad.campaignId,
              adSetId: ad.adSetId,
              impressions: numberOrZero(row.impressions),
              clicks: numberOrZero(row.clicks),
              spendCents: centsFrom(row.spend),
              cpc: numberOrZero(row.cpc),
              ctr: numberOrZero(row.ctr),
              cpm: numberOrZero(row.cpm),
              reach: numberOrZero(row.reach),
              frequency: numberOrZero(row.frequency),
              actions: row.actions ?? undefined,
              costPerActionType: row.cost_per_action_type ?? undefined,
            },
          },
          { upsert: true }
        );
      }
    } catch (error) {
      logger.warn('Insights ingestion failed for ad', {
        adId: String(ad._id),
        error: (error as Error).message,
      });
    }
  }
}
