# Merge Plan

Each feature was implemented on its own branch so it can be reviewed and merged as an independent PR. Branches form a **sequential train**: each branch is based on the previous one, so the diff of every PR is exactly the feature it introduces.

## Branch order

| # | Branch | Feature | Depends on |
| --- | --- | --- | --- |
| 0 | `main` | Initial scaffold | — |
| 1 | `feat/backend-foundation` | Env config, logging, error handling, DB connection, health | `main` |
| 2 | `feat/auth` | Email/password auth, JWT, protected routes (full stack) | #1 |
| 3 | `feat/facebook-login` | Facebook OAuth login + encrypted token storage | #2 |
| 4 | `feat/stripe-credits` | Credit packages, Stripe checkout, webhook, billing UI | #3 |
| 5 | `feat/openrouter-ai` | AI text/image generation + credit deduction | #4 |
| 6 | `feat/meta-api` | Meta Graph API service (accounts, Instagram, targeting, reach) | #5 |
| 7 | `feat/campaign-management` | Campaign/ad set/ad models + CRUD + sub-audience generation | #6 |
| 8 | `feat/campaign-wizard` | Multi-step campaign creation UI + draft save | #7 |
| 9 | `feat/meta-deployment` | Launch campaigns to Meta + status sync | #8 |
| 10 | `feat/insights-optimization` | Insights ingestion, reporting, rule-based optimization | #9 |
| 11 | `feat/notifications-polish` | In-app notifications, audience explorer, UI polish | #10 |
| 12 | `feat/testing-docs` | Tests, READMEs, Dockerfiles, CI | #11 |

## Recommended merge flow

1. **Merge #1 into `main`** — foundation only; no user-visible feature.
2. **Merge #2 → #11 sequentially.** Because each branch is based on its predecessor, merge each PR **in order**. If you keep `main` as the integration branch, you can either:
   - merge each PR into `main` and rebase/update the next branch onto the new `main`, or
   - use a release train: each PR targets the previous feature branch, and the final branch merges into `main`.
3. **Merge #12 last** — it adds tests/docs and depends on the full feature set.

## Review checklist per PR

- **#1** — environment parsing, graceful shutdown, structured logging.
- **#2** — password hashing, JWT expiry, protected route redirects.
- **#3** — OAuth state validation, long-lived token exchange, token encryption.
- **#4** — Stripe webhook signature verification, idempotent credit grant.
- **#5** — credit deduction only after successful generation.
- **#6** — Meta rate-limit retries and token-expiry errors.
- **#7** — ownership checks on every campaign/ad set/ad route.
- **#8** — audience builder typeahead, reach estimates, draft save.
- **#9** — Meta object creation order, partial-failure handling.
- **#10** — aggregation correctness, optimization rule thresholds.
- **#11** — notification read state, responsive layout.
- **#12** — CI green, README accuracy.

## After merging

- Tag releases on `main` (e.g. `v0.1.0`).
- Delete feature branches once merged.
- Keep the train strategy if more features are added: branch off the latest merged feature branch (or `main`).
