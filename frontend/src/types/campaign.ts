export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION';

export type CampaignStatus = 'draft' | 'ready' | 'launching' | 'active' | 'paused' | 'error' | 'archived';

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  metaCampaignId: string | null;
  dailyBudgetCents: number | null;
  lifetimeBudgetCents: number | null;
  startTime: string | null;
  endTime: string | null;
  adSetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdCreative {
  message: string;
  headline?: string;
  description?: string;
  linkUrl: string;
  callToAction?: string;
  imageUrl?: string;
  imageHash?: string;
  pageId?: string;
}

export interface Ad {
  id: string;
  name: string;
  status: string;
  creative: AdCreative;
  metaAdId: string | null;
  metaCreativeId: string | null;
  metaError: string | null;
}

export interface AdSet {
  id: string;
  name: string;
  status: string;
  targeting: Record<string, unknown>;
  optimizationGoal: string;
  billingEvent: string;
  reachEstimate: number | null;
  subAudienceIndex: number | null;
  metaAdSetId: string | null;
  metaError: string | null;
  ads: Ad[];
}

export interface CampaignDetail {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  metaCampaignId: string | null;
  dailyBudgetCents: number | null;
  lifetimeBudgetCents: number | null;
  startTime: string | null;
  endTime: string | null;
  metaError: string | null;
  createdAt: string;
  updatedAt: string;
}
