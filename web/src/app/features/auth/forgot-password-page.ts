import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, FormsModule, RouterLink,
  ],
  template: `
    <div class="forgot-container">
      <mat-card class="forgot-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="title-icon">lock_reset</mat-icon>
            Quên mật khẩu
          </mat-card-title>
          <mat-card-subtitle>Nhập email để nhận hướng dẫn đặt lại mật khẩu</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (message) {
            <div [class]="success ? 'success-banner' : 'error-banner'">
              <mat-icon>{{ success ? 'check_circle' : 'error' }}</mat-icon>
              {{ message }}
            </div>
          }

          @if (!sent) {
            <form (ngSubmit)="submit()" class="forgot-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" [(ngModel)]="email" name="email" required placeholder="email@example.com">
                <mat-icon matPrefix>email</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Gửi hướng dẫn
                }
              </button>
            </form>
          }

          <div class="back-link">
            <a routerLink="/login"><mat-icon>arrow_back</mat-icon> Quay lại đăng nhập</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .forgot-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
    }
    .forgot-card { max-width: 440px; width: 100%; padding: 32px; border-radius: 16px; }
    .title-icon { vertical-align: middle; margin-right: 8px; color: #D4AF37; }
    .forgot-form { margin-top: 16px; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 16px; border-radius: 50px; }
    .error-banner { background: #ffebee; color: #c62828; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .success-banner { background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .back-link { text-align: center; margin-top: 16px; a { color: #666; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; &:hover { color: #D4AF37; } } }
  `],
})
export class ForgotPasswordPage {
  private authService = inject(AuthService);

  email = '';
  loading = false;
  sent = false;
  success = false;
  message = '';

  async submit() {
    if (!this.email) { this.message = 'Vui lòng nhập email'; this.success = false; return; }

    this.loading = true;
    const result = await this.authService.forgotPassword(this.email);
    this.loading = false;
    this.message = result.message;
    this.success = result.success;
    if (result.success) this.sent = true;
  }
}
