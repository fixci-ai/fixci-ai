#!/bin/bash
# View all accounts in the FixCI allowlist

echo "📋 FixCI Allowlist:"
echo ""

npx wrangler d1 execute fixci-db --remote --command "
SELECT
  account_login as 'Account',
  account_type as 'Type',
  added_at as 'Added',
  notes as 'Notes'
FROM allowlist
ORDER BY added_at DESC
"
