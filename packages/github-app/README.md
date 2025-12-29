# FixCI GitHub App

Webhook handler for receiving GitHub workflow failure events.

## Setup

### 1. Create GitHub App

1. Go to GitHub Settings → Developer settings → GitHub Apps → New GitHub App
2. Fill in:
   - **Name**: `FixCI` (or `FixCI-Dev` for testing)
   - **Homepage URL**: `https://fixci.dev`
   - **Webhook URL**: `https://fixci-github-app.<your-subdomain>.workers.dev/webhook`
   - **Webhook secret**: Generate a random secret (save for later)
   - **Permissions**:
     - Repository permissions:
       - Actions: Read-only (to access workflow runs and logs)
       - Contents: Read-only
       - Metadata: Read-only
       - Pull requests: Read & write (to post comments)
   - **Subscribe to events**:
     - Workflow run
3. Create the app and note down:
   - App ID
   - Generate and download private key (.pem file)

### 2. Set Secrets

```bash
# Set GitHub App credentials
npx wrangler secret put GITHUB_APP_ID
npx wrangler secret put GITHUB_WEBHOOK_SECRET
npx wrangler secret put GITHUB_APP_PRIVATE_KEY  # Paste entire .pem file content

# Set AI Provider API keys (at least one required)
# Cloudflare Workers AI is automatically available via AI binding (free tier: 10k requests/day)
npx wrangler secret put ANTHROPIC_API_KEY   # Claude API
npx wrangler secret put OPENAI_API_KEY      # OpenAI GPT-4o-mini
npx wrangler secret put GOOGLE_API_KEY      # Google Gemini
```

### 3. Deploy

```bash
npm run deploy
# or
npx wrangler deploy
```

### 4. Install on Repository

1. Go to GitHub App settings → Install App
2. Choose your account/organization
3. Select repositories to monitor
4. Authorize the installation

## Development

```bash
# Local development
npx wrangler dev

# View logs
npx wrangler tail

# Test webhook locally with ngrok
ngrok http 8787
# Update GitHub App webhook URL to ngrok URL
```

## How it Works

1. GitHub sends `workflow_run.completed` webhook when a workflow finishes
2. Worker verifies webhook signature
3. If workflow failed, creates analysis record in D1
4. Analysis runs inline using `env.waitUntil()` for async processing
5. Analysis worker fetches logs, sends to AI provider, posts PR comment
6. Cost and performance metrics are tracked in database

## Multi-Provider AI Support

FixCI supports multiple AI providers for cost comparison:

- **Cloudflare Workers AI** - Free tier: 10k requests/day, then ~$0.0001/analysis
  - Model: `@cf/meta/llama-3.1-8b-instruct`
  - Fastest, most cost-effective for high volume

- **Anthropic Claude** - $0.001-0.014/analysis depending on complexity
  - Models: `claude-3-5-haiku-20241022` (simple) or `claude-sonnet-4-20250514` (complex)
  - Best quality analysis

- **OpenAI GPT-4o-mini** - ~$0.002/analysis
  - Model: `gpt-4o-mini`
  - Good balance of cost and quality

- **Google Gemini** - ~$0.001/analysis
  - Model: `gemini-2.0-flash-exp`
  - Fast and cost-effective

### Provider Selection

The system uses **round-robin rotation** to evenly distribute requests across all configured providers. This allows you to compare:
- Analysis quality and accuracy
- Processing speed
- Actual costs in production

### Viewing Cost Statistics

Query provider performance from the database:

```sql
SELECT
  ai_provider,
  COUNT(*) as analyses,
  AVG(processing_time_ms) as avg_time_ms,
  SUM(estimated_cost_usd) as total_cost,
  AVG(confidence_score) as avg_confidence
FROM analyses
WHERE ai_provider IS NOT NULL
GROUP BY ai_provider
ORDER BY total_cost ASC;
```

## Webhook Events

- `workflow_run` - Captures CI/CD failures
- `installation` - Tracks app installations
- `ping` - Health check from GitHub
