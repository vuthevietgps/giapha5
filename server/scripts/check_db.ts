import 'dotenv/config';
import { MongoClient } from 'mongodb';
import {
  describeMongoUri,
  resolveMongoUri,
  sanitizeMongoUri,
} from '../src/config/mongodb.config';

async function main() {
  const uri = resolveMongoUri();
  const target = describeMongoUri(uri);

  if (target) {
    console.log(
      `[db:check] Target ${target.host}/${target.dbName ?? '(default)'} authSource=${target.authSource ?? '(default)'}`,
    );
  } else {
    console.log(`[db:check] Target ${sanitizeMongoUri(uri)}`);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    await client.db().command({ ping: 1 });
    console.log('[db:check] Connection OK');
  } catch (error) {
    const dbError = error as {
      name?: string;
      message?: string;
      code?: number;
      codeName?: string;
    };

    console.error(
      `[db:check] ${dbError.name ?? 'Error'}: ${dbError.message ?? 'Unknown error'}`,
    );

    if (dbError.code !== undefined || dbError.codeName) {
      console.error(
        `[db:check] code=${dbError.code ?? 'n/a'} codeName=${dbError.codeName ?? 'n/a'}`,
      );
    }

    if (/bad auth/i.test(dbError.message ?? '')) {
      console.error(
        '[db:check] Atlas is rejecting the username/password. Verify the database user still exists, reset the password, and update MONGODB_URI.',
      );
      console.error(
        '[db:check] If the password contains special characters like @ : / ? # or spaces, URL-encode it before placing it in MONGODB_URI.',
      );
      console.error(
        '[db:check] If your Atlas user authenticates against admin, add MONGODB_AUTH_SOURCE=admin to .env and re-run this check.',
      );
    }

    process.exitCode = 1;
  } finally {
    await client.close().catch(() => undefined);
  }
}

void main();
