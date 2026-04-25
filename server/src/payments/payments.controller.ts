import {
  Controller, Post, Get, Body, Query, Req, UseGuards,
  HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { VnpayService } from './vnpay.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentMethod } from '../subscriptions/schemas/payment.schema';
import { MailService } from '../mail/mail.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Resource, Action, CurrentUser } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/permissions.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

class CreatePaymentDto {
  @IsNotEmpty({ message: 'planSlug khong duoc de trong' })
  @IsString()
  planSlug: string;

  @IsNotEmpty({ message: 'familyId khong duoc de trong' })
  @IsString()
  familyId: string;

  @IsIn(['vnpay', 'bank_transfer'], { message: 'Phuong thuc thanh toan khong hop le' })
  method: 'vnpay' | 'bank_transfer';
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly vnpay: VnpayService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Tao don thanh toan - tra ve URL thanh toan VNPay hoac thong tin chuyen khoan
   */
  @Post('create')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('create')
  @HttpCode(HttpStatus.OK)
  async createPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ) {
    const { subscription, payment } = await this.subscriptionsService.createPaidSubscription(
      user.id, dto.familyId, dto.planSlug, dto.method === 'vnpay' ? 'VNPAY' : 'BANK_TRANSFER', user,
    );

    const paymentId = (payment as any).id || (payment as any)._id.toString();
    const subscriptionId = (subscription as any).id || (subscription as any)._id.toString();

    if (dto.method === 'vnpay' && this.vnpay.isConfigured) {
      const plan = await this.subscriptionsService.findPlanBySlug(dto.planSlug);
      const ipAddr = req.headers['x-forwarded-for'] as string || req.ip || '127.0.0.1';
      const { paymentUrl } = this.vnpay.createPaymentUrl(
        paymentId, plan.price,
        `Thanh toan goi ${plan.name} - Gia Pha So`,
        ipAddr,
      );

      return { method: 'vnpay', paymentUrl, paymentId, subscriptionId };
    }

    const plan = await this.subscriptionsService.findPlanBySlug(dto.planSlug);
    const bankName = this.configService.get<string>('BANK_NAME', 'Vietcombank');
    const accountNumber = this.configService.get<string>('BANK_ACCOUNT_NUMBER', '1234567890');
    const accountHolder = this.configService.get<string>('BANK_ACCOUNT_HOLDER', 'CONG TY GIA PHA SO');
    const bankCode = this.configService.get<string>('BANK_CODE', 'VCB');

    return {
      method: 'bank_transfer',
      paymentId,
      subscriptionId,
      bankInfo: {
        bankName,
        accountNumber,
        accountHolder,
        amount: plan.price,
        content: `GP ${paymentId}`,
        qrData: this.generateVietQR(plan.price, paymentId, bankCode, accountNumber, accountHolder),
      },
    };
  }

  /**
   * VNPay callback / verify path.
   * The default gateway return URL points to the frontend callback page, so
   * backend verification must be able to persist the successful payment too.
   */
  @Get('vnpay-return')
  async vnpayReturn(@Query() query: Record<string, string>) {
    return this.handleVnpayCallback(query);
  }

  /**
   * Admin xac nhan thanh toan chuyen khoan thu cong
   */
  @Post('confirm')
  @UseGuards(PermissionsGuard)
  @Resource('users')
  @Action('update')
  @HttpCode(HttpStatus.OK)
  async confirmManualPayment(
    @CurrentUser() user: AuthUser,
    @Body() body: { paymentId: string; transactionId?: string },
  ) {
    const payment = await this.subscriptionsService.confirmPayment(
      body.paymentId, body.transactionId, user,
    );

    const userDoc = await this.userModel.findById(payment.user).exec();
    if (userDoc) {
      this.mailService.sendPaymentConfirmEmail(
        userDoc.email, userDoc.fullName,
        'Goi dich vu', `${(payment.amount).toLocaleString('vi-VN')}d`,
      );
    }

    return { success: true, payment };
  }

  /**
   * Kiem tra trang thai thanh toan
   */
  @Get('status')
  @UseGuards(PermissionsGuard)
  @Resource('members')
  @Action('read')
  async checkPaymentStatus(@CurrentUser() user: AuthUser, @Query('paymentId') paymentId: string) {
    if (!paymentId) throw new BadRequestException('Thieu paymentId');
    return this.subscriptionsService.getPaymentById(paymentId, user);
  }

  /**
   * Frontend goi de verify ket qua VNPay return (bo sung cho callback gateway)
   */
  @Get('vnpay-verify')
  async vnpayVerify(@Query() query: Record<string, string>) {
    return this.handleVnpayCallback(query);
  }

  private async handleVnpayCallback(query: Record<string, string>) {
    const isValid = this.vnpay.verifyReturnUrl({ ...query });
    if (!isValid) {
      return { success: false, message: 'Chu ky khong hop le' };
    }

    const responseCode = query['vnp_ResponseCode'];
    const paymentId = query['vnp_TxnRef'];
    const transactionNo = query['vnp_TransactionNo'];
    const rawAmount = Number(query['vnp_Amount']);

    if (responseCode === '00') {
      const amount = Number.isInteger(rawAmount) && rawAmount > 0 && rawAmount % 100 === 0
        ? rawAmount / 100
        : NaN;
      const isAllowed = !!paymentId
        && Number.isFinite(amount)
        && await this.subscriptionsService.isGatewayConfirmationAllowed(
          paymentId,
          PaymentMethod.VNPAY,
          amount,
        );

      if (!isAllowed) {
        return { success: false, message: 'Du lieu thanh toan khong hop le' };
      }

      const payment = await this.subscriptionsService.confirmPayment(paymentId, transactionNo);

      const userDoc = await this.userModel.findById(payment.user).exec();
      if (userDoc) {
        const planName = await this.subscriptionsService.getPlanNameByPayment(paymentId);
        this.mailService.sendPaymentConfirmEmail(
          userDoc.email, userDoc.fullName,
          planName, `${(payment.amount).toLocaleString('vi-VN')}d`,
        );
      }

      return { success: true, message: 'Thanh toan thanh cong!' };
    }

    return { success: false, message: 'Thanh toan khong thanh cong', code: responseCode };
  }

  private generateVietQR(
    amount: number, reference: string,
    bankCode = 'VCB', accountNumber = '1234567890', accountName = 'CONG TY GIA PHA SO',
  ): string {
    const encodedName = encodeURIComponent(accountName);
    return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=GP%20${reference}&accountName=${encodedName}`;
  }
}
