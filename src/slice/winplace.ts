import { CARD_WIN_PLACE } from '../data/hud';

/**
 * 펼친 카드 창 자리 (D-667 — D-621 「겨누는 중에는 창이 내 기물 줄을 덮는 일이 있다」를 고친다).
 * 판 열 안 후보 자리(왼끝 · 오른끝 × 위에서 아래까지 CARD_WIN_PLACE.step px마다 + 카드 줄 옆)마다 덮는 칸에 무게를 매겨 가장 가벼운 곳:
 * 고른 기물 · 갈 칸 · 맞을 적 = 단단(hard) · 내 기물 = mine · 그 밖 기물 = other. 단단한 칸을 덮지 않는 자리가 있으면 반드시 그중에서,
 * 없으면 가장 적게 덮는 곳. 같으면 카드 줄 옆(want)에 가까운 곳 · 왼끝.
 * 화면 계산만 한다 — 게임 상태는 건드리지 않는다(UI 원칙 9).
 */
export interface Box { left: number; top: number; right: number; bottom: number }
export interface WinMarks {
  /** 고른 기물 · 갈 칸 · 맞을 적 (칸 가운데, 화면 px) */
  hard: { x: number; y: number }[];
  /** 내 기물 */
  mine: { x: number; y: number }[];
  /** 그 밖 기물 */
  other: { x: number; y: number }[];
  /** 칸 반 변 (px) */
  half: number;
}

/** 창(w × h)이 놓일 왼위 자리 */
export const placeCardWin = (col: Box, w: number, h: number, wantTop: number, m: WinMarks): { left: number; top: number; cost: number } => {
  const gap = CARD_WIN_PLACE.gap;
  const lo = col.top + gap, hi = Math.max(lo, col.bottom - h - gap);
  const clampY = (y: number): number => Math.max(lo, Math.min(hi, y));
  const xs = [...new Set([col.left + gap, Math.max(col.left + gap, col.right - gap - w)].map(Math.round))];
  const ys = new Set<number>([clampY(wantTop), lo, hi].map(Math.round));
  for (let y = lo; y < hi; y += CARD_WIN_PLACE.step) ys.add(Math.round(y));
  // 칸 가장자리 1px씩 깎아 본다 — 창 테가 칸 모서리에 닿기만 한 것은 덮은 것이 아니다
  const k = Math.max(0, m.half - 1);
  const hits = (pts: { x: number; y: number }[], x: number, y: number): number =>
    pts.filter((c) => c.x + k > x && c.x - k < x + w && c.y + k > y && c.y - k < y + h).length;
  let best = { left: xs[0], top: clampY(wantTop), cost: Infinity };
  let bestTie = Infinity;
  for (const x of xs)
    for (const y of ys) {
      const cost = hits(m.hard, x, y) * CARD_WIN_PLACE.hard + hits(m.mine, x, y) * CARD_WIN_PLACE.mine + hits(m.other, x, y) * CARD_WIN_PLACE.other;
      const tie = Math.abs(y - wantTop) + (x === xs[0] ? 0 : CARD_WIN_PLACE.rightPenalty);
      if (cost < best.cost || (cost === best.cost && tie < bestTie)) {
        best = { left: x, top: y, cost };
        bestTie = tie;
      }
    }
  return best;
};
