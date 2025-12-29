/**
 * Admin API for Subscription Management
 * Allows manual control of subscriptions, granting access, etc.
 */

import { getSubscription, getTierConfig, logBillingEvent } from './subscription.js';

/**
 * Verify admin API key
 */
function verifyAdminAuth(request, env) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return { authorized: false, error: 'Invalid Authorization format. Use: Bearer <token>' };
  }

  if (!env.ADMIN_API_KEY) {
    return { authorized: false, error: 'Admin API not configured' };
  }

  if (token !== env.ADMIN_API_KEY) {
    return { authorized: false, error: 'Invalid API key' };
  }

  return { authorized: true };
}

/**
 * List all subscriptions with filtering
 */
export async function listSubscriptions(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const url = new URL(request.url);
  const tier = url.searchParams.get('tier');
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  let query = `
    SELECT
      s.*,
      i.account_login,
      i.account_type,
      i.is_active as installation_active
    FROM subscriptions s
    JOIN installations i ON s.installation_id = i.installation_id
    WHERE 1=1
  `;
  const bindings = [];

  if (tier) {
    query += ' AND s.tier = ?';
    bindings.push(tier);
  }

  if (status) {
    query += ' AND s.status = ?';
    bindings.push(status);
  }

  query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  bindings.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...bindings).all();

  // Get total count
  let countQuery = 'SELECT COUNT(*) as total FROM subscriptions s WHERE 1=1';
  const countBindings = [];
  if (tier) {
    countQuery += ' AND s.tier = ?';
    countBindings.push(tier);
  }
  if (status) {
    countQuery += ' AND s.status = ?';
    countBindings.push(status);
  }

  const countResult = await env.DB.prepare(countQuery).bind(...countBindings).first();

  return jsonResponse({
    subscriptions: result.results,
    pagination: {
      total: countResult.total,
      limit,
      offset,
      hasMore: offset + limit < countResult.total
    }
  });
}

/**
 * Grant or change subscription tier for an installation
 */
export async function grantSubscription(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const { installationId, tier, reason, expiresAt } = await request.json();

  if (!installationId || !tier) {
    return jsonResponse({ error: 'Missing required fields: installationId, tier' }, 400);
  }

  // Verify tier exists
  const tierConfig = await getTierConfig(tier, env);
  if (!tierConfig) {
    return jsonResponse({ error: `Invalid tier: ${tier}` }, 400);
  }

  const subscription = await getSubscription(installationId, env);

  const oldTier = subscription.tier;

  // Update subscription
  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      tier = ?,
      analyses_limit_monthly = ?,
      status = 'active',
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(tier, tierConfig.analyses_limit, installationId).run();

  // Log billing event
  await logBillingEvent(
    installationId,
    'tier_granted',
    0,
    {
      oldTier,
      newTier: tier,
      reason: reason || 'Manual grant by admin',
      expiresAt: expiresAt || null
    },
    env
  );

  return jsonResponse({
    success: true,
    message: `Subscription for installation ${installationId} updated to ${tier}`,
    subscription: {
      installationId,
      tier,
      previousTier: oldTier,
      analysesLimit: tierConfig.analyses_limit,
      reason
    }
  });
}

/**
 * Suspend or reactivate a subscription
 */
export async function updateSubscriptionStatus(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const { installationId, status, reason } = await request.json();

  if (!installationId || !status) {
    return jsonResponse({ error: 'Missing required fields: installationId, status' }, 400);
  }

  const validStatuses = ['active', 'suspended', 'cancelled', 'past_due'];
  if (!validStatuses.includes(status)) {
    return jsonResponse({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, 400);
  }

  const subscription = await getSubscription(installationId, env);
  const oldStatus = subscription.status;

  await env.DB.prepare(`
    UPDATE subscriptions
    SET status = ?, updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(status, installationId).run();

  await logBillingEvent(
    installationId,
    'status_changed',
    0,
    {
      oldStatus,
      newStatus: status,
      reason: reason || 'Manual change by admin'
    },
    env
  );

  return jsonResponse({
    success: true,
    message: `Subscription status updated from ${oldStatus} to ${status}`,
    installationId,
    oldStatus,
    newStatus: status
  });
}

/**
 * Get detailed subscription info for an installation
 */
export async function getSubscriptionDetails(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const url = new URL(request.url);
  const installationId = url.searchParams.get('installation_id');

  if (!installationId) {
    return jsonResponse({ error: 'Missing installation_id parameter' }, 400);
  }

  // Get subscription
  const subscription = await getSubscription(parseInt(installationId), env);

  // Get installation info
  const installation = await env.DB.prepare(
    'SELECT * FROM installations WHERE installation_id = ?'
  ).bind(parseInt(installationId)).first();

  // Get recent analyses
  const analyses = await env.DB.prepare(`
    SELECT
      a.id,
      a.workflow_name,
      a.analysis_status,
      a.ai_provider,
      a.token_count,
      a.estimated_cost_usd,
      a.created_at,
      r.full_name as repository
    FROM analyses a
    JOIN repositories r ON a.repo_id = r.id
    JOIN installations i ON r.owner = i.account_login
    WHERE i.installation_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `).bind(parseInt(installationId)).all();

  // Get billing events
  const billingEvents = await env.DB.prepare(`
    SELECT * FROM billing_events
    WHERE installation_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(parseInt(installationId)).all();

  return jsonResponse({
    subscription,
    installation,
    recentAnalyses: analyses.results,
    billingEvents: billingEvents.results,
    stats: {
      analysesThisPeriod: subscription.analyses_used_current_period,
      analysesLimit: subscription.analyses_limit_monthly,
      remainingAnalyses: subscription.analyses_limit_monthly
        ? subscription.analyses_limit_monthly - subscription.analyses_used_current_period
        : null,
      overageAnalyses: subscription.overage_analyses || 0,
      overageCost: subscription.overage_cost_usd || 0
    }
  });
}

/**
 * Reset usage for current period (useful for testing or granting extra analyses)
 */
export async function resetUsage(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const { installationId, reason } = await request.json();

  if (!installationId) {
    return jsonResponse({ error: 'Missing installationId' }, 400);
  }

  const subscription = await getSubscription(installationId, env);

  await env.DB.prepare(`
    UPDATE subscriptions
    SET
      analyses_used_current_period = 0,
      tokens_used_current_period = 0,
      overage_analyses = 0,
      overage_cost_usd = 0.0,
      updated_at = datetime('now')
    WHERE installation_id = ?
  `).bind(installationId).run();

  await logBillingEvent(
    installationId,
    'usage_reset',
    0,
    {
      previousUsage: subscription.analyses_used_current_period,
      reason: reason || 'Manual reset by admin'
    },
    env
  );

  return jsonResponse({
    success: true,
    message: `Usage reset for installation ${installationId}`,
    previousUsage: subscription.analyses_used_current_period
  });
}

/**
 * Get overall statistics
 */
export async function getStats(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  // Tier distribution
  const tierStats = await env.DB.prepare(`
    SELECT
      tier,
      COUNT(*) as count,
      SUM(analyses_used_current_period) as total_analyses
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY tier
  `).all();

  // Revenue estimate
  const revenueStats = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN tier = 'pro' THEN 29.0 ELSE 0 END) as monthly_revenue,
      SUM(overage_cost_usd) as overage_revenue
    FROM subscriptions
    WHERE status = 'active'
  `).first();

  // Recent activity
  const recentAnalyses = await env.DB.prepare(`
    SELECT COUNT(*) as count
    FROM analyses
    WHERE created_at >= date('now', '-7 days')
  `).first();

  return jsonResponse({
    tiers: tierStats.results,
    revenue: {
      monthlyRecurring: revenueStats.monthly_revenue || 0,
      overage: revenueStats.overage_revenue || 0,
      total: (revenueStats.monthly_revenue || 0) + (revenueStats.overage_revenue || 0)
    },
    activity: {
      analysesLast7Days: recentAnalyses.count
    }
  });
}

/**
 * List waitlist entries
 */
export async function listWaitlist(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  // Get waitlist entries
  const waitlist = await env.DB.prepare(`
    SELECT
      w.id,
      w.email,
      w.repository,
      w.created_at,
      i.installation_id,
      i.account_login,
      s.tier,
      s.status
    FROM waitlist w
    LEFT JOIN installations i ON LOWER(i.account_login) = LOWER(SUBSTR(w.email, 1, INSTR(w.email, '@') - 1))
      OR i.account_login IN (
        SELECT account_login FROM installations WHERE installation_id IN (
          SELECT installation_id FROM repositories WHERE owner = LOWER(SUBSTR(w.email, 1, INSTR(w.email, '@') - 1))
        )
      )
    LEFT JOIN subscriptions s ON i.installation_id = s.installation_id
    ORDER BY w.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();

  // Get total count
  const countResult = await env.DB.prepare(
    'SELECT COUNT(*) as total FROM waitlist'
  ).first();

  return jsonResponse({
    waitlist: waitlist.results,
    pagination: {
      total: countResult.total,
      limit,
      offset,
      hasMore: offset + limit < countResult.total
    }
  });
}

/**
 * Search installations by account name or login
 */
export async function searchInstallations(request, env) {
  const auth = verifyAdminAuth(request, env);
  if (!auth.authorized) {
    return jsonResponse({ error: auth.error }, 401);
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');

  if (!query || query.length < 2) {
    return jsonResponse({
      error: 'Search query too short. Minimum 2 characters required.'
    }, 400);
  }

  // Search installations by account_login
  const installations = await env.DB.prepare(`
    SELECT
      i.installation_id,
      i.account_login,
      i.account_type,
      i.is_active,
      i.created_at,
      s.tier,
      s.status as subscription_status,
      s.analyses_used_current_period,
      s.analyses_limit_monthly,
      COUNT(DISTINCT r.id) as repository_count
    FROM installations i
    LEFT JOIN subscriptions s ON i.installation_id = s.installation_id
    LEFT JOIN repositories r ON i.installation_id = r.installation_id
    WHERE LOWER(i.account_login) LIKE LOWER(?)
    GROUP BY i.installation_id
    ORDER BY i.created_at DESC
    LIMIT ?
  `).bind(`%${query}%`, limit).all();

  return jsonResponse({
    query,
    results: installations.results,
    count: installations.results.length
  });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
