# Guide for Claude Code: Building SaaS Applications

**For:** Claude Code (AI coding assistant)
**Purpose:** Instructions on how to help users build production-ready SaaS applications
**Based on:** FixCI - A complete SaaS template built from scratch

---

## Overview

When a user asks to build a SaaS application, follow this structured approach based on the FixCI template. This guide provides the complete workflow for taking a user from idea to deployed application.

---

## Phase 1: Planning & Requirements (Session 1)

### Ask Discovery Questions

**Problem & Solution:**
```
- What problem does your SaaS solve?
- Who is your target user?
- What is your unique value proposition?
- What's the core feature (MVP)?
```

**Technical Requirements:**
```
- Do you need real-time features?
- Expected user scale (10, 100, 1000, 10000 users)?
- Any integrations needed (GitHub, Slack, etc.)?
- Preferred tech stack (if any)?
```

**Business Model:**
```
- Pricing tiers (free/pro/enterprise)?
- Usage-based or subscription?
- Trial period needed?
```

### Recommend Tech Stack

**Default Recommendation (Cloudflare Platform):**
```
Backend: Cloudflare Workers (serverless)
Database: D1 (SQLite)
Storage: KV (sessions), R2 (files, if needed)
Frontend: Pages (React or vanilla JS)
Email: Resend
Payments: Stripe
```

**Why Cloudflare?**
- Low/zero cost to start
- Global CDN (fast everywhere)
- Scales automatically
- Integrated platform
- No cold starts

**Alternative Stacks** (if user requests):
- Vercel + Planetscale
- AWS Lambda + DynamoDB
- Railway + Postgres

### Create Project Plan

Use **TodoWrite** to create a structured plan:

```javascript
[
  { content: "Set up infrastructure (domain, Cloudflare, GitHub)", status: "pending" },
  { content: "Create database schema", status: "pending" },
  { content: "Implement authentication (magic links)", status: "pending" },
  { content: "Build API endpoints", status: "pending" },
  { content: "Integrate Stripe billing", status: "pending" },
  { content: "Create frontend (landing + dashboard)", status: "pending" },
  { content: "Security hardening (8 critical fixes)", status: "pending" },
  { content: "Deploy to production", status: "pending" },
  { content: "Launch & monitor", status: "pending" }
]
```

---

## Phase 2: Infrastructure Setup (Session 2)

### 1. Repository Structure

Create organized file structure:

```bash
your-saas/
├── docs/                 # Copy from FixCI
├── packages/
│   └── api/             # Main Worker
├── apps/
│   ├── landing/         # Marketing site
│   └── dashboard/       # User dashboard
├── migrations/          # Database migrations
├── scripts/             # Deployment scripts
└── CLAUDE.md           # Project instructions
```

### 2. Cloudflare Setup

**Guide user through:**

```bash
# 1. Create D1 database
npx wrangler d1 create their-saas-db

# 2. Create KV namespace
npx wrangler kv:namespace create "SESSIONS"

# 3. Configure wrangler.toml
# (Provide template based on FixCI)
```

### 3. Database Schema

**Design based on their needs, but always include:**

```sql
-- Core tables
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE organization_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add their feature-specific tables
```

### 4. Create CLAUDE.md

**Always create this file** with:
- Project overview
- Tech stack
- Repository structure
- Key commands
- Brand guidelines

---

## Phase 3: Authentication (Session 3)

### Implement Magic Link Auth

**Always use this pattern** (proven secure):

1. **src/auth.js** - Copy from FixCI template
   - `sendLoginLink()` - Generate token, send email
   - `verifyToken()` - Verify token, create session
   - `verifySession()` - Check authentication
   - `logout()` - End session

2. **Security Features:**
   - ✅ HttpOnly cookies (not localStorage)
   - ✅ Secure + SameSite flags
   - ✅ 10-minute magic link expiration
   - ✅ 30-day session expiration
   - ✅ One-time use tokens
   - ✅ Token cleared from URL history

3. **Email Service:**
   - Set up Resend account
   - Configure domain verification
   - Implement email templates

**Verify with user:**
```bash
# Test locally
npx wrangler dev

# Test login flow:
# 1. POST /auth/login with email
# 2. Check email inbox
# 3. Click magic link
# 4. Should redirect to dashboard
```

---

## Phase 4: API & Business Logic (Session 4-5)

### 1. Main Router (src/index.js)

**Structure:**
```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS
    if (request.method === 'OPTIONS') {
      return corsResponse(request);
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK');
    }

    // Auth routes
    if (url.pathname.startsWith('/auth/')) {
      return handleAuth(request, env);
    }

    // API routes (protected)
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    // Stripe webhooks
    if (url.pathname.startsWith('/stripe/')) {
      return handleStripe(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};
```

### 2. Protected Endpoints

**Pattern:**
```javascript
export async function handleAPI(request, env) {
  // Verify authentication
  const auth = await verifySession(request, env);
  if (!auth.authenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);

  if (url.pathname === '/api/me') {
    return getUserInfo(auth.user, env);
  }

  if (url.pathname === '/api/organizations') {
    return getUserOrganizations(auth.user, env);
  }

  // Add their feature endpoints here
}
```

### 3. Feature Implementation

**Help user implement their core feature:**
- Understand requirements
- Design API endpoints
- Implement business logic
- Add database queries
- Handle errors properly

**Always include:**
- Input validation
- Error handling
- Usage tracking
- Rate limiting (if needed)

---

## Phase 5: Billing Integration (Session 6)

### Stripe Setup

**Guide user:**

1. **Create Stripe account**
2. **Create products** (Free, Pro, Enterprise)
3. **Get API keys** (test mode first)
4. **Set secrets:**
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

### Implement Checkout

**src/stripe.js** - Copy from FixCI:
- `createCheckoutSession()` - Start payment
- `handleStripeWebhook()` - Process events
- `verifyStripeSignature()` - Security
- `createPortalSession()` - Self-service

**Critical: Webhook Verification**

**Always implement signature verification:**
```javascript
async function verifyStripeSignature(payload, signature, secret) {
  // HMAC SHA256 verification
  // Timestamp check (5 min tolerance)
  // Constant-time comparison
  // See FixCI implementation
}
```

---

## Phase 6: Frontend (Session 7-8)

### Landing Page

**Structure:**
```html
- Hero (value prop)
- Features (3-5 key features)
- Pricing (tiers table)
- CTA (signup form)
- FAQ
- Footer
```

**Keep it simple:**
- Vanilla HTML/CSS or simple framework
- Fast loading (<2s)
- Mobile responsive
- Clear CTA

### Dashboard

**React structure:**
```
src/
├── components/
│   ├── Login.jsx       # Magic link form
│   ├── Dashboard.jsx   # Main view
│   ├── Settings.jsx    # User settings
│   └── Billing.jsx     # Subscription management
├── hooks/
│   ├── useAuth.js      # Authentication
│   └── useAPI.js       # API calls
└── App.jsx             # Router
```

**Key features:**
- Login with magic link
- Display user info
- Show organizations
- Upgrade to paid plan
- Usage stats
- Settings

---

## Phase 7: Security Hardening (Session 9)

### Critical Security Checklist

**Always implement all 8:**

1. **Timing Attack Prevention**
   - Constant-time comparison for secrets
   - See FixCI: `admin.js:8-48`

2. **Stripe Webhook Verification**
   - HMAC SHA256 + replay protection
   - See FixCI: `stripe.js:70-180`

3. **CORS Restriction**
   - Origin whitelisting (no wildcards)
   - See FixCI: `index.js:38-44`

4. **SQL Injection Prevention**
   - Parameterized queries + sanitization
   - See FixCI: `admin.js:565-585`

5. **Webhook Secret Verification**
   - Mandatory for all webhooks
   - GitHub, Stripe, etc.

6. **Magic Link Security**
   - Token in POST body
   - Clear from URL history
   - See FixCI: `index.js:350-361`

7. **HttpOnly Cookies**
   - Never localStorage for sessions
   - Secure + SameSite flags
   - See FixCI: `auth.js:128-159`

8. **Rate Limiting**
   - Auth endpoints protected
   - See FixCI: `ratelimit.js`

### Testing Security

**Run tests from FixCI:**
```bash
./scripts/test-stripe-webhook.sh
# Should see all tests pass
```

---

## Phase 8: Deployment (Session 10)

### Pre-Deployment Checklist

**Verify with user:**
- [ ] All secrets set
- [ ] Database migrated
- [ ] Security tests passed
- [ ] Frontend built
- [ ] Webhooks configured

### Deploy Steps

**1. Deploy Worker:**
```bash
cd packages/api
npx wrangler deploy -c wrangler.toml
```

**2. Deploy Frontend:**
```bash
cd apps/dashboard
npm run build
npx wrangler pages deploy dist
```

**3. Configure DNS:**
```
A    @              192.0.2.1 (proxied)
A    dashboard      192.0.2.1 (proxied)
CNAME api          their-worker.workers.dev
```

**4. Set up Webhooks:**
- Stripe: Add endpoint URL
- GitHub: Add webhook URL (if applicable)
- Copy secrets

### Post-Deployment Testing

**Run through:**
1. Landing page loads
2. Signup works
3. Magic link login works
4. Dashboard displays data
5. Upgrade to paid works
6. Webhooks process correctly

**Check metrics:**
- Error rate < 1%
- Response time < 500ms
- Uptime > 99%

---

## Phase 9: Monitoring & Maintenance (Session 11)

### Set Up Monitoring

**Guide user to configure:**

1. **Uptime Robot** (free)
   - Monitor: https://theirapp.dev
   - Monitor: https://api.theirapp.dev/health
   - Alert via email

2. **Cloudflare Analytics**
   - Dashboard → Workers → Analytics
   - Watch: requests, errors, latency

3. **Error Tracking** (optional)
   - Sentry integration
   - Email alerts for errors

### Teach Debugging

**Show user how to:**

```bash
# Watch logs
npx wrangler tail --format pretty

# Filter errors
npx wrangler tail --status error

# Backup database
npx wrangler d1 export their-db --output backup.sql

# Rollback deployment
# Dashboard → Workers → Deployments → Rollback
```

---

## Phase 10: Launch & Iteration (Session 12)

### Launch Checklist

- [ ] Production secrets set
- [ ] All tests passing
- [ ] Monitoring active
- [ ] Backup scheduled
- [ ] Landing page final
- [ ] Pricing confirmed
- [ ] Terms of Service
- [ ] Privacy Policy

### Launch Strategy

**Suggest:**
1. Product Hunt
2. Twitter/X announcement
3. Indie Hackers
4. Reddit (r/SideProject, r/SaaS)
5. Personal network

### Post-Launch Support

**Monitor for 24-48 hours:**
- Check logs frequently
- Respond to user feedback
- Fix critical bugs quickly
- Track signups & conversions

**Week 2-4:**
- Gather user feedback
- Add most-requested features
- Optimize conversion funnel
- Improve onboarding

---

## Best Practices for Claude Code

### 1. Always Use TodoWrite

**Create todos at project start:**
```javascript
TodoWrite([
  { content: "Phase 1: Setup", status: "in_progress" },
  { content: "Phase 2: Auth", status: "pending" },
  // etc.
]);
```

**Update as you progress:**
- Mark completed immediately
- Keep only one in_progress
- Add new tasks as discovered

### 2. Reference FixCI Template

**When user asks for feature:**
1. Check FixCI implementation
2. Read relevant code
3. Adapt to their use case
4. Explain changes

**Example:**
```
User: "How do I implement billing?"

1. Read /packages/api/src/stripe.js
2. Explain Stripe integration
3. Help configure their Stripe account
4. Adapt code to their tiers
5. Test with them
```

### 3. Security First

**Never skip security:**
- Implement all 8 critical fixes
- Test webhook signatures
- Verify CORS configuration
- Check rate limiting
- Use httpOnly cookies

**Always run security tests before deployment.**

### 4. Documentation

**Always create:**
- `CLAUDE.md` - Project instructions
- `README.md` - Getting started
- `docs/` folder with guides
- Inline code comments

**Provide user with:**
- Quick start guide
- Deployment checklist
- Architecture overview

### 5. Cost Transparency

**Always inform user of costs:**
```
Free Tier (0-100 users):
- Cloudflare: $0
- Domain: $1.25/mo
- Resend: $0 (3K emails)
Total: ~$1.25/mo

Growth (1K users):
- Cloudflare: $5-10/mo
- Resend: $10-20/mo
Total: ~$50/mo
```

**Emphasize:**
- Costs scale with revenue
- 90%+ margins possible
- Free tier sufficient for MVP

### 6. Incremental Development

**Don't build everything at once:**
- Week 1: Auth + DB
- Week 2: Billing + Frontend
- Week 3: Core feature
- Week 4: Launch

**Test frequently:**
- After each feature
- Before deployment
- With real user flow

### 7. Provide Context

**Always explain WHY:**
```
❌ "Add this code to auth.js"

✅ "We use httpOnly cookies instead of localStorage because:
   1. Prevents XSS attacks (JavaScript can't access)
   2. Automatic with requests (no manual header setting)
   3. Secure + SameSite flags prevent CSRF

   Here's the code to add to auth.js..."
```

### 8. Error Handling

**Always implement:**
- Try-catch blocks
- Meaningful error messages
- Graceful degradation
- Logging for debugging

**Show user:**
```javascript
try {
  const result = await riskyOperation();
  return success(result);
} catch (error) {
  console.error('Operation failed:', error);

  // User-friendly message
  return jsonResponse({
    error: 'Something went wrong. Please try again.'
  }, 500);
}
```

---

## Common Patterns

### Pattern 1: Protected API Route

```javascript
export async function protectedEndpoint(request, env) {
  // 1. Verify auth
  const auth = await verifySession(request, env);
  if (!auth.authenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Validate input
  const { orgId } = await request.json();
  if (!orgId) {
    return new Response('Bad Request', { status: 400 });
  }

  // 3. Check permissions
  const member = await env.DB.prepare(`
    SELECT * FROM organization_members
    WHERE user_id = ? AND organization_id = ?
  `).bind(auth.user.id, orgId).first();

  if (!member) {
    return new Response('Forbidden', { status: 403 });
  }

  // 4. Execute business logic
  const result = await doSomething(orgId, env);

  // 5. Return response
  return jsonResponse({ success: true, data: result });
}
```

### Pattern 2: Usage Tracking

```javascript
export async function trackUsage(orgId, feature, env) {
  // 1. Get current usage
  const usage = await env.DB.prepare(`
    SELECT u.count, s.tier
    FROM usage u
    JOIN subscriptions s ON u.organization_id = s.organization_id
    WHERE u.organization_id = ? AND u.feature = ?
  `).bind(orgId, feature).first();

  // 2. Check limit
  const limits = { free: 10, pro: 100, enterprise: -1 };
  const limit = limits[usage?.tier || 'free'];

  if (limit !== -1 && (usage?.count || 0) >= limit) {
    throw new Error('Usage limit exceeded');
  }

  // 3. Increment
  await env.DB.prepare(`
    INSERT INTO usage (organization_id, feature, count)
    VALUES (?, ?, 1)
    ON CONFLICT DO UPDATE SET count = count + 1
  `).bind(orgId, feature).run();
}
```

### Pattern 3: Webhook Handler

```javascript
export async function handleWebhook(request, env) {
  // 1. Get signature
  const signature = request.headers.get('x-webhook-signature');
  const body = await request.text();

  // 2. Verify (CRITICAL!)
  const isValid = await verifySignature(body, signature, env.WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // 3. Process event
  const event = JSON.parse(body);

  switch (event.type) {
    case 'user.created':
      await handleUserCreated(event.data);
      break;
    // ...
  }

  // 4. Always return 200
  return new Response('OK');
}
```

---

## Troubleshooting Guide

### Issue: User can't deploy

**Checklist:**
1. Is wrangler logged in? `npx wrangler whoami`
2. Is wrangler.toml correct?
3. Are bindings configured?
4. Run: `npx wrangler deploy -c wrangler.toml`

### Issue: Database errors

**Checklist:**
1. Is D1 created? `npx wrangler d1 list`
2. Are migrations run? Check schema
3. Is database_id in wrangler.toml?
4. Test query: `npx wrangler d1 execute db --command="SELECT 1"`

### Issue: Auth not working

**Checklist:**
1. Are cookies set correctly? Check DevTools
2. Is CORS configured? Check Access-Control headers
3. Is session in KV? Check with wrangler
4. Try: `npx wrangler tail` and watch logs

### Issue: Webhooks failing

**Checklist:**
1. Is signature verification implemented?
2. Is webhook secret set? `npx wrangler secret list`
3. Is endpoint URL correct in Stripe/GitHub?
4. Check logs: `npx wrangler tail --status error`

---

## Success Metrics

### Technical Success
- ✅ All features working
- ✅ Error rate < 1%
- ✅ Response time < 500ms
- ✅ Security tests passing
- ✅ Deployed to production

### User Success
- ✅ User can sign up
- ✅ User can log in
- ✅ User can upgrade to paid
- ✅ Core feature works
- ✅ User happy with result

### Project Success
- ✅ Completed in 2-4 weeks
- ✅ Infrastructure cost < $10/mo
- ✅ Scalable to 1000+ users
- ✅ Maintainable codebase
- ✅ Documented thoroughly

---

## Summary

When helping users build SaaS applications:

1. **Start with FixCI template** - Proven, production-ready
2. **Follow structured phases** - Don't skip steps
3. **Security first** - All 8 critical fixes
4. **Test frequently** - After each feature
5. **Document everything** - CLAUDE.md, README, guides
6. **Monitor costs** - Keep user informed
7. **Launch fast** - MVP in 2 weeks
8. **Iterate based on feedback** - Real users > features

**The goal:** Get user from idea to revenue in < 1 month.

**Resources:**
- Template: `/docs/SAAS_TEMPLATE_GUIDE.md`
- Checklist: `/docs/QUICK_START_CHECKLIST.md`
- Architecture: `/docs/ARCHITECTURE.md`
- Deployment: `/docs/DEPLOYMENT_CHECKLIST.md`
- Security: `/docs/WEBHOOK_SECRETS_SETUP.md`

Good luck helping users build amazing SaaS products! 🚀
