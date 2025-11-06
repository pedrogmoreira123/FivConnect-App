-- Migration: Add chatbot_configs table
-- Date: 2025-01-22
-- Description: Add multi-tenant chatbot configuration table

CREATE TABLE IF NOT EXISTS chatbot_configs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'disabled' CHECK (mode IN ('simple_bot', 'ai_agent', 'disabled')),
  is_enabled BOOLEAN DEFAULT false,

  -- Simple Bot Configuration (JSON)
  simple_bot_config JSONB,

  -- AI Agent Configuration (JSON - API keys encrypted)
  ai_agent_config JSONB,

  -- Trigger Rules (JSON)
  trigger_rules JSONB,

  -- Environment separation
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('development', 'production')),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on company_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_company_id ON chatbot_configs(company_id);

-- Create index on company_id + environment for multi-tenant filtering
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_company_env ON chatbot_configs(company_id, environment);

-- Create trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_chatbot_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chatbot_configs_updated_at
  BEFORE UPDATE ON chatbot_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_chatbot_configs_updated_at();

COMMENT ON TABLE chatbot_configs IS 'Multi-tenant chatbot configuration for companies';
COMMENT ON COLUMN chatbot_configs.mode IS 'Chatbot mode: simple_bot (rule-based), ai_agent (AI-powered), or disabled';
COMMENT ON COLUMN chatbot_configs.simple_bot_config IS 'Configuration for simple rule-based chatbot (welcome messages, delays, etc.)';
COMMENT ON COLUMN chatbot_configs.ai_agent_config IS 'Configuration for AI agent (provider, prompts, API keys - encrypted)';
COMMENT ON COLUMN chatbot_configs.trigger_rules IS 'Rules for triggering bot behavior (business hours, transfer keywords, etc.)';
