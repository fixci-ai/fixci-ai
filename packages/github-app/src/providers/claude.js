/**
 * Anthropic Claude API Provider
 * Uses Claude Haiku or Sonnet based on log complexity
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Pricing per million tokens (as of 2024)
const PRICING = {
  'claude-3-5-haiku-20241022': {
    input: 1.00,   // $1/MTok
    output: 5.00,  // $5/MTok
  },
  'claude-sonnet-4-20250514': {
    input: 3.00,   // $3/MTok
    output: 15.00, // $15/MTok
  },
};

export async function analyzeWithClaude(logs, context, env) {
  const { workflowName, jobName, errorMessage } = context;

  // Choose model based on log complexity
  const logLength = logs.length;
  const model = logLength > 10000 ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-20241022';

  const prompt = buildPrompt(logs, workflowName, jobName, errorMessage);

  try {
    const startTime = Date.now();

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Parse the analysis from Claude's response
    const analysis = parseAnalysisResponse(data.content[0].text);

    const inputTokens = data.usage.input_tokens;
    const outputTokens = data.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost based on pricing
    const pricing = PRICING[model];
    const estimatedCost = (
      (inputTokens / 1000000) * pricing.input +
      (outputTokens / 1000000) * pricing.output
    );

    return {
      provider: 'claude',
      model,
      analysis,
      processingTime,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

function buildPrompt(logs, workflowName, jobName, errorMessage) {
  return `You are an expert CI/CD debugging assistant. Analyze this build failure and provide actionable guidance.

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
  // Parse Claude's structured response
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
