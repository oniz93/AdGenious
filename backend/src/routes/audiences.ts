import { Router } from 'express';
import { z } from 'zod';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { getMetaClientForUser } from '../services/meta';
import { BroadAudience, generateSubAudiences } from '../services/targeting';

const router = Router();

const audienceSchema = z.object({
  ageMin: z.number().int().min(13).max(65),
  ageMax: z.number().int().min(13).max(65),
  genders: z.array(z.number().int()).optional(),
  countries: z.array(z.string()).optional(),
  interests: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
  behaviors: z.array(z.object({ id: z.string(), name: z.string().optional() })).optional(),
  publisherPlatforms: z.array(z.string()).optional(),
  facebookPositions: z.array(z.string()).optional(),
  instagramPositions: z.array(z.string()).optional(),
});

const subAudienceSchema = z.object({
  audience: audienceSchema,
  count: z.number().int().min(1).max(20).default(6),
});

router.post(
  '/sub-audiences',
  requireAuth,
  validateBody(subAudienceSchema),
  asyncHandler(async (req, res) => {
    const { audience, count } = req.body as z.infer<typeof subAudienceSchema>;
    const subAudiences = generateSubAudiences(audience as BroadAudience, count);
    res.json({ success: true, subAudiences, count: subAudiences.length });
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

export default router;
