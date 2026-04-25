import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AppModule } from '../../src/app.module';

export type E2eAppContext = {
  app: INestApplication;
  mongoServer: MongoMemoryReplSet;
};

export async function createE2eApp(): Promise<E2eAppContext> {
  const mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
      storageEngine: 'wiredTiger',
    },
  });

  process.env.MONGODB_URI = mongoServer.getUri('giapha-e2e');
  delete process.env.MONGODB_AUTH_SOURCE;

  // Force outbound mail to fail fast in tests instead of waiting on real SMTP.
  process.env.MAIL_HOST = '127.0.0.1';
  process.env.MAIL_PORT = '2525';
  process.env.MAIL_USER = '';
  process.env.MAIL_PASS = '';
  process.env.APP_URL = 'http://localhost:4200';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, mongoServer };
}

export async function closeE2eApp(context?: Partial<E2eAppContext>) {
  await context?.app?.close();
  await context?.mongoServer?.stop();
}
