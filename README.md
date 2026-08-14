# AdGenious

**AdGenious** is an AI-powered advertising platform that automates the creation, launch, and optimization of Facebook and Instagram ad campaigns. It connects the Meta Marketing API with OpenRouter's AI models so a marketer can go from a broad audience idea to live, optimized ads in minutes.

## ✨ Features

- **Email & Facebook authentication** — register/login with email or "Continue with Facebook" (OAuth). Facebook access tokens are encrypted at rest.
- **Credits & Stripe billing** — purchase credit packages through Stripe Checkout, with a full credit ledger.
- **AI Studio** — generate ad copy and creative images with OpenRouter, charged against your credit balance.
- **Meta integration** — list ad accounts and Instagram business accounts, search targeting interests/behaviors, and get audience reach estimates.
- **Campaign management** — full campaign → ad set → ad hierarchy with CRUD endpoints.
- **Campaign wizard** — Meta-style flow: objective, audience builder (with automatic sub-audience generation and reach estimates), AI creatives, budget & schedule.
- **Meta deployment** — launch the whole hierarchy to Meta Ads Manager, store Meta IDs, and sync statuses back.
- **Reporting & optimization** — ingest performance insights, visualize them, and run rule-based auto-optimization (e.g. pause ads that spend without clicks).
- **In-app notifications** — get notified when campaigns launch or optimization rules act.

## 🧱 Tech Stack

### Frontend
- React (TypeScript), Create React App
- Material UI v5
- Redux Toolkit
- React Router v6
- Recharts
- Stripe.js

### Backend
- Node.js, Express (TypeScript)
- MongoDB + Mongoose
- JWT auth, bcrypt, AES-256-GCM token encryption
- Stripe, OpenRouter, and Meta Graph API integrations

## 📂 Repository Layout

```
AdGenious/
├── backend/          # Express + TypeScript API
│   ├── src/
│   │   ├── config/   # env parsing
│   │   ├── db/       # MongoDB connection
│   │   ├── middleware/
│   │   ├── models/   # Mongoose models
│   │   ├── routes/   # API routes
│   │   ├── services/ # business logic + external APIs
│   │   └── utils/
│   └── Dockerfile
├── frontend/         # React + MUI dashboard
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   └── utils/
│   └── Dockerfile
├── docker-compose.yml         # local MongoDB
├── docker-compose.prod.yml    # full production-like stack
└── MERGE_PLAN.md              # feature-branch / PR merge order
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ (developed on Node 25)
- npm 9+
- MongoDB 7 (or Docker)
- A Meta app (Facebook Login + Marketing API) with a redirect URI set to `http://localhost:5001/api/auth/facebook/callback`
- OpenRouter API key (optional, for AI)
- Stripe test keys (optional, for billing)

### Install

```bash
npm install
```

### Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in the values. The most important ones for local development:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign session JWTs |
| `ENCRYPTION_KEY` | Secret used to encrypt Facebook tokens |
| `META_APP_ID` / `META_APP_SECRET` | Meta/Facebook app credentials |
| `META_REDIRECT_URI` | Must match the app's OAuth redirect URI |
| `OPENROUTER_API_KEY` | OpenRouter key for AI generation |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe billing keys |

### Run

Start MongoDB:

```bash
docker compose up -d mongo
```

Start backend and frontend concurrently:

```bash
npm start
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001

Individual services:

```bash
npm run start:backend
npm run start:frontend
```

## 🧪 Tests

```bash
npm run test --workspace backend
npm run test --workspace frontend -- --watchAll=false
```

## 🐳 Production-like Docker stack

```bash
docker compose -f docker-compose.prod.yml up --build
```

## 🔀 Branching & Merge Plan

Every feature lives on its own branch so it can be reviewed as an independent PR. See [`MERGE_PLAN.md`](./MERGE_PLAN.md) for the recommended merge order and review notes.

## 📄 License

[ISC](https://opensource.org/licenses/ISC)
