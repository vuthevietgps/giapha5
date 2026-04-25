import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { closeE2eApp, createE2eApp, E2eAppContext } from '../helpers/e2e-app.helper';
import { Family, FamilyDocument } from '../../src/families/schemas/family.schema';
import { User, UserDocument, UserRole } from '../../src/users/schemas/user.schema';
import { SubscriptionsService } from '../../src/subscriptions/subscriptions.service';
import { Subscription } from '../../src/subscriptions/schemas/subscription.schema';
import { Payment, PaymentStatus } from '../../src/subscriptions/schemas/payment.schema';

describe('Subscriptions access contract (e2e)', () => {
  let context: E2eAppContext;
  let app: INestApplication;
  let familyModel: Model<FamilyDocument>;
  let userModel: Model<UserDocument>;
  let subscriptionModel: Model<Subscription>;
  let paymentModel: Model<Payment>;
  let subscriptionsService: SubscriptionsService;

  let familyAId: string;
  let familyBId: string;
  let employeeAToken: string;
  let managerAToken: string;
  let outsiderBToken: string;
  let paymentId: string;
  let outsiderPaymentId: string;

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

  async function createUserAndLogin(payload: {
    fullName: string;
    email: string;
    role: UserRole;
    assignedFamily?: string;
    managedFamilies?: string[];
  }) {
    await userModel.create({
      fullName: payload.fullName,
      email: payload.email,
      password: await bcrypt.hash('StrongPass123', 10),
      role: payload.role,
      assignedFamily: payload.assignedFamily,
      managedFamilies: payload.managedFamilies || [],
      isEmailVerified: true,
    });

    return login(payload.email);
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
      name: 'Tran',
      contactName: 'Tran Contact',
      contactPhone: '0900000011',
      address: 'Ha Noi',
    });
    familyAId = familyA._id.toString();

    const familyB = await familyModel.create({
      name: 'Vu',
      contactName: 'Vu Contact',
      contactPhone: '0900000012',
      address: 'Can Tho',
    });
    familyBId = familyB._id.toString();

    const employeeA = await userModel.create({
      fullName: 'Employee A',
      email: 'employee-a@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyAId,
      isEmailVerified: true,
    });

    const outsiderB = await userModel.create({
      fullName: 'Outsider B',
      email: 'outsider-b@example.com',
      password: await bcrypt.hash('StrongPass123', 10),
      role: UserRole.NHAN_VIEN,
      assignedFamily: familyBId,
      isEmailVerified: true,
    });

    await subscriptionsService.createFreeSubscription(employeeA._id.toString(), familyAId);
    await subscriptionsService.createFreeSubscription(outsiderB._id.toString(), familyBId);
    const paid = await subscriptionsService.createPaidSubscription(
      employeeA._id.toString(),
      familyAId,
      'basic',
      'BANK_TRANSFER',
    );
    paymentId = (paid.payment as any)._id.toString();

    const outsiderPaid = await subscriptionsService.createPaidSubscription(
      outsiderB._id.toString(),
      familyBId,
      'basic',
      'BANK_TRANSFER',
    );
    outsiderPaymentId = (outsiderPaid.payment as any)._id.toString();

    employeeAToken = await login('employee-a@example.com');

    managerAToken = await createUserAndLogin({
      fullName: 'Manager A',
      email: 'manager-a@example.com',
      role: UserRole.QUAN_LY,
      managedFamilies: [familyAId],
    });

    outsiderBToken = await login('outsider-b@example.com');
  });

  afterAll(async () => {
    await closeE2eApp(context);
  });

  it('returns only the caller subscriptions in GET /api/subscriptions/my', async () => {
    const employeeAResult = await request(app.getHttpServer())
      .get('/api/subscriptions/my')
      .set('Authorization', `Bearer ${employeeAToken}`)
      .expect(200);

    expect(employeeAResult.body).toHaveLength(2);
    expect(employeeAResult.body.every((item: any) => item.family.id === familyAId)).toBe(true);

    const outsiderResult = await request(app.getHttpServer())
      .get('/api/subscriptions/my')
      .set('Authorization', `Bearer ${outsiderBToken}`)
      .expect(200);

    expect(outsiderResult.body).toHaveLength(2);
    expect(outsiderResult.body.every((item: any) => item.family.id === familyBId)).toBe(true);
  });

  it('enforces family scope on GET /api/subscriptions/family/:familyId', async () => {
    const allowed = await request(app.getHttpServer())
      .get(`/api/subscriptions/family/${familyAId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(200);

    expect(allowed.body.family).toBe(familyAId);

    await request(app.getHttpServer())
      .get(`/api/subscriptions/family/${familyAId}`)
      .set('Authorization', `Bearer ${outsiderBToken}`)
      .expect(404);
  });

  it('allows owner and family manager to read payment status but hides it from outsiders', async () => {
    const ownerStatus = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${employeeAToken}`)
      .expect(200);

    expect(ownerStatus.body.id).toBe(paymentId);
    expect(ownerStatus.body.status).toBe(PaymentStatus.PENDING);

    const managerStatus = await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(200);

    expect(managerStatus.body.id).toBe(paymentId);

    await request(app.getHttpServer())
      .get(`/api/payments/status?paymentId=${paymentId}`)
      .set('Authorization', `Bearer ${outsiderBToken}`)
      .expect(404);
  });

  it('returns only caller-owned rows in GET /api/subscriptions/payments', async () => {
    const ownerPayments = await request(app.getHttpServer())
      .get('/api/subscriptions/payments')
      .set('Authorization', `Bearer ${employeeAToken}`)
      .expect(200);

    expect(ownerPayments.body).toHaveLength(1);
    expect(ownerPayments.body[0].id).toBe(paymentId);
    expect(ownerPayments.body.map((item: any) => item.id)).not.toContain(outsiderPaymentId);

    const managerPayments = await request(app.getHttpServer())
      .get('/api/subscriptions/payments')
      .set('Authorization', `Bearer ${managerAToken}`)
      .expect(200);

    expect(managerPayments.body).toEqual([]);

    const outsiderPayments = await request(app.getHttpServer())
      .get('/api/subscriptions/payments')
      .set('Authorization', `Bearer ${outsiderBToken}`)
      .expect(200);

    expect(outsiderPayments.body).toHaveLength(1);
    expect(outsiderPayments.body[0].id).toBe(outsiderPaymentId);
    expect(outsiderPayments.body.map((item: any) => item.id)).not.toContain(paymentId);
  });
});
