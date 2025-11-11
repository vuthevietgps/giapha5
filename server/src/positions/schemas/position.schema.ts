import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PositionDocument = HydratedDocument<Position>;

@Schema({ timestamps: true })
export class Position {
  @Prop({ required: true, trim: true, unique: true })
  name: string; // Tên chức vụ

  @Prop({ required: false, trim: true })
  description?: string; // Mô tả

  @Prop({ required: false, default: 0 })
  sortOrder?: number; // Thứ tự sắp xếp
}

export const PositionSchema = SchemaFactory.createForClass(Position);

PositionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  },
});
