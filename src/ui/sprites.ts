import type { PieceType, Side } from '../engine';

/**
 * 사용자 제공 도트 기물 이미지 태그. small = 보드·목록용, large = 크게 보여 줄 곳.
 * art = 발주 전용 그림 (2026-11-14): 이형 이름(`cannon` …)이면 `s-cannon0.png`, `giant`면 거대 주물 `s-giantP1.png` (maker.py export)
 */
export const pieceImg = (type: PieceType, side: Side = 0, size: 'small' | 'large' = 'small', px = 22, art?: string): string => {
  const name = pieceArt(type, side, art);
  const w = pieceThumbPx(px, name.startsWith('giant') ? 122 : 72);
  return `<img class="piece-img" src="pieces/${size === 'large' ? 'l' : 's'}-${name}.png" alt="" width="${w}" height="${w}">`;
};
/**
 * 기물 그림 표시 크기 (D-538 도트 밀도): 그림 1도트 = 기기 정수 픽셀. 원하는 크기(CSS px)에 가장 가까운 정수배(최소 1 — 도트가 빠지지 않게).
 * DPR 2.625에서 72도트 그림: 20~40px → 27.43px(×1) · 44~64px → 54.86px(×2) · 80px → 82.29px(×3) · 108px → 109.71px(×4) · 220px → 219.43px(×8)
 */
export const pieceThumbPx = (px: number, dots = 72, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1): number =>
  (Math.max(1, Math.round((px * dpr) / dots)) * dots) / dpr;
/** 그림 파일 이름(접두 · 확장자 뺀) — 바탕 기물 `P0`, 이형 `cannon1`, 거대 `giantR1` */
export const pieceArt = (type: PieceType, side: Side, art?: string): string =>
  art === 'giant' && side === 1 && (type === 'P' || type === 'R' || type === 'Q') ? `giant${type}1` : art && art !== 'giant' ? `${art}${side}` : `${type}${side}`;
