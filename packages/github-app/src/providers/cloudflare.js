/**
 * Cloudflare Workers AI Provider
 * Uses @cf/meta/llama-3.1-8b-instruct for cost-effective analysis
 */

const MODEL = '@cf/meta/llama-3.1-8b-instruct';
const COST_PER_1K_TOKENS = 0.00001; // Approximate, primarily using free tier

export async function analyzeWithCloudflare(logs, context, env) {
  const { workflowName, jobName, errorMessage } = context;

  const prompt = buildPrompt(logs, workflowName, jobName, errorMessage);

  try {
    const startTime = Date.now();

    // Use AI binding for Cloudflare Workers AI
    const response = await env.AI.run(MODEL, {
      messages: [
        {
          role: 'system',
          content: 'You are an expert CI/CD debugging assistant. Analyze build failures and provide actionable guidance in a structured format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    const processingTime = Date.now() - startTime;
    const text = response.response || '';

    // Parse the analysis
    const analysis = parseAnalysisResponse(text);

    // Estimate token usage (Llama tokenizer ~1.3 chars per token)
    const inputTokens = Math.ceil(prompt.length / 1.3);
    const outputTokens = Math.ceil(text.length / 1.3);
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost (free tier: 10k requests/day, then $0.01/1k tokens)
    const estimatedCost = (totalTokens / 1000) * COST_PER_1K_TOKENS;

    return {
      provider: 'cloudflare',
      model: MODEL,
      analysis,
      processingTime,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    };
  } catch (error) {
    console.error('Cloudflare AI error:', error);
    throw error;
  }
}

function buildPrompt(logs, workflowName, jobName, errorMessage) {
  return `You are analyzing a CI/CD build failure. Your goal is to identify the SPECIFIC error and provide an ACTIONABLE fix.

**Workflow**: ${workflowName || 'Unknown'}
**Job**: ${jobName || 'Unknown'}
${errorMessage ? `**Error Message**: ${errorMessage}` : ''}

**Build Logs** (already filtered to show only the failed step):
\`\`\`
${logs}
\`\`\`

**Common CI/CD issues to look for**:
- Missing dependencies or lock files (npm ci requires package-lock.json/yarn.lock)
- Environment variables not set
- Permission denied errors
- Version conflicts or incompatible versions
- Network/timeout issues
- Missing files or directories
- Syntax errors in config files
- Docker/container issues

**Analysis Guidelines**:
1. Identify the EXACT error message (look for "error:", "Error:", "ERROR", "failed", "##[error]")
2. Don't speculate - base your analysis on actual log content
3. If the error is clear (e.g., "package-lock.json not found"), state it directly
4. Provide specific, tested solutions (not generic advice like "check the logs")
5. If you genuinely can't determine the cause, say so

Provide your analysis in this format:

## Summary
[One specific sentence describing the actual error]

## Root Cause
[What specifically went wrong based on the logs]

## Suggested Fix
[Concrete steps to fix, with commands/code if applicable]

## Code Example
\`\`\`
[Only if code changes are needed - otherwise omit this section]
\`\`\`

## Confidence
[Rate: high/medium/low]`;
}

function parseAnalysisResponse(text) {
  // Parse structured response
  const summaryMatch = text.match(/##\s*Summary\s*\n(.*?)(?=\n##|$)/s);
  const rootCauseMatch = text.match(/##\s*Root Cause\s*\n(.*?)(?=\n##|$)/s);
  const fixMatch = text.match(/##\s*Suggested Fix\s*\n(.*?)(?=\n##|$)/s);
  const codeMatch = text.match(/##\s*Code Example\s*\n```[\s\S]*?\n(.*?)```/s);
  const confidenceMatch = text.match(/##\s*Confidence\s*\n(.*?)(?=\n|$)/i);

  const confidenceText = (confidenceMatch?.[1] || '').toLowerCase();
  let confidenceScore = 0.5;
  if (confidenceText.includes('high')) confidenceScore = 0.9;
  else if (confidenceText.includes('medium')) confidenceScore = 0.6;
  else if (confidenceText.includes('low')) confidenceScore = 0.3;

  return {
    summary: summaryMatch?.[1]?.trim() || 'Build failure detected',
    rootCause: rootCauseMatch?.[1]?.trim() || 'Unable to determine root cause',
    fix: fixMatch?.[1]?.trim() || 'Unable to suggest fix',
    codeExample: codeMatch?.[1]?.trim() || null,
    confidence: confidenceScore,
  };
}
