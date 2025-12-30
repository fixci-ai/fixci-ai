-- Add email and company fields to installations table

ALTER TABLE installations ADD COLUMN contact_email TEXT;
ALTER TABLE installations ADD COLUMN company_name TEXT;

-- Show current installations
SELECT installation_id, account_login, contact_email, company_name FROM installations;
