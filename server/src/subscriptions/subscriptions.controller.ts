import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get('plans')
  findAllPlans() {
    return this.service.findAllPlans();
  }

  @Get('my')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('read')
  getMySubscriptions(@CurrentUser() user: AuthUser) {
    return this.service.getUserSubscriptions(user);
  }

  @Get('family/:familyId')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('read')
  getFamilySubscription(@Param('familyId') familyId: string, @CurrentUser() user: AuthUser) {
    return this.service.getActiveSubscription(familyId, user);
  }

  @Get('payments')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('read')
  getMyPayments(@CurrentUser() user: AuthUser) {
    return this.service.getPaymentsByUser(user);
  }

  @Post('upgrade/:planSlug')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('create')
  upgradePlan(
    @CurrentUser() user: AuthUser,
    @Param('planSlug') planSlug: string,
    @Query('familyId') familyId: string,
  ) {
    return this.service.createPaidSubscription(user.id, familyId, planSlug, 'BANK_TRANSFER', user);
  }
}
