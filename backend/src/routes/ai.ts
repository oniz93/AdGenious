import { Router } from 'express';
import { z } from 'zod';
import { GeneratedContent } from '../models/GeneratedContent';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { CREDIT_COSTS, deductCredits } from '../services/credits';
import { generateImage, generateText } from '../services/openrouter';

const router = Router();

const textSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  model: z.string().trim().min(1).max(200).optional(),
});

const imageSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  n: z.number().int().min(1).max(4).default(1),
  size: z.string().trim().default('1024x1024'),
  model: z.string().trim().min(1).max(200).optional(),
});

router.post(
  '/generate-text',
  requireAuth,
  validateBody(textSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { prompt, model } = req.body as z.infer<typeof textSchema>;

    const result = await generateText(prompt, model);
    const remaining = await deductCredits(String(user!._id), CREDIT_COSTS.text, `AI text generation`);

    await GeneratedContent.create({
      userId: user!._id,
      contentType: 'text',
      data: { prompt, text: result.text, model: result.model },
      openrouterRequestId: result.requestId,
    });

    res.json({
      success: true,
      content: {
        type: 'text',
        text: result.text,
        model: result.model,
      },
      creditsRemaining: remaining,
    });
  })
);

router.post(
  '/generate-image',
  requireAuth,
  validateBody(imageSchema),
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const { prompt, n, size, model } = req.body as z.infer<typeof imageSchema>;

    const result = await generateImage(prompt, n, size, model);
    const remaining = await deductCredits(String(user!._id), CREDIT_COSTS.image * result.images.length, `AI image generation (${result.images.length})`);

    await GeneratedContent.create({
      userId: user!._id,
      contentType: 'image',
      data: { prompt, images: result.images, model: result.model },
      openrouterRequestId: result.requestId,
    });

    res.json({
      success: true,
      content: {
        type: 'image',
        images: result.images,
        model: result.model,
      },
      creditsRemaining: remaining,
    });
  })
);

router.get(
  '/content',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const items = await GeneratedContent.find({ userId: user!._id }).sort({ createdAt: -1 }).limit(50);
    res.json({
      success: true,
      items: items.map((item) => ({
        id: String(item._id),
        contentType: item.contentType,
        data: item.data,
        createdAt: item.createdAt,
      })),
    });
  })
);

export default router;
