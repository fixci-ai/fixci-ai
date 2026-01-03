# FixCI Admin Dashboard

A secure, local web interface for managing FixCI subscriptions, granting access, and monitoring system health.

## 🚀 Quick Start

### Option 1: Open Directly in Browser (Easiest)

```bash
# Simply open the HTML file
open dashboard.html

# Or on Linux
xdg-open dashboard.html

# Or drag the file into your browser
```

### Option 2: Run Local Server (Recommended)

#### Using Python (Built-in on Mac/Linux)

```bash
# Navigate to admin folder
cd /Users/devilke/work/fixci/admin

# Start local server
python3 -m http.server 8080

# Open browser to:
# http://localhost:8080/dashboard.html
```

#### Using Node.js

```bash
# Install http-server globally (one-time)
npm install -g http-server

# Start server
http-server -p 8080

# Open: http://localhost:8080/dashboard.html
```

#### Using PHP

```bash
php -S localhost:8080
```

## 🔐 First-Time Setup

1. **Get Your Admin API Key**
   ```bash
   # Set your admin API key in Cloudflare (if not already done)
   cd /Users/devilke/work/fixci/packages/github-app
   npx wrangler secret put ADMIN_API_KEY
   # Enter: YOUR_SECRET_KEY (save this somewhere secure!)
   ```

2. **Open Dashboard**
   - Navigate to `http://localhost:8080/dashboard.html`
   - Or open `dashboard.html` directly in your browser

3. **Login**
   - Worker URL: `https://fixci-github-app.api.fixci.dev`
   - Admin API Key: (the key you set above)
   - Click "Connect to Dashboard"

## ✨ Features

### 📊 Dashboard Overview
- Total installations count
- Pro subscribers count
- Monthly recurring revenue
- Recent activity (7-day analyses)

### 👥 Subscription Management
- **View All Subscriptions**: See all installations with their tiers and usage
- **Filter**: By tier (Free/Pro/Enterprise) or status (Active/Suspended/Cancelled)
- **Real-time Data**: Refresh anytime to see latest status

### 🎁 Grant Access
**NEW: Waitlist Integration**
- View all users who signed up on the landing page
- See if they've already installed the GitHub App
- Grant access directly from the waitlist table
- Capture repository information when granting access

Give users free access to any tier:
- Beta testers → Free Pro access
- Partners → Enterprise tier
- Trial periods → Temporary upgrades
- Audit trail with reason tracking

### ⚙️ Actions
- **Suspend/Activate**: Suspend abusive users or reactivate accounts
- **Reset Usage**: Grant extra analyses after incidents
- **All actions logged**: Complete audit trail in database

### 🔍 Detailed View
Click "View" on any subscription to see:
- Full subscription details
- Installation information
- Usage statistics
- Billing events history
- Recent analyses

## 🎯 Common Use Cases

### Grant Access from Waitlist

**NEW Workflow:**

1. Go to "Grant Access" tab
2. View the waitlist table - all users who signed up
3. Look for the user you want to grant access to
4. Click "Grant Access" button next to their email
5. The form will auto-populate with their email and installation ID (if they installed the app)
6. Enter the repository URL they want to monitor (e.g., `https://github.com/username/repo`)
7. Select Tier: `Pro` (or other tier)
8. Add Reason: `Beta tester program - free until 2026-03-31`
9. Click "Grant Subscription"

**If user hasn't installed the GitHub App yet:**
- Click "Manual Setup" in the waitlist
- Dashboard will show instructions to contact them
- Ask them to install FixCI GitHub App at: `https://github.com/apps/fixci-ai`
- Come back and complete the grant once they install

### Grant Beta Tester Pro Access (Manual)

1. Go to "Grant Access" tab
2. Scroll down to the grant form
3. Enter Installation ID: `12345`
4. Enter Repository URL: `https://github.com/username/repo`
5. Select Tier: `Pro`
6. Reason: `Beta tester program - free until 2026-03-31`
7. Click "Grant Subscription"

### Suspend Abusive User

1. Go to "Actions" tab
2. Enter Installation ID: `54321`
3. Select Status: `Suspended`
4. Reason: `Terms of service violation - spam`
5. Click "Update Status"

### Give Service Credit

1. Go to "Actions" tab
2. Scroll to "Reset Usage"
3. Enter Installation ID: `99999`
4. Reason: `Service credit for downtime on 2025-12-29`
5. Click "Reset Usage"

### Find Installation ID

1. Go to "Subscriptions" tab
2. Search for account name in the table
3. Installation ID is in the first column

Or query directly:
```bash
# Via API
curl -H "Authorization: Bearer YOUR_KEY" \
  "https://fixci-github-app.api.fixci.dev/admin/subscriptions"

# Via database
npx wrangler d1 execute fixci-db --remote --command \
  "SELECT installation_id, account_login FROM installations WHERE account_login LIKE '%search%'"
```

## 🔒 Security

### API Key Storage
- ✅ Stored only in browser session
- ✅ Never sent to any third-party
- ✅ Only communicates with your Cloudflare Worker
- ✅ Cleared when you close the browser

### Best Practices
1. **Use HTTPS**: Always access via `https://` when using local server
2. **Private Browsing**: Consider using incognito mode
3. **Rotate Keys**: Change admin API key periodically
4. **Don't Share**: Never share the admin dashboard or API key
5. **Close When Done**: Close browser tab when finished

### Network Security
The dashboard:
- ✅ Only calls YOUR worker (no external APIs)
- ✅ Works offline after initial load
- ✅ No telemetry or tracking
- ✅ No external dependencies

## 🛠️ Troubleshooting

### "Authentication failed"
- Check your Admin API Key is correct
- Verify Worker URL is correct
- Ensure `ADMIN_API_KEY` secret is set in Cloudflare
- Try accessing Worker health endpoint: `{WORKER_URL}/health`

### "CORS error"
If you see CORS errors when opening HTML directly:
- Use a local server instead (Python/Node.js method above)
- Or enable file:// protocol in your browser

### "No subscriptions found"
- Check if you have any installations
- Try removing filters (set both to "All")
- Verify database has subscription records

### Connection timeout
- Check Worker is deployed and running
- Verify Worker URL in dashboard settings
- Check Cloudflare Workers dashboard for errors

## 📱 Mobile Access

The dashboard is fully responsive and works on mobile:
1. Start local server on your Mac
2. Get your Mac's local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. On phone, navigate to: `http://YOUR_IP:8080/dashboard.html`
4. Login with same credentials

## 🎨 Customization

The dashboard is a single HTML file. You can customize:
- **Colors**: Edit CSS variables in `<style>` section
- **Logo**: Add your logo image
- **Features**: Add new tabs or actions
- **Filters**: Add more filtering options

## 📊 Example Workflow

**Morning Check**:
1. Open dashboard
2. View stats → Check revenue and activity
3. Review subscriptions → Any new Pro signups?
4. Check for suspended accounts

**Granting Beta Access**:
1. User emails asking for beta access
2. Get their GitHub username
3. Find Installation ID in subscriptions list
4. Grant Pro tier with reason "Beta program"
5. Notify user they now have Pro access

**Monthly Review**:
1. Filter by "Pro" tier
2. Check overage usage
3. Review any suspended accounts
4. Look for growth trends in stats

## 🔗 Related Documentation

- **Admin API Reference**: `../packages/github-app/ADMIN_API.md`
- **Subscription System**: `../docs/confluence/06-Subscription-System.md`
- **Database Schema**: `../docs/confluence/04-Database-Schema.md`

## 💡 Tips

1. **Bookmark it**: Add to browser bookmarks for quick access
2. **Keep API key safe**: Store in password manager
3. **Check regularly**: Monitor daily for new signups
4. **Use filters**: Narrow down to specific tiers or statuses
5. **Audit trail**: All actions are logged in `billing_events` table

---

**Security Note**: This dashboard is for local use only. Never deploy it publicly or commit the API key to git.
