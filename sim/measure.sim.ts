import { it } from 'vitest';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { simulateRun, type RunResult, type RunStyle } from '../src/sim/runbot';
import { COMMANDS, gradeOf, REWARD_COMMANDS, type CommandId } from '../src/slice/cards';
import { PART_GRADE, SLICE_PARTS, type SlicePartId } from '../src/slice/parts';

/**
 * 측정 도구 (대과제 3 앞부분, D-280) — 조정하지 않고 잰다. `npm run sim -- measure` (환경 변수로 고른다)
 *  MM=asc    승급 곡선: 승급 0 · 3 · 6 · 9 · 13 × 봇 3등급(naive · greedy · search) — 완주율 · 평균 도달 막 · 반장별 승률
 *  MM=power  아이템 힘 값: 카드(2장) · 부품(1개)을 시작부터 넣은 출하 vs 넣지 않은 출하 (같은 씨앗) — 진행(이긴 대국 수) 차
 *  MM=combo  깨지는 조합: 부품 둘을 함께 넣었을 때 진행 차가 둘 따로의 합보다 크게 튀는 쌍
 *  MM=merge  위 결과(sim/measure-*.json)를 모아 보고서 docs/reports/<날짜>-measure.md + 기준선 sim/measure-baseline.json
 * 병렬: MS=k/n 으로 항목을 나눠 프로세스 여러 개로 돌린다 (결과 파일에 조각 번호가 붙는다). MN = 출하 수.
 */
const MODE = process.env.MM ?? 'asc';
const N = Number(process.env.MN ?? 40);
const [SK, SN] = (process.env.MS ?? '0/1').split('/').map(Number);
const DATE = process.env.MD ?? new Date().toISOString().slice(0, 10);
const seeds = (n: number, base = 31000) => Array.from({ length: n }, (_, k) => base + k * 7919);
const shard = <T>(xs: T[]): T[] => xs.filter((_, i) => i % SN === SK);
/** 진행 = 이긴 대국 수 (1패 = 출하 끝이라 진행이 곧 얼마나 갔나) */
const progress = (r: RunResult) => r.battles - (r.cleared ? 0 : 1);
const summarize = (rs: RunResult[]) => ({
  clear: +((rs.filter((r) => r.cleared).length / rs.length) * 100).toFixed(1),
  act: +(rs.reduce((a, r) => a + r.act, 0) / rs.length).toFixed(2),
  prog: +(rs.reduce((a, r) => a + progress(r), 0) / rs.length).toFixed(2),
});
const write = (name: string, data: unknown) => writeFileSync(`sim/measure-${name}${SN > 1 ? `-${SK}` : ''}.json`, JSON.stringify(data));

it('측정', () => {
  if (MODE === 'asc') {
    const rows: { asc: number; style: RunStyle; clear: number; act: number; prog: number; boss: Record<string, [number, number]> }[] = [];
    const levels = [0, 3, 6, 9, 13];
    for (const asc of shard(levels))
      for (const style of ['naive', 'greedy', 'search'] as RunStyle[]) {
        const n = style === 'search' ? Math.max(6, Math.round(N / 4)) : N;
        const rs = seeds(n).map((s) => simulateRun(s, { asc, style }));
        const boss: Record<string, [number, number]> = {};
        for (const r of rs) for (const b of r.bosses) { boss[b.rule] ??= [0, 0]; boss[b.rule][0] += +b.won; boss[b.rule][1] += 1; }
        rows.push({ asc, style, ...summarize(rs), boss });
        console.log(`승급 ${asc} · ${style}: 완주 ${rows.at(-1)!.clear}% · 막 ${rows.at(-1)!.act} · 진행 ${rows.at(-1)!.prog}`);
      }
    write('asc', rows);
  }
  if (MODE === 'power') {
    const ss = seeds(N, 52000);
    const base = summarize(ss.map((s) => simulateRun(s)));
    const items: ({ kind: 'card'; id: CommandId } | { kind: 'part'; id: SlicePartId })[] = [
      ...REWARD_COMMANDS.map((id) => ({ kind: 'card' as const, id })),
      ...(Object.keys(SLICE_PARTS) as SlicePartId[]).map((id) => ({ kind: 'part' as const, id })),
    ];
    const rows = shard(items).map((it0) => {
      const rs = ss.map((s) => simulateRun(s, it0.kind === 'card' ? { forceCards: [it0.id, it0.id] } : { forceParts: [it0.id] }));
      const m = summarize(rs);
      const name = it0.kind === 'card' ? COMMANDS[it0.id].name : SLICE_PARTS[it0.id].name;
      const grade = it0.kind === 'card' ? gradeOf(it0.id) : PART_GRADE[it0.id] ?? 'common';
      const row = { kind: it0.kind, id: it0.id, name, grade, axis: it0.kind === 'card' ? COMMANDS[it0.id].axis ?? '-' : SLICE_PARTS[it0.id].axis ?? '-', dProg: +(m.prog - base.prog).toFixed(2), dClear: +(m.clear - base.clear).toFixed(1) };
      console.log(`${row.kind} ${row.name} (${row.grade}): 진행 ${row.dProg >= 0 ? '+' : ''}${row.dProg} · 완주 ${row.dClear >= 0 ? '+' : ''}${row.dClear}%p`);
      return row;
    });
    write('power', { base, rows });
  }
  if (MODE === 'combo') {
    const ss = seeds(N, 73000);
    const ids = Object.keys(SLICE_PARTS) as SlicePartId[];
    const prog = (parts: SlicePartId[]) => summarize(ss.map((s) => simulateRun(s, { forceParts: parts }))).prog;
    const base = prog([]);
    const single = new Map<string, number>();
    const one = (id: SlicePartId) => single.get(id) ?? (single.set(id, prog([id]) - base), single.get(id)!);
    // 같은 축끼리는 모두, 다른 축은 고르게 섞어 쌍을 고른다 (모든 쌍 406개는 너무 많다 — 걸러 낸 수를 적는다)
    const pairs: [SlicePartId, SlicePartId][] = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (SLICE_PARTS[ids[i]].axis && SLICE_PARTS[ids[i]].axis === SLICE_PARTS[ids[j]].axis || (i * 7 + j) % 9 === 0) pairs.push([ids[i], ids[j]]);
    const rows = shard(pairs).map(([a, b]) => {
      const both = prog([a, b]) - base;
      const sum = one(a) + one(b);
      return { a, b, both: +both.toFixed(2), sum: +sum.toFixed(2), extra: +(both - sum).toFixed(2) };
    });
    write('combo', { base, tried: pairs.length, of: (ids.length * (ids.length - 1)) / 2, rows });
  }
  if (MODE === 'merge') {
    const load = (name: string) => readdirSync('sim').filter((f) => f.startsWith(`measure-${name}`) && f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`sim/${f}`, 'utf8')));
    const asc = load('asc').flat() as { asc: number; style: string; clear: number; act: number; prog: number; boss: Record<string, [number, number]> }[];
    const powerParts = load('power') as { base: { prog: number; clear: number }; rows: { kind: string; id: string; name: string; grade: string; axis: string; dProg: number; dClear: number }[] }[];
    const power = powerParts.flatMap((p) => p.rows);
    const comboParts = load('combo') as { tried: number; of: number; rows: { a: string; b: string; both: number; sum: number; extra: number }[] }[];
    const combo = comboParts.flatMap((c) => c.rows);
    const L: string[] = [`# 측정 보고 — ${DATE} (D-280, 조정 없이 잰 값)`, '', '> `npm run sim -- measure` (MM=asc · power · combo · merge). 봇은 「평균 플레이어」 정책(sim/economy와 같음). 수치 조정은 하지 않았다 — 확장 단계에서는 이상치만 본다.', ''];
    if (asc.length) {
      L.push('## 1. 승급 곡선 — 완주율 % · 평균 도달 막 · 진행(이긴 대국)', '', '| 승급 | 무뇌 | 보통 | 두뇌 |', '| :-: | :-- | :-- | :-- |');
      for (const lv of [...new Set(asc.map((r) => r.asc))].sort((a, b) => a - b)) {
        const cell = (st: string) => { const r = asc.find((x) => x.asc === lv && x.style === st); return r ? `${r.clear}% · ${r.act}막 · ${r.prog}` : '—'; };
        L.push(`| ${lv} | ${cell('naive')} | ${cell('greedy')} | ${cell('search')} |`);
      }
      const boss: Record<string, [number, number]> = {};
      for (const r of asc.filter((x) => x.style === 'greedy')) for (const [k, [w, n]] of Object.entries(r.boss)) { boss[k] ??= [0, 0]; boss[k][0] += w; boss[k][1] += n; }
      L.push('', '## 2. 반장별 승률 (보통 봇, 모든 승급 합산 — 그 반장까지 간 판만)', '', '| 반장 | 승률 | 만난 수 |', '| :-- | :-: | :-: |');
      for (const [k, [w, n]] of Object.entries(boss).sort()) L.push(`| ${k} | ${((w / n) * 100).toFixed(0)}% | ${n} |`);
    }
    if (power.length) {
      const base = powerParts[0].base;
      const sorted = [...power].sort((a, b) => b.dProg - a.dProg);
      const mean = power.reduce((a, r) => a + r.dProg, 0) / power.length;
      const sd = Math.sqrt(power.reduce((a, r) => a + (r.dProg - mean) ** 2, 0) / power.length);
      L.push('', `## 3. 아이템 힘 값 — 시작부터 넣었을 때 진행 차 (기준 진행 ${base.prog} · 완주 ${base.clear}%)`, '', `평균 ${mean.toFixed(2)} · 표준편차 ${sd.toFixed(2)}. **±2σ 밖 = 이상치**(⚠).`, '', '| 종류 | 이름 | 등급 | 축 | 진행 차 | 완주 차 |', '| :-- | :-- | :-- | :-- | :-: | :-: |');
      for (const r of sorted) L.push(`| ${r.kind === 'card' ? '카드' : '부품'} | ${r.name}${Math.abs(r.dProg - mean) > 2 * sd ? ' ⚠' : ''} | ${r.grade} | ${r.axis} | ${r.dProg >= 0 ? '+' : ''}${r.dProg} | ${r.dClear >= 0 ? '+' : ''}${r.dClear} |`);
    }
    if (combo.length) {
      const top = [...combo].sort((a, b) => b.extra - a.extra).slice(0, 10);
      L.push('', `## 4. 조합 이상치 — 부품 둘을 함께 넣은 진행 차 − 따로의 합 (쌍 ${comboParts.reduce((a, c) => a + c.rows.length, 0)}개 / 전체 ${comboParts[0].of}개를 같은 축 위주로 골랐다)`, '', '| 부품 A | 부품 B | 함께 | 따로 합 | 덤 |', '| :-- | :-- | :-: | :-: | :-: |');
      for (const r of top) L.push(`| ${SLICE_PARTS[r.a as SlicePartId]?.name ?? r.a} | ${SLICE_PARTS[r.b as SlicePartId]?.name ?? r.b} | ${r.both} | ${r.sum} | ${r.extra >= 0 ? '+' : ''}${r.extra} |`);
    }
    writeFileSync(`docs/reports/${DATE}-measure.md`, L.join('\n') + '\n');
    writeFileSync('sim/measure-baseline.json', JSON.stringify({ date: DATE, asc, power, combo: combo.slice(0, 50) }));
    console.log(L.join('\n'));
    if (!existsSync('docs/reports')) throw new Error('docs/reports 없음');
  }
});
