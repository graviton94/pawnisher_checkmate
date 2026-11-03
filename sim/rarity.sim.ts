import { it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { COMMANDS, CARD_GRADE, KITS, REWARD_COMMANDS, START_DECK, type CommandId } from '../src/slice/cards';
import { PART_GRADE, SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { makeCrew } from '../src/slice/crew';
import { battleFor } from '../src/slice/run';
import { depthAt, newSliceBattle, type Squad } from '../src/slice/battle';
import { playOut } from '../src/slice/bot';
import { writeFileSync } from 'node:fs';

/**
 * 등급 측정 (D-217 2, 사용자: "레어리티가 각자의 밸류에 맞게 측정된 건지 감이 안 온다").
 * 모든 기물(K P P N B R)을 가진 분대 + 시작 덱 + 기물 기본 카드로, 카드 하나를 2장 넣은 덱 vs 기본 카드 2장 넣은 덱을
 * 같은 판 · 같은 씨앗으로 N판씩 봇이 둔다. 가치 = 승률 차(%p) + 턴 단축 × 5. 부품도 같은 방식(넣은 것 vs 안 넣은 것).
 * 봇은 탐욕형이라 연쇄 소모처럼 순서를 타는 카드는 낮게 나올 수 있다 — 보고서에 함께 적는다.
 */
const N = Number(process.env.RN ?? 50);
const SQUAD_T = ['K', 'P', 'P', 'N', 'B', 'R'] as const;
const BASE: CommandId[] = [...(START_DECK as CommandId[]), 'leap', 'diagonal', 'rookLine', 'advance'];
const run = (deck: CommandId[], parts: SlicePartId[]) => {
  let w = 0, turns = 0;
  for (let i = 0; i < N; i++) {
    const rng = new Rng(500 + i * 31);
    const squad: Squad[] = SQUAD_T.map((t) => makeCrew(t, rng, []));
    const act = (i % 2) + 2 as 2 | 3;
    const def = battleFor(act, i % 5 === 4 ? 'check' : 'battle', new Rng(900 + i));
    const b = newSliceBattle(squad, def.enemy, deck, 7000 + i, { enemyKingHp: def.kingHp, enemyHp: def.enemyHp, traits: def.traits, parts, depth: depthAt(act - 1, 0.5) });
    const r = playOut(b, 30);
    w += +r.won; turns += r.won ? r.turns : 30;
  }
  return { win: (w / N) * 100, turns: turns / N };
};
it('등급 측정', () => {
  const base = run([...BASE, 'advance', 'advance'], []);
  const rows: { id: string; kind: 'card' | 'part'; name: string; grade: string; win: number; turns: number; value: number }[] = [];
  for (const id of REWARD_COMMANDS) {
    const r = run([...BASE, id, id], []);
    rows.push({ id, kind: 'card', name: COMMANDS[id].name, grade: CARD_GRADE[id] ?? 'common', win: r.win - base.win, turns: base.turns - r.turns, value: r.win - base.win + (base.turns - r.turns) * 5 });
  }
  const pbase = run([...BASE, 'advance', 'advance'], []);
  for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) {
    // 부품은 같은 축 카드 둘과 함께 (축이 없으면 기본 카드) — 시너지까지 잰다. 비교 기준은 그 카드만 넣은 덱
    const ax = SLICE_PARTS[id].axis;
    const kit = KITS.find((k) => k.part === id)?.cards ?? (ax ? REWARD_COMMANDS.filter((c) => COMMANDS[c].axis === ax).slice(0, 2) : ['advance', 'advance']) as CommandId[];
    const without = run([...BASE, ...kit], []);
    const r = run([...BASE, ...kit], [id]);
    rows.push({ id, kind: 'part', name: SLICE_PARTS[id].name, grade: PART_GRADE[id] ?? 'common', win: r.win - without.win, turns: without.turns - r.turns, value: r.win - without.win + (without.turns - r.turns) * 5 });
  }
  rows.sort((a, b) => b.value - a.value);
  console.log(`기준 승률 ${base.win.toFixed(0)}% · 턴 ${base.turns.toFixed(1)}`);
  for (const r of rows) console.log(`${r.kind}\t${r.id}\t${r.name}\t${r.grade}\t승률 ${r.win.toFixed(0)}\t턴 ${r.turns.toFixed(2)}\t가치 ${r.value.toFixed(1)}`);
  writeFileSync('sim/rarity-result.json', JSON.stringify({ base, rows }, null, 1));
});
