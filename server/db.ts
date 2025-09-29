import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@shared/schema';

// Validação da variável de ambiente
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set. Did you forget to update your environment configuration?'
  );
}

// Cria a pool de conexão usando o driver 'pg' padrão
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Inicializa o Drizzle com a pool do PostgreSQL
export const db = drizzle(pool, { schema });
