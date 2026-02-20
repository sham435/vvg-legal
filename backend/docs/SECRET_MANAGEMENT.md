# Secret Management Guide

This guide covers how to securely manage secrets and environment variables for the Viral Video Generator application.

## 🚨 CRITICAL SECURITY RULES

1. **NEVER commit `.env` files to Git** - Already configured in `.gitignore`
2. **NEVER share secrets in Slack, email, or chat**
3. **NEVER use default/placeholder secrets in production**
4. **ALWAYS rotate secrets after team member departures**
5. **ALWAYS use strong, random secrets (min 32 characters)**

---

## 📁 Files Created

```
backend/
├── src/config/
│   └── env.validation.ts          # Environment validation with class-validator
├── scripts/secrets/
│   ├── manage-secrets.sh          # Bash secret management script
│   ├── secret-manager.js          # Node.js secret management script
│   └── setup-docker-secrets.sh    # Docker secrets setup script
├── config/
│   └── deployment.toml            # Deployment environment configurations
├── docker-compose.secrets.yml     # Docker Compose with secret support
└── .env.example                   # Template for environment variables
```

---

## 🚀 Quick Start

### 1. Generate Secure Secrets

```bash
cd viral-video-generator/backend

# Using Node.js script (cross-platform)
node scripts/secrets/secret-manager.js generate

# Or using Bash script (macOS/Linux)
./scripts/secrets/manage-secrets.sh generate
```

This creates a `.env` file with:
- ✅ Strong random secrets for JWT, API keys, salts
- ✅ Secure database passwords
- ✅ Placeholder values for external API keys

### 2. Fill in API Keys

Edit the generated `.env` file and replace placeholder values:

```bash
# Get your API keys from:
# - NewsAPI: https://newsapi.org
# - OpenAI: https://platform.openai.com
# - OpenRouter: https://openrouter.ai
# - YouTube: https://console.cloud.google.com
# - etc.

vim .env  # or use your preferred editor
```

### 3. Validate Configuration

```bash
# Check if all secrets are properly configured
node scripts/secrets/secret-manager.js check

# Or
./scripts/secrets/manage-secrets.sh check
```

### 4. Start Application

```bash
# Application will validate secrets on startup
npm run start:dev
```

---

## 🔐 Environment Variables Reference

### Critical Security Secrets (Auto-Generated)

| Variable | Purpose | Min Length | Rotation |
|----------|---------|------------|----------|
| `JWT_SECRET` | JWT token signing | 32 chars | 90 days |
| `VVG_JWT_SECRET` | Internal API JWT | 32 chars | 90 days |
| `INTERNAL_API_SECRET` | Service-to-service auth | 32 chars | 90 days |
| `API_KEY_SALT` | API key hashing | 24 chars | 90 days |
| `VVG_DB_PASSWORD` | Database password | 20 chars | 90 days |
| `MJ_DB_PASSWORD` | Midjourney DB password | 20 chars | 90 days |

### External API Keys (Manual Configuration)

| Variable | Service | Required | Documentation |
|----------|---------|----------|---------------|
| `NEWS_API_KEY` | NewsAPI | Yes | https://newsapi.org |
| `OPENAI_API_KEY` | OpenAI | Yes | https://platform.openai.com |
| `OPENROUTER_API_KEY` | OpenRouter | Optional | https://openrouter.ai |
| `VEO_API_KEY` | Google Veo | Optional | https://ai.google.dev |
| `LUMA_API_KEY` | Luma AI | Optional | https://lumalabs.ai |
| `RUNWAY_API_KEY` | Runway ML | Optional | https://runwayml.com |
| `MIDJOURNEY_API_KEY` | Midjourney | Optional | https://midjourney.com |

### Social Media API Keys

| Variable | Platform | Required | Documentation |
|----------|----------|----------|---------------|
| `YOUTUBE_CLIENT_ID` | YouTube | Yes | https://console.cloud.google.com |
| `YOUTUBE_CLIENT_SECRET` | YouTube | Yes | ^ |
| `YOUTUBE_REFRESH_TOKEN` | YouTube | Yes | OAuth2 flow |
| `TIKTOK_CLIENT_KEY` | TikTok | Optional | https://developers.tiktok.com |
| `TIKTOK_CLIENT_SECRET` | TikTok | Optional | ^ |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram | Optional | https://developers.facebook.com |

### Infrastructure

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection | Required |
| `REDIS_URL` | Redis connection | redis://localhost:6379 |
| `S3_BUCKET` | AWS S3 bucket | Optional |
| `DISCORD_WEBHOOK_URL` | Notifications | Optional |

---

## 🔄 Secret Rotation

### Rotate a Single Secret

```bash
# 1. Update the secret in .env
vim .env

# 2. Rotate it
node scripts/secrets/secret-manager.js rotate JWT_SECRET

# Or for Docker secrets
./scripts/secrets/setup-docker-secrets.sh rotate jwt_secret JWT_SECRET

# 3. Restart the application
```

### Rotate All Secrets (Quarterly)

```bash
# Backup current .env
cp .env .env.backup.$(date +%Y%m%d)

# Regenerate all internal secrets
node scripts/secrets/secret-manager.js generate

# Copy your API keys from backup
# (The script preserves placeholders for external keys)

# Validate
node scripts/secrets/secret-manager.js check

# Restart application
```

---

## 🐳 Docker Secrets

For production Docker deployments, use Docker secrets for better security.

### Setup Docker Secrets

```bash
# 1. Ensure Docker Swarm is initialized
docker swarm init

# 2. Create secrets from .env
./scripts/secrets/setup-docker-secrets.sh setup

# 3. Deploy with secrets
docker stack deploy -c docker-compose.secrets.yml vvg
```

### How Docker Secrets Work

- Secrets are stored in Docker's encrypted Raft log
- Only accessible to services in the same swarm
- Mounted as files in `/run/secrets/` (not environment variables)
- Never stored in image layers

### Docker Secret Commands

```bash
# List secrets
docker secret ls

# View a secret (cannot be done directly - must rotate)
docker secret inspect jwt_secret

# Remove a secret
docker secret rm jwt_secret

# Rotate a secret
echo "new-secret-value" | docker secret create jwt_secret -
```

---

## ☁️ Cloud Secret Managers

### Railway (Current Platform)

Railway uses environment variables directly:

1. Go to Railway Dashboard → Your Project → Variables
2. Add each secret individually:
   ```
   JWT_SECRET=<generated-secret>
   DATABASE_URL=<database-url>
   OPENAI_API_KEY=<openai-key>
   ```
3. Deploy automatically picks up new variables

### AWS Secrets Manager

```bash
# Store a secret
aws secretsmanager create-secret \
  --name viral-video-generator/jwt-secret \
  --secret-string "your-secret-here"

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id viral-video-generator/jwt-secret
```

### Google Secret Manager

```bash
# Store a secret
echo "your-secret" | gcloud secrets create jwt-secret --data-file=-

# Use in Cloud Run
# Secrets are automatically mounted as environment variables
```

### Azure Key Vault

```bash
# Store a secret
az keyvault secret set \
  --vault-name vvg-keyvault \
  --name jwt-secret \
  --value "your-secret"
```

---

## ✅ Validation & Best Practices

### Automatic Validation

The application now validates secrets on startup:

```typescript
// Will throw error if:
// - JWT_SECRET is missing
// - JWT_SECRET < 32 characters
// - Using placeholder values in production
```

### Check Secrets Command

```bash
# Validate all secrets
node scripts/secrets/secret-manager.js check

# Expected output:
# [SUCCESS] JWT_SECRET is properly configured
# [SUCCESS] VVG_JWT_SECRET is properly configured
# [SUCCESS] INTERNAL_API_SECRET is properly configured
# [SUCCESS] All critical secrets are properly configured!
```

### Environment-Specific Validation

Different validations for different environments:

| Environment | Required Secrets | Validation Level |
|-------------|------------------|------------------|
| Development | JWT_SECRET, DATABASE_URL | Basic |
| Staging | + REDIS_URL, NEWS_API_KEY | Standard |
| Production | + All API keys, Social Media | Strict |

---

## 🧪 Testing Secrets

### Local Development

```bash
# Create test secrets
node scripts/secrets/secret-manager.js generate

# Edit with test values
vim .env

# Run application
npm run start:dev
```

### CI/CD Testing

```yaml
# .github/workflows/test.yml
- name: Setup Test Environment
  run: |
    echo "JWT_SECRET=test-secret-32-chars-minimum-length" >> .env
    echo "DATABASE_URL=postgresql://test:test@localhost:5432/test" >> .env
```

---

## 📊 Secret Rotation Schedule

| Secret Type | Rotation Frequency | Last Rotation | Next Rotation |
|-------------|-------------------|---------------|---------------|
| JWT Secrets | Every 90 days | - | +90 days |
| API Keys | Every 180 days | - | Check provider |
| Database Passwords | Every 90 days | - | +90 days |
| OAuth Tokens | On expiry | - | Check expiry |
| Service Credentials | Every 90 days | - | +90 days |

**Recommendation**: Set calendar reminders for rotations.

---

## 🚨 Incident Response

### If Secrets Are Compromised

1. **Immediate (within 1 hour)**:
   ```bash
   # 1. Identify compromised secrets
   # 2. Rotate ALL secrets immediately
   node scripts/secrets/secret-manager.js generate
   
   # 3. Update in production
   # 4. Restart all services
   ```

2. **Short-term (within 24 hours)**:
   - Review access logs
   - Check for unauthorized usage
   - Notify affected API providers
   - Update documentation

3. **Long-term (within 1 week)**:
   - Post-mortem analysis
   - Update rotation schedule
   - Improve monitoring
   - Team training

### Secret Leak Detection

```bash
# Check if secrets exist in git history
git log --all --full-history -- .env

# Clean history if needed
git filter-repo --path .env --invert-paths

# Or use BFG Repo-Cleaner
bfg --delete-files .env
```

---

## 📚 Additional Resources

- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Docker Secrets](https://docs.docker.com/engine/swarm/secrets/)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [Google Secret Manager](https://cloud.google.com/secret-manager)
- [Azure Key Vault](https://docs.microsoft.com/en-us/azure/key-vault/)

---

## 🆘 Troubleshooting

### "JWT_SECRET must be at least 32 characters"

```bash
# Generate a stronger secret
node scripts/secrets/secret-manager.js rotate JWT_SECRET

# Or manually
export JWT_SECRET=$(openssl rand -base64 32)
```

### "Missing required environment variable"

```bash
# Check which variables are missing
node scripts/secrets/secret-manager.js check

# Generate missing secrets
node scripts/secrets/secret-manager.js generate
```

### Docker secrets not found

```bash
# Verify swarm mode
docker info | grep Swarm

# List available secrets
docker secret ls

# Recreate secrets
./scripts/secrets/setup-docker-secrets.sh setup
```

---

**Questions?** Check the troubleshooting section or contact your DevOps team.
