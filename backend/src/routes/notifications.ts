import { Router } from 'express';
import { Notification } from '../models/Notification';
import { AuthedRequest, requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const items = await Notification.find({ userId: user!._id }).sort({ createdAt: -1 }).limit(50);
    res.json({
      success: true,
      notifications: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  })
);

router.get(
  '/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const count = await Notification.countDocuments({ userId: user!._id, read: false });
    res.json({ success: true, count });
  })
);

router.post(
  '/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    await Notification.updateMany({ userId: user!._id, read: false }, { read: true });
    res.json({ success: true });
  })
);

router.post(
  '/:notificationId/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = req as AuthedRequest;
    const notification = await Notification.findOne({ _id: req.params.notificationId, userId: user!._id });
    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }
    notification.read = true;
    await notification.save();
    res.json({ success: true });
  })
);

export default router;
