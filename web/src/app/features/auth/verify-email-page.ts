import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  template: `
    <div class="verify-container">
      <mat-card class="verify-card">
        @if (loading) {
          <div class="loading-state">
            <mat-spinner diameter="48"></mat-spinner>
            <p>Đang xác thực email...</p>
          </div>
        } @else {
          <div class="result-state">
            <mat-icon [class]="success ? 'success-icon' : 'error-icon'">
              {{ success ? 'check_circle' : 'error' }}
            </mat-icon>
            <h2>{{ success ? 'Xác thực thành công!' : 'Xác thực thất bại' }}</h2>
            <p>{{ message }}</p>
            <a mat-raised-button color="primary" routerLink="/dashboard">
              <mat-icon>{{ success ? 'dashboard' : 'login' }}</mat-icon>
              {{ success ? 'Vào Dashboard' : 'Đăng nhập' }}
            </a>
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .verify-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 20px; }
    .verify-card { max-width: 440px; width: 100%; padding: 40px; text-align: center; border-radius: 16px; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .result-state { display: flex; flex-direction: column; align-items: center; gap: 16px; }
    .success-icon { font-size: 64px; height: 64px; width: 64px; color: #2e7d32; }
    .error-icon { font-size: 64px; height: 64px; width: 64px; color: #c62828; }
  `],
})
export class VerifyEmailPage implements OnInit {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  loading = true;
  success = false;
  message = '';

  async ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.loading = false;
      this.message = 'Link xác thực không hợp lệ';
      return;
    }

    const result = await this.authService.verifyEmail(token);
    this.loading = false;
    this.success = result.success;
    this.message = result.message;
  }
}
