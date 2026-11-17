#!/usr/bin/env node
/**
 * 안드로이드 · PC 묶음 다듬기 (D-546): 출시 빌드(dist/)에서 M4A 소리 사본을 지운다.
 * M4A는 OGG를 못 푸는 iOS Safari 옛판용 — 캐패시터 웹뷰 · 일렉트론은 크로미엄이라 늘 OGG를 푼다.
 * 웹 빌드(`npm run build` · `build:release`)는 그대로 둔다. `android:sync` · `pc:dist`가 `npm run build:native`(= 이 파일)로 부른다.
 * 재생 쪽(`src/audio/file.ts`)은 OGG를 못 풀면 M4A를 찾고, 그것도 없으면 조용히 건너뛴다.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// 1) 출시 빌드 — 재생 쪽이 m4a를 찾지 않게 표시를 켠다 (VITE_AUDIO_OGG_ONLY, src/audio/file.ts)
execSync('npm run build:release', { stdio: 'inherit', env: { ...process.env, VITE_AUDIO_OGG_ONLY: '1' } });
// 2) m4a 사본을 지운다
const root = path.join(__dirname, '..', 'dist', 'audio');
if (!fs.existsSync(root)) {
  console.error('build-native: dist/audio가 없다 — 먼저 build:release');
  process.exit(1);
}
let n = 0, bytes = 0;
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.m4a')) {
      const ogg = p.slice(0, -4) + '.ogg';
      if (!fs.existsSync(ogg)) throw new Error(`build-native: ${ogg} 없이 m4a만 있다 — 지우지 않는다`);
      bytes += fs.statSync(p).size;
      fs.rmSync(p);
      n++;
    }
  }
};
walk(root);
console.log(`build-native: m4a ${n}개 · ${(bytes / 1048576).toFixed(2)} MB를 묶음에서 뺐다`);
