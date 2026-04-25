import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { PermissionsService } from '../auth/permissions.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Family.name, schema: FamilySchema },
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PermissionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule implements OnModuleInit {
  constructor(private readonly service: SubscriptionsService) {}

  async onModuleInit() {
    // Tự tạo các gói mặc định khi khởi động
    await this.service.seedDefaultPlans();
  }
}
