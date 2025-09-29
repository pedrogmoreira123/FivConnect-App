import 'dotenv/config';

import { hash } from 'bcryptjs';
import { db } from '../server/db.js';
import { companies, users, userCompanies } from '../shared/schema.js';

async function seed() {
  try {
    console.log('🌱 Starting seed process...');

    // Hash the password
    const hashedPassword = await hash('admin123', 12);
    console.log('✅ Password hashed successfully');

    // Use transaction to ensure data consistency
    await db.transaction(async (tx) => {
      // Insert company
      const [company] = await tx.insert(companies).values({
        name: 'Fi.V Connect',
        email: 'contato@fivconnect.net',
        status: 'active',
      }).returning({ id: companies.id });

      console.log('✅ Company created successfully');

      // Insert user
      const [user] = await tx.insert(users).values({
        name: 'Admin Padrão',
        username: 'admin',
        email: 'admin@fivconnect.net',
        password: hashedPassword,
        role: 'superadmin',
      }).returning({ id: users.id });

      console.log('✅ User created successfully');

      // Insert user-company relationship
      await tx.insert(userCompanies).values({
        userId: user.id,
        companyId: company.id,
        role: 'admin',
        isOwner: true,
      });

      console.log('✅ User-Company relationship created successfully');
    });

    console.log('✅ Seed completed: User "admin" and Company "Empresa Padrão" created successfully.');
    console.log('📧 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Email: admin@empresa.com');

  } catch (error) {
    console.error('❌ Error during seed process:', error);

    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        console.error('💡 It looks like the seed data already exists. Try using a different username or email.');
      } else {
        console.error('💡 Please check your database connection and try again.');
      }
    }

    process.exit(1);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the seed function
seed();
