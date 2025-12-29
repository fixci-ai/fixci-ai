/**
 * Subscription Management Service
 * Handles tier enforcement, usage tracking, and billing
 */

/**
 * Get or create subscription for an installation
 */
export async function getSubscription(installationId, env) {
  let subscription = await env.DB.prepare(
    'SELECT * FROM subscriptions WHERE installation_id = ?'
  ).bind(installationId).first();

  if (!subscription) {
    // Create default free tier subscription
    const periodStart = new Date().toISOString().split('T')[0];
    const periodEnd = getNextMonthDate(periodStart);

    const result = await env.DB.prepare(`
      INSERT INTO subscriptions (
        installation_id,
        tier,
        status,
        analyses_limit_monthly,
        current_period_start,
        current_period_end
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      installationId,
      'free',
      'active',
      10,
      periodStart,
      periodEnd
    ).run();

    subscription = {
      id: result.meta.last_row_id,
      installation_id: installationId,
      tier: 'free',
      status: 'active',
      analyses_limit_monthly: 10,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      analyses_used_current_period: 0,
      tokens_used_current_period: 0,
    };
  }

  return subscription;
}

/**
 * Check if installation can perform an analysis
 * Returns: { allowed: boolean, reason: string, remainingAnalyses: number, subscription: object }
 */
export async function canAnalyze(installationId, env) {
  const subscription = await getSubscription(installationId, env);

  // Check if subscription is active
  if (subscription.status !== 'active') {
    return {
      allowed: false,
      reason: `Subscription is ${subscription.status}. Please update your billing at https://fixci.dev/billing`,
      remainingAnalyses: 0,
      subscription
    };
  }

  // Check if billing period needs reset
  const now = new Date().toISOString().split('T')[0];
  if (now >= subscription.current_period_end) {
    await resetBillingPeriod(subscription, env);
    subscription.analyses_used_current_period = 0;
    subscription.tokens_used_current_period = 0;
  }

  // Enterprise: unlimited
  if (subscription.tier === 'enterprise' || subscription.analyses_limit_monthly === null) {
    return {
      allowed: true,
      reason: 'unlimited',
      remainingAnalyses: -1, // -1 indicates unlimited
      subscription
    };
  }

  // Check usage limits
  const remaining = subscription.analyses_limit_monthly - subscription.analyses_used_current_period;

  if (remaining <= 0) {
    // Pro tier: allow overage (pay-per-use)
    if (subscription.tier === 'pro') {
      return {
        allowed: true,
        reason: 'overage',
        remainingAnalyses: 0,
        subscription,
        isOverage: true
      };
    }

    // Free tier: hard limit
    return {
      allowed: false,
      reason: `Monthly limit reached (${subscription.analyses_limit_monthly} analyses). Upgrade to Pro for unlimited analyses at https://fixci.dev/pricing`,
      remainingAnalyses: 0,
      subscription
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    remainingAnalyses: remaining,
    subscription
  };
}

/**
 * Record an analysis usage
 */
export async function recordUsage(installationId, analysisId, tokens, cost, env) {
  const subscription = await getSubscription(installationId, env);

  // Increment current period usage
  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      analyses_used_current_period = analyses_used_current_period + 1,
      tokens_used_current_period = tokens_used_current_period + ?,
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(tokens, installationId).run();

  // Track overage if applicable
  if (subscription.tier === 'pro' &&
      subscription.analyses_used_current_period >= subscription.analyses_limit_monthly) {

    const overageCost = calculateOverageCost(tokens);

    await env.DB.prepare(`
      UPDATE subscriptions
      SET
        overage_analyses = overage_analyses + 1,
        overage_cost_usd = overage_cost_usd + ?
      WHERE installation_id = ?
    `).bind(overageCost, installationId).run();

    // Log billing event
    await logBillingEvent(installationId, 'overage_charged', overageCost, {
      analysisId,
      tokens,
      estimatedCost: cost
    }, env);
  }

  // Update usage_stats for historical tracking
  const date = new Date().toISOString().split('T')[0];
  await env.DB.prepare(`
    INSERT INTO usage_stats (repo_id, date, analyses_count, tokens_used, api_calls)
    VALUES (
      (SELECT id FROM repositories WHERE installation_id = ? LIMIT 1),
      ?, 1, ?, 1
    )
    ON CONFLICT(repo_id, date) DO UPDATE SET
      analyses_count = analyses_count + 1,
      tokens_used = tokens_used + ?,
      api_calls = api_calls + 1
  `).bind(installationId, date, tokens, tokens).run();
}

/**
 * Reset billing period when it expires
 */
async function resetBillingPeriod(subscription, env) {
  const newPeriodStart = subscription.current_period_end;
  const newPeriodEnd = getNextMonthDate(newPeriodStart);

  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      current_period_start = ?,
      current_period_end = ?,
      analyses_used_current_period = 0,
      tokens_used_current_period = 0,
      overage_analyses = 0,
      overage_cost_usd = 0.0,
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(newPeriodStart, newPeriodEnd, subscription.installation_id).run();
}

/**
 * Get next month's date (YYYY-MM-DD)
 */
function getNextMonthDate(dateStr) {
  const date = new Date(dateStr);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate overage cost for Pro tier
 * Example: $0.10 per analysis beyond limit
 */
function calculateOverageCost(tokens) {
  const COST_PER_OVERAGE_ANALYSIS = 0.10;
  return COST_PER_OVERAGE_ANALYSIS;
}

/**
 * Log billing event for audit trail
 */
export async function logBillingEvent(installationId, eventType, amountUsd, metadata, env) {
  await env.DB.prepare(`
    INSERT INTO billing_events (installation_id, event_type, amount_usd, metadata)
    VALUES (?, ?, ?, ?)
  `).bind(
    installationId,
    eventType,
    amountUsd,
    JSON.stringify(metadata)
  ).run();
}

/**
 * Get tier configuration
 */
export async function getTierConfig(tier, env) {
  const config = await env.DB.prepare(
    'SELECT * FROM tier_configs WHERE tier = ?'
  ).bind(tier).first();

  if (!config) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  return {
    ...config,
    features: JSON.parse(config.features),
    ai_providers: JSON.parse(config.ai_providers)
  };
}
