import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST', 'smtp.gmail.com');
    const port = this.config.get<number>('MAIL_PORT', 587);
    const user = this.config.get<string>('MAIL_USER', '');
    const pass = this.config.get<string>('MAIL_PASS', '');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass } : undefined,
    });
  }

  private get fromAddress(): string {
    return this.config.get<string>('MAIL_FROM', 'Gia Phả Số <noreply@giaphaso.vn>');
  }

  private get appUrl(): string {
    return this.config.get<string>('APP_URL', 'http://localhost:4200');
  }

  async sendVerificationEmail(email: string, fullName: string, token: string): Promise<void> {
    const verifyUrl = `${this.appUrl}/verify-email?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Xác thực tài khoản - Gia Phả Số',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1a237e">Xin chào ${fullName}!</h2>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại <strong>Gia Phả Số</strong>.</p>
            <p>Vui lòng nhấn nút bên dưới để xác thực email của bạn:</p>
            <div style="text-align:center;margin:30px 0">
              <a href="${verifyUrl}"
                 style="background:#1a237e;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px">
                Xác thực email
              </a>
            </div>
            <p style="color:#666;font-size:13px">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
            <p style="color:#666;font-size:13px">Link sẽ hết hạn sau 24 giờ.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:12px">Gia Phả Số - Số hóa gia phả Việt Nam</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send verification email to ${email}`, err);
      // Don't throw - allow signup to succeed even if email fails
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, token: string): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: 'Đặt lại mật khẩu - Gia Phả Số',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1a237e">Xin chào ${fullName}!</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <p>Nhấn nút bên dưới để tạo mật khẩu mới:</p>
            <div style="text-align:center;margin:30px 0">
              <a href="${resetUrl}"
                 style="background:#d32f2f;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px">
                Đặt lại mật khẩu
              </a>
            </div>
            <p style="color:#666;font-size:13px">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
            <p style="color:#666;font-size:13px">Link sẽ hết hạn sau 1 giờ.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:12px">Gia Phả Số - Số hóa gia phả Việt Nam</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
    }
  }

  async sendWelcomeEmail(email: string, fullName: string, familyName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `Chào mừng đến với Gia Phả Số!`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1a237e">Chào mừng ${fullName}!</h2>
            <p>Tài khoản của bạn đã được kích hoạt thành công.</p>
            <p>Dòng họ <strong>${familyName}</strong> đã được tạo. Bạn có thể bắt đầu:</p>
            <ul>
              <li>Thêm thành viên vào dòng họ</li>
              <li>Xây dựng cây phả đồ</li>
              <li>Ghi lại các ngày lễ quan trọng</li>
            </ul>
            <div style="text-align:center;margin:30px 0">
              <a href="${this.appUrl}/login"
                 style="background:#1a237e;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:16px">
                Bắt đầu sử dụng
              </a>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:12px">Gia Phả Số - Số hóa gia phả Việt Nam</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err);
    }
  }

  async sendPaymentConfirmEmail(email: string, fullName: string, planName: string, amount: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: email,
        subject: `Xác nhận thanh toán gói ${planName} - Gia Phả Số`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
            <h2 style="color:#1a237e">Thanh toán thành công!</h2>
            <p>Xin chào ${fullName},</p>
            <p>Chúng tôi đã nhận được thanh toán của bạn:</p>
            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Gói dịch vụ</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${planName}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee"><strong>Số tiền</strong></td><td style="padding:8px;border-bottom:1px solid #eee">${amount}</td></tr>
            </table>
            <p>Gói dịch vụ đã được kích hoạt ngay lập tức.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:12px">Gia Phả Số - Số hóa gia phả Việt Nam</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error(`Failed to send payment confirmation email to ${email}`, err);
    }
  }
}
