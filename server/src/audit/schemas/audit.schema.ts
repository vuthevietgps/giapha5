import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, trim: true })
  entity!: string; // e.g., 'member' | 'union'

  @Prop({ required: true, trim: true })
  entityId!: string;

  @Prop({ required: true, trim: true })
  action!: 'create' | 'update' | 'delete' | 'reparent';

  @Prop({ trim: true })
  family?: string;

  @Prop({ type: Object })
  before?: any;

  @Prop({ type: Object })
  after?: any;

  @Prop({ trim: true })
  actor?: string; // user id or name (to be integrated with auth)
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
