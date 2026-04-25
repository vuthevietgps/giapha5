import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FamilyService } from '../families/services/family';
import { MemberService } from '../members/services/member';
import { PostService } from '../posts/services/post';
import { UserService } from '../users/services/user';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService, Plan, Subscription } from '../../core/services/subscription.service';

interface UsageLimit {
  label: string;
  used: number;
  limit: number;
  suffix?: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  templateUrl: './dashboard-page.html',
  styleUrls: ['./dashboard-page.scss']
})
export class DashboardPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly familyService = inject(FamilyService);
  private readonly memberService = inject(MemberService);
  private readonly postService = inject(PostService);
  private readonly userService = inject(UserService);
  private readonly subscriptionService = inject(SubscriptionService);

  loading = true;
  error = '';
  stats = {
    families: 0,
    members: 0,
    posts: 0,
    users: 0,
  };

  currentPlan = {
    name: 'Đang tải...',
    price: '',
    period: '',
    startedAt: '',
    renewNote: '',
    status: '',
    limits: {
      members: 0,
      admins: 0,
      storageGb: 0,
    },
    usage: {
      storageGbUsed: 0.2,
    },
  };

  plans: Plan[] = [];

  ngOnInit(): void {
    this.loadStats();
  }

  get userName(): string {
    const user = this.authService.user();
    return user?.username || 'Quản trị viên';
  }

  get usageLimits(): UsageLimit[] {
    return [
      { label: 'Thành viên', used: this.stats.members, limit: this.currentPlan.limits.members },
      { label: 'Quản trị viên', used: this.stats.users, limit: this.currentPlan.limits.admins },
      { label: 'Dung lượng lưu trữ', used: this.currentPlan.usage.storageGbUsed, limit: this.currentPlan.limits.storageGb, suffix: 'GB' },
    ];
  }

  usagePercent(usage: UsageLimit): number {
    if (!usage.limit) return 0;
    const value = (usage.used / usage.limit) * 100;
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  formatPrice(price: number): string {
    if (price === 0) return 'Miễn phí';
    return price.toLocaleString('vi-VN') + 'đ';
  }

  reload(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      families: this.familyService.list(),
      members: this.memberService.list(),
      posts: this.postService.list(),
      users: this.userService.list(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ families, members, posts, users }) => {
          this.stats = {
            families: families.length,
            members: members.length,
            posts: posts.length,
            users: users.length,
          };
          this.loading = false;
          this.loadSubscription();
          this.loadPlans();
        },
        error: () => {
          this.error = 'Không tải được dữ liệu. Vui lòng thử lại.';
          this.loading = false;
        },
      });
  }

  private loadSubscription(): void {
    const user = this.authService.user();
    const familyId = user?.assignedFamily || user?.managedFamilies?.[0];
    if (!familyId) return;

    this.subscriptionService.getFamilySubscription(familyId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sub) => {
          if (sub) {
            const plan = sub.plan;
            const start = new Date(sub.startDate);
            const end = new Date(sub.endDate);
            this.currentPlan = {
              name: plan?.name || 'Dùng thử',
              price: plan ? this.formatPrice(plan.price) : 'Miễn phí',
              period: plan ? `${plan.durationMonths} tháng` : '',
              startedAt: start.toLocaleDateString('vi-VN'),
              renewNote: sub.status === 'ACTIVE'
                ? `Hết hạn ${end.toLocaleDateString('vi-VN')}`
                : sub.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán' : sub.status,
              status: sub.status,
              limits: {
                members: sub.maxMembers,
                admins: sub.maxAdmins,
                storageGb: sub.maxStorageGb,
              },
              usage: { storageGbUsed: 0.2 },
            };
          }
        },
      });
  }

  private loadPlans(): void {
    this.subscriptionService.getPlans()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (plans) => { this.plans = plans.filter(p => p.price > 0); },
      });
  }
}
