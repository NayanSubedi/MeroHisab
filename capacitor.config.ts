import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dainikhisab.app',
  appName: 'Dainik Hisab',
  webDir: 'dist',
  server: {
    // 1. Force Android to use HTTP (fixes Mixed Content error)
    androidScheme: 'http',
    // 2. Allow cleartext traffic inside the WebView
    cleartext: true,
    // 3. Whitelist your API IPs (Optional but recommended)
    allowNavigation: [
      "192.168.1.66", 
      "10.0.2.2"
    ]
  }
};

export default config;