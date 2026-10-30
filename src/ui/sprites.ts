import type { PieceType, Side } from '../engine';

/** 사용자 제공 도트 기물 이미지 태그. small = 보드·목록용, large = 크게 보여 줄 곳 (흑 진영 큰 그림은 흰 그림에서 안쪽만 어둡게 만든 것) */
export const pieceImg = (type: PieceType, side: Side = 0, size: 'small' | 'large' = 'small', px = 22): string =>
  // 주인공 킹 = 왕관 쓴 폰 (D-078, tools/compose-hero.py) — 키가 커서 같은 칸 안에 맞춰 넣는다 (object-fit: contain)
  type === 'K' && side === 0
    ? `<img class="piece-img" src="pieces/hero-${size === 'large' ? 'l' : 's'}.png" alt="" width="${px}" height="${px}">`
    : `<img class="piece-img" src="pieces/${size === 'large' ? 'l' : 's'}-${type}${side}.png" alt="" width="${px}" height="${px}">`;
