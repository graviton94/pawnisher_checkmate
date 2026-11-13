#!/usr/bin/env node
/**
 * 실험실 — 아이템 힘 값 (D-456). 부품 · 카드마다 같은 시드 묶음으로 「처음부터 쥐여 준 출하」와 「안 준 출하(기준)」를 짝지어 돌려
 * 완주율 차와 「이긴 대국 수」 차(짝 비교라 잡음이 적다)를 표 하나로. 봇의 가치표(고르는 버릇)와 상관없이 그 아이템 자체의 힘을 본다.
 * 사용: node tools/simlab-items.mjs --kind part|card [--ids a,b] [--style greedy] [--asc 2] [--n 40] [--jobs 6] [--temp 0]
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'vite';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const kind = arg('kind', 'part'), style = arg('style', 'greedy'), asc = Number(arg('asc', 2)), N = Number(arg('n', 40)), jobs = Number(arg('jobs', 6)), temp = arg('temp', '0');
const here = dirname(fileURLToPath(import.meta.url));
const cache = mkdtempSync(join(tmpdir(), 'pawnisher-simlab-'));
await bundle({ configFile: false, logLevel: 'silent', build: { ssr: join(here, 'simlab-worker.ts'), outDir: cache, emptyOutDir: true, rollupOptions: { output: { format: 'cjs', entryFileNames: 'worker.cjs' } } } });
// 아이템 목록: 실제 게임 데이터에서 (보상 카드 · 부품 전부)
const listFile = join(cache, 'list.cjs');
await bundle({ configFile: false, logLevel: 'silent', build: { ssr: join(here, 'simlab-list.ts'), outDir: cache, emptyOutDir: false, rollupOptions: { output: { format: 'cjs', entryFileNames: 'list.cjs' } } } });
const all = JSON.parse(await new Promise((ok, no) => { const p = spawn(process.execPath, [listFile]); let b = ''; p.stdout.on('data', (d) => (b += d)); p.on('close', (c) => (c ? no(new Error('list')) : ok(b))); }));
const ids = arg('ids', '') ? arg('ids', '').split(',') : all[kind];
const items = ['base:', ...ids.map((id) => `${kind}:${id}`)];
const chunks = [];
for (let i = 0; i < items.length; i += 4) chunks.push(items.slice(i, i + 4));
const rows = [];
const t0 = Date.now();
const run = (chunk) => new Promise((ok, no) => {
  const p = spawn(process.execPath, [join(cache, 'worker.cjs')], { env: { ...process.env, SL_STYLE: style, SL_ASC: String(asc), SL_N: String(N), SL_TEMP: temp, SL_ITEMS: chunk.join(',') } });
  let b = '', e = '';
  p.stdout.on('data', (d) => (b += d)); p.stderr.on('data', (d) => (e += d));
  p.on('close', (c) => { if (c) return no(new Error(e.slice(-800))); rows.push(...b.split('\n').filter((l) => l.startsWith('SL ')).map((l) => JSON.parse(l.slice(3)))); ok(); });
});
let next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, chunks.length) }, async () => { while (next < chunks.length) await run(chunks[next++]); }));
rmSync(cache, { recursive: true });
const by = new Map();
for (const [item, seed, c, won] of rows) { if (!by.has(item)) by.set(item, new Map()); by.get(item).set(seed, [c, won]); }
const base = by.get('base:');
const res = [];
for (const [item, m] of by) {
  if (item === 'base:') continue;
  let dc = 0, dw = 0, k = 0, sq = 0;
  for (const [seed, [c, w]] of m) { const b0 = base.get(seed); if (!b0) continue; dc += c - b0[0]; dw += w - b0[1]; sq += (w - b0[1]) ** 2; k++; }
  const mean = dw / k, sd = Math.sqrt(Math.max(0, sq / k - mean * mean)), se = sd / Math.sqrt(k);
  res.push({ item: item.split(':')[1], dClear: dc / k, dWon: mean, se, clear: [...m.values()].filter(([c]) => c).length / m.size });
}
const baseClear = [...base.values()].filter(([c]) => c).length / base.size;
const baseWon = [...base.values()].reduce((a, [, w]) => a + w, 0) / base.size;
res.sort((a, b) => b.dWon - a.dWon);
console.log(`| ${kind === 'part' ? '부품' : '카드'} (${style} · 승급 ${asc} · 짝 ${N}출하) | 완주 | Δ완주 | Δ이긴 대국 (±표준오차) | 판정 |`);
console.log('|---|---|---|---|---|');
console.log(`| (기준 — 안 쥠) | ${Math.round(baseClear * 100)}% | — | 평균 ${baseWon.toFixed(1)}대국 | |`);
for (const r of res) {
  const sig = Math.abs(r.dWon) > 2 * r.se;
  const tag = !sig ? '' : r.dWon >= 2 ? '강함 — 너프 후보' : r.dWon <= -0.5 ? '손해 — 들면 진다' : r.dWon > 0 ? '쓸모 있음' : '약함';
  console.log(`| ${r.item} | ${Math.round(r.clear * 100)}% | ${r.dClear >= 0 ? '+' : ''}${Math.round(r.dClear * 100)} | ${r.dWon >= 0 ? '+' : ''}${r.dWon.toFixed(2)} (±${r.se.toFixed(2)}) | ${tag} |`);
}
console.log(`\n(${rows.length}출하 · ${Math.round((Date.now() - t0) / 1000)}초)`);
