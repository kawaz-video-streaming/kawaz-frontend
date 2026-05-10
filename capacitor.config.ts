import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kawaz.plus',
  appName: 'Kawaz+',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
