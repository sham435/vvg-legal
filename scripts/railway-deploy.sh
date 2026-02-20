#!/bin/bash
set -e

echo "🚀 Railway Docker Deployment Script"
echo "====================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first."
    echo "npm i -g @railway/cli"
    exit 1
fi

# Login if not already logged in
railway whoami || railway login

# Link project if not linked
if [ ! -f ".railway/state.json" ]; then
    echo "🔗 Linking to Railway project..."
    railway link
fi

# Set environment variables from .env.production if exists
if [ -f ".env.production" ]; then
    echo "📝 Setting environment variables..."
    while IFS= read -r line; do
        if [[ ! "$line" =~ ^# ]] && [[ "$line" =~ = ]]; then
            key=$(echo "$line" | cut -d '=' -f1)
            # Skip if already set in Railway
            if ! railway variables list | grep -q "^$key="; then
                value=$(echo "$line" | cut -d '=' -f2-)
                echo "Setting $key"
                railway variables set "$key=$value"
            fi
        fi
    done < .env.production
fi

# Build and push Docker image
echo "🐳 Building Docker image..."
docker build -t vvg-backend:latest .

# Deploy to Railway
echo "🚂 Deploying to Railway..."
railway up --detach

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to stabilize..."
sleep 30

# Run database migrations
echo "🗄️ Running database migrations..."
railway run --service vvg -- npm run typeorm:migration:run

# Health check
echo "🏥 Performing health check..."
railway run --service vvg -- curl -f http://localhost:3001/api/health

echo "✅ Deployment completed successfully!"
echo "🌐 Your application is live at: https://$(railway domain)"
