#!/bin/bash

# Secret Management Utility Script
# Usage: ./scripts/secrets/manage-secrets.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate a secure random secret
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 "${length}"
}

# Generate all required secrets
generate_all_secrets() {
    log_info "Generating secure secrets..."
    
    cat > "${ENV_FILE}" <<EOF
# ==========================================
# Auto-generated Secrets - $(date)
# ==========================================

# Critical Security Secrets (KEEP THESE SAFE!)
JWT_SECRET=$(generate_secret 32)
VVG_JWT_SECRET=$(generate_secret 32)
INTERNAL_API_SECRET=$(generate_secret 32)
API_KEY_SALT=$(generate_secret 16)

# Database Passwords
VVG_DB_PASSWORD=$(generate_secret 24 | tr -d '=' | cut -c1-20)
MJ_DB_PASSWORD=$(generate_secret 24 | tr -d '=' | cut -c1-20)

# ==========================================
# API Keys (Fill these in manually)
# ==========================================

# NewsAPI
NEWS_API_KEY=your_news_api_key_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Veo (Google)
VEO_API_KEY=your_veo_api_key_here

# Video Generation
LUMA_API_KEY=your_luma_api_key_here
RUNWAY_API_KEY=your_runway_api_key_here
MIDJOURNEY_API_KEY=your_midjourney_api_key_here

# Social Media APIs
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
YOUTUBE_REFRESH_TOKEN=your_youtube_refresh_token
YOUTUBE_CHANNEL_ID=your_youtube_channel_id
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
TIKTOK_ACCESS_TOKEN=your_tiktok_access_token
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token

# Discord
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# AWS S3
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_aws_access_key
S3_SECRET_ACCESS_KEY=your_aws_secret_key

# ==========================================
# Other Configuration
# ==========================================
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info

# Feature Flags
ENABLE_AUTO_GENERATION=false
REQUIRE_MANUAL_APPROVAL=true
GENERATION_INTERVAL_HOURS=1
EOF

    log_success "Generated .env file with secure secrets at: ${ENV_FILE}"
    log_warn "⚠️  IMPORTANT: Fill in the API keys manually before starting the application!"
    log_info "Review the file and update the placeholder values for external services."
}

# Check if secrets are properly configured
check_secrets() {
    log_info "Checking secret configuration..."
    
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error ".env file not found at ${ENV_FILE}"
        log_info "Run: ./scripts/secrets/manage-secrets.sh generate"
        exit 1
    fi
    
    # Source the .env file
    source "${ENV_FILE}"
    
    local errors=0
    
    # Check JWT_SECRET
    if [[ -z "${JWT_SECRET}" ]] || [[ "${JWT_SECRET}" == "your_"* ]] || [[ "${JWT_SECRET}" == *"changeme"* ]]; then
        log_error "JWT_SECRET is not properly configured (using placeholder or empty)"
        errors=$((errors + 1))
    elif [[ ${#JWT_SECRET} -lt 32 ]]; then
        log_error "JWT_SECRET is too short (minimum 32 characters, current: ${#JWT_SECRET})"
        errors=$((errors + 1))
    else
        log_success "JWT_SECRET is properly configured"
    fi
    
    # Check VVG_JWT_SECRET
    if [[ -z "${VVG_JWT_SECRET}" ]] || [[ "${VVG_JWT_SECRET}" == "your_"* ]]; then
        log_error "VVG_JWT_SECRET is not properly configured"
        errors=$((errors + 1))
    else
        log_success "VVG_JWT_SECRET is properly configured"
    fi
    
    # Check INTERNAL_API_SECRET
    if [[ -z "${INTERNAL_API_SECRET}" ]] || [[ "${INTERNAL_API_SECRET}" == "your_"* ]]; then
        log_error "INTERNAL_API_SECRET is not properly configured"
        errors=$((errors + 1))
    else
        log_success "INTERNAL_API_SECRET is properly configured"
    fi
    
    # Check database passwords
    if [[ -z "${VVG_DB_PASSWORD}" ]] || [[ "${VVG_DB_PASSWORD}" == "changeme"* ]]; then
        log_warn "VVG_DB_PASSWORD is using default/placeholder value"
    else
        log_success "VVG_DB_PASSWORD is configured"
    fi
    
    # Check critical API keys
    local api_keys=(
        "NEWS_API_KEY"
        "OPENAI_API_KEY"
        "OPENROUTER_API_KEY"
    )
    
    for key in "${api_keys[@]}"; do
        local value="${!key}"
        if [[ -z "${value}" ]] || [[ "${value}" == "your_"* ]]; then
            log_warn "${key} is not configured (may be optional)"
        else
            log_success "${key} is configured"
        fi
    done
    
    if [[ ${errors} -gt 0 ]]; then
        log_error "Found ${errors} critical configuration errors"
        exit 1
    else
        log_success "All critical secrets are properly configured!"
    fi
}

# Rotate a specific secret
rotate_secret() {
    local secret_name=$1
    
    if [[ -z "${secret_name}" ]]; then
        log_error "Usage: rotate-secret <SECRET_NAME>"
        log_info "Example: rotate-secret JWT_SECRET"
        exit 1
    fi
    
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error ".env file not found"
        exit 1
    fi
    
    log_info "Rotating ${secret_name}..."
    
    local new_secret=$(generate_secret 32)
    
    # Backup current .env
    cp "${ENV_FILE}" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Update the secret
    if grep -q "^${secret_name}=" "${ENV_FILE}"; then
        sed -i.bak "s/^${secret_name}=.*/${secret_name}=${new_secret}/" "${ENV_FILE}" && rm "${ENV_FILE}.bak"
        log_success "Rotated ${secret_name}"
        log_warn "⚠️  Remember to restart your application to use the new secret!"
        log_info "Backup saved at: ${ENV_FILE}.backup.*"
    else
        log_error "${secret_name} not found in .env file"
        exit 1
    fi
}

# Clean up backup files
cleanup_backups() {
    log_info "Cleaning up old backup files..."
    find "${PROJECT_ROOT}" -name ".env.backup.*" -type f -mtime +30 -delete
    log_success "Removed backup files older than 30 days"
}

# Export secrets for CI/CD (mask sensitive values)
export_for_ci() {
    log_info "Exporting secrets for CI/CD..."
    
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error ".env file not found"
        exit 1
    fi
    
    # Create a masked version for CI/CD logs
    grep -E '^(JWT_SECRET|VVG_JWT_SECRET|INTERNAL_API_SECRET|API_KEY_SALT)=' "${ENV_FILE}" | \
    sed 's/=.*$/=[REDACTED]/' > "${PROJECT_ROOT}/.env.ci.masked"
    
    log_success "Created masked CI file: .env.ci.masked"
    log_info "Use these environment variables in your CI/CD pipeline"
}

# Show help
show_help() {
    cat <<EOF
Secret Management Utility

Usage: $0 [command] [options]

Commands:
  generate              Generate a new .env file with secure secrets
  check                 Check if all secrets are properly configured
  rotate <SECRET>       Rotate a specific secret (e.g., JWT_SECRET)
  cleanup               Remove backup files older than 30 days
  export-ci             Export secrets in CI/CD safe format
  help                  Show this help message

Examples:
  $0 generate                    # Generate new secrets
  $0 check                       # Verify configuration
  $0 rotate JWT_SECRET          # Rotate JWT secret
  $0 cleanup                     # Clean old backups

Security Notes:
  - Never commit .env files to git
  - Keep backups secure
  - Rotate secrets regularly (recommended: every 90 days)
  - Use strong, unique passwords for each service

EOF
}

# Main command handler
case "${1:-help}" in
    generate|gen)
        generate_all_secrets
        ;;
    check|verify|validate)
        check_secrets
        ;;
    rotate|rotate-secret)
        rotate_secret "$2"
        ;;
    cleanup|clean)
        cleanup_backups
        ;;
    export-ci|ci)
        export_for_ci
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
