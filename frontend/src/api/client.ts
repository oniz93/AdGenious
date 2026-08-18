import axios from 'axios';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

export const TOKEN_STORAGE_KEY = 'adgenious_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message || error.message || 'Request failed';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

export default api;
