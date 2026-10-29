import type { CapacitorConfig } from '@capacitor/cli';

/** 안드로이드 빌드 (GDD 10장 M7). 웹 빌드(dist)를 그대로 감싼다. */
const config: CapacitorConfig = {
  appId: 'io.github.graviton94.pawnisher',
  appName: 'Pawnisher : Checkmate',
  webDir: 'dist',
  android: {
    backgroundColor: '#16141C',
  },
};

export default config;
