#!/bin/bash

# Railway Deployment Verification Script
# Run this script on Railway via SSH: railway ssh -s vvg

echo "🚂 Railway Deployment Stack Verification"
echo "=========================================="
echo ""

# Detect if we're on Railway
if [ -n "$RAILWAY_ENVIRONMENT" ] || [ -n "$RAILWAY_SERVICE_ID" ]; then
    echo "✅ Running on Railway"
    RAILWAY=true
else
    echo "⚠️  Not detected as Railway environment (may still work)"
    RAILWAY=false
fi

echo ""
echo "1. Environment Check"
echo "-------------------"
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "PORT: ${PORT:-not set}"
echo "RAILWAY_ENVIRONMENT: ${RAILWAY_ENVIRONMENT:-not set}"
echo ""

echo "2. Service Status"
echo "----------------"
if pgrep -f "node.*main.js" > /dev/null; then
    echo "✅ Node.js process running"
    pgrep -f "node.*main.js" | head -1 | xargs ps -p 2>/dev/null | tail -1
else
    echo "❌ Node.js process NOT running"
fi
echo ""

echo "3. Health Check"
echo "---------------"
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}/health 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health endpoint: OK (200)"
else
    echo "❌ Health endpoint: Failed ($HEALTH)"
fi
echo ""

echo "4. Build Verification"
echo "---------------------"
if [ -d "dist" ]; then
    echo "✅ dist/ directory exists"
    
    # Check GeneticOptimizationService
    if [ -f "dist/src/ai/genetic/genetic-optimization.service.js" ]; then
        echo "✅ GeneticOptimizationService in build"
        METHODS=$(grep -o "optimizeScript\|quickOptimize\|deepOptimize\|batchOptimize" dist/src/ai/genetic/genetic-optimization.service.js | wc -l)
        echo "   Methods found: $METHODS"
    else
        echo "❌ GeneticOptimizationService NOT in build"
    fi
    
    # Check LTX-Video driver
    if grep -q "generateWithLTX" dist/src/modules/video/video.service.js 2>/dev/null; then
        LTX_COUNT=$(grep -o "generateWithLTX\|ltx-video" dist/src/modules/video/video.service.js | wc -l)
        echo "✅ LTX-Video driver in build ($LTX_COUNT references)"
    else
        echo "❌ LTX-Video driver NOT in build"
    fi
    
    # Check Pre-generation scoring
    if grep -q "EngagementPredictor\|PRE_GENERATION" dist/src/modules/video/video.service.js 2>/dev/null; then
        SCORING_COUNT=$(grep -o "EngagementPredictor\|PRE_GENERATION\|pre-generation" dist/src/modules/video/video.service.js | wc -l)
        echo "✅ Pre-generation scoring in build ($SCORING_COUNT references)"
    else
        echo "❌ Pre-generation scoring NOT in build"
    fi
    
    # Check AutoSchedulerService
    if grep -q "GeneticOptimizationService" dist/src/modules/scheduler/auto-scheduler.service.js 2>/dev/null; then
        echo "✅ AutoSchedulerService uses GeneticOptimizationService"
    else
        echo "⚠️  AutoSchedulerService may use EvolutionEngine directly"
    fi
else
    echo "❌ dist/ directory NOT found - build may have failed"
fi
echo ""

echo "5. API Endpoints"
echo "---------------"
# Metrics endpoint
METRICS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}/api/monitoring/metrics 2>/dev/null)
if [ "$METRICS" = "200" ]; then
    echo "✅ Metrics endpoint: OK"
    curl -s http://localhost:${PORT:-3000}/api/monitoring/metrics 2>/dev/null | head -5
else
    echo "❌ Metrics endpoint: Failed ($METRICS)"
fi
echo ""

# Video endpoint
VIDEO=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:${PORT:-3000}/api/video 2>/dev/null)
if [ "$VIDEO" = "200" ] || [ "$VIDEO" = "401" ]; then
    echo "✅ Video endpoint: Accessible ($VIDEO)"
else
    echo "⚠️  Video endpoint: $VIDEO"
fi
echo ""

echo "6. Environment Variables"
echo "----------------------"
ENV_VARS=("OPENROUTER_API_KEY" "DATABASE_URL" "REDIS_URL" "WAN_ENDPOINT" "LTX_ENDPOINT" "ENABLE_PRE_GENERATION_SCORING" "GENETIC_GENERATIONS")
for var in "${ENV_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        if [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
            echo "✅ $var: Set (hidden)"
        else
            echo "✅ $var: ${!var}"
        fi
    else
        echo "⚠️  $var: Not set"
    fi
done
echo ""

echo "7. Logs Check"
echo "------------"
if [ -f "/var/log/vvg.log" ]; then
    echo "✅ Log file exists"
    echo "Recent errors:"
    tail -20 /var/log/vvg.log | grep -i "error\|failed" | tail -5 || echo "   No recent errors"
elif [ -f "logs/app.log" ]; then
    echo "✅ Log file exists (logs/app.log)"
    tail -10 logs/app.log | grep -i "error\|failed" | tail -3 || echo "   No recent errors"
else
    echo "⚠️  Log file not found in standard locations"
    echo "   Checking stdout/stderr..."
fi
echo ""

echo "8. Dependencies"
echo "--------------"
if [ -f "package.json" ]; then
    echo "✅ package.json found"
    if [ -d "node_modules" ]; then
        echo "✅ node_modules exists"
    else
        echo "❌ node_modules NOT found"
    fi
else
    echo "❌ package.json NOT found"
fi
echo ""

echo "=========================================="
echo "📊 Summary"
echo ""
echo "Run 'railway logs' for detailed logs"
echo "Run 'railway variables' to check environment variables"
echo ""
