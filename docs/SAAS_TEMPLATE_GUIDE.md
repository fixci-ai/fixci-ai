# Complete SaaS Template Guide - From Zero to Production

**Based on:** FixCI - AI-powered CI/CD failure analyzer
**Platform:** Cloudflare (Workers, Pages, D1, KV, R2)
**Stack:** TypeScript/JavaScript, React, Stripe, GitHub App
**Security:** Enterprise-grade, OWASP compliant

This guide provides a step-by-step template for building a production-ready SaaS application using Cloudflare's serverless platform.

---

## Table of Contents

1. [Project Planning & Setup](#1-project-planning--setup)
2. [Domain & Infrastructure](#2-domain--infrastructure)
3. [Git Repository Setup](#3-git-repository-setup)
4. [Cloudflare Platform Setup](#4-cloudflare-platform-setup)
5. [Application Architecture](#5-application-architecture)
6. [User Authentication & Management](#6-user-authentication--management)
7. [Billing & Subscriptions](#7-billing--subscriptions)
8. [Security Hardening](#8-security-hardening)
9. [Feature Management](#9-feature-management)
10. [Deployment & CI/CD](#10-deployment--cicd)
11. [Monitoring & Maintenance](#11-monitoring--maintenance)
12. [Scaling & Optimization](#12-scaling--optimization)

---

## 1. Project Planning & Setup

### 1.1 Define Your SaaS Idea

**FixCI Example:**
- **Problem:** Developers waste time debugging CI/CD failures
- **Solution:** AI analyzes logs and explains failures in plain English
- **Value Prop:** Save 2-4 hours per week on debugging

**Your SaaS:**
```
Problem: [What pain point does it solve?]
Solution: [How does it solve it?]
Value Prop: [Why would users pay for it?]
```

### 1.2 Plan Your Pricing Model

**FixCI Tiers:**
```javascript
const TIERS = {
  free: {
    price: 0,
    analyses_per_month: 10,
    ai_model: 'cloudflare-workers-ai',
    features: ['Basic analysis', 'PR comments']
  },
  pro: {
    price: 29,
    analyses_per_month: 100,
    ai_model: 'claude-haiku',
    features: ['Advanced analysis', 'Slack integration', 'Priority support']
  },
  enterprise: {
    price: 199,
    analyses_per_month: -1, // unlimited
    ai_model: 'claude-sonnet',
    features: ['Custom AI', 'Dedicated support', 'SSO', 'Custom integrations']
  }
};
```

### 1.3 Tech Stack Decision

**FixCI Stack:**
- **Backend:** Cloudflare Workers (serverless)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare KV (sessions), R2 (logs)
- **Frontend:** Vanilla JS / React (Pages)
- **AI:** Claude API, Cloudflare Workers AI
- **Payments:** Stripe
- **Email:** Resend
- **Version Control:** Git + GitHub

**Why Cloudflare?**
- ✅ Global CDN (low latency)
- ✅ Generous free tier
- ✅ Integrated platform (no glue code)
- ✅ Pay-as-you-go pricing
- ✅ Zero cold starts

---

## 2. Domain & Infrastructure

### 2.1 Register Domain

**Recommended Registrars:**
- Cloudflare Registrar (at-cost pricing)
- Namecheap
- Google Domains

**FixCI Domain:** `fixci.dev`

**Steps:**
1. Search for available domain
2. Register domain ($10-15/year)
3. Transfer DNS to Cloudflare (if not using Cloudflare Registrar)

### 2.2 Cloudflare DNS Setup

```bash
# Add domain to Cloudflare
# Dashboard → Add Site → Enter domain

# Add DNS records:
# Type  Name             Content                      Proxy
# A     @                192.0.2.1                    Proxied
# A     www              192.0.2.1                    Proxied
# A     dashboard        192.0.2.1                    Proxied
# CNAME api            fixci-github-app.workers.dev  Proxied
```

**DNS Records Explained:**
- `@` (root): Main landing page
- `www`: Redirect to root
- `dashboard`: User dashboard
- `api`: API endpoints (Workers)

### 2.3 Email Setup

**Options:**
1. **Resend** (recommended for transactional emails)
2. **SendGrid**
3. **AWS SES**

**FixCI Setup:**
```bash
# 1. Sign up for Resend: https://resend.com
# 2. Add domain and verify DNS records
# 3. Get API key
# 4. Store as Wrangler secret:
npx wrangler secret put RESEND_API_KEY
```

**DNS Records for Resend:**
```
TXT  resend._domainkey  [from Resend dashboard]
```

---

## 3. Git Repository Setup

### 3.1 Initialize Repository

```bash
# Create project directory
mkdir your-saas-name
cd your-saas-name

# Initialize git
git init

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.dev.vars
.wrangler/
dist/
.DS_Store
*.log
wrangler.toml.local
.claude/
EOF

# Initial commit
git add .
git commit -m "Initial commit"
```

### 3.2 GitHub Repository

```bash
# Create GitHub repo (using GitHub CLI)
gh repo create your-saas-name --public --source=. --remote=origin

# Or manually:
# 1. Go to https://github.com/new
# 2. Create repository
# 3. Add remote:
git remote add origin git@github.com:username/your-saas-name.git
git push -u origin main
```

### 3.3 Repository Structure

```
your-saas-name/
├── apps/
│   ├── landing/          # Marketing site (Cloudflare Pages)
│   │   └── src/
│   │       └── index.js  # Worker for landing page
│   ├── dashboard/        # User dashboard (React/Pages)
│   │   └── public/
│   └── admin/            # Admin panel (React)
├── packages/
│   ├── api/              # Main API worker
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   ├── auth.js
│   │   │   ├── stripe.js
│   │   │   └── admin.js
│   │   └── wrangler.toml
│   └── core/             # Shared logic
├── migrations/           # D1 database migrations
│   ├── 001-init.sql
│   └── 002-users.sql
├── scripts/              # Deployment/setup scripts
├── docs/                 # Documentation
├── .github/
│   └── workflows/        # CI/CD pipelines
├── package.json
├── README.md
└── CLAUDE.md            # Claude Code instructions
```

### 3.4 Create CLAUDE.md

This file helps Claude Code understand your project:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## Project Overview

[Your SaaS name] is a [brief description].

**Domain:** yourapp.dev
**Stack:** Cloudflare Workers, D1, React, Stripe

## Repository Structure

[Describe your structure]

## Commands

### Development
\`\`\`bash
npm run dev
\`\`\`

### Deployment
\`\`\`bash
npm run deploy
\`\`\`

## Key Technical Decisions

- Cloudflare-first: Workers for compute, D1 for database
- Magic link authentication (passwordless)
- Stripe for billing

## Brand

- Primary color: #yourcolor
- Voice: [your brand voice]
```

---

## 4. Cloudflare Platform Setup

### 4.1 Workers (Backend API)

**Create Worker:**
```bash
npm create cloudflare@latest packages/api
# Select: "Hello World" Worker
# TypeScript: Yes/No (your choice)

cd packages/api
npm install
```

**Configure wrangler.toml:**
```toml
name = "your-saas-api"
main = "src/index.js"
compatibility_date = "2024-01-01"
workers_dev = true

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "your-saas-db"
database_id = "your-database-id"

# KV for sessions
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-id"

# Secrets (set via wrangler secret put)
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - RESEND_API_KEY
```

### 4.2 D1 Database (SQLite)

**Create Database:**
```bash
npx wrangler d1 create your-saas-db

# Output:
# database_id = "abc123..."
# Add to wrangler.toml
```

**Initial Schema (migrations/001-init.sql):**
```sql
-- Core tables for SaaS application

-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Subscriptions/Organizations
CREATE TABLE organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- User-Organization membership
CREATE TABLE organization_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  UNIQUE(user_id, organization_id)
);

-- Subscriptions (billing)
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Usage tracking
CREATE TABLE usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_id INTEGER NOT NULL,
  feature TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Auth sessions
CREATE TABLE auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX idx_usage_org_feature ON usage(organization_id, feature);
```

**Run Migration:**
```bash
npx wrangler d1 execute your-saas-db --remote --file=migrations/001-init.sql
```

### 4.3 KV Namespace (Sessions)

**Create KV:**
```bash
npx wrangler kv:namespace create "SESSIONS"

# Output:
# id = "xyz789..."
# Add to wrangler.toml
```

### 4.4 R2 Bucket (File Storage - Optional)

```bash
npx wrangler r2 bucket create your-saas-files

# Add to wrangler.toml:
[[r2_buckets]]
binding = "FILES"
bucket_name = "your-saas-files"
```

### 4.5 Pages (Frontend)

**Create Pages project:**
```bash
cd apps/dashboard
npm create vite@latest . -- --template react

# Or for landing page:
mkdir -p apps/landing/public
# Add index.html, etc.

# Deploy:
npx wrangler pages deploy public --project-name your-saas-dashboard
```

---

## 5. Application Architecture

### 5.1 Worker Entry Point (src/index.js)

```javascript
import { handleAuth } from './auth.js';
import { handleStripe } from './stripe.js';
import { handleAPI } from './api.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(request)
      });
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', {
        headers: getCorsHeaders(request)
      });
    }

    // Auth endpoints
    if (url.pathname.startsWith('/auth/')) {
      return handleAuth(request, env, ctx);
    }

    // Stripe webhooks
    if (url.pathname.startsWith('/stripe/')) {
      return handleStripe(request, env, ctx);
    }

    // API endpoints (protected)
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env, ctx);
    }

    return new Response('Not Found', { status: 404 });
  }
};

function getCorsHeaders(request) {
  const allowedOrigins = [
    'https://yourapp.dev',
    'https://dashboard.yourapp.dev',
    'http://localhost:5173' // Vite dev
  ];

  const origin = request.headers.get('Origin');
  const allowedOrigin = allowedOrigins.includes(origin)
    ? origin
    : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400'
  };
}
```

### 5.2 Module Structure

**src/auth.js** - Authentication logic
**src/stripe.js** - Billing logic
**src/api.js** - Business logic
**src/admin.js** - Admin endpoints
**src/email.js** - Email service
**src/ratelimit.js** - Rate limiting

Each module exports handler functions that process specific routes.

---

## 6. User Authentication & Management

### 6.1 Magic Link Authentication (Passwordless)

**Why Magic Links?**
- ✅ No password management
- ✅ More secure (no password leaks)
- ✅ Better UX (one click)
- ✅ No password reset flow needed

**Implementation (src/auth.js):**

```javascript
import { sendMagicLink } from './email.js';

/**
 * Generate secure random token
 */
function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Send magic link to user
 */
export async function sendLoginLink(email, env) {
  // Generate token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  // Store token in KV
  await env.SESSIONS.put(token, JSON.stringify({ email }), {
    expirationTtl: 600
  });

  // Send email
  const loginUrl = `https://dashboard.yourapp.dev/?token=${token}`;
  await sendMagicLink(email, loginUrl, env);

  return { success: true };
}

/**
 * Verify magic link and create session
 */
export async function verifyToken(token, env) {
  // Get token data from KV
  const data = await env.SESSIONS.get(token);
  if (!data) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  const { email } = JSON.parse(data);

  // Find or create user
  let user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email).first();

  if (!user) {
    const result = await env.DB.prepare(
      'INSERT INTO users (email) VALUES (?) RETURNING *'
    ).bind(email).first();
    user = result;
  }

  // Delete magic link token (one-time use)
  await env.SESSIONS.delete(token);

  // Create session token (30 days)
  const sessionToken = generateToken();
  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await env.DB.prepare(`
    INSERT INTO auth_sessions (user_id, token, expires_at)
    VALUES (?, ?, ?)
  `).bind(user.id, sessionToken, sessionExpiry.toISOString()).run();

  await env.SESSIONS.put(sessionToken, JSON.stringify({
    userId: user.id,
    email: user.email
  }), {
    expirationTtl: 30 * 24 * 60 * 60
  });

  return {
    valid: true,
    sessionToken,
    user: { id: user.id, email: user.email }
  };
}

/**
 * Verify session (for protected routes)
 */
export async function verifySession(request, env) {
  // Check httpOnly cookie first
  let token = null;
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    const match = cookie.match(/session=([^;]+)/);
    if (match) token = match[1];
  }

  // Fallback to Authorization header
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return { authenticated: false };
  }

  // Check KV
  const data = await env.SESSIONS.get(token);
  if (!data) {
    return { authenticated: false };
  }

  const { userId, email } = JSON.parse(data);

  return {
    authenticated: true,
    user: { id: userId, email }
  };
}
```

### 6.2 Session Management with HttpOnly Cookies

**Set Cookie on Login:**
```javascript
const cookieValue = `session=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`;

const response = new Response(JSON.stringify({ success: true }), {
  headers: {
    'Content-Type': 'application/json',
    'Set-Cookie': cookieValue
  }
});
```

**Frontend (No localStorage!):**
```javascript
// Login - send magic link
async function login(email) {
  await fetch('https://api.yourapp.dev/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}

// Verify magic link
async function verifyMagicLink(token) {
  const response = await fetch('https://api.yourapp.dev/auth/verify', {
    method: 'POST',
    credentials: 'include', // Important!
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });

  // Clear token from URL
  window.history.replaceState({}, document.title, '/');

  // Session now in httpOnly cookie
  return response.json();
}

// Check if logged in
async function checkAuth() {
  const response = await fetch('https://api.yourapp.dev/api/me', {
    credentials: 'include' // Sends cookie automatically
  });

  if (response.ok) {
    return await response.json();
  }

  return null;
}
```

### 6.3 Multi-Tenancy (Organizations)

**Create Organization when user signs up:**
```javascript
// After creating user
const org = await env.DB.prepare(`
  INSERT INTO organizations (name)
  VALUES (?)
  RETURNING *
`).bind(`${email}'s Organization`).first();

// Add user as owner
await env.DB.prepare(`
  INSERT INTO organization_members (user_id, organization_id, role)
  VALUES (?, ?, 'owner')
`).bind(user.id, org.id).run();
```

**Get User's Organizations:**
```javascript
export async function getUserOrganizations(userId, env) {
  const orgs = await env.DB.prepare(`
    SELECT
      o.*,
      om.role,
      s.tier,
      s.status as subscription_status
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    LEFT JOIN subscriptions s ON o.id = s.organization_id
    WHERE om.user_id = ?
    ORDER BY om.created_at ASC
  `).bind(userId).all();

  return orgs.results;
}
```

---

## 7. Billing & Subscriptions

### 7.1 Stripe Setup

**1. Create Stripe Account:**
- Sign up at https://stripe.com
- Get API keys (test mode first)

**2. Configure Products:**
```javascript
// In Stripe Dashboard → Products
// Create 3 products: Free, Pro, Enterprise

const STRIPE_PRODUCTS = {
  pro: 'price_abc123...',      // Monthly price ID
  enterprise: 'price_def456...' // Monthly price ID
};
```

**3. Set Secrets:**
```bash
npx wrangler secret put STRIPE_SECRET_KEY --name your-saas-api
npx wrangler secret put STRIPE_WEBHOOK_SECRET --name your-saas-api
```

### 7.2 Checkout Flow (src/stripe.js)

```javascript
/**
 * Create Stripe checkout session
 */
export async function createCheckoutSession(request, env) {
  const { organizationId, tier } = await request.json();

  // Verify user owns organization
  const auth = await verifySession(request, env);
  if (!auth.authenticated) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Create checkout session
  const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price]': STRIPE_PRODUCTS[tier],
      'line_items[0][quantity]': '1',
      'mode': 'subscription',
      'success_url': 'https://dashboard.yourapp.dev?success=true',
      'cancel_url': 'https://dashboard.yourapp.dev?canceled=true',
      'metadata[organization_id]': organizationId,
      'metadata[tier]': tier
    })
  }).then(r => r.json());

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 7.3 Webhook Handler

```javascript
/**
 * Handle Stripe webhooks
 */
export async function handleStripeWebhook(request, env) {
  const signature = request.headers.get('stripe-signature');
  const body = await request.text();

  // Verify signature (see Security Hardening section)
  const isValid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object, env);
      break;

    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object, env);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object, env);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object, env);
      break;
  }

  return new Response(JSON.stringify({ received: true }));
}

async function handleCheckoutCompleted(session, env) {
  const organizationId = session.metadata.organization_id;
  const tier = session.metadata.tier;

  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      tier = ?,
      stripe_customer_id = ?,
      stripe_subscription_id = ?,
      status = 'active',
      updated_at = datetime('now')
    WHERE organization_id = ?
  `).bind(tier, session.customer, session.subscription, organizationId).run();
}
```

### 7.4 Usage Tracking

```javascript
/**
 * Track feature usage
 */
export async function trackUsage(organizationId, feature, env) {
  const period = getCurrentBillingPeriod();

  // Increment usage
  await env.DB.prepare(`
    INSERT INTO usage (organization_id, feature, count, period_start, period_end)
    VALUES (?, ?, 1, ?, ?)
    ON CONFLICT(organization_id, feature, period_start)
    DO UPDATE SET count = count + 1
  `).bind(organizationId, feature, period.start, period.end).run();

  // Check limits
  const usage = await env.DB.prepare(`
    SELECT u.count, s.tier
    FROM usage u
    JOIN subscriptions s ON u.organization_id = s.organization_id
    WHERE u.organization_id = ? AND u.feature = ?
  `).bind(organizationId, feature).first();

  const limits = {
    free: 10,
    pro: 100,
    enterprise: -1 // unlimited
  };

  const limit = limits[usage.tier];
  if (limit !== -1 && usage.count >= limit) {
    throw new Error('Usage limit exceeded');
  }
}
```

---

## 8. Security Hardening

### 8.1 Security Checklist

- [x] **Authentication**
  - [x] HttpOnly cookies (not localStorage)
  - [x] Secure + SameSite flags
  - [x] Token expiration (10 min magic links, 30 day sessions)
  - [x] One-time use magic links

- [x] **Authorization**
  - [x] Role-based access control
  - [x] Organization-scoped queries
  - [x] Admin endpoints protected

- [x] **Input Validation**
  - [x] SQL injection prevention (parameterized queries)
  - [x] XSS prevention (httpOnly cookies)
  - [x] CSRF prevention (SameSite cookies)
  - [x] Rate limiting

- [x] **API Security**
  - [x] CORS with origin whitelisting
  - [x] Webhook signature verification
  - [x] Constant-time comparisons

- [x] **Secrets Management**
  - [x] Wrangler secrets (encrypted)
  - [x] No secrets in code/git
  - [x] Environment-specific secrets

### 8.2 Critical Security Implementations

**See:** `/Users/devilke/work/fixci/docs/WEBHOOK_SECRETS_SETUP.md`
**See:** `/Users/devilke/work/fixci/SECURITY_TEST_RESULTS.md`

**Rate Limiting (src/ratelimit.js):**
```javascript
export async function checkRateLimit(key, limit, windowSeconds, env) {
  const rateLimitKey = `ratelimit:${key}`;
  const data = await env.SESSIONS.get(rateLimitKey);

  let count = 0;
  let resetAt = Date.now() + windowSeconds * 1000;

  if (data) {
    const parsed = JSON.parse(data);
    count = parsed.count;
    resetAt = parsed.resetAt;

    if (Date.now() > resetAt) {
      count = 0;
      resetAt = Date.now() + windowSeconds * 1000;
    }
  }

  if (count >= limit) {
    return { allowed: false, resetAt };
  }

  count++;
  await env.SESSIONS.put(rateLimitKey, JSON.stringify({ count, resetAt }), {
    expirationTtl: windowSeconds
  });

  return { allowed: true, remaining: limit - count };
}
```

**Apply to endpoints:**
```javascript
// 3 login attempts per 15 minutes
const rateLimit = await checkRateLimit(`login:${email}`, 3, 900, env);
if (!rateLimit.allowed) {
  return new Response('Too many requests', { status: 429 });
}
```

### 8.3 Stripe Webhook Verification

```javascript
async function verifyStripeSignature(payload, signature, secret) {
  // Parse signature header
  const parts = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key === 't') acc.timestamp = value;
    else if (key === 'v1') acc.signatures.push(value);
    return acc;
  }, { signatures: [] });

  // Check timestamp (5 min tolerance)
  const timestamp = parseInt(parts.timestamp);
  if (Date.now() - timestamp * 1000 > 300000) {
    return false;
  }

  // Compute HMAC
  const signedPayload = `${parts.timestamp}.${payload}`;
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expected = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  for (const sig of parts.signatures) {
    if (constantTimeCompare(sig, expected)) {
      return true;
    }
  }

  return false;
}
```

---

## 9. Feature Management

### 9.1 Feature Flags

**Database:**
```sql
CREATE TABLE feature_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT 0,
  rollout_percentage INTEGER DEFAULT 0, -- 0-100
  created_at TEXT DEFAULT (datetime('now'))
);

INSERT INTO feature_flags (name, enabled, rollout_percentage) VALUES
  ('ai_analysis', 1, 100),
  ('slack_integration', 1, 50),
  ('custom_branding', 0, 0);
```

**Check Feature:**
```javascript
export async function isFeatureEnabled(featureName, userId, env) {
  const flag = await env.DB.prepare(
    'SELECT * FROM feature_flags WHERE name = ?'
  ).bind(featureName).first();

  if (!flag) return false;
  if (!flag.enabled) return false;
  if (flag.rollout_percentage === 100) return true;

  // Hash user ID for consistent rollout
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${featureName}:${userId}`)
  );
  const hashInt = new Uint8Array(hash)[0];
  const percentage = (hashInt / 255) * 100;

  return percentage < flag.rollout_percentage;
}
```

### 9.2 Tier-Based Features

```javascript
const TIER_FEATURES = {
  free: [
    'basic_analysis',
    'pr_comments'
  ],
  pro: [
    'basic_analysis',
    'pr_comments',
    'slack_integration',
    'priority_support',
    'advanced_ai'
  ],
  enterprise: [
    'basic_analysis',
    'pr_comments',
    'slack_integration',
    'priority_support',
    'advanced_ai',
    'custom_branding',
    'sso',
    'dedicated_support'
  ]
};

export function hasFeature(tier, feature) {
  return TIER_FEATURES[tier]?.includes(feature) || false;
}
```

### 9.3 Admin Panel

**Simple Admin Dashboard (apps/admin/src/App.jsx):**
```jsx
import { useState, useEffect } from 'react';

function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('https://api.yourapp.dev/admin/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminKey')}`
      }
    })
    .then(r => r.json())
    .then(setStats);
  }, []);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <div className="stats">
        <div>Total Users: {stats?.totalUsers}</div>
        <div>Active Subscriptions: {stats?.activeSubscriptions}</div>
        <div>MRR: ${stats?.mrr}</div>
      </div>

      <UsersTable />
      <SubscriptionsTable />
      <FeatureFlagsEditor />
    </div>
  );
}
```

**Admin API (src/admin.js):**
```javascript
export async function getAdminStats(request, env) {
  // Verify admin auth
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stats = await env.DB.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subs,
      (SELECT SUM(CASE
        WHEN tier = 'pro' THEN 29
        WHEN tier = 'enterprise' THEN 199
        ELSE 0
      END) FROM subscriptions WHERE status = 'active') as mrr
  `).first();

  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function verifyAdminAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false };
  }

  const token = authHeader.substring(7);

  // Constant-time comparison
  if (token.length !== env.ADMIN_API_KEY.length) {
    return { authorized: false };
  }

  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ env.ADMIN_API_KEY.charCodeAt(i);
  }

  return { authorized: mismatch === 0 };
}
```

---

## 10. Deployment & CI/CD

### 10.1 Manual Deployment

```bash
# Deploy API Worker
cd packages/api
npx wrangler deploy -c wrangler.toml

# Deploy Landing Page
cd apps/landing
npx wrangler deploy

# Deploy Dashboard
cd apps/dashboard
npm run build
npx wrangler pages deploy dist --project-name your-saas-dashboard
```

### 10.2 GitHub Actions CI/CD

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Deploy API Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy -c packages/api/wrangler.toml

      - name: Build Dashboard
        run: |
          cd apps/dashboard
          npm install
          npm run build

      - name: Deploy Dashboard
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy apps/dashboard/dist --project-name your-saas-dashboard
```

**Setup Secrets:**
```bash
# In GitHub repo → Settings → Secrets
# Add:
# - CLOUDFLARE_API_TOKEN
# - CLOUDFLARE_ACCOUNT_ID
```

### 10.3 Environment Management

**Development:**
```bash
# .dev.vars (local only, not committed)
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_test_...
```

**Production:**
```bash
# Wrangler secrets (encrypted)
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
```

---

## 11. Monitoring & Maintenance

### 11.1 Cloudflare Analytics

**Setup:**
- Dashboard → Workers → Your Worker → Analytics
- View requests, errors, CPU time

**Key Metrics:**
- Request volume
- Error rate (target: <1%)
- P50/P95/P99 latency
- CPU time

### 11.2 Real-Time Logs

```bash
# Tail worker logs
npx wrangler tail --format pretty

# Filter by status
npx wrangler tail --status error

# Save to file
npx wrangler tail > logs.txt
```

### 11.3 Error Tracking

**Integrate Sentry (optional):**
```javascript
import * as Sentry from '@sentry/cloudflare';

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx);
    } catch (error) {
      Sentry.captureException(error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

### 11.4 Uptime Monitoring

**Setup Uptime Robot (free):**
1. Sign up: https://uptimerobot.com
2. Add monitors:
   - `https://yourapp.dev` (landing)
   - `https://api.yourapp.dev/health` (API)
   - `https://dashboard.yourapp.dev` (dashboard)
3. Configure alerts (email/Slack)

### 11.5 Database Backups

```bash
# Export D1 database
npx wrangler d1 export your-saas-db --output backup.sql

# Schedule backups (cron job)
0 0 * * * cd /path/to/project && npx wrangler d1 export your-saas-db --output backups/backup-$(date +\%Y\%m\%d).sql
```

---

## 12. Scaling & Optimization

### 12.1 Caching Strategy

**Edge Caching:**
```javascript
// Cache static content
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;

    // Check cache
    let response = await cache.match(request);
    if (response) return response;

    // Generate response
    response = await handleRequest(request, env);

    // Cache for 1 hour
    const cacheResponse = response.clone();
    cacheResponse.headers.set('Cache-Control', 'public, max-age=3600');
    ctx.waitUntil(cache.put(request, cacheResponse));

    return response;
  }
};
```

**KV Caching:**
```javascript
// Cache expensive queries
async function getUserOrgs(userId, env) {
  const cacheKey = `user:${userId}:orgs`;

  // Check cache
  const cached = await env.SESSIONS.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const orgs = await env.DB.prepare('...').bind(userId).all();

  // Cache for 5 minutes
  await env.SESSIONS.put(cacheKey, JSON.stringify(orgs.results), {
    expirationTtl: 300
  });

  return orgs.results;
}
```

### 12.2 Database Optimization

**Indexes:**
```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON auth_sessions(token);
CREATE INDEX idx_usage_org_period ON usage(organization_id, period_start);
```

**Query Optimization:**
```javascript
// Bad: N+1 query
for (const org of orgs) {
  const subscription = await getSubscription(org.id);
}

// Good: JOIN
const orgs = await env.DB.prepare(`
  SELECT o.*, s.tier, s.status
  FROM organizations o
  LEFT JOIN subscriptions s ON o.id = s.organization_id
  WHERE o.id IN (?)
`).bind(orgIds.join(',')).all();
```

### 12.3 Cost Optimization

**Cloudflare Free Tier Limits:**
- Workers: 100,000 requests/day
- D1: 5M reads/day, 100K writes/day
- KV: 100K reads/day, 1K writes/day
- Pages: Unlimited requests

**Pro Tips:**
- Cache aggressively (reduce DB queries)
- Use KV for read-heavy data
- Batch database operations
- Optimize worker bundle size

### 12.4 Performance Monitoring

**Web Vitals (Frontend):**
```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

**Worker Performance:**
```javascript
export default {
  async fetch(request, env, ctx) {
    const start = Date.now();

    const response = await handleRequest(request, env);

    const duration = Date.now() - start;
    response.headers.set('X-Response-Time', `${duration}ms`);

    return response;
  }
};
```

---

## Next Steps

After completing this guide:

1. **Launch MVP** (2-4 weeks)
   - Core feature working
   - Basic auth + billing
   - Landing page live

2. **Beta Testing** (4-8 weeks)
   - Invite 10-50 users
   - Gather feedback
   - Fix critical bugs

3. **Public Launch**
   - Product Hunt
   - Indie Hackers
   - Twitter/X
   - Tech forums

4. **Iterate**
   - Add features based on feedback
   - Improve onboarding
   - Optimize conversions

---

## Resources

**Documentation:**
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- D1 Database: https://developers.cloudflare.com/d1/
- Stripe: https://stripe.com/docs
- Resend: https://resend.com/docs

**Tools:**
- Wrangler: https://developers.cloudflare.com/workers/wrangler/
- GitHub CLI: https://cli.github.com/
- Stripe CLI: https://stripe.com/docs/stripe-cli

**Community:**
- Cloudflare Discord: https://discord.gg/cloudflaredev
- Indie Hackers: https://indiehackers.com
- r/SaaS: https://reddit.com/r/SaaS

---

## Conclusion

You now have a complete template for building a production-ready SaaS application on Cloudflare's platform with:

✅ Serverless architecture
✅ Global CDN distribution
✅ Enterprise security
✅ Stripe billing integration
✅ Magic link authentication
✅ Multi-tenant organization model
✅ Admin dashboard
✅ CI/CD pipeline
✅ Monitoring & analytics

**Estimated Time to MVP:** 2-4 weeks (1 developer)
**Estimated Costs:**
- Domain: $10-15/year
- Cloudflare: $0-5/month (free tier sufficient for most MVPs)
- Stripe: 2.9% + $0.30 per transaction
- Resend: $0-20/month (free tier: 3,000 emails/month)

**Total:** ~$25-40/month to start

Good luck building your SaaS! 🚀
