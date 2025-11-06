import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

import { db } from './db.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';

async function runMigration() {
  try {
    console.log('🔄 Running company_invites migration...');

    const migrationSQL = fs.readFileSync('./migrations/add-company-invites.sql', 'utf-8');

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
