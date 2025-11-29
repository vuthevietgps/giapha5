import * as dotenv from 'dotenv';
import { connect } from 'mongoose';
import { User, UserSchema } from '../src/users/schemas/user.schema';
import * as bcrypt from 'bcryptjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';

async function createAdminUsers() {
  await connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const UserModel = require('mongoose').model('User', UserSchema);

  const adminUsers = [
    {
      fullName: 'Nguyễn Văn Admin 1',
      email: 'admin1@giapha.test',
      password: 'Admin@123',
      role: 'ADMIN_DONG_HO'
    },
    {
      fullName: 'Trần Thị Admin 2', 
      email: 'admin2@giapha.test',
      password: 'Admin@123',
      role: 'ADMIN_DONG_HO'
    },
    {
      fullName: 'Lê Văn Admin 3',
      email: 'admin3@giapha.test', 
      password: 'Admin@123',
      role: 'ADMIN_DONG_HO'
    }
  ];

  for (const userData of adminUsers) {
    try {
      const existingUser = await UserModel.findOne({ email: userData.email }).exec();
      if (existingUser) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 10);
      const user = new UserModel({
        ...userData,
        password: passwordHash,
        managedFamilies: [] // Initialize empty array for family assignments
      });

      await user.save();
      console.log(`Created admin user: ${userData.email}`);
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error);
    }
  }

  console.log('\nAdmin users creation completed!');
  console.log('\nCreated admin accounts:');
  console.log('Email: admin1@giapha.test | Password: Admin@123 | Role: ADMIN_DONG_HO');
  console.log('Email: admin2@giapha.test | Password: Admin@123 | Role: ADMIN_DONG_HO');
  console.log('Email: admin3@giapha.test | Password: Admin@123 | Role: ADMIN_DONG_HO');
  console.log('\nThese accounts can be assigned to manage families by SUPER_ADMIN');

  process.exit(0);
}

createAdminUsers().catch(console.error);