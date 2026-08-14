import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

interface OpenRouterError {
  error?: { message?: string; code?: string };
}

export interface TextGenerationResult {
  texts: string[];
  requestId: string;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface ImageGenerationResult {
  images: Array<{ url?: string; b64_json?: string; revisedPrompt?: string }>;
  requestId: string;
  model: string;
}

function requireApiKey(): string {
  if (!env.OPENROUTER_API_KEY) {
    throw ApiError.badRequest('OpenRouter is not configured. Set OPENROUTER_API_KEY.');
  }
  return env.OPENROUTER_API_KEY;
}

async function openRouterFetch<T>(path: string, body: unknown): Promise<{ data: T; requestId: string }> {
  const apiKey = requireApiKey();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${OPENROUTER_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': env.FRONTEND_URL,
        'X-Title': 'AdGenious',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json()) as T & OpenRouterError & { id?: string };
    if (!response.ok || payload.error) {
      const message = payload.error?.message || `OpenRouter request failed with status ${response.status}`;
      logger.error('OpenRouter request failed', { status: response.status, message });
      throw ApiError.badGateway(message);
    }

    return { data: payload, requestId: payload.id ?? '' };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error instanceof Error && error.name === 'AbortError' ? 'OpenRouter request timed out' : 'OpenRouter request failed';
    throw ApiError.badGateway(message);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateText(prompt: string, model?: string, n = 1): Promise<TextGenerationResult> {
  const selectedModel = model || env.OPENROUTER_TEXT_MODEL;
  const { data, requestId } = await openRouterFetch<{
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  }>('/chat/completions', {
    model: selectedModel,
    messages: [{ role: 'user', content: prompt }],
    n,
  });

  const texts = (data.choices ?? [])
    .map((choice) => choice.message?.content)
    .filter((content): content is string => Boolean(content))
    .map((content) => content.trim());

  if (texts.length === 0) {
    throw ApiError.badGateway('OpenRouter returned an empty text response');
  }

  return {
    texts,
    requestId,
    model: data.model ?? selectedModel,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

export async function generateImage(prompt: string, n = 1, size = '1024x1024', model?: string): Promise<ImageGenerationResult> {
  const selectedModel = model || env.OPENROUTER_IMAGE_MODEL;
  const { data, requestId } = await openRouterFetch<{
    data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    model?: string;
  }>('/images/generations', {
    model: selectedModel,
    prompt,
    n,
    size,
  });

  const images = data.data ?? [];
  if (images.length === 0) {
    throw ApiError.badGateway('OpenRouter returned no images');
  }

  return {
    images: images.map((img) => ({
      url: img.url,
      b64_json: img.b64_json,
      revisedPrompt: img.revised_prompt,
    })),
    requestId,
    model: data.model ?? selectedModel,
  };
}
