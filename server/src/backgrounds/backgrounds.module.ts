import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackgroundsController } from './backgrounds.controller';
import { BackgroundsService } from './backgrounds.service';
import { Background, BackgroundSchema } from './schemas/background.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Background.name, schema: BackgroundSchema }])],
  controllers: [BackgroundsController],
  providers: [BackgroundsService],
})
export class BackgroundsModule {}
