import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  GIAM_DOC = 'GIAM_DOC',
  QUAN_LY = 'QUAN_LY',
  NHAN_VIEN = 'NHAN_VIEN',
  TRUONG_HO = 'TRUONG_HO',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.NHAN_VIEN })
  role: UserRole;

  @Prop({ type: [{ type: String, ref: 'Family' }], default: [] })
  managedFamilies: string[]; // Cho QUAN_LY: danh sách dòng họ được quản lý

  @Prop({ type: String, ref: 'Family' })
  assignedFamily?: string; // Cho NHAN_VIEN và TRUONG_HO: dòng họ được chỉ định
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  },
});
