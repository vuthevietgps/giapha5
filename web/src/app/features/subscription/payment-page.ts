import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PaymentService, BankTransferResponse } from '../../core/services/payment.service';
import { SubscriptionService, Plan } from '../../core/services/subscription.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatRadioModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="payment-page">
      <!-- Step 1: Choose payment method -->
      @if (step === 'choose') {
        <div class="step-choose">
          <div class="page-header">
            <h1>Thanh toán</h1>
            @if (selectedPlan) {
              <p class="subtitle">Gói {{ selectedPlan.name }} — {{ selectedPlan.price | number:'1.0-0' }}đ / {{ selectedPlan.durationMonths }} tháng</p>
            }
          </div>

          <mat-card class="method-card">
            <h3>Chọn phương thức thanh toán</h3>

            <mat-radio-group [(ngModel)]="paymentMethod" class="method-list">
              <div class="method-option" (click)="paymentMethod = 'bank_transfer'">
                <mat-radio-button value="bank_transfer">
                  <div class="method-info">
                    <mat-icon>account_balance</mat-icon>
                    <div>
                      <strong>Chuyển khoản ngân hàng</strong>
                      <p>Quét mã QR hoặc chuyển khoản thủ công</p>
                    </div>
                  </div>
                </mat-radio-button>
              </div>
              <div class="method-option" (click)="paymentMethod = 'vnpay'">
                <mat-radio-button value="vnpay">
                  <div class="method-info">
                    <mat-icon>payment</mat-icon>
                    <div>
                      <strong>VNPay</strong>
                      <p>Thanh toán qua cổng VNPay (ATM, Visa, MasterCard)</p>
                    </div>
                  </div>
                </mat-radio-button>
              </div>
            </mat-radio-group>

            <div class="method-actions">
              <button mat-stroked-button routerLink="/plans">
                <mat-icon>arrow_back</mat-icon>
                Quay lại
              </button>
              <button mat-flat-button color="primary"
                      [disabled]="!paymentMethod || processing"
                      (click)="submitPayment()">
                @if (processing) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Tiếp tục thanh toán
                }
              </button>
            </div>

            @if (error) {
              <div class="error-msg">
                <mat-icon color="warn">error</mat-icon>
                {{ error }}
              </div>
            }
          </mat-card>
        </div>
      }

      <!-- Step 2: Bank transfer details -->
      @if (step === 'bank_transfer' && bankInfo) {
        <div class="step-bank">
          <div class="page-header">
            <mat-icon class="header-icon">account_balance</mat-icon>
            <h1>Chuyển khoản ngân hàng</h1>
            <p class="subtitle">Vui lòng chuyển khoản theo thông tin bên dưới</p>
          </div>

          <mat-card class="bank-card">
            <div class="qr-section">
              <img [src]="bankInfo.bankInfo.qrData"
                   alt="Mã QR chuyển khoản"
                   class="qr-image"
                   onerror="this.style.display='none'">
              <p class="qr-hint">Quét mã QR bằng ứng dụng ngân hàng</p>
            </div>

            <div class="bank-details">
              <div class="detail-row">
                <span class="label">Ngân hàng:</span>
                <strong>{{ bankInfo.bankInfo.bankName }}</strong>
              </div>
              <div class="detail-row">
                <span class="label">Số tài khoản:</span>
                <strong class="copyable" (click)="copyText(bankInfo.bankInfo.accountNumber)">
                  {{ bankInfo.bankInfo.accountNumber }}
                  <mat-icon>content_copy</mat-icon>
                </strong>
              </div>
              <div class="detail-row">
                <span class="label">Chủ tài khoản:</span>
                <strong>{{ bankInfo.bankInfo.accountHolder }}</strong>
              </div>
              <div class="detail-row">
                <span class="label">Số tiền:</span>
                <strong class="amount">{{ bankInfo.bankInfo.amount | number:'1.0-0' }}đ</strong>
              </div>
              <div class="detail-row">
                <span class="label">Nội dung CK:</span>
                <strong class="copyable" (click)="copyText(bankInfo.bankInfo.content)">
                  {{ bankInfo.bankInfo.content }}
                  <mat-icon>content_copy</mat-icon>
                </strong>
              </div>
            </div>

            <!-- Payment status check -->
            <div class="status-section">
              @if (checkingStatus) {
                <div class="status-checking">
                  <mat-spinner diameter="20"></mat-spinner>
                  <span>Đang kiểm tra trạng thái...</span>
                </div>
              } @else if (paymentConfirmed) {
                <div class="status-confirmed">
                  <mat-icon>check_circle</mat-icon>
                  <span>Thanh toán đã được xác nhận!</span>
                </div>
              } @else {
                <button mat-stroked-button (click)="checkPaymentStatus()">
                  <mat-icon>refresh</mat-icon>
                  Kiểm tra trạng thái thanh toán
                </button>
              }
            </div>

            <div class="bank-notice">
              <mat-icon>info</mat-icon>
              <div>
                <p><strong>Lưu ý quan trọng:</strong></p>
                <ul>
                  <li>Vui lòng ghi đúng nội dung chuyển khoản</li>
                  <li>Thanh toán sẽ được xác nhận trong vòng 24 giờ</li>
                  <li>Liên hệ hotline nếu cần hỗ trợ</li>
                </ul>
              </div>
            </div>

            <div class="bank-actions">
              <button mat-flat-button color="primary" routerLink="/dashboard">
                <mat-icon>dashboard</mat-icon>
                Về Dashboard
              </button>
            </div>
          </mat-card>
        </div>
      }

      <!-- Step: VNPay redirect -->
      @if (step === 'vnpay_redirect') {
        <div class="step-redirect">
          <mat-card class="redirect-card">
            <mat-spinner diameter="48"></mat-spinner>
            <h2>Đang chuyển đến VNPay...</h2>
            <p>Bạn sẽ được chuyển đến cổng thanh toán VNPay trong giây lát.</p>
          </mat-card>
        </div>
      }

      <!-- Loading -->
      @if (step === 'loading') {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Đang tải thông tin...</p>
        </div>
      }

      <!-- Copied toast -->
      @if (copied) {
        <div class="copy-toast">
          <mat-icon>check</mat-icon>
          Đã sao chép!
        </div>
      }
    </div>
  `,
  styles: [`
    .payment-page {
      max-width: 640px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    .page-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .page-header h1 { margin: 0 0 0.5rem; }
    .header-icon { font-size: 48px; width: 48px; height: 48px; color: #1976d2; }
    .subtitle { color: #666; font-size: 1.05rem; }

    .method-card, .bank-card, .redirect-card {
      padding: 2rem;
      border-radius: 12px;
    }
    .method-card h3 { margin: 0 0 1.5rem; }

    .method-list { display: flex; flex-direction: column; gap: 1rem; }
    .method-option {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .method-option:hover { border-color: #1976d2; }
    .method-info {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: 8px;
    }
    .method-info mat-icon { font-size: 28px; width: 28px; height: 28px; color: #1976d2; }
    .method-info p { margin: 2px 0 0; font-size: 0.85rem; color: #888; }

    .method-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 2rem;
      gap: 1rem;
    }

    .error-msg {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 1rem;
      color: #d32f2f;
      font-size: 0.9rem;
    }

    .qr-section {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .qr-image {
      max-width: 280px;
      width: 100%;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }
    .qr-hint { color: #888; font-size: 0.85rem; margin-top: 0.5rem; }

    .bank-details {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .amount { color: #d32f2f; font-size: 1.2rem; }
    .copyable {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      color: #1976d2;
    }
    .copyable mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .bank-notice {
      display: flex;
      gap: 12px;
      background: #fff3e0;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }
    .bank-notice mat-icon { color: #ef6c00; flex-shrink: 0; }
    .bank-notice ul { margin: 4px 0 0; padding-left: 1.2rem; }
    .bank-notice li { font-size: 0.9rem; color: #555; margin-bottom: 2px; }

    .bank-actions { text-align: center; }

    .status-section {
      text-align: center;
      margin-bottom: 1.5rem;
    }
    .status-checking {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #666;
    }
    .status-confirmed {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #2e7d32;
      font-weight: 600;
    }
    .status-confirmed mat-icon { color: #2e7d32; }

    .redirect-card {
      text-align: center;
      padding: 3rem;
    }
    .redirect-card mat-spinner { margin: 0 auto 1rem; }

    .loading-state {
      text-align: center;
      padding: 3rem;
    }

    .copy-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.9rem;
      z-index: 1000;
      animation: fadeInOut 2s ease forwards;
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
      15% { opacity: 1; transform: translateX(-50%) translateY(0); }
      85% { opacity: 1; }
      100% { opacity: 0; }
    }
  `]
})
export class PaymentPage implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private subscriptionService = inject(SubscriptionService);
  private pollingTimer: any = null;

  step: 'loading' | 'choose' | 'bank_transfer' | 'vnpay_redirect' = 'loading';
  paymentMethod: 'vnpay' | 'bank_transfer' = 'bank_transfer';
  selectedPlan: Plan | null = null;
  familyId = '';
  error = '';
  processing = false;
  copied = false;
  bankInfo: BankTransferResponse | null = null;
  paymentId = '';
  checkingStatus = false;
  paymentConfirmed = false;

  ngOnInit() {
    const planSlug = this.route.snapshot.queryParamMap.get('plan');
    this.familyId = this.route.snapshot.queryParamMap.get('family') || '';

    if (!planSlug || !this.familyId) {
      this.router.navigate(['/plans']);
      return;
    }

    this.loadPlan(planSlug);
  }

  ngOnDestroy() {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  async loadPlan(slug: string) {
    try {
      const plans = await firstValueFrom(this.subscriptionService.getPlans());
      this.selectedPlan = plans.find(p => p.slug === slug) || null;
      if (!this.selectedPlan) {
        this.router.navigate(['/plans']);
        return;
      }
      this.step = 'choose';
    } catch {
      this.error = 'Không tải được thông tin gói dịch vụ';
      this.step = 'choose';
    }
  }

  async submitPayment() {
    if (!this.selectedPlan || !this.familyId || this.processing) return;

    this.processing = true;
    this.error = '';

    try {
      const response = await firstValueFrom(
        this.paymentService.createPayment({
          planSlug: this.selectedPlan.slug,
          familyId: this.familyId,
          method: this.paymentMethod,
        })
      );

      if (response.method === 'vnpay') {
        this.step = 'vnpay_redirect';
        // Redirect to VNPay
        setTimeout(() => {
          window.location.href = (response as any).paymentUrl;
        }, 1500);
      } else {
        this.bankInfo = response as BankTransferResponse;
        this.paymentId = response.paymentId;
        this.step = 'bank_transfer';
        // Start polling every 30 seconds
        this.startPolling();
      }
    } catch (err: any) {
      this.error = err?.error?.message || 'Tạo đơn thanh toán thất bại. Vui lòng thử lại.';
    } finally {
      this.processing = false;
    }
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }

  async checkPaymentStatus() {
    if (!this.paymentId || this.checkingStatus) return;
    this.checkingStatus = true;
    try {
      const payment = await firstValueFrom(this.paymentService.checkStatus(this.paymentId));
      if (payment?.status === 'SUCCESS') {
        this.paymentConfirmed = true;
        if (this.pollingTimer) clearInterval(this.pollingTimer);
      }
    } catch { /* ignore */ }
    finally { this.checkingStatus = false; }
  }

  private startPolling() {
    // Check every 30 seconds
    this.pollingTimer = setInterval(() => {
      if (!this.paymentConfirmed) {
        this.checkPaymentStatus();
      }
    }, 30000);
  }
}
