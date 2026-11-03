import { describe, expect, it } from 'vitest';
import { backlashOf, canPlay, liveIntents, cardMoves, cardPieces, chainMult, costOf, dangerSquares, endTurn, newSliceBattle, playCard, previewPlay, rewind, type SliceBattle } from '../src/slice/battle';
import { BOSS, COMMANDS, PUSH, SLICE, START_COMMANDS, type CommandId } from '../src/slice/cards';
import { playOut } from '../src/slice/bot';
import type { SlicePartId } from '../src/slice/parts';

const squad = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'P' as const }, { t: 'N' as const }, { t: 'B' as const }];
const mk = (parts: SlicePartId[] = [], hand?: CommandId[]): SliceBattle => {
  const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 11, { parts });
  if (hand) b.hand = [...hand];
  return b;
};
/** 처치가 나는 수 하나 (적 HP를 1로 낮춰서 찾는다) */
const killMove = (b: SliceBattle, i: number) => {
  for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 1;
  for (const p of cardPieces(b, i)) for (const to of cardMoves(b, i, p.id)) {
    const sim = previewPlay(b, i, p.id, to);
    if (sim && sim.removed.some((q) => q.side === 1) && sim.state.winner === null) return { p, to };
  }
  return null;
};

describe('빌드 축 · 부품 (D-144)', () => {
  it('여분 태엽: 태엽 +1 · 손패 −1', () => {
    const b = mk(['spare']);
    expect(b.ap).toBe(SLICE.ap + 1);
    expect(b.hand).toHaveLength(SLICE.hand - 1);
  });
  it('이중 테이프: 되감기 두 번', () => {
    const b = mk(['tape']);
    const r1 = rewind(b);
    expect(typeof r1).toBe('object');
    const r2 = rewind(r1 as SliceBattle);
    expect(typeof r2).toBe('object');
    expect(typeof rewind(r2 as SliceBattle)).toBe('string');
  });
  it('증폭 코일: 처치마다 ×1.5, 최대 ×16 — 기본 연쇄는 합 (D-205)', async () => {
    const { chainAdd } = await import('../src/slice/battle');
    expect(chainMult(6, ['coil'])).toBeCloseTo(Math.min(16, 1.5 ** 6));
    expect(chainMult(6)).toBe(1);
    expect(chainAdd(6)).toBe(SLICE.chainCap * SLICE.chainAddPerKill);
    expect(chainAdd(6, ['coil'])).toBe(0);
  });
  it('행진 북: 폰 카드 태엽 −1', () => {
    const b = mk(['drum'], ['advance', 'march', 'leap']);
    expect(costOf(b, 0)).toBe(0);
    expect(costOf(b, 1)).toBe(0);
    expect(costOf(b, 2)).toBe(1);
  });
  it('편자: 나이트가 처치하면 태엽 +1 · 재도약은 처치한 나이트면 0', () => {
    const b = mk(['horseshoe'], ['leap', 'rebound', 'rebound']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    const ap0 = b.ap;
    const r = playCard(b, 0, m!.p.id, m!.to);
    expect(typeof r).toBe('object');
    // 편자 +1 · 처치 환급 +1 (D-203)
    expect(b.ap).toBe(ap0 - 1 + 1 + 1);
    expect(costOf(b, 0, m!.p.id)).toBe(0);
  });
  it('자석 손: 처치하면 카드 한 장', () => {
    const b = mk(['magnet'], ['leap', 'advance', 'advance']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    playCard(b, 0, m!.p.id, m!.to);
    expect(b.hand).toHaveLength(3); // 3 − 1 + 1
  });
  it('행진: 폰 모두 한 칸 앞으로', () => {
    const b = mk([], ['march']);
    const pawns = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').map((p) => ({ id: p.id, y: p.y }));
    expect(canPlay(b, 0)).toBe(true);
    playCard(b, 0);
    for (const q of pawns) expect(b.s.pieces.find((p) => p.id === q.id)!.y).toBe(q.y + 1);
  });
  it('징집: 킹 옆에 폰 · 조립 라인: 폰이 둘 이하면 턴 시작에 하나', () => {
    const b = mk(['assembly'], ['draft']);
    const n0 = b.s.pieces.filter((p) => p.side === 0).length;
    playCard(b, 0);
    expect(b.s.pieces.filter((p) => p.side === 0).length).toBe(n0 + 1);
    // 폰을 다 치우면 다음 턴 시작에 하나 나온다
    b.s.pieces = b.s.pieces.filter((p) => !(p.side === 0 && p.type === 'P'));
    b.intents = [];
    endTurn(b, true);
    expect(b.s.pieces.filter((p) => p.side === 0 && p.type === 'P')).toHaveLength(1);
  });
  it('불씨: 처치 없이 연쇄 +1', () => {
    const b = mk([], ['spark', 'advance']);
    playCard(b, 0);
    expect(b.kills).toBe(1);
    expect(b.ap).toBe(SLICE.ap);
  });
  it('무거운 왕관 · 분노한 왕: 킹 공격이 세진다', () => {
    const plain = mk([], ['kingStep']);
    const crown = mk(['crown'], ['kingStep']);
    const k = plain.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    const tos = cardMoves(plain, 0, k.id);
    expect(tos.length).toBeGreaterThan(0);
    // 같은 칸에 적 폰을 붙여 두고 피해를 비교한다
    for (const b of [plain, crown]) {
      const e = b.s.pieces.find((p) => p.side === 1 && p.type === 'P')!;
      const to = tos[0];
      e.x = to.x;
      e.y = to.y + 1;
      e.hp = e.maxHp = 999;
    }
    const dmg = (b: SliceBattle) => previewPlay(b, 0, k.id, tos[0])!.events.flatMap((e) => (e.type === 'attack' ? e.hits : [])).reduce((a, h) => a + h.damage, 0);
    expect(dmg(crown)).toBeGreaterThan(dmg(plain) * 1.8);
  });
});

describe('3단 성장 · 교차 브릿지 (D-145)', () => {
  it('증폭 코일은 곱해진다 (×1.5씩) · 기본은 더한다 (+4씩, D-205)', async () => {
    const { chainAdd } = await import('../src/slice/battle');
    expect(chainMult(4, ['coil'])).toBeCloseTo(1.5 ** 4);
    expect(chainAdd(4)).toBe(16);
  });
  it('이중 톱니: 처치 하나가 연쇄 두 칸', () => {
    const b = mk(['echo'], ['leap', 'advance']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    playCard(b, 0, m!.p.id, m!.to);
    expect(b.kills % 2).toBe(0);
    expect(b.kills).toBeGreaterThanOrEqual(2);
  });
  it('희생 수: 폰 하나를 부수고 연쇄 +3 (D-217 4)', () => {
    const b = mk([], ['gambit', 'advance']);
    const n0 = b.s.pieces.filter((p) => p.side === 0 && p.type === 'P').length;
    playCard(b, 0);
    expect(b.kills).toBe(3);
    expect(b.s.pieces.filter((p) => p.side === 0 && p.type === 'P')).toHaveLength(n0 - 1);
  });
  it('넘친 피해가 쌓인다', () => {
    const b = mk(['coil'], ['leap', 'advance']);
    const m = killMove(b, 0);
    playCard(b, 0, m!.p.id, m!.to);
    expect(b.overkill).toBeGreaterThan(0);
  });
});

describe('반장 규칙 (D-148)', () => {
  it('철갑: 반장 킹은 2턴마다 방열판을 다시 두른다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P'], START_COMMANDS, 5, { boss: true });
    const k = () => b.s.pieces.find((p) => p.side === 1 && p.type === 'K')!;
    expect(k().shield).toBe(BOSS.plate);
    k().shield = 0;
    for (let t = 0; t < BOSS.plateEvery; t++) {
      b.intents = [];
      endTurn(b, true);
    }
    expect(k().shield).toBe(BOSS.plate);
  });
  it('줄 폭격: 1턴은 쉬고 2턴에 예고하며 (D-214), 턴을 끝내면 그 줄의 내 기물이 맞는다', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P'], START_COMMANDS, 5, { boss: true });
    expect(b.bombRow).toBeNull();
    b.intents = [];
    endTurn(b, true);
    expect(b.bombRow).not.toBeNull();
    const row = b.bombRow!;
    const inRow = b.s.pieces.filter((p) => p.side === 0 && p.y === row).map((p) => ({ id: p.id, hp: p.hp }));
    expect(inRow.length).toBeGreaterThan(0);
    expect(dangerSquares(b).filter((q) => q.y === row)).toHaveLength(b.s.width);
    b.intents = [];
    endTurn(b, true);
    // 다음 턴(3턴)은 쉰다 — 두 턴마다
    expect(b.bombRow).toBeNull();
    for (const q of inRow) {
      const p = b.s.pieces.find((x) => x.id === q.id);
      if (p) expect(p.hp).toBeLessThan(q.hp);
    }
  });
});

describe('첫 10분 (D-150)', () => {
  it('입문 판: 4×4, 손으로 옮긴 적 폰 — 첫 손패의 폰 · 비숍 카드가 바로 친다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'B' }], ['K', 'P'], ['advance', 'diagonal', 'kingStep'], 1, { width: 4, height: 4, enemyKingHp: 0.35, place: [{ side: 1, t: 'P', x: 2, y: 3 }] });
    b.hand = ['advance', 'diagonal', 'kingStep'];
    const hits = (i: number) => cardPieces(b, i).some((p) => cardMoves(b, i, p.id).some((to) => previewPlay(b, i, p.id, to)!.events.some((e) => e.type === 'attack' && e.hits.length > 0)));
    expect(hits(0)).toBe(true);
    expect(hits(1)).toBe(true);
  });
});

describe('애착 (D-153)', () => {
  it('분대원은 시리얼 · 이름 · 기벽을 갖고, 기벽이 최대 HP를 바꾼다', async () => {
    const { makeCrew, QUIRKS } = await import('../src/slice/crew');
    const { Rng } = await import('../src/engine/rng');
    const c = makeCrew('P', new Rng(3));
    expect(c.serial).toMatch(/^#P-\d{3}$/);
    expect(c.name).toBeTruthy();
    expect(c.quirk).toBeTruthy();
    const b = newSliceBattle([{ t: 'K' }, { ...c, quirk: 'overwound' }], ['K', 'P'], START_COMMANDS, 3);
    const p = b.s.pieces.find((q) => q.id === b.squadIds[1])!;
    expect(p.maxHp).toBe(Math.round(25 * QUIRKS.overwound.hp!));
  });
  it('죽음의 문턱 (D-217): 기본은 없다 · 고집 센 축 2 · 영구 문턱은 그 분대원만 · 맹세는 폰마다 1', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N', quirk: 'stubborn' }, { t: 'B', doors: 1 }], ['K', 'P'], START_COMMANDS, 3);
    const [, pid, nid, bid] = b.squadIds;
    expect(b.s.doorIds?.filter((x) => x === pid) ?? []).toHaveLength(0);
    expect(b.s.doorIds!.filter((x) => x === nid)).toHaveLength(2);
    expect(b.s.doorIds!.filter((x) => x === bid)).toHaveLength(1);
    const o = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'B' }], ['K', 'P'], START_COMMANDS, 3, { parts: ['oath'] });
    expect(o.s.doorIds!.filter((x) => x === o.squadIds[1])).toHaveLength(1);
    expect(o.s.doorIds?.filter((x) => x === o.squadIds[2]) ?? []).toHaveLength(0);
  });
  it('대국 뒤 성장: 처치가 쌓이고 3대국이면 용접 흉터 · 5처치면 별명', async () => {
    const { growCrew } = await import('../src/slice/battle');
    const b = newSliceBattle([{ t: 'K' }, { t: 'N' }], ['K', 'P'], START_COMMANDS, 3);
    const nid = b.squadIds[1];
    b.pk[nid] = { P: 5 };
    const c = growCrew(b, { t: 'N', name: '톱니', battles: 2, kills: 0 }, nid, 20);
    expect(c.kills).toBe(5);
    expect(c.scars).toContain('용접 흉터');
    expect(c.nick).toBe('폰 분쇄기');
  });
});

describe('밀치기 (D-154)', () => {
  /** 4×4: 내 폰 (1,1) → 전진 (1,2), 적 폰을 (2,3)에 두면 대각 앞을 친다 → 위쪽은 벽 */
  const setup = (parts: SlicePartId[] = []) => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], ['shieldBash'], 1, { width: 4, height: 4, parts, place: [{ side: 1, t: 'P', x: 2, y: 3 }] });
    b.hand = ['shieldBash'];
    const p = b.s.pieces.find((q) => q.side === 0 && q.type === 'P')!;
    const e = b.s.pieces.find((q) => q.side === 1 && q.type === 'P')!;
    e.hp = e.maxHp = 200;
    return { b, p, e };
  };
  it('벽에 막히면 충돌 피해 (미리보기와 실행이 같다)', () => {
    const { b, p, e } = setup();
    const sim = previewPlay(b, 0, p.id, { x: 1, y: 2 })!;
    const bump = sim.events.find((x) => x.type === 'blast');
    expect(bump).toBeTruthy();
    const hp0 = e.hp;
    playCard(b, 0, p.id, { x: 1, y: 2 });
    const after = b.s.pieces.find((q) => q.id === e.id)!;
    const atk = sim.events.flatMap((x) => (x.type === 'attack' ? x.hits : [])).find((h) => h.targetId === e.id)!.damage;
    expect(after.hp).toBe(hp0 - atk - PUSH.collide);
  });
  it('쇠망치: 충돌 피해 ×2', () => {
    const { b, p, e } = setup(['hammer']);
    const sim = previewPlay(b, 0, p.id, { x: 1, y: 2 })!;
    const blast = sim.events.find((x) => x.type === 'blast') as { hits: { targetId: number; damage: number }[] };
    expect(blast.hits.find((h) => h.targetId === e.id)!.damage).toBe(PUSH.collide * 2);
  });
});

describe('분대에 없는 기물의 카드 (D-164)', () => {
  it('덱에서 걸러 넣으면 손패에 그 기물의 카드가 없다', () => {
    const deck: CommandId[] = ['advance', 'advance', 'leap', 'leap', 'rookLine', 'diagonal', 'order'];
    const squadPB = [{ t: 'K' as const }, { t: 'P' as const }, { t: 'B' as const }];
    const usable = (id: CommandId) => COMMANDS[id].who === 'any' || squadPB.some((u) => u.t === COMMANDS[id].who);
    const b = newSliceBattle(squadPB, ['K', 'P'], deck.filter(usable), 3);
    for (const id of [...b.hand, ...b.draw]) expect(usable(id)).toBe(true);
  });
});

describe('볼륨 — 카드 40 · 부품 24 (D-172)', () => {
  it('수량', async () => {
    const { REWARD_COMMANDS } = await import('../src/slice/cards');
    const { SLICE_PARTS } = await import('../src/slice/parts');
    expect(Object.keys(COMMANDS).filter((k) => !k.endsWith('+')).length).toBe(49); // + 빌드 다양성 6 (D-217 4)
    expect(REWARD_COMMANDS.length).toBe(43); // + 연쇄 소모 3 (D-203) · 빌드 다양성 6 (D-217 4)
    expect(Object.keys(SLICE_PARTS).length).toBe(29); // + 닳은 숫돌 (D-205) · 작은 개척자의 맹세 (D-217)
  });
  it('양날: 깨지는 유리 심장(태엽 +1 · 최대 HP −20%) · 탐욕의 저울(적 HP +20%) · 피의 계약(턴 끝 킹 −4)', () => {
    const b = mk(['brittle']);
    expect(b.apMax).toBe(SLICE.ap + 1);
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    expect(k.maxHp).toBe(Math.round(100 * 0.8));
    const g = mk(['greed']);
    expect(g.s.pieces.find((p) => p.side === 1 && p.type === 'P')!.maxHp).toBe(Math.round(25 * 1.2));
    const bp = mk(['bloodPact']);
    const kb = bp.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    bp.intents = [];
    endTurn(bp, true);
    expect(bp.s.pieces.find((p) => p.id === kb.id)!.hp).toBe(kb.maxHp - 4);
  });
  it('녹슨 등자: 나이트 카드 태엽 −1 · 녹슨 홀: 킹 방열판 25 · 막사의 종: 폰 +1', () => {
    const b = mk(['spurs', 'scepter', 'barracks'], ['leap', 'knightRaid']);
    expect(costOf(b, 0)).toBe(0);
    expect(costOf(b, 1)).toBe(1);
    expect(b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!.shield).toBe(25);
    expect(b.s.pieces.filter((p) => p.side === 0 && p.type === 'P')).toHaveLength(3);
  });
  it('전도 코일: 연쇄 처치마다 +7 (합, D-205)', async () => {
    const { chainAdd } = await import('../src/slice/battle');
    expect(chainAdd(2, ['conductor'])).toBe(14);
  });
});

describe('돌아오는 피해 미리보기 · 자동 플레이 봇 (D-173)', () => {
  it('자폭 폰: 처치하는 수의 미리보기 = 실제로 받는 자폭 피해', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 11, { traits: ['blastPawn'] });
    for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 1;
    let found = false;
    for (let i = 0; i < b.hand.length && !found; i++)
      for (const p of cardPieces(b, i)) {
        for (const to of cardMoves(b, i, p.id)) {
          const sim = previewPlay(b, i, p.id, to);
          if (!sim || !sim.removed.some((q) => q.side === 1 && q.type === 'P') || sim.state.winner !== null) continue;
          const pre = backlashOf(b, sim);
          const hp0 = b.s.pieces.filter((q) => q.side === 0).reduce((a, q) => a + q.hp + q.shield, 0);
          const sim0 = sim.state.pieces.filter((q) => q.side === 0).reduce((a, q) => a + q.hp + q.shield, 0);
          playCard(b, i, p.id, to);
          const hp1 = b.s.pieces.filter((q) => q.side === 0).reduce((a, q) => a + q.hp + q.shield, 0);
          expect(sim0 - hp1).toBe(pre);
          expect(hp0).toBeGreaterThanOrEqual(hp1);
          found = true;
          break;
        }
        if (found) break;
      }
    expect(found).toBe(true);
  });
  it('봇: 1막 대국을 끝까지 둔다 (막히지 않는다)', () => {
    const b = newSliceBattle(squad, ['K', 'P', 'P', 'N'], START_COMMANDS, 5, { enemyKingHp: 0.6 });
    const r = playOut(b);
    expect(b.s.winner).not.toBeNull();
    expect(r.plays).toBeGreaterThan(0);
  });
});

describe('막힌 적 예고 (D-176)', () => {
  it('예고한 칸을 막으면 그 적은 쉬지 않고 다른 수를 둔다 — 화면 예고 = 실행', () => {
    let checked = 0;
    // 적 구성 몇 가지 (D-201: 맞을 칸을 꺼리는 AI라 구성에 따라 막혔을 때 다른 수가 없을 수 있다)
    const rosters: ('K' | 'P' | 'N' | 'B' | 'R')[][] = [['K', 'P', 'P', 'N'], ['K', 'N', 'B'], ['K', 'R', 'N'], ['K', 'B', 'B']];
    for (let seed = 1; seed < 40 * rosters.length && checked < 3; seed++) {
      const b0 = newSliceBattle(squad, rosters[seed % rosters.length], START_COMMANDS, seed);
      // 막혀도 갈 곳이 있는 적(폰이 아닌 것)의 예고를 고른다 (D-201: 적 AI가 바뀌어 첫 예고가 폰일 수 있다)
      const it = b0.intents.find((x) => !b0.s.pieces.some((p) => p.x === x.to.x && p.y === x.to.y) && b0.s.pieces.find((p) => p.id === x.pieceId)?.type !== 'P');
      if (!it) continue;
      const b = b0;
      const mine = b.s.pieces.find((p) => p.side === 0 && p.type === 'P');
      if (!mine) continue;
      Object.assign(mine, { x: it.to.x, y: it.to.y });
      const live = liveIntents(b).find((x) => x.pieceId === it.pieceId);
      if (!live) continue;
      expect(live.to).not.toEqual(it.to);
      const before = { ...b.s.pieces.find((p) => p.id === it.pieceId)! };
      endTurn(b, true);
      const after = b.s.pieces.find((p) => p.id === it.pieceId);
      if (after) expect({ x: after.x, y: after.y }).not.toEqual({ x: before.x, y: before.y });
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('배율 쓰기 (D-203)', () => {
  it('처치 환급: 처치마다 태엽 +1, 턴당 2까지', async () => {
    const { SLICE } = await import('../src/slice/cards');
    const b = mk([], ['leap', 'advance', 'advance']);
    const m = killMove(b, 0);
    expect(m).not.toBeNull();
    const ap0 = b.ap;
    playCard(b, 0, m!.p.id, m!.to);
    expect(b.ap).toBe(ap0 - 1 + 1);
    expect(b.refunded).toBeLessThanOrEqual(SLICE.refundCap);
  });
  it('연쇄 소모: 연쇄 0이면 못 내고, 내면 연쇄가 비며 효과가 연쇄만큼', () => {
    const b = mk([], ['vent', 'recall', 'burst']);
    expect(canPlay(b, 0)).toBe(false);
    b.kills = 2;
    const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K')!;
    const sh0 = k.shield;
    expect(typeof playCard(b, 0)).toBe('object');
    expect(k.shield).toBe(sh0 + 28);
    expect(b.kills).toBe(0);
    b.kills = 3;
    const foes = b.s.pieces.filter((p) => p.side === 1).map((p) => ({ id: p.id, hp: p.hp + p.shield }));
    const i = b.hand.indexOf('burst');
    expect(typeof playCard(b, i)).toBe('object');
    for (const f of foes) {
      const p = b.s.pieces.find((x) => x.id === f.id);
      if (p) expect(p.hp + p.shield).toBe(f.hp - 27);
    }
  });
});
