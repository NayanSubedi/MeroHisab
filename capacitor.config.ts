import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.merohisab.app',
  appName: 'MSME App',
  webDir: 'dist',
  server: {
    // 1. Force Android to use HTTP (fixes Mixed Content error)
    androidScheme: 'http',
    // 2. Allow cleartext traffic inside the WebView
    cleartext: true,
    // 3. Whitelist your API IPs (Optional but recommended)
    allowNavigation: [
      "192.168.1.64", 
      "10.0.2.2"
    ]
  }
};

export default config;