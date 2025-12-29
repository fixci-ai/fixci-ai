#!/bin/bash

# FixCI Non-Interactive Deployment Script
# For CI/CD pipelines or automated deployments
#
# Usage: ./deploy.sh
#
# Required environment variables:
#   GITHUB_APP_ID
#   GITHUB_WEBHOOK_SECRET
#   GITHUB_APP_PRIVATE_KEY (base64 encoded)
#
# Optional environment variables:
#   ANTHROPIC_API_KEY
#   OPENAI_API_KEY
#   GOOGLE_API_KEY

set -e

echo "🚀 FixCI Automated Deployment"
echo "=============================="
echo ""

# Check required environment variables
if [ -z "$GITHUB_APP_ID" ] || [ -z "$GITHUB_WEBHOOK_SECRET" ] || [ -z "$GITHUB_APP_PRIVATE_KEY" ]; then
    echo "❌ Error: Required environment variables not set"
    echo ""
    echo "Please set:"
    echo "  GITHUB_APP_ID"
    echo "  GITHUB_WEBHOOK_SECRET"
    echo "  GITHUB_APP_PRIVATE_KEY (base64 encoded)"
    exit 1
fi

# Navigate to worker directory
cd "$(dirname "$0")/../packages/github-app"

# Deploy worker
echo "📦 Deploying worker..."
wrangler deploy

# Configure secrets
echo "🔐 Configuring secrets..."
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID
echo "$GITHUB_WEBHOOK_SECRET" | wrangler secret put GITHUB_WEBHOOK_SECRET
echo "$GITHUB_APP_PRIVATE_KEY" | base64 -d | wrangler secret put GITHUB_APP_PRIVATE_KEY

# Optional AI providers
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "🤖 Configuring Claude..."
    echo "$ANTHROPIC_API_KEY" | wrangler secret put ANTHROPIC_API_KEY
fi

if [ -n "$OPENAI_API_KEY" ]; then
    echo "🤖 Configuring OpenAI..."
    echo "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY
fi

if [ -n "$GOOGLE_API_KEY" ]; then
    echo "🤖 Configuring Gemini..."
    echo "$GOOGLE_API_KEY" | wrangler secret put GOOGLE_API_KEY
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Webhook URL: https://fixci-github-app.*.workers.dev/webhook"
echo ""
echo "Next steps:"
echo "  1. Configure GitHub App webhook with the URL above"
echo "  2. Install GitHub App on repositories"
echo "  3. Test with a failing workflow"
