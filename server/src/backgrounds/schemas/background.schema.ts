import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackgroundDocument = HydratedDocument<Background>;

@Schema({ timestamps: true })
export class Background {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: () => String, ref: 'Family', required: true, index: true })
  family: string;

  @Prop({ required: true })
  fileName: string;

  @Prop()
  originalName?: string;

  @Prop()
  mimeType?: string;

  @Prop()
  size?: number;
}

export const BackgroundSchema = SchemaFactory.createForClass(Background);

BackgroundSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.fileName;
    return ret;
  },
});
