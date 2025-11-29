import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">notifications</mat-icon>
            Cài đặt Thông báo
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 16px;">
            
            <!-- Notification Status -->
            <div class="setting-item">
              <div class="setting-info">
                <h3>Trạng thái thông báo</h3>
                <p>{{ notificationsEnabled ? '✅ Đã bật' : '❌ Đã tắt' }}</p>
              </div>
              <button mat-raised-button color="primary" (click)="requestPermissions()" *ngIf="!notificationsEnabled">
                Bật thông báo
              </button>
            </div>

            <mat-divider></mat-divider>

            <!-- Daily Reminder -->
            <div class="setting-item">
              <mat-slide-toggle [(ngModel)]="dailyReminderEnabled" (change)="toggleDailyReminder()">
                <div class="setting-info">
                  <h3>Nhắc nhở hàng ngày</h3>
                  <p>Nhận thông báo nhắc nhở kiểm tra lịch quan trọng mỗi ngày</p>
                </div>
              </mat-slide-toggle>
            </div>

            <div *ngIf="dailyReminderEnabled" style="padding-left: 40px;">
              <mat-form-field appearance="outline" style="width: 200px;">
                <mat-label>Thời gian nhắc</mat-label>
                <mat-select [(ngModel)]="reminderTime" (selectionChange)="updateDailyReminder()">
                  <mat-option value="7">7:00 sáng</mat-option>
                  <mat-option value="8">8:00 sáng</mat-option>
                  <mat-option value="9">9:00 sáng</mat-option>
                  <mat-option value="10">10:00 sáng</mat-option>
                  <mat-option value="19">7:00 tối</mat-option>
                  <mat-option value="20">8:00 tối</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-divider></mat-divider>

            <!-- Event Notifications -->
            <div class="setting-item">
              <mat-slide-toggle [(ngModel)]="eventNotificationsEnabled" (change)="saveSettings()">
                <div class="setting-info">
                  <h3>Thông báo sự kiện</h3>
                  <p>Nhận thông báo trước các sự kiện quan trọng</p>
                </div>
              </mat-slide-toggle>
            </div>

            <div *ngIf="eventNotificationsEnabled" style="padding-left: 40px;">
              <mat-form-field appearance="outline" style="width: 250px;">
                <mat-label>Thông báo trước</mat-label>
                <mat-select [(ngModel)]="notifyBeforeDays" (selectionChange)="saveSettings()">
                  <mat-option [value]="0">Vào ngày sự kiện</mat-option>
                  <mat-option [value]="1">1 ngày trước</mat-option>
                  <mat-option [value]="3">3 ngày trước</mat-option>
                  <mat-option [value]="7">1 tuần trước</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <mat-divider></mat-divider>

            <!-- Pending Notifications -->
            <div class="setting-item">
              <div class="setting-info">
                <h3>Thông báo đang chờ</h3>
                <p>{{ pendingCount }} thông báo</p>
              </div>
              <button mat-stroked-button (click)="loadPendingNotifications()">
                <mat-icon>refresh</mat-icon>
                Làm mới
              </button>
            </div>

            <mat-list *ngIf="pendingNotifications.length > 0">
              <mat-list-item *ngFor="let notification of pendingNotifications">
                <mat-icon matListItemIcon>event</mat-icon>
                <div matListItemTitle>{{ notification.title }}</div>
                <div matListItemLine>{{ notification.body }}</div>
              </mat-list-item>
            </mat-list>

            <mat-divider></mat-divider>

            <!-- Actions -->
            <div style="display: flex; gap: 12px; margin-top: 8px;">
              <button mat-raised-button color="primary" (click)="testNotification()">
                <mat-icon>notifications_active</mat-icon>
                Thử thông báo
              </button>
              <button mat-stroked-button color="warn" (click)="cancelAllNotifications()">
                <mat-icon>clear_all</mat-icon>
                Hủy tất cả thông báo
              </button>
            </div>

          </div>
        </mat-card-content>
      </mat-card>

      <!-- Instructions -->
      <mat-card style="margin-top: 16px;">
        <mat-card-header>
          <mat-card-title>
            <mat-icon style="vertical-align: middle; margin-right: 8px;">info</mat-icon>
            Hướng dẫn
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <ul>
            <li>Thông báo chỉ hoạt động trên ứng dụng mobile (Android/iOS)</li>
            <li>Bạn cần cho phép quyền thông báo trong cài đặt thiết bị</li>
            <li>Thông báo sẽ được gửi tự động dựa trên lịch quan trọng của dòng họ</li>
            <li>Có thể tùy chỉnh thời gian nhận thông báo nhắc nhở hàng ngày</li>
            <li>Thông báo sự kiện sẽ được gửi trước X ngày theo cài đặt của bạn</li>
          </ul>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .setting-info h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 500;
    }

    .setting-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    mat-slide-toggle {
      display: flex;
      align-items: center;
    }

    @media (max-width: 768px) {
      .setting-item {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class NotificationSettingsComponent implements OnInit {
  notificationsEnabled = false;
  dailyReminderEnabled = false;
  eventNotificationsEnabled = true;
  reminderTime = '9';
  notifyBeforeDays = 1;
  pendingNotifications: any[] = [];
  pendingCount = 0;

  constructor(
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.checkNotificationStatus();
    await this.loadSettings();
    await this.loadPendingNotifications();
  }

  async checkNotificationStatus() {
    this.notificationsEnabled = await this.notificationService.areNotificationsEnabled();
  }

  async requestPermissions() {
    await this.notificationService.initializeNotifications();
    await this.checkNotificationStatus();
    
    if (this.notificationsEnabled) {
      this.snackBar.open('Đã bật thông báo thành công', 'Đóng', { duration: 3000 });
    } else {
      this.snackBar.open('Không thể bật thông báo. Vui lòng kiểm tra cài đặt thiết bị', 'Đóng', { duration: 5000 });
    }
  }

  async toggleDailyReminder() {
    if (this.dailyReminderEnabled) {
      await this.notificationService.scheduleDailyReminder(parseInt(this.reminderTime), 0);
      this.snackBar.open('Đã bật nhắc nhở hàng ngày', 'Đóng', { duration: 2000 });
    } else {
      await this.notificationService.cancelNotification(999); // Daily reminder ID
      this.snackBar.open('Đã tắt nhắc nhở hàng ngày', 'Đóng', { duration: 2000 });
    }
    this.saveSettings();
  }

  async updateDailyReminder() {
    if (this.dailyReminderEnabled) {
      await this.notificationService.scheduleDailyReminder(parseInt(this.reminderTime), 0);
      this.snackBar.open('Đã cập nhật thời gian nhắc nhở', 'Đóng', { duration: 2000 });
    }
    this.saveSettings();
  }

  saveSettings() {
    const settings = {
      dailyReminderEnabled: this.dailyReminderEnabled,
      reminderTime: this.reminderTime,
      eventNotificationsEnabled: this.eventNotificationsEnabled,
      notifyBeforeDays: this.notifyBeforeDays
    };
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      const settings = JSON.parse(saved);
      this.dailyReminderEnabled = settings.dailyReminderEnabled || false;
      this.reminderTime = settings.reminderTime || '9';
      this.eventNotificationsEnabled = settings.eventNotificationsEnabled !== false;
      this.notifyBeforeDays = settings.notifyBeforeDays || 1;
    }
  }

  async loadPendingNotifications() {
    this.pendingNotifications = await this.notificationService.getPendingNotifications();
    this.pendingCount = this.pendingNotifications.length;
  }

  async testNotification() {
    const testEvent = {
      id: 'test-' + Date.now(),
      title: 'Sinh nhật ông nội',
      description: 'Ngày sinh nhật của ông nội',
      date: new Date(Date.now() + 10 * 1000), // 10 seconds from now
      type: 'birthday' as const
    };

    await this.notificationService.scheduleEventNotification(testEvent, 0);
    this.snackBar.open('Thông báo thử nghiệm sẽ xuất hiện sau 10 giây', 'Đóng', { duration: 3000 });
    
    setTimeout(() => this.loadPendingNotifications(), 500);
  }

  async cancelAllNotifications() {
    await this.notificationService.cancelAllNotifications();
    await this.loadPendingNotifications();
    this.snackBar.open('Đã hủy tất cả thông báo', 'Đóng', { duration: 2000 });
  }
}
