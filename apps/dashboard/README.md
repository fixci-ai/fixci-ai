# FixCI Admin Dashboard

Web-based admin interface for managing FixCI subscriptions.

## Features

- 🔍 **Search Installations** - Find users by account name
- ✨ **Grant Subscriptions** - Upgrade users to Pro/Enterprise
- 🔄 **Reset Usage** - Reset monthly analysis limits
- 🚫 **Revoke Access** - Downgrade or suspend accounts

## Quick Start

### Option 1: Open Locally (Instant)
```bash
# Just open the file in your browser
open apps/dashboard/public/index.html
```

### Option 2: Deploy to Cloudflare Pages
```bash
# 1. Create the Pages project in Cloudflare Dashboard:
# Visit: https://dash.cloudflare.com/pages
# Click "Create a project" → "Direct Upload"
# Name it: fixci-admin

# 2. Deploy
cd apps/dashboard
npx wrangler pages deploy public --project-name=fixci-admin --branch=main
```

### Option 3: Run Local Server
```bash
cd apps/dashboard/public
python3 -m http.server 8080
# Open: http://localhost:8080
```

## Setup

1. **Get your Admin API Key**
   ```bash
   # Generate a secure random key
   openssl rand -hex 32

   # Set it as a Wrangler secret
   npx wrangler secret put ADMIN_API_KEY
   ```

2. **Open the dashboard** (any method above)

3. **Enter your API key** in the dashboard

4. **Start managing subscriptions!**

## Usage

### Search for a User
1. Enter account name (e.g., "acme-corp")
2. Click "Search"
3. Click on a result to auto-fill the Installation ID

### Grant Pro Subscription
1. Enter Installation ID (or click search result)
2. Select tier (Free/Pro/Enterprise)
3. Add optional reason
4. Click "Grant Access"

### Reset Usage
1. Enter Installation ID
2. Add optional reason
3. Click "Reset Usage to 0"

This resets their monthly counter without changing their tier.

### Revoke Access
1. Enter Installation ID
2. Choose action:
   - **Downgrade to Free** - Reverts to 10 analyses/month
   - **Suspend Account** - Blocks all access
3. Add optional reason
4. Click "Revoke Access"

## Security

- ✅ API key stored in browser session only (not persisted)
- ✅ All actions require authentication
- ✅ Confirmation dialog for revoke actions
- ✅ Audit trail logged in `billing_events` table

## API Endpoints Used

- `GET /admin/installations/search?q={query}`
- `POST /admin/subscriptions/grant`
- `POST /admin/subscriptions/reset-usage`
- `POST /admin/subscriptions/revoke`

All endpoints require `Authorization: Bearer {ADMIN_API_KEY}` header.
