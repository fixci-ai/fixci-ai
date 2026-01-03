# Gemini Flash PR Analysis Setup Guide

## Overview

FixCI already has **full Gemini 2.0 Flash integration** built-in. Gemini Flash is configured as the primary AI provider for the **free tier** alongside Cloudflare AI, and is available for all tiers.

### Current Status

✅ **Implemented**: Full Gemini 2.0 Flash Experimental support
✅ **Provider configured**: `src/providers/gemini.js`
✅ **Tier configuration**: Free tier uses Cloudflare + Gemini
❌ **Missing**: `GOOGLE_API_KEY` secret not configured

## Why Gemini Flash?

### Benefits:
1. **Cost-effective**: $0.075/MTok input, $0.30/MTok output (experimental tier free during testing)
2. **Fast**: Low latency for PR comment generation
3. **Quality**: Latest Gemini 2.0 Flash Experimental model
4. **Free tier friendly**: Designed for high-volume, low-cost analysis

### Comparison with other providers:

| Provider | Model | Cost (per analysis) | Speed | Quality |
|----------|-------|---------------------|-------|---------|
| **Gemini** | 2.0 Flash Exp | ~$0.003 | Fast | High |
| Cloudflare | Llama 3.1 | ~$0.001 | Very Fast | Medium |
| Claude | Haiku | ~$0.015 | Medium | Very High |
| OpenAI | GPT-4o-mini | ~$0.010 | Medium | High |

## Setup Instructions

### Step 1: Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API Key"** or **"Create API Key"**
3. Select or create a Google Cloud project
4. Copy the API key (starts with `AIza...`)

**Important**:
- The API key should have access to Generative Language API
- Gemini 2.0 Flash Experimental is currently free but may have rate limits
- Consider setting up billing for production use

### Step 2: Add API Key to Cloudflare Secrets

```bash
cd /Users/devilke/work/fixci/packages/github-app

# Add the GOOGLE_API_KEY as a Wrangler secret
npx wrangler secret put GOOGLE_API_KEY
# When prompted, paste your API key
```

**Verify it's added:**
```bash
npx wrangler secret list
# Should now show GOOGLE_API_KEY in the list
```

### Step 3: Deploy the Worker

```bash
npx wrangler deploy --config wrangler.toml
```

### Step 4: Test Gemini Integration

**Method 1: Trigger a real PR failure**

1. Create a test PR with a failing workflow
2. Wait for FixCI to analyze it
3. Check the PR comment for AI analysis
4. Verify in the database which provider was used:

```bash
npx wrangler d1 execute fixci-db --command \
  "SELECT ai_provider, model_used, issue_summary FROM analyses ORDER BY created_at DESC LIMIT 5"
```

**Method 2: Check the logs**

```bash
npx wrangler tail
# Then trigger a workflow failure
# Look for: "Analyzing with provider: gemini (tier: free)"
```

## How It Works

### Provider Selection Logic

**Free Tier** (10 analyses/month):
- Uses `["cloudflare", "gemini"]` providers
- Priority order: Cloudflare → Gemini
- If Cloudflare fails, falls back to Gemini

**Pro Tier** ($29/month, 100 analyses):
- Uses `["all"]` providers
- Round-robin selection across all configured providers
- Includes Cloudflare, Gemini, Claude, OpenAI (if keys configured)

**Enterprise Tier** (unlimited):
- Uses `["all"]` providers
- Intelligent provider selection
- Fallback chain for maximum reliability

### Code Flow

1. **Webhook received** (`handleWorkflowRun`)
2. **Analysis triggered** (`processAnalysis`)
3. **Logs fetched** from GitHub Actions
4. **Provider selected** based on tier (`analyzer.js:selectProvider`)
5. **Gemini called** (`providers/gemini.js:analyzeWithGemini`)
6. **Response parsed** (structured format)
7. **PR comment posted** with analysis

### Gemini Provider Implementation

**File**: `src/providers/gemini.js`

**Model**: `gemini-2.0-flash-exp`

**Prompt structure**:
```
You are an expert CI/CD debugging assistant. Analyze build failures
and provide actionable guidance in a structured format.

**Workflow**: [name]
**Job**: [job name]
**Build Logs**: [failed step logs]

Provide your analysis in the following format:

## Summary
[One-sentence description of what went wrong]

## Root Cause
[Detailed explanation of why the failure occurred]

## Suggested Fix
[Step-by-step instructions to fix the issue]

## Code Example
[If applicable, show code changes needed]

## Confidence
[Rate your confidence: high/medium/low]
```

**Response parsing**:
- Extracts structured sections using regex
- Confidence score converted to float (0.3-0.9)
- Fallback values if sections missing

## Monitoring

### Check Gemini Usage

**Database query** (last 30 days):
```sql
SELECT
  ai_provider,
  COUNT(*) as total_analyses,
  AVG(processing_time_ms) as avg_time,
  SUM(token_count) as total_tokens,
  SUM(estimated_cost_usd) as total_cost,
  AVG(confidence_score) as avg_confidence
FROM analyses
WHERE ai_provider = 'gemini'
  AND created_at >= date('now', '-30 days')
GROUP BY ai_provider;
```

**Run via Wrangler**:
```bash
npx wrangler d1 execute fixci-db --command \
  "SELECT ai_provider, COUNT(*) as count FROM analyses GROUP BY ai_provider"
```

### Metrics to Track

1. **Provider distribution**: Which providers are being used?
2. **Success rate**: Gemini analysis completion rate
3. **Cost**: Total Gemini API costs
4. **Quality**: Average confidence scores
5. **Performance**: Processing time

## Troubleshooting

### Issue: Gemini Not Being Used

**Check 1: API key configured?**
```bash
npx wrangler secret list | grep GOOGLE_API_KEY
```

**Check 2: Check provider availability**
```bash
# Add debug logging to analyzer.js:getAvailableProviders()
# Deploy and check logs with: npx wrangler tail
```

**Check 3: Tier configuration**
```bash
npx wrangler d1 execute fixci-db --command \
  "SELECT * FROM tier_configs WHERE tier = 'free'"
```

### Issue: API Rate Limits

**Symptoms**:
- Errors in logs: `429 Too Many Requests`
- Fallback to Cloudflare provider

**Solutions**:
1. Enable billing in Google Cloud Console
2. Request quota increase
3. Add Claude or OpenAI as fallback providers

### Issue: Invalid API Key

**Symptoms**:
- Errors: `API key not valid`
- All analyses using Cloudflare only

**Solutions**:
1. Verify API key in Google AI Studio
2. Check API key has Generative Language API enabled
3. Re-add secret: `npx wrangler secret put GOOGLE_API_KEY`

## Cost Estimation

### Typical PR Analysis

**Inputs**:
- Build logs: ~3,000 tokens
- Prompt: ~500 tokens
- **Total input**: ~3,500 tokens

**Outputs**:
- Analysis response: ~500 tokens

**Cost per analysis**:
```
Input:  3,500 tokens / 1,000,000 * $0.075 = $0.0002625
Output:   500 tokens / 1,000,000 * $0.30  = $0.0001500
Total:                                      $0.0004125
```

**Monthly cost estimates**:

| Tier | Analyses/month | Est. Cost (Gemini) | Notes |
|------|----------------|---------------------|-------|
| Free | 10 | $0.004 | Currently free during experimental phase |
| Pro | 100 | $0.041 | Mix of all providers |
| Enterprise | 1,000 | $0.41 | Round-robin across providers |

**Note**: Gemini 2.0 Flash Experimental is currently free but may transition to paid. Budget for $0.075/$0.30 per MTok when planning.

## Configuration Changes

### Change Gemini Model

Edit `src/providers/gemini.js`:

```javascript
// Current
const MODEL = 'gemini-2.0-flash-exp';

// Options:
// - 'gemini-2.0-flash-exp' (experimental, free, fast)
// - 'gemini-1.5-flash' (stable, paid, fast)
// - 'gemini-1.5-pro' (stable, paid, high quality)
```

### Adjust Token Limits

```javascript
generationConfig: {
  temperature: 0.3,        // 0.0-1.0 (lower = more deterministic)
  maxOutputTokens: 2000,   // Max response length
}
```

### Change Provider Priority

Edit tier configuration in database:

```sql
-- Make Gemini first priority for free tier
UPDATE tier_configs
SET ai_providers = '["gemini", "cloudflare"]'
WHERE tier = 'free';

-- Pro tier: prefer Gemini over others
UPDATE tier_configs
SET ai_providers = '["gemini", "claude", "openai", "cloudflare"]'
WHERE tier = 'pro';
```

Then restart the worker:
```bash
npx wrangler deploy
```

## Advanced: Custom Prompts

### Modify Analysis Prompt

Edit `src/providers/gemini.js:buildPrompt()`:

```javascript
function buildPrompt(logs, workflowName, jobName, errorMessage) {
  return `You are a senior DevOps engineer with expertise in CI/CD pipelines.

Analyze this GitHub Actions failure and provide:
1. Root cause analysis
2. Step-by-step fix
3. Prevention tips for the future

**Workflow**: ${workflowName}
**Job**: ${jobName}
**Logs**:
\`\`\`
${logs.slice(-8000)}
\`\`\`

Be specific, actionable, and include code examples where relevant.`;
}
```

## Testing Checklist

Before considering Gemini setup complete, verify:

- [ ] GOOGLE_API_KEY secret added to Wrangler
- [ ] Worker deployed successfully
- [ ] Test PR with failing workflow created
- [ ] FixCI posted analysis comment to PR
- [ ] Database shows `ai_provider = 'gemini'`
- [ ] Logs show "Analyzing with provider: gemini"
- [ ] Analysis quality is acceptable
- [ ] Costs are within budget

## Support

### If Gemini is not working:

1. Check logs: `npx wrangler tail`
2. Check database: `SELECT * FROM analyses ORDER BY created_at DESC LIMIT 5`
3. Verify API key: Test with curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{"text": "Hello"}]
    }]
  }'
```

### Documentation Links

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Gemini Pricing](https://ai.google.dev/pricing)
- [FixCI Analyzer Code](./src/analyzer.js)
- [Gemini Provider Code](./src/providers/gemini.js)

---

Last Updated: 2026-01-03
