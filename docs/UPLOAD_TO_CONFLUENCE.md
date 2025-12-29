# Upload FixCI Documentation to Confluence

> **Important**: Internal documentation should ONLY be uploaded to Confluence, NOT committed to GitHub.

## Your Confluence Space

Based on your previous setup, you have access to:
- **Confluence URL**: https://ai-documents.atlassian.net
- **Space**: Software Development (or create a new "FixCI" space)

## What to Upload

### ✅ Safe for GitHub (Public Docs)
These can stay in the GitHub repo:
- `docs/confluence/00-Home.md`
- `docs/confluence/01-Overview.md`
- `docs/confluence/02-Setup-Guide.md`
- `docs/confluence/03-AI-Providers.md`
- `docs/confluence/README.md`

### 🔒 Upload to Confluence ONLY (Never GitHub)
These are now excluded from git:
- `docs/confluence/04-Database-Schema.md`
- `docs/confluence/05-API-Reference.md`
- `docs/confluence/06-Subscription-System.md` ⚠️ **HIGHLY SENSITIVE**
- `packages/github-app/ADMIN_API.md`

## How to Upload to Confluence

### Option 1: Direct Copy-Paste (Easiest)

1. Go to https://ai-documents.atlassian.net
2. Navigate to your "Software Development" space (or create "FixCI" space)
3. Create parent page: "FixCI Documentation"
4. For each markdown file:
   - Click "+ Create" → "Page"
   - Set parent to "FixCI Documentation"
   - Paste the markdown content
   - Confluence auto-converts markdown to their format
   - Click "Publish"

### Option 2: Using Claude Code with Atlassian MCP

If you have Atlassian MCP configured, you can ask Claude to upload:

```
Claude, please upload the FixCI documentation to Confluence:
- Space: Software Development
- Create pages for 04-Database-Schema.md, 05-API-Reference.md, and 06-Subscription-System.md
```

## Set Confluence Permissions

**CRITICAL**: After uploading, restrict access:

1. Go to each page → ⋯ → Restrictions
2. Set permissions:

**Database Schema (04)**:
- View: Engineering team only
- Edit: Administrators only

**API Reference (05)**:
- View: Engineering team only
- Edit: Administrators only

**Subscription System (06)** ⚠️ **MOST SENSITIVE**:
- View: Founders/Admin only
- Edit: Founders only

**Admin API** (packages/github-app/ADMIN_API.md):
- Don't upload to Confluence
- Keep locally only
- Share via secure channel if needed

## Verification

After upload, verify:
- [ ] All 3 internal docs are in Confluence
- [ ] Permissions are correctly restricted
- [ ] No sensitive docs in GitHub (run `git status`)
- [ ] Admin API doc is not uploaded anywhere

## Confluence Page Structure

```
FixCI Documentation
├── 00-Home (Public)
├── 01-Overview (Public)
├── 02-Setup Guide (Public)
├── 03-AI Providers (Public)
├── 04-Database Schema (🔒 Engineering only)
├── 05-API Reference (🔒 Engineering only)
└── 06-Subscription System (🔒 Founders only)
```

## Why Not GitHub?

These docs contain:
- Exact database schema (security risk)
- Subscription pricing logic (competitive advantage)
- Admin API usage (could be exploited)
- Internal implementation details (proprietary)
- Billing system architecture (business sensitive)

Keeping them in Confluence:
- ✅ Access control per doc
- ✅ Audit trail of who viewed what
- ✅ Easy to update without git commits
- ✅ Can grant temporary access
- ✅ No public exposure risk

## Quick Upload Commands

If you want to use the Atlassian API directly:

```bash
# Get your Confluence space ID
curl https://ai-documents.atlassian.net/wiki/rest/api/space?type=global

# Create a page (requires API token)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "page",
    "title": "Database Schema",
    "space": {"key": "YOUR_SPACE_KEY"},
    "body": {
      "storage": {
        "value": "MARKDOWN_CONTENT_HERE",
        "representation": "storage"
      }
    }
  }' \
  https://ai-documents.atlassian.net/wiki/rest/api/content
```

---

**Remember**: NEVER commit the internal docs to GitHub. They're now protected by .gitignore.
