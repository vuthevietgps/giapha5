import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { AuditLog } from './schemas/audit.schema';
import { AuthUser, PermissionsService } from '../auth/permissions.service';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async log(params: {
    entity: string;
    entityId: string;
    action: 'create' | 'update' | 'delete' | 'reparent';
    family?: string;
    before?: any;
    after?: any;
    actor?: string;
    session?: ClientSession;
  }) {
    const { entity, entityId, action, family, before, after, actor, session } = params;
    const document = { entity, entityId, action, family, before, after, actor: actor || 'system' };

    if (session) {
      await this.auditModel.create([document], { session });
      return;
    }

    await this.auditModel.create(document);
  }

  async list(currentUser: AuthUser, params: { entity?: string; entityId?: string; limit?: number }) {
    const filter: any = {};
    if (params.entity) filter.entity = params.entity;
    if (params.entityId) filter.entityId = params.entityId;

    const accessibleFamilies = this.permissionsService.getAccessibleFamilyIds(currentUser);
    if (accessibleFamilies !== null) {
      if (accessibleFamilies.length === 0) {
        return [];
      }
      filter.family = { $in: accessibleFamilies };
    }

    const limit = params.limit ?? 100;
    const list = await this.auditModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
    return list.map((d: any) => ({ ...d, id: d._id, _id: undefined }));
  }
}
