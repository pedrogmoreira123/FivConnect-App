-- Migration: Update chatbot_configs to support multiple chatbots per company
-- Date: 2025-10-22
-- Description: Remove unique constraint from company_id and add name and whatsapp_connection_id fields

-- 1. Remover constraint unique de company_id (permite múltiplos chatbots por empresa)
ALTER TABLE chatbot_configs DROP CONSTRAINT IF EXISTS chatbot_configs_company_id_key;
ALTER TABLE chatbot_configs DROP CONSTRAINT IF EXISTS chatbot_configs_company_id_unique;

-- 2. Adicionar coluna name (nome identificador do chatbot)
ALTER TABLE chatbot_configs ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 3. Adicionar coluna whatsapp_connection_id (vinculação com canal)
ALTER TABLE chatbot_configs ADD COLUMN IF NOT EXISTS whatsapp_connection_id VARCHAR;

-- 4. Adicionar foreign key para whatsapp_connections
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'chatbot_configs_whatsapp_connection_id_fkey'
    ) THEN
        ALTER TABLE chatbot_configs
        ADD CONSTRAINT chatbot_configs_whatsapp_connection_id_fkey
        FOREIGN KEY (whatsapp_connection_id)
        REFERENCES whatsapp_connections(id)
        ON DELETE SET NULL;
    END IF;
END$$;

-- 5. Atualizar registros existentes (dar nome padrão para chatbots antigos)
UPDATE chatbot_configs
SET name = 'Chatbot Padrão'
WHERE name IS NULL OR name = '';

-- 6. Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN chatbot_configs.name IS 'Nome identificador do chatbot (ex: "Bot Atendimento", "IA Vendas")';
COMMENT ON COLUMN chatbot_configs.whatsapp_connection_id IS 'ID do canal WhatsApp vinculado a este chatbot (nullable)';

-- 7. Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_company_id ON chatbot_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_configs_whatsapp_connection_id ON chatbot_configs(whatsapp_connection_id);

-- Verificação final
SELECT 'Migration completed successfully!' AS status;
