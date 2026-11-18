import { describe, expect, it, vi } from 'vitest';
import { HEAVY_MS } from './heavy';

// 대국 · 시뮬레이션을 많이 돌린다 — 부하가 걸린 기기에서도 기본 5초에 걸리지 않게 (tests/heavy.ts)
vi.setConfig({ testTimeout: HEAVY_MS });
import { CHARM_NUM, startRevive } from '../src/slice/parts';
import { battleFor } from '../src/slice/run';
import { FOE, START_DECK } from '../src/slice/cards';
import { FOE_AI } from '../src/data/battle';
import { crewMaxHp, dangerSquares, endTurn, liveIntents, newSliceBattle, planEnemy, REST, spareSquad, type Squad } from '../src/slice/battle';
import { kingOf } from '../src/engine';
import { Rng } from '../src/engine/rng';

/** 난이도 패스 (D-542, 2026-11-17): 눈금 = 두뇌 봇 · 여벌 심장 · 적 수 · 협공 AI */
describe('여벌 심장 규칙 (D-542)', () => {
  it('첫째 왕관의 첫 출하에만 하나 — 다시 하는 첫째 왕관 · 둘째 왕관부터 · 도전은 없다', () => {
    expect(startRevive(0, true)).toBe(1);
    expect(startRevive(0, false)).toBe(0);
    for (let asc = 1; asc <= 13; asc++) {
      expect(startRevive(asc, true)).toBe(0);
      expect(startRevive(asc, false)).toBe(0);
    }
    expect(CHARM_NUM.startReviveUpTo).toBe(0);
  });
});

describe('여벌 심장으로 다시 서기 (D-542)', () => {
  it('진 대국의 상처 · 쓰러짐은 그대로 — 킹만 reviveHp로 일어선다', () => {
    const squad: Squad[] = [{ t: 'K' }, { t: 'P', name: '금 간 못', cracked: true }, { t: 'N', name: '먼지투성이' }, { t: 'R', name: '구부러진 못' }];
    const b = newSliceBattle(squad, ['K', 'P'], START_DECK, 3);
    const mine = (i: number) => b.s.pieces.find((p) => p.id === b.squadIds[i])!;
    mine(2).hp = 10; // 나이트는 다친 채
    const gone = [b.squadIds[0], b.squadIds[1]]; // 킹 · 금 간 폰이 쓰러졌다
    b.s.pieces = b.s.pieces.filter((p) => !gone.includes(p.id));
    const out = spareSquad(b, squad);
    const k = out.find((u) => u.t === 'K')!;
    expect(k.hp).toBe(Math.round(crewMaxHp(k) * REST.reviveHp));
    expect(out.find((u) => u.t === 'N')!.hp).toBe(10);
    expect(out.some((u) => u.name === '금 간 못')).toBe(false); // 두 번째 쓰러짐 = 폐기
    expect(out.find((u) => u.t === 'R')!.hp ?? crewMaxHp(out.find((u) => u.t === 'R')!)).toBe(crewMaxHp(out.find((u) => u.t === 'R')!));
    expect(out).toHaveLength(3);
  });
});

describe('적 수 (D-542)', () => {
  it('반장이 아닌 대국은 폰이 FOE.extraPawns만큼 더 · 반장은 그대로', () => {
    expect(FOE.extraPawns).toBeGreaterThan(0);
    const keep = FOE.extraPawns;
    try {
      for (let seed = 1; seed <= 12; seed++) {
        for (const kind of ['battle', 'check', 'boss'] as const) {
          // 1막 일반 대국은 이형 · 거대 주물이 없다 — 검문 · 반장은 이형이 편성을 바꿀 수 있어 수만 견준다
          FOE.extraPawns = 0;
          const off = battleFor(1, kind, new Rng(seed), 0);
          FOE.extraPawns = keep;
          const on = battleFor(1, kind, new Rng(seed), 0);
          const add = kind === 'boss' ? 0 : keep;
          if (kind === 'battle') expect(on.enemy.filter((t) => t === 'P').length).toBe(off.enemy.filter((t) => t === 'P').length + add);
          else if (kind === 'boss') expect(on.enemy).toEqual(off.enemy);
        }
      }
    } finally {
      FOE.extraPawns = keep;
    }
  });
  it('조항 4 「불어난 무리」(D-542: 옛 조항 5)는 도전 1부터 폰 하나를 더 쌓는다', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const a3 = battleFor(1, 'battle', new Rng(seed), 3), a4 = battleFor(1, 'battle', new Rng(seed), 4);
      expect(a4.enemy.filter((t) => t === 'P').length).toBe(a3.enemy.filter((t) => t === 'P').length + 1);
    }
  });
});

describe('협공 AI (D-542)', () => {
  const battles = (w = 6, h = 6) => {
    const out = [];
    for (let seed = 1; seed <= 30; seed++) {
      const d = battleFor(((seed % 3) + 1) as 1 | 2 | 3, 'battle', new Rng(seed), 0);
      out.push(newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }, { t: 'R' }] as never, d.enemy, START_DECK, seed, { enemyKingHp: d.kingHp, width: w, height: h, guard: d.guard }));
    }
    return out;
  };
  /** 예고된 공격 칸이 내 킹의 빈 이웃 칸을 몇 개 덮나 (적 차례 몇 번 동안 합) */
  const boxed = (): number => {
    let n = 0;
    for (const b of battles()) for (let t = 0; t < 3 && b.s.winner === null; t++) {
      const k = kingOf(b.s, 0);
      if (k) {
        const danger = dangerSquares(b);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if ((dx || dy) && !b.s.pieces.some((p) => p.x === k.x + dx && p.y === k.y + dy) && danger.some((q) => q.x === k.x + dx && q.y === k.y + dy)) n++;
        }
      }
      endTurn(b, true);
    }
    return n;
  };
  it('도망길 막기 무게가 켜지면 킹의 빈 이웃 칸을 더 덮는다', () => {
    const keep = FOE_AI.boxKing;
    try {
      FOE_AI.boxKing = 0;
      const off = boxed();
      FOE_AI.boxKing = keep;
      const on = boxed();
      expect(keep).toBeGreaterThan(0);
      expect(on).toBeGreaterThan(off);
    } finally {
      FOE_AI.boxKing = keep;
    }
  });
  it('결정론: 같은 판은 같은 예고', () => {
    const [a] = battles(), [b] = battles();
    expect(JSON.stringify(liveIntents(a))).toBe(JSON.stringify(liveIntents(b)));
  });
  it('적 한 차례 생각이 8×7 판에서 50ms 안', () => {
    const times: number[] = [];
    const all = battles(8, 7);
    planEnemy(all[0].s, false, 1); // 데우기 (JIT)
    for (const b of all.slice(0, 12)) {
      const t0 = performance.now();
      planEnemy(b.s, false, 1);
      liveIntents(b);
      times.push(performance.now() - t0);
    }
    // 중앙값 — 테스트 기계가 바쁠 때(다른 작업 · GC) 튀는 한두 판은 보지 않는다
    times.sort((x, y) => x - y);
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(50);
  });
});
