# AdGenious

**AdGenious** is an AI-powered advertising platform designed to automate ad creation and optimization. This repository contains the source code for both the frontend dashboard and the backend API services.

## 🚀 Tech Stack

### Frontend
- **Framework:** React (TypeScript)
- **UI Library:** Material UI (MUI) v5
- **State Management:** Redux Toolkit
- **Routing:** React Router v6
- **Build Tool:** Create React App (react-scripts)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Utilities:** Dotenv, CORS, Nodemon

## 🛠️ Prerequisites

- Node.js (v18+ recommended)
- npm (v9+)

## 📦 Installation

This project is set up as a monorepo-style workspace. You can install dependencies for the root, frontend, and backend with a single command:

```bash
# Install all dependencies
npm run install:all
```

Alternatively, you can install them individually:

```bash
# Root dependencies
npm install

# Frontend dependencies
npm run install:frontend

# Backend dependencies
npm run install:backend
```

## 🏃‍♂️ Running the Application

To start both the frontend and backend servers concurrently in development mode:

```bash
npm start
```

This will launch:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001

### Individual Services

If you prefer to run services separately:

**Frontend only:**
```bash
npm run start:frontend
```

**Backend only:**
```bash
npm run start:backend
```

## 📂 Project Structure

```
AdGenious/
├── backend/          # Express.js API server
│   ├── src/
│   │   └── server.ts # Entry point
│   └── tsconfig.json
├── frontend/         # React dashboard application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Dashboard/
│   │   │   └── Campaigns/
│   │   └── theme/
│   └── tsconfig.json
└── package.json      # Root scripts for workspace management
```

## 🧪 Development Status

Currently, the project is in the **early development/scaffolding phase**.
- **Frontend:** Core directory structure, routing, and basic pages (Dashboard, Campaigns) are established.
- **Backend:** Basic server setup with health check endpoints.

## 📄 License

[ISC](https://opensource.org/licenses/ISC)
