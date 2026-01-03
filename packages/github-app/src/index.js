import { analyzeFailure } from './analyzer.js';
import { getInstallationToken, getWorkflowJobs, getJobLogs, postPRComment, formatPRComment } from './github.js';
import { canAnalyze, recordUsage, getSubscription, getTierConfig } from './subscription.js';
import { handleStripeWebhook, createCheckoutSession, createPortalSession } from './stripe.js';
import { listSubscriptions, grantSubscription, updateSubscriptionStatus, getSubscriptionDetails, resetUsage, getStats, listWaitlist, searchInstallations, revokeSubscription, getInstallationMembers, listInstallations } from './admin.js';
import { sendLoginLink, verifyToken, verifySession, logout } from './auth.js';
import { checkRateLimit, getClientIP, rateLimitResponse } from './ratelimit.js';
import { validateInput, validationSchemas, validationErrorResponse } from './validation.js';
import { reviewPullRequest } from './pr-review.js';

/**
 * FixCI GitHub App - Webhook Handler
 * Receives workflow_run.completed events from GitHub
 */

/**
 * SECURITY: Allowed origins for CORS
 * Only these domains can make authenticated requests to the API
 */
const ALLOWED_ORIGINS = [
  'https://fixci.dev',
  'https://www.fixci.dev',
  'https://dashboard.fixci.dev',
  'http://localhost:8080',  // Local development
  'http://127.0.0.1:8080'   // Local development
];

/**
 * Get CORS headers with origin validation
 * @param {Request} request - The incoming request
 * @returns {Object} CORS headers with validated origin
 */
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');

  // Check if origin is in allowed list
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default to main domain

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true', // Required for httpOnly cookies
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCorsHeaders(request)
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', {
        status: 200,
        headers: getCorsHeaders(request)
      });
    }

    // Stripe webhook endpoint
    if (url.pathname === '/stripe/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Billing checkout endpoint
    if (url.pathname === '/billing/checkout' && request.method === 'POST') {
      // SECURITY: Require authentication
      const auth = await verifySession(request, env);
      if (!auth.authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, 401, request);
      }

      // SECURITY: Rate limit billing operations (5 per hour per user)
      const rateLimit = await checkRateLimit(`billing:${auth.user.id}`, 5, 3600, env);
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetAt);
      }

      // SECURITY: Validate and sanitize input
      const body = await request.json();
      const validation = validateInput(body, validationSchemas.billingCheckout);

      if (!validation.success) {
        return validationErrorResponse(validation.errors, request);
      }

      const { installationId, tier } = validation.data;

      // SECURITY: Verify user has access to this installation
      const hasAccess = await env.DB.prepare(`
        SELECT 1 FROM installation_members
        WHERE user_id = ? AND installation_id = ?
      `).bind(auth.user.id, installationId).first();

      if (!hasAccess) {
        return jsonResponse({ error: 'Forbidden: No access to this installation' }, 403, request);
      }

      const session = await createCheckoutSession(installationId, tier, env);
      return jsonResponse({ url: session.url }, 200, request);
    }

    // Billing portal endpoint
    if (url.pathname === '/billing/portal' && request.method === 'POST') {
      // SECURITY: Require authentication
      const auth = await verifySession(request, env);
      if (!auth.authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, 401, request);
      }

      // SECURITY: Rate limit billing operations (10 per hour per user)
      const rateLimit = await checkRateLimit(`billing-portal:${auth.user.id}`, 10, 3600, env);
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetAt);
      }

      // SECURITY: Validate and sanitize input
      const body = await request.json();
      const validation = validateInput(body, validationSchemas.billingPortal);

      if (!validation.success) {
        return validationErrorResponse(validation.errors, request);
      }

      const { installationId } = validation.data;

      // SECURITY: Verify user has access to this installation
      const hasAccess = await env.DB.prepare(`
        SELECT 1 FROM installation_members
        WHERE user_id = ? AND installation_id = ?
      `).bind(auth.user.id, installationId).first();

      if (!hasAccess) {
        return jsonResponse({ error: 'Forbidden: No access to this installation' }, 403, request);
      }

      const session = await createPortalSession(installationId, env);
      return jsonResponse({ url: session.url }, 200, request);
    }

    // API: Get subscription details
    if (url.pathname === '/api/subscription' && request.method === 'GET') {
      // SECURITY: Require authentication
      const auth = await verifySession(request, env);
      if (!auth.authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const installationId = url.searchParams.get('installation_id');
      if (!installationId) {
        return jsonResponse({ error: 'Missing installation_id parameter' }, 400);
      }

      // SECURITY: Verify user has access to this installation
      const hasAccess = await env.DB.prepare(`
        SELECT 1 FROM installation_members
        WHERE user_id = ? AND installation_id = ?
      `).bind(auth.user.id, parseInt(installationId)).first();

      if (!hasAccess) {
        return jsonResponse({ error: 'Forbidden: No access to this installation' }, 403);
      }

      const subscription = await getSubscription(parseInt(installationId), env);
      const tierConfig = await getTierConfig(subscription.tier, env);

      return jsonResponse({
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          analysesLimit: subscription.analyses_limit_monthly,
          analysesUsed: subscription.analyses_used_current_period,
          analysesRemaining: subscription.analyses_limit_monthly
            ? subscription.analyses_limit_monthly - subscription.analyses_used_current_period
            : null,
          tokensUsed: subscription.tokens_used_current_period,
          periodStart: subscription.current_period_start,
          periodEnd: subscription.current_period_end,
          overageAnalyses: subscription.overage_analyses || 0,
          overageCost: subscription.overage_cost_usd || 0,
        },
        tierConfig: {
          tier: tierConfig.tier,
          price: tierConfig.price_monthly_usd,
          features: tierConfig.features,
          aiProviders: tierConfig.ai_providers,
        }
      });
    }

    // API: Get usage history
    if (url.pathname === '/api/usage/history' && request.method === 'GET') {
      // SECURITY: Require authentication
      const auth = await verifySession(request, env);
      if (!auth.authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const installationId = url.searchParams.get('installation_id');
      const days = parseInt(url.searchParams.get('days') || '30');

      if (!installationId) {
        return jsonResponse({ error: 'Missing installation_id parameter' }, 400);
      }

      // SECURITY: Verify user has access to this installation
      const hasAccess = await env.DB.prepare(`
        SELECT 1 FROM installation_members
        WHERE user_id = ? AND installation_id = ?
      `).bind(auth.user.id, parseInt(installationId)).first();

      if (!hasAccess) {
        return jsonResponse({ error: 'Forbidden: No access to this installation' }, 403);
      }

      // Get daily usage stats
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const history = await env.DB.prepare(`
        SELECT
          date,
          SUM(analyses_count) as analyses,
          SUM(tokens_used) as tokens,
          SUM(api_calls) as api_calls
        FROM usage_stats
        WHERE repo_id IN (
          SELECT id FROM repositories WHERE github_repo_id IN (
            SELECT github_repo_id FROM repositories r
            JOIN installations i ON r.owner = i.account_login
            WHERE i.installation_id = ?
          )
        )
        AND date >= ?
        GROUP BY date
        ORDER BY date DESC
      `).bind(parseInt(installationId), sinceStr).all();

      // Get recent analyses
      const recentAnalyses = await env.DB.prepare(`
        SELECT
          a.id,
          a.workflow_name,
          a.commit_sha,
          a.branch,
          a.analysis_status,
          a.ai_provider,
          a.model_used,
          a.confidence_score,
          a.processing_time_ms,
          a.token_count,
          a.estimated_cost_usd,
          a.created_at,
          r.full_name as repository
        FROM analyses a
        JOIN repositories r ON a.repo_id = r.id
        JOIN installations i ON r.owner = i.account_login
        WHERE i.installation_id = ?
        AND a.created_at >= ?
        ORDER BY a.created_at DESC
        LIMIT 20
      `).bind(parseInt(installationId), sinceStr).all();

      return jsonResponse({
        dailyUsage: history.results,
        recentAnalyses: recentAnalyses.results,
        period: {
          from: sinceStr,
          to: new Date().toISOString().split('T')[0],
          days
        }
      });
    }

    // Admin API: List all subscriptions
    if (url.pathname === '/admin/subscriptions' && request.method === 'GET') {
      return listSubscriptions(request, env);
    }

    // Admin API: Grant or change subscription tier
    if (url.pathname === '/admin/subscriptions/grant' && request.method === 'POST') {
      return grantSubscription(request, env);
    }

    // Admin API: Update subscription status (suspend/activate)
    if (url.pathname === '/admin/subscriptions/status' && request.method === 'POST') {
      return updateSubscriptionStatus(request, env);
    }

    // Admin API: Get detailed subscription info
    if (url.pathname === '/admin/subscriptions/details' && request.method === 'GET') {
      return getSubscriptionDetails(request, env);
    }

    // Admin API: Reset usage for an installation
    if (url.pathname === '/admin/subscriptions/reset-usage' && request.method === 'POST') {
      return resetUsage(request, env);
    }

    // Admin API: Revoke/deny subscription access
    if (url.pathname === '/admin/subscriptions/revoke' && request.method === 'POST') {
      return revokeSubscription(request, env);
    }

    // Admin API: Get overall statistics
    if (url.pathname === '/admin/stats' && request.method === 'GET') {
      return getStats(request, env);
    }

    // Admin API: List waitlist entries
    if (url.pathname === '/admin/waitlist' && request.method === 'GET') {
      return listWaitlist(request, env);
    }

    // Admin API: List all installations
    if (url.pathname === '/admin/installations' && request.method === 'GET') {
      return listInstallations(request, env);
    }

    // Admin API: Search installations by name/organization
    if (url.pathname === '/admin/installations/search' && request.method === 'GET') {
      return searchInstallations(request, env);
    }

    // Admin API: Get installation members
    if (url.pathname.startsWith('/admin/installations/') && url.pathname.endsWith('/members') && request.method === 'GET') {
      const installationId = url.pathname.split('/')[3];
      return getInstallationMembers(request, env, installationId);
    }

    // API: Complete setup - send magic link after installation
    if (url.pathname === '/api/complete-setup' && request.method === 'POST') {
      const { installationId, email, company } = await request.json();

      if (!installationId || !email) {
        return jsonResponse({ error: 'Missing installationId or email' }, 400);
      }

      // Update installation with contact info immediately
      await env.DB.prepare(`
        UPDATE installations
        SET contact_email = ?, company_name = ?
        WHERE installation_id = ?
      `).bind(email, company || null, installationId).run();

      // Send magic link with installation metadata
      // User account and installation_member relationship will be created
      // when they verify the email (in auth.js verifyToken)
      try {
        await sendLoginLink(email, env, {
          installationId: installationId.toString(),
          company: company || null
        });

        return jsonResponse({
          success: true,
          message: 'Check your email for a login link to access your dashboard'
        });
      } catch (error) {
        console.error('Failed to send magic link:', error);
        return jsonResponse({
          error: 'Failed to send login link. Please try again.'
        }, 500);
      }
    }

    // Auth: Send magic link login email
    if (url.pathname === '/auth/login' && request.method === 'POST') {
      const { email, installationId, company } = await request.json();

      if (!email || !email.includes('@')) {
        return jsonResponse({ error: 'Valid email required' }, 400);
      }

      // SECURITY: Rate limit login attempts (3 per 15 minutes per email)
      const rateLimit = await checkRateLimit(`login:${email}`, 3, 900, env);
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetAt);
      }

      try {
        // Pass installation metadata if provided (from setup flow)
        const metadata = {};
        if (installationId) metadata.installationId = installationId;
        if (company) metadata.company = company;

        const result = await sendLoginLink(email, env, metadata);
        return jsonResponse(result);
      } catch (err) {
        console.error('Login error:', err);
        return jsonResponse({
          error: 'Failed to send login link',
          details: err.message,
          stack: err.stack
        }, 500);
      }
    }

    // Auth: Verify magic link token (GET for email compatibility)
    if (url.pathname === '/auth/verify' && request.method === 'GET') {
      const token = url.searchParams.get('token');

      if (!token) {
        return jsonResponse({ error: 'Token required' }, 400, request);
      }

      // SECURITY: Rate limit verification attempts (10 per 15 minutes per IP)
      const clientIP = getClientIP(request);
      const rateLimit = await checkRateLimit(`verify:${clientIP}`, 10, 900, env);
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetAt);
      }

      const result = await verifyToken(token, env);

      if (!result.valid) {
        return jsonResponse({ error: result.error }, 401, request);
      }

      // SECURITY: Set session in httpOnly cookie (not accessible to JavaScript)
      const cookieValue = `session=${result.sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`; // 30 days

      const response = jsonResponse({
        success: true,
        user: result.user
        // sessionToken removed - now in httpOnly cookie
      }, 200, request);

      response.headers.set('Set-Cookie', cookieValue);

      return response;
    }

    // Auth: Verify magic link token (POST - more secure alternative)
    if (url.pathname === '/auth/verify' && request.method === 'POST') {
      const body = await request.json();
      const token = body.token;

      if (!token) {
        return jsonResponse({ error: 'Token required' }, 400, request);
      }

      // SECURITY: Rate limit verification attempts (10 per 15 minutes per IP)
      const clientIP = getClientIP(request);
      const rateLimit = await checkRateLimit(`verify:${clientIP}`, 10, 900, env);
      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.resetAt);
      }

      const result = await verifyToken(token, env);

      if (!result.valid) {
        return jsonResponse({ error: result.error }, 401, request);
      }

      // SECURITY: Set session in httpOnly cookie
      const cookieValue = `session=${result.sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`; // 30 days

      const response = jsonResponse({
        success: true,
        user: result.user
      }, 200, request);

      response.headers.set('Set-Cookie', cookieValue);

      return response;
    }

    // Auth: Logout
    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      // Get token from cookie or Authorization header
      let token = null;

      const cookie = request.headers.get('Cookie');
      if (cookie) {
        const match = cookie.match(/session=([^;]+)/);
        if (match) token = match[1];
      }

      // Fallback to Authorization header for backward compatibility
      if (!token) {
        const authHeader = request.headers.get('Authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (token) {
        await logout(token, env);
      }

      // Clear cookie
      const response = jsonResponse({ success: true }, 200, request);
      response.headers.set('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');

      return response;
    }

    // API: Get current user info and installations
    if (url.pathname === '/api/me' && request.method === 'GET') {
      const auth = await verifySession(request, env);

      if (!auth.authenticated) {
        return jsonResponse({ error: auth.error }, 401);
      }

      // Get user's installations with subscription info
      const installations = await env.DB.prepare(`
        SELECT
          i.*,
          im.role,
          s.tier,
          s.status as subscription_status,
          s.analyses_used_current_period,
          s.analyses_limit_monthly,
          COUNT(DISTINCT r.id) as repository_count,
          GROUP_CONCAT(DISTINCT r.full_name) as repositories
        FROM installation_members im
        JOIN installations i ON im.installation_id = i.installation_id
        LEFT JOIN subscriptions s ON i.installation_id = s.installation_id
        LEFT JOIN repositories r ON i.installation_id = r.installation_id
        WHERE im.user_id = ?
        GROUP BY i.installation_id
        ORDER BY im.created_at DESC
      `).bind(auth.user.id).all();

      return jsonResponse({
        user: auth.user,
        installations: installations.results
      });
    }

    // API endpoint to check analysis status
    // This endpoint contains an intentional bug for testing FixCI
    if (url.pathname === '/api/analysis/status' && request.method === 'GET') {
      // SECURITY: Require authentication
      const auth = await verifySession(request, env);
      if (!auth.authenticated) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      const analysisId = url.searchParams.get('id');

      if (!analysisId) {
        return jsonResponse({ error: 'Missing analysis ID' }, 400);
      }

      // Fetch analysis from database and verify access
      const analysis = await env.DB.prepare(`
        SELECT a.* FROM analyses a
        JOIN repositories r ON a.repo_id = r.id
        JOIN installations i ON r.installation_id = i.installation_id
        JOIN installation_members im ON i.installation_id = im.installation_id
        WHERE a.id = ? AND im.user_id = ?
      `).bind(analysisId, auth.user.id).first();

      if (!analysis) {
        return jsonResponse({ error: 'Analysis not found or access denied' }, 404);
      }

      // Common bug: typo in variable name (analyis instead of analysis)
      return jsonResponse({
        id: analyis.id,
        status: analysis.analysis_status,
        workflow: analysis.workflow_name,
        createdAt: analysis.created_at
      });
    }

    // GitHub webhook endpoint
    if (url.pathname === '/webhook' && request.method === 'POST') {
      return handleWebhook(request, env, ctx);
    }

    return new Response('FixCI GitHub App', { status: 200 });
  },
};

async function handleWebhook(request, env, ctx) {
  try {
    // SECURITY: Rate limit webhook endpoint (500 per minute per IP)
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(`webhook:${clientIP}`, 500, 60, env);
    if (!rateLimit.allowed) {
      console.warn(`Webhook rate limit exceeded for IP: ${clientIP}`);
      return rateLimitResponse(rateLimit.resetAt);
    }

    // Verify GitHub webhook signature
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    if (!signature || !event) {
      return new Response('Missing headers', { status: 400 });
    }

    // SECURITY: Prevent webhook replay attacks
    if (delivery) {
      const deliveryKey = `webhook-delivery:${delivery}`;
      const alreadyProcessed = await env.SESSIONS.get(deliveryKey);

      if (alreadyProcessed) {
        console.warn(`Duplicate webhook delivery: ${delivery}`);
        return new Response(JSON.stringify({ message: 'Webhook already processed' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Mark delivery as processed (expires in 24 hours)
      await env.SESSIONS.put(deliveryKey, Date.now().toString(), { expirationTtl: 86400 });
    }

    const payload = await request.text();

    // SECURITY: Verify GitHub webhook signature (MANDATORY)
    if (!env.GITHUB_WEBHOOK_SECRET) {
      console.error('GITHUB_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    const isValid = await verifySignature(payload, signature, env.GITHUB_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    const data = JSON.parse(payload);

    console.log(`Received ${event} event (delivery: ${delivery})`);

    // Handle different event types
    switch (event) {
      case 'workflow_run':
        return await handleWorkflowRun(data, env, ctx);

      case 'pull_request':
        return await handlePullRequest(data, env, ctx);

      case 'installation':
      case 'installation_repositories':
        return await handleInstallation(data, env);

      case 'ping':
        return jsonResponse({ message: 'pong' });

      default:
        console.log(`Unhandled event type: ${event}`);
        return jsonResponse({ message: 'Event received but not processed' });
    }
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

async function handleWorkflowRun(data, env, ctx) {
  const { action, workflow_run, repository, installation } = data;

  // Check subscription status and usage limits
  const installationId = installation?.id;
  if (!installationId) {
    return jsonResponse({ error: 'Missing installation ID' }, 400);
  }

  const usageCheck = await canAnalyze(installationId, env);
  if (!usageCheck.allowed) {
    console.log(`Analysis denied for installation ${installationId}: ${usageCheck.reason}`);

    return jsonResponse({
      message: usageCheck.reason,
      tier: usageCheck.subscription.tier,
      analysesUsed: usageCheck.subscription.analyses_used_current_period,
      analysesLimit: usageCheck.subscription.analyses_limit_monthly,
      upgradeUrl: 'https://fixci.dev/pricing'
    }, 403);
  }

  // Log if this is an overage analysis (Pro tier)
  if (usageCheck.isOverage) {
    console.log(`⚠️ Overage analysis for installation ${installationId} - will be charged`);
  }

  // Only process completed workflow runs that failed
  if (action !== 'completed' || workflow_run.conclusion === 'success') {
    return jsonResponse({ message: 'Workflow not failed, skipping' });
  }

  console.log(`Processing failed workflow: ${workflow_run.name} in ${repository.full_name}`);

  try {
    // Get or create repository record
    const repo = await getOrCreateRepository(repository, env);

    // Get PR number if this workflow was triggered by a PR
    const prNumber = workflow_run.pull_requests?.[0]?.number || null;

    // Check for duplicate - prevent processing same workflow_run twice
    const existing = await env.DB.prepare(
      'SELECT id FROM analyses WHERE workflow_run_id = ?'
    ).bind(workflow_run.id).first();

    if (existing) {
      console.log(`Analysis already exists for workflow_run ${workflow_run.id}, skipping`);
      return jsonResponse({
        message: 'Analysis already exists',
        analysisId: existing.id
      });
    }

    // Create analysis record
    const analysisId = await env.DB.prepare(`
      INSERT INTO analyses (
        repo_id,
        workflow_run_id,
        workflow_name,
        commit_sha,
        branch,
        pull_request_number,
        log_url,
        analysis_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(
      repo.id,
      workflow_run.id,
      workflow_run.name,
      workflow_run.head_sha,
      workflow_run.head_branch,
      prNumber,
      workflow_run.logs_url
    ).run();

    console.log(`Created analysis record: ${analysisId.meta.last_row_id}`);

    // Get installation ID from payload or use the app installation ID
    const installationId = data.installation?.id;

    console.log(`PR: ${prNumber}, Installation: ${installationId}`);

    // Process analysis immediately (queue not available on free plan)
    if (prNumber && installationId) {
      // Run analysis asynchronously without blocking webhook response
      ctx.waitUntil(
        processAnalysis(
          analysisId.meta.last_row_id,
          workflow_run,
          repository,
          prNumber,
          installationId,
          env
        )
      );
    } else {
      console.log(`Skipping analysis - PR: ${prNumber}, Installation: ${installationId}`);
    }

    return jsonResponse({
      message: 'Workflow failure recorded',
      analysisId: analysisId.meta.last_row_id
    });
  } catch (error) {
    console.error('Error processing workflow run:', error);
    return jsonResponse({ error: 'Failed to process workflow' }, 500);
  }
}

async function getOrCreateRepository(repository, env) {
  // Check if repository exists
  const existing = await env.DB.prepare(
    'SELECT * FROM repositories WHERE github_repo_id = ?'
  ).bind(repository.id).first();

  if (existing) {
    return existing;
  }

  // Create new repository record
  const result = await env.DB.prepare(`
    INSERT INTO repositories (
      github_repo_id,
      owner,
      name,
      full_name
    ) VALUES (?, ?, ?, ?)
  `).bind(
    repository.id,
    repository.owner.login,
    repository.name,
    repository.full_name
  ).run();

  return {
    id: result.meta.last_row_id,
    github_repo_id: repository.id,
    owner: repository.owner.login,
    name: repository.name,
    full_name: repository.full_name
  };
}

async function handlePullRequest(data, env, ctx) {
  const { action, pull_request, repository, installation } = data;

  console.log(`PR ${action}: #${pull_request.number} in ${repository.full_name}`);

  // Only review on opened, synchronize (new commits)
  if (!['opened', 'synchronize'].includes(action)) {
    return jsonResponse({ message: 'PR event received but not reviewed' });
  }

  try {
    const installationId = installation?.id;

    if (!installationId) {
      console.error('No installation ID in PR webhook');
      return jsonResponse({ error: 'No installation ID' }, 400);
    }

    // Run PR review asynchronously
    ctx.waitUntil(
      reviewPullRequest(pull_request, repository, installationId, env)
    );

    return jsonResponse({
      message: 'PR review started',
      prNumber: pull_request.number
    });
  } catch (error) {
    console.error('Error handling PR:', error);
    return jsonResponse({ error: 'Failed to process PR' }, 500);
  }
}

async function handleInstallation(data, env) {
  const { action, installation } = data;

  console.log(`Installation ${action}: ${installation.account.login}`);

  try {
    if (action === 'created') {
      // Store installation
      await env.DB.prepare(`
        INSERT INTO installations (
          installation_id,
          account_type,
          account_login,
          target_id,
          permissions,
          events
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        installation.id,
        installation.account.type,
        installation.account.login,
        installation.target_id,
        JSON.stringify(installation.permissions),
        JSON.stringify(installation.events)
      ).run();
    } else if (action === 'deleted') {
      // Mark installation as inactive
      await env.DB.prepare(
        'UPDATE installations SET is_active = 0 WHERE installation_id = ?'
      ).bind(installation.id).run();
    }

    return jsonResponse({ message: `Installation ${action} processed` });
  } catch (error) {
    console.error('Error handling installation:', error);
    return jsonResponse({ error: 'Failed to process installation' }, 500);
  }
}

async function verifySignature(payload, signature, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  const expectedSignature = 'sha256=' + Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return signature === expectedSignature;
}

/**
 * Extract logs from failed steps only, ignoring successful setup steps
 * GitHub Actions logs use ##[group] markers to separate steps
 */
function extractFailedStepLogs(fullLogs, failedSteps) {
  if (!failedSteps || failedSteps.length === 0) {
    // No step info, fall back to last 3000 chars
    return fullLogs.slice(-3000);
  }

  const failedStepNames = failedSteps.map(s => s.name);
  const extractedLogs = [];

  // GitHub Actions logs format: ##[group]Run step-name ... ##[endgroup]
  // Split by groups and find matching failed steps
  const groupPattern = /##\[group\]([^\n]+)\n([\s\S]*?)(?=##\[(?:endgroup|group)]|$)/g;
  let match;

  while ((match = groupPattern.exec(fullLogs)) !== null) {
    const stepHeader = match[1];
    const stepContent = match[2];

    // Check if this group matches any failed step name
    const isFailedStep = failedStepNames.some(name =>
      stepHeader.includes(name) || stepHeader.includes(`Run ${name}`)
    );

    if (isFailedStep) {
      extractedLogs.push(`### ${stepHeader}\n${stepContent.trim()}`);
    }
  }

  if (extractedLogs.length > 0) {
    const combined = extractedLogs.join('\n\n');
    // Limit to 10k chars to stay within token limits but get more context than before
    return combined.length > 10000 ? combined.slice(-10000) : combined;
  }

  // Fallback: if regex didn't match, look for error keywords in last 10k
  const tailLogs = fullLogs.slice(-10000);
  const errorLines = tailLogs.split('\n').filter(line =>
    line.includes('error') ||
    line.includes('Error') ||
    line.includes('ERROR') ||
    line.includes('failed') ||
    line.includes('Failed') ||
    line.includes('FAILED') ||
    line.includes('##[error]')
  );

  if (errorLines.length > 0) {
    // Get context around errors (50 lines before/after each error)
    const contextSize = 50;
    const lines = tailLogs.split('\n');
    const relevantIndices = new Set();

    errorLines.forEach(errorLine => {
      const idx = lines.indexOf(errorLine);
      if (idx !== -1) {
        for (let i = Math.max(0, idx - contextSize); i < Math.min(lines.length, idx + contextSize); i++) {
          relevantIndices.add(i);
        }
      }
    });

    const contextLogs = Array.from(relevantIndices).sort((a, b) => a - b).map(i => lines[i]).join('\n');
    return contextLogs.length > 10000 ? contextLogs.slice(-10000) : contextLogs;
  }

  // Last resort: just take the last 10k
  return fullLogs.slice(-10000);
}

async function processAnalysis(analysisId, workflowRun, repository, prNumber, installationId, env) {
  const startTime = Date.now();

  try {
    console.log(`Starting analysis ${analysisId} for workflow ${workflowRun.name}`);

    // Update status to processing
    await env.DB.prepare(
      'UPDATE analyses SET analysis_status = ? WHERE id = ?'
    ).bind('processing', analysisId).run();

    // Get installation token for GitHub API access
    const token = await getInstallationToken(installationId, env);

    // Fetch workflow jobs to get logs
    const jobs = await getWorkflowJobs(
      repository.owner.login,
      repository.name,
      workflowRun.id,
      token
    );

    // Find the failed job
    const failedJob = jobs.jobs.find(job => job.conclusion === 'failure');
    if (!failedJob) {
      throw new Error('No failed job found');
    }

    console.log(`Fetching logs for failed job: ${failedJob.name} (ID: ${failedJob.id})`);

    // Try to fetch actual job logs (may fail if app doesn't have permissions)
    let logsToAnalyze;
    try {
      const fullLogs = await getJobLogs(
        repository.owner.login,
        repository.name,
        failedJob.id,
        token
      );

      // Extract only the failed step's logs
      const failedSteps = failedJob.steps.filter(step => step.conclusion === 'failure');
      logsToAnalyze = extractFailedStepLogs(fullLogs, failedSteps);
      console.log(`Analyzing ${logsToAnalyze.length} characters from failed step(s)`);
    } catch (logError) {
      console.warn(`Failed to fetch logs (${logError.message}), using step info instead`);

      // Fallback: use step information
      const failedSteps = failedJob.steps.filter(step => step.conclusion === 'failure');
      const stepInfo = failedSteps.map(step =>
        `Step: ${step.name}\nNumber: ${step.number}\nConclusion: ${step.conclusion}`
      ).join('\n\n');

      logsToAnalyze = `Job: ${failedJob.name}\nConclusion: ${failedJob.conclusion}\n\nFailed Steps:\n${stepInfo}`;
      console.log(`Using step information for analysis`);
    }

    // Get subscription tier for provider selection
    const subscription = await getSubscription(installationId, env);

    // Analyze the failure with AI
    const analysis = await analyzeFailure(logsToAnalyze, {
      workflowName: workflowRun.name,
      jobName: failedJob.name,
      errorMessage: null
    }, env, subscription.tier);

    // Update analysis record
    await env.DB.prepare(`
      UPDATE analyses SET
        analysis_status = ?,
        ai_provider = ?,
        model_used = ?,
        issue_summary = ?,
        root_cause = ?,
        suggested_fix = ?,
        code_example = ?,
        confidence_score = ?,
        processing_time_ms = ?,
        token_count = ?,
        input_tokens = ?,
        output_tokens = ?,
        estimated_cost_usd = ?,
        analyzed_at = datetime('now')
      WHERE id = ?
    `).bind(
      'completed',
      analysis.ai_provider,
      analysis.model_used,
      analysis.issue_summary,
      analysis.root_cause,
      analysis.suggested_fix,
      analysis.code_example,
      analysis.confidence_score,
      analysis.processing_time_ms,
      analysis.token_count,
      analysis.input_tokens,
      analysis.output_tokens,
      analysis.estimated_cost_usd,
      analysisId
    ).run();

    // Record usage for billing and tracking
    await recordUsage(
      installationId,
      analysisId,
      analysis.input_tokens + analysis.output_tokens,
      analysis.estimated_cost_usd,
      env
    );

    // Get updated subscription info for PR comment
    const updatedSubscription = await getSubscription(installationId, env);

    // Post comment to PR
    const comment = formatPRComment(analysis, updatedSubscription);
    await postPRComment(
      repository.owner.login,
      repository.name,
      prNumber,
      comment,
      token
    );

    // Update posted_at timestamp
    await env.DB.prepare(
      "UPDATE analyses SET posted_at = datetime('now') WHERE id = ?"
    ).bind(analysisId).run();

    const elapsed = Date.now() - startTime;
    console.log(`Analysis ${analysisId} completed and posted in ${elapsed}ms`);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`Analysis ${analysisId} failed after ${elapsed}ms:`, error.message);
    console.error('Error stack:', error.stack);

    // Update status to failed with error details
    try {
      await env.DB.prepare(`
        UPDATE analyses SET
          analysis_status = ?,
          error_log = ?
        WHERE id = ?
      `).bind('failed', `${error.message}\n\nStack: ${error.stack}`, analysisId).run();
    } catch (dbError) {
      console.error(`Failed to update error status for analysis ${analysisId}:`, dbError);
    }
  }
}

function jsonResponse(data, status = 200, request = null) {
  const corsHeaders = request ? getCorsHeaders(request) : {
    // Fallback for backward compatibility - default to main domain only
    'Access-Control-Allow-Origin': 'https://fixci.dev',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}
