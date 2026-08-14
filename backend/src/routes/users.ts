import { Router } from 'express';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { toUserDTO } from '../utils/userDto';

const router = Router();

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    res.json({ success: true, user: toUserDTO(user!) });
  })
);

export default router;
