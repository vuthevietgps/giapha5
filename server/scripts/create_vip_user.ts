import 'dotenv/config';
import mongoose from 'mongoose';
import { hash } from 'bcryptjs';
import { User, UserRole, UserSchema } from '../src/users/schemas/user.schema';
import { resolveMongoUri } from '../src/config/mongodb.config';

const DEFAULT_VIP_EMAIL = 'vip@giapha.local';
const DEFAULT_VIP_PASSWORD = 'Vip@123456';
const DEFAULT_VIP_NAME = 'Tai khoan VIP';

async function run() {
  const uri = resolveMongoUri();
  const email = (process.env.VIP_EMAIL || DEFAULT_VIP_EMAIL).toLowerCase().trim();
  const password = process.env.VIP_PASSWORD || DEFAULT_VIP_PASSWORD;
  const fullName = (process.env.VIP_FULL_NAME || DEFAULT_VIP_NAME).trim();

  console.log(`[vip] Connecting to database for ${email}`);
  await mongoose.connect(uri);

  const UserModel = mongoose.model<User>('User', UserSchema, 'users');
  const passwordHash = await hash(password, 10);

  const update = {
    $set: {
      fullName,
      email,
      password: passwordHash,
      role: UserRole.GIAM_DOC,
      managedFamilies: [],
      assignedFamily: undefined,
      isEmailVerified: true,
    },
    $unset: {
      emailVerifyToken: 1,
      emailVerifyExpires: 1,
      passwordResetToken: 1,
      passwordResetExpires: 1,
      refreshToken: 1,
    },
  };

  const user = await UserModel.findOneAndUpdate(
    { email },
    update,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  ).exec();

  console.log('[vip] VIP account is ready');
  console.log(`[vip] Email: ${email}`);
  console.log(`[vip] Password: ${password}`);
  console.log(`[vip] Role: ${user?.role ?? UserRole.GIAM_DOC}`);

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('[vip] Failed to create VIP account');
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
