# 🚀 Railway Deployment Guide

This guide covers how to fix and deploy the Viral Video Generator backend to Railway.

## ✅ Fixed Issues

### 1. GitHub Actions Workflows

#### backend-deploy.yml
- ✅ Fixed Railway CLI usage (removed hardcoded service ID)
- ✅ Fixed Docker build context
- ✅ Added proper JWT_SECRET for tests
- ✅ Removed token sanitization that could expose secrets
- ✅ Added Prisma generate before build

#### develop.yml
- ✅ Fixed incomplete workflow (was missing closing)
- ✅ Separated staging deployment to separate job
- ✅ Added proper conditional for staging

#### Dockerfile
- ✅ Updated to Node.js 20 (from 18)
- ✅ Added build dependencies (python3, make, g++) for bcrypt
- ✅ Fixed health check path (removed port 3001 reference)
- ✅ Added curl for health checks
- ✅ Fixed Prisma generate step

#### railway.json
- ✅ Fixed healthcheckPath from `/api/health` to `/health`
- ✅ Added proper watch patterns
- ✅ Added healthcheck configuration

## 🚀 Deployment Steps

### Step 1: Configure Railway Environment Variables

Go to your Railway project dashboard and set these required variables:

#### 🔐 Critical Secrets (Required)
```
JWT_SECRET=<32+ character random string>
VVG_JWT_SECRET=<32+ character random string>
INTERNAL_API_SECRET=<32+ character random string>
API_KEY_SALT=<24+ character random string>
```

**Generate these with:**
```bash
node viral-video-generator/backend/scripts/secrets/secret-manager.js generate
cat viral-video-generator/backend/.env
```

#### 🗄️ Database (Railway auto-provisions these)
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

**Note:** If Railway doesn't auto-inject, manually copy from:
- Railway Dashboard → Your Service → Variables

#### 🔑 API Keys (Required for functionality)
```
NEWS_API_KEY=your_newsapi_key
OPENAI_API_KEY=your_openai_key
OPENROUTER_API_KEY=your_openrouter_key
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token
```

#### ⚙️ Application Settings
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.up.railway.app
LOG_LEVEL=info
```

### Step 2: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

```
RAILWAY_TOKEN=<your-railway-token>
```

**Get Railway Token:**
1. Railway Dashboard → Account Settings → Tokens
2. Generate new token
3. Copy and paste into GitHub

Optional (for email notifications):
```
EMAIL_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
NOTIFICATION_EMAIL=admin@example.com
```

### Step 3: Deploy

#### Automatic Deployment (Recommended)
Push to main branch:
```bash
git add .
git commit -m "Fix workflows and Railway deployment"
git push origin main
```

GitHub Actions will automatically:
1. ✅ Run tests
2. ✅ Build application
3. ✅ Deploy to Railway

#### Manual Deployment
If needed, trigger manually:
1. Go to GitHub → Actions → Deploy Backend to Railway
2. Click "Run workflow"

### Step 4: Verify Deployment

Check the deployment status:

```bash
# Check health endpoint
curl https://your-backend-domain.up.railway.app/health

# Expected response:
{"status":"ok","timestamp":"2026-02-20T..."}
```

**Railway Dashboard:**
- Check logs for errors
- Verify health checks are passing
- Check environment variables are set

## 🔧 Troubleshooting

### Issue: "Build failed - dist/src/main.js not found"

**Fix:**
```bash
# Ensure Prisma generate runs before build
# This is now fixed in Dockerfile and workflows
```

### Issue: "JWT_SECRET is required"

**Fix:**
1. Check Railway Dashboard → Variables
2. Ensure JWT_SECRET is set (min 32 characters)
3. Restart the service

### Issue: "Database connection failed"

**Fix:**
1. Check DATABASE_URL is set correctly
2. Format should be: `postgresql://user:pass@host:5432/db`
3. Verify Railway Postgres is provisioned

### Issue: "Redis connection failed"

**Fix:**
1. Check REDIS_URL is set
2. Format should be: `redis://host:6379`
3. Verify Railway Redis is provisioned

### Issue: "Health check failing"

**Fix:**
1. Check application is running on port 3000
2. Verify `/health` endpoint is accessible
3. Check Railway logs for startup errors

### Issue: "GitHub Actions deployment failing"

**Fix:**
```bash
# 1. Check RAILWAY_TOKEN is set in GitHub Secrets
# 2. Verify token has not expired
# 3. Check Railway CLI version is compatible

# Update Railway CLI if needed
npm install -g @railway/cli@latest
```

## 📊 Monitoring

### Railway Dashboard
- **URL:** https://railway.app/project/ec7bd003-cdd2-434d-806b-61d38f6d3512
- **Metrics:** CPU, Memory, Requests
- **Logs:** Real-time application logs
- **Deployments:** Deployment history

### Health Checks
The application exposes:
- `GET /health` - Basic health check
- `GET /api/v1/docs` - Swagger API documentation

### Logs
View logs in Railway Dashboard or via CLI:
```bash
railway logs
```

## 🔄 Continuous Deployment

The setup automatically deploys on:
- ✅ Push to `main` branch
- ✅ Changes to `backend/**` directory
- ✅ Workflow file changes

To disable auto-deploy:
1. Railway Dashboard → Service → Settings
2. Toggle "Auto-deploy"

## 📝 Configuration Summary

### Files Modified
```
.github/workflows/
├── backend-deploy.yml      ✅ Fixed Railway CLI usage
├── develop.yml             ✅ Fixed incomplete workflow
├── notify-upload.yml       ✅ Fixed email notifications
└── cleanup-runs.yml        ✅ Fixed cleanup action

backend/
├── Dockerfile              ✅ Fixed Node version, health check
├── railway.json            ✅ Fixed healthcheck path
└── src/main.ts             ✅ Health endpoint at /health

railway.toml                ✅ Fixed configuration
```

### Required GitHub Secrets
- `RAILWAY_TOKEN` - Required for deployment
- `EMAIL_USERNAME` - Optional (notifications)
- `SMTP_PASSWORD` - Optional (notifications)

### Required Railway Variables
- `JWT_SECRET` - 32+ chars
- `DATABASE_URL` - Auto or manual
- `REDIS_URL` - Auto or manual
- `OPENAI_API_KEY` - For AI features
- `NEWS_API_KEY` - For trending topics

## 🎉 Success Checklist

- [ ] GitHub Secrets configured (RAILWAY_TOKEN)
- [ ] Railway Environment Variables set
- [ ] Database and Redis provisioned
- [ ] Push to main triggers deployment
- [ ] Health check returns 200 OK
- [ ] API docs accessible at /api/v1/docs
- [ ] Frontend can connect to backend

## 📞 Support

If issues persist:
1. Check Railway logs for specific errors
2. Verify all environment variables are set
3. Ensure health endpoint is responding
4. Check GitHub Actions logs for build errors

**Need more help?** Check the Railway documentation: https://docs.railway.app/
