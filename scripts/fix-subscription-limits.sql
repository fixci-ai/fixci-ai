-- Fix subscriptions with incorrect limits based on their tier

-- Update free tier subscriptions with 0 or NULL limit to 10
UPDATE subscriptions
SET analyses_limit_monthly = 10
WHERE tier = 'free' AND (analyses_limit_monthly = 0 OR analyses_limit_monthly IS NULL);

-- Update pro tier subscriptions with 0 or NULL limit to 100
UPDATE subscriptions
SET analyses_limit_monthly = 100
WHERE tier = 'pro' AND (analyses_limit_monthly = 0 OR analyses_limit_monthly IS NULL);

-- Enterprise tier should have NULL (unlimited)
UPDATE subscriptions
SET analyses_limit_monthly = NULL
WHERE tier = 'enterprise' AND analyses_limit_monthly IS NOT NULL;

-- Show what was updated
SELECT 'Fixed subscriptions:' as message;
SELECT 
  tier, 
  COUNT(*) as count,
  analyses_limit_monthly
FROM subscriptions
GROUP BY tier, analyses_limit_monthly;
