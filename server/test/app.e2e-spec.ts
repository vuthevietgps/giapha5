import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from './helpers/e2e-app.helper';

describe('AppController (e2e)', () => {
  let context: E2eAppContext;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('/api (GET)', () => {
    return request(context.app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });
});
