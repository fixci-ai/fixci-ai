/**
 * Multi-Provider CI/CD Failure Analyzer
 * Supports Cloudflare AI, Claude, OpenAI, and Gemini
 */

import { analyzeWithCloudflare } from './providers/cloudflare.js';
import { analyzeWithClaude } from './providers/claude.js';
import { analyzeWithOpenAI } from './providers/openai.js';
import { analyzeWithGemini } from './providers/gemini.js';
import { getTierConfig } from './subscription.js';

// Provider rotation counter (stored in global scope for round-robin)
let providerIndex = 0;

/**
 * Analyze CI/CD failure logs using configured AI providers
 * Selects provider based on subscription tier
 */
export async function analyzeFailure(logs, context, env, tier = 'free') {
  const availableProviders = getAvailableProviders(env);
  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set at least one API key.');
  }

  const eligibleProviders = await getEligibleProviders(availableProviders, tier, env);
  const providerOrder = buildProviderOrder(eligibleProviders);

  let lastError = null;
  for (const provider of providerOrder) {
    console.log(`Analyzing with provider: ${provider} (tier: ${tier})`);

    try {
      let result;

      switch (provider) {
        case 'cloudflare':
          result = await analyzeWithCloudflare(logs, context, env);
          break;
        case 'claude':
          result = await analyzeWithClaude(logs, context, env);
          break;
        case 'openai':
          result = await analyzeWithOpenAI(logs, context, env);
          break;
        case 'gemini':
          result = await analyzeWithGemini(logs, context, env);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      return {
        ai_provider: result.provider,
        model_used: result.model,
        issue_summary: result.analysis.summary,
        root_cause: result.analysis.rootCause,
        suggested_fix: result.analysis.fix,
        code_example: result.analysis.codeExample,
        confidence_score: result.analysis.confidence,
        processing_time_ms: result.processingTime,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        token_count: result.totalTokens,
        estimated_cost_usd: result.estimatedCost,
      };
    } catch (error) {
      lastError = error;
      console.error(`Analysis with ${provider} failed:`, error);
    }
  }

  throw lastError;
}

/**
 * Get list of available providers based on configured API keys
 */
function getAvailableProviders(env) {
  const providers = [];

  // Cloudflare AI (via AI binding)
  if (env.AI) {
    providers.push('cloudflare');
  }

  // Claude (Anthropic)
  if (env.ANTHROPIC_API_KEY) {
    providers.push('claude');
  }

  // OpenAI
  if (env.OPENAI_API_KEY) {
    providers.push('openai');
  }

  // Google Gemini
  if (env.GOOGLE_API_KEY) {
    providers.push('gemini');
  }

  return providers;
}

/**
 * Select provider based on subscription tier
 * - Free tier: Cloudflare AI or Gemini (cheapest)
 * - Pro tier: Claude or OpenAI (best quality)
 * - Enterprise: Intelligent selection based on complexity
 */
async function selectProvider(availableProviders, tier, env) {
  // Get tier configuration to see which providers are allowed
  const tierConfig = await getTierConfig(tier, env);
  const allowedProviders = tierConfig.ai_providers;

  // Filter available providers by tier permissions
  let eligibleProviders = availableProviders;
  if (!allowedProviders.includes('all')) {
    eligibleProviders = availableProviders.filter(p => allowedProviders.includes(p));
  }

  if (eligibleProviders.length === 0) {
    console.warn(`No eligible providers for tier ${tier}, falling back to all available`);
    eligibleProviders = availableProviders;
  }

  // Selection strategy: respect tier configuration order
  // The tier config defines provider priority, so return first available
  for (const provider of allowedProviders) {
    if (provider === 'all') {
      // Enterprise tier with 'all' - use round-robin
      const selected = eligibleProviders[providerIndex % eligibleProviders.length];
      providerIndex++;
      return selected;
    }
    if (eligibleProviders.includes(provider)) {
      return provider;
    }
  }

  // Fallback to first eligible provider
  return eligibleProviders[0];
}

async function getEligibleProviders(availableProviders, tier, env) {
  const tierConfig = await getTierConfig(tier, env);
  const allowedProviders = tierConfig.ai_providers;

  let eligibleProviders = availableProviders;
  if (!allowedProviders.includes('all')) {
    eligibleProviders = availableProviders.filter(p => allowedProviders.includes(p));
  }

  if (eligibleProviders.length === 0) {
    console.warn(`No eligible providers for tier ${tier}, falling back to all available`);
    eligibleProviders = availableProviders;
  }

  if (!allowedProviders.includes('all')) {
    const ordered = [];
    for (const provider of allowedProviders) {
      if (eligibleProviders.includes(provider)) {
        ordered.push(provider);
      }
    }
    return ordered.length ? ordered : eligibleProviders;
  }

  return eligibleProviders;
}

function buildProviderOrder(eligibleProviders) {
  if (eligibleProviders.length <= 1) {
    return eligibleProviders;
  }

  const startIndex = providerIndex % eligibleProviders.length;
  providerIndex = (providerIndex + 1) % eligibleProviders.length;

  return eligibleProviders
    .slice(startIndex)
    .concat(eligibleProviders.slice(0, startIndex));
}

/**
 * Get provider statistics from database
 * Useful for comparing costs and performance
 */
export async function getProviderStats(env, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const stats = await env.DB.prepare(`
    SELECT
      ai_provider,
      COUNT(*) as total_analyses,
      AVG(processing_time_ms) as avg_processing_time,
      SUM(token_count) as total_tokens,
      SUM(estimated_cost_usd) as total_cost,
      AVG(confidence_score) as avg_confidence
    FROM analyses
    WHERE ai_provider IS NOT NULL
      AND created_at >= ?
    GROUP BY ai_provider
    ORDER BY total_cost ASC
  `).bind(sinceStr).all();

  return stats.results;
}
