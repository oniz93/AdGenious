import { env } from '../config/env';
import { User, UserDocument } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { decryptToken } from '../utils/crypto';
import { logger } from '../utils/logger';

const GRAPH_BASE = 'https://graph.facebook.com';

export interface AdAccount {
  id: string;
  name: string;
  accountStatus: number;
  currency: string;
  timezoneName?: string;
}

export interface InstagramAccount {
  id: string;
  username?: string;
  name?: string;
  profilePictureUrl?: string;
  followersCount?: number;
}

export interface TargetingInterest {
  id: string;
  name: string;
  type?: string;
  audienceSize?: number;
  path?: string[];
}

export interface ReachEstimateResult {
  users: number;
  estimateReady: boolean;
  bidEstimations?: unknown[];
}

export interface MetaRequestOptions {
  // Number of retries for transient / rate-limit errors.
  retries?: number;
}

type HttpMethod = 'GET' | 'POST';

export class MetaApiClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(
    method: HttpMethod,
    path: string,
    params: Record<string, string | number | boolean> = {},
    options: MetaRequestOptions = {}
  ): Promise<T> {
    const retries = options.retries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.requestOnce<T>(method, path, params);
      } catch (error) {
        lastError = error as Error;
        if (error instanceof ApiError && this.isRetryable(error)) {
          const delay = 500 * 2 ** attempt;
          logger.warn('Retrying Meta API call', { path, attempt, delay });
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? ApiError.badGateway('Meta API request failed');
  }

  private isRetryable(error: ApiError): boolean {
    const code = (error.details as { code?: number } | undefined)?.code;
    return error.statusCode === 429 || (code !== undefined && [4, 17, 32, 613].includes(code));
  }

  private async requestOnce<T>(
    method: HttpMethod,
    path: string,
    params: Record<string, string | number | boolean> = {}
  ): Promise<T> {
    const url = new URL(`${GRAPH_BASE}/${env.META_API_VERSION}/${path}`);
    const searchParams = new URLSearchParams();
    const body = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, String(value));
      body.append(key, String(value));
    }
    searchParams.append('access_token', this.accessToken);
    body.append('access_token', this.accessToken);

    if (method === 'GET') {
      for (const [key, value] of searchParams.entries()) {
        url.searchParams.append(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: method === 'POST' ? body.toString() : undefined,
    });

    const payload = (await response.json()) as T & {
      error?: { message?: string; code?: number; error_user_msg?: string };
    };

    if (!response.ok || payload.error) {
      const code = payload.error?.code;
      const message = payload.error?.error_user_msg || payload.error?.message || `Meta API ${method} ${path} failed with status ${response.status}`;

      if (code === 190) {
        throw ApiError.unauthorized('Facebook session expired. Reconnect your Facebook account.', { code });
      }

      const status = response.status >= 500 ? 502 : response.status;
      throw new ApiError(status, message, { code });
    }

    return payload;
  }

  // ---- Identity / accounts ----

  async getAdAccounts(): Promise<AdAccount[]> {
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', 'me/adaccounts', {
      fields: 'id,name,account_status,currency,timezone_name',
      limit: 100,
    });
    return (data.data ?? []).map((item) => ({
      id: String(item.id),
      name: String(item.name ?? item.id),
      accountStatus: Number(item.account_status ?? 1),
      currency: String(item.currency ?? 'USD'),
      timezoneName: item.timezone_name ? String(item.timezone_name) : undefined,
    }));
  }

  async getInstagramAccounts(): Promise<InstagramAccount[]> {
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', 'me/accounts', {
      fields: 'id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count}',
      limit: 100,
    });

    const accounts: InstagramAccount[] = [];
    for (const page of data.data ?? []) {
      const ig = page.instagram_business_account as Record<string, unknown> | undefined;
      if (ig && ig.id) {
        accounts.push({
          id: String(ig.id),
          username: ig.username ? String(ig.username) : undefined,
          name: ig.name ? String(ig.name) : undefined,
          profilePictureUrl: ig.profile_picture_url ? String(ig.profile_picture_url) : undefined,
          followersCount: ig.followers_count ? Number(ig.followers_count) : undefined,
        });
      }
    }
    return accounts;
  }

  async debugToken(): Promise<{ isValid: boolean; expiresAt?: number; scopes?: string[] }> {
    const data = await this.request<{ data?: Record<string, unknown> }>('GET', 'debug_token', {
      input_token: this.accessToken,
    });
    const info = data.data ?? {};
    return {
      isValid: Boolean(info.is_valid),
      expiresAt: info.expires_at ? Number(info.expires_at) : undefined,
      scopes: Array.isArray(info.scopes) ? (info.scopes as string[]) : undefined,
    };
  }

  // ---- Targeting ----

  async searchTargeting(type: 'adinterest' | 'adgeolocation' | 'adTargetingCategory', query: string, limit = 25): Promise<TargetingInterest[]> {
    const params: Record<string, string | number | boolean> = {
      type,
      q: query,
      limit,
    };
    if (type === 'adgeolocation') {
      params.location_types = JSON.stringify(['country', 'region', 'city']);
    }
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', 'search', params);
    return (data.data ?? []).map((item) => ({
      id: String(item.id),
      name: String(item.name ?? item.id),
      type: item.type ? String(item.type) : undefined,
      audienceSize: item.audience_size ? Number(item.audience_size) : undefined,
      path: Array.isArray(item.path) ? (item.path as string[]) : undefined,
    }));
  }

  async getReachEstimate(adAccountId: string, targeting: Record<string, unknown>): Promise<ReachEstimateResult> {
    const data = await this.request<{ data?: { users?: number; estimate_ready?: boolean; bid_estimations?: unknown[] } }>(
      'POST',
      `act_${adAccountId}/reachestimate`,
      {
        targeting_spec: JSON.stringify(targeting),
        currency: 'USD',
      }
    );
    const estimate = data.data ?? {};
    return {
      users: Number(estimate.users ?? 0),
      estimateReady: Boolean(estimate.estimate_ready ?? false),
      bidEstimations: estimate.bid_estimations,
    };
  }

  // ---- Campaign management (used by the launch orchestration) ----

  async createCampaign(adAccountId: string, name: string, objective: string, status = 'PAUSED'): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', `act_${adAccountId}/campaigns`, {
      name,
      objective,
      status,
      special_ad_categories: '[]',
    });
  }

  async createAdSet(
    adAccountId: string,
    params: {
      name: string;
      campaignId: string;
      targeting: Record<string, unknown>;
      optimizationGoal: string;
      billingEvent: string;
      dailyBudgetCents?: number;
      lifetimeBudgetCents?: number;
      startTime?: string;
      endTime?: string;
      status?: string;
    }
  ): Promise<{ id: string }> {
    const body: Record<string, string | number | boolean> = {
      name: params.name,
      campaign_id: params.campaignId,
      targeting: JSON.stringify(params.targeting),
      optimization_goal: params.optimizationGoal,
      billing_event: params.billingEvent,
      status: params.status ?? 'PAUSED',
    };
    if (params.dailyBudgetCents) {
      body.daily_budget = Math.round(params.dailyBudgetCents);
    }
    if (params.lifetimeBudgetCents) {
      body.lifetime_budget = Math.round(params.lifetimeBudgetCents);
    }
    if (params.startTime) {
      body.start_time = params.startTime;
    }
    if (params.endTime) {
      body.end_time = params.endTime;
    }
    return this.request<{ id: string }>('POST', `act_${adAccountId}/adsets`, body);
  }

  async createAdCreative(adAccountId: string, params: {
    name: string;
    pageId: string;
    message: string;
    linkUrl: string;
    imageHash?: string;
    headline?: string;
    description?: string;
    callToAction?: string;
  }): Promise<{ id: string }> {
    const linkData: Record<string, string> = {
      message: params.message,
      link: params.linkUrl,
      name: params.headline ?? 'Learn more',
      ...(params.description ? { description: params.description } : {}),
      ...(params.callToAction ? { call_to_action: JSON.stringify({ type: params.callToAction, value: { link: params.linkUrl } }) } : {}),
    };
    if (params.imageHash) {
      linkData.image_hash = params.imageHash;
    } else {
      linkData.picture = params.linkUrl;
    }

    const body: Record<string, string | number | boolean> = {
      name: params.name,
      object_story_spec: JSON.stringify({
        page_id: params.pageId,
        link_data: linkData,
      }),
    };
    return this.request<{ id: string }>('POST', `act_${adAccountId}/adcreatives`, body);
  }

  async createAd(adAccountId: string, params: { name: string; adSetId: string; creativeId: string; status?: string }): Promise<{ id: string }> {
    return this.request<{ id: string }>('POST', `act_${adAccountId}/ads`, {
      name: params.name,
      adset_id: params.adSetId,
      creative: JSON.stringify({ creative_id: params.creativeId }),
      status: params.status ?? 'PAUSED',
    });
  }

  async updateStatus(objectId: string, status: 'ACTIVE' | 'PAUSED'): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('POST', objectId, { status });
  }

  async getCampaigns(adAccountId: string): Promise<Array<Record<string, unknown>>> {
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', `act_${adAccountId}/campaigns`, {
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time',
      limit: 100,
    });
    return data.data ?? [];
  }

  async getAdSets(adAccountId: string): Promise<Array<Record<string, unknown>>> {
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', `act_${adAccountId}/adsets`, {
      fields: 'id,name,campaign_id,status,targeting,optimization_goal,billing_event,daily_budget,lifetime_budget',
      limit: 200,
    });
    return data.data ?? [];
  }

  async getAds(adAccountId: string): Promise<Array<Record<string, unknown>>> {
    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', `act_${adAccountId}/ads`, {
      fields: 'id,name,adset_id,status,creative{id,name,object_story_spec}',
      limit: 200,
    });
    return data.data ?? [];
  }

  async getInsights(objectId: string, since?: string, until?: string): Promise<Array<Record<string, unknown>>> {
    const params: Record<string, string | number | boolean> = {
      fields: 'impressions,clicks,spend,cpc,ctr,cpm,reach,frequency,actions,cost_per_action_type,date_start,date_stop',
      time_increment: 1,
      limit: 200,
    };
    if (since) params.since = since;
    if (until) params.until = until;

    const data = await this.request<{ data?: Array<Record<string, unknown>> }>('GET', `${objectId}/insights`, params);
    return data.data ?? [];
  }

  async uploadImageFromUrl(adAccountId: string, imageUrl: string): Promise<{ hash: string }> {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw ApiError.badGateway(`Failed to download image for upload: ${imageResponse.status}`);
    }
    const bytes = Buffer.from(await imageResponse.arrayBuffer());

    const form = new FormData();
    form.append('access_token', this.accessToken);
    form.append('filename', new Blob([bytes], { type: imageResponse.headers.get('content-type') || 'image/png' }), 'creative.png');

    const response = await fetch(`${GRAPH_BASE}/${env.META_API_VERSION}/act_${adAccountId}/adimages`, {
      method: 'POST',
      body: form,
    });

    const payload = (await response.json()) as {
      images?: Record<string, { hash?: string }>;
      error?: { message?: string; code?: number };
    };

    if (!response.ok || payload.error) {
      throw ApiError.badGateway(payload.error?.message || 'Meta image upload failed');
    }

    const first = Object.values(payload.images ?? {})[0];
    if (!first?.hash) {
      throw ApiError.badGateway('Meta image upload returned no hash');
    }
    return { hash: first.hash };
  }
}

export async function getUserMetaToken(user: UserDocument): Promise<string> {
  const fresh = await User.findById(user._id).select('+facebookAccessTokenEnc');
  if (!fresh?.facebookAccessTokenEnc) {
    throw ApiError.badRequest('No Facebook account connected. Connect Facebook first.');
  }
  try {
    return decryptToken(fresh.facebookAccessTokenEnc);
  } catch {
    throw ApiError.badRequest('Stored Facebook token is invalid. Reconnect your Facebook account.');
  }
}

export async function getMetaClientForUser(user: UserDocument): Promise<MetaApiClient> {
  const token = await getUserMetaToken(user);
  return new MetaApiClient(token);
}
