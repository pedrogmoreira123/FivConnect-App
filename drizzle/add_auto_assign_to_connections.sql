-- Add auto_assign_enabled column to whatsapp_connections table
ALTER TABLE whatsapp_connections
ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN DEFAULT false;
