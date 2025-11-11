import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Family, FamilySchema } from './schemas/family.schema';
import { Member, MemberSchema } from '../members/schemas/member.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Family.name, schema: FamilySchema },
      { name: Member.name, schema: MemberSchema },
    ]),
  ],
  controllers: [FamiliesController],
  providers: [FamiliesService]
})
export class FamiliesModule {}
