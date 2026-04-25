import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UnionsService } from './unions.service';
import { UnionsController } from './unions.controller';
import { Union, UnionSchema } from './schemas/union.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { Member, MemberSchema } from '../members/schemas/member.schema';
import { AuditModule } from '../audit/audit.module';
import { PermissionsService } from '../auth/permissions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Union.name, schema: UnionSchema },
      { name: Family.name, schema: FamilySchema },
      { name: Member.name, schema: MemberSchema },
    ]),
    AuditModule,
  ],
  controllers: [UnionsController],
  providers: [UnionsService, PermissionsService],
  exports: [UnionsService],
})
export class UnionsModule {}
