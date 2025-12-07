# Quick Start Guide

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker)
- Redis (or use Docker)

## 1. Clone & Install

```bash
# Navigate to project
cd "/Users/sham4/Antigravity/viral video generator"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your API keys
```

**Required API Keys:**

- NEWS_API_KEY
- OPENAI_API_KEY
- LUMA_API_KEY
- YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN

## 3. Setup Database

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

## 4. Run with Docker (Recommended)

```bash
# From project root
docker-compose up --build
```

**Access:**

- Frontend: http://localhost:80
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

## 5. Run Locally (Development)

```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access:**

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 6. Enable Automation

1. Open http://localhost:5173
2. Navigate to **Scheduler** page
3. Toggle "Enable Automatic Generation"
4. Videos will generate hourly!

## Test Manual Generation

```bash
curl -X POST http://localhost:3000/scheduler/trigger
```

## Deployment

### Railway (Backend)

1. Create Railway project
2. Add PostgreSQL + Redis services
3. Set all environment variables
4. Connect GitHub repo
5. Deploy

### Vercel (Frontend)

1. Import project
2. Set `VITE_API_URL` to your Railway backend URL
3. Deploy

---

**Need help?** Check the full [README.md](README.md)
