/**
 * Google Gemini API Provider
 * Uses Gemini 2.0 Flash Lite for cost-effective analysis
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash-exp';

// Pricing per million tokens (Gemini 2.0 Flash Lite experimental - free tier, then Flash pricing)
const PRICING = {
  input: 0.075,   // $0.075/MTok
  output: 0.30,   // $0.30/MTok
};

export async function analyzeWithGemini(logs, context, env) {
  const { workflowName, jobName, errorMessage } = context;

  const prompt = buildPrompt(logs, workflowName, jobName, errorMessage);

  try {
    const startTime = Date.now();

    const response = await fetch(
      `${GEMINI_API_URL}/${MODEL}:generateContent?key=${env.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert CI/CD debugging assistant. Analyze build failures and provide actionable guidance in a structured format.\n\n${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const processingTime = Date.now() - startTime;

    // Parse the analysis
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const analysis = parseAnalysisResponse(text);

    // Extract token usage
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = data.usageMetadata?.totalTokenCount || inputTokens + outputTokens;

    // Calculate cost based on pricing
    const estimatedCost = (
      (inputTokens / 1000000) * PRICING.input +
      (outputTokens / 1000000) * PRICING.output
    );

    return {
      provider: 'gemini',
      model: MODEL,
      analysis,
      processingTime,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
    };
  } catch (error) {
    console.error('Gemini API error:', error);
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
