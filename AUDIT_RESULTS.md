# 🔍 COMPLETE STACK AUDIT RESULTS

## Run the Audit

```bash
cd viral-video-generator
./audit-and-fix-stack.sh
```

## What It Checks

### ✅ Section 1: File Structure
- All GitHub Actions workflows present
- Documentation files
- Setup scripts

### ✅ Section 2: Railway Deployment
- Project linked
- Domain configured
- Health endpoint responding

### ✅ Section 3: Environment Variables
- **Security**: JWT_SECRET, VVG_JWT_SECRET, INTERNAL_API_SECRET
- **Automation**: ENABLE_AUTO_GENERATION, GENERATION_INTERVAL_HOURS
- **API Keys**: NEWS_API_KEY, OPENAI_API_KEY, LUMA_API_KEY
- **YouTube**: YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
- **Infrastructure**: DATABASE_URL, REDIS_URL

### ✅ Section 4: GitHub Repository
- Repository detected
- RAILWAY_TOKEN secret configured

## Auto-Fixes Applied

The script will automatically fix:
- ✅ Missing JWT secrets (generates new ones)
- ✅ ENABLE_AUTO_GENERATION not set to "true"
- ✅ Missing GENERATION_INTERVAL_HOURS
- ✅ REQUIRE_MANUAL_APPROVAL not set to "false"

## Manual Fixes Required

These require your action:

### 1. API Keys (Free/Cheap)

**NewsAPI** (FREE):
```bash
cd backend
railway variables set NEWS_API_KEY="your-key-from-newsapi.org"
```

**OpenAI** (~$50/month):
```bash
railway variables set OPENAI_API_KEY="sk-your-key"
```

**Luma AI** (~$0.50/video):
```bash
railway variables set LUMA_API_KEY="your-key"
```

### 2. YouTube OAuth (FREE)

Setup steps:
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth2 credentials (Web application)
3. Add redirect URI: `https://your-domain.up.railway.app/auth/youtube/callback`
4. Get refresh token:
```bash
node backend/scripts/get-youtube-token.js
```
5. Set variables:
```bash
railway variables set YOUTUBE_CLIENT_ID="..."
railway variables set YOUTUBE_CLIENT_SECRET="..."
railway variables set YOUTUBE_REFRESH_TOKEN="..."
railway variables set YOUTUBE_CHANNEL_ID="..."
```

### 3. Add Database & Redis

In Railway Dashboard:
1. Click "New" → "Database" → "Add PostgreSQL"
2. Click "New" → "Database" → "Add Redis"
3. Railway auto-sets DATABASE_URL and REDIS_URL

### 4. Add RAILWAY_TOKEN to GitHub

1. Go to: https://github.com/sham435/vvg-legal/settings/secrets/actions
2. Click "New repository secret"
3. Name: `RAILWAY_TOKEN`
4. Value: Your token from https://railway.app/account/tokens

## Quick Fix Commands

### Fix Everything Automatically
```bash
./setup-100-working-stack.sh
# Select option 1
```

### Fix via GitHub Actions
```bash
# Complete setup
gh workflow run 100-working-stack.yml -f mode=setup

# Just fix issues
gh workflow run 100-working-stack.yml -f mode=fix

# Diagnose YouTube publishing
gh workflow run fix-youtube-publishing.yml -f action=diagnose
```

### Fix Manually
```bash
cd backend

# Enable auto-generation
railway variables set ENABLE_AUTO_GENERATION=true
railway variables set GENERATION_INTERVAL_HOURS=1
railway variables set REQUIRE_MANUAL_APPROVAL=false

# Generate secrets
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set VVG_JWT_SECRET="$(openssl rand -base64 32)"
railway variables set INTERNAL_API_SECRET="$(openssl rand -base64 32)"

# Redeploy
railway up --detach
```

## Expected Results

### ✅ Success Output:
```
🎉 PERFECT! No issues found!
✅ Your stack is 100% ready!
✅ Videos should be publishing automatically
```

### ⚠️ With Warnings:
```
✅ No critical errors
⚠️ X warnings (non-critical)
Your stack should work, but consider addressing warnings.
```

### ❌ With Errors:
```
❌ ERRORS: X
⚠️ WARNINGS: X
🔧 AUTO-FIXES APPLIED: X
```

## After Audit

1. **If errors found**: Run `./setup-100-working-stack.sh`
2. **If YouTube issues**: Run `gh workflow run fix-youtube-publishing.yml -f action=diagnose`
3. **If all good**: Wait 1 hour for first automatic video

## Verification

Check your YouTube channel:
https://www.youtube.com/@sham435/videos

You should see auto-generated videos appearing every hour!

---

**Run the audit now:**
```bash
./audit-and-fix-stack.sh
```
