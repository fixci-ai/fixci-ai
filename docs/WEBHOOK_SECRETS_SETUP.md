# Webhook Secrets Setup Guide

This guide explains how to configure the required webhook secrets for FixCI.

## Overview

FixCI requires two webhook secrets for security:

| Secret | Purpose | Used By |
|--------|---------|---------|
| `GITHUB_WEBHOOK_SECRET` | Verify GitHub App webhooks are authentic | GitHub App integration |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe payment webhooks are authentic | Billing/subscription system |

---

## 1. GitHub Webhook Secret

### What it protects:
- Prevents attackers from sending fake GitHub webhooks
- Ensures workflow failure events are legitimate
- Required for CI/CD analysis to work

### Setup Steps:

#### Step 1: Generate a Secret

```bash
# Generate a secure random secret
openssl rand -hex 32
```

Copy the output (e.g., `a1b2c3d4e5f6...`)

#### Step 2: Configure GitHub App

1. Go to https://github.com/settings/apps
2. Click on your **FixCI** app
3. Scroll to **"Webhook"** section
4. In **"Webhook secret"** field:
   - Click "Edit"
   - Paste the secret you generated
   - Click "Save changes"

#### Step 3: Set in Cloudflare Workers

```bash
cd packages/github-app
npx wrangler secret put GITHUB_WEBHOOK_SECRET
# Paste the same secret when prompted
```

### Verify it's working:

```bash
# List configured secrets
npx wrangler secret list

# You should see:
# - GITHUB_WEBHOOK_SECRET ✓
```

---

## 2. Stripe Webhook Secret

### What it protects:
- Prevents fake payment events
- Ensures subscription changes are legitimate
- Required for billing to work correctly

### Setup Steps:

#### Step 1: Create Webhook Endpoint in Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Configure:
   - **Endpoint URL**: `https://fixci-github-app.adam-vegh.workers.dev/stripe/webhook`
   - **Events to send**:
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.payment_succeeded`
     - ✅ `invoice.payment_failed`
4. Click **"Add endpoint"**

#### Step 2: Get the Signing Secret

1. Click on the newly created webhook endpoint
2. Find **"Signing secret"** section
3. Click **"Reveal"** to see the secret
4. Copy the secret (starts with `whsec_...`)

#### Step 3: Set in Cloudflare Workers

```bash
cd packages/github-app
npx wrangler secret put STRIPE_WEBHOOK_SECRET
# Paste the whsec_... secret when prompted
```

### Verify it's working:

```bash
# List configured secrets
npx wrangler secret list

# You should see:
# - STRIPE_WEBHOOK_SECRET ✓
```

---

## Testing Webhooks

### Test GitHub Webhooks:

1. Push code to a repository with FixCI installed
2. Trigger a workflow that fails
3. Check Cloudflare Worker logs:
   ```bash
   npx wrangler tail
   ```
4. You should see: `✓ Valid GitHub webhook signature`

### Test Stripe Webhooks:

1. Use Stripe CLI to send a test event:
   ```bash
   stripe trigger checkout.session.completed
   ```
2. Check Cloudflare Worker logs:
   ```bash
   npx wrangler tail
   ```
3. You should see: `✓ Valid Stripe webhook signature`

---

## Quick Setup Script

We've created an interactive setup script:

```bash
./scripts/setup-webhook-secrets.sh
```

This will:
1. Generate a GitHub webhook secret
2. Guide you through GitHub App configuration
3. Set both secrets in Wrangler
4. Verify they're configured correctly

---

## Security Notes

⚠️ **Important:**
- Never commit secrets to git
- Don't share secrets in Slack/email
- Rotate secrets every 6-12 months
- Use different secrets for staging/production

✅ **Current Security Status:**
- Webhook signatures are now **mandatory**
- Invalid signatures return `401 Unauthorized`
- Replay attacks prevented (5-minute tolerance)
- Constant-time comparison prevents timing attacks

---

## Troubleshooting

### GitHub webhooks failing with 500 error:

**Cause:** `GITHUB_WEBHOOK_SECRET` not set

**Fix:**
```bash
npx wrangler secret put GITHUB_WEBHOOK_SECRET
```

### Stripe webhooks failing with 500 error:

**Cause:** `STRIPE_WEBHOOK_SECRET` not set

**Fix:**
```bash
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

### "Invalid signature" errors:

**Cause:** Secret mismatch between GitHub/Stripe and Workers

**Fix:**
1. Verify the secret in GitHub/Stripe dashboard
2. Re-set in Wrangler with the exact same value
3. Redeploy: `npx wrangler deploy -c wrangler.toml`

---

## Next Steps

After configuring both secrets:

1. ✅ Redeploy the worker:
   ```bash
   cd packages/github-app
   npx wrangler deploy -c wrangler.toml
   ```

2. ✅ Test webhooks in staging

3. ✅ Monitor logs for signature verification:
   ```bash
   npx wrangler tail
   ```

4. ✅ Set up production secrets (if different environment)

---

## Questions?

If you need help:
- Check logs: `npx wrangler tail`
- Verify secrets: `npx wrangler secret list`
- GitHub App settings: https://github.com/settings/apps
- Stripe webhooks: https://dashboard.stripe.com/webhooks
