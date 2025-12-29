# Multi-Provider AI Guide

FixCI supports multiple AI providers to give you flexibility in balancing cost, quality, and performance. This guide explains each provider and how to optimize your configuration.

## Supported Providers

### 1. Cloudflare Workers AI ⚡

**Model**: `@cf/meta/llama-3.1-8b-instruct`

**Pricing**:
- Free tier: 10,000 requests/day
- Paid: ~$0.01 per 1,000 tokens
- **Est. cost per analysis**: ~$0.0001

**Pros**:
- ✅ No API key needed
- ✅ Runs on Cloudflare's edge network (ultra-low latency)
- ✅ Essentially free for most use cases
- ✅ No external API calls
- ✅ Automatic availability

**Cons**:
- ⚠️ May have slightly lower quality than larger models
- ⚠️ Limited to Cloudflare's model catalog

**Best For**: High-volume usage, cost optimization, testing

**Setup**: Already configured via AI binding in `wrangler.toml` - no action needed!

---

### 2. Google Gemini 2.0 Flash 🚀

**Model**: `gemini-2.0-flash-exp`

**Pricing**:
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- **Est. cost per analysis**: ~$0.001

**Pros**:
- ✅ Excellent cost-to-quality ratio
- ✅ Fast processing
- ✅ Generous free tier available
- ✅ Good at understanding context

**Cons**:
- ⚠️ Requires Google Cloud account
- ⚠️ API key management needed

**Best For**: Cost-effective production use with good quality

**Setup**:
```bash
# Get API key from https://aistudio.google.com/app/apikey
npx wrangler secret put GOOGLE_API_KEY
```

---

### 3. OpenAI GPT-4o-mini 🤖

**Model**: `gpt-4o-mini`

**Pricing**:
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens
- **Est. cost per analysis**: ~$0.002

**Pros**:
- ✅ Well-known, reliable API
- ✅ Excellent documentation
- ✅ Large community support
- ✅ Consistent quality

**Cons**:
- ⚠️ More expensive than Gemini
- ⚠️ Requires OpenAI account

**Best For**: Balanced cost and quality, teams already using OpenAI

**Setup**:
```bash
# Get API key from https://platform.openai.com/api-keys
npx wrangler secret put OPENAI_API_KEY
```

---

### 4. Anthropic Claude 🧠

**Models**:
- **Simple logs** (`claude-3-5-haiku-20241022`):
  - Input: $1.00 per 1M tokens
  - Output: $5.00 per 1M tokens
  - Est. cost: ~$0.001-0.003

- **Complex logs** (`claude-sonnet-4-20250514`):
  - Input: $3.00 per 1M tokens
  - Output: $15.00 per 1M tokens
  - Est. cost: ~$0.003-0.014

**Pros**:
- ✅ Best quality analysis
- ✅ Excellent reasoning capabilities
- ✅ Adaptive model selection (automatically uses Haiku for simple logs, Sonnet for complex)
- ✅ Superior context understanding

**Cons**:
- ⚠️ Most expensive option
- ⚠️ Requires Anthropic account

**Best For**: Critical analyses, complex failures, maximum quality

**Setup**:
```bash
# Get API key from https://console.anthropic.com/
npx wrangler secret put ANTHROPIC_API_KEY
```

---

## Provider Selection Strategy

### Round-Robin Rotation (Default)

FixCI uses round-robin rotation by default to evenly distribute requests across all configured providers:

```
Request 1 → Cloudflare AI
Request 2 → Claude
Request 3 → OpenAI
Request 4 → Gemini
Request 5 → Cloudflare AI (cycle repeats)
```

**Benefits**:
- Even distribution for fair comparison
- Real-world cost data collection
- Automatic fallback if one provider fails
- Quality comparison across providers

### How It Works

1. System checks which providers have API keys configured
2. Builds list of available providers
3. Selects next provider in rotation
4. If provider fails, automatically tries next one
5. Tracks costs and metrics in database

**Code Location**: `packages/github-app/src/analyzer.js`

```javascript
function selectProvider(availableProviders) {
  const provider = availableProviders[providerIndex];
  providerIndex = (providerIndex + 1) % availableProviders.length;
  return provider;
}
```

---

## Cost Optimization Strategies

### Strategy 1: Single Provider (Lowest Cost)

Use only Cloudflare Workers AI:

```bash
# Remove other provider keys
npx wrangler secret delete ANTHROPIC_API_KEY
npx wrangler secret delete OPENAI_API_KEY
npx wrangler secret delete GOOGLE_API_KEY
```

**Result**: ~$0.0001 per analysis (essentially free within 10k/day limit)

### Strategy 2: Hybrid Approach (Balanced)

Use Cloudflare AI as primary, Claude for complex failures:

1. Set up both providers
2. Future enhancement: Implement smart routing based on log complexity
3. 80% Cloudflare AI, 20% Claude for critical analyses

**Estimated Cost**: ~$0.0002 per analysis average

### Strategy 3: Multi-Provider with Monitoring (Best Insights)

Configure all providers and let them run for 30 days:

```bash
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put GOOGLE_API_KEY
# Cloudflare AI automatically available
```

Then analyze which provides best value:

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  ai_provider,
  COUNT(*) as total_analyses,
  ROUND(AVG(processing_time_ms), 2) as avg_time_ms,
  ROUND(SUM(estimated_cost_usd), 6) as total_cost,
  ROUND(AVG(confidence_score), 3) as avg_confidence
FROM analyses
WHERE ai_provider IS NOT NULL
  AND created_at >= date('now', '-30 days')
GROUP BY ai_provider
ORDER BY total_cost ASC;
"
```

---

## Cost Comparison by Volume

### Small Team (10 analyses/day, ~300/month)

| Provider | Monthly Cost | Quality | Recommendation |
|----------|--------------|---------|----------------|
| Cloudflare AI | **$0.00** | Good | ✅ Best choice |
| Gemini | $0.30 | Very Good | ✅ Alternative |
| OpenAI | $0.60 | Very Good | ⚠️ Higher cost |
| Claude | $1.50-3.00 | Excellent | ⚠️ Premium only |

**Recommendation**: Cloudflare AI

### Medium Team (100 analyses/day, ~3,000/month)

| Provider | Monthly Cost | Quality | Recommendation |
|----------|--------------|---------|----------------|
| Cloudflare AI | **$0.30** | Good | ✅ Best value |
| Gemini | $3.00 | Very Good | ✅ Good value |
| OpenAI | $6.00 | Very Good | ⚠️ Moderate |
| Claude | $15-40 | Excellent | ⚠️ Premium use |

**Recommendation**: Cloudflare AI or Gemini

### Large Organization (1,000 analyses/day, ~30,000/month)

| Provider | Monthly Cost | Quality | Recommendation |
|----------|--------------|---------|----------------|
| Cloudflare AI | **$3.00** | Good | ✅ Best value |
| Gemini | $30 | Very Good | ✅ Good value |
| OpenAI | $60 | Very Good | ⚠️ Moderate |
| Claude | $150-400 | Excellent | ⚠️ Critical only |

**Recommendation**: 80% Cloudflare AI + 20% Claude for complex failures

---

## Monitoring Provider Performance

### View Real-Time Statistics

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  ai_provider,
  COUNT(*) as count,
  ROUND(AVG(processing_time_ms), 0) as avg_ms,
  ROUND(MIN(estimated_cost_usd), 6) as min_cost,
  ROUND(MAX(estimated_cost_usd), 6) as max_cost,
  ROUND(AVG(estimated_cost_usd), 6) as avg_cost,
  ROUND(SUM(estimated_cost_usd), 4) as total_cost
FROM analyses
WHERE ai_provider IS NOT NULL
GROUP BY ai_provider;
"
```

### Export for Analysis

```bash
# Export last 30 days to CSV
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  created_at,
  ai_provider,
  model_used,
  processing_time_ms,
  input_tokens,
  output_tokens,
  estimated_cost_usd,
  confidence_score
FROM analyses
WHERE created_at >= date('now', '-30 days')
ORDER BY created_at DESC;
" --json > provider_stats.json
```

### Quality Assessment

Track confidence scores by provider:

```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  ai_provider,
  ROUND(AVG(confidence_score), 3) as avg_confidence,
  COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) as high_confidence,
  COUNT(CASE WHEN confidence_score < 0.5 THEN 1 END) as low_confidence
FROM analyses
WHERE ai_provider IS NOT NULL
GROUP BY ai_provider;
"
```

---

## Provider-Specific Configuration

### Cloudflare Workers AI

**No configuration needed!** Automatically available via the AI binding.

**Model Details**:
- Based on Meta Llama 3.1 8B
- Optimized for edge deployment
- Context window: 8,192 tokens
- Output limit: 2,000 tokens

**Billing**:
- Included in Workers Paid plan
- Free tier: 10,000 requests/day
- No per-request charges within free tier

### Claude (Anthropic)

**API Key**: Set via `ANTHROPIC_API_KEY`

**Model Selection Logic**:
```javascript
const model = logLength > 10000
  ? 'claude-sonnet-4-20250514'  // Complex logs
  : 'claude-3-5-haiku-20241022'; // Simple logs
```

**Rate Limits**:
- Tier 1: 50 requests/minute
- Tier 2: 1,000 requests/minute (with usage history)

### OpenAI

**API Key**: Set via `OPENAI_API_KEY`

**Model**: `gpt-4o-mini` (fixed)

**Rate Limits**:
- Free tier: 3 requests/minute
- Tier 1: 500 requests/minute
- Tier 5: 10,000 requests/minute

### Google Gemini

**API Key**: Set via `GOOGLE_API_KEY`

**Model**: `gemini-2.0-flash-exp` (experimental, may change to stable)

**Rate Limits**:
- Free tier: 15 requests/minute
- Paid tier: 1,000 requests/minute

---

## Testing Recommendations

### Phase 1: Initial Setup (Week 1)

1. Start with Cloudflare AI only (no setup required)
2. Test with 5-10 real failures
3. Verify PR comments are helpful
4. Check cost tracking in database

### Phase 2: Provider Comparison (Weeks 2-4)

1. Add all provider API keys
2. Let round-robin distribute requests
3. Collect minimum 50 analyses per provider
4. Compare:
   - Costs
   - Processing times
   - Confidence scores
   - Developer feedback

### Phase 3: Optimization (Week 5+)

1. Analyze collected data
2. Choose optimal provider(s)
3. Remove unused provider keys
4. Monitor ongoing costs

---

## Troubleshooting

### Provider Not Being Used

**Check available providers**:
```bash
# View configured secrets
npx wrangler secret list
```

**Verify in logs**:
```bash
npx wrangler tail
# Look for: "Analyzing with provider: cloudflare"
```

### API Key Errors

**Test individual provider**:
```bash
# View recent errors
npx wrangler d1 execute fixci-db --remote --command "
SELECT ai_provider, error_log, created_at
FROM analyses
WHERE analysis_status = 'failed'
ORDER BY created_at DESC
LIMIT 5;
"
```

### High Costs

**Identify expensive analyses**:
```bash
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  workflow_name,
  ai_provider,
  model_used,
  estimated_cost_usd,
  token_count
FROM analyses
ORDER BY estimated_cost_usd DESC
LIMIT 10;
"
```

Consider:
- Using cheaper providers for simple failures
- Truncating logs more aggressively
- Implementing rate limiting

---

## Future Enhancements

- **Smart Routing**: Automatically select provider based on log complexity
- **Cost Alerts**: Notify when daily costs exceed threshold
- **Quality Feedback**: Track developer ratings of analyses
- **Custom Prompts**: Per-provider prompt optimization
- **Caching**: Avoid re-analyzing identical failures

---

**See Also**:
- [Setup Guide](02-Setup-Guide.md) - Initial configuration
- [Cost Comparison](packages/github-app/COST_COMPARISON.md) - Detailed cost analysis
- [Database Schema](04-Database-Schema.md) - Understanding stored metrics
