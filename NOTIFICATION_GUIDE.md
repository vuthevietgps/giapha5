# Hệ thống Thông báo Mobile - Lịch quan trọng Dòng họ

## 📱 Tính năng

Ứng dụng mobile có thể gửi thông báo tự động cho các sự kiện quan trọng trong dòng họ:

### ✅ Các loại thông báo được hỗ trợ:

1. **🎂 Sinh nhật** - Thông báo sinh nhật các thành viên trong dòng họ
2. **🕯️ Ngày giỗ** - Nhắc nhở ngày giỗ tổ tiên, người thân
3. **👨‍👩‍👧‍👦 Sự kiện dòng họ** - Đại hội, họp mặt, lễ cúng chung
4. **📅 Sự kiện khác** - Các sự kiện quan trọng khác

### ⚙️ Tùy chỉnh thông báo:

- **Nhắc nhở hàng ngày**: Nhận thông báo mỗi ngày vào giờ cố định
- **Thông báo trước sự kiện**: Chọn nhận thông báo trước 0, 1, 3 hoặc 7 ngày
- **Quản lý thông báo**: Xem danh sách, hủy từng cái hoặc hủy tất cả

## 🚀 Cách sử dụng

### Bước 1: Cài đặt ứng dụng
- Tải APK file và cài đặt trên điện thoại Android
- Hoặc build từ source code

### Bước 2: Cho phép quyền thông báo
1. Mở ứng dụng
2. Vào **Cài đặt Thông báo** từ menu
3. Nhấn **"Bật thông báo"**
4. Chấp nhận quyền thông báo khi được hỏi

### Bước 3: Cấu hình thông báo
1. **Bật nhắc nhở hàng ngày**:
   - Toggle switch "Nhắc nhở hàng ngày"
   - Chọn giờ nhận thông báo (7h-10h sáng hoặc 7h-8h tối)

2. **Bật thông báo sự kiện**:
   - Toggle switch "Thông báo sự kiện"
   - Chọn thời gian nhận thông báo trước (0-7 ngày)

### Bước 4: Thêm sự kiện vào lịch
1. Vào trang **"Lịch quan trọng"**
2. Thêm các sự kiện (sinh nhật, giỗ, họp mặt...)
3. Hệ thống sẽ tự động tạo thông báo dựa trên cài đặt của bạn

## 📋 Quản lý thông báo

### Xem thông báo đang chờ:
- Vào **"Cài đặt Thông báo"**
- Xem danh sách thông báo đã được lên lịch
- Nhấn **"Làm mới"** để cập nhật danh sách

### Thử nghiệm thông báo:
- Nhấn **"Thử thông báo"**
- Thông báo test sẽ xuất hiện sau 10 giây
- Kiểm tra xem thông báo có hoạt động không

### Hủy thông báo:
- **Hủy tất cả**: Nhấn "Hủy tất cả thông báo"
- **Hủy từng cái**: (Tính năng sẽ được thêm sau)

## 🔧 Cấu hình kỹ thuật

### Permissions trong AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

### Capacitor Plugins:
- `@capacitor/local-notifications@6.x` - Thông báo local
- `@capacitor/push-notifications@6.x` - Push notifications (dự phòng)

## 💡 Lưu ý quan trọng

1. **Thông báo chỉ hoạt động trên mobile app**, không hoạt động trên web browser
2. **Android 13+** cần cấp quyền POST_NOTIFICATIONS
3. Thông báo sẽ bị xóa nếu:
   - Gỡ cài đặt ứng dụng
   - Xóa dữ liệu ứng dụng trong Settings
4. Cần tạo lại thông báo sau khi:
   - Thay đổi cài đặt thời gian
   - Cập nhật sự kiện trong lịch

## 🔮 Tính năng tương lai

- [ ] Push notifications từ server
- [ ] Nhóm thông báo theo loại sự kiện
- [ ] Âm thanh thông báo tùy chỉnh
- [ ] Widget hiển thị lịch trên màn hình chính
- [ ] Đồng bộ thông báo giữa nhiều thiết bị

## 📞 Hỗ trợ

Nếu gặp vấn đề với thông báo:
1. Kiểm tra quyền thông báo trong Settings của điện thoại
2. Đảm bảo ứng dụng không bị tối ưu pin (Battery optimization)
3. Thử gỡ và cài lại ứng dụng
4. Liên hệ quản trị viên dòng họ

## 📖 API tích hợp

### Lập lịch thông báo từ code:

```typescript
import { NotificationService } from './core/services/notification.service';

// Inject service
constructor(private notificationService: NotificationService) {}

// Lập lịch một sự kiện
const event = {
  id: 'event-123',
  title: 'Sinh nhật ông nội',
  date: new Date('2025-12-25'),
  type: 'birthday'
};

await this.notificationService.scheduleEventNotification(event, 1); // 1 ngày trước

// Lập lịch nhiều sự kiện
const events = [...]; // Array of events
await this.notificationService.scheduleMultipleNotifications(events, 3); // 3 ngày trước

// Nhắc nhở hàng ngày
await this.notificationService.scheduleDailyReminder(9, 0); // 9:00 AM
```

---

**Phiên bản**: 1.0.0  
**Ngày cập nhật**: 17/11/2025
