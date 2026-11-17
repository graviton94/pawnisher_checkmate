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
 * 안 쓰는 그림 (D-538 · 리뷰 #14 — 코드 · CSS · HTML에서 정적 · 템플릿 참조가 없다고 다시 확인한 것). 파일은 지우지 않고
 * 워밍업 목록에서만 뺀다 — 미리 내려받지 않는다. 다시 쓰게 되면 여기서 지운다.
 */
const SKIP = new Set([
  ...['entry-check', 'entry-battle', 'ending-peel', 'returned-box', 'ending-5', 'promote-alarm', 'ending-crew', 'throne-mold', 'gilded-solitude',
    'ending-1', 'promote-betray', 'shipping-interior', 'shipping-company', 'ending-6', 'ending-3', 'epilogue-hands', 'promote-dark', 'ending-7'].map((n) => `scenes/${n}.png`),
  ...['badge-enemy', 'badge', 'base-ally', 'base-enemy', 'move-dot', 'select', 'target-kill', 'target'].map((n) => `ui/marks/${n}.png`),
  ...['button-pressed', 'button', 'card-iron', 'card-paper', 'panel', 'slot'].map((n) => `ui/frames/${n}.png`),
  ...['lift', 'scrap', 'screwbox', 'shield', 'trap'].map((n) => `ui/props/${n}.png`),
  ...['bricks', 'oil', 'portal'].map((n) => `ui/icons/${n}.png`),
]);
/** 이름 규칙으로 빼는 것: 16px 소품 아이콘 ic-*(코드는 ic32-*만 부른다) · 작은 기물 m-*(옛 2.0 화면 · 앱 아이콘 도구만 쓴다) */
const skip = (rel) => SKIP.has(rel) || /^ui\/props\/ic-/.test(rel) || /^pieces\/m-/.test(rel);
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
    else if (f.endsWith('.png') && fs.statSync(p).size >= 4096 && !/^ap-(full|empty)\.png$/.test(f)) big.push(path.relative(ASSETS, p).split(path.sep).join('/'));
  }
};
// ap-full · ap-empty (431×532 옛 태엽 그림, 255KB)는 코드가 부르지 않는다 (D-538) — 미리 받지 않는다
walkA(ASSETS);
big.sort();
fs.writeFileSync(
  path.join(ROOT, 'src', 'data', 'preload-bundled.ts'),
  `/** 워밍업 로딩이 미리 부르는 묶음 안 큰 그림 (4 KB 이상 — tools/gen-preload.cjs가 만든다, 손으로 고치지 않는다) */\nexport const PRELOAD_BUNDLED: string[] = [\n${big.map((p) => `  new URL('../assets/${p}', import.meta.url).href,`).join('\n')}\n];\n`,
);
console.log(`src/data/preload-bundled.ts — ${big.length}장`);
