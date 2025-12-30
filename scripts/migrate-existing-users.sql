-- Migration script: Create users and installation_members for existing installations
-- Run after 002-add-user-management.sql has been applied

-- Create users from existing contact_email entries
INSERT OR IGNORE INTO users (email)
SELECT DISTINCT contact_email
FROM installations
WHERE contact_email IS NOT NULL;

-- Create installation_members relationships with 'owner' role
INSERT OR IGNORE INTO installation_members (user_id, installation_id, role)
SELECT u.id, i.installation_id, 'owner'
FROM installations i
JOIN users u ON u.email = i.contact_email
WHERE i.contact_email IS NOT NULL;

-- Show migration results
SELECT
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT im.installation_id) as installations_with_owners
FROM users u
LEFT JOIN installation_members im ON u.id = im.user_id;
