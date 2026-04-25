import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { Subscription, SubscriptionStatus } from '../../src/subscriptions/schemas/subscription.schema';
import { Payment, PaymentMethod, PaymentStatus } from '../../src/subscriptions/schemas/payment.schema';

type EnvSnapshot = Record<string, string | undefined>;

const VNPAY_ENV_KEYS = [
  'VNPAY_TMN_CODE',
  'VNPAY_HASH_SECRET',
  'VNPAY_URL',
  'VNPAY_RETURN_URL',
] as const;

function captureEnv(keys: readonly string[]): EnvSnapshot {
  return keys.reduce((acc, key) => {
    acc[key] = process.env[key];
    return acc;
  }, {} as EnvSnapshot);
}

function restoreEnv(snapshot: EnvSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function signVnpayQuery(query: Record<string, string>, hashSecret: string) {
  const sortable = { ...query };
  delete sortable.vnp_SecureHash;
  delete sortable.vnp_SecureHashType;

  const sortedParams = Object.keys(sortable).sort().reduce((acc, key) => {
    acc[key] = sortable[key];
    return acc;
  }, {} as Record<string, string>);

  const signData = new URLSearchParams(sortedParams).toString();
  const secureHash = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return {
    ...sortedParams,
    vnp_SecureHash: secureHash,
  };
}

describe('Payments callback invariants contract (e2e)', () => {
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
  let hashSecret: string;
  let previousVnpayEnv: EnvSnapshot;

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

  async function createVnpayPayment() {
    const response = await request(app.getHttpServer())
      .post('/api/payments/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        familyId,
        planSlug: 'basic',
        method: 'vnpay',
      })
      .expect(200);

    return {
      paymentId: response.body.paymentId as string,
      subscriptionId: response.body.subscriptionId as string,
    };
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

  function buildSignedSuccessQuery(paymentId: string, amount: number, overrides: Record<string, string> = {}) {
    return signVnpayQuery(
      {
        vnp_TxnRef: paymentId,
        vnp_Amount: String(amount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionNo: `txn-invariant-${paymentId.slice(-6)}`,
        vnp_BankCode: 'NCB',
        ...overrides,
      },
      hashSecret,
    );
  }

  async function assertFailureAcrossEndpoints(
    query: Record<string, string>,
    paymentId: string,
    subscriptionId: string,
    expectedPaymentStatus: PaymentStatus,
    expectedSubscriptionStatus: SubscriptionStatus,
  ) {
    for (const endpoint of ['/api/payments/vnpay-return', '/api/payments/vnpay-verify']) {
      const response = await request(app.getHttpServer())
        .get(endpoint)
        .query(query)
        .expect(200);

      expect(response.body.success).toBe(false);
    }

    const payment = await paymentModel.findById(paymentId).exec();
    const subscription = await subscriptionModel.findById(subscriptionId).exec();

    expect(payment?.status).toBe(expectedPaymentStatus);
    expect(subscription?.status).toBe(expectedSubscriptionStatus);
  }

  beforeAll(async () => {
    previousVnpayEnv = captureEnv(VNPAY_ENV_KEYS);
    hashSecret = 'vnpay-invariants-secret';

    process.env.VNPAY_TMN_CODE = 'TSTCODE02';
    process.env.VNPAY_HASH_SECRET = hashSecret;
    process.env.VNPAY_URL = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    process.env.VNPAY_RETURN_URL = 'http://localhost:4200/payment/callback';

    context = await createE2eApp();
    app = context.app;
    familyModel = app.get(getModelToken(Family.name));
    userModel = app.get(getModelToken(User.name));
    subscriptionModel = app.get(getModelToken(Subscription.name));
    paymentModel = app.get(getModelToken(Payment.name));
    subscriptionsService = app.get(SubscriptionsService);

    restoreEnv(previousVnpayEnv);

    const family = await familyModel.create({
      name: 'Ngo',
      contactName: 'Ngo Payment Admin',
      contactPhone: '0900000301',
      address: 'Quang Nam',
    });
    familyId = family._id.toString();

    const admin = await userModel.create({
      fullName: 'Ngo Payment Admin',
      email: 'admin-vnpay-invariants@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.GIAM_DOC,
      assignedFamily: familyId,
      isEmailVerified: true,
    });
    adminUserId = admin._id.toString();

    await subscriptionsService.createFreeSubscription(adminUserId, familyId);
    adminToken = await login('admin-vnpay-invariants@example.com');
  });

  afterAll(async () => {
    restoreEnv(previousVnpayEnv);
    await closeE2eApp(context);
  });

  it('rejects signed VNPay success callbacks whose amount does not match the stored payment amount', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    await assertFailureAcrossEndpoints(
      buildSignedSuccessQuery(paymentId, payment!.amount + 1),
      paymentId,
      subscriptionId,
      PaymentStatus.PENDING,
      SubscriptionStatus.PENDING_PAYMENT,
    );
  });

  it('rejects signed VNPay success callbacks for payments whose stored method is BANK_TRANSFER', async () => {
    const { paymentId, subscriptionId } = await createBankTransferPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    expect(payment?.method).toBe(PaymentMethod.BANK_TRANSFER);

    await assertFailureAcrossEndpoints(
      buildSignedSuccessQuery(paymentId, payment!.amount),
      paymentId,
      subscriptionId,
      PaymentStatus.PENDING,
      SubscriptionStatus.PENDING_PAYMENT,
    );
  });

  it('rejects signed VNPay success callbacks for payments that are no longer pending', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    await paymentModel.updateOne(
      { _id: paymentId },
      { status: PaymentStatus.FAILED },
    ).exec();

    await assertFailureAcrossEndpoints(
      buildSignedSuccessQuery(paymentId, payment!.amount),
      paymentId,
      subscriptionId,
      PaymentStatus.FAILED,
      SubscriptionStatus.PENDING_PAYMENT,
    );
  });

  it('rejects signed VNPay success callbacks when the linked subscription is no longer pending payment', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    await subscriptionModel.updateOne(
      { _id: subscriptionId },
      { status: SubscriptionStatus.CANCELLED },
    ).exec();

    await assertFailureAcrossEndpoints(
      buildSignedSuccessQuery(paymentId, payment!.amount),
      paymentId,
      subscriptionId,
      PaymentStatus.PENDING,
      SubscriptionStatus.CANCELLED,
    );
  });
});
