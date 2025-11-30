import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member, MemberSchema } from './schemas/member.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { AuditModule } from '../audit/audit.module';
import { Union, UnionSchema } from '../unions/schemas/union.schema';
import { PermissionsService } from '../auth/permissions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Member.name, schema: MemberSchema },
      { name: Family.name, schema: FamilySchema },
      { name: Union.name, schema: UnionSchema },
    ]),
    AuditModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, PermissionsService],
})
export class MembersModule {}
