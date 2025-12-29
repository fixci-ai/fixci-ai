# FixCI Confluence Documentation

This folder contains comprehensive documentation for FixCI, formatted for import into Confluence.

## Documentation Structure

1. **00-Home.md** - Landing page and navigation
2. **01-Overview.md** - Project overview, architecture, and technology stack
3. **02-Setup-Guide.md** - Complete setup and installation guide
4. **03-AI-Providers.md** - Multi-provider AI system, cost comparison, and optimization
5. **04-Database-Schema.md** - Database tables, queries, and data management
6. **05-API-Reference.md** - Webhook endpoints, functions, and API documentation
7. **06-Subscription-System.md** - ⚠️ **INTERNAL ONLY** - Subscription tiers, billing, and admin API

## ⚠️ Public vs Private Documentation

### Public Documentation (Safe to Share)
These docs can be shared publicly or with customers:
- **01-Overview.md** - General product information
- **02-Setup-Guide.md** - Installation and configuration
- **03-AI-Providers.md** - Provider comparison and optimization

### Internal Only (DO NOT SHARE)
These docs contain sensitive business logic and should remain private:
- **04-Database-Schema.md** - Internal database structure
- **05-API-Reference.md** - Implementation details
- **06-Subscription-System.md** - ⚠️ **CRITICAL** - Pricing, limits, admin controls
- **packages/github-app/ADMIN_API.md** - Admin API secrets (NOT in Confluence)

> **Note**: Admin API documentation (`ADMIN_API.md`) is excluded from git and should never be committed to GitHub or uploaded to Confluence. It's for local reference only.

## How to Import to Confluence

### Method 1: Automated Upload Script (Recommended)

Use the provided Node.js script to automatically upload all documentation:

```bash
# 1. Go to docs directory
cd docs

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your Confluence details

# 4. Run upload script
npm run upload
```

**Setup .env file**:
```bash
CONFLUENCE_SITE_URL=https://yourcompany.atlassian.net
CONFLUENCE_EMAIL=your.email@example.com
CONFLUENCE_API_TOKEN=get-from-atlassian-security-settings
CONFLUENCE_SPACE_KEY=FIXCI
```

**Get API Token**:
1. Visit https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "FixCI Docs Upload")
4. Copy the token to your .env file

The script will:
- Create a parent page "FixCI Documentation"
- Create all child pages in order
- Skip pages that already exist
- Show you the URLs to each created page

### Method 2: Manual Copy-Paste

1. Log in to your Confluence space
2. Create a new page for each markdown file
3. Copy the markdown content
4. Paste into Confluence (it will auto-convert to Confluence format)
5. Adjust formatting as needed

**Suggested page hierarchy**:
```
FixCI Documentation (Parent Page)
├── Overview
├── Setup Guide
├── AI Providers Guide
├── Database Schema Reference
└── API Reference
```

### Method 2: Markdown Import Plugin

Some Confluence instances have markdown import plugins:

1. Go to Confluence → Space Settings → Add-ons
2. Search for "Markdown" import plugin
3. Install if available
4. Use plugin to import .md files directly

### Method 3: Confluence CLI (Advanced)

If you have the Confluence CLI tool:

```bash
# Install Confluence CLI
npm install -g confluence-cli

# Configure
confluence-cli configure

# Create pages
confluence-cli create-page --space YOUR_SPACE --title "FixCI Overview" --file 01-Overview.md
confluence-cli create-page --space YOUR_SPACE --title "Setup Guide" --file 02-Setup-Guide.md
# ... repeat for each file
```

### Method 4: Using Atlassian MCP (If Configured)

If you have Atlassian MCP server configured with Claude Code, you can create pages programmatically:

```javascript
// Example usage (requires Atlassian MCP)
await mcp__atlassian__createConfluencePage({
  cloudId: "your-cloud-id",
  spaceId: "your-space-id",
  title: "FixCI Overview",
  body: "content from 01-Overview.md",
  contentFormat: "markdown"
});
```

## Formatting Notes

### Code Blocks

Markdown:
````markdown
```javascript
const x = 1;
```
````

Confluence: Will auto-convert to code macro

### Tables

Markdown tables are supported by Confluence and will convert automatically.

### Links

Update these placeholders before publishing:
- `YOUR-SUBDOMAIN` → Your Cloudflare Workers subdomain
- `YOUR_REPO_URL` → Your GitHub repository URL
- Internal doc links may need adjustment based on your Confluence page structure

### Emojis

Confluence supports emojis. These will render correctly:
- ✅ ⚠️ 🔧 🚀 🧠 ⚡

## Customization Checklist

Before publishing to Confluence, update these placeholders:

- [ ] Replace `YOUR-SUBDOMAIN` with your Cloudflare subdomain
- [ ] Replace `YOUR_REPO_URL` with your GitHub repository URL
- [ ] Add actual support channel links
- [ ] Update "Last Updated" dates
- [ ] Add your organization's branding if needed
- [ ] Customize examples with your repo names
- [ ] Add team-specific contact information

## Suggested Confluence Space Setup

### Space Name
`FixCI` or `FixCI Documentation`

### Space Key
`FIXCI`

### Page Template

Create a page template with:
- Header with FixCI logo
- Navigation sidebar
- Footer with "Last Updated" and "Support" links

### Labels

Add these labels to pages for easy filtering:
- `fixci`
- `ci-cd`
- `github-actions`
- `cloudflare`
- `ai`
- `documentation`

### Page Restrictions

**CRITICAL**: Set appropriate permissions in Confluence:

**Public Access** (Anyone in org can view):
- 01-Overview.md
- 02-Setup-Guide.md
- 03-AI-Providers.md

**Restricted Access** (Engineering/Admin only):
- 04-Database-Schema.md
- 05-API-Reference.md
- 06-Subscription-System.md ⚠️ **HIGHLY SENSITIVE**

**Never Upload to Confluence**:
- packages/github-app/ADMIN_API.md (contains admin API key usage)
- Any files with actual API keys or secrets

## Maintenance

### Keeping Docs Updated

1. Update markdown files in this folder when making changes
2. Regenerate/update Confluence pages
3. Use Confluence's version history to track changes
4. Set up a review schedule (monthly recommended)

### Version Control

These markdown files are version-controlled in git. Consider:
- Creating a doc branch for updates
- Reviewing doc changes in PRs
- Syncing Confluence after merging doc updates

## Additional Resources

After importing, consider creating these additional Confluence pages:

- **FAQ** - Common questions and answers
- **Troubleshooting Guide** - Extended troubleshooting scenarios
- **Use Cases** - Real-world examples from your team
- **Release Notes** - Version history and changes
- **Roadmap** - Planned features and improvements

## Support

If you need help with Confluence import:
- Contact your Confluence administrator
- Review Atlassian's [Markdown Import Guide](https://confluence.atlassian.com/)
- Check if your instance has markdown plugins available

---

**Documentation Version**: 1.0
**Last Updated**: 2025-12-27
**Format**: GitHub-Flavored Markdown
