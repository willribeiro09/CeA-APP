
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c7d5bf71c89241f9b9c19ec8815c6f04',
  appName: 'W-Kcal',
  webDir: 'dist',
  server: {
    url: 'https://c7d5bf71-c892-41f9-b9c1-9ec8815c6f04.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#544DFE',
      overlaysWebView: true
    }
  }
};

export default config;
