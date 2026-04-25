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

describe('Payments confirm atomicity contract (e2e)', () => {
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

  async function createBankTransferPayment() {
    const response = await request(app.getHttpServer())
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyId,
        planSlug: 'basic',
        method: 'bank_transfer',
      })
      .expect(200);

    return {
      paymentId: response.body.paymentId as string,
      subscriptionId: response.body.subscriptionId as string,
    };
  }

  beforeAll(async () => {
    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    paymentModel = app.get(getModelToken(Payment.name));
    subscriptionsService = app.get(SubscriptionsService);

    const family = await familyModel.create({
      name: 'Hoang',
      contactName: 'Hoang Admin',
      contactPhone: '0900000201',
      address: 'Hue',
    });
    familyId = family._id.toString();

    const admin = await userModel.create({
      fullName: 'Hoang Admin',
      email: 'admin-atomicity@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.GIAM_DOC,
      assignedFamily: familyId,
      isEmailVerified: true,
    });
    adminUserId = admin._id.toString();

    await subscriptionsService.createFreeSubscription(adminUserId, familyId);
    adminToken = await login('admin-atomicity@example.com');
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('does not leave payment SUCCESS if activation fails after confirmation starts', async () => {
    const { paymentId, subscriptionId } = await createBankTransferPayment();

    const activateSpy = jest
      .spyOn(subscriptionsService, 'activateSubscription')
      .mockRejectedValueOnce(new Error('forced activation failure'));

    await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentId,
        transactionId: 'txn-atomicity-fail',
      })
      .expect(500);

    activateSpy.mockRestore();

    const payment = await paymentModel.findById(paymentId).exec();
    const subscription = await subscriptionModel.findById(subscriptionId).exec();
    const activeSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    expect(payment?.method).toBe(PaymentMethod.BANK_TRANSFER);
    expect(payment?.status).toBe(PaymentStatus.PENDING);
    expect(payment?.transactionId).toBeUndefined();
    expect(payment?.paidAt).toBeUndefined();
    expect(subscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0].user.toString()).toBe(adminUserId);

    await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        paymentId,
        transactionId: 'txn-atomicity-retry',
      })
      .expect(200);

    const healedPayment = await paymentModel.findById(paymentId).exec();
    const healedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    const healedActiveSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    expect(healedPayment?.status).toBe(PaymentStatus.SUCCESS);
    expect(healedPayment?.transactionId).toBe('txn-atomicity-retry');
    expect(healedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(healedActiveSubscriptions).toHaveLength(1);
    expect(healedActiveSubscriptions[0]._id.toString()).toBe(subscriptionId);
  });

  it('keeps confirm idempotent under concurrent manual confirmation requests', async () => {
    const { paymentId, subscriptionId } = await createBankTransferPayment();

    const [first, second] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId,
          transactionId: 'txn-race-1',
        }),
      request(app.getHttpServer())
        .post('/api/payments/confirm')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId,
          transactionId: 'txn-race-2',
        }),
    ]);

    expect([first.status, second.status]).toEqual([200, 200]);

    const payment = await paymentModel.findById(paymentId).exec();
    const subscription = await subscriptionModel.findById(subscriptionId).exec();
    const activeSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    expect(payment?.status).toBe(PaymentStatus.SUCCESS);
    expect(['txn-race-1', 'txn-race-2']).toContain(payment?.transactionId);
    expect(subscription?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0]._id.toString()).toBe(subscriptionId);
  });
});
