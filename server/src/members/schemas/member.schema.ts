import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Family } from '../../families/schemas/family.schema';
import { Position } from '../../positions/schemas/position.schema';

export type MemberDocument = HydratedDocument<Member>;

@Schema({ timestamps: true })
export class Member {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: false, trim: true })
  photoUrl?: string;

  @Prop({ required: false, trim: true })
  phone?: string;

  @Prop({ required: false, trim: true, unique: true, sparse: true, lowercase: true })
  email?: string;

  @Prop({ required: false, select: false })
  password?: string;

  @Prop({ type: Types.ObjectId, ref: Family.name, required: true, index: true })
  family!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Member.name, required: false })
  father?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Member.name, required: false })
  spouse?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Member.name, required: false })
  mother?: Types.ObjectId;

  @Prop({ required: false, trim: true })
  bio?: string;

  @Prop({ required: false })
  dob?: Date;

  @Prop({ required: false })
  dod?: Date;

  @Prop({ type: Types.ObjectId, ref: Position.name, required: false })
  position?: Types.ObjectId;

  @Prop({ required: false, enum: ['male', 'female', 'other'], default: 'male' })
  gender?: 'male' | 'female' | 'other';

  @Prop({ required: false, default: false })
  isMartyred?: boolean;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

// Compound indexes for common query patterns
MemberSchema.index({ family: 1, father: 1 });
MemberSchema.index({ family: 1, gender: 1 });
MemberSchema.index({ family: 1, fullName: 1 });

MemberSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.password;
    return ret;
  },
});
