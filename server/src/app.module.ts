import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { FamiliesModule } from './families/families.module';
import { PositionsModule } from './positions/positions.module';
import { MembersModule } from './members/members.module';
import { UnionsModule } from './unions/unions.module';
import { AuditModule } from './audit/audit.module';
import { PostsModule } from './posts/posts.module';
import { BackgroundsModule } from './backgrounds/backgrounds.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './auth/middleware/auth.middleware';
import { MailModule } from './mail/mail.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { createMongooseConfig } from './config/mongodb.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      useFactory: () => createMongooseConfig(),
    }),
    MailModule,
    SubscriptionsModule,
    PaymentsModule,
    AuthModule,
    UsersModule,
    FamiliesModule,
    PositionsModule,
    MembersModule,
    UnionsModule,
    AuditModule,
    PostsModule,
    BackgroundsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('*'); // Áp dụng cho tất cả routes
  }
}
