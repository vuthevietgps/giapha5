import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PermissionsService } from './permissions.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Family, FamilySchema } from '../families/schemas/family.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';

@Module({
  imports: [
    UsersModule,
    SubscriptionsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Family.name, schema: FamilySchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'giapha-jwt-secret-change-in-production'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [PermissionsService, JwtAuthGuard],
  exports: [UsersModule, PermissionsService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
