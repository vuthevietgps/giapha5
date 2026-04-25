/**
 * Migration script: Convert string ObjectId references to proper ObjectId types.
 *
 * Many members/unions have `family`, `father`, `mother`, `spouse`, `position`
 * stored as strings instead of ObjectId. This causes query mismatches when
 * code uses `new Types.ObjectId(...)` for comparison.
 *
 * Run: npx ts-node scripts/fix_objectid_fields.ts
 */
import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/giapha';

const REF_FIELDS_BY_COLLECTION: Record<string, string[]> = {
  members: ['family', 'father', 'mother', 'spouse', 'position'],
  unions: ['family'], // partners is an array of ObjectIds
  subscriptions: ['family'],
  payments: ['family'],
  backgrounds: ['family'],
  posts: ['family'],
};

async function fixCollection(db: any, collectionName: string, fields: string[]) {
  const col = db.collection(collectionName);
  const docs = await col.find({}).toArray();
  let fixedCount = 0;

  for (const doc of docs) {
    const updates: Record<string, any> = {};

    for (const field of fields) {
      const val = doc[field];
      if (typeof val === 'string' && ObjectId.isValid(val) && val.length === 24) {
        updates[field] = new ObjectId(val);
      }
    }

    // Fix array-of-ObjectId fields (e.g., unions.partners)
    if (collectionName === 'unions' && Array.isArray(doc.partners)) {
      const fixed = doc.partners.map((p: any) => {
        if (typeof p === 'string' && ObjectId.isValid(p) && p.length === 24) {
          return new ObjectId(p);
        }
        return p;
      });
      const hasStringPartner = doc.partners.some((p: any) => typeof p === 'string');
      if (hasStringPartner) {
        updates.partners = fixed;
      }
    }

    if (Object.keys(updates).length > 0) {
      await col.updateOne({ _id: doc._id }, { $set: updates });
      fixedCount++;
    }
  }

  return { total: docs.length, fixed: fixedCount };
}

async function main() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log(`Connected to database: ${db.databaseName}`);

  for (const [collection, fields] of Object.entries(REF_FIELDS_BY_COLLECTION)) {
    const result = await fixCollection(db, collection, fields);
    console.log(`[${collection}] ${result.fixed}/${result.total} documents fixed (fields: ${fields.join(', ')})`);
  }

  console.log('\nMigration complete!');
  await client.close();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
