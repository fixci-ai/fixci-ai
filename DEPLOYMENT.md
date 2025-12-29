# FixCI Deployment Guide

## Quick Start (5 minutes)

### Interactive Setup

```bash
./scripts/setup.sh
```

This will guide you through:
1. Deploying to Cloudflare Workers
2. Creating a GitHub App
3. Configuring secrets
4. Installing on repositories

### Non-Interactive Deployment

For CI/CD pipelines or automated deployments:

```bash
export GITHUB_APP_ID="12345"
export GITHUB_WEBHOOK_SECRET="your-webhook-secret"
export GITHUB_APP_PRIVATE_KEY="$(cat github-app-key.pem | base64)"

# Optional AI providers
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export GOOGLE_API_KEY="..."

./scripts/deploy.sh
```

---

## Deployment Options

### Option 1: Self-Hosted (Recommended for Customers)

**Best for**: Organizations that want full control

**Cost**: ~$5/month + AI provider costs
- Cloudflare Workers: $5/month (includes D1, AI)
- AI costs depend on volume (see pricing below)

**Steps**:
1. Customer creates Cloudflare account
2. Run `./scripts/setup.sh`
3. Customer owns all data and infrastructure

**Pros**:
- Full data ownership
- No vendor lock-in
- Customizable
- Transparent costs

**Cons**:
- Customer manages deployment
- Customer pays Cloudflare directly

---

### Option 2: Managed SaaS

**Best for**: Small teams wanting zero maintenance

**Your infrastructure**: Host on your Cloudflare account
**Customer experience**: Just install GitHub App

**Pricing Model** (examples):
- **Free tier**: 50 analyses/month
- **Pro**: $29/month - 500 analyses
- **Team**: $99/month - 5,000 analyses
- **Enterprise**: Custom pricing

**Implementation**:
1. Deploy FixCI to your Cloudflare account
2. Create multi-tenant architecture
3. Add billing via Stripe
4. Customer installs your GitHub App

**Pros**:
- Recurring revenue
- You control updates
- Easier for customers

**Cons**:
- You manage infrastructure
- Need billing system
- Need multi-tenant support

---

### Option 3: GitHub Marketplace

**Best for**: Maximum distribution

**Process**:
1. Create GitHub App
2. List on GitHub Marketplace
3. Implement OAuth flow
4. Handle billing through GitHub

**Revenue**: GitHub takes 25% commission

**Docs**: https://docs.github.com/en/apps/publishing-apps-to-github-marketplace

---

## Cost Breakdown

### Cloudflare Infrastructure

| Component | Free Tier | Paid Tier |
|-----------|-----------|-----------|
| Workers | 100k requests/day | $5/month + overage |
| D1 Database | 5GB storage | $0.75/GB/month |
| Workers AI | 10k requests/day | ~$0.01/1k tokens |

**Estimate for 1,000 analyses/month**: ~$5-10/month

### AI Provider Costs (per 1,000 analyses)

| Provider | Cost | Quality |
|----------|------|---------|
| Cloudflare AI | $0.10 | Good |
| Gemini | $1.00 | Very Good |
| OpenAI | $2.00 | Very Good |
| Claude | $10-40 | Excellent |

---

## Scaling Strategy

### Small Scale (< 100 customers)

**Single Worker Deployment**
- One FixCI worker for all customers
- Separate D1 database per customer (optional)
- Cloudflare AI for cost efficiency

**Monthly costs**: ~$50-100

### Medium Scale (100-1,000 customers)

**Multi-Region Deployment**
- Workers in multiple regions
- Shared D1 database with tenant isolation
- Round-robin AI providers

**Monthly costs**: ~$500-1,000

### Large Scale (1,000+ customers)

**Distributed Architecture**
- Workers with Durable Objects for state
- R2 for log storage
- Queues for async processing
- Multiple AI providers

**Monthly costs**: Variable, ~$2,000-5,000+

---

## White-Label Deployment

Allow customers to run FixCI with their own branding:

1. Fork repository
2. Customize:
   - Logo and colors in `apps/landing/`
   - PR comment format in `src/github.js`
   - Email templates (future)
3. Deploy using setup script
4. Provide support/updates via git

**Licensing**: Choose MIT, Apache 2.0, or Commercial License

---

## Environment Variables

### Required

```bash
GITHUB_APP_ID=12345
GITHUB_WEBHOOK_SECRET=abc123...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### Optional AI Providers

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=...
```

### Stripe Integration (for subscription billing)

```bash
# Required for subscription system
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_ENTERPRISE=price_...
```

**To configure Stripe secrets:**

```bash
cd packages/github-app

# Set Stripe API key
npx wrangler secret put STRIPE_SECRET_KEY
# Paste your Stripe secret key when prompted

# Set Stripe webhook secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste your Stripe webhook secret when prompted

# Set Stripe price IDs
npx wrangler secret put STRIPE_PRICE_ID_PRO
npx wrangler secret put STRIPE_PRICE_ID_ENTERPRISE
```

### Multi-Tenant (for managed SaaS)

```bash
ADMIN_API_KEY=admin_secret_123
```

---

## Subscription System Deployment

### 1. Apply Database Migration

The subscription tables have already been created via the migration. To verify:

```bash
npx wrangler d1 execute fixci-db --remote --command \
  "SELECT * FROM tier_configs;"
```

You should see the three tiers: free, pro, enterprise.

### 2. Migrate Existing Installations

Run the migration script to create free tier subscriptions for existing installations:

```bash
./scripts/migrate-subscriptions.sh
```

This will:
- Create free tier subscriptions for all active installations
- Set billing period to current month
- Initialize usage counters to 0

### 3. Configure Stripe Webhook

In your Stripe Dashboard:

1. Go to **Developers → Webhooks**
2. Click **Add endpoint**
3. Enter URL: `https://your-worker.workers.dev/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and set it with `npx wrangler secret put STRIPE_WEBHOOK_SECRET`

### 4. Create Stripe Products

In Stripe Dashboard:

1. Go to **Products**
2. Create **Pro** subscription:
   - Name: FixCI Pro
   - Price: $29/month (or your pricing)
   - Copy the Price ID → use for `STRIPE_PRICE_ID_PRO`
3. Create **Enterprise** subscription:
   - Name: FixCI Enterprise
   - Price: Custom (or fixed price)
   - Copy the Price ID → use for `STRIPE_PRICE_ID_ENTERPRISE`

---

## Testing Deployment

### 1. Test Worker Health

```bash
curl https://fixci-github-app.*.workers.dev/health
# Should return: OK
```

### 2. Test GitHub Webhook

```bash
curl -X POST https://fixci-github-app.*.workers.dev/webhook \
  -H "x-github-event: ping" \
  -H "x-hub-signature-256: sha256=test" \
  -d '{"zen":"Keep it simple"}'
```

### 3. Trigger Real Analysis

1. Install GitHub App on test repo
2. Create failing workflow:
```yaml
# .github/workflows/test.yml
name: Test FixCI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: exit 1
```
3. Check PR for FixCI comment
4. Verify in database:
```bash
wrangler d1 execute fixci-db --remote --command \
  "SELECT * FROM analyses ORDER BY created_at DESC LIMIT 1;"
```

### 4. Test Subscription System

**Test Free Tier Limit:**

```bash
# Check subscription status
curl "https://your-worker.workers.dev/api/subscription?installation_id=YOUR_INSTALLATION_ID"

# Trigger 10 analyses to hit the free tier limit
# The 11th analysis should be rejected with upgrade message
```

**Test Usage API:**

```bash
# Get usage history
curl "https://your-worker.workers.dev/api/usage/history?installation_id=YOUR_INSTALLATION_ID&days=30"
```

**Test Stripe Checkout:**

```bash
# Test checkout session creation
curl -X POST https://your-worker.workers.dev/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{"installationId": 123, "tier": "pro"}'

# Should return: {"url": "https://checkout.stripe.com/c/pay/..."}
```

**Verify Subscription in Database:**

```bash
# Check subscription record
npx wrangler d1 execute fixci-db --remote --command \
  "SELECT * FROM subscriptions WHERE installation_id = YOUR_INSTALLATION_ID;"

# Check usage tracking
npx wrangler d1 execute fixci-db --remote --command \
  "SELECT * FROM billing_events WHERE installation_id = YOUR_INSTALLATION_ID ORDER BY created_at DESC LIMIT 10;"
```

---

## Monitoring

### View Real-Time Logs

```bash
cd packages/github-app
wrangler tail
```

### Check Errors

```bash
wrangler d1 execute fixci-db --remote --command \
  "SELECT * FROM analyses WHERE analysis_status = 'failed';"
```

### Monitor Costs

```bash
wrangler d1 execute fixci-db --remote --command \
  "SELECT ai_provider, SUM(estimated_cost_usd) as total_cost
   FROM analyses GROUP BY ai_provider;"
```

---

## Updating FixCI

### For Self-Hosted Customers

```bash
git pull origin main
cd packages/github-app
wrangler deploy
```

### For Managed SaaS

```bash
# Test on staging first
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

---

## Security Best Practices

1. **Rotate secrets regularly**
   ```bash
   wrangler secret put GITHUB_WEBHOOK_SECRET
   ```

2. **Use separate environments**
   - Development: Local with `wrangler dev`
   - Staging: Test with real webhooks
   - Production: Live customers

3. **Enable rate limiting** (add to worker)
4. **Monitor for abuse** (check unusual patterns)
5. **Backup D1 database** (export regularly)

---

## Support & Documentation

- **Setup Issues**: Check logs with `wrangler tail`
- **GitHub App**: https://docs.github.com/en/apps
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Confluence Docs**: https://ai-documents.atlassian.net/wiki/spaces/SD/pages/48660482/

---

## License Options

### Open Source (MIT/Apache 2.0)
- Free for anyone to use/modify
- Builds community and trust
- Revenue from managed hosting

### Commercial License
- Charge per deployment
- Provide support and updates
- Control distribution

### Dual License
- Open source for self-hosting
- Commercial license for white-label/SaaS
- Best of both worlds

---

**Need help?** Open an issue or contact: YOUR_SUPPORT_EMAIL
