#!/bin/bash

# Complete Stack Audit & Auto-Fix Script
# Usage: ./audit-and-fix-stack.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ERRORS=0
WARNINGS=0
FIXES_APPLIED=0

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     🔍 COMPLETE STACK AUDIT & AUTO-FIX                   ║"
echo "║                                                            ║"
echo "║     Viral Video Generator - 100% Working Stack           ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check if in correct directory
if [ ! -d ".github/workflows" ]; then
    echo -e "${RED}❌ Error: Must run from viral-video-generator directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Starting comprehensive audit...${NC}"
echo ""

#######################################
# SECTION 1: FILE STRUCTURE AUDIT
#######################################
echo -e "${BLUE}1️⃣ AUDITING: File Structure${NC}"
echo "-----------------------------------------------------------"

REQUIRED_WORKFLOWS=(
    "100-working-stack.yml"
    "backend-deploy.yml"
    "stack-testing.yml"
    "fix-automatic-publishing.yml"
    "fix-youtube-publishing.yml"
    "railway-health-check.yml"
    "railway-fix-pipeline.yml"
)

MISSING_WORKFLOWS=()

for workflow in "${REQUIRED_WORKFLOWS[@]}"; do
    if [ -f ".github/workflows/$workflow" ]; then
        echo -e "${GREEN}✅ $workflow${NC}"
    else
        echo -e "${RED}❌ $workflow - MISSING${NC}"
        MISSING_WORKFLOWS+=("$workflow")
        ((ERRORS++))
    fi
done

# Check documentation
REQUIRED_DOCS=(
    "100_WORKING_STACK_README.md"
    "IMPLEMENTATION_COMPLETE.md"
    "RAILWAY_DEPLOYMENT_GUIDE.md"
    "SECRET_MANAGEMENT_COMPLETE.md"
)

echo ""
echo "Documentation files:"
for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc${NC}"
    else
        echo -e "${YELLOW}⚠️ $doc - missing (optional)${NC}"
        ((WARNINGS++))
    fi
done

# Check scripts
if [ -f "setup-100-working-stack.sh" ]; then
    echo -e "${GREEN}✅ setup-100-working-stack.sh${NC}"
else
    echo -e "${RED}❌ setup-100-working-stack.sh - MISSING${NC}"
    ((ERRORS++))
fi

echo ""

#######################################
# SECTION 2: RAILWAY DEPLOYMENT AUDIT
#######################################
if command -v railway &> /dev/null && [ -n "$RAILWAY_TOKEN" ]; then
    echo -e "${BLUE}2️⃣ AUDITING: Railway Deployment${NC}"
    echo "-----------------------------------------------------------"
    
    cd backend
    
    # Check if linked
    if railway project &> /dev/null; then
        echo -e "${GREEN}✅ Railway project linked${NC}"
    else
        echo -e "${RED}❌ Railway project not linked${NC}"
        echo "   Fix: cd backend && railway link"
        ((ERRORS++))
    fi
    
    # Check domain
    DOMAIN=$(railway domain 2>/dev/null || echo "")
    if [ -n "$DOMAIN" ]; then
        echo -e "${GREEN}✅ Domain configured: https://$DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️ Domain not configured${NC}"
        ((WARNINGS++))
    fi
    
    # Test health endpoint
    if [ -n "$DOMAIN" ]; then
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" 2>/dev/null || echo "000")
        if [ "$HEALTH" = "200" ]; then
            echo -e "${GREEN}✅ Health check: PASSED (HTTP 200)${NC}"
        else
            echo -e "${RED}❌ Health check: FAILED (HTTP $HEALTH)${NC}"
            ((ERRORS++))
        fi
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️ Railway CLI not available or token not set - skipping Railway audit${NC}"
    echo "   Set: export RAILWAY_TOKEN='your-token'"
fi

echo ""

#######################################
# SECTION 3: ENVIRONMENT VARIABLES AUDIT
#######################################
if command -v railway &> /dev/null && [ -n "$RAILWAY_TOKEN" ]; then
    echo -e "${BLUE}3️⃣ AUDITING: Environment Variables${NC}"
    echo "-----------------------------------------------------------"
    
    cd backend
    
    # Critical variables
    echo "Critical Security Variables:"
    
    JWT=$(railway variables get JWT_SECRET 2>/dev/null || echo "")
    if [ -n "$JWT" ] && [ ${#JWT} -ge 32 ]; then
        echo -e "${GREEN}✅ JWT_SECRET (${#JWT} chars)${NC}"
    else
        echo -e "${RED}❌ JWT_SECRET missing or too short${NC}"
        echo "   Auto-fixing..."
        railway variables set JWT_SECRET="$(openssl rand -base64 32)" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++)) || echo -e "${RED}   ❌ Failed${NC}"
        ((ERRORS++))
    fi
    
    VVG_JWT=$(railway variables get VVG_JWT_SECRET 2>/dev/null || echo "")
    if [ -n "$VVG_JWT" ] && [ ${#VVG_JWT} -ge 32 ]; then
        echo -e "${GREEN}✅ VVG_JWT_SECRET (${#VVG_JWT} chars)${NC}"
    else
        echo -e "${RED}❌ VVG_JWT_SECRET missing or too short${NC}"
        echo "   Auto-fixing..."
        railway variables set VVG_JWT_SECRET="$(openssl rand -base64 32)" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++)) || echo -e "${RED}   ❌ Failed${NC}"
        ((ERRORS++))
    fi
    
    INTERNAL=$(railway variables get INTERNAL_API_SECRET 2>/dev/null || echo "")
    if [ -n "$INTERNAL" ] && [ ${#INTERNAL} -ge 32 ]; then
        echo -e "${GREEN}✅ INTERNAL_API_SECRET (${#INTERNAL} chars)${NC}"
    else
        echo -e "${RED}❌ INTERNAL_API_SECRET missing or too short${NC}"
        echo "   Auto-fixing..."
        railway variables set INTERNAL_API_SECRET="$(openssl rand -base64 32)" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++)) || echo -e "${RED}   ❌ Failed${NC}"
        ((ERRORS++))
    fi
    
    echo ""
    echo "Automation Settings:"
    
    AUTO_GEN=$(railway variables get ENABLE_AUTO_GENERATION 2>/dev/null || echo "")
    if [ "$AUTO_GEN" = "true" ]; then
        echo -e "${GREEN}✅ ENABLE_AUTO_GENERATION=true${NC}"
    else
        echo -e "${RED}❌ ENABLE_AUTO_GENERATION is '$AUTO_GEN' (should be 'true')${NC}"
        echo "   Auto-fixing..."
        railway variables set ENABLE_AUTO_GENERATION="true" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++)) || echo -e "${RED}   ❌ Failed${NC}"
        ((ERRORS++))
    fi
    
    INTERVAL=$(railway variables get GENERATION_INTERVAL_HOURS 2>/dev/null || echo "")
    if [ -n "$INTERVAL" ]; then
        echo -e "${GREEN}✅ GENERATION_INTERVAL_HOURS=$INTERVAL${NC}"
    else
        echo -e "${YELLOW}⚠️ GENERATION_INTERVAL_HOURS not set, using default (1)${NC}"
        railway variables set GENERATION_INTERVAL_HOURS="1" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++))
    fi
    
    MANUAL=$(railway variables get REQUIRE_MANUAL_APPROVAL 2>/dev/null || echo "")
    if [ "$MANUAL" = "false" ]; then
        echo -e "${GREEN}✅ REQUIRE_MANUAL_APPROVAL=false${NC}"
    else
        echo -e "${YELLOW}⚠️ REQUIRE_MANUAL_APPROVAL is '$MANUAL' (should be 'false' for auto-publish)${NC}"
        echo "   Auto-fixing..."
        railway variables set REQUIRE_MANUAL_APPROVAL="false" 2>/dev/null && echo -e "${GREEN}   ✅ Fixed${NC}" && ((FIXES_APPLIED++))
    fi
    
    echo ""
    echo "API Keys (Manual Setup Required):"
    
    NEWS=$(railway variables get NEWS_API_KEY 2>/dev/null || echo "")
    if [ -n "$NEWS" ] && [ "$NEWS" != "your_"* ]; then
        echo -e "${GREEN}✅ NEWS_API_KEY configured${NC}"
    else
        echo -e "${RED}❌ NEWS_API_KEY missing${NC}"
        echo "   Get free key: https://newsapi.org/register"
        ((ERRORS++))
    fi
    
    OPENAI=$(railway variables get OPENAI_API_KEY 2>/dev/null || echo "")
    if [ -n "$OPENAI" ] && [ "$OPENAI" != "your_"* ] && [ "$OPENAI" != "sk-your_"* ]; then
        echo -e "${GREEN}✅ OPENAI_API_KEY configured${NC}"
    else
        echo -e "${RED}❌ OPENAI_API_KEY missing${NC}"
        echo "   Get key: https://platform.openai.com/api-keys"
        ((ERRORS++))
    fi
    
    LUMA=$(railway variables get LUMA_API_KEY 2>/dev/null || echo "")
    RUNWAY=$(railway variables get RUNWAY_API_KEY 2>/dev/null || echo "")
    if [ -n "$LUMA" ] || [ -n "$RUNWAY" ]; then
        echo -e "${GREEN}✅ Video generation service configured${NC}"
    else
        echo -e "${RED}❌ Video generation service missing${NC}"
        echo "   Get Luma key: https://lumalabs.ai/ (~$0.50/video)"
        echo "   Or Runway: https://runwayml.com/"
        ((ERRORS++))
    fi
    
    echo ""
    echo "YouTube OAuth (Manual Setup Required):"
    
    YT_CLIENT=$(railway variables get YOUTUBE_CLIENT_ID 2>/dev/null || echo "")
    YT_SECRET=$(railway variables get YOUTUBE_CLIENT_SECRET 2>/dev/null || echo "")
    YT_TOKEN=$(railway variables get YOUTUBE_REFRESH_TOKEN 2>/dev/null || echo "")
    
    if [ -n "$YT_CLIENT" ] && [ -n "$YT_SECRET" ] && [ -n "$YT_TOKEN" ]; then
        echo -e "${GREEN}✅ YouTube OAuth configured${NC}"
    else
        echo -e "${RED}❌ YouTube OAuth incomplete${NC}"
        [ -z "$YT_CLIENT" ] && echo "   - Missing: YOUTUBE_CLIENT_ID"
        [ -z "$YT_SECRET" ] && echo "   - Missing: YOUTUBE_CLIENT_SECRET"
        [ -z "$YT_TOKEN" ] && echo "   - Missing: YOUTUBE_REFRESH_TOKEN"
        echo "   Setup: https://console.cloud.google.com/apis/credentials"
        ((ERRORS++))
    fi
    
    echo ""
    echo "Infrastructure:"
    
    DB=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
    if [ -n "$DB" ]; then
        echo -e "${GREEN}✅ DATABASE_URL configured${NC}"
    else
        echo -e "${RED}❌ DATABASE_URL missing${NC}"
        echo "   Add PostgreSQL in Railway Dashboard"
        ((ERRORS++))
    fi
    
    REDIS=$(railway variables get REDIS_URL 2>/dev/null || echo "")
    if [ -n "$REDIS" ]; then
        echo -e "${GREEN}✅ REDIS_URL configured${NC}"
    else
        echo -e "${RED}❌ REDIS_URL missing${NC}"
        echo "   Add Redis in Railway Dashboard"
        ((ERRORS++))
    fi
    
    cd ..
fi

echo ""

#######################################
# SECTION 4: GITHUB REPOSITORY AUDIT
#######################################
echo -e "${BLUE}4️⃣ AUDITING: GitHub Repository${NC}"
echo "-----------------------------------------------------------"

if gh auth status &> /dev/null; then
    REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name' 2>/dev/null || echo "")
    if [ -n "$REPO" ]; then
        echo -e "${GREEN}✅ Repository: $REPO${NC}"
        
        # Check if RAILWAY_TOKEN secret is set
        if gh secret list -R "$REPO" 2>/dev/null | grep -q "RAILWAY_TOKEN"; then
            echo -e "${GREEN}✅ RAILWAY_TOKEN secret configured${NC}"
        else
            echo -e "${RED}❌ RAILWAY_TOKEN secret missing${NC}"
            echo "   Add at: https://github.com/$REPO/settings/secrets/actions"
            ((ERRORS++))
        fi
    else
        echo -e "${YELLOW}⚠️ Could not detect repository${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ GitHub CLI not authenticated${NC}"
fi

echo ""

#######################################
# FINAL SUMMARY
#######################################
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 AUDIT SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 PERFECT! No issues found!${NC}"
    echo ""
    echo "✅ Your stack is 100% ready!"
    echo "✅ Videos should be publishing automatically"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ No critical errors${NC}"
    echo -e "${YELLOW}⚠️ $WARNINGS warnings (non-critical)${NC}"
    echo ""
    echo "Your stack should work, but consider addressing warnings."
    echo ""
    exit 0
else
    echo -e "${RED}❌ ERRORS: $ERRORS${NC}"
    echo -e "${YELLOW}⚠️ WARNINGS: $WARNINGS${NC}"
    if [ $FIXES_APPLIED -gt 0 ]; then
        echo -e "${GREEN}🔧 AUTO-FIXES APPLIED: $FIXES_APPLIED${NC}"
    fi
    echo ""
    
    if [ $FIXES_APPLIED -gt 0 ]; then
        echo -e "${GREEN}✅ Automatically fixed $FIXES_APPLIED issues!${NC}"
        echo ""
    fi
    
    echo "🔧 To fix remaining issues:"
    echo ""
    echo "1. Run the 100% Working Stack setup:"
    echo "   ./setup-100-working-stack.sh"
    echo ""
    echo "2. Or trigger via GitHub Actions:"
    echo "   gh workflow run 100-working-stack.yml -f mode=setup"
    echo ""
    echo "3. Check detailed diagnostics:"
    echo "   gh workflow run fix-youtube-publishing.yml -f action=diagnose"
    echo ""
    
    exit 1
fi
