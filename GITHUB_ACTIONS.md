# GitHub Actions CI/CD Setup

Automated deployment pipeline for FixCI using GitHub Actions.

## 🚀 Quick Setup

### 1. Add GitHub Secrets

Go to: `https://github.com/veghadam/fixci/settings/secrets/actions`

Add these two secrets:

| Secret Name | How to Get | Required |
|------------|------------|----------|
| `CLOUDFLARE_API_TOKEN` | See below | ✅ Yes |
| `CLOUDFLARE_ACCOUNT_ID` | See below | ✅ Yes |

### 2. Get Cloudflare API Token

```bash
# Visit: https://dash.cloudflare.com/profile/api-tokens
# Click "Create Token"
# Template: "Edit Cloudflare Workers"
# Permissions:
#   - Account > Workers Scripts > Edit
#   - Account > D1 > Edit
#   - Zone > Workers Routes > Edit
# Account Resources: Include > Your Account
# Zone Resources: Include > fixci.dev
# Create Token → Copy it
```

### 3. Get Cloudflare Account ID

**Option 1 - From CLI:**
```bash
npx wrangler whoami
# Copy the Account ID shown
```

**Option 2 - From Dashboard:**
```
Go to Cloudflare Dashboard
URL shows: dash.cloudflare.com/YOUR_ACCOUNT_ID/...
Copy that ID
```

### 4. Test It

```bash
# Create a test PR
git checkout -b test-ci
echo "# Test" >> README.md
git add README.md
git commit -m "Test CI"
git push origin test-ci

# Create PR on GitHub
# Watch CI run automatically!
```

## 📦 Workflows

### CI Workflow - `.github/workflows/ci.yml`
**Runs on:** Every PR + Push to main
- Lint code
- Run tests
- Validate builds
- Check SQL migrations

### Deploy Workflow - `.github/workflows/deploy.yml`
**Runs on:** Push to main (automatic)
1. Deploy landing page → https://fixci.dev
2. Deploy github-app → https://fixci-github-app.adam-vegh.workers.dev
3. Run health checks

### Migration Workflow - `.github/workflows/migrate.yml`
**Runs on:** Manual trigger only
- Apply database migrations safely
- Requires typing "MIGRATE" to confirm

## 🔄 Deployment Flow

```
Push to main
    ↓
Deploy Landing
    ↓
Deploy GitHub App
    ↓
Health Checks
    ↓
✅ LIVE
```

## 🐛 Troubleshooting

**Deployment failed?**
1. Check Actions tab for logs
2. Verify secrets are set correctly
3. Test locally: `npx wrangler deploy`

**Health check failed?**
```bash
# Test manually:
curl https://fixci.dev
curl https://fixci-github-app.adam-vegh.workers.dev/health
```

**Rollback:**
```bash
git revert HEAD
git push origin main
# Auto-redeploys previous version
```

## 🎯 Manual Deployment

**If GitHub Actions is down:**
```bash
# Landing page
cd /path/to/fixci
npx wrangler deploy --config wrangler.jsonc

# GitHub App
cd packages/github-app
npx wrangler deploy --config wrangler.toml
```

## 🔐 Security

- ✅ All secrets in GitHub (not committed)
- ✅ API tokens rotate every 6 months
- ✅ Branch protection on `main`
- ✅ Require PR reviews
- ✅ Health checks before marking success

## 📊 Monitoring

- **Actions:** https://github.com/veghadam/fixci/actions
- **Workers:** https://dash.cloudflare.com/workers
- **Analytics:** Cloudflare Dashboard

---

**Setup Time:** ~5 minutes
**Last Updated:** 2025-12-29
