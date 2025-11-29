# Mobile build (Capacitor + Angular)

This project wraps the existing Angular app (`web/`) into native shells using Capacitor.

## Prerequisites
- Node.js 18+
- Android Studio (Android SDK + emulator) and/or Xcode for iOS

## Install dependencies
```
cd web
npm install
```

## Add platforms
```
# From the web/ folder
npm run build
npm run cap:sync
npm run cap:add:android   # first time only
# npm run cap:add:ios     # on macOS, optional
```

## Open native project
```
# From the web/ folder
npm run cap:open:android  # launches Android Studio
# npm run cap:open:ios    # launches Xcode
```

Build/run from Android Studio or Xcode as usual.

## API base URL for mobile
- Android emulator có thể truy cập backend trên PC qua `http://10.0.2.2:3000/api`.
- Thiết bị thật cùng Wi‑Fi dùng IP LAN của PC, ví dụ `http://192.168.1.50:3000/api`.
- Khi build APK để phát hành/public, hãy build bằng cấu hình `mobile` để trỏ API công khai (HTTPS):

```
cd web
npm run build:mobile          # build Angular với environment.mobile.ts
npm run apk:sync              # copy build vào Android project
npm run apk:build:debug       # tạo APK debug tại web/android/app/build/outputs/apk/debug
# hoặc
npm run apk:build:release     # tạo APK release (cần signing để phát hành)
```

Sau khi có APK, đặt file vào `web/public/downloads/giapha-android.apk` rồi build lại image web hoặc copy trực tiếp vào container.

(Optional) You can enable live-reload by uncommenting `server.url` in `web/capacitor.config.ts` and pointing it to the dev server (e.g. `http://10.0.2.2:4200`).
