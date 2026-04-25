import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

describe('Payments VNPay contract (e2e)', () => {
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
  let outsiderFamilyId: string;
  let outsiderManagerToken: string;
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
      paymentUrl: response.body.paymentUrl as string,
    };
  }

  function buildSignedReturnQuery(paymentId: string, amount: number, overrides: Record<string, string> = {}) {
    return signVnpayQuery(
      {
        vnp_TxnRef: paymentId,
        vnp_Amount: String(amount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionNo: `txn-${paymentId.slice(-6)}`,
        vnp_BankCode: 'NCB',
        ...overrides,
      },
      hashSecret,
    );
  }

  function buildInvalidSignatureQuery(paymentId: string, amount: number, overrides: Record<string, string> = {}) {
    return {
      ...buildSignedReturnQuery(paymentId, amount, overrides),
      vnp_SecureHash: 'tampered-signature',
    };
  }

  beforeAll(async () => {
    previousVnpayEnv = captureEnv(VNPAY_ENV_KEYS);
    hashSecret = 'vnpay-secret-test';

    process.env.VNPAY_TMN_CODE = 'TSTCODE01';
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
      name: 'Pham',
      contactName: 'Pham Admin',
      contactPhone: '0900000101',
      address: 'Ha Noi',
    });
    familyId = family._id.toString();

    const outsiderFamily = await familyModel.create({
      name: 'Do',
      contactName: 'Do Manager',
      contactPhone: '0900000102',
      address: 'Da Nang',
    });
    outsiderFamilyId = outsiderFamily._id.toString();

    const admin = await userModel.create({
      fullName: 'Pham Admin',
      email: 'admin-vnpay@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.GIAM_DOC,
      assignedFamily: familyId,
      isEmailVerified: true,
    });
    adminUserId = admin._id.toString();

    await subscriptionsService.createFreeSubscription(adminUserId, familyId);

    await userModel.create({
      fullName: 'Outsider Manager',
      email: 'outsider-manager-vnpay@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.QUAN_LY,
      managedFamilies: [outsiderFamilyId],
      isEmailVerified: true,
    });

    adminToken = await login('admin-vnpay@example.com');
    outsiderManagerToken = await login('outsider-manager-vnpay@example.com');
  });

  afterAll(async () => {
    restoreEnv(previousVnpayEnv);
    await closeE2eApp(context);
  });

  it('creates a VNPay checkout URL when gateway config is present and keeps payment/subscription pending', async () => {
    const { paymentId, subscriptionId, paymentUrl } = await createVnpayPayment();
    const url = new URL(paymentUrl);

    expect(url.origin + url.pathname).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(url.searchParams.get('vnp_TmnCode')).toBe('TSTCODE01');
    expect(url.searchParams.get('vnp_TxnRef')).toBe(paymentId);
    expect(url.searchParams.get('vnp_ReturnUrl')).toBe('http://localhost:4200/payment/callback');
    expect(url.searchParams.get('vnp_SecureHash')).toBeTruthy();

    const payment = await paymentModel.findById(paymentId).exec();
    const subscription = await subscriptionModel.findById(subscriptionId).exec();

    expect(payment?.method).toBe(PaymentMethod.VNPAY);
    expect(payment?.status).toBe(PaymentStatus.PENDING);
    expect(subscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('rejects invalid VNPay return signatures and leaves payment/subscription pending', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    const query = buildInvalidSignatureQuery(paymentId, payment!.amount);

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(query)
      .expect(200);

    expect(response.body.success).toBe(false);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.PENDING);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('returns failure for a signed unsuccessful VNPay callback and does not activate the paid subscription', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    const query = buildSignedReturnQuery(paymentId, payment!.amount, {
      vnp_ResponseCode: '24',
      vnp_TransactionNo: `txn-failed-${paymentId.slice(-6)}`,
    });

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(query)
      .expect(200);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('24');

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.PENDING);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('confirms payment on a signed successful VNPay return and activates the paid subscription', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();
    const transactionNo = `txn-return-${paymentId.slice(-6)}`;

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, {
        vnp_TransactionNo: transactionNo,
      }))
      .expect(200);

    expect(response.body.success).toBe(true);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    const activeSubscriptions = await subscriptionModel.find({
      family: new Types.ObjectId(familyId),
      status: SubscriptionStatus.ACTIVE,
    }).exec();

    expect(refreshedPayment?.status).toBe(PaymentStatus.SUCCESS);
    expect(refreshedPayment?.transactionId).toBe(transactionNo);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0]._id.toString()).toBe(subscriptionId);
  });

  it('confirms payment on signed VNPay verify when the return endpoint has not already done it', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();
    const transactionNo = `txn-verify-${paymentId.slice(-6)}`;

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-verify')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, {
        vnp_TransactionNo: transactionNo,
      }))
      .expect(200);

    expect(response.body.success).toBe(true);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.SUCCESS);
    expect(refreshedPayment?.transactionId).toBe(transactionNo);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
  });

  it('returns failure for a signed unsuccessful VNPay verify and does not activate the paid subscription', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-verify')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, {
        vnp_ResponseCode: '24',
        vnp_TransactionNo: `txn-verify-failed-${paymentId.slice(-6)}`,
      }))
      .expect(200);

    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('24');

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.PENDING);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('rejects invalid VNPay verify signatures and leaves payment/subscription pending', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    const query = buildInvalidSignatureQuery(paymentId, payment!.amount);

    const response = await request(app.getHttpServer())
      .get('/api/payments/vnpay-verify')
      .query(query)
      .expect(200);

    expect(response.body.success).toBe(false);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.PENDING);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('rejects manual confirmation from an out-of-scope family manager', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();

    await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${outsiderManagerToken}`)
      .send({
        paymentId,
        transactionId: `txn-outsider-${paymentId.slice(-6)}`,
      })
      .expect(404);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.PENDING);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.PENDING_PAYMENT);
  });

  it('keeps payment and subscription state stable on duplicate signed successful VNPay returns', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();
    const firstTransactionNo = `txn-return-first-${paymentId.slice(-6)}`;

    await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, {
        vnp_TransactionNo: firstTransactionNo,
      }))
      .expect(200);

    const subscriptionAfterFirstReturn = await subscriptionModel.findById(subscriptionId).lean().exec();
    const paymentAfterFirstReturn = await paymentModel.findById(paymentId).lean().exec();

    const secondResponse = await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, {
        vnp_TransactionNo: `txn-return-second-${paymentId.slice(-6)}`,
      }))
      .expect(200);

    expect(secondResponse.body.success).toBe(true);

    const refreshedPayment = await paymentModel.findById(paymentId).exec();
    const refreshedSubscription = await subscriptionModel.findById(subscriptionId).exec();
    expect(refreshedPayment?.status).toBe(PaymentStatus.SUCCESS);
    expect(refreshedPayment?.transactionId).toBe(firstTransactionNo);
    expect(refreshedSubscription?.status).toBe(SubscriptionStatus.ACTIVE);
    expect(refreshedSubscription?.startDate.toISOString()).toBe(subscriptionAfterFirstReturn?.startDate.toISOString());
    expect(refreshedSubscription?.endDate.toISOString()).toBe(subscriptionAfterFirstReturn?.endDate.toISOString());
    expect(paymentAfterFirstReturn?.paidAt?.toISOString()).toBeDefined();
    expect(refreshedPayment?.paidAt?.toISOString()).toBe(paymentAfterFirstReturn?.paidAt?.toISOString());
  });
});
