import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, FormsModule, RouterLink,
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="title-icon">family_restroom</mat-icon>
            Đăng ký Gia Phả Số
          </mat-card-title>
          <mat-card-subtitle>Tạo tài khoản miễn phí để số hóa gia phả dòng họ</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (errorMessage) {
            <div class="error-banner">
              <mat-icon>error</mat-icon>
              {{ errorMessage }}
            </div>
          }
          @if (successMessage) {
            <div class="success-banner">
              <mat-icon>check_circle</mat-icon>
              {{ successMessage }}
            </div>
          }

          <form (ngSubmit)="register()" class="register-form">
            <h3 class="section-title">Thông tin cá nhân</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Họ và tên</mat-label>
              <input matInput [(ngModel)]="form.fullName" name="fullName" required placeholder="Nguyễn Văn A">
              <mat-icon matPrefix>person</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" [(ngModel)]="form.email" name="email" required placeholder="email@example.com">
              <mat-icon matPrefix>email</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mật khẩu</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="form.password" name="password" required minlength="6">
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Tối thiểu 6 ký tự</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nhập lại mật khẩu</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="form.confirmPassword" name="confirmPassword" required>
              <mat-icon matPrefix>lock_outline</mat-icon>
            </mat-form-field>

            <h3 class="section-title">Thông tin dòng họ</h3>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Tên dòng họ</mat-label>
              <input matInput [(ngModel)]="form.familyName" name="familyName" required placeholder="Họ Nguyễn - Chi 1">
              <mat-icon matPrefix>account_tree</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Số điện thoại (tùy chọn)</mat-label>
              <input matInput [(ngModel)]="form.phone" name="phone" placeholder="0912345678">
              <mat-icon matPrefix>phone</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Địa chỉ (tùy chọn)</mat-label>
              <input matInput [(ngModel)]="form.address" name="address" placeholder="Xã, Huyện, Tỉnh">
              <mat-icon matPrefix>location_on</mat-icon>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <ng-container>
                  <mat-icon>how_to_reg</mat-icon>
                  <span>Đăng ký miễn phí</span>
                </ng-container>
              }
            </button>
          </form>

          <div class="login-link">
            Đã có tài khoản? <a routerLink="/login">Đăng nhập</a>
          </div>

          <div class="back-link">
            <a href="/">
              <mat-icon>arrow_back</mat-icon>
              Quay về trang chủ
            </a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
    }
    .register-card {
      max-width: 520px;
      width: 100%;
      padding: 32px;
      border-radius: 16px;
    }
    .title-icon { vertical-align: middle; margin-right: 8px; color: #D4AF37; }
    .register-form { margin-top: 16px; }
    .section-title {
      margin: 16px 0 8px;
      color: #B8860B;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 16px; margin-top: 8px; border-radius: 50px; }
    .error-banner {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .success-banner {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .login-link {
      text-align: center;
      margin-top: 16px;
      a { color: #D4AF37; font-weight: 600; text-decoration: none; &:hover { color: #B8860B; } }
    }
    .back-link {
      text-align: center;
      margin-top: 12px;
      a {
        color: #666;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-decoration: none;
        &:hover { color: #D4AF37; }
      }
    }
  `],
})
export class RegisterPage {
  private authService = inject(AuthService);
  private router = inject(Router);

  form = { fullName: '', email: '', password: '', confirmPassword: '', familyName: '', phone: '', address: '' };
  hidePassword = true;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async register() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.fullName || !this.form.email || !this.form.password || !this.form.familyName) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin bắt buộc';
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.errorMessage = 'Email không hợp lệ';
      return;
    }

    if (this.form.password.length < 6) {
      this.errorMessage = 'Mật khẩu tối thiểu 6 ký tự';
      return;
    }

    if (this.form.password !== this.form.confirmPassword) {
      this.errorMessage = 'Mật khẩu nhập lại không khớp';
      return;
    }

    // Validate phone format if provided
    if (this.form.phone && !/^(0|\+84)[0-9]{9,10}$/.test(this.form.phone)) {
      this.errorMessage = 'Số điện thoại không hợp lệ';
      return;
    }

    this.loading = true;
    const result = await this.authService.register(this.form);
    this.loading = false;

    if (result.success) {
      this.successMessage = result.message;
      setTimeout(() => this.router.navigate(['/dashboard']), 1500);
    } else {
      this.errorMessage = result.message;
    }
  }
}
