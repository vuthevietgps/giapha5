import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../users/schemas/user.schema';
import { Family } from '../families/schemas/family.schema';
import { Subscription } from '../subscriptions/schemas/subscription.schema';
import { CurrentUser } from './decorators/roles.decorator';
import type { AuthUser } from './permissions.service';
import { MailService } from '../mail/mail.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @IsNotEmpty({ message: 'Mat khau khong duoc de trong' })
  password: string;
}

class RegisterDto {
  @IsNotEmpty({ message: 'Ho ten khong duoc de trong' })
  @IsString()
  fullName: string;

  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;

  @MinLength(6, { message: 'Mat khau toi thieu 6 ky tu' })
  password: string;

  @IsNotEmpty({ message: 'Ten dong ho khong duoc de trong' })
  @IsString()
  familyName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email khong hop le' })
  email: string;
}

class ResetPasswordDto {
  @IsNotEmpty()
  token: string;

  @MinLength(6, { message: 'Mat khau toi thieu 6 ky tu' })
  newPassword: string;
}

class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Family.name) private readonly familyModel: Model<Family>,
    @InjectModel(Subscription.name) private readonly subscriptionModel: Model<Subscription>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase().trim() })
      .select('+password +refreshToken')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoac mat khau khong dung');
    }

    const payload = this.buildAuthPayload(user);
    const tokens = await this.generateTokens(payload);

    await this.userModel.findByIdAndUpdate((user as any)._id, {
      refreshToken: this.hashRefreshToken(tokens.refreshToken),
    });

    return {
      ...tokens,
      user: {
        id: payload.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: (user as any).isEmailVerified,
        managedFamilies: user.managedFamilies,
        assignedFamily: user.assignedFamily,
      },
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new ConflictException('Email da duoc su dung');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await this.connection.startSession();

    try {
      const result = await session.withTransaction(async () => this.registerInTransaction(
        dto,
        normalizedEmail,
        passwordHash,
        verifyToken,
        verifyExpires,
        session,
      ));

      if (!result) {
        throw new BadRequestException('Khong the hoan tat dang ky');
      }

      this.mailService.sendVerificationEmail(dto.email, dto.fullName, verifyToken);
      return result;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email da duoc su dung');
      }

      if (!this.isTransactionUnavailableError(error)) {
        throw error;
      }

      const result = await this.registerWithCompensation(
        dto,
        normalizedEmail,
        passwordHash,
        verifyToken,
        verifyExpires,
      );

      this.mailService.sendVerificationEmail(dto.email, dto.fullName, verifyToken);
      return result;
    } finally {
      await session.endSession();
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body('token') token: string) {
    if (!token) throw new BadRequestException('Token khong hop le');

    const user = await this.userModel
      .findOne({
        emailVerifyToken: token,
        emailVerifyExpires: { $gt: new Date() },
      })
      .select('+emailVerifyToken')
      .exec();

    if (!user) {
      throw new BadRequestException('Token khong hop le hoac da het han');
    }

    await this.userModel.findByIdAndUpdate((user as any)._id, {
      isEmailVerified: true,
      $unset: { emailVerifyToken: 1, emailVerifyExpires: 1 },
    });

    const family = await this.familyModel.findById(user.assignedFamily).exec();
    this.mailService.sendWelcomeEmail(user.email, user.fullName, family?.name || 'dong ho');

    return { message: 'Email da duoc xac thuc thanh cong!' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase().trim() }).exec();

    if (!user) {
      return { message: 'Neu email ton tai, chung toi da gui huong dan dat lai mat khau.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await this.userModel.findByIdAndUpdate((user as any)._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });

    this.mailService.sendPasswordResetEmail(user.email, user.fullName, resetToken);

    return { message: 'Neu email ton tai, chung toi da gui huong dan dat lai mat khau.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const user = await this.userModel
      .findOne({
        passwordResetToken: dto.token,
        passwordResetExpires: { $gt: new Date() },
      })
      .select('+passwordResetToken')
      .exec();

    if (!user) {
      throw new BadRequestException('Token khong hop le hoac da het han');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.userModel.findByIdAndUpdate((user as any)._id, {
      password: passwordHash,
      $unset: { passwordResetToken: 1, passwordResetExpires: 1, refreshToken: 1 },
    });

    return { message: 'Mat khau da duoc dat lai thanh cong!' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'giapha-refresh-secret');
      const payload = this.jwtService.verify(dto.refreshToken, { secret: refreshSecret });

      const user = await this.userModel
        .findById(payload.id)
        .select('+refreshToken')
        .exec();

      if (!user || !(user as any).refreshToken) {
        throw new UnauthorizedException('Phien dang nhap khong hop le');
      }

      const isValid = await this.matchesRefreshToken(dto.refreshToken, (user as any).refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Phien dang nhap khong hop le');
      }

      const newPayload = this.buildAuthPayload(user);
      const tokens = await this.generateTokens(newPayload);

      await this.userModel.findByIdAndUpdate((user as any)._id, {
        refreshToken: this.hashRefreshToken(tokens.refreshToken),
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Phien dang nhap da het han, vui long dang nhap lai');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthUser) {
    return user;
  }

  private buildAuthPayload(user: any): AuthUser {
    return {
      id: (user._id || user.id).toString(),
      email: user.email,
      role: user.role,
      managedFamilies: user.managedFamilies || [],
      assignedFamily: user.assignedFamily,
    };
  }

  private async generateTokens(payload: AuthUser) {
    const accessToken = this.jwtService.sign(payload);

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET', 'giapha-refresh-secret');
    const refreshToken = this.jwtService.sign(
      { id: payload.id, jti: crypto.randomBytes(16).toString('hex') },
      { secret: refreshSecret, expiresIn: '30d' },
    );

    return { accessToken, refreshToken };
  }

  private hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async matchesRefreshToken(token: string, storedValue?: string): Promise<boolean> {
    if (!storedValue) return false;
    if (storedValue.startsWith('$2')) {
      return bcrypt.compare(token, storedValue);
    }
    return this.hashRefreshToken(token) === storedValue;
  }

  private isTransactionUnavailableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('Transaction numbers are only allowed on a replica set member or mongos')
      || message.includes('transactions are not supported')
      || message.includes('Transaction support is not available');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return typeof error === 'object'
      && error !== null
      && 'code' in error
      && (error as { code?: number }).code === 11000;
  }

  private async registerInTransaction(
    dto: RegisterDto,
    normalizedEmail: string,
    passwordHash: string,
    verifyToken: string,
    verifyExpires: Date,
    session: ClientSession,
  ) {
    const family = await new this.familyModel({
      name: dto.familyName,
      contactName: dto.fullName,
      contactPhone: dto.phone || '',
      address: dto.address || '',
    }).save({ session });

    const familyId = (family as any)._id.toString();

    const user = await new this.userModel({
      fullName: dto.fullName,
      email: normalizedEmail,
      password: passwordHash,
      role: UserRole.TRUONG_HO,
      assignedFamily: familyId,
      isEmailVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpires: verifyExpires,
    }).save({ session });

    const userId = (user as any)._id.toString();

    await this.subscriptionsService.createFreeSubscription(userId, familyId, undefined, session);

    const payload = this.buildAuthPayload(user);
    const tokens = await this.generateTokens(payload);

    await this.userModel.findByIdAndUpdate(
      userId,
      { refreshToken: this.hashRefreshToken(tokens.refreshToken) },
      { session },
    );

    return this.buildRegisterResponse(user, familyId, tokens);
  }

  private async registerWithCompensation(
    dto: RegisterDto,
    normalizedEmail: string,
    passwordHash: string,
    verifyToken: string,
    verifyExpires: Date,
  ) {
    let familyId: string | undefined;
    let userId: string | undefined;

    try {
      const family = await new this.familyModel({
        name: dto.familyName,
        contactName: dto.fullName,
        contactPhone: dto.phone || '',
        address: dto.address || '',
      }).save();

      familyId = (family as any)._id.toString();

      const user = await new this.userModel({
        fullName: dto.fullName,
        email: normalizedEmail,
        password: passwordHash,
        role: UserRole.TRUONG_HO,
        assignedFamily: familyId,
        isEmailVerified: false,
        emailVerifyToken: verifyToken,
        emailVerifyExpires: verifyExpires,
      }).save();

      userId = (user as any)._id.toString();
      if (!familyId || !userId) {
        throw new BadRequestException('Khong the hoan tat dang ky');
      }

      await this.subscriptionsService.createFreeSubscription(userId, familyId);

      const payload = this.buildAuthPayload(user);
      const tokens = await this.generateTokens(payload);

      await this.userModel.findByIdAndUpdate(userId, {
        refreshToken: this.hashRefreshToken(tokens.refreshToken),
      });

      return this.buildRegisterResponse(user, familyId, tokens);
    } catch (error) {
      if (userId) {
        await this.subscriptionModel.deleteMany({ user: userId }).exec();
        await this.userModel.deleteOne({ _id: userId }).exec();
      }
      if (familyId) {
        await this.familyModel.deleteOne({ _id: familyId }).exec();
      }
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Email da duoc su dung');
      }
      throw error;
    }
  }

  private buildRegisterResponse(
    user: User,
    familyId: string,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    return {
      message: 'Dang ky thanh cong! Vui long kiem tra email de xac thuc tai khoan.',
      ...tokens,
      user: {
        id: (user as any)._id.toString(),
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isEmailVerified: false,
        assignedFamily: familyId,
      },
    };
  }
}
