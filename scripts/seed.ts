import { Sequelize } from 'sequelize-typescript';
import { Company } from '../db/models/Company';
import { User, UserRole } from '../db/models/User';

// Import DB config from JSON
const dbConfig = require('../db/config/config.json').development;

async function main() {
  const sequelize = new Sequelize({
    ...dbConfig,
    models: [Company, User],
  });

  await sequelize.authenticate();

  // Only seed if tables are empty and not in production
  if (process.env.NODE_ENV !== 'production') {
    const companyCount = await Company.count();
    const userCount = await User.count();

    if (companyCount === 0 && userCount === 0) {
      // Create one company
      const company = await Company.create({ name: 'Acme Corp' });

      // Create users with different roles
      const users = [
        { name: 'Alice Accountant', role: UserRole.accountant },
        { name: 'Bob Accountant', role: UserRole.accountant },
        { name: 'Charlie Secretary', role: UserRole.corporateSecretary },
        { name: 'Dana Secretary', role: UserRole.corporateSecretary },
        { name: 'Eve Director', role: 'director' }, // Add director role if not in enum
        { name: 'Frank Director', role: 'director' },
      ];

      for (const user of users) {
        await User.create({ ...user, companyId: company.id });
      }

      console.log('Sample company and users created.');
    } else {
      console.log('Tables are not empty. Skipping seeding.');
    }
  } else {
    console.log('Seeding skipped in production environment.');
  }

  await sequelize.close();
}

main();
