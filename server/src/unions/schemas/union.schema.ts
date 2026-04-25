import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Member } from '../../members/schemas/member.schema';
import { Family } from '../../families/schemas/family.schema';

export type UnionDocument = HydratedDocument<Union>;

function hasExactlyTwoDistinctPartners(values: any[]) {
  if (!Array.isArray(values) || values.length !== 2) return false;
  return new Set(values.map((value) => value?.toString())).size === 2;
}

@Schema({ timestamps: true })
export class Union {
  @Prop({ type: Types.ObjectId, ref: Family.name, required: true, index: true })
  family!: Types.ObjectId;

  // Supported write contract: exactly 2 distinct partners.
  // Legacy records may still violate this and are handled defensively by readers/consumers.
  @Prop({
    type: [{ type: Types.ObjectId, ref: Member.name }],
    required: true,
    validate: [hasExactlyTwoDistinctPartners, 'Union phải có đúng 2 thành viên khác nhau'],
  })
  partners!: Types.ObjectId[];

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  @Prop({ trim: true })
  notes?: string;
}

export const UnionSchema = SchemaFactory.createForClass(Union);

// Compound index for partner lookups within a family
UnionSchema.index({ family: 1, partners: 1 });

UnionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
