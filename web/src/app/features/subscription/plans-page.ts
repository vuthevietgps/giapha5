import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService, Plan } from '../../core/services/subscription.service';
import { AuthService } from '../../core/services/auth.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-plans-page',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="plans-page">
      <div class="page-header">
        <h1>Chọn gói dịch vụ</h1>
        <p class="subtitle">Nâng cấp để mở rộng gia phả và tận hưởng nhiều tính năng hơn</p>
      </div>

      <div *ngIf="loading" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Đang tải gói dịch vụ...</p>
      </div>

      <div *ngIf="error" class="error-state">
        <mat-icon color="warn">error</mat-icon>
        <p>{{ error }}</p>
        <button mat-stroked-button (click)="loadPlans()">Thử lại</button>
      </div>

      <div *ngIf="!loading && !error" class="plans-grid">
        <mat-card *ngFor="let plan of plans; let i = index"
                  class="plan-card"
                  [class.recommended]="plan.slug === 'basic'"
                  [class.current]="currentPlanSlug === plan.slug">
          <div class="plan-badge" *ngIf="plan.slug === 'basic'">Phổ biến nhất</div>
          <div class="plan-badge current-badge" *ngIf="currentPlanSlug === plan.slug">Đang dùng</div>

          <div class="plan-header">
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="amount" *ngIf="plan.price === 0">Miễn phí</span>
              <span class="amount" *ngIf="plan.price > 0">{{ plan.price | number:'1.0-0' }}đ</span>
              <span class="period" *ngIf="plan.price > 0">/ {{ plan.durationMonths }} tháng</span>
            </div>
            <div class="original-price" *ngIf="plan.originalPrice > plan.price">
              Giá gốc: <del>{{ plan.originalPrice | number:'1.0-0' }}đ</del>
            </div>
          </div>

          <div class="plan-limits">
            <div class="limit-row">
              <mat-icon>group</mat-icon>
              <span>{{ plan.maxMembers >= 999999 ? 'Không giới hạn' : plan.maxMembers }} thành viên</span>
            </div>
            <div class="limit-row">
              <mat-icon>admin_panel_settings</mat-icon>
              <span>{{ plan.maxAdmins }} quản trị viên</span>
            </div>
            <div class="limit-row">
              <mat-icon>cloud</mat-icon>
              <span>{{ plan.maxStorageGb }}GB lưu trữ</span>
            </div>
          </div>

          <ul class="feature-list">
            <li *ngFor="let feature of plan.features">
              <mat-icon>check_circle</mat-icon>
              <span>{{ feature }}</span>
            </li>
          </ul>

          <div class="plan-actions">
            <button mat-flat-button color="primary"
                    *ngIf="plan.price > 0 && currentPlanSlug !== plan.slug"
                    (click)="selectPlan(plan)"
                    [disabled]="processing">
              <mat-icon>upgrade</mat-icon>
              Nâng cấp ngay
            </button>
            <button mat-stroked-button
                    *ngIf="plan.price === 0 && !currentPlanSlug"
                    routerLink="/register">
              Dùng thử miễn phí
            </button>
            <button mat-stroked-button disabled
                    *ngIf="currentPlanSlug === plan.slug">
              <mat-icon>check</mat-icon>
              Đang sử dụng
            </button>
          </div>
        </mat-card>
      </div>

      <div class="back-link">
        <button mat-stroked-button routerLink="/dashboard">
          <mat-icon>arrow_back</mat-icon>
          Quay lại Dashboard
        </button>
      </div>
    </div>
  `,
  styles: [`
    .plans-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    .page-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .page-header h1 { margin: 0 0 0.5rem; font-size: 1.8rem; }
    .subtitle { color: #666; font-size: 1.05rem; }

    .loading-state, .error-state {
      text-align: center;
      padding: 3rem;
    }

    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .plan-card {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 1.5rem;
      border-radius: 12px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .plan-card:hover { transform: translateY(-4px); box-shadow: 0 8px 30px rgba(0,0,0,0.12); }
    .plan-card.recommended { border: 2px solid #1976d2; }
    .plan-card.current { border: 2px solid #4caf50; }

    .plan-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: #1976d2;
      color: white;
      padding: 4px 16px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .current-badge { background: #4caf50; }

    .plan-header {
      text-align: center;
      margin-bottom: 1rem;
      padding-top: 0.5rem;
    }
    .plan-header h3 { margin: 0 0 0.5rem; font-size: 1.3rem; }
    .plan-price { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
    .amount { font-size: 1.6rem; font-weight: 700; color: #1976d2; }
    .period { font-size: 0.85rem; color: #888; }
    .original-price { text-align: center; color: #999; font-size: 0.85rem; margin-top: 4px; }

    .plan-limits {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 1rem;
    }
    .limit-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 0.9rem;
    }
    .limit-row mat-icon { font-size: 18px; width: 18px; height: 18px; color: #1976d2; }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem;
      flex: 1;
    }
    .feature-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: 0.9rem;
    }
    .feature-list li mat-icon { font-size: 16px; width: 16px; height: 16px; color: #4caf50; }

    .plan-actions {
      text-align: center;
      margin-top: auto;
    }
    .plan-actions button { width: 100%; }

    .back-link {
      text-align: center;
      margin-top: 1rem;
    }
  `]
})
export class PlansPage implements OnInit {
  private router = inject(Router);
  private subscriptionService = inject(SubscriptionService);
  private authService = inject(AuthService);

  plans: Plan[] = [];
  currentPlanSlug = '';
  loading = true;
  error = '';
  processing = false;

  ngOnInit() {
    this.loadPlans();
  }

  async loadPlans() {
    this.loading = true;
    this.error = '';
    try {
      this.plans = await firstValueFrom(this.subscriptionService.getPlans());
      // Try to get current subscription to highlight active plan
      const user = this.authService.user();
      if (user?.assignedFamily) {
        try {
          const sub = await firstValueFrom(
            this.subscriptionService.getFamilySubscription(user.assignedFamily)
          );
          if (sub?.plan) this.currentPlanSlug = sub.plan.slug;
        } catch { /* ignore - may not have subscription */ }
      }
    } catch (e: any) {
      this.error = 'Không tải được danh sách gói dịch vụ.';
    } finally {
      this.loading = false;
    }
  }

  selectPlan(plan: Plan) {
    if (plan.slug === 'unlimited') {
      // For unlimited, go to contact
      this.router.navigate(['/'], { fragment: 'contact' });
      return;
    }
    const user = this.authService.user();
    const familyId = user?.assignedFamily || user?.managedFamilies?.[0];
    if (!familyId) {
      this.error = 'Bạn chưa được gán vào dòng họ nào. Vui lòng liên hệ quản trị viên.';
      return;
    }
    this.router.navigate(['/payment'], {
      queryParams: { plan: plan.slug, family: familyId },
    });
  }
}
