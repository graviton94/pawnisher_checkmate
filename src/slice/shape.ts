import type { PieceType } from '../engine';
import { pieceImg } from '../ui/sprites';

/**
 * 카드의 행마 그림 (D-146 — 체스를 몰라도 카드만 보고 안다, Pawnbarian식).
 * 5×5 작은 판: 가운데 기물 · 청록 점 = 갈 칸 · 붉은 테 = 칠 칸 (위쪽이 앞).
 */
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const ALL8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const RAYS: Partial<Record<PieceType, number[][]>> = {
  B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  Q: ALL8,
};

/** 행마 칸 (dx, dy · dy>0 = 앞) */
export const shapeCells = (t: PieceType): { move: number[][]; hit: number[][] } => {
  if (t === 'P') return { move: [[0, 1], [0, 2]], hit: [[-1, 1], [1, 1]] };
  if (t === 'N') return { move: KNIGHT, hit: KNIGHT };
  if (t === 'K') return { move: ALL8, hit: ALL8 };
  const cells = (RAYS[t] ?? []).flatMap(([dx, dy]) => [[dx, dy], [dx * 2, dy * 2]]);
  return { move: cells, hit: cells };
};

/** 행마 그림 HTML (px = 한 변) */
export const shapeHtml = (t: PieceType, px = 48): string => {
  const n = 5;
  const c = px / n;
  const { move, hit } = shapeCells(t);
  const at = (dx: number, dy: number) => ({ x: (dx + 2) * c, y: (2 - dy) * c });
  const cells: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push(`<rect x="${x * c + 0.5}" y="${y * c + 0.5}" width="${c - 1}" height="${c - 1}" fill="${(x + y) % 2 ? '#1d1b23' : '#24212b'}"/>`);
  const hits = hit.map(([dx, dy]) => {
    const p = at(dx, dy);
    return `<rect x="${p.x + 1}" y="${p.y + 1}" width="${c - 2}" height="${c - 2}" fill="rgba(224,72,72,0.28)" stroke="#ff6b5a" stroke-width="1.2"/>`;
  });
  const moves = move.map(([dx, dy], i) => {
    const p = at(dx, dy);
    const faint = t === 'P' && i === 1; // 폰 두 칸은 첫 이동만
    return `<circle cx="${p.x + c / 2}" cy="${p.y + c / 2}" r="${c * 0.2}" fill="#4ec3d6"${faint ? ' opacity="0.45"' : ''}/>`;
  });
  return `<span class="shape" style="width:${px}px;height:${px}px"><svg viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" aria-hidden="true">${cells.join('')}${hits.join('')}${moves.join('')}</svg><span class="shape-pc">${pieceImg(t, 0, 'small', Math.round(c * 1.5))}</span></span>`;
};
