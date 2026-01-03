# FixCI

AI-powered CI/CD failure analysis for GitHub Actions. Get instant root cause analysis and fix suggestions when your workflows fail.

[![Deploy to Production](https://github.com/fixci-ai/fixci-ai/actions/workflows/deploy.yml/badge.svg)](https://github.com/fixci-ai/fixci-ai/actions/workflows/deploy.yml)

## What is FixCI?

FixCI is a GitHub App that automatically analyzes failed CI/CD workflows and provides:

- 🔍 **Root Cause Analysis** - Identifies why your workflow failed
- 💡 **Fix Suggestions** - AI-generated solutions with code examples
- 📝 **PR Comments** - Automatic comments on pull requests with analysis
- 🎯 **Multiple AI Providers** - Supports Claude, OpenAI, Gemini, and Cloudflare Workers AI
- 📊 **Usage Dashboard** - Track your analyses and subscription

## Quick Start

### 1. Install the GitHub App

Visit [fixci.dev/install](https://fixci.dev/install) to install FixCI on your repositories.

### 2. Configure Your Workflow

No configuration needed! FixCI automatically monitors your GitHub Actions workflows.

### 3. Get Analysis on Failures

When a workflow fails, FixCI will:
1. Analyze the failure logs
2. Post a comment on the PR with root cause and fix suggestions
3. Send you an email notification (optional)

## Features

### Free Tier
- 10 analyses per month
- Cloudflare AI & Gemini Flash
- PR comments
- Email notifications

### Pro Tier ($29/month)
- 100 analyses per month
- All AI providers (Claude, GPT-4o, etc.)
- Pay-per-use overages
- Priority support

### Enterprise
- Unlimited analyses
- Custom AI models
- Dedicated support
- SLA guarantees

## Documentation

- 📚 [Complete Documentation](./docs/README.md)
- 🏗️ [Architecture Guide](./docs/ARCHITECTURE.md)
- 🚀 [Deployment Guide](./docs/DEPLOYMENT_CHECKLIST.md)
- 🔐 [Security & Authentication](./docs/WEBHOOK_SECRETS_SETUP.md)
- 💼 [SaaS Template Guide](./docs/SAAS_TEMPLATE_GUIDE.md)

## Development

This repository is a complete SaaS application built on Cloudflare Workers, featuring:

- **GitHub App** - Webhook handler and analysis engine
- **Landing Page** - Marketing site with waitlist
- **Admin Dashboard** - Subscription management
- **User Management** - Magic link authentication
- **Billing** - Stripe integration

### Tech Stack

- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare KV
- **AI:** Workers AI, Claude, OpenAI, Gemini
- **Frontend:** Vanilla JS, React (admin dashboard)
- **Payments:** Stripe

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp docs/.env.example .env
# Edit .env with your credentials

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Deploy to production
npm run deploy
```

### Project Structure

```
fixci/
├── packages/
│   └── github-app/       # Main GitHub App worker
├── apps/
│   ├── landing/          # Landing page worker
│   └── dashboard/        # User dashboard
├── admin-v2/             # Admin dashboard (React)
├── migrations/           # Database migrations
├── docs/                 # Documentation
└── scripts/              # Deployment scripts
```

## Security

FixCI takes security seriously:

- ✅ Magic link authentication (passwordless)
- ✅ HttpOnly session cookies
- ✅ Rate limiting on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ CORS protection
- ✅ Webhook signature verification

Found a security issue? Please report it to security@fixci.dev

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- 📧 Email: support@fixci.dev
- 💬 Discord: [Join our community](https://discord.gg/fixci)
- 🐛 Issues: [GitHub Issues](https://github.com/fixci-ai/fixci-ai/issues)

## Acknowledgments

Built with:
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Anthropic Claude](https://www.anthropic.com/)
- [OpenAI GPT](https://openai.com/)
- [Google Gemini](https://deepmind.google/technologies/gemini/)
- [Stripe](https://stripe.com/)

---

Made with ❤️ by the FixCI team
