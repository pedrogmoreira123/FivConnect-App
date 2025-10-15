-- Migration para adicionar campos de prioridade e categoria
-- Data: 2025-10-15
-- Descrição: Adiciona campo category para melhor organização dos tickets/conversas

-- Para PostgreSQL
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Para MySQL (comentado - usar apenas se necessário)
-- ALTER TABLE conversations ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Verificar se as colunas foram criadas
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'conversations' 
-- AND column_name IN ('priority', 'category', 'tags');
