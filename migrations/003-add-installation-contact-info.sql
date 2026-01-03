-- Add contact information columns to installations table
ALTER TABLE installations ADD COLUMN contact_email TEXT;
ALTER TABLE installations ADD COLUMN company_name TEXT;
