import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Member } from '../../members/schemas/member.schema';
import { Family } from '../../families/schemas/family.schema';

export type UnionDocument = HydratedDocument<Union>;

@Schema({ timestamps: true })
export class Union {
  @Prop({ type: Types.ObjectId, ref: Family.name, required: true, index: true })
  family!: Types.ObjectId;

  // 1–n partners (spouses) in the union. Usually 2.
  @Prop({ type: [{ type: Types.ObjectId, ref: Member.name }], required: true, validate: [(v: any[]) => v && v.length >= 1, 'Union phải có ít nhất 1 người'] })
  partners!: Types.ObjectId[];

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ trim: true })
  notes?: string;
}

export const UnionSchema = SchemaFactory.createForClass(Union);

UnionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
