import 'dotenv/config';
import mongoose from 'mongoose';
import { User, UserSchema } from '../src/users/schemas/user.schema';

async function run(){
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  console.log('Connecting to', uri);
  await mongoose.connect(uri);
  const UserModel = mongoose.model<User>('User', UserSchema, 'users');
  const users = await UserModel.find().lean();
  if(!users.length){
    console.log('No users found in collection.');
  } else {
    console.log(`Found ${users.length} users:`);
    for(const u of users){
      console.log(`- ${u.email} | ${u.fullName} | ${u.role}`);
    }
  }
  await mongoose.disconnect();
}
run().catch(err => { console.error(err); process.exit(1); });
