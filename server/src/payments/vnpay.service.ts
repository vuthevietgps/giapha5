import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface VnpayPaymentUrl {
  paymentUrl: string;
  orderId: string;
}

export interface VnpayReturnData {
  vnp_TxnRef: string;
  vnp_Amount: string;
  vnp_ResponseCode: string;
  vnp_TransactionNo: string;
  vnp_BankCode: string;
  vnp_SecureHash: string;
  [key: string]: string;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;

  constructor(private config: ConfigService) {
    this.tmnCode = this.config.get<string>('VNPAY_TMN_CODE', '');
    this.hashSecret = this.config.get<string>('VNPAY_HASH_SECRET', '');
    this.vnpUrl = this.config.get<string>('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    this.returnUrl = this.config.get<string>('VNPAY_RETURN_URL', 'http://localhost:4200/payment/callback');
  }

  get isConfigured(): boolean {
    return !!(this.tmnCode && this.hashSecret);
  }

  createPaymentUrl(
    orderId: string,
    amount: number, // VND
    orderInfo: string,
    ipAddr: string,
  ): VnpayPaymentUrl {
    if (!this.isConfigured) {
      throw new BadRequestException('VNPay chưa được cấu hình. Vui lòng sử dụng chuyển khoản ngân hàng.');
    }

    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Amount: String(amount * 100), // VNPay uses amount * 100
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    // Sort params alphabetically
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);

    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    sortedParams['vnp_SecureHash'] = signed;

    const paymentUrl = `${this.vnpUrl}?${new URLSearchParams(sortedParams).toString()}`;

    return { paymentUrl, orderId };
  }

  verifyReturnUrl(query: Record<string, string>): boolean {
    if (!this.isConfigured) return false;

    const secureHash = query['vnp_SecureHash'];
    delete query['vnp_SecureHash'];
    delete query['vnp_SecureHashType'];

    const sortedParams = Object.keys(query).sort().reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {} as Record<string, string>);

    const signData = new URLSearchParams(sortedParams).toString();
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }
}
