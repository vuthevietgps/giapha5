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

interface UsageLimit {
  label: string;
  used: number;
  limit: number;
  suffix?: string;
}

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlight?: boolean;
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

  loading = true;
  error = '';
  stats = {
    families: 0,
    members: 0,
    posts: 0,
    users: 0,
  };

  currentPlan = {
    name: 'Khởi đầu',
    price: 'Miễn phí',
    period: 'Vĩnh viễn',
    domain: 'hovu21.giaphadaviet.vn',
    startedAt: '19/12/2025',
    renewNote: 'Không giới hạn thời gian',
    limits: {
      members: 50,
      admins: 1,
      storageGb: 1,
    },
    usage: {
      storageGbUsed: 0.2,
    },
  };

  pricingPlans: PricingPlan[] = [
    {
      name: 'Cơ bản',
      price: '500.000đ',
      period: '/12 tháng',
      features: ['200 thành viên', '1 người quản lý', '2 GB dung lượng lưu trữ'],
      cta: 'Nâng cấp ngay',
    },
    {
      name: 'Đoàn viên',
      price: '1.000.000đ',
      period: '/12 tháng',
      features: ['500 thành viên', '2 người quản lý', '3 GB dung lượng lưu trữ'],
      cta: 'Nâng cấp ngay',
    },
    {
      name: 'Đồng tâm',
      price: '2.000.000đ',
      period: '/12 tháng',
      features: ['2.000 thành viên', '5 người quản lý', '10 GB dung lượng lưu trữ'],
      cta: 'Nâng cấp ngay',
      highlight: true,
    },
    {
      name: 'Thịnh vượng',
      price: '5.000.000đ',
      period: '/12 tháng',
      features: ['10.000 thành viên', '10 người quản lý', '25 GB dung lượng lưu trữ'],
      cta: 'Nâng cấp ngay',
    },
    {
      name: 'Bản sắc',
      price: '10.000.000đ',
      period: '/12 tháng',
      features: ['Không giới hạn thành viên', '15 người quản lý', '50 GB dung lượng lưu trữ'],
      cta: 'Liên hệ tư vấn',
    },
  ];

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
        },
        error: (err) => {
          console.error('[Dashboard] Failed to load stats', err);
          this.error = 'Không tải được dữ liệu. Vui lòng thử lại.';
          this.loading = false;
        },
      });
  }
}
