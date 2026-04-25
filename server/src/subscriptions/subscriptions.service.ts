import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from './schemas/subscription.schema';
import { Payment, PaymentDocument, PaymentMethod, PaymentStatus } from './schemas/payment.schema';
import { Family, FamilyDocument } from '../families/schemas/family.schema';
import { AuthUser, PermissionsService } from '../auth/permissions.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Family.name) private familyModel: Model<FamilyDocument>,
    private readonly permissionsService: PermissionsService,
    private readonly auditService: AuditService,
  ) {}

  private ensureCanAccessFamily(currentUser: AuthUser, familyId: string) {
    if (!this.permissionsService.canAccessFamily(currentUser, familyId)) {
      throw new NotFoundException('Ban khong co quyen truy cap dong ho nay');
    }
  }

  private async ensureFamilyExists(familyId: string, session?: ClientSession) {
    if (!Types.ObjectId.isValid(familyId)) {
      throw new NotFoundException('Khong tim thay dong ho');
    }
    const exists = await this.applySession(
      this.familyModel.exists({ _id: familyId }),
      session,
    );
    if (!exists) {
      throw new NotFoundException('Khong tim thay dong ho');
    }
  }

  async findAllPlans(): Promise<Plan[]> {
    return this.planModel.find({ isActive: true }).sort({ sortOrder: 1 }).exec();
  }

  async findPlanBySlug(slug: string): Promise<PlanDocument> {
    const plan = await this.planModel.findOne({ slug, isActive: true }).exec();
    if (!plan) throw new NotFoundException('Goi dich vu khong ton tai');
    return plan;
  }

  async seedDefaultPlans(): Promise<void> {
    const count = await this.planModel.countDocuments().exec();
    if (count > 0) return;

    const plans = [
      {
        slug: 'free', name: 'Dung thu', price: 0, originalPrice: 0,
        durationMonths: 1, maxMembers: 30, maxAdmins: 1, maxStorageGb: 0.5,
        features: ['30 thanh vien', '1 quan tri vien', 'Cay pha do co ban', 'Album anh co ban'],
        sortOrder: 0,
      },
      {
        slug: 'basic', name: 'Co ban', price: 1500000, originalPrice: 2000000,
        durationMonths: 12, maxMembers: 300, maxAdmins: 3, maxStorageGb: 2,
        features: ['300 thanh vien', '3 quan tri vien', 'Cay pha do day du', '2GB dung luong album', 'Trang chu dong ho', 'Su kien va lich'],
        sortOrder: 1,
      },
      {
        slug: 'advanced', name: 'Nang cao', price: 2000000, originalPrice: 2500000,
        durationMonths: 12, maxMembers: 500, maxAdmins: 5, maxStorageGb: 5,
        features: ['500 thanh vien', '5 quan tri vien', 'Cay pha do nang cao', '5GB dung luong album', 'Ho tro uu tien'],
        sortOrder: 2,
      },
      {
        slug: 'unlimited', name: 'Khong gioi han', price: 3500000, originalPrice: 5000000,
        durationMonths: 12, maxMembers: 999999, maxAdmins: 10, maxStorageGb: 10,
        features: ['Khong gioi han thanh vien', '10 quan tri vien', 'Tat ca tinh nang', '10GB dung luong album', 'Tuy chinh giao dien', 'Ho tro 24/7'],
        sortOrder: 3,
      },
    ];

    await this.planModel.insertMany(plans);
  }

  async createFreeSubscription(
    userId: string,
    familyId: string,
    currentUser?: AuthUser,
    session?: ClientSession,
  ): Promise<Subscription> {
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);
    await this.ensureFamilyExists(familyId, session);

    const freePlan = await this.applySession(
      this.planModel.findOne({ slug: 'free' }),
      session,
    ).exec();
    if (!freePlan) throw new NotFoundException('Goi mien phi chua duoc tao');

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + freePlan.durationMonths);

    const subscription = new this.subscriptionModel({
      user: new Types.ObjectId(userId),
      family: new Types.ObjectId(familyId),
      plan: freePlan._id,
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      endDate,
      maxMembers: freePlan.maxMembers,
      maxAdmins: freePlan.maxAdmins,
      maxStorageGb: freePlan.maxStorageGb,
    });

    return subscription.save(session ? { session } : undefined);
  }

  async createPaidSubscription(
    userId: string,
    familyId: string,
    planSlug: string,
    method: 'VNPAY' | 'BANK_TRANSFER' = 'BANK_TRANSFER',
    currentUser?: AuthUser,
  ): Promise<{ subscription: Subscription; payment: Payment }> {
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);
    await this.ensureFamilyExists(familyId);

    const plan = await this.findPlanBySlug(planSlug);
    if (plan.price === 0) throw new BadRequestException('Su dung API dang ky mien phi');

    const userObjectId = new Types.ObjectId(userId);
    const familyObjectId = new Types.ObjectId(familyId);
    const paymentMethod = method === 'VNPAY' ? PaymentMethod.VNPAY : PaymentMethod.BANK_TRANSFER;
    let subscription = await this.subscriptionModel.findOne({
      user: userObjectId,
      family: familyObjectId,
      plan: plan._id,
      status: SubscriptionStatus.PENDING_PAYMENT,
    }).sort({ createdAt: -1 }).exec();

    if (!subscription) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      try {
        subscription = await new this.subscriptionModel({
          user: userObjectId,
          family: familyObjectId,
          plan: plan._id,
          status: SubscriptionStatus.PENDING_PAYMENT,
          startDate: now,
          endDate,
          maxMembers: plan.maxMembers,
          maxAdmins: plan.maxAdmins,
          maxStorageGb: plan.maxStorageGb,
        }).save();
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) {
          throw error;
        }

        subscription = await this.subscriptionModel.findOne({
          user: userObjectId,
          family: familyObjectId,
          plan: plan._id,
          status: SubscriptionStatus.PENDING_PAYMENT,
        }).sort({ createdAt: -1 }).exec();
      }
    }

    if (!subscription) {
      throw new BadRequestException('Khong the tao subscription dang cho thanh toan');
    }

    let payment = await this.paymentModel.findOne({
      user: userObjectId,
      subscription: subscription._id,
      method: paymentMethod,
      status: PaymentStatus.PENDING,
    }).sort({ createdAt: -1 }).exec();

    if (!payment) {
      try {
        payment = await new this.paymentModel({
          user: userObjectId,
          subscription: subscription._id,
          amount: plan.price,
          method: paymentMethod,
          status: PaymentStatus.PENDING,
          description: `Thanh toan goi ${plan.name} - ${plan.durationMonths} thang`,
        }).save();
      } catch (error) {
        if (!this.isDuplicateKeyError(error)) {
          throw error;
        }

        payment = await this.paymentModel.findOne({
          user: userObjectId,
          subscription: subscription._id,
          method: paymentMethod,
          status: PaymentStatus.PENDING,
        }).sort({ createdAt: -1 }).exec();
      }
    }

    if (!payment) {
      throw new BadRequestException('Khong the tao thanh toan dang cho');
    }

    return { subscription: subscription as any, payment: payment as any };
  }

  async getActiveSubscription(familyId: string, currentUser?: AuthUser): Promise<SubscriptionDocument | null> {
    if (currentUser) this.ensureCanAccessFamily(currentUser, familyId);
    await this.ensureFamilyExists(familyId);

    return this.subscriptionModel
      .findOne({ family: new Types.ObjectId(familyId), status: SubscriptionStatus.ACTIVE })
      .populate('plan')
      .sort({ endDate: -1 })
      .exec();
  }

  async getUserSubscriptions(currentUser: AuthUser): Promise<Subscription[]> {
    const subscriptions = await this.subscriptionModel
      .find({ user: new Types.ObjectId(currentUser.id) })
      .populate('plan')
      .populate('family')
      .sort({ createdAt: -1 })
      .exec();

    return subscriptions.filter((subscription: any) => {
      const familyId = subscription.family?.id
        || subscription.family?._id?.toString?.()
        || subscription.family?.toString?.()
        || subscription.family;

      return !!familyId && this.permissionsService.canAccessFamily(currentUser, familyId);
    }) as any;
  }

  private applySession<T extends { session(session: ClientSession): T }>(
    query: T,
    session?: ClientSession,
  ): T {
    return session ? query.session(session) : query;
  }

  private isTransactionUnavailableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('Transaction numbers are only allowed on a replica set member or mongos')
      || message.includes('transactions are not supported')
      || message.includes('Transaction support is not available');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: number }).code === 11000;
  }

  private auditFamilyId(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (value instanceof Types.ObjectId) return value.toString();
    if (typeof value === 'object' && value !== null) {
      const maybeObjectId = value as { _id?: unknown; id?: unknown; toString?: () => string };
      if (typeof maybeObjectId.id === 'string') return maybeObjectId.id;
      if (typeof maybeObjectId._id === 'string') return maybeObjectId._id;
      if (maybeObjectId._id instanceof Types.ObjectId) return maybeObjectId._id.toString();
      if (typeof maybeObjectId.toString === 'function') {
        const stringified = maybeObjectId.toString();
        if (stringified && stringified !== '[object Object]') return stringified;
      }
    }
    return undefined;
  }

  private async logBillingAudit(params: {
    entity: 'payment' | 'subscription';
    entityId: string;
    familyId?: string;
    before?: any;
    after?: any;
    actor?: string;
    session?: ClientSession;
  }) {
    const { entity, entityId, familyId, before, after, actor, session } = params;
    if (!familyId) {
      return;
    }

    await this.auditService.log({
      entity,
      entityId,
      action: 'update',
      family: familyId,
      before,
      after,
      actor,
      session,
    });
  }

  async activateSubscription(subscriptionId: string, session?: ClientSession): Promise<SubscriptionDocument> {
    const sub = await this.applySession(
      this.subscriptionModel.findById(subscriptionId),
      session,
    ).exec();
    if (!sub) throw new NotFoundException('Khong tim thay subscription');

    await this.subscriptionModel.updateMany(
      { family: sub.family, status: SubscriptionStatus.ACTIVE, _id: { $ne: sub._id } },
      { status: SubscriptionStatus.EXPIRED },
      session ? { session } : undefined,
    );

    sub.status = SubscriptionStatus.ACTIVE;
    sub.startDate = new Date();
    const plan = await this.applySession(
      this.planModel.findById(sub.plan),
      session,
    ).exec();
    if (plan) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);
      sub.endDate = endDate;
    }
    return sub.save(session ? { session } : undefined);
  }

  async confirmPayment(paymentId: string, transactionId?: string, currentUser?: AuthUser): Promise<Payment> {
    const session = await this.connection.startSession();

    try {
      return await session.withTransaction(async () =>
        this.confirmPaymentInternal(paymentId, transactionId, currentUser, session),
      ) as Payment;
    } catch (error) {
      if (!this.isTransactionUnavailableError(error)) {
        throw error;
      }

      return this.confirmPaymentWithoutTransaction(paymentId, transactionId, currentUser);
    } finally {
      await session.endSession();
    }
  }

  private async confirmPaymentInternal(
    paymentId: string,
    transactionId?: string,
    currentUser?: AuthUser,
    session?: ClientSession,
  ): Promise<Payment> {
    const payment = await this.applySession(
      this.paymentModel.findById(paymentId),
      session,
    ).exec();
    if (!payment) throw new NotFoundException('Khong tim thay thanh toan');

    if (currentUser) {
      const subscription = await this.applySession(
        this.subscriptionModel.findById(payment.subscription).select('family').lean(),
        session,
      ).exec();
      const familyId = subscription?.family?.toString();
      if (!familyId || !this.permissionsService.canAccessFamily(currentUser, familyId)) {
        throw new NotFoundException('Khong tim thay thanh toan');
      }
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment as any;
    }

    const paymentBefore = payment.toJSON();
    const subscriptionBefore = await this.applySession(
      this.subscriptionModel.findById(payment.subscription).lean(),
      session,
    ).exec();

    payment.status = PaymentStatus.SUCCESS;
    payment.paidAt = new Date();
    if (transactionId) payment.transactionId = transactionId;
    await payment.save(session ? { session } : undefined);

    const activatedSubscription = await this.activateSubscription(payment.subscription.toString(), session);
    const familyId = this.auditFamilyId(subscriptionBefore?.family) || this.auditFamilyId(activatedSubscription.family);
    const actor = currentUser?.id;

    await this.logBillingAudit({
      entity: 'payment',
      entityId: paymentId,
      familyId,
      before: paymentBefore,
      after: payment.toJSON(),
      actor,
      session,
    });
    await this.logBillingAudit({
      entity: 'subscription',
      entityId: activatedSubscription._id.toString(),
      familyId,
      before: subscriptionBefore,
      after: activatedSubscription.toJSON(),
      actor,
      session,
    });

    return payment as any;
  }

  private async confirmPaymentWithoutTransaction(
    paymentId: string,
    transactionId?: string,
    currentUser?: AuthUser,
  ): Promise<Payment> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) throw new NotFoundException('Khong tim thay thanh toan');

    const subscription = await this.subscriptionModel.findById(payment.subscription).exec();
    if (!subscription) throw new NotFoundException('Khong tim thay subscription');

    if (currentUser) {
      const familyId = subscription.family?.toString();
      if (!familyId || !this.permissionsService.canAccessFamily(currentUser, familyId)) {
        throw new NotFoundException('Khong tim thay thanh toan');
      }
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return payment as any;
    }

    const paymentBefore = payment.toJSON();
    const paymentSnapshot = {
      status: payment.status,
      paidAt: payment.paidAt ?? null,
      transactionId: payment.transactionId ?? null,
    };
    const subscriptionBefore = subscription.toJSON();
    const subscriptionSnapshot = {
      status: subscription.status,
      startDate: subscription.startDate ?? null,
      endDate: subscription.endDate ?? null,
    };
    const activeSubscriptions = await this.subscriptionModel.find({
      family: subscription.family,
      status: SubscriptionStatus.ACTIVE,
    }).exec();
    const activeSnapshots = activeSubscriptions.map((item) => ({
      id: item._id,
      status: item.status,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
    }));

    try {
      payment.status = PaymentStatus.SUCCESS;
      payment.paidAt = new Date();
      if (transactionId) payment.transactionId = transactionId;
      await payment.save();

      const activatedSubscription = await this.activateSubscription(payment.subscription.toString());
      const familyId = this.auditFamilyId(subscription.family) || this.auditFamilyId(activatedSubscription.family);
      const actor = currentUser?.id;

      await this.logBillingAudit({
        entity: 'payment',
        entityId: paymentId,
        familyId,
        before: paymentBefore,
        after: payment.toJSON(),
        actor,
      });
      await this.logBillingAudit({
        entity: 'subscription',
        entityId: activatedSubscription._id.toString(),
        familyId,
        before: subscriptionBefore,
        after: activatedSubscription.toJSON(),
        actor,
      });

      return payment as any;
    } catch (error) {
      await this.paymentModel.updateOne(
        { _id: payment._id },
        {
          status: paymentSnapshot.status,
          paidAt: paymentSnapshot.paidAt,
          transactionId: paymentSnapshot.transactionId,
        },
      ).exec();

      await this.subscriptionModel.updateOne(
        { _id: subscription._id },
        {
          status: subscriptionSnapshot.status,
          startDate: subscriptionSnapshot.startDate,
          endDate: subscriptionSnapshot.endDate,
        },
      ).exec();

      if (activeSnapshots.length) {
        await this.subscriptionModel.bulkWrite(
          activeSnapshots.map((item) => ({
            updateOne: {
              filter: { _id: item.id },
              update: {
                status: item.status,
                startDate: item.startDate,
                endDate: item.endDate,
              },
            },
          })),
        );
      }

      throw error;
    }
  }

  async getPaymentById(paymentId: string, currentUser?: AuthUser): Promise<Payment> {
    const payment = await this.paymentModel
      .findById(paymentId)
      .populate({ path: 'subscription', populate: { path: 'plan' } })
      .exec();
    if (!payment) throw new NotFoundException('Khong tim thay thanh toan');

    if (currentUser) {
      const ownerId = payment.user?.toString();
      const subscription: any = payment.subscription;
      const familyId = subscription?.family?.toString?.() || subscription?.family;
      const canAccessBilling = familyId && ownerId
        ? this.permissionsService.canAccessBilling(currentUser, familyId, ownerId)
        : false;

      if (!canAccessBilling) {
        throw new NotFoundException('Khong tim thay thanh toan');
      }
    }

    return payment as any;
  }

  async getPlanNameByPayment(paymentId: string): Promise<string> {
    const payment = await this.paymentModel.findById(paymentId).populate('subscription').exec();
    if (!payment) return 'Goi dich vu';

    const sub = payment.subscription as any;
    if (sub?.plan) {
      const plan = await this.planModel.findById(sub.plan).exec();
      return plan?.name || 'Goi dich vu';
    }

    return 'Goi dich vu';
  }

  async getPaymentsByUser(currentUser: AuthUser): Promise<Payment[]> {
    const payments = await this.paymentModel
      .find({ user: new Types.ObjectId(currentUser.id) })
      .populate({ path: 'subscription', populate: { path: 'plan' } })
      .sort({ createdAt: -1 })
      .exec();

    return payments.filter((payment: any) => {
      const ownerId = payment.user?.toString?.() || payment.user;
      const subscription = payment.subscription as any;
      const familyId = subscription?.family?.toString?.() || subscription?.family;

      if (!ownerId || !familyId) {
        return false;
      }

      return this.permissionsService.canAccessBilling(currentUser, familyId, ownerId);
    }) as any;
  }

  async isGatewayConfirmationAllowed(
    paymentId: string,
    method: PaymentMethod,
    expectedAmount: number,
  ): Promise<boolean> {
    const payment = await this.paymentModel.findById(paymentId).exec();
    if (!payment) return false;
    if (payment.method !== method) return false;
    if (payment.amount !== expectedAmount) return false;

    const subscription = await this.subscriptionModel
      .findById(payment.subscription)
      .select('status')
      .exec();
    if (!subscription) return false;

    if (payment.status === PaymentStatus.PENDING) {
      return subscription.status === SubscriptionStatus.PENDING_PAYMENT;
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return subscription.status === SubscriptionStatus.ACTIVE;
    }

    return false;
  }

  async checkFamilyLimit(familyId: string, resource: 'members' | 'admins'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const sub = await this.getActiveSubscription(familyId);
    if (!sub) return { allowed: false, current: 0, limit: 0 };

    const limit = resource === 'members' ? sub.maxMembers : sub.maxAdmins;
    return { allowed: true, current: 0, limit };
  }
}
