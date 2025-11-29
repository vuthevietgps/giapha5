import 'dotenv/config';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { User, UserSchema, UserRole } from '../src/users/schemas/user.schema';

async function createSuperAdmin() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@giapha.system';
  const fullName = process.env.SUPER_ADMIN_NAME || 'Giám đốc hệ thống';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const UserModel = mongoose.model<User>('User', UserSchema, 'users');

  const existing = await UserModel.findOne({ email }).lean();
  const pwdHash = await hash(password, 10);

  if (existing) {
    await UserModel.updateOne(
      { email },
      { $set: { fullName, role: UserRole.SUPER_ADMIN, password: pwdHash } }
    );
    console.log(`Updated existing super admin: ${email}`);
  } else {
    await UserModel.create({
      email,
      fullName,
      role: UserRole.SUPER_ADMIN,
      password: pwdHash,
      managedFamilies: [] // Super admin manages all
    });
    console.log(`Created super admin: ${email}`);
  }

  console.log('\nSuper Admin credentials:');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role: SUPER_ADMIN');
  console.log('\nThis account can:');
  console.log('- Create/manage all family admins');
  console.log('- Create new families');
  console.log('- View system-wide reports');
  console.log('- Manage system configuration');

  await mongoose.disconnect();
}

createSuperAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});