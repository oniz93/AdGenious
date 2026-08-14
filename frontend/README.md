# AdGenious Frontend

React + TypeScript dashboard built with Create React App and Material UI.

## Scripts

```bash
npm start   # development server (http://localhost:3000)
npm run build
npm test    # run jest tests
```

## Environment

Copy `.env.example` to `.env`:

- `REACT_APP_API_URL` — backend base URL (default `http://localhost:5001`)
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` — Stripe publishable key for checkout redirects
- `REACT_APP_META_APP_ID` — informational

## Pages

- `/login`, `/register`, `/auth/facebook/callback` — authentication
- `/` — dashboard KPIs
- `/campaigns` — campaign list and detail
- `/campaigns/:id/wizard` — multi-step campaign creation
- `/ai` — AI Studio
- `/audiences` — standalone audience builder
- `/reports` — performance charts and tables
- `/billing` — credit packages and history
- `/settings` — profile, billing, and Meta connection

## State Management

Redux Toolkit is used for auth state. API calls go through the configured Axios client in `src/api/client.ts`, which attaches the JWT and handles 401s globally.
