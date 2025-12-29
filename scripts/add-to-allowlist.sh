#!/bin/bash
# Add GitHub account to FixCI allowlist

if [ -z "$1" ]; then
    echo "Usage: ./add-to-allowlist.sh <github-username> [notes]"
    echo "Example: ./add-to-allowlist.sh my-test-org 'Testing account'"
    exit 1
fi

ACCOUNT="$1"
NOTES="${2:-Added via script}"

echo "Adding $ACCOUNT to allowlist..."

npx wrangler d1 execute fixci-db --remote --command "
INSERT INTO allowlist (account_login, notes)
VALUES ('$ACCOUNT', '$NOTES')
ON CONFLICT(account_login) DO UPDATE SET notes = '$NOTES'
"

echo "✅ Done! $ACCOUNT is now allowed to use FixCI"
echo ""
echo "To view all allowed accounts:"
echo "npx wrangler d1 execute fixci-db --command 'SELECT * FROM allowlist'"
