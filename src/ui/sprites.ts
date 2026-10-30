import type { PieceType, Side } from '../engine';

/** 사용자 제공 도트 기물 이미지 태그. small = 보드·목록용 (흑백), large = 크게 보여 줄 곳 (흰 기물만) */
export const pieceImg = (type: PieceType, side: Side = 0, size: 'small' | 'large' = 'small', px = 22): string =>
  `<img class="piece-img" src="pieces/${size === 'large' && side === 0 ? 'l' : 's'}-${type}${side}.png" alt="" width="${px}" height="${px}">`;
