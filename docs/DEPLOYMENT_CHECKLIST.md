# Production Deployment Checklist

Complete this checklist before deploying to production.

## Pre-Deployment

### Code Quality
- [ ] All tests passing
- [ ] No console.log() in production code
- [ ] Error handling in place for all critical paths
- [ ] Input validation on all user inputs
- [ ] TypeScript errors resolved (if using TS)

### Security
- [ ] All secrets stored in Wrangler secrets (not .env)
- [ ] CORS configured with specific origins (no wildcards)
- [ ] Rate limiting enabled on auth endpoints
- [ ] Webhook signatures verified (GitHub, Stripe)
- [ ] HttpOnly cookies for sessions
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (httpOnly cookies)
- [ ] CSRF prevention (SameSite cookies)
- [ ] Admin endpoints protected with API key
- [ ] Constant-time comparison for sensitive strings

### Configuration
- [ ] Production database created and migrated
- [ ] Production KV namespace created
- [ ] All environment variables set
- [ ] Stripe products created
- [ ] Stripe webhooks configured
- [ ] DNS records updated
- [ ] SSL/TLS certificates active (auto via Cloudflare)
- [ ] Custom domains configured

### Monitoring
- [ ] Uptime monitoring configured (UptimeRobot)
- [ ] Error tracking setup (optional: Sentry)
- [ ] Analytics enabled
- [ ] Log aggregation configured
- [ ] Alert channels setup (email, Slack)

---

## Deployment Steps

### 1. Backup Current State

```bash
# Export current database
npx wrangler d1 export your-db --output backup-$(date +%Y%m%d).sql

# Tag current version in git
git tag -a v1.0.0 -m "Production release v1.0.0"
git push origin v1.0.0
```

### 2. Set Production Secrets

```bash
cd packages/api

# Required secrets
npx wrangler secret put STRIPE_SECRET_KEY --name your-saas-api
npx wrangler secret put STRIPE_WEBHOOK_SECRET --name your-saas-api
npx wrangler secret put RESEND_API_KEY --name your-saas-api
npx wrangler secret put ADMIN_API_KEY --name your-saas-api
npx wrangler secret put GITHUB_WEBHOOK_SECRET --name your-saas-api

# Optional secrets (if applicable)
npx wrangler secret put ANTHROPIC_API_KEY --name your-saas-api
npx wrangler secret put OPENAI_API_KEY --name your-saas-api
```

### 3. Run Database Migrations

```bash
# Run all migrations in order
npx wrangler d1 execute your-db --remote --file=migrations/001-init.sql
npx wrangler d1 execute your-db --remote --file=migrations/002-add-users.sql
# ... etc

# Verify migration
npx wrangler d1 execute your-db --remote --command="SELECT * FROM sqlite_master WHERE type='table'"
```

### 4. Deploy Workers

```bash
# Deploy main API worker
cd packages/api
npx wrangler deploy -c wrangler.toml

# Verify deployment
curl https://api.yourapp.dev/health
```

### 5. Deploy Frontend

```bash
# Build and deploy landing page
cd apps/landing
npm run build
npx wrangler pages deploy dist --project-name your-saas-landing

# Build and deploy dashboard
cd apps/dashboard
npm run build
npx wrangler pages deploy dist --project-name your-saas-dashboard
```

### 6. Configure Webhooks

**Stripe:**
1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://api.yourapp.dev/stripe/webhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
4. Copy signing secret
5. Set as secret: `npx wrangler secret put STRIPE_WEBHOOK_SECRET`

**GitHub (if applicable):**
1. Go to GitHub App settings
2. Set webhook URL: `https://api.yourapp.dev/github/webhook`
3. Generate webhook secret
4. Set as secret: `npx wrangler secret put GITHUB_WEBHOOK_SECRET`

### 7. DNS Configuration

```bash
# Verify DNS propagation
dig yourapp.dev
dig www.yourapp.dev
dig dashboard.yourapp.dev
dig api.yourapp.dev

# Should point to Cloudflare IPs or Workers URL
```

---

## Post-Deployment Verification

### Functional Tests

#### 1. Landing Page
- [ ] Landing page loads: `https://yourapp.dev`
- [ ] Signup form works
- [ ] Contact form works (if any)
- [ ] Mobile responsive
- [ ] All links work

#### 2. Authentication Flow
- [ ] Click "Sign In"
- [ ] Enter email
- [ ] Receive magic link email
- [ ] Click link → redirects to dashboard
- [ ] Session persists (refresh page)
- [ ] Logout works
- [ ] Clear token from URL history

#### 3. Billing Flow
- [ ] Click "Upgrade to Pro"
- [ ] Stripe checkout loads
- [ ] Enter test card: 4242 4242 4242 4242
- [ ] Complete checkout
- [ ] Redirected to dashboard
- [ ] Subscription shows as active
- [ ] Usage limits updated

#### 4. Core Feature
- [ ] Main feature works end-to-end
- [ ] Error handling works
- [ ] Usage is tracked correctly
- [ ] Limits are enforced

#### 5. Webhooks
```bash
# Test Stripe webhook
stripe trigger checkout.session.completed --stripe-account=acct_xxx

# Check logs
npx wrangler tail --format pretty
# Should see "Stripe webhook received" and no errors
```

### Security Tests

#### 1. CORS
```bash
curl -H "Origin: https://malicious.com" https://api.yourapp.dev/api/me
# Should return 403 or different origin header
```

#### 2. Rate Limiting
```bash
for i in {1..5}; do
  curl -X POST https://api.yourapp.dev/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com"}'
done
# 4th request should return 429
```

#### 3. Authentication
```bash
# Without token
curl https://api.yourapp.dev/api/me
# Should return 401

# With invalid token
curl -H "Authorization: Bearer invalid" https://api.yourapp.dev/api/me
# Should return 401
```

#### 4. Webhook Signatures
```bash
# Invalid Stripe signature
curl -X POST https://api.yourapp.dev/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=123,v1=invalid" \
  -d '{"type":"test"}'
# Should return 401
```

### Performance Tests

```bash
# Response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.yourapp.dev/health

# Create curl-format.txt:
time_total: %{time_total}s
# Should be < 200ms
```

### Monitoring Checks

- [ ] Uptime monitors active and reporting
- [ ] Error tracking receiving events
- [ ] Analytics tracking pageviews
- [ ] Alerts configured and tested
- [ ] Status page updated (if applicable)

---

## Rollback Plan

If critical issues are found:

### Option 1: Quick Fix
```bash
# Fix code
git commit -m "hotfix: critical bug"

# Deploy immediately
npx wrangler deploy -c wrangler.toml
```

### Option 2: Rollback to Previous Version
```bash
# Cloudflare automatically keeps versions
# Go to Dashboard → Workers → Deployments
# Click "Rollback" on previous version

# Or via CLI (if you tagged):
git checkout v0.9.0
npx wrangler deploy -c wrangler.toml
```

### Option 3: Emergency Database Rollback
```bash
# Restore from backup
npx wrangler d1 execute your-db --remote --file=backup-20241230.sql
```

---

## Post-Launch Monitoring (First 24 Hours)

### Hour 0-1: Active Monitoring
- [ ] Watch logs: `npx wrangler tail`
- [ ] Monitor error rate in Cloudflare dashboard
- [ ] Check user signups are working
- [ ] Verify payments processing

### Hour 1-6: Regular Checks
- [ ] Check every 30 minutes
- [ ] Review error logs
- [ ] Monitor uptime
- [ ] Check email deliverability

### Hour 6-24: Periodic Checks
- [ ] Check every 2-3 hours
- [ ] Review metrics
- [ ] Monitor for anomalies
- [ ] Respond to user reports

### Day 2-7: Daily Reviews
- [ ] Daily error report review
- [ ] User feedback review
- [ ] Performance metrics check
- [ ] Fix any bugs found

---

## Success Metrics

**Technical Health:**
- Uptime: >99.9%
- Error Rate: <1%
- P95 Response Time: <500ms
- Database Query Time: <100ms

**Business Health:**
- Signups: Track daily
- Conversions: Track daily
- Churn: Track weekly
- MRR: Track weekly

---

## Emergency Contacts

**Critical Services:**
- Cloudflare Status: https://www.cloudflarestatus.com/
- Stripe Status: https://status.stripe.com/
- Resend Status: https://status.resend.com/

**Support:**
- Cloudflare: https://dash.cloudflare.com/?to=/:account/support
- Stripe: https://support.stripe.com/
- Your hosting: [your contact]

---

## Deployment Complete! 🎉

- [ ] Send launch announcement
- [ ] Post on social media
- [ ] Email waitlist (if any)
- [ ] Submit to Product Hunt
- [ ] Update status page to "Live"

**Remember:**
- Monitor closely for first 24-48 hours
- Respond to user feedback quickly
- Keep improving based on data
- Celebrate your launch! 🚀

---

## Deployment Log Template

Copy this for each deployment:

```
Date: YYYY-MM-DD HH:MM
Version: v1.0.0
Deployer: [name]
Type: [production/hotfix/feature]

Changes:
- Feature 1
- Bug fix 2
- Security update 3

Verification:
✅ Tests passed
✅ Security checks passed
✅ Functional tests passed
✅ Performance acceptable

Monitoring:
- Uptime: 100%
- Error rate: 0.2%
- Response time: 150ms avg

Notes:
[any issues or observations]

Next deployment scheduled: [date]
```
