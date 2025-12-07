# Viral Video Automation System 🎬

**Automated viral content generation and multi-platform publishing system** that generates trending videos every hour and publishes to YouTube, TikTok, and Instagram Reels.

## 🚀 Features

- ✅ **Automated Trending Detection** - Fetches viral topics from NewsAPI
- ✅ **AI Script Generation** - OpenAI creates engaging video scripts
- ✅ **Video Generation** - Luma Dream Machine / Runway Gen-3 integration
- ✅ **Multi-Platform Publishing** - Auto-upload to YouTube, TikTok, Instagram
- ✅ **Hourly Automation** - Cron-based scheduler
- ✅ **Queue Processing** - BullMQ with Redis for reliable job handling
- ✅ **Analytics Dashboard** - Track views, likes, revenue across platforms
- ✅ **Discord Notifications** - Real-time alerts for generation and publishing
- ✅ **Manual Controls** - Approve, edit, or trigger videos manually

## 🏗️ Architecture

```
Backend (NestJS)
├── Trends Module → NewsAPI integration
├── AI Module → OpenAI script generation
├── Video Module → Luma/Runway video generation
├── Scheduler Module → Hourly cron automation
├── Queue Module → BullMQ job processing
├── YouTube/TikTok/Instagram → Multi-platform uploaders
├── Analytics Module → Performance tracking
└── Notifications Module → Discord webhooks

Frontend (React 18 + Vite)
├── Dashboard → Stats overview
├── Trending Feed → Topic management
├── Video Queue → Generated videos
├── Scheduler → Automation settings
├── Analytics → Performance metrics
└── API Keys → Configuration reference

Infrastructure
├── PostgreSQL → Database (Prisma ORM)
├── Redis → Queue system
├── Docker → Containerization
└── CI/CD → GitHub Actions → Railway + Vercel
```

## 📋 Prerequisites

### Required API Keys

1. **NewsAPI** - [Get key](https://newsapi.org/) (Free tier available)
2. **OpenAI** - [Get key](https://platform.openai.com/) (Paid)
3. **Luma Dream Machine** - [Get key](https://lumalabs.ai/) (Paid, ~$0.50-$1/video)
4. **YouTube Data API** - [Setup OAuth](https://console.cloud.google.com/)
5. **TikTok Developer** - [Apply](https://developers.tiktok.com/) (Approval required)
6. **Instagram Graph API** - [Setup](https://developers.facebook.com/) (Requires FB Business Page)

### Optional

- Runway Gen-3 (Fallback video generation)
- Midjourney/Ideogram (Thumbnails)
- Discord Webhook (Notifications)

## 🛠️ Installation

### Local Development

1. **Clone repository**

   ```bash
   git clone <your-repo-url>
   cd viral-video-generator
   ```

2. **Backend setup**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your API keys
   npx prisma migrate dev
   npx prisma generate
   ```

3. **Frontend setup**

   ```bash
   cd frontend
   npm install
   ```

4. **Start with Docker**

   ```bash
   docker-compose up --build
   ```

   Or run separately:

   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run start:dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

5. **Access**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Docs: http://localhost:3000/api/docs

## 🚢 Deployment

### Railway (Backend)

1. Create Railway project
2. Add PostgreSQL and Redis services
3. Set environment variables from `.env.example`
4. Connect GitHub repository
5. Deploy automatically on push

### Vercel (Frontend)

1. Import project to Vercel
2. Set `VITE_API_URL` environment variable
3. Deploy

### CI/CD

GitHub Actions workflows are configured for automatic deployment:

- `.github/workflows/backend-deploy.yml` → Railway
- `.github/workflows/frontend-deploy.yml` → Vercel

## ⚙️ Configuration

### Enable Hourly Automation

In the dashboard:

1. Navigate to **Scheduler** page
2. Enable "Automatic Generation"
3. Videos will generate every hour

Or via API:

```bash
curl -X POST http://localhost:3000/scheduler/settings \
  -H "Content-Type: application/json" \
  -d '{"enableAutoGeneration": true}'
```

### Manual Video Generation

```bash
curl -X POST http://localhost:3000/scheduler/trigger
```

## 📊 Cost Estimate

For 24 videos/day automation:

| Service                | Monthly Cost       |
| ---------------------- | ------------------ |
| Luma API (24 videos)   | $720 - $1,440      |
| OpenAI GPT-4           | ~$50               |
| Railway (Backend + DB) | ~$20               |
| Vercel (Frontend)      | Free               |
| **Total**              | **~$790 - $1,510** |

**Revenue Potential**: With 10M monthly views @ $2 CPM = $20,000/month

## 🔐 Security Notes

- Never commit `.env` files
- Use environment variables for all API keys
- Enable YouTube OAuth2 refresh tokens
- Use JWT for dashboard authentication
- Implement rate limiting in production

## 📝 Database Migrations

```bash
# Create new migration
npm run prisma:migrate dev --name description

# Deploy to production
npm run prisma:migrate deploy

# Reset database (dev only)
npm run prisma:migrate reset
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📚 API Documentation

Once backend is running, visit:
**http://localhost:3000/api/docs**

Swagger UI provides interactive API documentation.

## 🐛 Troubleshooting

### "Cannot connect to database"

- Ensure PostgreSQL is running: `docker-compose up postgres`
- Check DATABASE_URL in `.env`

### "Queue jobs not processing"

- Ensure Redis is running: `docker-compose up redis`
- Check worker logs: `docker-compose logs worker`

### "YouTube upload fails"

- Verify OAuth2 refresh token is valid
- Check YouTube API quota

### "TikTok API error"

- Ensure developer account is approved
- Verify access token hasn't expired

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Luma Labs for Dream Machine
- NewsAPI for trending data
- NestJS & React communities

---

**Built with ❤️ for automated viral content creation**

Need help? Open an issue or contact [your-email@example.com]
