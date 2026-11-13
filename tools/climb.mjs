#!/usr/bin/env node
/**
 * 퀵 등반 머신 (D-385) — 밸런스 모니터링 · 데이터 수집 전용. 화면을 띄우지 않고, 결과는 짧은 표 하나만 찍는다(토큰 · 세션 절약).
 * 화면 리뷰는 따로: tools/qa/fullrun.cjs (실제 단추를 누르는 한 판 · 스크린샷).
 *
 * 사용: npm run climb -- --styles search,greedy --asc 0,6,13 --n 50 --jobs 4 [--out sim/climb-last.json]
 *       실험실(D-456): [--personas standard,risky,hoarder] [--temp 1.5] --out 파일 → node tools/simlab-report.mjs 파일
 * 표: 봇 · 승급 · 판 수 · 완주%(95% 구간) · 막별 도착 · 부품 · 분대 · 덱 · 대국당 턴 · 손 놓은 턴%
 */
import { spawn } from 'node:child_process';
import { writeFileSync, appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as bundle } from 'vite';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const styles = arg('styles', 'search,greedy').split(',');
const ascs = arg('asc', '0').split(',').map(Number);
const builds = arg('builds', 'neutral').split(',');
const pools = arg('pools', 'all').split(',');
const personas = arg('personas', 'standard').split(',');
/** 두뇌 봇의 사람다운 실수 온도 (D-456) — 0 = 늘 최선 */
const temp = Number(arg('temp', 0));
const N = Number(arg('n', 40)), jobs = Number(arg('jobs', 4)), shard = Number(arg('shard', 20));
const out = arg('out', '');
if (out) writeFileSync(`${out}.partial.ndjson`, '');
const engine = arg('engine', 'node');
if (!['node','vitest'].includes(engine)) throw new Error('engine must be node or vitest');
const cache = engine === 'node' ? mkdtempSync(join(tmpdir(), 'pawnisher-climb-')) : null;
const worker = cache && join(cache, 'worker.cjs');
if (cache) await bundle({ configFile: false, logLevel: 'silent', build: { ssr: join(dirname(fileURLToPath(import.meta.url)), 'climb-worker.ts'), outDir: cache, emptyOutDir: true, rollupOptions: { output: { format: 'cjs', entryFileNames: 'worker.cjs' } } } });

const tasks = [];
if (![N,jobs,shard].every(x => Number.isInteger(x) && x > 0) || ascs.some(a => !Number.isInteger(a) || a < 0 || a > 13)
  || styles.some(s => !['search','greedy','naive','random'].includes(s)) || builds.some(b => !['neutral','mixed','knight','rook','ax-cav','ax-inf','ax-king','ax-chain','ax-push','ax-tactic'].includes(b)) || pools.some(p => !['starter','all'].includes(p)) || personas.some(p => !['standard','risky','hoarder'].includes(p))) throw new Error('invalid climb arguments');
for (const s of styles) for (const a of ascs) for (const f of builds) for (const pool of pools) for (const pe of personas) for (let off = 0; off < N; off += shard) tasks.push({ s, a, f, pool, pe, n: Math.min(shard, N - off), off });
const rows = [];
const run = (t) => new Promise((done, fail) => {
  const p = spawn(engine === 'node' ? process.execPath : 'npx', engine === 'node' ? [worker] : ['vitest', 'run', '--config', 'vitest.sim.config.ts', 'sim/climb.sim.ts'], { env: { ...process.env, CL_STYLE: t.s, CL_BUILD: t.f, CL_POOL: t.pool, CL_ASC: String(t.a), CL_N: String(t.n), CL_OFF: String(t.off), CL_PERSONA: t.pe, CL_TEMP: String(temp) } });
  let buf = '';
  let err = '';
  p.stdout.on('data', (d) => { buf += d; });
  p.stderr.on('data', d => { err += d; });
  p.on('error', fail);
  p.on('close', code => {
    if (code !== 0) return fail(new Error(`climb worker failed (${code}): ${err.slice(-1200)} ${buf.slice(-1200)}`));
    const batch = buf.split('\n').filter(l => l.startsWith('CLIMB ')).map(l => JSON.parse(l.slice(6)));
    if (batch.length !== t.n) return fail(new Error(`missing climb rows: ${batch.length}/${t.n}`));
    rows.push(...batch);
    if (out) appendFileSync(`${out}.partial.ndjson`, batch.map(r => JSON.stringify(r)).join('\n') + '\n');
    done();
  });
});
const t0 = Date.now();
let next = 0;
await Promise.all(Array.from({ length: Math.min(jobs, tasks.length) }, async () => { while (next < tasks.length) await run(tasks[next++]); }));

const ci = (k, n) => { if (!n) return '-'; const p = k / n, z = 1.96, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d; return `${Math.round((c - h) * 100)}~${Math.round((c + h) * 100)}`; };
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
console.log(`봇      전투단계 빌드    공급     판  완주% (95%)   도착 1/2/3/종막   부품 분대 덱 턴/대국 손놓음% 가족부품`);
for (const s of styles) for (const a of ascs) for (const f of builds) for (const pool of pools) for (const pe of personas) {
  const g = rows.filter((r) => r.s === s && r.a === a && r.f === f && r.pool === pool && r.pe === pe);
  if (!g.length) continue;
  const k = g.filter((r) => r.c).length;
  const reach = [1, 2, 3, 4].map((x) => g.filter((r) => r.act === x).length).join('/');
  const it = g.reduce((x, r) => x + r.it, 0), ii = g.reduce((x, r) => x + r.ii, 0);
  console.log(`${s.padEnd(7)} ${String(a).padStart(3)} ${(pe === 'standard' ? f : `${f}/${pe}`).padEnd(7)} ${pool.padEnd(7)} ${String(g.length).padStart(4)} ${String(Math.round(k/g.length*100)).padStart(3)} (${ci(k,g.length).padEnd(6)}) ${reach.padEnd(15)} ${avg(g.map(r=>r.p)).toFixed(1)} ${avg(g.map(r=>r.sq)).toFixed(1)} ${avg(g.map(r=>r.d)).toFixed(0)} ${avg(g.map(r=>r.t/Math.max(1,r.b))).toFixed(1)} ${(it ? ii/it*100 : 0).toFixed(1)} ${avg(g.map(r=>r.fp)).toFixed(1)}`);
}
console.log(`(${rows.length}판 · ${Math.round((Date.now() - t0) / 1000)}초)`);
if (rows.length !== styles.length*ascs.length*builds.length*pools.length*personas.length*N) throw new Error('incomplete climb grid');
if (out) writeFileSync(out, JSON.stringify(rows.sort((a,b) => a.seed-b.seed || a.a-b.a || a.s.localeCompare(b.s) || a.f.localeCompare(b.f) || a.pool.localeCompare(b.pool) || a.pe.localeCompare(b.pe))));
if (cache) rmSync(cache, { recursive: true });
if (out) rmSync(`${out}.partial.ndjson`);
