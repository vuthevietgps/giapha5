import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { Subscription } from '../../src/subscriptions/schemas/subscription.schema';
import { Payment } from '../../src/subscriptions/schemas/payment.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';

describe('Billing policy drift contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionModel: Model<Subscription>;
  let paymentModel: Model<Payment>;
  let subscriptionsService: SubscriptionsService;

  let familyAId: string;
  let familyBId: string;
  let paymentId: string;

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

  async function createUser(payload: {
    fullName: string;
    email: string;
    role: UserRole;
    assignedFamily?: string;
    managedFamilies?: string[];
  }) {
    return userModel.create({
      fullName: payload.fullName,
      email: payload.email,
      password: await bcrypt.hash('StrongPass123', 10),
      role: payload.role,
      assignedFamily: payload.assignedFamily,
      managedFamilies: payload.managedFamilies || [],
      isEmailVerified: true,
    });
  }

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    paymentModel = app.get(getModelToken(Payment.name));
    subscriptionsService = app.get(SubscriptionsService);

    const familyA = await familyModel.create({
      name: 'Pham',
      contactName: 'Pham Contact',
      contactPhone: '0900011111',
      address: 'Ha Noi',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Do',
      contactName: 'Do Contact',
      contactPhone: '0900011112',
      address: 'Da Nang',
    });
    familyBId = familyB._id.toString();

    const creator = await createUser({
      fullName: 'Creator A',
      email: 'billing-creator@example.com',
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyAId,
    });

    await createUser({
      fullName: 'Employee Reader A',
      email: 'billing-reader-employee@example.com',
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyAId,
    });

    await createUser({
      fullName: 'Family Head A',
      email: 'billing-reader-head@example.com',
      role: UserRole.TRUONG_HO,
      assignedFamily: familyAId,
    });

    await createUser({
      fullName: 'Manager A',
      email: 'billing-manager@example.com',
      role: UserRole.QUAN_LY,
      managedFamilies: [familyAId],
    });

    await createUser({
      fullName: 'Director Global',
      email: 'billing-director@example.com',
      role: UserRole.GIAM_DOC,
    });

    await subscriptionsService.createFreeSubscription(creator._id.toString(), familyAId);
    const paid = await subscriptionsService.createPaidSubscription(
      creator._id.toString(),
      familyAId,
      'basic',
      'BANK_TRANSFER',
    );
    paymentId = (paid.payment as any)._id.toString();
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('denies creator-drift access to old-family payment status and billing rows after reassignment', async () => {
    await userModel.updateOne(
      { email: 'billing-creator@example.com' },
      { assignedFamily: familyBId },
    ).exec();

    const creatorToken = await login('billing-creator@example.com');

    await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(404);

    const billingRows = await request(app.getHttpServer())
      .get('/api/subscriptions/payments')
      .set('Authorization', `Bearer ${creatorToken}`)
      .expect(200);

    expect(billingRows.body).toEqual([]);
  });

  it('blocks same-family low-privilege readers from payment status while keeping manager/director access', async () => {
    const employeeToken = await login('billing-reader-employee@example.com');
    const headToken = await login('billing-reader-head@example.com');
    const managerToken = await login('billing-manager@example.com');
    const directorToken = await login('billing-director@example.com');

    await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${headToken}`)
      .expect(404);

    const managerResult = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(managerResult.body.id).toBe(paymentId);

    const directorResult = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200);

    expect(directorResult.body.id).toBe(paymentId);
  });
});
