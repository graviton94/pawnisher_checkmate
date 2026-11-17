#!/usr/bin/env node
/**
 * 갈무리 글꼴 줄이기 (코드 리뷰 2 · D-번호는 DECISIONS): src/ 안에서 실제로 쓰는 글자 + ASCII만 남긴 woff2를
 * src/fonts-sub/에 만들고, 같은 자리에 faces.css를 적는다 (빌드 전에 돈다 — 손으로 고치지 않는다, 저장소에 넣지 않는다).
 *
 * faces.css = 글꼴마다 두 얼굴: ① 원본 전체(unicode-range = 줄인 글꼴에 없는 글자만) ② 줄인 글꼴(unicode-range = 담은 글자).
 * 두 범위가 겹치지 않아 아는 글자는 줄인 글꼴만 받고, 예상 못 한 글자가 화면에 나올 때만 원본을 늦게 받아 그린다
 * (겹치면 document.fonts.load가 두 얼굴을 다 받는다).
 *
 * 점검: 쓰는 글자 중 원본 글꼴에 있는 글자가 줄인 글꼴에 하나라도 없으면 실패한다 (tests/font-subset.test.ts도 같은 점검).
 * 쓰기: node tools/subset-fonts.mjs [--check]  (--check = 파일을 쓰지 않고 점검만)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_FONTS = path.join(ROOT, 'node_modules', 'galmuri', 'dist');
const OUT = path.join(ROOT, 'src', 'fonts-sub');

/** 게임이 쓰는 갈무리 얼굴 (src/fonts.css가 faces.css를 부른다) */
export const FACES = [
  { family: 'Galmuri11', weight: 400, file: 'Galmuri11' },
  { family: 'Galmuri11', weight: 700, file: 'Galmuri11-Bold' },
  { family: 'Galmuri14', weight: 400, file: 'Galmuri14' }, // 본문
  { family: 'Galmuri9', weight: 400, file: 'Galmuri9' }, // D-373 카드 글 맞춤 마지막 단계 전용 10px
];

/** 글자를 모을 파일 (게임 글은 모두 src/ 데이터 · 코드에서 온다 — 자유 입력 칸이 없다) */
const walk = (dir, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (f === 'fonts-sub') continue;
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|css|html|json)$/.test(f)) out.push(p);
  }
  return out;
};

/** 쓰는 글자 모음 (코드 포인트, 정렬) — src/ 전부 + index.html · legacy.html + 인쇄 가능한 ASCII · 기본 문장부호 */
export const usedCodepoints = () => {
  const set = new Set();
  for (let c = 0x20; c < 0x7f; c++) set.add(c);
  for (const c of [0xa0, 0xb7, 0x2018, 0x2019, 0x201c, 0x201d, 0x2026, 0x2014, 0x2013, 0x300c, 0x300d, 0xd7]) set.add(c);
  // Phaser 글자 높이 재기 문자열 (TextStyle testString — 소스에 '|MÃ‰qgy'로 깨져 들어 있다) — 빠지면 판 위 글씨를 잴 때마다 원본 전체를 받는다
  for (const c of [0xc9, 0xc3, 0x2030]) set.add(c);
  const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'index.html'), path.join(ROOT, 'legacy.html')].filter((f) => fs.existsSync(f));
  for (const f of files) for (const ch of fs.readFileSync(f, 'utf8')) {
    const c = ch.codePointAt(0);
    if (c >= 0x20 && !(c >= 0xd800 && c <= 0xdfff)) set.add(c);
  }
  return [...set].sort((a, b) => a - b);
};

/** sfnt(TTF)의 cmap에서 글자 → 글리프가 있는 코드 포인트 모음 (형식 4 · 12) */
export const cmapOf = (buf) => {
  const b = Buffer.from(buf);
  const n = b.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < n; i++) {
    const r = 12 + i * 16;
    if (b.toString('latin1', r, r + 4) === 'cmap') cmap = b.readUInt32BE(r + 8);
  }
  if (cmap < 0) throw new Error('cmap 없음');
  const set = new Set();
  const subs = b.readUInt16BE(cmap + 2);
  for (let i = 0; i < subs; i++) {
    const off = cmap + b.readUInt32BE(cmap + 4 + i * 8 + 4);
    const fmt = b.readUInt16BE(off);
    if (fmt === 4) {
      const seg = b.readUInt16BE(off + 6) / 2;
      const ends = off + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const end = b.readUInt16BE(ends + s * 2), start = b.readUInt16BE(starts + s * 2);
        const delta = b.readInt16BE(deltas + s * 2), ro = b.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g;
          if (ro === 0) g = (c + delta) & 0xffff;
          else {
            const gi = b.readUInt16BE(ranges + s * 2 + ro + (c - start) * 2);
            g = gi === 0 ? 0 : (gi + delta) & 0xffff;
          }
          if (g) set.add(c);
        }
      }
    } else if (fmt === 12) {
      const groups = b.readUInt32BE(off + 12);
      for (let g = 0; g < groups; g++) {
        const r = off + 16 + g * 12;
        const s = b.readUInt32BE(r), e = b.readUInt32BE(r + 4), gid = b.readUInt32BE(r + 8);
        for (let c = s; c <= e; c++) if (gid + (c - s)) set.add(c);
      }
    }
  }
  return set;
};

/** 코드 포인트 목록 → CSS unicode-range (이어진 것은 묶는다) */
export const unicodeRange = (cps) => {
  const out = [];
  for (let i = 0; i < cps.length; ) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    const h = (c) => c.toString(16).toUpperCase();
    out.push(i === j ? `U+${h(cps[i])}` : `U+${h(cps[i])}-${h(cps[j])}`);
    i = j + 1;
  }
  return out.join(',');
};

/**
 * 원본 얼굴의 unicode-range (거칠게): 남은 글자 구간을 틈 gap 이하로 이어 묶되, 쓰는 글자(exclude)는 구간에서 뺀다 —
 * 줄인 글꼴과 겹치지 않고, 원본에도 없는 기호(✓ · ⚡ …) 때문에 큰 원본을 헛되이 받지 않게.
 */
export const coarseRange = (have, exclude, gap = 128) => {
  const cps = [...have].sort((a, b) => a - b);
  const ex = new Set(exclude);
  const runs = [];
  for (const c of cps) {
    const last = runs[runs.length - 1];
    if (last && c - last[1] <= gap) last[1] = c;
    else runs.push([c, c]);
  }
  const out = [];
  for (const [a, z] of runs) {
    let s = a;
    for (let c = a; c <= z; c++) if (ex.has(c)) { if (c > s) out.push([s, c - 1]); s = c + 1; }
    if (s <= z) out.push([s, z]);
  }
  const h = (c) => c.toString(16).toUpperCase();
  return out.map(([a, z]) => (a === z ? `U+${h(a)}` : `U+${h(a)}-${h(z)}`)).join(',');
};

/**
 * 얼굴 하나를 줄이고 점검한다: { woff2, covered, missing(줄인 글꼴에 없는데 원본엔 있는 글자), absent(원본에도 없는 글자) }
 */
export const subsetFace = async (face, cps) => {
  const subsetFont = require('subset-font');
  const full = fs.readFileSync(path.join(SRC_FONTS, `${face.file}.ttf`));
  const fullMap = cmapOf(full);
  const text = String.fromCodePoint(...cps);
  const sfnt = await subsetFont(full, text, { targetFormat: 'sfnt' });
  const subMap = cmapOf(sfnt);
  const missing = cps.filter((c) => fullMap.has(c) && !subMap.has(c));
  const absent = cps.filter((c) => !fullMap.has(c));
  const covered = cps.filter((c) => subMap.has(c));
  const woff2 = await subsetFont(full, text, { targetFormat: 'woff2' });
  return { woff2, covered, missing, absent, fullRange: coarseRange(new Set([...fullMap].filter((c) => !subMap.has(c))), cps) };
};

const main = async () => {
  const check = process.argv.includes('--check');
  const cps = usedCodepoints();
  if (!check) fs.mkdirSync(OUT, { recursive: true });
  let css = '/* tools/subset-fonts.mjs가 만든다 — 손으로 고치지 않는다. 원본(늦게 받는 예비) → 줄인 글꼴(먼저) 순서 */\n';
  let bad = 0, total = 0;
  for (const f of FACES) {
    const r = await subsetFace(f, cps);
    if (r.missing.length) {
      bad += r.missing.length;
      console.error(`${f.file}: 줄인 글꼴에 빠진 글자 ${r.missing.length} — ${String.fromCodePoint(...r.missing.slice(0, 40))}`);
    }
    total += r.woff2.length;
    console.log(`${f.file}: ${r.covered.length}자 · ${(r.woff2.length / 1024).toFixed(1)} KB (원본에 없는 글자 ${r.absent.length})`);
    const full = `../../node_modules/galmuri/dist/${f.file}.woff2`;
    css += `@font-face { font-family: ${f.family}; font-weight: ${f.weight}; font-display: swap; src: url('${full}') format('woff2'); unicode-range: ${r.fullRange}; }\n`;
    css += `@font-face { font-family: ${f.family}; font-weight: ${f.weight}; font-display: swap; src: url('./${f.file}-sub.woff2') format('woff2'); unicode-range: ${unicodeRange(r.covered)}; }\n`;
    if (!check) fs.writeFileSync(path.join(OUT, `${f.file}-sub.woff2`), r.woff2);
  }
  if (!check) fs.writeFileSync(path.join(OUT, 'faces.css'), css);
  console.log(`갈무리 줄이기: 글자 ${cps.length} · 합계 ${(total / 1024).toFixed(1)} KB${check ? ' (점검만)' : ' → src/fonts-sub/'}`);
  if (bad) {
    console.error('실패: 쓰는 글자가 줄인 글꼴에 빠졌다');
    process.exit(1);
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
