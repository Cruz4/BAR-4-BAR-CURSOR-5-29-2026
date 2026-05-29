import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'studio.bar4bar.app',
  appName: 'Bar 4 Bar Studio',
  webDir: 'public',
  server: {
    // Phase 2: load hosted Next.js app (server actions + AI require network)
    url: process.env.CAPACITOR_SERVER_URL || 'https://lyricai-studio-otgxn.web.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050a1e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050a1e',
    },
  },
};

export default config;
