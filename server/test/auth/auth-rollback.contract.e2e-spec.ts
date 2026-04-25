import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { Subscription } from '../../src/subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../../src/users/schemas/user.schema';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';

describe('Auth rollback contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let userModel: Model<UserDocument>;
  let familyModel: Model<FamilyDocument>;
  let subscriptionModel: Model<Subscription>;
  let subscriptionsService: SubscriptionsService;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    userModel = app.get(getModelToken(User.name));
    familyModel = app.get(getModelToken(Family.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    subscriptionsService = app.get(SubscriptionsService);
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('rolls back register side effects when free subscription creation fails and allows a clean retry', async () => {
    const email = 'rollback-founder@example.com';
    const familyName = 'Rollback Family';

    const createFreeSpy = jest
      .spyOn(subscriptionsService, 'createFreeSubscription')
      .mockRejectedValueOnce(new Error('forced free subscription failure'));

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Rollback Founder',
        email,
        password: 'StrongPass123',
        familyName,
        phone: '0900000202',
      })
      .expect(500);

    createFreeSpy.mockRestore();

    const failedUser = await userModel.findOne({ email }).exec();
    const failedFamily = await familyModel.findOne({ name: familyName }).exec();
    const failedSubscriptions = await subscriptionModel.countDocuments().exec();

    expect(failedUser).toBeNull();
    expect(failedFamily).toBeNull();
    expect(failedSubscriptions).toBe(0);

    const retry = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'Rollback Founder',
        email,
        password: 'StrongPass123',
        familyName,
        phone: '0900000202',
      })
      .expect(201);

    expect(retry.body.user.email).toBe(email);
    expect(retry.body.user.assignedFamily).toBeDefined();

    const persistedUser = await userModel.findOne({ email }).exec();
    const persistedFamily = await familyModel.findById(retry.body.user.assignedFamily).exec();
    const subscriptions = await subscriptionModel.find({ user: persistedUser!._id }).exec();

    expect(persistedUser).toBeTruthy();
    expect(persistedFamily?.name).toBe(familyName);
    expect(subscriptions).toHaveLength(1);
  });
});
