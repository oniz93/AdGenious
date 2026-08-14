import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { IUser } from '../models/User';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export function signToken(user: Pick<IUser, '_id' | 'email'>): string {
  const payload: JwtPayload = { sub: String(user._id), email: user.email };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
