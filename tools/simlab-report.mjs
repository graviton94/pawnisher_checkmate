#!/usr/bin/env node
/**
 * 시뮬레이션 실험실 보고서 (D-456, 시니어 제안 「재미 · 밸런스 대리 지표」).
 * 입력: `npm run climb -- ... --out <파일>`이 남긴 JSON(판마다 한 줄 — src/sim/climb-sample.ts).
 * 출력: 마크다운 한 장 — ① 아슬아슬함(이긴 뒤 남은 체력) ② 막힘(손 놓은 턴) ③ 결정적 한 턴(스윙) · 한 방
 *       ④ 덱 성장 기울기(막별 턴당 피해 · 대국 길이) ⑤ 경제(종막 직전 나사 · 남은 시작 카드) ⑥ 픽률 × 보유 시 완주율.
 * 사용: node tools/simlab-report.mjs <climb.json> [--min 8] > docs/reports/<날짜>-simlab.md
 *
 * 읽는 법(봇 지표는 사람의 대리값이다): 픽률은 봇의 가치표가 정한 것이라 「사람이 고를까」가 아니라 「봇이 고르게 만든 기준이 맞나」를 본다.
 * 완주율 차(Δ)가 크게 + 이면 그 카드 · 부품이 판을 끌고 가는 것(필수 · 숨은 사기), 크게 − 이면 함정 후보.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('사용: node tools/simlab-report.mjs <climb.json> [--min 8]');
const minN = Number(process.argv[process.argv.indexOf('--min') + 1] || 8) || 8;
const rows = JSON.parse(readFileSync(file, 'utf8'));
const pct = (x) => `${Math.round(x * 100)}%`;
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const q = (xs, p) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
// lg 칸: [막, 종류(n 일반 · c 검문 · o 반장 · 도금왕), 승, 턴, 남은 체력, 스윙, 한 방, 턴당 피해, 쓰러짐, 한 턴 최다 쓰러짐]
const L = (l) => ({ act: l[0], k: l[1], won: !!l[2], turns: l[3], hp: l[4], swing: l[5], peak: l[6], dpt: l[7], fell: l[8], maxFell: l[9] });

const groups = new Map();
for (const r of rows) {
  const key = `${r.s} · 승급 ${r.a} · ${r.f}${r.pe && r.pe !== 'standard' ? `/${r.pe}` : ''}${r.tp ? ` · 온도 ${r.tp}` : ''}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
const out = [];
out.push(`# 시뮬레이션 실험실 보고 (D-456)`, '', `입력 \`${file}\` · ${rows.length}출하. 봇 지표는 사람의 대리값이다 — 판정 기준은 [GDD 20장](../gdd/20_sim_lab.md).`, '');

out.push('## 1. 한눈에', '', '| 묶음 | 출하 | 완주 | 막힘(손 놓은 턴) | 반장 · 검문 뒤 남은 체력 중앙 | 15~30% 구간 | 70% 이상 | 결정적 한 턴(≥40%) 대국 | 종막 직전 나사 | 남은 시작 카드 |', '|---|---|---|---|---|---|---|---|---|---|');
for (const [key, g] of groups) {
  const all = g.flatMap((r) => (r.lg ?? []).map(L));
  const won = all.filter((l) => l.won);
  // 아슬아슬함: 반장 · 검문만 — 이긴 대국의 남은 분대 체력
  const close = all.filter((l) => l.won && (l.k === 'c' || l.k === 'o'));
  const hp = close.map((l) => l.hp);
  const it = g.reduce((a, r) => a + r.it, 0), ii = g.reduce((a, r) => a + r.ii, 0);
  const gf = g.map((r) => r.gf).filter((x) => x >= 0);
  out.push(`| ${key} | ${g.length} | ${pct(g.filter((r) => r.c).length / g.length)} | ${it ? pct(ii / it) : '—'} | ${pct(q(hp, 0.5))} | ${pct(hp.filter((x) => x >= 0.15 && x <= 0.3).length / Math.max(1, hp.length))} | ${pct(hp.filter((x) => x >= 0.7).length / Math.max(1, hp.length))} | ${pct(won.filter((l) => l.swing >= 0.4).length / Math.max(1, won.length))} | ${gf.length ? Math.round(avg(gf)) : '—'} | ${avg(g.map((r) => r.sl)).toFixed(1)} |`);
}
out.push('', '기준: 아슬아슬함은 남은 체력이 15~30%에 몰릴수록 긴장, 70% 이상이 많으면 너무 쉽다. 막힘은 15%를 넘으면 「패가 말려 졌다」. 결정적 한 턴은 너무 낮으면 밋밋한 공방, 너무 높으면 한 방 게임.', '');

out.push('## 2. 막별 성장 기울기 · 한 방', '', '| 묶음 | 막 | 대국 | 이긴 대국 턴 | 턴당 준 피해 | 한 방 중앙 / 상위 10% | 한 턴에 둘 이상 잃음 |', '|---|---|---|---|---|---|---|');
for (const [key, g] of groups) {
  const all = g.flatMap((r) => (r.lg ?? []).map(L));
  for (const act of [1, 2, 3, 4]) {
    const a = all.filter((l) => l.act === act);
    if (!a.length) continue;
    const w = a.filter((l) => l.won);
    out.push(`| ${key} | ${act === 4 ? '종막' : `${act}막`} | ${a.length} | ${avg(w.map((l) => l.turns)).toFixed(1)} | ${Math.round(avg(a.map((l) => l.dpt)))} | ${q(a.map((l) => l.peak), 0.5)} / ${q(a.map((l) => l.peak), 0.9)} | ${act === 4 ? '— (종막은 다 걸어도 된다)' : pct(a.filter((l) => l.maxFell >= 2).length / a.length)} |`);
  }
}
out.push('', '기준: 턴당 준 피해가 막마다 적 HP 성장(대국마다 ×1.05)과 비슷하게 올라야 성장이 느껴진다 — 피해가 덜 오르면 대국 턴이 막마다 늘어난다.', '');

out.push('## 3. 픽률 × 보유 시 완주율', '');
for (const [key, g] of groups) {
  const base = g.filter((r) => r.c).length / g.length;
  const stat = new Map();
  for (const r of g) {
    const takenHere = new Set();
    for (const [id, part, taken] of r.of ?? []) {
      const s = stat.get(id) ?? { id, part, off: 0, take: 0, runs: 0, wins: 0 };
      s.off += 1; s.take += taken;
      if (taken && !takenHere.has(id)) { takenHere.add(id); s.runs += 1; s.wins += r.c; }
      stat.set(id, s);
    }
  }
  const list = [...stat.values()].filter((s) => s.off >= minN);
  const tag = (s) => { const pr = s.take / s.off, wr = s.runs ? s.wins / s.runs : 0; return pr >= 0.7 && wr - base >= 0.1 ? '필수(과함?)' : pr <= 0.15 && s.runs >= 3 && wr - base >= 0.15 ? '숨은 사기' : pr <= 0.1 ? '함정 후보' : s.runs >= 3 && wr - base <= -0.15 ? '들면 진다' : ''; };
  out.push(`### ${key} — 기준 완주 ${pct(base)} · 제시 ${minN}번 이상만`, '', '| 이름 | 종류 | 제시 | 픽률 | 고른 출하 | 그 출하 완주 | Δ | 판정 |', '|---|---|---|---|---|---|---|---|');
  const rowsOut = list.map((s) => ({ s, d: s.runs ? s.wins / s.runs - base : -9 })).sort((a, b) => b.d - a.d);
  const shown = [...rowsOut.slice(0, 12), ...rowsOut.slice(-8).filter((x) => !rowsOut.slice(0, 12).includes(x))];
  for (const { s, d } of shown) out.push(`| ${s.id} | ${s.part ? '부품' : '카드'} | ${s.off} | ${pct(s.take / s.off)} | ${s.runs} | ${s.runs ? pct(s.wins / s.runs) : '—'} | ${s.runs ? `${d >= 0 ? '+' : ''}${Math.round(d * 100)}` : '—'} | ${tag(s)} |`);
  const flagged = list.filter((s) => tag(s));
  out.push('', `판정 붙은 것 ${flagged.length}개: ${flagged.map((s) => `${s.id}(${tag(s)})`).join(' · ') || '없음'}`, '');
}
// 4. 다시 볼 판 (D-468): 극단적인 대국을 화면에서 같은 조건으로 — ?debug 화면 콘솔에서 sliceApi.replay('코드')
const ex = rows.flatMap((r) => (r.ex ?? []).map((e) => ({ ...e, s: r.s, a: r.a, seed: r.seed })));
if (ex.length) {
  const by = new Map();
  for (const e of ex) by.set(e.why.replace(/\d+기/, 'N기'), (by.get(e.why.replace(/\d+기/, 'N기')) ?? 0) + 1);
  out.push('## 4. 다시 볼 판', '', `극단적인 대국 ${ex.length}개 (${[...by].map(([k, n]) => `${k} ${n}`).join(' · ')}). 화면에서 보려면 \`?debug\` 주소의 콘솔에서 \`sliceApi.replay('코드')\` — 코드 전체는 \`${file}.replay.json\`.`, '', '| 봇 | 승급 | 출하 시드 | 막 | 대국 | 무엇 |', '|---|---|---|---|---|---|');
  for (const e of ex.slice(0, 20)) out.push(`| ${e.s} | ${e.a} | ${e.seed} | ${e.act} | ${e.title} | ${e.why} |`);
  writeFileSync(`${file}.replay.json`, JSON.stringify(ex, null, 1));
}
console.log(out.join('\n'));
