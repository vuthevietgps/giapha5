import { Module } from '@nestjs/common';
import { FamiliesController } from './families.controller';
import { FamiliesService } from './families.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Family, FamilySchema } from './schemas/family.schema';
import { Member, MemberSchema } from '../members/schemas/member.schema';
import { Union, UnionSchema } from '../unions/schemas/union.schema';
import { PermissionsService } from '../auth/permissions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Family.name, schema: FamilySchema },
      { name: Member.name, schema: MemberSchema },
      { name: Union.name, schema: UnionSchema },
    ]),
  ],
  controllers: [FamiliesController],
  providers: [FamiliesService, PermissionsService]
})
export class FamiliesModule {}
