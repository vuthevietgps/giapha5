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
import { Subscription, SubscriptionDocument } from '../../src/subscriptions/schemas/subscription.schema';
import { Payment, PaymentDocument } from '../../src/subscriptions/schemas/payment.schema';

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

describe('Billing audit trail contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionModel: Model<SubscriptionDocument>;
  let paymentModel: Model<PaymentDocument>;
  let subscriptionsService: SubscriptionsService;

  let familyAId: string;
  let familyBId: string;
  let employeeUserId: string;
  let managerAToken: string;
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

  async function createBankTransferPayment() {
    const result = await subscriptionsService.createPaidSubscription(
      employeeUserId,
      familyAId,
      'basic',
      'BANK_TRANSFER',
    );

    return {
      paymentId: (result.payment as any)._id.toString(),
      subscriptionId: (result.subscription as any)._id.toString(),
    };
  }

  async function createVnpayPayment() {
    const result = await subscriptionsService.createPaidSubscription(
      employeeUserId,
      familyAId,
      'basic',
      'VNPAY',
    );

    return {
      paymentId: (result.payment as any)._id.toString(),
      subscriptionId: (result.subscription as any)._id.toString(),
    };
  }

  function buildSignedReturnQuery(paymentId: string, amount: number, transactionNo: string) {
    return signVnpayQuery(
      {
        vnp_TxnRef: paymentId,
        vnp_Amount: String(amount * 100),
        vnp_ResponseCode: '00',
        vnp_TransactionNo: transactionNo,
        vnp_BankCode: 'NCB',
      },
      hashSecret,
    );
  }

  async function fetchAudit(token: string, entity: string, entityId: string) {
    const response = await request(app.getHttpServer())
      .get(`/api/audit?entity=${entity}&entityId=${entityId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    return response.body as any[];
  }

  beforeAll(async () => {
    previousVnpayEnv = captureEnv(VNPAY_ENV_KEYS);
    hashSecret = 'billing-audit-secret';

    process.env.VNPAY_TMN_CODE = 'AUDITCODE';
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

    const familyA = await familyModel.create({
      name: 'Hoang',
      contactName: 'Hoang Contact',
      contactPhone: '0900030001',
      address: 'Ha Noi',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Bui',
      contactName: 'Bui Contact',
      contactPhone: '0900030002',
      address: 'Nam Dinh',
    });
    familyBId = familyB._id.toString();

    const employee = await userModel.create({
      fullName: 'Billing Employee',
      email: 'billing-audit-employee@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyAId,
      isEmailVerified: true,
    });
    employeeUserId = employee._id.toString();

    await userModel.create({
      fullName: 'Manager A',
      email: 'billing-audit-manager@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.QUAN_LY,
      managedFamilies: [familyAId],
      isEmailVerified: true,
    });

    await userModel.create({
      fullName: 'Manager B',
      email: 'billing-audit-outsider@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.QUAN_LY,
      managedFamilies: [familyBId],
      isEmailVerified: true,
    });

    await subscriptionsService.createFreeSubscription(employeeUserId, familyAId);

    managerAToken = await login('billing-audit-manager@example.com');
    outsiderManagerToken = await login('billing-audit-outsider@example.com');
  });

  afterAll(async () => {
    restoreEnv(previousVnpayEnv);
    await closeE2eApp(context);
  });

  it('writes family-scoped audit rows for manual payment confirmation and hides them from outsider managers', async () => {
    const { paymentId, subscriptionId } = await createBankTransferPayment();

    await request(app.getHttpServer())
      .post('/api/payments/confirm')
      .set('Authorization', `Bearer ${managerAToken}`)
      .send({
        paymentId,
        transactionId: `manual-${paymentId.slice(-6)}`,
      })
      .expect(200);

    const paymentAudit = await fetchAudit(managerAToken, 'payment', paymentId);
    expect(paymentAudit).toHaveLength(1);
    expect(paymentAudit[0].action).toBe('update');
    expect(paymentAudit[0].family).toBe(familyAId);
    expect(paymentAudit[0].actor).toBeDefined();
    expect(paymentAudit[0].before.status).toBe('PENDING');
    expect(paymentAudit[0].after.status).toBe('SUCCESS');

    const subscriptionAudit = await fetchAudit(managerAToken, 'subscription', subscriptionId);
    expect(subscriptionAudit).toHaveLength(1);
    expect(subscriptionAudit[0].action).toBe('update');
    expect(subscriptionAudit[0].family).toBe(familyAId);
    expect(subscriptionAudit[0].actor).toBe(paymentAudit[0].actor);
    expect(subscriptionAudit[0].before.status).toBe('PENDING_PAYMENT');
    expect(subscriptionAudit[0].after.status).toBe('ACTIVE');

    const outsiderPaymentAudit = await fetchAudit(outsiderManagerToken, 'payment', paymentId);
    const outsiderSubscriptionAudit = await fetchAudit(outsiderManagerToken, 'subscription', subscriptionId);
    expect(outsiderPaymentAudit).toEqual([]);
    expect(outsiderSubscriptionAudit).toEqual([]);
  });

  it('writes system-scoped audit rows for signed VNPay success callbacks and keeps them family-filtered', async () => {
    const { paymentId, subscriptionId } = await createVnpayPayment();
    const payment = await paymentModel.findById(paymentId).exec();

    await request(app.getHttpServer())
      .get('/api/payments/vnpay-return')
      .query(buildSignedReturnQuery(paymentId, payment!.amount, `vnp-${paymentId.slice(-6)}`))
      .expect(200);

    const paymentAudit = await fetchAudit(managerAToken, 'payment', paymentId);
    expect(paymentAudit).toHaveLength(1);
    expect(paymentAudit[0].family).toBe(familyAId);
    expect(paymentAudit[0].actor).toBe('system');
    expect(paymentAudit[0].before.status).toBe('PENDING');
    expect(paymentAudit[0].after.status).toBe('SUCCESS');

    const subscriptionAudit = await fetchAudit(managerAToken, 'subscription', subscriptionId);
    expect(subscriptionAudit).toHaveLength(1);
    expect(subscriptionAudit[0].family).toBe(familyAId);
    expect(subscriptionAudit[0].actor).toBe('system');
    expect(subscriptionAudit[0].before.status).toBe('PENDING_PAYMENT');
    expect(subscriptionAudit[0].after.status).toBe('ACTIVE');

    const outsiderPaymentAudit = await fetchAudit(outsiderManagerToken, 'payment', paymentId);
    const outsiderSubscriptionAudit = await fetchAudit(outsiderManagerToken, 'subscription', subscriptionId);
    expect(outsiderPaymentAudit).toEqual([]);
    expect(outsiderSubscriptionAudit).toEqual([]);
  });
});
