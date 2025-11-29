/*
  Migrate user.role values from legacy set to new family-specific roles.
  Safe to run multiple times (idempotent).
  Reads MongoDB connection from MONGODB_URI.
*/
import 'dotenv/config';
import mongoose from 'mongoose';

// Minimal User model for direct updates
const userSchema = new mongoose.Schema(
  { role: { type: String } },
  { collection: 'users' }
);
const User = mongoose.model('User', userSchema);

const LEGACY_TO_NEW: Record<string, string> = {
  GIAM_DOC: 'ADMIN_DONG_HO',
  QUAN_LY: 'BIEN_TAP_DONG_HO',
  NHAN_VIEN: 'THANH_VIEN',
};

const NEW_ROLES = new Set([
  'ADMIN_DONG_HO',
  'BIEN_TAP_DONG_HO',
  'THANH_VIEN',
  'KHACH',
]);

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  console.log(`[migrate-roles] Connecting to ${uri} ...`);
  await mongoose.connect(uri);

  const before = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('[migrate-roles] Before:', before);

  let totalMatched = 0;
  let totalModified = 0;
  for (const [legacy, modern] of Object.entries(LEGACY_TO_NEW)) {
    const res = await User.updateMany({ role: legacy }, { $set: { role: modern } });
    totalMatched += res.matchedCount ?? 0;
    totalModified += res.modifiedCount ?? 0;
    if ((res.modifiedCount ?? 0) > 0) {
      console.log(`  Updated ${res.modifiedCount} user(s): ${legacy} -> ${modern}`);
    }
  }

  // Any role not in the new allowed set becomes KHACH as a fallback
  const unknownRes = await User.updateMany(
    { role: { $nin: Array.from(NEW_ROLES) } },
    { $set: { role: 'KHACH' } }
  );
  if ((unknownRes.modifiedCount ?? 0) > 0) {
    console.log(`  Normalized ${unknownRes.modifiedCount} user(s) with unknown roles -> KHACH`);
  }

  const after = await User.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  console.log('[migrate-roles] After:', after);
  console.log('[migrate-roles] Done. Matched:', totalMatched, 'Modified:', totalModified + (unknownRes.modifiedCount ?? 0));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[migrate-roles] Failed:', err);
  process.exit(1);
});
