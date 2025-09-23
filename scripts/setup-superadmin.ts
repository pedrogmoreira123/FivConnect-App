import bcrypt from 'bcryptjs';
import { storage } from '../server/storage';
import { users, companies, userCompanies } from '../shared/schema';

async function setupSuperAdmin() {
  console.log('🚀 Starting superadmin setup...');

  // Get configuration from environment variables
  const superAdminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@fivapp.com';
  const superAdminUsername = process.env.SUPERADMIN_USERNAME || 'superadmin';
  const superAdminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
  const superAdminName = process.env.SUPERADMIN_NAME || 'Super Administrator';
  const companyName = process.env.COMPANY_NAME || 'Fi.V App Main Company';
  const companyEmail = process.env.COMPANY_EMAIL || 'admin@fivapp.com';
  const companyPhone = process.env.COMPANY_PHONE || '+5511999999999';
  const companyDocument = process.env.COMPANY_DOCUMENT || '12.345.678/0001-90';

  try {
    // Check if superadmin user already exists
    let superAdminUser = await storage.getUserByEmail(superAdminEmail);

    if (!superAdminUser) {
      console.log('👤 Creating superadmin user...');

      // Hash the password
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

      // Create the superadmin user
      superAdminUser = await storage.createUser({
        name: superAdminName,
        username: superAdminUsername,
        email: superAdminEmail,
        password: hashedPassword,
        role: 'superadmin',
        isOnline: true
      });

      console.log(`✅ Superadmin user created with ID: ${superAdminUser.id}`);
    } else {
      console.log(`👤 Superadmin user already exists with ID: ${superAdminUser.id}`);
    }

    // Check if company already exists (we'll use the company name as identifier)
    let company = await storage.getAllCompanies().then(companies =>
      companies.find(c => c.name === companyName)
    );

    if (!company) {
      console.log('🏢 Creating company...');

      // Create the company
      company = await storage.createCompany({
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        document: companyDocument,
        status: 'active',
        maxUsers: 100,
        maxConnections: 10,
        maxQueues: 50
      });

      console.log(`✅ Company created with ID: ${company.id}`);
    } else {
      console.log(`🏢 Company already exists with ID: ${company.id}`);
    }

    // Check if user-company relationship already exists
    const existingUserCompany = await storage.getUserCompany(superAdminUser.id, company.id);

    if (!existingUserCompany) {
      console.log('🔗 Linking superadmin user to company...');

      // Link the user to the company as owner
      await storage.createUserCompany({
        userId: superAdminUser.id,
        companyId: company.id,
        role: 'owner',
        isActive: true,
        isOwner: true
      });

      console.log('✅ Superadmin user linked to company as owner');
    } else {
      console.log('🔗 User-company relationship already exists');
    }

    // Set up some basic company settings
    console.log('⚙️ Setting up company settings...');

    const settingsToSet = [
      { key: 'primaryColor', value: '#3B82F6' },
      { key: 'secondaryColor', value: '#64748B' },
      { key: 'companyName', value: companyName },
      { key: 'whatsappConnected', value: 'false' }
    ];

    for (const setting of settingsToSet) {
      await storage.setCompanySetting({
        companyId: company.id,
        key: setting.key,
        value: setting.value
      });
    }

    console.log('✅ Company settings configured');

    console.log('\n🎉 Superadmin setup completed successfully!');
    console.log(`📧 Superadmin Email: ${superAdminEmail}`);
    console.log(`👤 Superadmin Username: ${superAdminUsername}`);
    console.log(`🔑 Superadmin Password: ${superAdminPassword}`);
    console.log(`🏢 Company Name: ${companyName}`);
    console.log(`🏢 Company ID: ${company.id}`);
    console.log(`👤 User ID: ${superAdminUser.id}`);

    console.log('\n💡 You can now log in with the superadmin credentials above.');

  } catch (error) {
    console.error('❌ Error during superadmin setup:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupSuperAdmin()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupSuperAdmin };
