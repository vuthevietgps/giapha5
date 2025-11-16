import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vutheviet.giapha',
  appName: 'Gia Pha Online',
  webDir: 'dist/web/browser',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'http',
    // During local dev on emulator, point to dev server with live-reload (optional):
    // url: 'http://10.0.2.2:4200',
    // cleartext is required when backend runs on http
  },
  android: {
    allowMixedContent: true,
  }
};

export default config;
