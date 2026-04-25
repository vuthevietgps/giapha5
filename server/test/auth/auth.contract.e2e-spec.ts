import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Subscription } from '../../src/subscriptions/schemas/subscription.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';

describe('Auth contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  let familyModel: Model<FamilyDocument>;
  let subscriptionModel: Model<Subscription>;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    userModel = app.get(getModelToken(User.name));
    familyModel = app.get(getModelToken(Family.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('registers a family head and creates a free subscription', async () => {
    const email = 'founder@example.com';
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Founder User',
        email,
        password: 'StrongPass123',
        familyName: 'Pham',
        phone: '0900000000',
      })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.role).toBe(UserRole.TRUONG_HO);
    expect(response.body.user.assignedFamily).toBeDefined();

    const persistedUser = await userModel.findOne({ email }).exec();
    expect(persistedUser).toBeTruthy();

    const persistedFamily = await familyModel.findById(response.body.user.assignedFamily).exec();
    expect(persistedFamily?.name).toBe('Pham');

    const subscriptions = await subscriptionModel.find({ user: persistedUser!._id }).populate('plan').exec();
    expect(subscriptions).toHaveLength(1);
    expect((subscriptions[0].plan as any).slug).toBe('free');
  });

  it('rejects GET /api/auth/me without a bearer token', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401);
  });

  it('returns the authenticated profile and rotates refresh tokens', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'founder@example.com',
        password: 'StrongPass123',
      })
      .expect(200);

    const accessToken = loginResponse.body.accessToken;
    const refreshToken = loginResponse.body.refreshToken;

    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body.email).toBe('founder@example.com');
    expect(profileResponse.body.role).toBe(UserRole.TRUONG_HO);

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshed.body.accessToken).toBeDefined();
    expect(refreshed.body.refreshToken).toBeDefined();
    expect(refreshed.body.refreshToken).not.toBe(refreshToken);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
