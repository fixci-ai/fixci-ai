-- Create default free tier subscriptions for installations that don't have one

INSERT INTO subscriptions (
  installation_id,
  tier,
  status,
  analyses_limit_monthly,
  current_period_start,
  current_period_end
)
SELECT 
  i.installation_id,
  'free' as tier,
  'active' as status,
  10 as analyses_limit_monthly,
  date('now') as current_period_start,
  date('now', '+1 month') as current_period_end
FROM installations i
LEFT JOIN subscriptions s ON i.installation_id = s.installation_id
WHERE s.installation_id IS NULL AND i.is_active = 1;

-- Show results
SELECT 'Created subscriptions for:' as message;
SELECT 
  i.installation_id,
  i.account_login,
  s.tier,
  s.analyses_limit_monthly
FROM installations i
JOIN subscriptions s ON i.installation_id = s.installation_id
ORDER BY i.installation_id;
