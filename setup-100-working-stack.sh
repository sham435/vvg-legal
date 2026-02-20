#!/bin/bash

# 100% Working Stack - One Click Setup
# Usage: ./setup-100-working-stack.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         🎬 100% WORKING NICHE STACK SETUP                  ║"
echo "║                                                            ║"
echo "║     Automatic Viral Video Generation & Publishing          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
    echo "Install: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not logged in to GitHub${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"

# Check if RAILWAY_TOKEN is set
if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${YELLOW}⚠️ RAILWAY_TOKEN not set in environment${NC}"
    echo "Please set it: export RAILWAY_TOKEN='your-token'"
    echo "Get token from: https://railway.app/account/tokens"
    exit 1
fi

echo -e "${GREEN}✅ Railway token configured${NC}"
echo ""

# Get repository info
echo -e "${BLUE}📦 Getting repository information...${NC}"
REPO=$(gh repo view --json owner,name -q '.owner.login + "/" + .name' 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo -e "${YELLOW}⚠️ Could not detect repository${NC}"
    read -p "Enter repository (owner/repo): " REPO
fi

echo -e "${GREEN}✅ Repository: $REPO${NC}"
echo ""

# Menu
echo -e "${BLUE}📋 What would you like to do?${NC}"
echo ""
echo "1) 🚀 Full Setup (Complete 100% working stack)"
echo "2) 🔍 Verify Current Stack"
echo "3) 🔧 Fix Issues"
echo "4) 🔄 Reset & Rebuild"
echo "5) 📊 Check Status"
echo "6) 🧪 Test Publishing"
echo "7) ❌ Exit"
echo ""
read -p "Select option (1-7): " OPTION

case $OPTION in
    1)
        echo ""
        echo -e "${BLUE}🚀 Starting full setup...${NC}"
        echo "This will:"
        echo "  ✅ Setup infrastructure (PostgreSQL, Redis)"
        echo "  ✅ Configure security (JWT secrets)"
        echo "  ✅ Set API keys"
        echo "  ✅ Configure YouTube"
        echo "  ✅ Enable automatic publishing"
        echo "  ✅ Deploy to Railway"
        echo "  ✅ Verify 100% working"
        echo ""
        read -p "Continue? (y/n): " CONFIRM
        if [ "$CONFIRM" = "y" ]; then
            gh workflow run 100-working-stack.yml -R $REPO -f mode=setup -f environment=$ENVIRONMENT
            echo ""
            echo -e "${GREEN}✅ Setup workflow triggered!${NC}"
            echo "Monitor progress: https://github.com/$REPO/actions"
        fi
        ;;
    
    2)
        echo ""
        echo -e "${BLUE}🔍 Running verification...${NC}"
        gh workflow run 100-working-stack.yml -R $REPO -f mode=verify -f environment=$ENVIRONMENT
        echo ""
        echo -e "${GREEN}✅ Verification triggered!${NC}"
        echo "Check results: https://github.com/$REPO/actions"
        ;;
    
    3)
        echo ""
        echo -e "${BLUE}🔧 Running automatic fixes...${NC}"
        gh workflow run 100-working-stack.yml -R $REPO -f mode=fix -f environment=$ENVIRONMENT
        echo ""
        echo -e "${GREEN}✅ Fix workflow triggered!${NC}"
        echo "Check progress: https://github.com/$REPO/actions"
        ;;
    
    4)
        echo ""
        echo -e "${YELLOW}⚠️ WARNING: This will reset and rebuild everything${NC}"
        read -p "Are you sure? (type 'reset' to confirm): " CONFIRM
        if [ "$CONFIRM" = "reset" ]; then
            gh workflow run 100-working-stack.yml -R $REPO -f mode=reset -f environment=$ENVIRONMENT
            echo ""
            echo -e "${GREEN}✅ Reset workflow triggered!${NC}"
        fi
        ;;
    
    5)
        echo ""
        echo -e "${BLUE}📊 Checking stack status...${NC}"
        
        # Check workflow status
        echo ""
        echo "Recent workflow runs:"
        gh run list -R $REPO -w "100% Working Stack - Master Orchestrator" -L 5
        
        echo ""
        echo -e "${GREEN}✅ Status check complete${NC}"
        ;;
    
    6)
        echo ""
        echo -e "${BLUE}🧪 Testing automatic publishing...${NC}"
        
        # Run stack testing
        gh workflow run stack-testing.yml -R $REPO -f test_type=full
        
        echo ""
        echo -e "${GREEN}✅ Testing workflow triggered!${NC}"
        echo "Check results: https://github.com/$REPO/actions"
        ;;
    
    7)
        echo ""
        echo -e "${BLUE}👋 Goodbye!${NC}"
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "💡 Next Steps:"
echo "========================================"
echo ""
echo "1. Monitor the workflow:"
echo "   https://github.com/$REPO/actions"
echo ""
echo "2. Once complete, check your Railway app:"
echo "   railway open"
echo ""
echo "3. Test the health endpoint:"
echo "   curl https://<your-domain>/health"
echo ""
echo "4. Visit the dashboard:"
echo "   https://<your-domain>/dashboard"
echo ""
echo "5. Wait for first automatic video (within 1 hour)"
echo ""
echo "🎉 Your 100% working niche stack is being set up!"
echo ""
