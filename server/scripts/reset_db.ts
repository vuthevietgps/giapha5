/*
  Reset MongoDB database for the project.
  Drops the entire database defined by MONGODB_URI (or the default).
  Use with caution in development only.
*/
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';
  console.log(`[db:reset] Connecting to ${uri} ...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB connection');

  const name = await db.databaseName;
  console.log(`[db:reset] Dropping database '${name}' ...`);
  await db.dropDatabase();
  console.log('[db:reset] Done.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[db:reset] Failed:', err);
  process.exit(1);
});
