/**
 * Configuração do banco de dados com Drizzle
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../shared/schema.js';

// Configuração da conexão
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);

// Instância do Drizzle
export const db = drizzle(client, { schema });

export default db;

