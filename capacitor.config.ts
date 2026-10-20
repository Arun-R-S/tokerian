import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tokerian.tv',
  appName: 'Tokerian',
  webDir: 'dist',
  server: {
    // Allows loading unencrypted HTTP streams on Android
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    // Configured for optimal video and remote controls
  },
};

export default config;
