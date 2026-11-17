import { defineConfig, type Plugin } from 'vite';

// 출시 빌드 (D-531): `vite build --mode release` (npm run build:release) — 2.0(legacy.html)을 빼고,
// ?debug · ?lab · ?builds 손잡이를 끈다 (src/slice/platform.ts RELEASE). 안드로이드 · PC 묶음은 이것을 쓴다.
/**
 * 출시 빌드의 콘텐츠 보안 정책 (코드 리뷰 9): 모든 내용이 로컬이라 바깥 주소는 하나도 부르지 않는다.
 * script-src 'unsafe-inline'은 안드로이드 Capacitor가 다리 스크립트를 페이지 안에 직접 끼워 넣기 때문 (Electron · 웹은 쓰지 않는다).
 * 개발 서버(HMR 웹소켓)에는 넣지 않는다.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');
const csp = (): Plugin => ({
  name: 'release-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="${CSP}">`),
});

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'release' ? [csp()] : [],
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
        // Phaser는 따로 (코드 리뷰 6): 판을 처음 쓸 때 늦게 불러오고, 판올림마다 다시 받지 않게 이름도 그대로 둔다
        manualChunks: (id: string) => (/\/node_modules\/phaser\/(src|dist)\//.test(id) ? 'phaser' : undefined),
      },
    },
  },
  worker: {
    format: 'es',
  },
}));
