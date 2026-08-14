# AdGenious Backend

Express + TypeScript API for AdGenious.

## Scripts

```bash
npm run dev        # run with nodemon + ts-node
npm run build      # compile TypeScript to dist/
npm start          # run compiled server
npm test           # run jest unit tests
npm run typecheck  # tsc --noEmit
```

## Environment

Copy `.env.example` to `.env` and configure the values. The server exits early if MongoDB is unavailable.

## API Overview

| Area | Prefix | Notes |
| --- | --- | --- |
| Health | `/health` | Liveness check |
| Auth | `/api/auth` | Register, login, Facebook OAuth |
| Users | `/api/users` | Current user profile |
| Billing | `/api/billing` | Packages, checkout, webhook, history |
| AI | `/api/ai` | Text/image generation, generated content |
| Meta | `/api/meta` | Ad accounts, Instagram, targeting, reach |
| Campaigns | `/api/campaigns` | Campaign/ad set/ad CRUD, configure, launch |
| Audiences | `/api/audiences` | Sub-audience generation, reach estimates |
| Insights | `/api/insights` | Performance overview, campaign insights, refresh |
| Notifications | `/api/notifications` | In-app notification management |

All routes except health and auth registration/login are protected with `Authorization: Bearer <JWT>`.

## Architecture Notes

- `services/meta.ts` wraps the Meta Graph API directly (no SDK) and includes retry/backoff for rate-limit errors and token-expiry detection.
- `services/openrouter.ts` wraps OpenRouter's chat-completions and image-generation endpoints.
- `services/deployment.ts` orchestrates Meta campaign creation.
- `services/scheduler.ts` runs status sync, insight ingestion, and optimization rules on an interval.
- Facebook access tokens are encrypted with AES-256-GCM before storage.
