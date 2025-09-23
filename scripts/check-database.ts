import { db } from '../server/db';
import { companies, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkDatabase() {
  console.log('🔍 Checking database contents...');

  try {
    // Check companies in both environments
    const allCompanies = await db.select().from(companies);
    console.log(`📊 Total companies in database: ${allCompanies.length}`);
    console.log('Companies by environment:');
    allCompanies.forEach(company => {
      console.log(`  - ${company.name} (${company.id}) - Environment: ${company.environment}`);
    });

    // Check users in both environments
    const allUsers = await db.select().from(users);
    console.log(`👥 Total users in database: ${allUsers.length}`);
    console.log('Users by environment:');
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - Environment: ${user.environment} - Role: ${user.role}`);
    });

    console.log('✅ Database check completed');
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();
