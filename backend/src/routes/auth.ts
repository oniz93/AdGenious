import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { encryptToken } from '../utils/crypto';
import { signToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { toUserDTO } from '../utils/userDto';
import { validateBody } from '../middleware/validate';
import {
  buildFacebookAuthUrl,
  exchangeCodeForToken,
  exchangeShortLivedToken,
  fetchFacebookProfile,
  verifyOAuthState,
} from '../services/facebookOAuth';

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

router.get(
  '/facebook',
  (_req, res) => {
    const url = buildFacebookAuthUrl();
    res.redirect(url);
  }
);

router.get(
  '/facebook/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query as Record<string, string | undefined>;

    if (error) {
      res.redirect(`${env.FRONTEND_URL}/auth/facebook/callback?error=${encodeURIComponent(error_description || error)}`);
      return;
    }

    try {
      verifyOAuthState(state);
    } catch (err) {
      res.redirect(`${env.FRONTEND_URL}/auth/facebook/callback?error=${encodeURIComponent((err as Error).message)}`);
      return;
    }

    if (!code) {
      res.redirect(`${env.FRONTEND_URL}/auth/facebook/callback?error=${encodeURIComponent('Missing authorization code')}`);
      return;
    }

    let user;
    try {
      const tokenResponse = await exchangeCodeForToken(code);
      let accessToken = tokenResponse.access_token;
      let expiresAt: Date | undefined;

      try {
        const longLived = await exchangeShortLivedToken(accessToken);
        accessToken = longLived.access_token;
        if (longLived.expires_in) {
          expiresAt = new Date(Date.now() + longLived.expires_in * 1000);
        }
      } catch {
        // Long-lived exchange can fail for some app types; keep the short-lived token.
        if (tokenResponse.expires_in) {
          expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
        }
      }

      const profile = await fetchFacebookProfile(accessToken);
      const email = profile.email ? profile.email.toLowerCase() : `facebook-${profile.id}@facebook.local`;

      user = await User.findOne({ facebookId: profile.id });
      if (!user && profile.email) {
        user = await User.findOne({ email });
      }
      if (!user) {
        user = await User.create({
          email,
          name: profile.name,
          facebookId: profile.id,
          credits: env.SIGNUP_CREDITS,
        });
      }

      user.facebookId = profile.id;
      if (profile.name && !user.name) {
        user.name = profile.name;
      }
      if (profile.email) {
        user.email = email;
      }
      user.facebookAccessTokenEnc = encryptToken(accessToken);
      user.facebookAccessTokenExpiresAt = expiresAt;
      await user.save();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Facebook login failed';
      res.redirect(`${env.FRONTEND_URL}/auth/facebook/callback?error=${encodeURIComponent(message)}`);
      return;
    }

    const token = signToken(user);
    res.redirect(`${env.FRONTEND_URL}/auth/facebook/callback?token=${encodeURIComponent(token)}`);
  })
);

export default router;
