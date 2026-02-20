#!/usr/bin/env node

/**
 * Secret Management Utility - Node.js Version
 * Usage: node scripts/secrets/secret-manager.js [command]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const ENV_FILE = path.join(PROJECT_ROOT, '.env');
const ENV_EXAMPLE = path.join(PROJECT_ROOT, '.env.example');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
};

// Generate a secure random secret
function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64').replace(/[=+/]/g, '').substring(0, length);
}

// Generate all required secrets
function generateAllSecrets() {
  log.info('Generating secure secrets...');

  const envContent = `# ==========================================
# Auto-generated Secrets - ${new Date().toISOString()}
# ==========================================
# NEVER COMMIT THIS FILE TO GIT!

# Critical Security Secrets (KEEP THESE SAFE!)
JWT_SECRET=${generateSecret(44)}
VVG_JWT_SECRET=${generateSecret(44)}
INTERNAL_API_SECRET=${generateSecret(44)}
API_KEY_SALT=${generateSecret(24)}

# Database Passwords
VVG_DB_PASSWORD=${generateSecret(20)}
MJ_DB_PASSWORD=${generateSecret(20)}

# ==========================================
# API Keys (Fill these in manually)
# ==========================================

# NewsAPI - https://newsapi.org
NEWS_API_KEY=your_news_api_key_here

# OpenAI - https://platform.openai.com
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter - https://openrouter.ai
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Google Veo - https://ai.google.dev
VEO_API_KEY=your_veo_api_key_here

# Video Generation Services
LUMA_API_KEY=your_luma_api_key_here
RUNWAY_API_KEY=your_runway_api_key_here
MIDJOURNEY_API_KEY=your_midjourney_api_key_here

# Social Media APIs
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/auth/youtube/callback
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token
YOUTUBE_CHANNEL_ID=your_youtube_channel_id

TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
TIKTOK_REDIRECT_URI=https://your-production-domain.com/auth/tiktok/callback

INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_instagram_business_account_id

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url

# AWS S3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_aws_access_key
S3_SECRET_ACCESS_KEY=your_aws_secret_key

# ==========================================
# Application Configuration
# ==========================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info

# Feature Flags
ENABLE_AUTO_GENERATION=false
REQUIRE_MANUAL_APPROVAL=true
GENERATION_INTERVAL_HOURS=1

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Database URL (update with your credentials)
DATABASE_URL=postgresql://user:password@localhost:5432/viral_video_db
`;

  fs.writeFileSync(ENV_FILE, envContent);
  
  log.success(`Generated .env file with secure secrets at: ${ENV_FILE}`);
  log.warn('⚠️  IMPORTANT: Fill in the API keys manually before starting the application!');
  log.info('Review the file and update the placeholder values for external services.');
}

// Check if secrets are properly configured
function checkSecrets() {
  log.info('Checking secret configuration...');

  if (!fs.existsSync(ENV_FILE)) {
    log.error(`.env file not found at ${ENV_FILE}`);
    log.info('Run: node scripts/secrets/secret-manager.js generate');
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim();
    }
  });

  let errors = 0;

  // Check JWT_SECRET
  const jwtSecret = envVars.JWT_SECRET;
  if (!jwtSecret || jwtSecret.startsWith('your_') || jwtSecret.includes('changeme')) {
    log.error('JWT_SECRET is not properly configured (using placeholder or empty)');
    errors++;
  } else if (jwtSecret.length < 32) {
    log.error(`JWT_SECRET is too short (minimum 32 characters, current: ${jwtSecret.length})`);
    errors++;
  } else {
    log.success('JWT_SECRET is properly configured');
  }

  // Check other critical secrets
  const criticalSecrets = ['VVG_JWT_SECRET', 'INTERNAL_API_SECRET'];
  criticalSecrets.forEach(secret => {
    const value = envVars[secret];
    if (!value || value.startsWith('your_')) {
      log.error(`${secret} is not properly configured`);
      errors++;
    } else {
      log.success(`${secret} is properly configured`);
    }
  });

  // Check database passwords
  if (!envVars.VVG_DB_PASSWORD || envVars.VVG_DB_PASSWORD.includes('changeme')) {
    log.warn('VVG_DB_PASSWORD is using default/placeholder value');
  } else {
    log.success('VVG_DB_PASSWORD is configured');
  }

  // Check API keys
  const apiKeys = ['NEWS_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_API_KEY'];
  apiKeys.forEach(key => {
    const value = envVars[key];
    if (!value || value.startsWith('your_')) {
      log.warn(`${key} is not configured (may be optional)`);
    } else {
      log.success(`${key} is configured`);
    }
  });

  if (errors > 0) {
    log.error(`Found ${errors} critical configuration errors`);
    process.exit(1);
  } else {
    log.success('All critical secrets are properly configured!');
  }
}

// Rotate a specific secret
function rotateSecret(secretName) {
  if (!secretName) {
    log.error('Usage: rotate-secret <SECRET_NAME>');
    log.info('Example: rotate-secret JWT_SECRET');
    process.exit(1);
  }

  if (!fs.existsSync(ENV_FILE)) {
    log.error('.env file not found');
    process.exit(1);
  }

  log.info(`Rotating ${secretName}...`);

  const newSecret = generateSecret(44);
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');

  // Check if secret exists
  const regex = new RegExp(`^${secretName}=.*$`, 'm');
  if (!regex.test(envContent)) {
    log.error(`${secretName} not found in .env file`);
    process.exit(1);
  }

  // Backup current .env
  const backupFile = `${ENV_FILE}.backup.${Date.now()}`;
  fs.copyFileSync(ENV_FILE, backupFile);

  // Update the secret
  const newContent = envContent.replace(regex, `${secretName}=${newSecret}`);
  fs.writeFileSync(ENV_FILE, newContent);

  log.success(`Rotated ${secretName}`);
  log.warn('⚠️  Remember to restart your application to use the new secret!');
  log.info(`Backup saved at: ${backupFile}`);
}

// Clean up backup files
function cleanupBackups() {
  log.info('Cleaning up old backup files...');
  
  const files = fs.readdirSync(PROJECT_ROOT);
  let count = 0;
  
  files.forEach(file => {
    if (file.match(/\.env\.backup\.\d+/)) {
      const filePath = path.join(PROJECT_ROOT, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtime.getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      if (age > thirtyDays) {
        fs.unlinkSync(filePath);
        count++;
      }
    }
  });

  log.success(`Removed ${count} backup files older than 30 days`);
}

// Show help
function showHelp() {
  console.log(`
Secret Management Utility

Usage: node secret-manager.js [command] [options]

Commands:
  generate              Generate a new .env file with secure secrets
  check                 Check if all secrets are properly configured
  rotate <SECRET>       Rotate a specific secret (e.g., JWT_SECRET)
  cleanup               Remove backup files older than 30 days
  help                  Show this help message

Examples:
  node secret-manager.js generate        # Generate new secrets
  node secret-manager.js check           # Verify configuration
  node secret-manager.js rotate JWT_SECRET   # Rotate JWT secret
  node secret-manager.js cleanup         # Clean old backups

Security Notes:
  - Never commit .env files to git
  - Keep backups secure
  - Rotate secrets regularly (recommended: every 90 days)
  - Use strong, unique passwords for each service
`);
}

// Main command handler
const command = process.argv[2];

switch (command) {
  case 'generate':
  case 'gen':
    generateAllSecrets();
    break;
  case 'check':
  case 'verify':
  case 'validate':
    checkSecrets();
    break;
  case 'rotate':
  case 'rotate-secret':
    rotateSecret(process.argv[3]);
    break;
  case 'cleanup':
  case 'clean':
    cleanupBackups();
    break;
  case 'help':
  case '--help':
  case '-h':
  default:
    showHelp();
    if (command && command !== 'help' && command !== '--help' && command !== '-h') {
      log.error(`Unknown command: ${command}`);
      process.exit(1);
    }
    break;
}
