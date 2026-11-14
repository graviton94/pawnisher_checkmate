import { describe, expect, it } from 'vitest';
import { findPiece } from '../src/engine';
import { endTurn, newSliceBattle, playCard, rewind } from '../src/slice/battle';
import { playOut } from '../src/slice/bot';
import { START_COMMANDS } from '../src/slice/cards';

/** 판돈 조건 재료 (피드백 #12 · D-503): 킹 피격 · 한 턴 최다 처치 · 되감은 횟수 — 엔진이 센다 */
describe('판돈 조건 기록', () => {
  it('한 턴 처치 수를 세고, 턴이 넘어가도 최다는 남는다', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'N' }], ['K', 'P', 'P'], [], 11, { width: 6, height: 6 });
    const [king, knight] = b.squadIds;
    const [foeK, p1, p2] = b.s.pieces.filter((p) => p.side === 1).sort((a, z) => Number(z.type === 'K') - Number(a.type === 'K'));
    Object.assign(findPiece(b.s, king)!, { x: 0, y: 0 });
    Object.assign(findPiece(b.s, knight)!, { x: 2, y: 2 });
    Object.assign(foeK, { x: 0, y: 5 });
    // (2,2) → (4,3)에 내려앉으면 (5,5) · (5,1)을 함께 친다
    Object.assign(p1, { x: 5, y: 5, hp: 1, maxHp: 1, shield: 0 });
    Object.assign(p2, { x: 5, y: 1, hp: 1, maxHp: 1, shield: 0 });
    b.intents = []; b.ap = 3; b.hand = ['leap'];
    const r = playCard(b, 0, knight, { x: 4, y: 3 });
    expect(typeof r).not.toBe('string');
    expect(b.turnKills).toBe(2);
    expect(b.bestTurnKills).toBe(2);
    endTurn(b, true);
    expect(b.turnKills).toBe(0);
    expect(b.bestTurnKills).toBe(2);
  });

  it('되감기는 쓴 횟수를 남긴다 (되감아도 지워지지 않는다)', () => {
    const b = newSliceBattle([{ t: 'K' }, { t: 'P' }], ['K', 'P'], START_COMMANDS, 3, { rewindCharms: 1 });
    expect(b.rewound ?? 0).toBe(0);
    const back = rewind(b);
    expect(typeof back).not.toBe('string');
    expect((back as typeof b).rewound).toBe(1);
  });

  it('킹 HP가 줄어든 대국은 늘 「킹이 맞았다」로 남는다', () => {
    let seen = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const b = newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }], ['K', 'P', 'P', 'N', 'R'], START_COMMANDS, seed);
      playOut(b, 12);
      const k = b.s.pieces.find((p) => p.side === 0 && p.type === 'K');
      if (!k || k.hp < k.maxHp) { seen += 1; expect(b.kingHit).toBe(true); }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
