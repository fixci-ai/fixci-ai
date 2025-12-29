# FixCI - AI-Powered CI/CD Failure Analysis

## Overview

FixCI is an intelligent CI/CD failure analyzer that uses AI to automatically detect, analyze, and explain build failures in plain English. When your GitHub Actions workflow fails, FixCI analyzes the logs and posts actionable insights directly to your pull request.

## Key Features

- **Automatic Failure Detection** - Receives GitHub webhook events when workflows fail
- **AI-Powered Analysis** - Uses multiple AI providers to analyze logs and identify root causes
- **PR Comments** - Posts detailed analysis with suggested fixes directly to pull requests
- **Multi-Provider Support** - Supports Cloudflare AI, Claude, OpenAI, and Gemini
- **Cost Tracking** - Tracks costs and performance metrics for each AI provider
- **Edge Computing** - Runs on Cloudflare Workers for global low-latency performance

## Architecture

```
┌─────────────────┐
│  GitHub Actions │
│   (CI Workflow) │
└────────┬────────┘
         │ workflow_run.completed
         │ (webhook)
         ▼
┌─────────────────────────┐
│  FixCI GitHub App       │
│  (Cloudflare Worker)    │
├─────────────────────────┤
│  • Verify signature     │
│  • Create analysis      │
│  • Fetch workflow logs  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  AI Analysis Engine     │
│  (Multi-Provider)       │
├─────────────────────────┤
│  • Cloudflare Workers AI│
│  • Anthropic Claude     │
│  • OpenAI GPT-4o-mini   │
│  • Google Gemini        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  D1 Database            │
├─────────────────────────┤
│  • Analysis results     │
│  • Cost metrics         │
│  • Performance data     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  GitHub API             │
├─────────────────────────┤
│  • Post PR comment      │
│  • Include fix guidance │
└─────────────────────────┘
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Cloudflare Workers (Serverless) |
| **Database** | Cloudflare D1 (SQLite) |
| **AI Providers** | Cloudflare AI, Claude, OpenAI, Gemini |
| **Frontend** | Cloudflare Pages |
| **Integration** | GitHub Apps API |
| **Language** | JavaScript (ES Modules) |

## Repository Structure

```
fixci/
├── apps/
│   ├── landing/              # Marketing website (Cloudflare Pages)
│   │   ├── src/
│   │   │   └── index.js      # Landing page worker
│   │   └── logo/             # Brand assets
│   │
│   ├── dashboard/            # User dashboard (Future)
│   └── api/                  # Backend API (Future)
│
├── packages/
│   ├── github-app/           # GitHub webhook handler ⭐
│   │   ├── src/
│   │   │   ├── index.js      # Main webhook handler
│   │   │   ├── analyzer.js   # Multi-provider AI orchestrator
│   │   │   ├── github.js     # GitHub API integration
│   │   │   └── providers/    # AI provider modules
│   │   │       ├── cloudflare.js
│   │   │       ├── claude.js
│   │   │       ├── openai.js
│   │   │       └── gemini.js
│   │   ├── wrangler.toml     # Worker configuration
│   │   └── README.md         # Setup guide
│   │
│   ├── cli/                  # CLI tool (Future)
│   └── core/                 # Shared libraries (Future)
│
├── docs/
│   └── confluence/           # Confluence documentation
│
├── schema.sql                # Database schema
├── wrangler.jsonc            # Main worker config
└── CLAUDE.md                 # AI assistant instructions
```

## Current Status

### ✅ Completed
- Landing page deployed at [fixci.dev](https://fixci.dev)
- D1 database created and schema initialized
- GitHub webhook handler built
- Multi-provider AI analysis system
- Cost tracking and metrics
- PR comment integration

### 🚧 In Progress
- GitHub App registration and configuration
- End-to-end testing with real CI failures
- Provider cost comparison data collection

### 📋 Planned
- User dashboard for viewing analysis history
- Slack integration for notifications
- CLI tool for local log analysis
- Custom analysis rules and filters
- Analytics and cost optimization dashboard

## Quick Links

- **Website**: [https://fixci.dev](https://fixci.dev)
- **Repository**: (Add your GitHub repo URL)
- **Documentation**: This Confluence space
- **Support**: (Add support channel)

---

**Last Updated**: 2025-12-27
**Version**: 0.1.0 (MVP)
