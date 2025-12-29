#!/bin/bash

# FixCI Quick Setup Script
# This script automates the deployment of FixCI to Cloudflare Workers

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    FixCI Setup Wizard                     ║"
echo "║         AI-powered CI/CD failure analysis                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}✗ Wrangler CLI not found${NC}"
    echo "Installing Wrangler..."
    npm install -g wrangler
fi
echo -e "${GREEN}✓ Wrangler CLI installed${NC}"

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Cloudflare:${NC}"
    wrangler login
fi
echo -e "${GREEN}✓ Logged in to Cloudflare${NC}"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}✗ OpenSSL not found (needed for generating webhook secret)${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 1: Deploy to Cloudflare Workers${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Deploy the worker
cd packages/github-app
echo "Deploying FixCI worker..."
DEPLOY_OUTPUT=$(wrangler deploy 2>&1)
echo "$DEPLOY_OUTPUT"

# Extract worker URL from deployment
WORKER_URL="https://fixci-github-app.*.workers.dev"
echo -e "${GREEN}✓ Worker deployed!${NC}"
echo ""

echo -e "${BLUE}Your webhook URL will be:${NC}"
echo -e "${GREEN}https://fixci-github-app.<YOUR-SUBDOMAIN>.workers.dev/webhook${NC}"
echo ""
echo -e "${YELLOW}To find your exact URL, visit:${NC}"
echo "https://dash.cloudflare.com → Workers & Pages → fixci-github-app"
echo ""
read -p "Press Enter once you've noted your webhook URL..."

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 2: GitHub App Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Generate webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo -e "${GREEN}✓ Generated webhook secret${NC}"
echo ""

echo -e "${YELLOW}Now we'll create your GitHub App. You'll need to:${NC}"
echo ""
echo "1. Visit: ${BLUE}https://github.com/settings/apps/new${NC}"
echo ""
echo "2. Fill in the following values:"
echo "   ${GREEN}GitHub App name:${NC} FixCI (or FixCI-YourName)"
echo "   ${GREEN}Homepage URL:${NC} https://fixci.dev"
echo "   ${GREEN}Webhook URL:${NC} <your-worker-url>/webhook"
echo "   ${GREEN}Webhook secret:${NC} $WEBHOOK_SECRET"
echo ""
echo "3. Set permissions:"
echo "   ${GREEN}Actions:${NC} Read-only"
echo "   ${GREEN}Contents:${NC} Read-only"
echo "   ${GREEN}Metadata:${NC} Read-only"
echo "   ${GREEN}Pull requests:${NC} Read & write"
echo ""
echo "4. Subscribe to events:"
echo "   ✓ workflow_run"
echo "   ✓ installation"
echo "   ✓ installation_repositories"
echo ""
echo "5. Click 'Create GitHub App'"
echo ""
echo "6. After creation:"
echo "   - Note the App ID (shown at top)"
echo "   - Click 'Generate a private key' and download the .pem file"
echo ""

read -p "Press Enter when you've created the GitHub App..."
echo ""

# Get GitHub App credentials
echo -e "${YELLOW}Enter your GitHub App credentials:${NC}"
echo ""
read -p "GitHub App ID: " GITHUB_APP_ID
read -p "Path to private key .pem file: " PEM_FILE_PATH

# Expand tilde in path
PEM_FILE_PATH="${PEM_FILE_PATH/#\~/$HOME}"

if [ ! -f "$PEM_FILE_PATH" ]; then
    echo -e "${RED}✗ Private key file not found: $PEM_FILE_PATH${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 3: Configure Secrets${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# Set secrets
echo "Setting GitHub App ID..."
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID

echo "Setting webhook secret..."
echo "$WEBHOOK_SECRET" | wrangler secret put GITHUB_WEBHOOK_SECRET

echo "Setting private key..."
cat "$PEM_FILE_PATH" | wrangler secret put GITHUB_APP_PRIVATE_KEY

echo -e "${GREEN}✓ All secrets configured!${NC}"
echo ""

# Optional: Configure AI providers
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 4: AI Provider Configuration (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "FixCI can use multiple AI providers. Cloudflare Workers AI is"
echo "enabled by default (free tier: 10k requests/day)."
echo ""
echo "Would you like to add additional providers?"
echo "1) Skip (use Cloudflare AI only)"
echo "2) Add Anthropic Claude"
echo "3) Add OpenAI"
echo "4) Add Google Gemini"
echo "5) Add all providers"
echo ""
read -p "Choice (1-5): " AI_CHOICE

case $AI_CHOICE in
    2|5)
        read -p "Anthropic API Key: " ANTHROPIC_KEY
        echo "$ANTHROPIC_KEY" | wrangler secret put ANTHROPIC_API_KEY
        echo -e "${GREEN}✓ Claude configured${NC}"
        ;&
    3|5)
        read -p "OpenAI API Key: " OPENAI_KEY
        echo "$OPENAI_KEY" | wrangler secret put OPENAI_API_KEY
        echo -e "${GREEN}✓ OpenAI configured${NC}"
        ;&
    4|5)
        read -p "Google API Key: " GOOGLE_KEY
        echo "$GOOGLE_KEY" | wrangler secret put GOOGLE_API_KEY
        echo -e "${GREEN}✓ Gemini configured${NC}"
        ;;
    *)
        echo -e "${GREEN}✓ Using Cloudflare Workers AI only${NC}"
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Step 5: Install GitHub App${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Almost done! Now install your GitHub App on repositories:"
echo ""
echo "1. Go to: https://github.com/settings/apps"
echo "2. Click on your 'FixCI' app"
echo "3. Click 'Install App'"
echo "4. Select repositories to monitor"
echo "5. Click 'Install'"
echo ""
read -p "Press Enter when installation is complete..."

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  🎉 Setup Complete! 🎉                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}FixCI is now ready to analyze your CI/CD failures!${NC}"
echo ""
echo "Next steps:"
echo "  1. Trigger a failing workflow in your repository"
echo "  2. Check the PR for FixCI's analysis comment"
echo "  3. View logs: ${YELLOW}wrangler tail fixci-github-app${NC}"
echo "  4. Query database: ${YELLOW}wrangler d1 execute fixci-db --remote${NC}"
echo ""
echo "Documentation: https://ai-documents.atlassian.net/wiki/spaces/SD/pages/48660482/"
echo "Support: YOUR_SUPPORT_EMAIL"
echo ""
echo -e "${GREEN}Happy debugging! 🔧${NC}"
