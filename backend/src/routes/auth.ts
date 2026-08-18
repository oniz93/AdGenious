import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { toUserDTO } from '../utils/userDto';
import { validateBody } from '../middleware/validate';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

router.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body as z.infer<typeof registerSchema>;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      throw ApiError.conflict('An account with this email already exists');
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      hashedPassword,
      name,
      credits: env.SIGNUP_CREDITS,
    });

    res.status(201).json({
      success: true,
      token: signToken(user),
      user: toUserDTO(user),
    });
  })
);

router.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.hashedPassword) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const valid = await verifyPassword(password, user.hashedPassword);
    if (!valid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    res.json({
      success: true,
      token: signToken(user),
      user: toUserDTO(user),
    });
  })
);

export default router;
