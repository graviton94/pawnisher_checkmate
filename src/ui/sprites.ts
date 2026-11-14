import type { PieceType, Side } from '../engine';

/**
 * 사용자 제공 도트 기물 이미지 태그. small = 보드·목록용, large = 크게 보여 줄 곳.
 * art = 발주 전용 그림 (2026-11-14): 이형 이름(`cannon` …)이면 `s-cannon0.png`, `giant`면 거대 주물 `s-giantP1.png` (maker.py export)
 */
export const pieceImg = (type: PieceType, side: Side = 0, size: 'small' | 'large' = 'small', px = 22, art?: string): string =>
  `<img class="piece-img" src="pieces/${size === 'large' ? 'l' : 's'}-${pieceArt(type, side, art)}.png" alt="" width="${px}" height="${px}">`;
/** 그림 파일 이름(접두 · 확장자 뺀) — 바탕 기물 `P0`, 이형 `cannon1`, 거대 `giantR1` */
export const pieceArt = (type: PieceType, side: Side, art?: string): string =>
  art === 'giant' && side === 1 && (type === 'P' || type === 'R' || type === 'Q') ? `giant${type}1` : art && art !== 'giant' ? `${art}${side}` : `${type}${side}`;
