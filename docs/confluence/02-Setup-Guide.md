# Setup Guide

This guide walks through setting up FixCI for your organization.

## Prerequisites

- GitHub organization or personal account
- Cloudflare account (free tier is sufficient)
- At least one AI provider API key (recommended: start with Cloudflare Workers AI)

## Step 1: Create GitHub App

### 1.1 Navigate to GitHub App Settings

1. Go to [GitHub Settings → Developer settings → GitHub Apps](https://github.com/settings/apps)
2. Click **"New GitHub App"**

### 1.2 Configure App Settings

Fill in the following information:

| Field | Value |
|-------|-------|
| **GitHub App name** | `FixCI` or `FixCI-YourOrg` |
| **Homepage URL** | `https://fixci.dev` |
| **Webhook URL** | `https://fixci-github-app.YOUR-SUBDOMAIN.workers.dev/webhook` |
| **Webhook secret** | Generate a random secret (save for later) |

**How to generate webhook secret:**
```bash
openssl rand -hex 32
```

### 1.3 Set Permissions

Configure the following repository permissions:

| Permission | Access Level | Purpose |
|------------|--------------|---------|
| **Actions** | Read-only | Access workflow runs and logs |
| **Contents** | Read-only | Read repository content |
| **Metadata** | Read-only | Basic repository info |
| **Pull requests** | Read & write | Post analysis comments |

### 1.4 Subscribe to Events

Enable these webhook events:

- ✅ `workflow_run` - Triggered when workflows complete
- ✅ `installation` - Track app installations
- ✅ `installation_repositories` - Track repository access

### 1.5 Save App Credentials

After creating the app:

1. Note down the **App ID** (you'll see it at the top)
2. Click **"Generate a private key"**
3. Download the `.pem` file (keep it secure!)

## Step 2: Deploy to Cloudflare

### 2.1 Clone Repository

```bash
git clone YOUR_REPO_URL
cd fixci
npm install
```

### 2.2 Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser for authentication.

### 2.3 Create D1 Database (Already Done)

The database `fixci-db` is already created. If you need to create a new one:

```bash
npx wrangler d1 create fixci-db
# Update database_id in wrangler.toml and packages/github-app/wrangler.toml
```

### 2.4 Initialize Database Schema

```bash
npx wrangler d1 execute fixci-db --remote --file=schema.sql
```

Verify:
```bash
npx wrangler d1 execute fixci-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

You should see:
- `repositories`
- `analyses`
- `installations`
- `usage_stats`
- `waitlist`

### 2.5 Configure Secrets

Set GitHub App credentials:

```bash
cd packages/github-app

# Set GitHub App ID
npx wrangler secret put GITHUB_APP_ID
# Enter: YOUR_APP_ID

# Set webhook secret (the one you generated earlier)
npx wrangler secret put GITHUB_WEBHOOK_SECRET
# Paste: your-webhook-secret

# Set private key
npx wrangler secret put GITHUB_APP_PRIVATE_KEY
# Paste the ENTIRE contents of the .pem file (including BEGIN/END lines)
```

### 2.6 Configure AI Provider Keys

**Option A: Start with Cloudflare Workers AI (Recommended)**

No configuration needed! Cloudflare Workers AI is available automatically via the AI binding.

**Option B: Add Additional Providers**

```bash
# Anthropic Claude (https://console.anthropic.com/)
npx wrangler secret put ANTHROPIC_API_KEY

# OpenAI (https://platform.openai.com/api-keys)
npx wrangler secret put OPENAI_API_KEY

# Google Gemini (https://aistudio.google.com/app/apikey)
npx wrangler secret put GOOGLE_API_KEY
```

### 2.7 Deploy the Worker

```bash
# Deploy GitHub webhook handler
npx wrangler deploy

# Deploy landing page
cd ../../
npx wrangler deploy
```

You should see output like:
```
Published fixci-github-app (X.XX sec)
  https://fixci-github-app.YOUR-SUBDOMAIN.workers.dev
```

### 2.8 Update GitHub App Webhook URL

1. Go back to your GitHub App settings
2. Update the **Webhook URL** to the deployed worker URL:
   ```
   https://fixci-github-app.YOUR-SUBDOMAIN.workers.dev/webhook
   ```
3. Save changes

## Step 3: Install GitHub App

### 3.1 Install on Repositories

1. In your GitHub App settings, click **"Install App"**
2. Select your organization or personal account
3. Choose repositories:
   - **All repositories** (if you want to monitor everything)
   - **Only select repositories** (recommended for testing)
4. Click **"Install"**

### 3.2 Verify Installation

```bash
# Check installations table
npx wrangler d1 execute fixci-db --remote --command "SELECT * FROM installations;"
```

You should see your installation record.

## Step 4: Test the Integration

### 4.1 Trigger a Test Failure

1. Go to a test repository where you installed the app
2. Create a new branch
3. Add a file that will cause a test to fail:

```yaml
# .github/workflows/test.yml
name: Test Workflow
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Failing test
        run: exit 1  # This will fail
```

4. Commit and push to a pull request

### 4.2 Check Worker Logs

```bash
cd packages/github-app
npx wrangler tail
```

You should see:
```
Received workflow_run event (delivery: xxx-xxx-xxx)
Processing failed workflow: Test Workflow in owner/repo
Created analysis record: 1
Starting analysis 1
Analyzing with provider: cloudflare
Analysis 1 completed and posted
```

### 4.3 Check PR Comment

Go to your pull request - you should see a comment from your GitHub App with the analysis:

```
🔧 FixCI Analysis

**Build failure detected in workflow step**

Root Cause
The workflow step "Failing test" exited with code 1, indicating a command failure...

Suggested Fix
1. Check the command that failed: exit 1
2. Review the logs for error messages...

---
Analysis confidence: 75% | Model: @cf/meta/llama-3.1-8b-instruct | Processed in 450ms
Powered by FixCI - AI that explains why your pipeline broke
```

### 4.4 Check Database

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  id,
  workflow_name,
  ai_provider,
  model_used,
  estimated_cost_usd,
  confidence_score
FROM analyses
ORDER BY created_at DESC
LIMIT 5;
"
```

## Step 5: Monitor and Optimize

### 5.1 View Cost Statistics

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  ai_provider,
  COUNT(*) as analyses,
  ROUND(AVG(processing_time_ms), 2) as avg_time_ms,
  ROUND(SUM(estimated_cost_usd), 6) as total_cost_usd,
  ROUND(AVG(confidence_score), 3) as avg_confidence
FROM analyses
WHERE ai_provider IS NOT NULL
GROUP BY ai_provider
ORDER BY total_cost_usd ASC;
"
```

### 5.2 Enable/Disable Providers

To use only specific providers, remove the API keys you don't want:

```bash
# List all secrets
npx wrangler secret list

# Delete a secret
npx wrangler secret delete OPENAI_API_KEY
```

The system will automatically detect available providers based on configured secrets.

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook URL in GitHub App settings
2. Verify worker is deployed: visit `https://your-worker.workers.dev/health`
3. Check webhook delivery history in GitHub App → Advanced → Recent Deliveries

### Analysis Not Posted to PR

1. Check worker logs: `npx wrangler tail`
2. Verify PR permissions are "Read & write"
3. Check analyses table for error_log column

### AI Provider Errors

1. Verify API keys are set correctly: `npx wrangler secret list`
2. Check API key validity in respective provider dashboards
3. Review error logs in analyses table

### Database Errors

1. Verify database exists: `npx wrangler d1 list`
2. Check schema is initialized: `npx wrangler d1 execute fixci-db --remote --command "SELECT * FROM sqlite_master;"`
3. Ensure database_id matches in wrangler.toml

## Next Steps

- Read [Multi-Provider AI Guide](03-AI-Providers.md) to optimize costs
- Review [Database Schema](04-Database-Schema.md) to understand data structure
- Explore [API Reference](05-API-Reference.md) for customization

---

**Need Help?**
- Check worker logs: `npx wrangler tail`
- View GitHub webhook deliveries in App settings
- Review [Troubleshooting Guide](06-Troubleshooting.md)
