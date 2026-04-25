import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleFactoryOptions } from '@nestjs/mongoose';

const DEFAULT_MONGODB_URI = 'mongodb://localhost:27017/giapha';
const mongoLogger = new Logger('MongoConfig');

export type MongoTargetDetails = {
  host: string;
  dbName: string | null;
  authSource: string | null;
};

export function sanitizeMongoUri(uri: string): string {
  return uri.replace(
    /(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/,
    '$1$2:<redacted>@',
  );
}

export function describeMongoUri(uri: string): MongoTargetDetails | null {
  try {
    const parsed = new URL(uri);
    return {
      host: parsed.host,
      dbName: parsed.pathname.replace(/^\//, '') || null,
      authSource: parsed.searchParams.get('authSource'),
    };
  } catch {
    return null;
  }
}

export function applyMongoAuthSource(
  uri: string,
  authSource?: string | null,
): string {
  const normalizedUri = uri.trim();
  const normalizedAuthSource = authSource?.trim();

  if (!normalizedAuthSource) {
    return normalizedUri;
  }

  try {
    const parsed = new URL(normalizedUri);
    if (!parsed.searchParams.get('authSource')) {
      parsed.searchParams.set('authSource', normalizedAuthSource);
    }
    return parsed.toString();
  } catch {
    return normalizedUri;
  }
}

export function resolveMongoUri(
  configService?: Pick<ConfigService, 'get'>,
): string {
  const rawUri = (
    configService?.get<string>('MONGODB_URI') ??
    process.env.MONGODB_URI ??
    DEFAULT_MONGODB_URI
  ).trim();
  const authSource =
    configService?.get<string>('MONGODB_AUTH_SOURCE') ??
    process.env.MONGODB_AUTH_SOURCE;

  return applyMongoAuthSource(rawUri, authSource);
}

export function createMongooseConfig(
  configService?: ConfigService,
): MongooseModuleFactoryOptions {
  const uri = resolveMongoUri(configService);
  const details = describeMongoUri(uri);

  if (details) {
    mongoLogger.log(
      `Connecting to ${details.host}/${details.dbName ?? '(default)'} authSource=${details.authSource ?? '(default)'}`,
    );
  } else {
    mongoLogger.log(`Connecting with URI ${sanitizeMongoUri(uri)}`);
  }

  return { uri };
}
