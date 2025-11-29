import 'dotenv/config';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { User, UserSchema, UserRole } from '../src/users/schemas/user.schema';

async function upsertUser(UserModel: mongoose.Model<User>, fullName: string, email: string, role: UserRole, password: string){
  const pwdHash = await hash(password, 10);
  const existing = await UserModel.findOne({ email }).select('+password').lean();
  if (existing){
    await UserModel.updateOne({ email }, { $set: { fullName, role, password: pwdHash } });
    console.log(`Updated: ${email} (${role})`);
  } else {
    await UserModel.create({ fullName, email, role, password: pwdHash });
    console.log(`Created: ${email} (${role})`);
  }
}

async function run(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  const defaultPassword = process.env.TEST_USERS_PASSWORD || 'Test@123';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const UserModel = mongoose.model<User>('User', UserSchema, 'users');

  const users = [
    { fullName: 'Admin Dòng Họ', email: 'admin@test.giapha', role: UserRole.ADMIN_DONG_HO, password: defaultPassword },
    { fullName: 'Biên Tập Dòng Họ', email: 'bientap@test.giapha', role: UserRole.BIEN_TAP_DONG_HO, password: defaultPassword },
    { fullName: 'Thành Viên', email: 'thanhvien@test.giapha', role: UserRole.THANH_VIEN, password: defaultPassword },
    { fullName: 'Khách', email: 'khach@test.giapha', role: UserRole.KHACH, password: defaultPassword },
  ];

  for (const u of users){
    await upsertUser(UserModel, u.fullName, u.email, u.role, u.password);
  }

  console.log('\nTest users ready. Credentials:');
  for (const u of users){
    console.log(`- ${u.fullName} | ${u.email} | ${u.role} | ${u.password}`);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
