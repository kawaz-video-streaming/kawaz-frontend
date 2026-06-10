import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kawaz.plus',
  appName: 'Kawaz+',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    allowsInlineMediaPlayback: true,
  },
};

export default config;
