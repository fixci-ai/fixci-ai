# FixCI Architecture Overview

This document explains how all components of the FixCI SaaS application work together.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Cloudflare Global Network                  │
│                     (Edge CDN - 275+ locations)                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌───▼────┐ ┌─────▼──────┐
              │  Landing  │ │Dashboard│ │   API      │
              │   Page    │ │ (Pages) │ │ (Worker)   │
              │  (Pages)  │ │         │ │            │
              └───────────┘ └─────────┘ └─────┬──────┘
                                               │
              ┌────────────────────────────────┼─────────────┐
              │                                │             │
         ┌────▼────┐  ┌──────────┐  ┌────────▼───┐  ┌──────▼──────┐
         │   D1    │  │    KV    │  │   Resend   │  │   Stripe    │
         │Database │  │ Sessions │  │   Email    │  │  Billing    │
         └─────────┘  └──────────┘  └────────────┘  └─────────────┘
                                               │
                                         ┌─────▼──────┐
                                         │   GitHub   │
                                         │    App     │
                                         └────────────┘
```

---

## Component Details

### 1. Landing Page (Cloudflare Pages)

**Purpose:** Marketing site, signup, pricing

**URL:** `https://fixci.dev`

**Tech:** HTML, CSS, JavaScript (minimal)

**Key Features:**
- Hero section with value proposition
- Pricing table
- Email signup form
- Integration with D1 (waitlist)

**Files:**
- `/apps/landing/src/index.js` - Worker (handles form submissions)
- `/apps/landing/public/` - Static files

**Data Flow:**
```
User visits → Cloudflare Edge → Cached HTML
User submits signup → Worker → D1 (waitlist table)
```

---

### 2. User Dashboard (Cloudflare Pages)

**Purpose:** User interface, settings, billing

**URL:** `https://dashboard.fixci.dev`

**Tech:** React (or vanilla JS)

**Key Features:**
- Magic link login
- Organization management
- Usage stats
- Billing portal
- Team members

**Files:**
- `/apps/dashboard/src/` - React components
- `/apps/dashboard/public/index.html` - SPA entry point

**Data Flow:**
```
User logs in → Magic link email → Verify token → httpOnly cookie
Dashboard loads → Fetch /api/me (with cookie) → Display user data
```

---

### 3. API Worker (Cloudflare Worker)

**Purpose:** Backend API, business logic

**URL:** `https://fixci-github-app.api.fixci.dev`

**Tech:** JavaScript/TypeScript

**Key Endpoints:**

#### Authentication
- `POST /auth/login` - Send magic link
- `POST /auth/verify` - Verify token, create session
- `POST /auth/logout` - End session
- `GET /api/me` - Get current user

#### Billing
- `POST /api/checkout` - Create Stripe checkout
- `POST /stripe/webhook` - Handle Stripe events
- `GET /api/portal` - Get billing portal URL

#### Core Feature (FixCI specific)
- `POST /github/webhook` - Receive workflow events
- `POST /analyze` - Analyze failure logs
- `POST /comment` - Post PR comment

#### Admin
- `GET /admin/stats` - Dashboard stats
- `GET /admin/users` - List users
- `POST /admin/grant` - Grant subscription

**Files:**
- `/packages/api/src/index.js` - Main router
- `/packages/api/src/auth.js` - Authentication
- `/packages/api/src/stripe.js` - Billing
- `/packages/api/src/admin.js` - Admin functions
- `/packages/api/src/ratelimit.js` - Rate limiting
- `/packages/api/src/email.js` - Email service

---

### 4. Database (Cloudflare D1)

**Purpose:** Persistent data storage

**Tech:** SQLite (serverless)

**Tables:**

```sql
users                    -- User accounts
  ├─ id (PK)
  ├─ email (unique)
  ├─ name
  └─ created_at

organizations           -- Multi-tenant orgs
  ├─ id (PK)
  ├─ name
  └─ created_at

organization_members    -- User-org relationships
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ organization_id (FK)
  └─ role (owner/admin/member)

subscriptions          -- Billing/tiers
  ├─ id (PK)
  ├─ organization_id (FK)
  ├─ tier (free/pro/enterprise)
  ├─ stripe_customer_id
  ├─ stripe_subscription_id
  └─ status

usage                  -- Feature usage tracking
  ├─ id (PK)
  ├─ organization_id (FK)
  ├─ feature
  ├─ count
  ├─ period_start
  └─ period_end

auth_sessions         -- Session tokens
  ├─ id (PK)
  ├─ user_id (FK)
  ├─ token (unique)
  └─ expires_at
```

**Access Pattern:**
```javascript
// Worker queries D1
const user = await env.DB.prepare(
  'SELECT * FROM users WHERE email = ?'
).bind(email).first();
```

---

### 5. KV Storage (Cloudflare KV)

**Purpose:** Session tokens, rate limiting

**Tech:** Key-Value store (eventually consistent)

**Use Cases:**

1. **Session Storage** (fast auth checks)
   ```javascript
   // Key: session token (64 chars hex)
   // Value: { userId, email }
   // TTL: 30 days
   await env.SESSIONS.put(token, JSON.stringify({ userId, email }), {
     expirationTtl: 2592000
   });
   ```

2. **Magic Link Tokens** (temporary)
   ```javascript
   // Key: magic link token
   // Value: { email, installationId }
   // TTL: 10 minutes
   await env.SESSIONS.put(token, JSON.stringify({ email }), {
     expirationTtl: 600
   });
   ```

3. **Rate Limiting**
   ```javascript
   // Key: ratelimit:login:user@email.com
   // Value: { count, resetAt }
   // TTL: 15 minutes
   await env.SESSIONS.put(`ratelimit:${key}`, JSON.stringify(data), {
     expirationTtl: 900
   });
   ```

**Why KV?**
- Fast reads globally (edge cache)
- Low latency (<10ms)
- Scales automatically
- Free tier: 100K reads/day

---

### 6. Email Service (Resend)

**Purpose:** Transactional emails

**API:** `https://api.resend.com/emails`

**Email Types:**

1. **Magic Link Login**
   ```
   Subject: Sign in to FixCI
   Body: Click here to sign in [LINK]
   ```

2. **Welcome Email**
   ```
   Subject: Welcome to FixCI!
   Body: Get started guide
   ```

3. **Payment Confirmation**
   ```
   Subject: Payment received
   Body: Receipt and next steps
   ```

**Integration:**
```javascript
await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'FixCI <noreply@fixci.dev>',
    to: [email],
    subject: 'Sign in to FixCI',
    html: emailTemplate
  })
});
```

---

### 7. Payment Processing (Stripe)

**Purpose:** Billing, subscriptions, payments

**Integration Points:**

1. **Checkout** (one-time setup)
   ```
   User clicks "Upgrade" →
   Worker creates checkout session →
   Redirect to Stripe →
   User pays →
   Redirect back with success
   ```

2. **Webhooks** (ongoing)
   ```
   Stripe event (payment, subscription change) →
   POST to /stripe/webhook →
   Verify signature →
   Update database →
   Return 200
   ```

3. **Customer Portal** (self-service)
   ```
   User clicks "Manage billing" →
   Worker creates portal session →
   Redirect to Stripe portal →
   User updates card/plan →
   Webhook updates database
   ```

**Security:**
- HMAC SHA256 signature verification
- 5-minute timestamp tolerance
- Constant-time comparison
- Replay attack prevention

---

### 8. GitHub App (Optional - FixCI Specific)

**Purpose:** Receive workflow events

**Webhook URL:** `https://api.fixci.dev/github/webhook`

**Event Flow:**
```
CI fails →
GitHub sends webhook →
Worker receives event →
Verify signature →
Fetch logs from GitHub →
Analyze with AI →
Post PR comment
```

**Security:**
- HMAC SHA256 signature (X-Hub-Signature-256)
- Mandatory verification
- One-time processing (idempotency)

---

## Request Flow Examples

### 1. User Signup

```
┌────────┐
│ User   │
└───┬────┘
    │
    │ 1. Enter email on landing page
    ▼
┌────────────┐
│  Landing   │
│   Worker   │
└───┬────────┘
    │
    │ 2. Store in waitlist table
    ▼
┌────────────┐
│     D1     │
│  Database  │
└────────────┘
```

### 2. Magic Link Login

```
┌────────┐
│ User   │
└───┬────┘
    │
    │ 1. Click "Sign In"
    ▼
┌────────────┐
│ Dashboard  │
└───┬────────┘
    │
    │ 2. POST /auth/login
    ▼
┌────────────┐     3. Generate token    ┌────────────┐
│    API     │────────────────────────>│     KV     │
│  Worker    │                          │  (token)   │
└───┬────────┘                          └────────────┘
    │
    │ 4. Send magic link email
    ▼
┌────────────┐
│   Resend   │
└───┬────────┘
    │
    │ 5. Email delivered
    ▼
┌────────┐
│ User   │────┐
└────────┘    │
              │ 6. Click link
              ▼
         ┌────────────┐
         │ Dashboard  │
         └───┬────────┘
             │
             │ 7. POST /auth/verify { token }
             ▼
         ┌────────────┐     8. Verify token    ┌────────────┐
         │    API     │◄────────────────────────│     KV     │
         │  Worker    │                          └────────────┘
         └───┬────────┘
             │
             │ 9. Create user (if new)
             ▼
         ┌────────────┐
         │     D1     │
         └───┬────────┘
             │
             │ 10. Create session
             ▼
         ┌────────────┐
         │     KV     │
         │  (session) │
         └───┬────────┘
             │
             │ 11. Set httpOnly cookie
             ▼
         ┌────────────┐
         │ Dashboard  │
         │  (logged   │
         │    in)     │
         └────────────┘
```

### 3. Stripe Payment

```
┌────────┐
│ User   │
└───┬────┘
    │
    │ 1. Click "Upgrade to Pro"
    ▼
┌────────────┐
│ Dashboard  │
└───┬────────┘
    │
    │ 2. POST /api/checkout
    ▼
┌────────────┐     3. Create session    ┌────────────┐
│    API     │────────────────────────>│   Stripe   │
│  Worker    │◄───────────────────────┘│            │
└───┬────────┘     4. Return URL        └────────────┘
    │
    │ 5. Redirect to checkout
    ▼
┌────────────┐
│   Stripe   │
│  Checkout  │
└───┬────────┘
    │
    │ 6. User pays
    ▼
┌────────────┐     7. Webhook event     ┌────────────┐
│   Stripe   │────────────────────────>│    API     │
└────────────┘                          │  Worker    │
                                        └───┬────────┘
                                            │
                                            │ 8. Update subscription
                                            ▼
                                        ┌────────────┐
                                        │     D1     │
                                        └────────────┘
```

### 4. Protected API Request

```
┌────────┐
│ User   │
└───┬────┘
    │
    │ 1. Dashboard loads
    ▼
┌────────────┐
│ Dashboard  │
└───┬────────┘
    │
    │ 2. GET /api/me (with cookie)
    ▼
┌────────────┐     3. Verify session    ┌────────────┐
│    API     │────────────────────────>│     KV     │
│  Worker    │◄───────────────────────┘│            │
└───┬────────┘     4. Return user data  └────────────┘
    │
    │ 5. Fetch user's orgs
    ▼
┌────────────┐
│     D1     │
└───┬────────┘
    │
    │ 6. Return JSON
    ▼
┌────────────┐
│ Dashboard  │
│  (renders  │
│   data)    │
└────────────┘
```

---

## Security Layers

### 1. Edge Security (Cloudflare)

- DDoS protection (automatic)
- WAF (Web Application Firewall)
- Bot detection
- Rate limiting (Layer 7)
- SSL/TLS termination

### 2. Application Security

**CORS:**
```javascript
// Only allow specific origins
const allowedOrigins = [
  'https://fixci.dev',
  'https://dashboard.fixci.dev'
];
```

**Authentication:**
- HttpOnly cookies (XSS protection)
- Secure + SameSite flags (CSRF protection)
- 30-day expiration
- One-time magic links (10 min)

**Rate Limiting:**
- Login: 3 attempts / 15 min
- Verify: 10 attempts / 15 min
- API: 100 requests / min

**Input Validation:**
- SQL injection: Parameterized queries
- XSS: HttpOnly cookies + sanitization
- Email validation: Format check

### 3. Data Security

**D1 Database:**
- Encrypted at rest
- Automatic backups
- Access via Workers only

**KV:**
- Edge encryption
- TTL for sensitive data
- Access controls

**Secrets:**
- Wrangler encrypted secrets
- Never in code/git
- Environment-specific

---

## Scaling Strategy

### Current Capacity (Free Tier)

- Workers: 100,000 requests/day
- D1: 5M reads/day, 100K writes/day
- KV: 100K reads/day, 1K writes/day
- Pages: Unlimited

**Estimated Support:**
- ~1,000 daily active users
- ~10,000 API requests/day
- ~500 signups/month

### Scaling Up

**Paid Workers ($5/month):**
- 10M requests/month included
- Then $0.30 per million

**D1 ($5/month):**
- 25M reads/month
- 50M writes/month

**KV ($0.50/month):**
- 1M reads/month
- 100K writes/month

**Cost at Scale:**
```
10,000 DAU (daily active users)
= ~1M requests/day
= ~$15/month Cloudflare
+ ~$100/month Resend (emails)
+ ~$50/month misc
= ~$165/month total infrastructure

Revenue (assuming 2% conversion to $29/month):
10,000 signups → 200 paid → $5,800 MRR
Margin: 97%+ 🎉
```

---

## Performance Optimization

### Caching Strategy

**Edge Caching (Static Assets):**
```javascript
// Cache HTML, CSS, JS for 1 hour
response.headers.set('Cache-Control', 'public, max-age=3600');
```

**KV Caching (API Responses):**
```javascript
// Cache expensive queries for 5 min
const cacheKey = `orgs:${userId}`;
const cached = await env.SESSIONS.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... expensive DB query ...

await env.SESSIONS.put(cacheKey, JSON.stringify(result), {
  expirationTtl: 300
});
```

**Database Optimization:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON auth_sessions(token);

-- Use joins instead of N+1 queries
SELECT o.*, s.tier
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id
WHERE o.id IN (?);
```

---

## Monitoring & Observability

### Metrics to Track

**Application:**
- Request volume (requests/minute)
- Error rate (%)
- Response time (P50, P95, P99)
- Success rate (%)

**Business:**
- Signups (daily)
- Conversions (%)
- MRR (monthly recurring revenue)
- Churn rate (%)
- Active users (DAU, MAU)

**Infrastructure:**
- Worker invocations
- D1 query time
- KV read/write latency
- Email delivery rate

### Tools

- Cloudflare Analytics (built-in)
- Wrangler Tail (logs)
- UptimeRobot (uptime)
- Stripe Dashboard (revenue)
- Custom dashboard (D1 queries)

---

## Disaster Recovery

### Backup Strategy

**Database (D1):**
```bash
# Daily automated backup
npx wrangler d1 export fixci-db --output backup-$(date +%Y%m%d).sql

# Keep 30 days of backups
```

**KV:**
- Not backed up (ephemeral by design)
- Sessions can be recreated
- Rate limits reset naturally

**Code:**
- Git repository (GitHub)
- Tagged releases
- Cloudflare keeps deployment history

### Recovery Scenarios

**Scenario 1: Database Corruption**
```bash
# Restore from latest backup
npx wrangler d1 execute fixci-db --remote --file=backup-latest.sql
```

**Scenario 2: Bad Deployment**
```bash
# Rollback via Cloudflare dashboard
# Workers → Deployments → Rollback

# Or redeploy previous version
git checkout v1.0.0
npx wrangler deploy
```

**Scenario 3: Compromised Secrets**
```bash
# Rotate all secrets immediately
npx wrangler secret put STRIPE_SECRET_KEY  # New value
npx wrangler secret put ADMIN_API_KEY      # New value

# Update Stripe webhook secret
# Update GitHub App webhook secret
```

---

## Development vs Production

### Development Environment

**Local Development:**
```bash
# Use wrangler dev for local testing
npx wrangler dev

# Uses:
# - Local D1 database
# - Local KV (ephemeral)
# - .dev.vars for secrets
```

**Test Data:**
```sql
-- Use test Stripe keys
STRIPE_SECRET_KEY=sk_test_...

-- Use test emails
user@test.com
```

### Production Environment

**Live Site:**
```bash
# Deploy to production
npx wrangler deploy

# Uses:
# - Production D1 database
# - Production KV
# - Wrangler secrets (encrypted)
```

**Real Data:**
```sql
-- Live Stripe keys
STRIPE_SECRET_KEY=sk_live_...

-- Real user emails
```

### Separation Best Practices

- Different Stripe accounts (test vs live)
- Different D1 databases
- Different KV namespaces
- Different domain (staging.fixci.dev)
- Environment-specific secrets

---

## Cost Breakdown (Estimated)

### Startup Phase (0-100 users)

| Service | Tier | Cost |
|---------|------|------|
| Cloudflare | Free | $0 |
| Domain | Yearly | $1.25/mo |
| Resend | Free (3K emails) | $0 |
| Stripe | Pay-as-you-go | $0* |
| **Total** | | **~$1.25/mo** |

*Stripe takes 2.9% + $0.30 per transaction

### Growth Phase (100-1K users)

| Service | Tier | Cost |
|---------|------|------|
| Cloudflare | Paid | $5-10/mo |
| Domain | Yearly | $1.25/mo |
| Resend | Paid | $10-20/mo |
| Stripe | Transactions | ~$30/mo |
| **Total** | | **~$50/mo** |

### Scale Phase (1K-10K users)

| Service | Tier | Cost |
|---------|------|------|
| Cloudflare | Business | $50-100/mo |
| Domain | Yearly | $1.25/mo |
| Resend | Paid | $50-100/mo |
| Stripe | Transactions | ~$200/mo |
| **Total** | | **~$350/mo** |

**Note:** These costs scale with revenue, so margins remain high (90%+).

---

## Next Steps

To implement this architecture for your SaaS:

1. **Follow the guides:**
   - `/docs/SAAS_TEMPLATE_GUIDE.md` - Complete template
   - `/docs/QUICK_START_CHECKLIST.md` - 2-week plan
   - `/docs/DEPLOYMENT_CHECKLIST.md` - Go-live checklist

2. **Clone and adapt:**
   - Copy FixCI structure
   - Replace core feature with yours
   - Keep auth, billing, admin as-is

3. **Launch and iterate:**
   - MVP in 2 weeks
   - Beta test for 4 weeks
   - Public launch
   - Continuous improvement

Good luck! 🚀
