import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { getMetaClientForUser } from '../services/meta';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const client = await getMetaClientForUser(user!);

    const [adAccounts, instagramAccounts, tokenInfo] = await Promise.all([
      client.getAdAccounts(),
      client.getInstagramAccounts(),
      client.debugToken().catch(() => ({ isValid: false, scopes: [] })),
    ]);

    res.json({
      success: true,
      adAccounts,
      instagramAccounts,
      token: tokenInfo,
      selectedAdAccountId: user!.selectedAdAccountId ?? null,
    });
  })
);

router.get(
  '/ad-accounts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const client = await getMetaClientForUser(user!);
    const adAccounts = await client.getAdAccounts();
    res.json({ success: true, adAccounts });
  })
);

router.get(
  '/instagram-accounts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const client = await getMetaClientForUser(user!);
    const instagramAccounts = await client.getInstagramAccounts();
    res.json({ success: true, instagramAccounts });
  })
);

const searchQuerySchema = z.object({
  type: z.enum(['adinterest', 'adgeolocation', 'adTargetingCategory']).default('adinterest'),
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

router.get(
  '/targeting/search',
  requireAuth,
  validateQuery(searchQuerySchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { type, q, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>;
    const client = await getMetaClientForUser(user!);
    const results = await client.searchTargeting(type, q, limit);
    res.json({ success: true, results });
  })
);

const reachEstimateSchema = z.object({
  adAccountId: z.string().min(1),
  targeting: z.record(z.unknown()),
});

router.post(
  '/reach-estimate',
  requireAuth,
  validateBody(reachEstimateSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { adAccountId, targeting } = req.body as z.infer<typeof reachEstimateSchema>;
    const client = await getMetaClientForUser(user!);
    const estimate = await client.getReachEstimate(adAccountId, targeting);
    res.json({ success: true, estimate });
  })
);

const selectAccountSchema = z.object({
  adAccountId: z.string().min(1),
});

router.post(
  '/select-ad-account',
  requireAuth,
  validateBody(selectAccountSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { adAccountId } = req.body as z.infer<typeof selectAccountSchema>;
    user!.selectedAdAccountId = adAccountId;
    await user!.save();
    res.json({ success: true, selectedAdAccountId: adAccountId });
  })
);

export default router;
