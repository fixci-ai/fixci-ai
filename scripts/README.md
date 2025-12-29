# FixCI Management Scripts

## Allowlist Management

FixCI uses an allowlist to control which GitHub accounts can use the service during private beta.

### View Current Allowlist

```bash
./scripts/view-allowlist.sh
```

Shows all accounts currently allowed to use FixCI.

### Add Account to Allowlist

```bash
./scripts/add-to-allowlist.sh <github-username> [notes]
```

**Examples:**
```bash
# Add a user
./scripts/add-to-allowlist.sh john-doe "Beta tester"

# Add an organization
./scripts/add-to-allowlist.sh my-company "Customer account"

# Add without notes
./scripts/add-to-allowlist.sh test-user
```

### Remove Account from Allowlist

```bash
npx wrangler d1 execute fixci-db --remote --command \
  "DELETE FROM allowlist WHERE account_login = 'username'"
```

## How It Works

1. **GitHub App can be public** - Anyone can install it
2. **Allowlist enforces access** - Only approved accounts get AI analysis
3. **Non-allowlisted users** get a friendly message to join the waitlist
4. **Easy management** - Add/remove accounts with simple commands

## Current Allowed Accounts

- `fixci-ai` - Main FixCI organization
- `veghadam` - Personal account

## Making the App Public

Once you're ready for public beta:

1. Go to: https://github.com/settings/apps/fixci-ai
2. Click **"Make this GitHub App public"**
3. All installations will still be checked against the allowlist
4. Gradually add beta users to the allowlist

---

**Questions?** Check the main project README or contact support@fixci.dev
