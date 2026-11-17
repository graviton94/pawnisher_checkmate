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
 * 기물 그림 표시 크기 (D-538 도트 밀도): 원하는 크기(CSS px) 안에 드는 가장 큰 정수배(그림 1도트 = 기기 정수 픽셀)가
 * 원하는 크기의 85% 이상이면 그것, 아니면 원하는 크기 그대로 — 어떤 썸네일도 예전보다 눈에 띄게 작아지지 않는다.
 * DPR 2.625 · 72도트: 24px → 그대로(정수배 27.43은 넘침) · 30px → 27.43 · 64px → 54.86 · 108px → 109.71은 넘쳐 82.29(76%) → 그대로 108 · 220px → 219.43
 */
export const pieceThumbPx = (px: number, dots = 72, dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1): number => {
  const m = Math.floor((px * dpr) / dots + 1e-6);
  const snapped = (m * dots) / dpr;
  return m >= 1 && snapped >= 0.85 * px ? snapped : px;
};
/** 그림 파일 이름(접두 · 확장자 뺀) — 바탕 기물 `P0`, 이형 `cannon1`, 거대 `giantR1` */
export const pieceArt = (type: PieceType, side: Side, art?: string): string =>
  art === 'giant' && side === 1 && (type === 'P' || type === 'R' || type === 'Q') ? `giant${type}1` : art && art !== 'giant' ? `${art}${side}` : `${type}${side}`;
