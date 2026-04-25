import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackgroundsController } from './backgrounds.controller';
import { BackgroundsService } from './backgrounds.service';
import { Background, BackgroundSchema } from './schemas/background.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { PermissionsService } from '../auth/permissions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Background.name, schema: BackgroundSchema },
      { name: Family.name, schema: FamilySchema },
    ]),
  ],
  controllers: [BackgroundsController],
  providers: [BackgroundsService, PermissionsService],
})
export class BackgroundsModule {}
