import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Action, CurrentUser, Resource } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';

@Controller('audit')
@UseGuards(PermissionsGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Resource('users')
  @Action('read')
  list(@CurrentUser() currentUser: AuthUser, @Query('entity') entity?: string, @Query('entityId') entityId?: string, @Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : undefined;
    return this.audit.list(currentUser, { entity, entityId, limit: lim });
  }
}
