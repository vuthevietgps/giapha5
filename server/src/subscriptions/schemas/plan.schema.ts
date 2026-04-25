import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanDocument = HydratedDocument<Plan>;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, trim: true, unique: true })
  slug: string; // 'free', 'basic', 'advanced', 'unlimited'

  @Prop({ required: true, trim: true })
  name: string; // Hiển thị: Dùng thử, Cơ bản, Nâng cao, Không giới hạn

  @Prop({ required: true, default: 0 })
  price: number; // VND, 0 = miễn phí

  @Prop({ default: 0 })
  originalPrice: number; // Giá gốc (chưa giảm)

  @Prop({ required: true, default: 12 })
  durationMonths: number; // Thời hạn gói (tháng)

  @Prop({ required: true, default: 30 })
  maxMembers: number;

  @Prop({ required: true, default: 1 })
  maxAdmins: number;

  @Prop({ required: true, default: 1 })
  maxStorageGb: number;

  @Prop({ type: [String], default: [] })
  features: string[]; // Danh sách feature text để hiển thị

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
