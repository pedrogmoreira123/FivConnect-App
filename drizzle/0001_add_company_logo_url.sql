-- Add logo_url column to companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

