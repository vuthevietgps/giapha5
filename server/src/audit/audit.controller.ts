import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query('entity') entity?: string, @Query('entityId') entityId?: string, @Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : undefined;
    return this.audit.list({ entity, entityId, limit: lim });
  }
}
