# Hướng dẫn Build iOS App cho Gia Phả Online

## 📱 Yêu cầu

### Phần cứng & Hệ điều hành:
- **macOS** (bắt buộc - không thể build iOS trên Windows)
- Mac với chip Intel hoặc Apple Silicon (M1/M2/M3)
- Tối thiểu 8GB RAM, 20GB dung lượng trống

### Phần mềm:
- **Xcode** phiên bản mới nhất (download từ Mac App Store)
- **Node.js** 18+ và npm
- **CocoaPods** (cài qua `sudo gem install cocoapods`)

### Tài khoản Apple:
- **Apple ID** (miễn phí)
- **Apple Developer Account** ($99/năm - bắt buộc nếu muốn phát hành lên App Store)

---

## 🚀 Các bước Build iOS App

### Bước 1: Cài đặt Xcode và Command Line Tools

```bash
# Cài Xcode từ Mac App Store (hoặc developer.apple.com)
# Sau khi cài xong, cài Command Line Tools:
xcode-select --install
```

### Bước 2: Thêm nền tảng iOS vào project Capacitor

```bash
cd web
npm run cap:add:ios
```

Lệnh này sẽ tạo thư mục `ios/` chứa Xcode project.

### Bước 3: Build web assets và sync với iOS

```bash
# Build web app
npm run build:mobile

# Sync với iOS
npm run cap:sync
```

### Bước 4: Mở project trong Xcode

```bash
npm run cap:open:ios
```

Hoặc mở thủ công:
```bash
open ios/App/App.xcworkspace
```

**⚠️ Lưu ý:** Phải mở file `.xcworkspace` chứ KHÔNG phải `.xcodeproj`

### Bước 5: Cấu hình Signing trong Xcode

1. Trong Xcode, chọn project **App** ở sidebar trái
2. Chọn target **App** 
3. Tab **Signing & Capabilities**
4. Tích **Automatically manage signing**
5. Chọn Team (Apple ID của bạn)
6. Bundle Identifier sẽ tự động được tạo (ví dụ: `com.yourteam.giapha`)

### Bước 6: Build và chạy trên Simulator

1. Chọn Simulator từ dropdown (iPhone 15 Pro chẳng hạn)
2. Nhấn nút **Play** (▶️) hoặc `Cmd + R`
3. App sẽ được build và chạy trên Simulator

### Bước 7: Test trên thiết bị thật (Development)

1. Kết nối iPhone/iPad vào Mac qua cáp USB
2. Mở khóa thiết bị và chọn "Trust This Computer"
3. Trong Xcode, chọn thiết bị của bạn từ dropdown
4. Nhấn **Play** để build và cài trực tiếp lên thiết bị

**Lần đầu:** Vào Settings > General > VPN & Device Management > chọn Developer App > Trust

---

## 📦 Build để phát hành

### Build Archive (để gửi lên TestFlight hoặc App Store)

1. Trong Xcode, chọn **Product > Archive**
2. Chờ build xong, cửa sổ **Organizer** sẽ mở
3. Chọn archive vừa build > **Distribute App**
4. Chọn phương thức:
   - **App Store Connect** - Gửi lên TestFlight/App Store
   - **Ad Hoc** - Cài cho thiết bị cụ thể (tối đa 100 thiết bị)
   - **Development** - Cài cho thiết bị dev

### Build IPA file (cho Ad Hoc distribution)

```bash
# Trong thư mục ios/App
xcodebuild -workspace App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/App.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

File IPA sẽ ở `ios/App/build/App.ipa`

---

## 🔧 Cấu hình nâng cao

### Info.plist - Permissions

File: `ios/App/App/Info.plist`

Thêm các quyền cần thiết:

```xml
<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>Cần truy cập camera để chụp ảnh thành viên</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Cần truy cập thư viện ảnh để chọn ảnh thành viên</string>

<!-- Notifications -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

### App Icons

1. Tạo App Icon Set (1024x1024px) tại https://appicon.co
2. Copy vào `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
3. Hoặc dùng Xcode: Chọn Assets.xcassets > AppIcon > kéo thả ảnh

### Launch Screen (Splash Screen)

Edit file `ios/App/App/Assets.xcassets/LaunchScreen.storyboard`

---

## 🍎 Phát hành lên App Store

### Yêu cầu:
- Apple Developer Program ($99/năm)
- App phải tuân thủ [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)

### Các bước:

1. **Tạo App ID** trên [App Store Connect](https://appstoreconnect.apple.com)
2. **Điền thông tin app**: tên, mô tả, screenshots, keywords
3. **Build & Upload**: 
   - Xcode > Product > Archive
   - Distribute > App Store Connect
4. **Chờ Review**: Submit for Review sau khi upload xong
5. **Phát hành**: Sau khi được approve, chọn Release

---

## 🔍 Troubleshooting

### "No signing certificate found"
- Xcode > Preferences > Accounts > Download Manual Profiles

### "Unable to install app"
- Xóa app cũ trên thiết bị
- Clean Build Folder (Cmd + Shift + K)
- Rebuild

### "Module not found" errors
```bash
cd ios/App
pod install
pod update
```

### Update Capacitor plugins
```bash
npm run cap:sync
cd ios/App
pod install
```

---

## 📋 Scripts NPM (đề xuất)

Thêm vào `package.json`:

```json
{
  "scripts": {
    "cap:add:ios": "cap add ios",
    "cap:open:ios": "cap open ios",
    "cap:sync:ios": "npm run build:mobile && cap sync ios",
    "ios:pods": "cd ios/App && pod install"
  }
}
```

---

## 🔗 Tài liệu tham khảo

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Developer](https://developer.apple.com)
- [Xcode Help](https://help.apple.com/xcode/)
- [TestFlight Guide](https://developer.apple.com/testflight/)

---

## ⚠️ Lưu ý quan trọng

1. **Build iOS CHỈ có thể trên macOS** - không thể build trên Windows hay Linux
2. Nếu không có Mac:
   - Thuê Mac cloud (MacStadium, AWS Mac instances)
   - Dùng dịch vụ build cloud (Ionic Appflow, Expo)
   - Nhờ bạn bè có Mac build hộ
3. **TestFlight** - Cách tốt nhất để phát hành beta cho người dùng test
4. **App Store Review** - Có thể mất 1-3 ngày để được approve

---

**Phiên bản**: 1.0.0  
**Ngày cập nhật**: 19/11/2025
