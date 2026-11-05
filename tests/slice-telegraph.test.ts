import { describe, expect, it } from 'vitest';
import { cardMoves, cardPieces, endTurn, newSliceBattle, playCard, previewPlay } from '../src/slice/battle';
import { SLICE } from '../src/slice/cards';

/** 예고 읽기 보상 (D-229, 레퍼런스 보고서 제안 1 · 2) */
describe('회피 반격 · 헛방 경직', () => {
  const mk = () => newSliceBattle([{ t: 'K' }, { t: 'P' }, { t: 'N' }], ['K', 'P', 'P', 'N'], ['leap', 'leap', 'leap', 'advance', 'advance', 'leap', 'advance', 'leap', 'advance', 'leap'], 11);
  it('예고 칸 위의 기물이 예고 밖으로 빠지며 치면 그 수 ×1.5 · 카드 +1 (기물마다 한 번)', () => {
    const b = mk();
    const i = b.hand.findIndex((id) => id === 'leap');
    const n = cardPieces(b, i)[0];
    const to = cardMoves(b, i, n.id)[0];
    b.graze = [];
    b.grazeDanger = [];
    const plain = previewPlay(b, i, n.id, to)!;
    b.graze = [n.id];
    const boosted = previewPlay(b, i, n.id, to)!;
    const dmg = (r: typeof plain) => r.events.reduce((a, e) => a + (e.type === 'attack' ? e.hits.reduce((x, h) => x + h.damage, 0) : 0), 0);
    if (dmg(plain) > 0) expect(dmg(boosted)).toBeGreaterThan(dmg(plain));
    const hand0 = b.hand.length;
    expect(typeof playCard(b, i, n.id, to)).toBe('object');
    expect(b.hand.length).toBe(hand0 - 1 + SLICE.grazeDraw);
    expect(b.graze).not.toContain(n.id);
  });
  it('예고 칸으로 들어가는 수는 회피가 아니다', () => {
    const b = mk();
    const i = b.hand.findIndex((id) => id === 'leap');
    const n = cardPieces(b, i)[0];
    const to = cardMoves(b, i, n.id)[0];
    b.graze = [n.id];
    b.grazeDanger = [`${to.x},${to.y}`];
    const hand0 = b.hand.length;
    playCard(b, i, n.id, to);
    expect(b.hand.length).toBe(hand0 - 1);
  });
  it('겨눴던 적이 빈 땅을 치면 경직 — 다음 적 차례 예고에서 빠지고 방열판을 잃는다', () => {
    const b = mk();
    const foe = b.s.pieces.find((p) => p.side === 1 && p.type === 'P')!;
    foe.shield = 9;
    b.aimed = [foe.id];
    // 그 적의 예고를 지워 아무것도 못 치게 한다 (내 기물이 피한 것과 같다)
    b.intents = b.intents.filter((it) => it.pieceId !== foe.id);
    endTurn(b, true);
    if (b.s.winner === null) {
      expect(b.staggered).toContain(foe.id);
      expect(b.s.pieces.find((p) => p.id === foe.id)?.shield ?? 0).toBe(0);
      expect(b.intents.some((it) => it.pieceId === foe.id)).toBe(false);
    }
  });
});
