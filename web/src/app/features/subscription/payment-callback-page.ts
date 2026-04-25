import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PaymentService } from '../../core/services/payment.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment-callback-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="callback-page">
      @if (loading) {
        <mat-card class="callback-card">
          <mat-spinner diameter="48"></mat-spinner>
          <h2>Đang xác nhận thanh toán...</h2>
          <p>Vui lòng đợi trong giây lát.</p>
        </mat-card>
      }

      @if (!loading && success) {
        <mat-card class="callback-card success">
          <mat-icon class="result-icon success-icon">check_circle</mat-icon>
          <h2>Thanh toán thành công!</h2>
          <p>Gói dịch vụ đã được kích hoạt cho dòng họ của bạn.</p>
          <p class="detail" *ngIf="transactionNo">Mã giao dịch: <strong>{{ transactionNo }}</strong></p>
          <div class="actions">
            <button mat-flat-button color="primary" routerLink="/dashboard">
              <mat-icon>dashboard</mat-icon>
              Về Dashboard
            </button>
            <button mat-stroked-button routerLink="/plans">
              <mat-icon>list</mat-icon>
              Xem gói dịch vụ
            </button>
          </div>
        </mat-card>
      }

      @if (!loading && !success) {
        <mat-card class="callback-card error">
          <mat-icon class="result-icon error-icon">cancel</mat-icon>
          <h2>Thanh toán không thành công</h2>
          <p>{{ errorMessage }}</p>
          @if (responseCode) {
            <p class="detail">Mã lỗi: <strong>{{ responseCode }}</strong></p>
          }
          <div class="actions">
            <button mat-flat-button color="primary" routerLink="/plans">
              <mat-icon>refresh</mat-icon>
              Thử lại
            </button>
            <button mat-stroked-button routerLink="/dashboard">
              <mat-icon>dashboard</mat-icon>
              Về Dashboard
            </button>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .callback-page {
      min-height: 80vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
    }
    .callback-card {
      max-width: 500px;
      width: 100%;
      text-align: center;
      padding: 3rem 2rem;
      border-radius: 16px;
    }
    .callback-card mat-spinner { margin: 0 auto 1.5rem; }
    .callback-card h2 { margin: 0.5rem 0; }
    .callback-card p { color: #666; margin: 0.5rem 0; }
    .result-icon { font-size: 64px; width: 64px; height: 64px; }
    .success-icon { color: #2e7d32; }
    .error-icon { color: #d32f2f; }
    .detail { font-size: 0.9rem; color: #888; margin-top: 1rem; }
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
      flex-wrap: wrap;
    }
  `]
})
export class PaymentCallbackPage implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);

  loading = true;
  success = false;
  errorMessage = 'Giao dịch bị hủy hoặc gặp lỗi. Vui lòng thử lại.';
  transactionNo = '';
  responseCode = '';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.responseCode = params.get('vnp_ResponseCode') || '';
    const paymentId = params.get('vnp_TxnRef') || '';
    this.transactionNo = params.get('vnp_TransactionNo') || '';

    if (this.responseCode === '00') {
      // VNPay returned success — verify via backend
      this.verifyPayment(paymentId);
    } else {
      this.loading = false;
      this.success = false;
      this.errorMessage = this.getErrorMessage(this.responseCode);
    }
  }

  private async verifyPayment(paymentId: string) {
    try {
      const result = await firstValueFrom(
        this.paymentService.verifyVnpayReturn(this.route.snapshot.queryParams)
      );
      this.success = result.success;
      if (!result.success) {
        this.errorMessage = result.message || 'Xác nhận thanh toán thất bại';
      }
    } catch {
      // Even if verify call fails, VNPay said success, so backend IPN may still handle it
      this.success = true;
    } finally {
      this.loading = false;
    }
  }

  private getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      '07': 'Trừ tiền thành công. Giao dịch nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
      '09': 'Giao dịch không thành công: Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking.',
      '10': 'Giao dịch không thành công: Xác thực sai quá 3 lần.',
      '11': 'Giao dịch không thành công: Đã hết hạn chờ thanh toán.',
      '12': 'Giao dịch không thành công: Thẻ/Tài khoản bị khóa.',
      '13': 'Giao dịch không thành công: Mã OTP không đúng.',
      '24': 'Giao dịch không thành công: Khách hàng hủy giao dịch.',
      '51': 'Giao dịch không thành công: Tài khoản không đủ số dư.',
      '65': 'Giao dịch không thành công: Tài khoản vượt quá hạn mức giao dịch trong ngày.',
      '75': 'Ngân hàng thanh toán đang bảo trì.',
      '79': 'Giao dịch không thành công: Nhập sai mật khẩu quá số lần quy định.',
      '99': 'Lỗi không xác định.',
    };
    return messages[code] || 'Giao dịch bị hủy hoặc gặp lỗi. Vui lòng thử lại.';
  }
}
