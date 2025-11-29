import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_DONG_HO = 'ADMIN_DONG_HO',
  BIEN_TAP_DONG_HO = 'BIEN_TAP_DONG_HO',
  THANH_VIEN = 'THANH_VIEN',
  KHACH = 'KHACH',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.THANH_VIEN })
  role: UserRole;

  // For ADMIN_DONG_HO: which families they can manage (ObjectId references)
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Family' }], default: [] })
  managedFamilies: mongoose.Types.ObjectId[];
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
