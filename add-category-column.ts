// Script para adicionar coluna category à tabela conversations
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function addCategoryColumn() {
  try {
    console.log('🔄 Adicionando coluna category à tabela conversations...');
    
    // Executar migration
    await db.execute(sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS category VARCHAR(50);`);
    
    console.log('✅ Coluna category adicionada com sucesso!');
    
    // Verificar se foi criada
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'conversations' 
      AND column_name = 'category'
    `);
    
    console.log('📋 Verificação:', result.rows);
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error);
  } finally {
    process.exit(0);
  }
}

addCategoryColumn();
