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
  return `Analyze this CI/CD build failure and provide actionable guidance.

**Workflow**: ${workflowName || 'Unknown'}
**Job**: ${jobName || 'Unknown'}
${errorMessage ? `**Error Message**: ${errorMessage}` : ''}

**Build Logs**:
\`\`\`
${logs.slice(-8000)}
\`\`\`

Provide your analysis in the following format:

## Summary
[One-sentence description of what went wrong]

## Root Cause
[Detailed explanation of why the failure occurred]

## Suggested Fix
[Step-by-step instructions to fix the issue]

## Code Example
\`\`\`
[If applicable, show code changes needed]
\`\`\`

## Confidence
[Rate your confidence: high/medium/low]

Be concise, practical, and developer-friendly. Focus on actionable fixes.`;
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
