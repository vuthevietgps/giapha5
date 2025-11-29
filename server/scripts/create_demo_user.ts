import 'dotenv/config';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { User, UserSchema, UserRole } from '../src/users/schemas/user.schema';

async function run(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  const email = process.env.DEMO_EMAIL || 'demo@giapha.local';
  const fullName = process.env.DEMO_FULLNAME || 'Tài khoản Demo';
  const password = process.env.DEMO_PASSWORD || 'Demo@123';
  const role = (process.env.DEMO_ROLE as UserRole) || UserRole.ADMIN_DONG_HO;

  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const UserModel = mongoose.model<User>('User', UserSchema, 'users');

  const existing = await UserModel.findOne({ email }).select('+password').lean();
  const pwdHash = await hash(password, 10);

  if (existing){
    await UserModel.updateOne({ email }, { $set: { fullName, role, password: pwdHash } });
    console.log(`Updated existing demo user: ${email}`);
  } else {
    await UserModel.create({ email, fullName, role, password: pwdHash });
    console.log(`Created demo user: ${email}`);
  }

  console.log('Login credentials');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Role:', role);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
