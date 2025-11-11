import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './schemas/audit.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>) {}

  async log(params: { entity: string; entityId: string; action: 'create' | 'update' | 'delete' | 'reparent'; before?: any; after?: any; actor?: string }) {
    const { entity, entityId, action, before, after, actor } = params;
    await this.auditModel.create({ entity, entityId, action, before, after, actor: actor || 'system' });
  }

  async list(params: { entity?: string; entityId?: string; limit?: number }) {
    const filter: any = {};
    if (params.entity) filter.entity = params.entity;
    if (params.entityId) filter.entityId = params.entityId;
    const limit = params.limit ?? 100;
    const list = await this.auditModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
    return list.map((d: any) => ({ ...d, id: d._id, _id: undefined }));
  }
}
