#!/usr/bin/env node
/**
 * 퀵 등반 머신 (D-385) — 밸런스 모니터링 · 데이터 수집 전용. 화면을 띄우지 않고, 결과는 짧은 표 하나만 찍는다(토큰 · 세션 절약).
 * 화면 리뷰는 따로: tools/qa/fullrun.cjs (실제 단추를 누르는 한 판 · 스크린샷).
 *
 * 사용: npm run climb -- --styles search,greedy --asc 0,6,13 --n 50 --jobs 4 [--out sim/climb-last.json]
 * 표: 봇 · 승급 · 판 수 · 완주%(95% 구간) · 막별 도착 · 부품 · 분대 · 덱 · 대국당 턴 · 손 놓은 턴%
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const styles = arg('styles', 'search,greedy').split(',');
const ascs = arg('asc', '0').split(',').map(Number);
const N = Number(arg('n', 40)), jobs = Number(arg('jobs', 4)), shard = Number(arg('shard', 20));
const out = arg('out', '');

const tasks = [];
for (const s of styles) for (const a of ascs) for (let off = 0; off < N; off += shard) tasks.push({ s, a, n: Math.min(shard, N - off), off });
const rows = [];
const run = (t) => new Promise((done) => {
  const p = spawn('npx', ['vitest', 'run', '--config', 'vitest.sim.config.ts', 'sim/climb.sim.ts'], { env: { ...process.env, CL_STYLE: t.s, CL_ASC: String(t.a), CL_N: String(t.n), CL_OFF: String(t.off) } });
  let buf = '';
  p.stdout.on('data', (d) => { buf += d; });
  p.on('close', () => { for (const l of buf.split('\n')) if (l.startsWith('CLIMB ')) rows.push(JSON.parse(l.slice(6))); done(); });
});
const t0 = Date.now();
let next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, async () => { while (next < tasks.length) await run(tasks[next++]); }));

const ci = (k, n) => { if (!n) return '-'; const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return `${Math.round((c - h) * 100)}~${Math.round((c + h) * 100)}`; };
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`봇      승급  판   완주%  (95%)   도착 1/2/3/종막   부품  분대  덱   턴/대국  손놓음%`);
for (const s of styles) for (const a of ascs) {
  const g = rows.filter((r) => r.s === s && r.a === a);
  if (!g.length) continue;
  const k = g.filter((r) => r.c).length;
  const reach = [1, 2, 3, 4].map((x) => g.filter((r) => r.act === x).length).join('/');
  const it = g.reduce((x, r) => x + r.it, 0), ii = g.reduce((x, r) => x + r.ii, 0);
  console.log(`${s.padEnd(7)} ${String(a).padStart(3)} ${String(g.length).padStart(4)}  ${String(Math.round((k / g.length) * 100)).padStart(4)}  (${ci(k, g.length).padEnd(6)})  ${reach.padEnd(15)} ${avg(g.map((r) => r.p)).toFixed(1).padStart(5)} ${avg(g.map((r) => r.sq)).toFixed(1).padStart(5)} ${avg(g.map((r) => r.d)).toFixed(0).padStart(4)} ${(avg(g.map((r) => r.t / Math.max(1, r.b)))).toFixed(1).padStart(8)} ${(it ? (ii / it) * 100 : 0).toFixed(1).padStart(8)}`);
}
console.log(`(${rows.length}판 · ${Math.round((Date.now() - t0) / 1000)}초)`);
if (out) writeFileSync(out, JSON.stringify(rows));
