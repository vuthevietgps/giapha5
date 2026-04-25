import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { Subscription, SubscriptionDocument } from '../../src/subscriptions/schemas/subscription.schema';

describe('Billing report visibility contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionModel: Model<SubscriptionDocument>;
  let subscriptionsService: SubscriptionsService;

  let familyAId: string;
  let familyBId: string;

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email,
        password: 'StrongPass123',
      })
      .expect(200);

    return response.body.accessToken as string;
  }

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    subscriptionsService = app.get(SubscriptionsService);

    const familyA = await familyModel.create({
      name: 'Nguyen',
      contactName: 'Nguyen Contact',
      contactPhone: '0900020001',
      address: 'Ha Noi',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Le',
      contactName: 'Le Contact',
      contactPhone: '0900020002',
      address: 'Hai Phong',
    });
    familyBId = familyB._id.toString();

    const creator = await userModel.create({
      fullName: 'Subscription Creator',
      email: 'subscription-creator@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyAId,
      isEmailVerified: true,
    });

    await subscriptionsService.createFreeSubscription(creator._id.toString(), familyAId);
    await subscriptionsService.createPaidSubscription(
      creator._id.toString(),
      familyAId,
      'basic',
      'BANK_TRANSFER',
    );
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('revokes old-family subscriptions from GET /api/subscriptions/my after reassignment drift', async () => {
    const beforeReassignment = await login('subscription-creator@example.com');

    const baseline = await request(app.getHttpServer())
      .get('/api/subscriptions/my')
      .set('Authorization', `Bearer ${beforeReassignment}`)
      .expect(200);

    expect(baseline.body).toHaveLength(2);
    expect(baseline.body.every((item: any) => item.family.id === familyAId)).toBe(true);

    await userModel.updateOne(
      { email: 'subscription-creator@example.com' },
      { assignedFamily: familyBId },
    ).exec();

    const afterReassignment = await login('subscription-creator@example.com');

    const result = await request(app.getHttpServer())
      .get('/api/subscriptions/my')
      .set('Authorization', `Bearer ${afterReassignment}`)
      .expect(200);

    expect(result.body).toEqual([]);

    const stored = await subscriptionModel.find({}).lean().exec();
    expect(stored).toHaveLength(2);
  });
});
