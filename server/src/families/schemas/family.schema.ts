import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FamilyDocument = HydratedDocument<Family>;

@Schema({ timestamps: true })
export class Family {
  @Prop({ required: true, trim: true })
  name: string; // Tên dòng họ

  @Prop({ required: true, trim: true })
  contactName: string; // Tên người liên hệ

  @Prop({ required: false, trim: true })
  contactPhone?: string; // SĐT người liên hệ

  @Prop({ required: false, trim: true })
  address?: string; // Địa chỉ dòng họ

  // Root ancestor (đời đầu) duy nhất của họ: thường là người đàn ông đầu tiên.
  // Không bắt buộc để tạo họ, nhưng nếu set phải thuộc về họ và gender = male.
  @Prop({ type: () => String, ref: 'Member', required: false })
  rootMember?: string;

  // Public sharing: token for read-only public tree view
  @Prop({ type: String, sparse: true, unique: true })
  shareToken?: string;

  @Prop({ default: false })
  isPublic: boolean;
}

export const FamilySchema = SchemaFactory.createForClass(Family);

FamilySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
