import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BackgroundDocument = HydratedDocument<Background>;

@Schema({ timestamps: true })
export class Background {
  @Prop({ required: true })
  name: string; // e.g., "Ảnh nền 1"

  @Prop({ required: true })
  fileName: string; // stored on disk

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
    delete ret.fileName; // hide raw filename from list
    return ret;
  },
});
