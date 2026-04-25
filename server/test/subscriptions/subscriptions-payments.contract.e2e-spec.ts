import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { Subscription, SubscriptionStatus } from '../../src/subscriptions/schemas/subscription.schema';
import { Payment, PaymentMethod, PaymentStatus } from '../../src/subscriptions/schemas/payment.schema';

describe('Subscriptions and payments contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionModel: Model<Subscription>;
  let paymentModel: Model<Payment>;
  let subscriptionsService: SubscriptionsService;
  let adminToken: string;
  let adminUserId: string;
  let familyId: string;
  let duplicateCreateFamilyId: string;
  let concurrentCreateFamilyId: string;

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    paymentModel = app.get(getModelToken(Payment.name));
    subscriptionsService = app.get(SubscriptionsService);

    const family = await familyModel.create({
      name: 'Le',
      contactName: 'Le Admin',
      contactPhone: '0900000001',
      address: 'Ho Chi Minh City',
    });
    familyId = family._id.toString();

    const duplicateCreateFamily = await familyModel.create({
      name: 'Ngo',
      contactName: 'Ngo Admin',
      contactPhone: '0900000002',
      address: 'Da Nang',
    });
    duplicateCreateFamilyId = duplicateCreateFamily._id.toString();

    const concurrentCreateFamily = await familyModel.create({
      name: 'Bui',
      contactName: 'Bui Admin',
      contactPhone: '0900000003',
      address: 'Hai Phong',
    });
    concurrentCreateFamilyId = concurrentCreateFamily._id.toString();

    const admin = await userModel.create({
      fullName: 'Le Admin',
      email: 'admin-payments@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.GIAM_DOC,
      assignedFamily: familyId,
      isEmailVerified: true,
    });
    adminUserId = admin._id.toString();

    await subscriptionsService.createFreeSubscription(adminUserId, familyId);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin-payments@example.com',
        password: 'StrongPass123',
      })
      .expect(200);

    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('keeps GET /api/subscriptions/plans public and sorted', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/subscriptions/plans')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(4);
    expect(response.body[0].slug).toBe('free');
    expect(response.body.every((plan: any) => plan.isActive === true)).toBe(true);
  });

  it('rejects invalid member family payload with 400 instead of crashing in plan-limit enforcement', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Broken Member',
        family: 'not-a-valid-object-id',
      })
      .expect(400);

    expect(String(response.body.message)).toContain('family');
  });

  it('reuses the same pending subscription and payment on duplicate bank-transfer create requests', async () => {
    const firstCreate = await request(app.getHttpServer())
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyId: duplicateCreateFamilyId,
        planSlug: 'basic',
        method: 'bank_transfer',
      })
      .expect(200);

    const secondCreate = await request(app.getHttpServer())
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyId: duplicateCreateFamilyId,
        planSlug: 'basic',
        method: 'bank_transfer',
      })
      .expect(200);

    expect(secondCreate.body.paymentId).toBe(firstCreate.body.paymentId);
    expect(secondCreate.body.subscriptionId).toBe(firstCreate.body.subscriptionId);

    const pendingSubscriptions = await subscriptionModel.find({
      user: new Types.ObjectId(adminUserId),
      family: new Types.ObjectId(duplicateCreateFamilyId),
      status: SubscriptionStatus.PENDING_PAYMENT,
    }).exec();
    expect(pendingSubscriptions).toHaveLength(1);

    const pendingPayments = await paymentModel.find({
      user: new Types.ObjectId(adminUserId),
      subscription: pendingSubscriptions[0]._id,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.BANK_TRANSFER,
    }).exec();
    expect(pendingPayments).toHaveLength(1);
  });

  it('reuses the same pending subscription and payment under concurrent bank-transfer create requests', async () => {
    const [firstCreate, secondCreate] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          familyId: concurrentCreateFamilyId,
          planSlug: 'basic',
          method: 'bank_transfer',
        }),
      request(app.getHttpServer())
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          familyId: concurrentCreateFamilyId,
          planSlug: 'basic',
          method: 'bank_transfer',
        }),
    ]);

    expect([firstCreate.status, secondCreate.status]).toEqual([200, 200]);
    expect(secondCreate.body.paymentId).toBe(firstCreate.body.paymentId);
    expect(secondCreate.body.subscriptionId).toBe(firstCreate.body.subscriptionId);

    const pendingSubscriptions = await subscriptionModel.find({
      user: new Types.ObjectId(adminUserId),
      family: new Types.ObjectId(concurrentCreateFamilyId),
      status: SubscriptionStatus.PENDING_PAYMENT,
    }).exec();
    expect(pendingSubscriptions).toHaveLength(1);

    const pendingPayments = await paymentModel.find({
      user: new Types.ObjectId(adminUserId),
      subscription: pendingSubscriptions[0]._id,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.BANK_TRANSFER,
    }).exec();
    expect(pendingPayments).toHaveLength(1);
  });

  it('creates, confirms, and re-confirms a bank transfer payment without double-activating subscriptions', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyId,
        planSlug: 'basic',
        method: 'bank_transfer',
      })
      .expect(200);

    expect(createResponse.body.method).toBe('bank_transfer');
    expect(createResponse.body.paymentId).toBeDefined();
    expect(createResponse.body.subscriptionId).toBeDefined();
    expect(createResponse.body.bankInfo.amount).toBeGreaterThan(0);

    const paymentId = createResponse.body.paymentId;
    const subscriptionId = createResponse.body.subscriptionId;

    const pendingStatus = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(pendingStatus.body.status).toBe(PaymentStatus.PENDING);

    const firstConfirm = await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentId,
        transactionId: 'txn-001',
      })
      .expect(200);

    expect(firstConfirm.body.success).toBe(true);
    expect(firstConfirm.body.payment.status).toBe(PaymentStatus.SUCCESS);

    const activeAfterFirstConfirm = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();
    expect(activeAfterFirstConfirm).toHaveLength(1);
    expect(activeAfterFirstConfirm[0]._id.toString()).toBe(subscriptionId);
    const firstActivatedStartDate = activeAfterFirstConfirm[0].startDate.toISOString();
    const firstActivatedEndDate = activeAfterFirstConfirm[0].endDate.toISOString();

    const secondConfirm = await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentId,
        transactionId: 'txn-001-repeat',
      })
      .expect(200);

    expect(secondConfirm.body.success).toBe(true);

    const finalStatus = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(finalStatus.body.status).toBe(PaymentStatus.SUCCESS);

    const activeSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();
    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0]._id.toString()).toBe(subscriptionId);

    const expiredSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.EXPIRED,
    }).exec();
    expect(expiredSubscriptions.length).toBeGreaterThanOrEqual(1);

    const payment = await paymentModel.findById(paymentId).exec();
    expect(payment?.status).toBe(PaymentStatus.SUCCESS);
    expect(payment?.transactionId).toBe('txn-001');
    expect(activeSubscriptions[0].startDate.toISOString()).toBe(firstActivatedStartDate);
    expect(activeSubscriptions[0].endDate.toISOString()).toBe(firstActivatedEndDate);
  });
});
