import { analyzeFailure } from './analyzer.js';
import { getInstallationToken, getWorkflowJobs, getJobLogs, postPRComment, formatPRComment } from './github.js';
import { canAnalyze, recordUsage, getSubscription, getTierConfig } from './subscription.js';
import { handleStripeWebhook, createCheckoutSession, createPortalSession } from './stripe.js';
import { listSubscriptions, grantSubscription, updateSubscriptionStatus, getSubscriptionDetails, resetUsage, getStats, listWaitlist } from './admin.js';

/**
 * FixCI GitHub App - Webhook Handler
 * Receives workflow_run.completed events from GitHub
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Stripe webhook endpoint
    if (url.pathname === '/stripe/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    // Billing checkout endpoint
    if (url.pathname === '/billing/checkout' && request.method === 'POST') {
      const { installationId, tier } = await request.json();
      const session = await createCheckoutSession(installationId, tier, env);
      return jsonResponse({ url: session.url });
    }

    // Billing portal endpoint
    if (url.pathname === '/billing/portal' && request.method === 'POST') {
      const { installationId } = await request.json();
      const session = await createPortalSession(installationId, env);
      return jsonResponse({ url: session.url });
    }

    // API: Get subscription details
    if (url.pathname === '/api/subscription' && request.method === 'GET') {
      const installationId = url.searchParams.get('installation_id');
      if (!installationId) {
        return jsonResponse({ error: 'Missing installation_id parameter' }, 400);
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
      const installationId = url.searchParams.get('installation_id');
      const days = parseInt(url.searchParams.get('days') || '30');

      if (!installationId) {
        return jsonResponse({ error: 'Missing installation_id parameter' }, 400);
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

    // Admin API: Get overall statistics
    if (url.pathname === '/admin/stats' && request.method === 'GET') {
      return getStats(request, env);
    }

    // Admin API: List waitlist entries
    if (url.pathname === '/admin/waitlist' && request.method === 'GET') {
      return listWaitlist(request, env);
    }

    // API endpoint to check analysis status
    // This endpoint contains an intentional bug for testing FixCI
    if (url.pathname === '/api/analysis/status' && request.method === 'GET') {
      const analysisId = url.searchParams.get('id');

      if (!analysisId) {
        return jsonResponse({ error: 'Missing analysis ID' }, 400);
      }

      // Fetch analysis from database
      const analysis = await env.DB.prepare(
        'SELECT * FROM analyses WHERE id = ?'
      ).bind(analysisId).first();

      if (!analysis) {
        return jsonResponse({ error: 'Analysis not found' }, 404);
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
    // Verify GitHub webhook signature
    const signature = request.headers.get('x-hub-signature-256');
    const event = request.headers.get('x-github-event');
    const delivery = request.headers.get('x-github-delivery');

    if (!signature || !event) {
      return new Response('Missing headers', { status: 400 });
    }

    const payload = await request.text();

    // Verify signature
    if (env.GITHUB_WEBHOOK_SECRET) {
      const isValid = await verifySignature(payload, signature, env.GITHUB_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const data = JSON.parse(payload);

    console.log(`Received ${event} event (delivery: ${delivery})`);

    // Handle different event types
    switch (event) {
      case 'workflow_run':
        return await handleWorkflowRun(data, env, ctx);

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

      // Extract the last 3000 characters (most recent errors) to stay within AI token limits
      logsToAnalyze = fullLogs.slice(-3000);
      console.log(`Analyzing ${logsToAnalyze.length} characters of actual logs`);
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

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
