import { Injectable } from '@angular/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'birthday' | 'death-anniversary' | 'family-event' | 'other';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private isNativeApp = Capacitor.isNativePlatform();

  constructor() {
    if (this.isNativeApp) {
      this.initializeNotifications();
    }
  }

  /**
   * Initialize notification permissions and listeners
   */
  async initializeNotifications() {
    try {
      // Request permissions for local notifications
      const localPermission = await LocalNotifications.requestPermissions();
      console.log('Local Notification Permission:', localPermission);

      // Request permissions for push notifications
      const pushPermission = await PushNotifications.requestPermissions();
      console.log('Push Notification Permission:', pushPermission);

      if (pushPermission.receive === 'granted') {
        await PushNotifications.register();
      }

      // Add listeners for push notifications
      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // TODO: Send token to backend server
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received: ', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed', notification);
      });

    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Schedule local notification for calendar event
   */
  async scheduleEventNotification(event: CalendarEvent, notifyBefore: number = 1): Promise<void> {
    if (!this.isNativeApp) {
      console.log('Notifications only work on native apps');
      return;
    }

    try {
      // Calculate notification time (notify before X days)
      const notificationDate = new Date(event.date);
      notificationDate.setDate(notificationDate.getDate() - notifyBefore);
      
      // Don't schedule if notification time has passed
      if (notificationDate < new Date()) {
        console.log('Event date has passed, not scheduling notification');
        return;
      }

      const notification: ScheduleOptions = {
        notifications: [
          {
            id: parseInt(event.id.substring(0, 8), 16), // Convert string ID to number
            title: this.getNotificationTitle(event.type),
            body: `${event.title} - ${this.formatDate(event.date)}`,
            schedule: { at: notificationDate },
            extra: {
              eventId: event.id,
              eventType: event.type
            }
          }
        ]
      };

      await LocalNotifications.schedule(notification);
      console.log('Notification scheduled for:', notificationDate);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Schedule multiple event notifications
   */
  async scheduleMultipleNotifications(events: CalendarEvent[], notifyBefore: number = 1): Promise<void> {
    const promises = events.map(event => this.scheduleEventNotification(event, notifyBefore));
    await Promise.all(promises);
  }

  /**
   * Schedule daily reminder at specific time
   */
  async scheduleDailyReminder(hour: number = 9, minute: number = 0): Promise<void> {
    if (!this.isNativeApp) return;

    try {
      const now = new Date();
      const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
      
      // If time has passed today, schedule for tomorrow
      if (scheduleDate < now) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999, // Fixed ID for daily reminder
            title: 'Nhắc nhở Lịch Dòng Họ',
            body: 'Kiểm tra các sự kiện quan trọng hôm nay',
            schedule: {
              at: scheduleDate,
              repeats: true,
              every: 'day'
            }
          }
        ]
      });

      console.log('Daily reminder scheduled at', scheduleDate);
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
    }
  }

  /**
   * Cancel specific notification
   */
  async cancelNotification(notificationId: number): Promise<void> {
    if (!this.isNativeApp) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    if (!this.isNativeApp) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
        console.log('All notifications cancelled');
      }
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all pending notifications
   */
  async getPendingNotifications(): Promise<any[]> {
    if (!this.isNativeApp) return [];

    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    if (!this.isNativeApp) return false;

    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Helper methods
  private getNotificationTitle(type: CalendarEvent['type']): string {
    switch (type) {
      case 'birthday': return '🎂 Sinh nhật';
      case 'death-anniversary': return '🕯️ Ngày giỗ';
      case 'family-event': return '👨‍👩‍👧‍👦 Sự kiện dòng họ';
      default: return '📅 Lịch quan trọng';
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}
