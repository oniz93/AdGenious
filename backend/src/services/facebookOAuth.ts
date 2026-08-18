import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const DIALOG_BASE = 'https://www.facebook.com';
const GRAPH_BASE = 'https://graph.facebook.com';

export const FACEBOOK_SCOPES = [
  'email',
  'public_profile',
  'ads_management',
  'ads_read',
  'business_management',
  'pages_read_engagement',
  'instagram_basic',
  'instagram_manage_insights',
].join(',');

interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface FacebookProfile {
  id: string;
  name?: string;
  email?: string;
}

function graphUrl(path: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString();
  return `${GRAPH_BASE}/${env.META_API_VERSION}/${path}?${query}`;
}

export function createOAuthState(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ nonce, purpose: 'facebook-oauth' }, env.JWT_SECRET, { expiresIn: '10m' });
}

export function verifyOAuthState(state: string | undefined): void {
  if (!state) {
    throw ApiError.badRequest('Missing OAuth state parameter');
  }
  try {
    jwt.verify(state, env.JWT_SECRET);
  } catch {
    throw ApiError.badRequest('Invalid or expired OAuth state parameter');
  }
}

export function buildFacebookAuthUrl(): string {
  if (!env.META_APP_ID) {
    throw ApiError.badRequest('Facebook login is not configured. Set META_APP_ID.');
  }
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: env.META_REDIRECT_URI,
    state: createOAuthState(),
    scope: FACEBOOK_SCOPES,
    response_type: 'code',
  });
  return `${DIALOG_BASE}/${env.META_API_VERSION}/dialog/oauth?${params.toString()}`;
}

async function fetchGraph<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = graphUrl(path, params);
  const response = await fetch(url);
  const data = (await response.json()) as T & { error?: { message?: string; type?: string } };
  if (!response.ok || data.error) {
    const message = data.error?.message || `Graph API request failed with status ${response.status}`;
    throw ApiError.badGateway(message);
  }
  return data;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok || data.error) {
    const message = data.error?.message || `Graph API request failed with status ${response.status}`;
    throw ApiError.badGateway(message);
  }
  return data;
}

export async function exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw ApiError.badRequest('Facebook login is not configured. Set META_APP_ID and META_APP_SECRET.');
  }
  const url = graphUrl('oauth/access_token', {
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    redirect_uri: env.META_REDIRECT_URI,
    code,
  });
  return fetchJson<OAuthTokenResponse>(url);
}

export async function exchangeShortLivedToken(shortLivedToken: string): Promise<OAuthTokenResponse> {
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw ApiError.badRequest('Facebook login is not configured. Set META_APP_ID and META_APP_SECRET.');
  }
  const url = graphUrl('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: env.META_APP_ID,
    client_secret: env.META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });
  return fetchJson<OAuthTokenResponse>(url);
}

export async function fetchFacebookProfile(accessToken: string): Promise<FacebookProfile> {
  const profile = await fetchGraph<FacebookProfile>('me', {
    access_token: accessToken,
    fields: 'id,name,email',
  });
  return profile;
}
