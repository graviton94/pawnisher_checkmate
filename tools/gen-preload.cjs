#!/usr/bin/env node
/**
 * 미리 불러올 그림 목록 (D-239 워밍업 로딩): public/ 안의 PNG를 src/data/preload-list.ts로 적는다.
 * 빌드 전에 돈다 (package.json build). 손으로 고치지 않는다.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const PUB = path.join(ROOT, 'public');
/**
 * 미리 받지 않는 그림: 앱(본편)은 부르지 않지만 public/에 남겨 둔 것 — 2.0(legacy) 아이콘 · 작은 기물 m-*(2.0 배경 · 앱 아이콘 도구).
 * 아예 안 쓰는 그림은 public/ 밖 build-res/unused/로 옮겼다 (D-541 — 그 폴더의 README.md 목록). 다시 쓰게 되면 여기서 지운다.
 */
const SKIP = new Set(['bricks', 'oil', 'portal'].map((n) => `ui/icons/${n}.png`));
const skip = (rel) => SKIP.has(rel) || /^pieces\/m-/.test(rel);
const out = [];
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.png') && !/^(icon-|apple-touch|favicon)/.test(f)) {
      const rel = path.relative(PUB, p).split(path.sep).join('/');
      if (!skip(rel)) out.push(rel);
    }
  }
};
walk(PUB);
out.sort();
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'preload-list.ts'), `/** 워밍업 로딩이 미리 부르는 public 그림 (tools/gen-preload.cjs가 만든다 — 손으로 고치지 않는다) */\nexport const PRELOAD: string[] = ${JSON.stringify(out, null, 0).replace(/","/g, '",\n  "').replace('["', '[\n  "').replace('"]', '",\n]')};\n`);
console.log(`src/data/preload-list.ts — ${out.length}장`);

// 묶음 안 큰 그림 (src/assets, 4 KB 이상 — 그보다 작은 것은 Vite가 CSS · JS 안에 base64로 넣어 미리 받을 것이 없다).
// 예전에는 import.meta.glob으로 전부 불러 작은 그림 190장이 CSS와 JS에 두 번 박혔다 (코드 리뷰 8)
const ASSETS = path.join(ROOT, 'src', 'assets');
const big = [];
const walkA = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkA(p);
    else if (f.endsWith('.png') && fs.statSync(p).size >= 4096) big.push(path.relative(ASSETS, p).split(path.sep).join('/'));
  }
};
walkA(ASSETS);
big.sort();
fs.writeFileSync(
  path.join(ROOT, 'src', 'data', 'preload-bundled.ts'),
  `/** 워밍업 로딩이 미리 부르는 묶음 안 큰 그림 (4 KB 이상 — tools/gen-preload.cjs가 만든다, 손으로 고치지 않는다) */\nexport const PRELOAD_BUNDLED: string[] = [\n${big.map((p) => `  new URL('../assets/${p}', import.meta.url).href,`).join('\n')}\n];\n`,
);
console.log(`src/data/preload-bundled.ts — ${big.length}장`);
