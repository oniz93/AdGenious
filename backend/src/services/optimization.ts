import { Ad } from '../models/Ad';
import { Notification } from '../models/Notification';
import { PerformanceStats } from '../models/PerformanceStats';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { getMetaClientForUser } from './meta';

interface OptimizationRule {
  minSpendCents: number;
  minImpressions: number;
  maxClicks: number;
}

const DEFAULT_RULES: OptimizationRule = {
  minSpendCents: 500, // $5.00
  minImpressions: 500,
  maxClicks: 0,
};

export async function runOptimizationRules(): Promise<void> {
  const ads = await Ad.find({ status: 'active', metaAdId: { $ne: null } });
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const ad of ads) {
    try {
      const stats = await PerformanceStats.find({ adId: ad._id, date: { $gte: since } });
      if (stats.length === 0) continue;

      const spendCents = stats.reduce((sum, row) => sum + row.spendCents, 0);
      const impressions = stats.reduce((sum, row) => sum + row.impressions, 0);
      const clicks = stats.reduce((sum, row) => sum + row.clicks, 0);

      if (spendCents >= DEFAULT_RULES.minSpendCents && impressions >= DEFAULT_RULES.minImpressions && clicks <= DEFAULT_RULES.maxClicks) {
        const user = await User.findById(ad.userId);
        if (!user) continue;
        const client = await getMetaClientForUser(user);

        await client.updateStatus(ad.metaAdId!, 'PAUSED');
        ad.status = 'paused';
        await ad.save();

        await Notification.create({
          userId: ad.userId,
          type: 'warning',
          title: 'Ad paused by auto-optimization',
          message: `"${ad.name}" spent $${(spendCents / 100).toFixed(2)} with ${impressions} impressions and no clicks, so it was paused automatically.`,
        });

        logger.info('Optimization rule paused an ad', {
          adId: String(ad._id),
          spendCents,
          impressions,
          clicks,
        });
      }
    } catch (error) {
      logger.warn('Optimization check failed for ad', {
        adId: String(ad._id),
        error: (error as Error).message,
      });
    }
  }
}
