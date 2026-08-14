export interface User {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  facebookConnected: boolean;
  selectedAdAccountId: string | null;
  createdAt: string;
}

export interface ApiErrorPayload {
  message?: string;
  details?: unknown;
}

export interface ApiEnvelope<T> {
  success: boolean;
  [key: string]: unknown;
  data?: T;
}
