#!/bin/bash

# Docker Secrets Setup Script
# Usage: ./scripts/secrets/setup-docker-secrets.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check if Docker is installed and swarm mode is active
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi

    # Check if swarm mode is active
    if ! docker info --format '{{.Swarm.LocalNodeState}}' | grep -q "active"; then
        log_warn "Docker Swarm mode is not active. Initializing..."
        docker swarm init || {
            log_error "Failed to initialize Docker Swarm. You may need to join a swarm or check Docker configuration."
            exit 1
        }
    fi

    log_success "Docker Swarm mode is active"
}

# Load environment variables from .env file
load_env() {
    if [[ ! -f "${ENV_FILE}" ]]; then
        log_error ".env file not found at ${ENV_FILE}"
        log_info "Please create your .env file first:"
        log_info "  node scripts/secrets/secret-manager.js generate"
        exit 1
    fi

    log_info "Loading secrets from ${ENV_FILE}..."
    
    # Export all variables from .env
    set -a
    source "${ENV_FILE}"
    set +a
}

# Create a Docker secret
create_secret() {
    local name=$1
    local value=$2
    local env_name=$3

    # Get value from environment variable
    local secret_value="${!env_name}"

    if [[ -z "${secret_value}" ]] || [[ "${secret_value}" == "your_"* ]] || [[ "${secret_value}" == *"changeme"* ]]; then
        log_warn "Skipping ${name} (not configured or using placeholder)"
        return
    fi

    # Check if secret already exists
    if docker secret ls --format '{{.Name}}' | grep -q "^${name}$"; then
        log_warn "Secret ${name} already exists. Remove it first with: docker secret rm ${name}"
        return
    fi

    # Create the secret
    echo "${secret_value}" | docker secret create "${name}" - || {
        log_error "Failed to create secret: ${name}"
        return
    }

    log_success "Created secret: ${name}"
}

# Create all required secrets
create_all_secrets() {
    log_info "Creating Docker secrets for environment: ${ENVIRONMENT}"

    # Core secrets
    create_secret "jwt_secret" "" "JWT_SECRET"
    create_secret "database_url" "" "DATABASE_URL"
    create_secret "redis_url" "" "REDIS_URL"
    create_secret "postgres_password" "" "VVG_DB_PASSWORD"

    # API Keys
    create_secret "news_api_key" "" "NEWS_API_KEY"
    create_secret "openai_api_key" "" "OPENAI_API_KEY"
    create_secret "openrouter_api_key" "" "OPENROUTER_API_KEY"

    # Social Media
    create_secret "youtube_client_id" "" "YOUTUBE_CLIENT_ID"
    create_secret "youtube_client_secret" "" "YOUTUBE_CLIENT_SECRET"
    create_secret "youtube_refresh_token" "" "YOUTUBE_REFRESH_TOKEN"
    create_secret "tiktok_client_key" "" "TIKTOK_CLIENT_KEY"
    create_secret "tiktok_client_secret" "" "TIKTOK_CLIENT_SECRET"
    create_secret "instagram_access_token" "" "INSTAGRAM_ACCESS_TOKEN"

    # Other
    create_secret "discord_webhook_url" "" "DISCORD_WEBHOOK_URL"

    log_success "Docker secrets setup complete!"
}

# List all secrets
list_secrets() {
    log_info "Listing Docker secrets:"
    docker secret ls
}

# Remove all secrets (use with caution!)
remove_all_secrets() {
    log_warn "This will remove ALL Docker secrets. Are you sure? (yes/no)"
    read -r confirmation
    
    if [[ "${confirmation}" != "yes" ]]; then
        log_info "Cancelled"
        exit 0
    fi

    log_info "Removing all Docker secrets..."
    
    local secrets=(
        "jwt_secret"
        "database_url"
        "redis_url"
        "postgres_password"
        "news_api_key"
        "openai_api_key"
        "openrouter_api_key"
        "youtube_client_id"
        "youtube_client_secret"
        "youtube_refresh_token"
        "tiktok_client_key"
        "tiktok_client_secret"
        "instagram_access_token"
        "discord_webhook_url"
    )

    for secret in "${secrets[@]}"; do
        if docker secret ls --format '{{.Name}}' | grep -q "^${secret}$"; then
            docker secret rm "${secret}" && log_success "Removed: ${secret}"
        fi
    done

    log_success "All secrets removed"
}

# Rotate a Docker secret
rotate_secret() {
    local secret_name=$1
    local env_name=$2

    if [[ -z "${secret_name}" ]] || [[ -z "${env_name}" ]]; then
        log_error "Usage: rotate-docker-secret <secret_name> <ENV_VAR_NAME>"
        log_info "Example: rotate-docker-secret jwt_secret JWT_SECRET"
        exit 1
    fi

    load_env

    local new_value="${!env_name}"
    
    if [[ -z "${new_value}" ]]; then
        log_error "Environment variable ${env_name} is not set in .env"
        exit 1
    fi

    log_info "Rotating Docker secret: ${secret_name}"

    # Remove old secret
    if docker secret ls --format '{{.Name}}' | grep -q "^${secret_name}$"; then
        docker secret rm "${secret_name}" || {
            log_error "Failed to remove old secret"
            exit 1
        }
        log_success "Removed old secret: ${secret_name}"
    fi

    # Create new secret
    echo "${new_value}" | docker secret create "${secret_name}" - || {
        log_error "Failed to create new secret"
        exit 1
    }

    log_success "Rotated secret: ${secret_name}"
    log_warn "⚠️  You must redeploy your services to use the new secret!"
    log_info "Run: docker stack deploy -c docker-compose.secrets.yml vvg"
}

# Show help
show_help() {
    cat <<EOF
Docker Secrets Management

Usage: $0 [command] [options]

Commands:
  setup [env]           Setup all Docker secrets from .env file (default: production)
  list                  List all Docker secrets
  remove-all            Remove all Docker secrets (DANGEROUS!)
  rotate <name> <var>   Rotate a specific secret
  help                  Show this help message

Examples:
  $0 setup                          # Setup secrets for production
  $0 setup staging                  # Setup secrets for staging
  $0 list                           # List all secrets
  $0 rotate jwt_secret JWT_SECRET   # Rotate JWT secret
  $0 remove-all                     # Remove all secrets (requires confirmation)

Prerequisites:
  1. Docker installed and running
  2. Docker Swarm mode initialized
  3. .env file with configured secrets

Notes:
  - Secrets are stored securely in Docker's encrypted Raft log
  - Secrets are only available to services in the same swarm
  - Never commit .env files with real secrets
  - Rotate secrets regularly (recommended: every 90 days)

EOF
}

# Main command handler
case "${1:-help}" in
    setup|create)
        check_docker
        load_env
        create_all_secrets
        ;;
    list|ls)
        check_docker
        list_secrets
        ;;
    remove-all|remove|delete-all)
        check_docker
        remove_all_secrets
        ;;
    rotate|rotate-secret)
        check_docker
        rotate_secret "$2" "$3"
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
