# FixCI Documentation

> AI-powered CI/CD failure analysis that explains why your pipeline broke

---

## Welcome

FixCI automatically analyzes GitHub Actions workflow failures and posts actionable insights directly to your pull requests. No more digging through logs to find the root cause.

### What FixCI Does

1. **Detects Failures** - Receives webhook when your GitHub workflow fails
2. **Analyzes Logs** - AI examines logs to identify root cause
3. **Posts Solution** - Comments on PR with explanation and suggested fix
4. **Tracks Costs** - Monitors AI provider costs and performance

---

## Documentation

### Getting Started

**New to FixCI?** Start here:

1. [📖 Overview](01-Overview.md) - Learn what FixCI is and how it works
2. [⚙️ Setup Guide](02-Setup-Guide.md) - Complete installation walkthrough
3. [🧪 Test Integration](#quick-test) - Verify everything works

### Configuration & Optimization

**Already installed?** Optimize your setup:

- [🤖 AI Providers Guide](03-AI-Providers.md) - Choose the right AI provider, compare costs
- [📊 Database Schema](04-Database-Schema.md) - Query analysis data, track metrics
- [🔧 API Reference](05-API-Reference.md) - Webhook API, functions, troubleshooting

---

## Quick Start

### Prerequisites
- GitHub organization or account
- Cloudflare account (free tier OK)

### 5-Minute Setup

```bash
# 1. Clone repository
git clone YOUR_REPO_URL
cd fixci

# 2. Create GitHub App
# → Follow guide at https://github.com/settings/apps

# 3. Deploy to Cloudflare
npx wrangler login
cd packages/github-app
npx wrangler deploy

# 4. Set secrets
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_WEBHOOK_SECRET
npx wrangler secret put GITHUB_APP_PRIVATE_KEY

# 5. Install app on repository
# → Visit GitHub App settings → Install App
```

**Done!** Next failed workflow will automatically trigger analysis.

---

## Features

### ✅ Current Features

- **Automatic Detection** - Webhook-based failure monitoring
- **Multi-Provider AI** - Support for 4 AI providers (Cloudflare, Claude, OpenAI, Gemini)
- **Cost Tracking** - Real-time cost and performance metrics
- **PR Comments** - Markdown-formatted analysis posted to PRs
- **Round-Robin Rotation** - Even distribution for cost comparison

### 🚧 Coming Soon

- User dashboard for viewing analysis history
- Slack integration
- CLI tool for local log analysis
- Custom analysis rules
- Cost optimization dashboard

---

## Architecture

```
GitHub Actions → FixCI Worker → AI Provider → Database → GitHub PR Comment
     (fails)      (webhook)     (analyze)     (store)     (post fix)
```

**Tech Stack**:
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- AI: Cloudflare AI, Claude, OpenAI, Gemini
- Frontend: Cloudflare Pages

---

## Cost Overview

| Provider | Est. Cost/Analysis | Best For |
|----------|-------------------|----------|
| **Cloudflare AI** | ~$0.0001 | High volume, cost optimization |
| **Gemini** | ~$0.001 | Balanced cost/quality |
| **OpenAI** | ~$0.002 | OpenAI ecosystem |
| **Claude** | ~$0.001-0.014 | Maximum quality, complex failures |

**For 100 analyses/day**: Cloudflare AI costs ~$0.30/month vs $40-400/month for Claude.

→ See [AI Providers Guide](03-AI-Providers.md) for detailed comparison

---

## Example Analysis

**Failed Workflow**:
```
❌ Test / Run tests
Error: Cannot find module 'dotenv'
```

**FixCI Comment**:
```markdown
## 🔧 FixCI Analysis

**Build failed due to missing dependency**

### Root Cause
The test suite could not find the 'dotenv' module. This module is
required for loading environment variables but is not installed.

### Suggested Fix
1. Install the missing dependency:
   npm install dotenv

2. Add to package.json dependencies section:
   "dotenv": "^16.0.0"

3. Commit package-lock.json changes

### Code Example
npm install --save dotenv

---
*Analysis confidence: 85% | Model: cloudflare/llama-3.1-8b | 456ms*
```

---

## Quick Test

### Verify Installation

1. Go to a test repository
2. Create a file that causes failure:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: exit 1  # This will fail
```

3. Push to a PR
4. Check PR for FixCI comment

### View Logs

```bash
cd packages/github-app
npx wrangler tail
```

### Check Database

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT workflow_name, ai_provider, confidence_score
FROM analyses ORDER BY created_at DESC LIMIT 5;
"
```

---

## Support

### Troubleshooting

**Webhook not working?**
- Check GitHub App webhook URL matches deployed worker
- Verify webhook secret is set correctly
- Check Recent Deliveries in GitHub App settings

**Analysis not posted?**
- Verify PR permissions are "Read & write"
- Check worker logs: `npx wrangler tail`
- Query analyses table for error_log

**AI provider errors?**
- Verify API keys: `npx wrangler secret list`
- Check provider API key validity
- Review error logs in database

→ See [Setup Guide - Troubleshooting](02-Setup-Guide.md#troubleshooting)

### Get Help

- **Documentation**: This Confluence space
- **Repository**: YOUR_REPO_URL
- **Issues**: YOUR_REPO_URL/issues
- **Email**: YOUR_SUPPORT_EMAIL

---

## Contributing

FixCI is under active development. Planned features:

- [ ] Dashboard for analysis history
- [ ] Slack integration
- [ ] CLI tool
- [ ] Custom analysis rules
- [ ] GitLab support
- [ ] Bitbucket support

**Want to contribute?** Contact the team or submit a PR!

---

## Resources

### External Links

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/)

### Internal Documentation

1. [Overview](01-Overview.md) - Architecture and tech stack
2. [Setup Guide](02-Setup-Guide.md) - Installation and configuration
3. [AI Providers](03-AI-Providers.md) - Provider comparison and optimization
4. [Database Schema](04-Database-Schema.md) - Data structure and queries
5. [API Reference](05-API-Reference.md) - Endpoints and functions

---

**Website**: [https://fixci.dev](https://fixci.dev)

**Version**: 0.1.0 (MVP)

**Last Updated**: 2025-12-27

---

*Powered by Cloudflare Workers, AI that explains why your pipeline broke* ⚡
