import { defineConfig } from 'vite';

// 출시 빌드 (D-531): `vite build --mode release` (npm run build:release) — 2.0(legacy.html)을 빼고,
// ?debug · ?lab · ?builds 손잡이를 끈다 (src/slice/platform.ts RELEASE). 안드로이드 · PC 묶음은 이것을 쓴다.
export default defineConfig(({ mode }) => ({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // 본편 = 리뉴얼판 (R6, D-174). 2.0은 legacy.html로 남긴다 (검수 빌드에만)
      input: mode === 'release' ? { main: 'index.html' } : { main: 'index.html', legacy: 'legacy.html' },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  worker: {
    format: 'es',
  },
}));
