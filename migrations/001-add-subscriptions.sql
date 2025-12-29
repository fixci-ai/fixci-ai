-- FixCI Subscription System Migration
-- Adds subscription management, tier configs, and billing events tables

-- Subscription management table
CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER UNIQUE NOT NULL,

  -- Subscription details
  tier TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'suspended', 'past_due'

  -- Usage limits (NULL = unlimited)
  analyses_limit_monthly INTEGER DEFAULT 10,
  token_limit_monthly INTEGER,

  -- Current billing period tracking
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  analyses_used_current_period INTEGER DEFAULT 0,
  tokens_used_current_period INTEGER DEFAULT 0,

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Pay-per-use tracking (Pro tier overages)
  overage_analyses INTEGER DEFAULT 0,
  overage_cost_usd REAL DEFAULT 0.0,

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (installation_id) REFERENCES installations(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_installation ON subscriptions(installation_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON subscriptions(current_period_end);

-- Tier configurations (reference table)
CREATE TABLE IF NOT EXISTS tier_configs (
  tier TEXT PRIMARY KEY,
  analyses_limit INTEGER,
  price_monthly_usd REAL,
  features TEXT, -- JSON blob
  ai_providers TEXT, -- JSON array
  created_at TEXT DEFAULT (datetime('now'))
);

-- Insert default tier configurations
INSERT INTO tier_configs (tier, analyses_limit, price_monthly_usd, features, ai_providers) VALUES
  ('free', 10, 0.0, '["Basic analysis", "PR comments", "Cloudflare/Gemini AI"]', '["cloudflare", "gemini"]'),
  ('pro', 100, 29.0, '["Advanced analysis", "All AI providers", "Pay-per-use overages", "Priority support"]', '["all"]'),
  ('enterprise', NULL, NULL, '["Unlimited analyses", "Custom AI models", "Dedicated support", "SLA"]', '["all"]')
ON CONFLICT(tier) DO NOTHING;

-- Billing events log (audit trail)
CREATE TABLE IF NOT EXISTS billing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  installation_id INTEGER NOT NULL,
  event_type TEXT NOT NULL, -- 'subscription_created', 'payment_succeeded', 'limit_exceeded', 'overage_charged'
  amount_usd REAL,
  metadata TEXT, -- JSON blob
  created_at TEXT DEFAULT (datetime('now')),

  FOREIGN KEY (installation_id) REFERENCES installations(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_installation ON billing_events(installation_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_created ON billing_events(created_at);
