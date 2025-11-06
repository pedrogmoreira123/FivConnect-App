-- Migration: Add company_invites table and update companies table
-- Date: 2025-01-22
-- Description: Sistema de convites para primeiro acesso + novos campos em companies

-- 1. Criar tabela de convites
CREATE TABLE IF NOT EXISTS company_invites (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT fk_company_invite_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_company_invites_token ON company_invites(token);
CREATE INDEX IF NOT EXISTS idx_company_invites_company ON company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_email ON company_invites(email);
CREATE INDEX IF NOT EXISTS idx_company_invites_expires ON company_invites(expires_at);

-- 2. Adicionar novos campos na tabela companies (se não existirem)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS document VARCHAR(20); -- CNPJ/CPF
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50);

-- Adicionar comentários
COMMENT ON TABLE company_invites IS 'Convites para primeiro acesso de empresas cadastradas';
COMMENT ON COLUMN company_invites.token IS 'Token único para validação do convite (UUID)';
COMMENT ON COLUMN company_invites.expires_at IS 'Data de expiração do convite (7 dias após criação)';
COMMENT ON COLUMN company_invites.used_at IS 'Data em que o convite foi utilizado (null = não utilizado)';

COMMENT ON COLUMN companies.contact_name IS 'Nome do responsável pela empresa';
COMMENT ON COLUMN companies.contact_email IS 'Email do responsável (usado no convite)';
COMMENT ON COLUMN companies.document IS 'CNPJ ou CPF da empresa';
COMMENT ON COLUMN companies.phone IS 'Telefone de contato da empresa';
COMMENT ON COLUMN companies.subscription_plan IS 'Plano de assinatura (basic, professional, enterprise)';
