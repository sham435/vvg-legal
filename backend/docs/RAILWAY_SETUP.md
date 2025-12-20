# Railway Deployment & Automation Guide

This guide details exactly how to deploy the Viral Video Generator to Railway and set up the automated hourly publishing pipeline.

## 1. Prepare Your Repository

Ensure your backend repository is ready:

- `package.json` contains all dependencies.
- `src/cli/run-pipeline.ts` is the entry point.
- `.env.example` lists all required environment variables.

**Action**: Push all changes to GitHub.

## 2. Create a Railway Project

1.  Go to [Railway.app](https://railway.app).
2.  Click **New Project** → **Deploy from GitHub**.
3.  Select your repository.
4.  Railway will detect Node.js automatically.

## 3. Configure Environment Variables

Navigate to **Railway Project → Settings → Variables** and add the following keys. Railway injects these at runtime (no `.env` file required).

| Variable                 | Value                                                     |
| :----------------------- | :-------------------------------------------------------- |
| `YOUTUBE_REFRESH_TOKEN`  | Your valid Desktop App refresh token                      |
| `YOUTUBE_CLIENT_ID`      | OAuth Client ID                                           |
| `YOUTUBE_CLIENT_SECRET`  | OAuth Client Secret                                       |
| `DATABASE_URL`           | PostgreSQL connection string (Railway can provision this) |
| `OPENAI_API_KEY`         | Your OpenAI API Key                                       |
| `NEWS_API_KEY`           | Your NewsAPI Key                                          |
| `AMPLIFY_API_KEY`        | (Optional) If used                                        |
| `FACEBOOK_PAGE_TOKEN`    | (Optional) For FB publishing                              |
| `INSTAGRAM_ACCESS_TOKEN` | (Optional) For IG publishing                              |

## 4. Add a Railway Job (Cron) for Hourly Automation

1.  In your Railway Project, click **Add Plugin** (or Service Settings).
2.  Select **Jobs / Schedules** (or configure "Corn Schedule" in Service Settings).
3.  Create a new job with the following details:

- **Command**:
  ```bash
  npx ts-node src/cli/run-pipeline.ts "Automated Railway Publish"
  ```
- **Schedule**: `0 * * * *` (Every 1 hour)

4.  **Enable the job**. Railway will now execute the pipeline automatically every hour.

## 5. Deployment & Verification

Railway automatically builds and deploys from GitHub.

1.  Check the **Logs** tab for build status.
2.  Verify the first run of the cron job to ensure:
    - Video downloads succeed.
    - Metadata is sanitized.
    - Upload to YouTube completes.
    - `PublishLog` updates in the database.

## 6. Optional: Manual Trigger

You can trigger the pipeline manually using the Railway CLI or dashboard:

```bash
railway run npx ts-node src/cli/run-pipeline.ts "Manual Trigger"
```

## Outcome

✅ **Pipeline runs hourly automatically.**
✅ **Admin API remains available** for metadata edits and retries.
✅ **System fully automated, hosted, and monitored** via Railway.
