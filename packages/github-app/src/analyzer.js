/**
 * Multi-Provider CI/CD Failure Analyzer
 * Supports Cloudflare AI, Claude, OpenAI, and Gemini
 */

import { analyzeWithCloudflare } from './providers/cloudflare.js';
import { analyzeWithClaude } from './providers/claude.js';
import { analyzeWithOpenAI } from './providers/openai.js';
import { analyzeWithGemini } from './providers/gemini.js';

// Provider rotation counter (stored in global scope for round-robin)
let providerIndex = 0;

/**
 * Analyze CI/CD failure logs using configured AI providers
 * Automatically rotates between providers for cost comparison
 */
export async function analyzeFailure(logs, context, env) {
  // Get available providers based on configured API keys
  const availableProviders = getAvailableProviders(env);

  if (availableProviders.length === 0) {
    throw new Error('No AI providers configured. Please set at least one API key.');
  }

  // Select provider using round-robin rotation
  const provider = selectProvider(availableProviders);

  console.log(`Analyzing with provider: ${provider}`);

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

    // Return standardized response
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
    console.error(`Analysis with ${provider} failed:`, error);

    // Try fallback to next provider if available
    if (availableProviders.length > 1) {
      console.log('Attempting fallback to next provider...');
      const nextProvider = availableProviders[(providerIndex + 1) % availableProviders.length];
      providerIndex = (providerIndex + 1) % availableProviders.length;

      // Recursive call with next provider
      return analyzeFailure(logs, context, env);
    }

    throw error;
  }
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
 * Select provider using round-robin rotation
 * This ensures even distribution for cost comparison testing
 */
function selectProvider(availableProviders) {
  const provider = availableProviders[providerIndex];
  providerIndex = (providerIndex + 1) % availableProviders.length;
  return provider;
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
