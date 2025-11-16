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
- Android emulator can reach the backend running on your PC via `http://10.0.2.2:3000/api`.
- If you deploy backend publicly, set `environment.ts` `apiBaseUrl` to the public URL.

(Optional) You can enable live-reload by uncommenting `server.url` in `web/capacitor.config.ts` and pointing it to the dev server (e.g. `http://10.0.2.2:4200`).
