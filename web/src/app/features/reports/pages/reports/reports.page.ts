import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';

export interface SystemStats {
  totalFamilies: number;
  totalUsers: number;
  totalMembers: number;
  activeFamilies: number;
  revenue: number;
  monthlyGrowth: number;
}

export interface FamilyReport {
  familyId: string;
  familyName: string;
  adminName: string;
  memberCount: number;
  subscriptionStatus: 'active' | 'expired' | 'expiring_soon';
  subscriptionEndDate: Date;
  lastActivity: Date;
  revenue: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  email: string;
  role: string;
  lastLogin: Date;
  loginCount: number;
  familiesManaged: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatChipsModule,
    MatProgressBarModule
  ],
  template: `
    <div class="reports-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>analytics</mat-icon>
            Báo cáo Tổng hợp
          </mat-card-title>
          <mat-card-subtitle>Thống kê và báo cáo toàn hệ thống</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <!-- System Overview -->
          <div class="overview-section">
            <h3>Tổng quan Hệ thống</h3>
            <div class="stats-grid">
              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon families">business</mat-icon>
                    <div class="stat-details">
                      <div class="stat-number">{{ systemStats.totalFamilies }}</div>
                      <div class="stat-label">Dòng họ</div>
                    </div>
                  </div>
                  <div class="stat-footer">
                    <span class="active-count">{{ systemStats.activeFamilies }} đang hoạt động</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon users">supervisor_account</mat-icon>
                    <div class="stat-details">
                      <div class="stat-number">{{ systemStats.totalUsers }}</div>
                      <div class="stat-label">Người dùng</div>
                    </div>
                  </div>
                  <div class="stat-footer">
                    <span class="growth-indicator" [ngClass]="systemStats.monthlyGrowth > 0 ? 'positive' : 'negative'">
                      <mat-icon>{{ systemStats.monthlyGrowth > 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                      {{ systemStats.monthlyGrowth }}% tháng này
                    </span>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon members">people</mat-icon>
                    <div class="stat-details">
                      <div class="stat-number">{{ systemStats.totalMembers | number }}</div>
                      <div class="stat-label">Thành viên</div>
                    </div>
                  </div>
                  <div class="stat-footer">
                    <span>Trung bình {{ getAverageMembers() }} thành viên/dòng họ</span>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="stat-card">
                <mat-card-content>
                  <div class="stat-content">
                    <mat-icon class="stat-icon revenue">monetization_on</mat-icon>
                    <div class="stat-details">
                      <div class="stat-number">{{ systemStats.revenue | number }}đ</div>
                      <div class="stat-label">Doanh thu</div>
                    </div>
                  </div>
                  <div class="stat-footer">
                    <span>Tháng này</span>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </div>

          <mat-tab-group class="report-tabs">
            <!-- Family Reports Tab -->
            <mat-tab label="Báo cáo Dòng họ">
              <div class="tab-content">
                <div class="filter-section">
                  <mat-form-field appearance="outline">
                    <mat-label>Lọc theo trạng thái</mat-label>
                    <mat-select [(value)]="familyStatusFilter" (selectionChange)="filterFamilies()">
                      <mat-option value="">Tất cả</mat-option>
                      <mat-option value="active">Đang hoạt động</mat-option>
                      <mat-option value="expiring_soon">Sắp hết hạn</mat-option>
                      <mat-option value="expired">Đã hết hạn</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>

                <div class="families-table">
                  <table mat-table [dataSource]="filteredFamilies" class="full-width-table">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Tên dòng họ</th>
                      <td mat-cell *matCellDef="let family">
                        <div class="family-cell">
                          <span class="family-name">{{ family.familyName }}</span>
                          <span class="admin-name">Admin: {{ family.adminName }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="members">
                      <th mat-header-cell *matHeaderCellDef>Thành viên</th>
                      <td mat-cell *matCellDef="let family">
                        <div class="member-count">
                          <mat-icon>people</mat-icon>
                          {{ family.memberCount }}
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                      <td mat-cell *matCellDef="let family">
                        <mat-chip [ngClass]="'status-' + family.subscriptionStatus">
                          {{ getFamilyStatusLabel(family.subscriptionStatus) }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="subscription">
                      <th mat-header-cell *matHeaderCellDef>Hết hạn</th>
                      <td mat-cell *matCellDef="let family">
                        {{ family.subscriptionEndDate | date:'dd/MM/yyyy' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="revenue">
                      <th mat-header-cell *matHeaderCellDef>Doanh thu</th>
                      <td mat-cell *matCellDef="let family">
                        {{ family.revenue | number }}đ
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="activity">
                      <th mat-header-cell *matHeaderCellDef>Hoạt động cuối</th>
                      <td mat-cell *matCellDef="let family">
                        {{ family.lastActivity | date:'dd/MM/yyyy HH:mm' }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="familyColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: familyColumns;"></tr>
                  </table>
                </div>
              </div>
            </mat-tab>

            <!-- User Activity Tab -->
            <mat-tab label="Hoạt động Người dùng">
              <div class="tab-content">
                <div class="user-activity-table">
                  <table mat-table [dataSource]="userActivities" class="full-width-table">
                    <ng-container matColumnDef="user">
                      <th mat-header-cell *matHeaderCellDef>Người dùng</th>
                      <td mat-cell *matCellDef="let user">
                        <div class="user-cell">
                          <span class="user-name">{{ user.userName }}</span>
                          <span class="user-email">{{ user.email }}</span>
                        </div>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="role">
                      <th mat-header-cell *matHeaderCellDef>Vai trò</th>
                      <td mat-cell *matCellDef="let user">
                        <mat-chip [ngClass]="'role-' + user.role.toLowerCase()">
                          {{ getUserRoleLabel(user.role) }}
                        </mat-chip>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="lastLogin">
                      <th mat-header-cell *matHeaderCellDef>Đăng nhập cuối</th>
                      <td mat-cell *matCellDef="let user">
                        {{ user.lastLogin | date:'dd/MM/yyyy HH:mm' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="loginCount">
                      <th mat-header-cell *matHeaderCellDef>Số lần đăng nhập</th>
                      <td mat-cell *matCellDef="let user">
                        {{ user.loginCount }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="familiesManaged">
                      <th mat-header-cell *matHeaderCellDef>Dòng họ quản lý</th>
                      <td mat-cell *matCellDef="let user">
                        {{ user.familiesManaged || 0 }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="userColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: userColumns;"></tr>
                  </table>
                </div>
              </div>
            </mat-tab>

            <!-- Revenue Tab -->
            <mat-tab label="Doanh thu">
              <div class="tab-content">
                <div class="revenue-section">
                  <mat-card class="revenue-summary">
                    <mat-card-header>
                      <mat-card-title>Tổng quan Doanh thu</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="revenue-grid">
                        <div class="revenue-item">
                          <div class="revenue-label">Tháng này</div>
                          <div class="revenue-amount">{{ monthlyRevenue | number }}đ</div>
                        </div>
                        <div class="revenue-item">
                          <div class="revenue-label">Năm nay</div>
                          <div class="revenue-amount">{{ yearlyRevenue | number }}đ</div>
                        </div>
                        <div class="revenue-item">
                          <div class="revenue-label">Tổng cộng</div>
                          <div class="revenue-amount total">{{ totalRevenue | number }}đ</div>
                        </div>
                      </div>
                    </mat-card-content>
                  </mat-card>

                  <div class="export-section">
                    <h4>Xuất báo cáo</h4>
                    <div class="export-buttons">
                      <button mat-raised-button color="primary" (click)="exportReport('families')">
                        <mat-icon>download</mat-icon>
                        Xuất báo cáo Dòng họ
                      </button>
                      <button mat-raised-button color="accent" (click)="exportReport('users')">
                        <mat-icon>download</mat-icon>
                        Xuất báo cáo Người dùng
                      </button>
                      <button mat-raised-button (click)="exportReport('revenue')">
                        <mat-icon>download</mat-icon>
                        Xuất báo cáo Doanh thu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .reports-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .overview-section {
      margin-bottom: 30px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .stat-card {
      height: 120px;
    }

    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      padding: 12px;
      border-radius: 8px;
    }

    .stat-icon.families {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .stat-icon.users {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .stat-icon.members {
      background-color: #e8f5e8;
      color: #388e3c;
    }

    .stat-icon.revenue {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .stat-details {
      flex: 1;
    }

    .stat-number {
      font-size: 24px;
      font-weight: bold;
      line-height: 1;
    }

    .stat-label {
      color: rgba(0, 0, 0, 0.6);
      font-size: 14px;
    }

    .stat-footer {
      margin-top: 8px;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .growth-indicator {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .growth-indicator.positive {
      color: #4caf50;
    }

    .growth-indicator.negative {
      color: #f44336;
    }

    .report-tabs {
      margin-top: 20px;
    }

    .tab-content {
      padding: 20px 0;
    }

    .filter-section {
      margin-bottom: 20px;
    }

    .full-width-table {
      width: 100%;
    }

    .family-cell, .user-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .family-name, .user-name {
      font-weight: 500;
    }

    .admin-name, .user-email {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }

    .member-count {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .status-active {
      background-color: #4caf50;
      color: white;
    }

    .status-expiring_soon {
      background-color: #ff9800;
      color: white;
    }

    .status-expired {
      background-color: #f44336;
      color: white;
    }

    .role-super_admin {
      background-color: #9c27b0;
      color: white;
    }

    .role-admin_dong_ho {
      background-color: #2196f3;
      color: white;
    }

    .role-bien_tap_dong_ho {
      background-color: #4caf50;
      color: white;
    }

    .role-thanh_vien {
      background-color: #ff9800;
      color: white;
    }

    .role-khach {
      background-color: #9e9e9e;
      color: white;
    }

    .revenue-section {
      max-width: 800px;
    }

    .revenue-summary {
      margin-bottom: 30px;
    }

    .revenue-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 16px;
    }

    .revenue-item {
      text-align: center;
      padding: 16px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 8px;
    }

    .revenue-label {
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 8px;
    }

    .revenue-amount {
      font-size: 20px;
      font-weight: bold;
      color: #1976d2;
    }

    .revenue-amount.total {
      color: #4caf50;
    }

    .export-section {
      margin-top: 30px;
    }

    .export-buttons {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
  `]
})
export class ReportsPage implements OnInit {
  systemStats: SystemStats = {
    totalFamilies: 0,
    totalUsers: 0,
    totalMembers: 0,
    activeFamilies: 0,
    revenue: 0,
    monthlyGrowth: 0
  };

  familyReports: FamilyReport[] = [];
  filteredFamilies: FamilyReport[] = [];
  familyStatusFilter = '';
  familyColumns = ['name', 'members', 'status', 'subscription', 'revenue', 'activity'];

  userActivities: UserActivity[] = [];
  userColumns = ['user', 'role', 'lastLogin', 'loginCount', 'familiesManaged'];

  monthlyRevenue = 0;
  yearlyRevenue = 0;
  totalRevenue = 0;

  ngOnInit(): void {
    this.loadSystemStats();
    this.loadFamilyReports();
    this.loadUserActivities();
    this.loadRevenueData();
  }

  loadSystemStats(): void {
    // Mock data - replace with API call
    this.systemStats = {
      totalFamilies: 12,
      totalUsers: 45,
      totalMembers: 2340,
      activeFamilies: 10,
      revenue: 15000000,
      monthlyGrowth: 12.5
    };
  }

  loadFamilyReports(): void {
    // Mock data - replace with API call
    this.familyReports = [
      {
        familyId: '1',
        familyName: 'Dòng họ Nguyễn Văn A',
        adminName: 'Nguyễn Văn Admin',
        memberCount: 145,
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date('2025-12-31'),
        lastActivity: new Date('2024-11-16'),
        revenue: 2000000
      },
      {
        familyId: '2',
        familyName: 'Dòng họ Trần Thị B',
        adminName: 'Trần Thị Admin',
        memberCount: 89,
        subscriptionStatus: 'expiring_soon',
        subscriptionEndDate: new Date('2024-12-15'),
        lastActivity: new Date('2024-11-14'),
        revenue: 1000000
      }
    ];
    this.filteredFamilies = [...this.familyReports];
  }

  loadUserActivities(): void {
    // Mock data - replace with API call
    this.userActivities = [
      {
        userId: '1',
        userName: 'Nguyễn Văn Admin',
        email: 'admin1@test.com',
        role: 'ADMIN_DONG_HO',
        lastLogin: new Date('2024-11-16 14:30'),
        loginCount: 45,
        familiesManaged: 1
      },
      {
        userId: '2',
        userName: 'Super Admin',
        email: 'superadmin@test.com',
        role: 'SUPER_ADMIN',
        lastLogin: new Date('2024-11-16 16:20'),
        loginCount: 123,
        familiesManaged: 0
      }
    ];
  }

  loadRevenueData(): void {
    // Mock data - replace with API call
    this.monthlyRevenue = 3000000;
    this.yearlyRevenue = 25000000;
    this.totalRevenue = 75000000;
  }

  filterFamilies(): void {
    if (this.familyStatusFilter) {
      this.filteredFamilies = this.familyReports.filter(f => f.subscriptionStatus === this.familyStatusFilter);
    } else {
      this.filteredFamilies = [...this.familyReports];
    }
  }

  getAverageMembers(): number {
    if (this.systemStats.totalFamilies === 0) return 0;
    return Math.round(this.systemStats.totalMembers / this.systemStats.totalFamilies);
  }

  getFamilyStatusLabel(status: string): string {
    const labels = {
      'active': 'Hoạt động',
      'expiring_soon': 'Sắp hết hạn',
      'expired': 'Hết hạn'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getUserRoleLabel(role: string): string {
    const labels = {
      'SUPER_ADMIN': 'Giám đốc hệ thống',
      'ADMIN_DONG_HO': 'Admin dòng họ',
      'BIEN_TAP_DONG_HO': 'Biên tập dòng họ',
      'THANH_VIEN': 'Thành viên',
      'KHACH': 'Khách'
    };
    return labels[role as keyof typeof labels] || role;
  }

  exportReport(type: string): void {
    console.log('Export report:', type);
    // TODO: Implement export functionality
  }
}