import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [UsersModule],
  providers: [PermissionsService],
  exports: [UsersModule, PermissionsService],
})
export class AuthModule {}
