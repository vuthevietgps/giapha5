import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule, FormsModule, RouterLink,
  ],
  template: `
    <div class="reset-container">
      <mat-card class="reset-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon class="title-icon">lock_reset</mat-icon>
            Đặt lại mật khẩu
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          @if (message) {
            <div [class]="success ? 'success-banner' : 'error-banner'">
              <mat-icon>{{ success ? 'check_circle' : 'error' }}</mat-icon>
              {{ message }}
            </div>
          }

          @if (!done) {
            <form (ngSubmit)="submit()" class="reset-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Mật khẩu mới</mat-label>
                <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="newPassword" name="newPassword" required minlength="6">
                <mat-icon matPrefix>lock</mat-icon>
                <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword">
                  <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-hint>Tối thiểu 6 ký tự</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Xác nhận mật khẩu</mat-label>
                <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="confirmPassword" name="confirmPassword" required>
                <mat-icon matPrefix>lock_outline</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" class="full-width submit-btn" [disabled]="loading">
                @if (loading) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  Đặt lại mật khẩu
                }
              </button>
            </form>
          }

          @if (done) {
            <div class="back-link">
              <a routerLink="/login"><mat-icon>login</mat-icon> Đăng nhập ngay</a>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reset-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 20px; }
    .reset-card { max-width: 440px; width: 100%; padding: 32px; border-radius: 16px; }
    .title-icon { vertical-align: middle; margin-right: 8px; color: #D4AF37; }
    .reset-form { margin-top: 16px; }
    .full-width { width: 100%; }
    .submit-btn { height: 48px; font-size: 16px; margin-top: 8px; border-radius: 50px; }
    .error-banner { background: #ffebee; color: #c62828; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .success-banner { background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .back-link { text-align: center; margin-top: 16px; a { color: #666; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; text-decoration: none; &:hover { color: #D4AF37; } } }
  `],
})
export class ResetPasswordPage implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token = '';
  newPassword = '';
  confirmPassword = '';
  hidePassword = true;
  loading = false;
  done = false;
  success = false;
  message = '';

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.message = 'Link đặt lại mật khẩu không hợp lệ';
      this.done = true;
    }
  }

  async submit() {
    if (this.newPassword.length < 6) {
      this.message = 'Mật khẩu tối thiểu 6 ký tự'; this.success = false; return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.message = 'Mật khẩu xác nhận không khớp'; this.success = false; return;
    }

    this.loading = true;
    const result = await this.authService.resetPassword(this.token, this.newPassword);
    this.loading = false;
    this.message = result.message;
    this.success = result.success;
    if (result.success) this.done = true;
  }
}
