# Environment Variables

Complete guide to configuring FixCI environment variables for Cloudflare Workers.

## Required Variables

### GitHub App Configuration

```bash
# GitHub App ID (from GitHub App settings)
GITHUB_APP_ID=123456

# GitHub App Private Key (PEM format)
# Generate from GitHub App settings -> Private keys
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMII...\n-----END RSA PRIVATE KEY-----"

# GitHub Webhook Secret (for verifying webhook signatures)
# Set this when creating webhooks in GitHub App settings
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
```

### AI Provider API Keys

**At least ONE AI provider is required:**

```bash
# Anthropic Claude (recommended for best quality)
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI GPT-4 (good quality, widely available)
OPENAI_API_KEY=sk-...

# Google Gemini (fast and free tier available)
GOOGLE_API_KEY=AIza...

# Cloudflare Workers AI (included with Cloudflare Workers)
# No API key needed - automatically available via AI binding
```

### Stripe Integration (for billing)

```bash
# Stripe Secret Key (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing

# Stripe Webhook Secret (from Stripe webhook settings)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (create in Stripe Dashboard -> Products)
STRIPE_PRICE_ID_PRO=price_... # Pro tier monthly price
STRIPE_PRICE_ID_ENTERPRISE=price_... # Enterprise tier price
```

### Email Service (Resend)

```bash
# Resend API Key (from resend.com)
RESEND_API_KEY=re_...

# From email address (must be verified in Resend)
RESEND_FROM_EMAIL=noreply@fixci.dev
```

### Admin API

```bash
# Admin API Key (for admin dashboard access)
# Generate a secure random string
ADMIN_API_KEY=$(openssl rand -hex 32)
```

## Optional Variables

### Development Settings

```bash
# Disable rate limiting (DEVELOPMENT ONLY)
DISABLE_RATE_LIMITING=true

# Enable debug logging
DEBUG=true

# Custom webhook URL for testing
WEBHOOK_URL=https://your-ngrok-url.ngrok.io
```

### Custom Domain

```bash
# Custom domain for API (instead of workers.dev)
API_DOMAIN=api.fixci.dev

# Custom domain for landing page
LANDING_DOMAIN=fixci.dev
```

## Setting Environment Variables

### Using Wrangler CLI

```bash
# Set a secret (recommended for sensitive values)
wrangler secret put GITHUB_APP_PRIVATE_KEY
# Paste the value when prompted

# Set multiple secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put RESEND_API_KEY
```

### Using wrangler.toml (non-secrets only)

```toml
# wrangler.toml
[vars]
DEBUG = "false"
API_DOMAIN = "api.fixci.dev"
```

**WARNING**: Never put secrets in wrangler.toml - it's committed to git!

### Using GitHub Actions

Add secrets to your repository settings:

1. Go to Settings -> Secrets and variables -> Actions
2. Click "New repository secret"
3. Add each secret with the same name as the environment variable

Required GitHub Secrets for CI/CD:
```
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY
GITHUB_WEBHOOK_SECRET
ANTHROPIC_API_KEY (or other AI provider)
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
ADMIN_API_KEY
```

## Generating Secure Secrets

### GitHub Webhook Secret

```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6...
```

### Admin API Key

```bash
openssl rand -base64 32
# Output: Xy9Zt+3Mno...
```

### Stripe Webhook Secret

Generated automatically by Stripe when you create a webhook endpoint.

## Environment-Specific Configuration

### Development (.dev.vars)

Create a `.dev.vars` file for local development:

```bash
# .dev.vars (DO NOT commit to git!)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=dev_webhook_secret
ANTHROPIC_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
RESEND_API_KEY=re_...
ADMIN_API_KEY=dev_admin_key
DEBUG=true
DISABLE_RATE_LIMITING=true
```

**Important**: `.dev.vars` is in `.gitignore` - never commit it!

### Production

Set secrets using `wrangler secret put` (see above).

### Staging

Use a separate Worker for staging with different secrets:

```bash
# Deploy to staging
wrangler deploy --env staging

# Set staging secrets
wrangler secret put STRIPE_SECRET_KEY --env staging
# Use Stripe test keys for staging
```

## Validating Configuration

### Check Required Variables

```bash
# List all secrets (values are hidden)
wrangler secret list

# Test deployment
wrangler deploy --dry-run
```

### Validation Script

Create a validation endpoint in development:

```javascript
// packages/github-app/src/index.js
if (url.pathname === '/debug/config' && env.DEBUG === 'true') {
  return jsonResponse({
    githubAppConfigured: !!env.GITHUB_APP_ID,
    webhookSecretConfigured: !!env.GITHUB_WEBHOOK_SECRET,
    aiProviders: {
      anthropic: !!env.ANTHROPIC_API_KEY,
      openai: !!env.OPENAI_API_KEY,
      google: !!env.GOOGLE_API_KEY,
      cloudflare: true // Always available
    },
    stripeConfigured: !!env.STRIPE_SECRET_KEY,
    emailConfigured: !!env.RESEND_API_KEY,
    adminConfigured: !!env.ADMIN_API_KEY
  });
}
```

## Troubleshooting

### Common Issues

**Error: "GITHUB_APP_PRIVATE_KEY is not set"**
- Solution: Run `wrangler secret put GITHUB_APP_PRIVATE_KEY`
- Ensure the entire PEM file is pasted, including BEGIN/END lines

**Error: "Invalid webhook signature"**
- Solution: Verify `GITHUB_WEBHOOK_SECRET` matches GitHub App settings
- Check for extra whitespace in the secret

**Error: "No AI providers configured"**
- Solution: Set at least one of: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY
- Cloudflare Workers AI is always available as fallback

**Error: "Stripe signature verification failed"**
- Solution: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe webhook settings
- Use test secret (whsec_test_...) for development

### Debug Mode

Enable debug mode to see configuration issues:

```bash
wrangler secret put DEBUG
# Enter: true

# Check logs
wrangler tail
```

## Security Best Practices

1. **Never commit secrets** to git
   - Use `.gitignore` for `.dev.vars`
   - Use `wrangler secret` for production
   - Use GitHub Secrets for CI/CD

2. **Rotate secrets regularly**
   - GitHub App private key: Annually
   - API keys: Every 6 months
   - Webhook secrets: When suspicious activity detected

3. **Use different keys for environments**
   - Development: Test API keys
   - Staging: Test API keys
   - Production: Live API keys

4. **Limit key permissions**
   - Use read-only keys where possible
   - Scope Stripe keys appropriately
   - Use restricted GitHub App permissions

5. **Monitor key usage**
   - Check Cloudflare Analytics
   - Review Stripe dashboard
   - Monitor AI provider usage

## Migration Guide

### Moving from Old Format

If you had database IDs in wrangler.toml:

```toml
# OLD (in wrangler.toml)
[vars]
DATABASE_ID = "285af42e-..."
KV_NAMESPACE_ID = "2e8fae5e5..."

# NEW (use bindings instead)
[[d1_databases]]
binding = "DB"
database_id = "285af42e-..."

[[kv_namespaces]]
binding = "SESSIONS"
id = "2e8fae5e5..."
```

Database and KV namespace IDs in bindings are not secrets - they're safe in git.

## Support

Need help with environment configuration?

- 📖 [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- 📖 [Webhook Secrets Setup](./WEBHOOK_SECRETS_SETUP.md)
- 📧 Email: support@fixci.dev
