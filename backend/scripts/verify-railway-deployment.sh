#!/bin/bash

# Railway Deployment Verification Script
# Usage: ./scripts/verify-railway-deployment.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Railway Deployment Verifier${NC}"
echo "=================================="
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️ Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli@latest
fi

# Check if logged in
echo -e "${BLUE}🔐 Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Run: railway login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated with Railway${NC}"
echo ""

# Get project info
echo -e "${BLUE}📋 Getting project information...${NC}"
PROJECT=$(railway project 2>/dev/null || echo "Not linked")
if [ "$PROJECT" = "Not linked" ]; then
    echo -e "${YELLOW}⚠️ Not linked to a Railway project${NC}"
    echo "Run: railway link"
    exit 1
fi
echo -e "${GREEN}✅ Linked to project${NC}"
echo ""

# Check environment variables
echo -e "${BLUE}🔍 Checking environment variables...${NC}"

REQUIRED_VARS=("JWT_SECRET" "VVG_JWT_SECRET" "INTERNAL_API_SECRET" "NODE_ENV" "PORT")
MISSING_VARS=()
INVALID_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    VALUE=$(railway variables get "$var" 2>/dev/null || echo "")
    
    if [ -z "$VALUE" ]; then
        echo -e "${RED}❌ $var is NOT set${NC}"
        MISSING_VARS+=("$var")
    else
        # Check JWT_SECRET length
        if [ "$var" = "JWT_SECRET" ] || [ "$var" = "VVG_JWT_SECRET" ]; then
            LENGTH=${#VALUE}
            if [ $LENGTH -lt 32 ]; then
                echo -e "${RED}❌ $var is set but too short ($LENGTH chars, need 32+)${NC}"
                INVALID_VARS+=("$var")
            else
                echo -e "${GREEN}✅ $var is set and valid (${LENGTH} chars)${NC}"
            fi
        else
            echo -e "${GREEN}✅ $var is set${NC}"
        fi
    fi
done

# Check database
DB_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
if [ -z "$DB_URL" ]; then
    echo -e "${YELLOW}⚠️ DATABASE_URL not set - Railway should auto-provide this${NC}"
else
    echo -e "${GREEN}✅ DATABASE_URL is set${NC}"
fi

# Check Redis
REDIS_URL=$(railway variables get REDIS_URL 2>/dev/null || echo "")
if [ -z "$REDIS_URL" ]; then
    echo -e "${YELLOW}⚠️ REDIS_URL not set - Railway should auto-provide this${NC}"
else
    echo -e "${GREEN}✅ REDIS_URL is set${NC}"
fi

echo ""

# Check domain
DOMAIN=$(railway domain 2>/dev/null || echo "")
if [ -z "$DOMAIN" ]; then
    echo -e "${YELLOW}⚠️ No domain configured${NC}"
else
    echo -e "${GREEN}✅ Domain: https://$DOMAIN${NC}"
fi

echo ""

# Test health endpoint
if [ -n "$DOMAIN" ]; then
    echo -e "${BLUE}🌐 Testing health endpoint...${NC}"
    HEALTH_URL="https://$DOMAIN/health"
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check PASSED (HTTP 200)${NC}"
        RESPONSE=$(curl -s "$HEALTH_URL" 2>/dev/null || echo "")
        echo "   Response: $RESPONSE"
    else
        echo -e "${RED}❌ Health check FAILED (HTTP $HTTP_CODE)${NC}"
        echo "   URL: $HEALTH_URL"
    fi
    echo ""
fi

# Check logs for errors
echo -e "${BLUE}📜 Recent logs (last 20 lines)...${NC}"
railway logs --limit 20 2>/dev/null | tail -20 || echo -e "${YELLOW}⚠️ Could not fetch logs${NC}"
echo ""

# Summary
echo "=================================="
echo -e "${BLUE}📊 Summary${NC}"
echo "=================================="

if [ ${#MISSING_VARS[@]} -eq 0 ] && [ ${#INVALID_VARS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Deployment looks good.${NC}"
    
    if [ -n "$DOMAIN" ]; then
        echo ""
        echo "🔗 Your application is available at:"
        echo "   https://$DOMAIN"
        echo ""
        echo "📚 API Documentation:"
        echo "   https://$DOMAIN/api/v1/docs"
        echo ""
        echo "🔍 Health Check:"
        echo "   https://$DOMAIN/health"
    fi
    
    exit 0
else
    echo -e "${RED}❌ Issues found:${NC}"
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo ""
        echo "Missing variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
    fi
    
    if [ ${#INVALID_VARS[@]} -gt 0 ]; then
        echo ""
        echo "Invalid variables (need to be regenerated):"
        for var in "${INVALID_VARS[@]}"; do
            echo "  - $var"
        done
    fi
    
    echo ""
    echo -e "${YELLOW}💡 Run the fix pipeline to automatically fix these issues:${NC}"
    echo "   gh workflow run railway-fix-pipeline.yml -f fix_type=auto"
    echo ""
    echo "   Or manually:"
    echo "   railway variables set JWT_SECRET=\"$(openssl rand -base64 32)\""
    
    exit 1
fi
