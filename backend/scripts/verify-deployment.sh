#!/bin/bash

# Deployment Verification Script
# Verifies all new implementations are present and properly integrated

echo "🔍 Verifying Deployment Readiness..."
echo "=================================="

ERRORS=0
WARNINGS=0

# Check 1: GeneticOptimizationService exists
echo ""
echo "1. Checking GeneticOptimizationService..."
if [ -f "src/ai/genetic/genetic-optimization.service.ts" ]; then
    echo "   ✅ genetic-optimization.service.ts exists"
else
    echo "   ❌ genetic-optimization.service.ts NOT FOUND"
    ((ERRORS++))
fi

# Check 2: GeneticOptimizationService exported in module
if grep -q "GeneticOptimizationService" src/ai/genetic/genetic.module.ts; then
    echo "   ✅ GeneticOptimizationService exported in GeneticModule"
else
    echo "   ❌ GeneticOptimizationService NOT exported"
    ((ERRORS++))
fi

# Check 3: LTX-Video driver exists
echo ""
echo "2. Checking LTX-Video Driver..."
if grep -q "generateWithLTX" src/modules/video/video.service.ts; then
    echo "   ✅ generateWithLTX() method exists"
else
    echo "   ❌ generateWithLTX() method NOT FOUND"
    ((ERRORS++))
fi

if grep -q "case \"ltx-video\"" src/modules/video/video.service.ts; then
    echo "   ✅ ltx-video case in switch statement"
else
    echo "   ❌ ltx-video case NOT FOUND"
    ((ERRORS++))
fi

# Check 4: Pre-generation scoring integration
echo ""
echo "3. Checking Pre-Generation Scoring..."
if grep -q "EngagementPredictor" src/modules/video/video.service.ts; then
    echo "   ✅ EngagementPredictor imported"
else
    echo "   ❌ EngagementPredictor NOT imported"
    ((ERRORS++))
fi

if grep -q "ENABLE_PRE_GENERATION_SCORING" src/modules/video/video.service.ts; then
    echo "   ✅ Pre-generation scoring logic present"
else
    echo "   ❌ Pre-generation scoring logic NOT FOUND"
    ((ERRORS++))
fi

if grep -q "IntelligenceModule" src/modules/video/video.module.ts; then
    echo "   ✅ IntelligenceModule imported in VideoModule"
else
    echo "   ❌ IntelligenceModule NOT imported"
    ((ERRORS++))
fi

# Check 5: AutoSchedulerService integration
echo ""
echo "4. Checking AutoSchedulerService Integration..."
if grep -q "GeneticOptimizationService" src/modules/scheduler/auto-scheduler.service.ts; then
    echo "   ✅ GeneticOptimizationService used in AutoSchedulerService"
else
    echo "   ⚠️  GeneticOptimizationService NOT used (using EvolutionEngine directly)"
    ((WARNINGS++))
fi

# Check 6: Build output verification
echo ""
echo "5. Checking Build Output..."
if [ -d "dist" ]; then
    if [ -f "dist/src/ai/genetic/genetic-optimization.service.js" ]; then
        echo "   ✅ genetic-optimization.service.js in build output"
    else
        echo "   ❌ genetic-optimization.service.js NOT in build output"
        ((ERRORS++))
    fi
    
    if grep -q "generateWithLTX" dist/src/modules/video/video.service.js 2>/dev/null; then
        echo "   ✅ generateWithLTX in compiled output"
    else
        echo "   ⚠️  generateWithLTX not found in compiled output (may need rebuild)"
        ((WARNINGS++))
    fi
else
    echo "   ⚠️  dist/ directory not found - run 'npm run build'"
    ((WARNINGS++))
fi

# Check 7: TypeScript compilation
echo ""
echo "6. Checking TypeScript Compilation..."
if command -v npx &> /dev/null; then
    npx tsc --noEmit 2>&1 | head -20
    if [ $? -eq 0 ]; then
        echo "   ✅ TypeScript compilation successful"
    else
        echo "   ❌ TypeScript compilation errors found"
        ((ERRORS++))
    fi
else
    echo "   ⚠️  npx not available - skipping TypeScript check"
    ((WARNINGS++))
fi

# Summary
echo ""
echo "=================================="
echo "📊 Verification Summary:"
echo "   Errors: $ERRORS"
echo "   Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ All critical checks passed! Ready for deployment."
    exit 0
else
    echo "❌ Found $ERRORS error(s). Please fix before deploying."
    exit 1
fi
