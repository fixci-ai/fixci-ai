# AI Provider Cost Comparison

This document compares the estimated costs for different AI providers used in FixCI.

## Cost Breakdown by Provider

### 1. Cloudflare Workers AI
- **Model**: `@cf/meta/llama-3.1-8b-instruct`
- **Free Tier**: 10,000 requests/day
- **Paid Pricing**: ~$0.01 per 1,000 tokens (estimated)
- **Avg Analysis Cost**: ~$0.0001
- **Best For**: High-volume usage, cost optimization

**Pros:**
- Essentially free for most use cases (10k/day limit)
- No external API calls (runs on Cloudflare's edge)
- Very fast (low latency)
- No API key management

**Cons:**
- May have lower quality than larger models
- Limited to Cloudflare's model catalog

---

### 2. Google Gemini 2.0 Flash
- **Model**: `gemini-2.0-flash-exp`
- **Input**: $0.075 per 1M tokens
- **Output**: $0.30 per 1M tokens
- **Avg Analysis Cost**: ~$0.001
- **Best For**: Cost-effective with good quality

**Pros:**
- Very cost-effective
- Good quality analysis
- Fast processing
- Generous free tier available

**Cons:**
- Requires Google Cloud account
- API key management needed

---

### 3. OpenAI GPT-4o-mini
- **Model**: `gpt-4o-mini`
- **Input**: $0.150 per 1M tokens
- **Output**: $0.600 per 1M tokens
- **Avg Analysis Cost**: ~$0.002
- **Best For**: Balanced cost and quality

**Pros:**
- Well-known, reliable API
- Good quality analysis
- Excellent documentation
- Wide community support

**Cons:**
- More expensive than Gemini
- Requires OpenAI account

---

### 4. Anthropic Claude
- **Model (Simple)**: `claude-3-5-haiku-20241022`
  - Input: $1.00 per 1M tokens
  - Output: $5.00 per 1M tokens
  - Avg Cost: ~$0.001-0.003

- **Model (Complex)**: `claude-sonnet-4-20250514`
  - Input: $3.00 per 1M tokens
  - Output: $15.00 per 1M tokens
  - Avg Cost: ~$0.003-0.014

**Best For**: Highest quality analysis, complex failures

**Pros:**
- Best quality analysis
- Excellent at understanding context
- Adaptive model selection (Haiku for simple, Sonnet for complex)
- Strong reasoning capabilities

**Cons:**
- Most expensive option
- Requires Anthropic account

---

## Usage Scenarios

### Scenario 1: Small Team (10 analyses/day)
**Monthly Volume**: ~300 analyses

| Provider          | Monthly Cost | Notes                              |
|-------------------|--------------|------------------------------------ |
| Cloudflare AI     | **$0.00**    | Within free tier                   |
| Gemini Flash      | $0.30        | Very affordable                    |
| GPT-4o-mini       | $0.60        | Still very low                     |
| Claude (mixed)    | $1.50-3.00   | Higher but best quality            |

**Recommendation**: Use Cloudflare AI or Gemini

---

### Scenario 2: Medium Team (100 analyses/day)
**Monthly Volume**: ~3,000 analyses

| Provider          | Monthly Cost | Notes                              |
|-------------------|--------------|------------------------------------ |
| Cloudflare AI     | **$0.30**    | Exceeds free tier slightly         |
| Gemini Flash      | $3.00        | Very cost-effective                |
| GPT-4o-mini       | $6.00        | Reasonable                         |
| Claude (mixed)    | $15-40       | Premium pricing                    |

**Recommendation**: Use Cloudflare AI or Gemini

---

### Scenario 3: Large Organization (1000 analyses/day)
**Monthly Volume**: ~30,000 analyses

| Provider          | Monthly Cost | Notes                              |
|-------------------|--------------|------------------------------------ |
| Cloudflare AI     | **$3.00**    | Well above free tier               |
| Gemini Flash      | $30          | Still affordable                   |
| GPT-4o-mini       | $60          | Moderate cost                      |
| Claude (mixed)    | $150-400     | Expensive at scale                 |

**Recommendation**: Use Cloudflare AI, supplement with Claude for critical analyses

---

## Testing Strategy

FixCI uses **round-robin rotation** to automatically distribute requests across all configured providers. This allows you to:

1. **Collect Real Data**: See actual costs, not estimates
2. **Compare Quality**: Determine which provider gives best results for your use cases
3. **Optimize Mix**: Use cheaper providers for simple failures, premium for complex ones

### Recommended Testing Period

- Run for **2-4 weeks** to gather sufficient data
- Aim for at least **50 analyses per provider** minimum
- Track metrics:
  - Cost per analysis
  - Processing time
  - Confidence scores
  - Developer feedback on accuracy

### Querying Results

```bash
# View provider statistics
npx wrangler d1 execute fixci-db --remote --command "
SELECT
  ai_provider,
  COUNT(*) as total_analyses,
  ROUND(AVG(processing_time_ms), 2) as avg_time_ms,
  ROUND(SUM(estimated_cost_usd), 6) as total_cost_usd,
  ROUND(AVG(confidence_score), 3) as avg_confidence
FROM analyses
WHERE ai_provider IS NOT NULL
  AND created_at >= date('now', '-30 days')
GROUP BY ai_provider
ORDER BY total_cost_usd ASC;
"
```

### Example Output

```
┌────────────┬─────────────────┬─────────────┬────────────────┬────────────────┐
│ provider   │ total_analyses  │ avg_time_ms │ total_cost_usd │ avg_confidence │
├────────────┼─────────────────┼─────────────┼────────────────┼────────────────┤
│ cloudflare │ 125             │ 450.23      │ 0.012500       │ 0.750          │
│ gemini     │ 130             │ 680.15      │ 0.130000       │ 0.810          │
│ openai     │ 128             │ 720.40      │ 0.256000       │ 0.820          │
│ claude     │ 127             │ 890.50      │ 0.381000       │ 0.880          │
└────────────┴─────────────────┴─────────────┴────────────────┴────────────────┘
```

---

## Recommendations

### Phase 1: Initial Testing (First Month)
- Configure **all 4 providers** with API keys
- Let round-robin distribute requests evenly
- Collect cost and quality metrics

### Phase 2: Analysis (End of Month 1)
- Review provider statistics
- Compare analysis quality with developer feedback
- Calculate cost per value delivered

### Phase 3: Optimization (Month 2+)
**Option A - Single Provider**
- Choose best value provider (likely Cloudflare AI or Gemini)
- Remove other API keys to use exclusively

**Option B - Hybrid Approach**
- Use Cloudflare AI for 80% (simple failures)
- Use Claude Sonnet for 20% (complex/critical failures)
- Implement smart routing based on log complexity

**Option C - Continue Multi-Provider**
- Keep rotation for redundancy
- Automatic fallback if one provider fails
- Ongoing cost monitoring

---

## Cost Optimization Tips

1. **Log Truncation**: Only send last 8KB of logs (already implemented)
2. **Smart Provider Selection**: Route simple failures to cheaper models
3. **Batch Processing**: Process multiple failures together (future enhancement)
4. **Caching**: Cache similar failures to avoid re-analysis (future enhancement)
5. **Rate Limiting**: Set max analyses per day to control costs

---

## Current Implementation

The system is configured for **maximum flexibility**:

- ✅ Supports all 4 providers simultaneously
- ✅ Round-robin rotation for even distribution
- ✅ Automatic fallback if provider fails
- ✅ Cost tracking in database
- ✅ Easy to switch providers (just remove API keys)

**Next Steps:**
1. Set API keys for providers you want to test
2. Deploy the worker
3. Let it run for 2-4 weeks
4. Analyze results and optimize
