import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member, MemberSchema } from './schemas/member.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { AuditModule } from '../audit/audit.module';
import { Union, UnionSchema } from '../unions/schemas/union.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { PermissionsService } from '../auth/permissions.service';
import { PlanLimitInterceptor } from '../auth/plan-limit.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Member.name, schema: MemberSchema },
      { name: Family.name, schema: FamilySchema },
      { name: Union.name, schema: UnionSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    AuditModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, PermissionsService, PlanLimitInterceptor],
})
export class MembersModule {}
