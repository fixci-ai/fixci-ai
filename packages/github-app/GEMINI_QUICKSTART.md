# Gemini Flash Quick Start - 5 Minutes

## 🚀 TL;DR

Gemini Flash is **already built into FixCI**. You just need to add the API key.

## ⚡ 3-Step Setup

### 1. Get API Key (2 minutes)

Visit: https://aistudio.google.com/app/apikey

- Click **"Create API Key"**
- Select your Google Cloud project (or create one)
- Copy the key (starts with `AIza...`)

### 2. Add to Cloudflare (1 minute)

```bash
cd /Users/devilke/work/fixci/packages/github-app
npx wrangler secret put GOOGLE_API_KEY
# Paste your API key when prompted
```

### 3. Deploy (1 minute)

```bash
npx wrangler deploy --config wrangler.toml
```

## ✅ Verify It's Working

Create a failing test in any PR and check:

1. **FixCI posts a comment** on the PR
2. **Check which provider was used**:

```bash
npx wrangler d1 execute fixci-db --command \
  "SELECT ai_provider, model_used, created_at FROM analyses ORDER BY created_at DESC LIMIT 5"
```

3. **Watch live**:

```bash
npx wrangler tail
# Then trigger a workflow failure
# Look for: "Analyzing with provider: gemini (tier: free)"
```

## 📊 Current Configuration

**Free Tier** (default):
- Uses: Cloudflare AI + **Gemini 2.0 Flash**
- Priority: Cloudflare first, Gemini fallback
- Cost: ~$0.0004 per analysis (currently free during experimental phase)

**Pro Tier**:
- Uses: **All providers** (Gemini, Claude, OpenAI, Cloudflare)
- Round-robin selection

## 💡 Why This Works

Your codebase already has:
- ✅ Full Gemini provider implementation (`src/providers/gemini.js`)
- ✅ Multi-provider analyzer with tier support (`src/analyzer.js`)
- ✅ Tier configuration with Gemini for free tier
- ✅ Fallback logic if one provider fails

**Only missing**: The `GOOGLE_API_KEY` environment variable

## 🔧 What Gemini Does

When a PR workflow fails:

1. FixCI extracts the build logs
2. Sends them to Gemini 2.0 Flash with this prompt:
   - "Analyze this CI/CD build failure"
   - "Provide summary, root cause, suggested fix"
   - "Include code examples"
3. Gemini returns structured analysis
4. FixCI posts it as a PR comment

**Example output format**:

```markdown
## 🔍 Analysis Summary
Test failure in authentication module

## 🎯 Root Cause
Missing environment variable DATABASE_URL in test environment

## ✅ Suggested Fix
1. Add DATABASE_URL to .env.test
2. Update GitHub Actions secrets
3. Restart the workflow

## 💻 Code Example
# .github/workflows/test.yml
env:
  DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## 📈 Expected Results

**Before adding API key**:
- Provider: `cloudflare` (only option)
- Model: `llama-3.1-8b`

**After adding API key**:
- Provider: `gemini` (if Cloudflare unavailable) or `cloudflare` (if available)
- Model: `gemini-2.0-flash-exp`
- Fallback: Automatic switch between providers

## 🎯 Next Steps

After Gemini is working:

1. **Monitor usage**: Check database for provider stats
2. **Adjust priority**: Edit tier configs to prefer Gemini over Cloudflare
3. **Add more providers**: Consider Claude/OpenAI for Pro tier
4. **Fine-tune prompts**: Customize analysis style in `gemini.js`

## 📚 Full Documentation

See `GEMINI_SETUP.md` for:
- Detailed troubleshooting
- Cost analysis
- Configuration options
- Monitoring queries
- Custom prompts

---

**Questions?** Check logs with `npx wrangler tail` or query the database.
