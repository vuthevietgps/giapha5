import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FamilyDocument = HydratedDocument<Family>;

@Schema({ timestamps: true })
export class Family {
  @Prop({ required: true, trim: true })
  name: string; // Tên dòng họ

  @Prop({ trim: true })
  description?: string; // Mô tả về dòng họ

  @Prop({ required: true, trim: true })
  contactName: string; // Tên người liên hệ

  @Prop({ required: false, trim: true })
  contactPhone?: string; // SĐT người liên hệ

  @Prop({ required: false, trim: true })
  address?: string; // Địa chỉ dòng họ

  // Admin quản lý dòng họ này (ADMIN_DONG_HO role)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  adminId?: Types.ObjectId;

  // Trạng thái hoạt động của dòng họ
  @Prop({ enum: ['active', 'inactive', 'expired'], default: 'active' })
  status: string;

  // Thông tin đăng ký dịch vụ
  @Prop()
  subscriptionStartDate?: Date;

  @Prop()
  subscriptionEndDate?: Date;

  // Số lượng thành viên hiện tại
  @Prop({ default: 0 })
  memberCount: number;

  // Tổng doanh thu từ dòng họ này
  @Prop({ default: 0 })
  totalRevenue: number;

  // Hoạt động cuối cùng
  @Prop()
  lastActivityDate?: Date;

  // Người tạo (SUPER_ADMIN)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Người cập nhật cuối
  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  // Root ancestor (đời đầu) duy nhất của họ: thường là người đàn ông đầu tiên.
  // Không bắt buộc để tạo họ, nhưng nếu set phải thuộc về họ và gender = male.
  @Prop({ type: () => String, ref: 'Member', required: false })
  rootMember?: string;
}

export const FamilySchema = SchemaFactory.createForClass(Family);

// Add indexes for better performance on family management queries
FamilySchema.index({ name: 1 });
FamilySchema.index({ adminId: 1 });
FamilySchema.index({ status: 1 });
FamilySchema.index({ subscriptionEndDate: 1 });
FamilySchema.index({ createdBy: 1 });

FamilySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
