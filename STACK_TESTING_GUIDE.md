# 🧪 Stack Testing & Automatic Publishing Fix Guide

## Problem Statement
Videos are only being pushed **manually**, not automatically. This guide helps you test the deployed stack 100% and fix automatic publishing.

---

## 🔍 Root Causes of Automatic Publishing Failure

Based on common issues, automatic publishing usually fails due to:

1. **❌ Auto-generation disabled** - `ENABLE_AUTO_GENERATION` not set to `true`
2. **❌ Missing YouTube credentials** - OAuth tokens expired or not configured
3. **❌ Missing API keys** - NewsAPI, OpenAI, or video generation services
4. **❌ Queue not processing** - Redis not configured or jobs stuck
5. **❌ Scheduler not running** - Cron job not configured properly
6. **❌ Manual approval required** - `REQUIRE_MANUAL_APPROVAL` set to `true`

---

## 🚀 Quick Fix (One Command)

Run this to automatically diagnose and fix issues:

```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=auto
```

This will:
1. ✅ Diagnose all issues
2. ✅ Enable auto-generation
3. ✅ Set required variables
4. ✅ Redeploy application
5. ✅ Verify configuration

---

## 📋 Manual Testing & Fixing

### Step 1: Run Comprehensive Stack Tests

Test all components of your deployed stack:

```bash
gh workflow run stack-testing.yml -f test_type=full
```

**This tests:**
- ✅ API endpoints (health, docs, trends, videos)
- ✅ Database connection and data
- ✅ Redis/Queue status
- ✅ External API keys (NewsAPI, OpenAI, YouTube)
- ✅ Scheduler configuration

**View results:**
- Go to GitHub → Actions → "Comprehensive Stack Testing"
- Check the "generate-report" job for summary

---

### Step 2: Diagnose Publishing Issues

Run the diagnostic workflow:

```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=scheduler
```

**This checks:**
1. Auto-generation enabled?
2. YouTube credentials valid?
3. API keys configured?
4. Video generation services available?
5. Queue system working?
6. Recent errors in logs?

---

### Step 3: Apply Fixes

Based on diagnosis, apply specific fixes:

#### Fix Auto-Generation
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=enable-auto-generation
```

**What it does:**
- Sets `ENABLE_AUTO_GENERATION=true`
- Sets `GENERATION_INTERVAL_HOURS=1`
- Sets `REQUIRE_MANUAL_APPROVAL=false`
- Redeploys application

#### Fix YouTube Authentication
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=youtube-auth
```

**Follow the guide to:**
1. Create OAuth2 credentials in Google Cloud
2. Set up authorized redirect URI
3. Get refresh token
4. Set environment variables in Railway

#### Fix Queue/Scheduler
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=queue
```

**This verifies:**
- Redis is connected
- BullMQ queues are working
- No failed jobs in queue

---

## 🔧 Manual Verification Commands

### Check Railway Status
```bash
cd backend

# Get domain
railway domain

# View logs
railway logs

# Check variables
railway variables

# Redeploy
railway up --detach
```

### Test Health Endpoint
```bash
# Replace with your actual Railway domain
DOMAIN=$(cd backend && railway domain)
curl https://$DOMAIN/health
```

### Check Queue Status
```bash
cd backend
railway run node -e "
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  
  async function check() {
    const keys = await redis.keys('bull:*:wait');
    console.log('Pending jobs:', keys.length);
    for (const key of keys) {
      const count = await redis.llen(key);
      console.log('  Queue:', key.replace('bull:', '').replace(':wait', ''), '=', count);
    }
    redis.disconnect();
  }
  
  check();
"
```

---

## 📊 Understanding the Workflows

### 1. `stack-testing.yml` - Comprehensive Testing
**Purpose:** Test all components of the deployed stack

**Jobs:**
- `test-api-endpoints` - Tests HTTP endpoints
- `test-database` - Tests PostgreSQL connection
- `test-redis-queue` - Tests Redis and BullMQ
- `test-external-apis` - Validates API keys
- `test-scheduler` - Checks scheduler configuration

**Usage:**
```bash
# Test everything
gh workflow run stack-testing.yml -f test_type=full

# Test specific component
gh workflow run stack-testing.yml -f test_type=database
gh workflow run stack-testing.yml -f test_type=scheduler
```

---

### 2. `fix-automatic-publishing.yml` - Fix Publishing
**Purpose:** Diagnose and fix automatic video publishing

**Jobs:**
- `diagnose-publishing` - Identifies all issues
- `fix-auto-generation` - Enables auto-generation
- `fix-youtube-auth` - Guides OAuth setup
- `fix-missing-apis` - Guides API key setup
- `restart-services` - Redeploys application

**Usage:**
```bash
# Automatic fix everything
gh workflow run fix-automatic-publishing.yml -f fix_type=auto

# Specific fixes
gh workflow run fix-automatic-publishing.yml -f fix_type=scheduler
gh workflow run fix-automatic-publishing.yml -f fix_type=youtube-auth
```

---

### 3. `railway-health-check.yml` - Monitoring
**Purpose:** Continuous monitoring of Railway deployment

**Features:**
- Runs every 6 hours automatically
- Checks health endpoint
- Validates environment variables
- Can auto-restart if unhealthy
- Creates GitHub issues on failures

**Usage:**
```bash
# Manual check
gh workflow run railway-health-check.yml -f action=check

# Run diagnostics
gh workflow run railway-health-check.yml -f action=diagnose

# Auto-fix issues
gh workflow run railway-health-check.yml -f action=fix

# Restart service
gh workflow run railway-health-check.yml -f action=restart
```

---

### 4. `railway-fix-pipeline.yml` - General Fixes
**Purpose:** Fix general Railway deployment issues

**Jobs:**
- Generate missing secrets
- Fix database connections
- Set application settings
- Run migrations
- Redeploy

**Usage:**
```bash
# Fix all issues
gh workflow run railway-fix-pipeline.yml -f fix_type=auto

# Specific fixes
gh workflow run railway-fix-pipeline.yml -f fix_type=secrets
gh workflow run railway-fix-pipeline.yml -f fix_type=database
gh workflow run railway-fix-pipeline.yml -f fix_type=full-reset
```

---

## ✅ Pre-Deployment Checklist

Before automatic publishing will work:

### Required Environment Variables
- [ ] `JWT_SECRET` (32+ characters)
- [ ] `VVG_JWT_SECRET` (32+ characters)
- [ ] `INTERNAL_API_SECRET` (32+ characters)
- [ ] `DATABASE_URL` (Railway auto-provides)
- [ ] `REDIS_URL` (Railway auto-provides)
- [ ] `ENABLE_AUTO_GENERATION=true`
- [ ] `GENERATION_INTERVAL_HOURS=1`
- [ ] `REQUIRE_MANUAL_APPROVAL=false`

### API Keys
- [ ] `NEWS_API_KEY` (from newsapi.org)
- [ ] `OPENAI_API_KEY` (from platform.openai.com)
- [ ] `LUMA_API_KEY` or `RUNWAY_API_KEY` (for video generation)

### YouTube Setup
- [ ] `YOUTUBE_CLIENT_ID` (Google Cloud Console)
- [ ] `YOUTUBE_CLIENT_SECRET` (Google Cloud Console)
- [ ] `YOUTUBE_REFRESH_TOKEN` (OAuth flow)
- [ ] `YOUTUBE_CHANNEL_ID` (Your YouTube channel)

---

## 🎯 Testing Sequence

Run these in order to test and fix everything:

### 1. Initial Diagnosis
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=scheduler
```

Wait for completion and check the output.

### 2. Apply Automatic Fixes
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=auto
```

This fixes what it can automatically.

### 3. Run Full Stack Test
```bash
gh workflow run stack-testing.yml -f test_type=full
```

Verify everything is working.

### 4. Check Railway Health
```bash
gh workflow run railway-health-check.yml -f action=check
```

Verify deployment is healthy.

### 5. Test Manual Trigger
Visit your Railway domain and test:
- Health endpoint: `https://<domain>/health`
- API docs: `https://<domain>/api/v1/docs`
- Dashboard: `https://<domain>/dashboard`

---

## 🚨 Common Issues & Solutions

### Issue: "ENABLE_AUTO_GENERATION not set"
**Solution:**
```bash
gh workflow run fix-automatic-publishing.yml -f fix_type=enable-auto-generation
```

### Issue: "YouTube credentials incomplete"
**Solution:**
1. Go to Google Cloud Console
2. Create OAuth2 credentials
3. Get refresh token
4. Set variables in Railway

```bash
cd backend
railway variables set YOUTUBE_CLIENT_ID="..."
railway variables set YOUTUBE_CLIENT_SECRET="..."
railway variables set YOUTUBE_REFRESH_TOKEN="..."
railway variables set YOUTUBE_CHANNEL_ID="..."
```

### Issue: "NewsAPI key not configured"
**Solution:**
1. Get free key from https://newsapi.org/register
2. Set in Railway:
```bash
cd backend
railway variables set NEWS_API_KEY="your-key"
```

### Issue: "Queue not processing"
**Solution:**
```bash
# Check Redis connection
cd backend
railway run node -e "
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);
  redis.ping().then(() => console.log('Redis OK')).catch(e => console.error('Redis failed:', e));
"

# Restart service
railway up --detach
```

---

## 📈 Expected Behavior After Fixes

Once everything is configured:

1. **Every hour**, the scheduler will:
   - Fetch trending topics from NewsAPI
   - Generate video scripts with OpenAI
   - Create videos using Luma/Runway
   - Upload to YouTube automatically

2. **You can monitor:**
   - Railway logs: `railway logs`
   - Queue status: Check dashboard or run queue check
   - YouTube Studio: Videos appear automatically

3. **Notifications:**
   - Discord webhook (if configured)
   - Email notifications (if configured)

---

## 🔍 Verification Steps

After applying fixes, verify:

### 1. Health Check
```bash
curl https://<your-domain>/health
# Should return: {"status":"ok",...}
```

### 2. API Access
```bash
curl https://<your-domain>/api/v1/trends
# Should return trend data
```

### 3. Database
Check that videos are being created:
```bash
cd backend
railway run npx prisma studio
# View Video table for new entries
```

### 4. Queue
Check for pending jobs:
```bash
# Should show queues with counts
cd backend
railway run node scripts/check-queue.js
```

### 5. Manual Test
Trigger one manually:
```bash
curl -X POST https://<your-domain>/api/v1/scheduler/trigger
```

---

## 🎉 Success Indicators

You'll know it's working when:

- ✅ Health check returns HTTP 200
- ✅ No errors in Railway logs
- ✅ Queue shows active jobs
- ✅ Database has Video entries
- ✅ YouTube Studio shows new videos
- ✅ Videos have "auto-generated" in title/description

---

## 📞 Troubleshooting

If issues persist:

1. **Check GitHub Actions logs** for specific errors
2. **View Railway logs**: `cd backend && railway logs`
3. **Verify all variables**: `cd backend && railway variables`
4. **Test locally first** to ensure code works
5. **Check API rate limits** (especially NewsAPI and OpenAI)

---

## 📝 Next Steps

1. ✅ Run the diagnosis: `gh workflow run fix-automatic-publishing.yml -f fix_type=scheduler`
2. ✅ Apply fixes: `gh workflow run fix-automatic-publishing.yml -f fix_type=auto`
3. ✅ Test stack: `gh workflow run stack-testing.yml -f test_type=full`
4. ✅ Monitor: Set up health check schedule
5. ✅ Verify: Check YouTube Studio after 1 hour

---

**Your automatic video publishing should now be working!** 🎬✨

If you still have issues, check the specific job logs in GitHub Actions for detailed error messages.
