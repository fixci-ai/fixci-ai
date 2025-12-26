# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FixCI is an AI-powered CI/CD failure analyzer SaaS. It uses LLMs (Claude API) to analyze build logs and explain failures in plain English with suggested fixes.

**Domain:** fixci.dev
**Stack:** Cloudflare (Workers, Pages, D1, KV, Queues), TypeScript, Claude API, Stripe

## Repository Structure

```
fixci/
├── apps/
│   ├── landing/          # Cloudflare Pages - marketing site
│   ├── dashboard/        # Cloudflare Pages - user dashboard
│   └── api/              # Cloudflare Workers - backend API
├── packages/
│   ├── cli/              # CLI tool (`fixci analyze`)
│   ├── core/             # Shared analysis logic
│   └── github-app/       # GitHub App webhook handler
├── prompts/              # LLM prompt templates
└── scripts/              # Dev/deploy scripts
```

## Commands

### Landing Page (apps/landing)
```bash
npm install
npm run dev      # Local development with wrangler
npm run deploy   # Deploy to Cloudflare
```

### CLI (packages/cli)
```bash
npm run build
./bin/fixci analyze <logfile>
```

### API (apps/api)
```bash
npm run dev      # Local dev server
```

## Key Technical Decisions

- **Cloudflare-first**: Workers for compute, D1 for SQLite storage, KV for caching, Queues for async processing
- **Claude API**: Haiku for speed on simple failures, Sonnet for complex analysis
- **GitHub-first**: Primary integration via GitHub App receiving `workflow_run.completed` webhooks

## Data Flow

GitHub Actions fails → Webhook → Cloudflare Worker → Fetch logs via GitHub API → Queue → Claude API analysis → Store in D1 → Post PR comment / Slack notification

## Brand

- Primary color: #10b981 (green)
- Background: #0f172a (dark navy)
- Voice: Developer-friendly, casual but competent, no corporate jargon
