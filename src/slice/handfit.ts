/**
 * 손패 레일 보이기 계산 (D-596): 고른 카드가 레일 밖(위로 지나갔거나 「▼ N장 더」 띠 아래)에 있으면
 * 그 카드가 통째로 보이게 할 scrollTop을 낸다. DOM 없이 숫자만 — 화면(main.ts fitHand 뒤)이 읽은 치수를 넘긴다.
 */

/** 레일 안 카드 하나의 자리 (scroll 원점 기준 위 · 높이) */
export interface RailCard {
  top: number;
  height: number;
}

/**
 * 카드가 통째로 보이는 scrollTop. 이미 다 보이면 지금 값 그대로(손패 순서 · 위치를 흔들지 않는다).
 * reserve = 아래에 덮인 높이(「N장 더」 띠). 카드가 보이는 칸보다 크면 윗머리(이름 줄)를 맞춘다.
 */
export const revealScroll = (card: RailCard, scrollTop: number, viewH: number, reserve = 0, maxScroll = Infinity): number => {
  const win = Math.max(0, viewH - reserve);
  const bottom = card.top + card.height;
  let next = scrollTop;
  if (card.top < scrollTop || card.height > win) next = card.top;
  else if (bottom > scrollTop + win) next = bottom - win;
  return Math.max(0, Math.min(maxScroll, Math.round(next)));
};
