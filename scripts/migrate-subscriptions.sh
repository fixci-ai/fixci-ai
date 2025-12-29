#!/bin/bash

# Migrate existing installations to free tier subscriptions
# This script creates free tier subscriptions for all installations that don't have one yet

echo "🔄 Migrating existing installations to free tier subscriptions..."

npx wrangler d1 execute fixci-db --remote --command="
INSERT INTO subscriptions (
  installation_id,
  tier,
  status,
  analyses_limit_monthly,
  current_period_start,
  current_period_end,
  analyses_used_current_period,
  tokens_used_current_period
)
SELECT
  installation_id,
  'free' as tier,
  'active' as status,
  10 as analyses_limit_monthly,
  date('now') as current_period_start,
  date('now', '+1 month') as current_period_end,
  0 as analyses_used_current_period,
  0 as tokens_used_current_period
FROM installations
WHERE installation_id NOT IN (SELECT installation_id FROM subscriptions)
  AND is_active = 1;
"

echo "✅ Migration complete!"
echo ""
echo "Verify migrated subscriptions:"
npx wrangler d1 execute fixci-db --remote --command="
SELECT
  i.installation_id,
  i.account_login,
  s.tier,
  s.status,
  s.analyses_limit_monthly,
  s.current_period_start,
  s.current_period_end
FROM installations i
JOIN subscriptions s ON i.installation_id = s.installation_id
WHERE i.is_active = 1
ORDER BY i.created_at DESC
LIMIT 10;
"
