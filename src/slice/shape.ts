import type { PieceType } from '../engine';

/**
 * 카드의 행마 그림 (D-146 → D-149 다시 그림 — 체스를 몰라도 카드만 보고 안다).
 * 5×5 도트 판: 빈 칸 = 희미한 점 · 붉은 타일 = 가서 치는 범위 · 청록 타일 = 이동만(폰) · 가운데 흰 표식 = 이 기물.
 * 사선 기물(비숍 · 룩 · 퀸)은 줄로 이어진 타일 — 막힐 때까지 계속 간다. 위쪽이 앞.
 */
const KNIGHT = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
const ALL8 = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const RAYS: Partial<Record<PieceType, number[][]>> = {
  B: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
  R: [[1, 0], [-1, 0], [0, 1], [0, -1]],
  Q: ALL8,
};

/** 행마 칸 (dx, dy · dy>0 = 앞). ray = 사선 방향 (바깥 타일에 화살) */
export const shapeCells = (t: PieceType): { move: number[][]; hit: number[][]; rays: number[][] } => {
  if (t === 'P') return { move: [[0, 1], [0, 2]], hit: [[-1, 1], [1, 1]], rays: [] };
  if (t === 'N') return { move: [], hit: KNIGHT, rays: [] };
  if (t === 'K') return { move: [], hit: ALL8, rays: [] };
  const rays = RAYS[t] ?? [];
  return { move: [], hit: rays.flatMap(([dx, dy]) => [[dx, dy], [dx * 2, dy * 2]]), rays };
};

const PAL = {
  hit: ['#ff9a7a', '#e0563f', '#7a2418'],
  move: ['#a8f0fa', '#3fb6ca', '#1f6f80'],
};

/** 행마 그림 HTML — 정수 픽셀 격자(칸 10px)로 또렷하게 */
export const shapeHtml = (t: PieceType, cell = 10): string => {
  const n = 5;
  const px = n * cell + 2;
  const { move, hit } = shapeCells(t);
  const X = (dx: number) => 1 + (dx + 2) * cell;
  const Y = (dy: number) => 1 + (2 - dy) * cell;
  const out: string[] = [`<rect x="0" y="0" width="${px}" height="${px}" fill="#121016"/>`];
  const filled = new Set([...move, ...hit].map(([dx, dy]) => `${dx},${dy}`));
  // 빈 칸: 희미한 점
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      if (!filled.has(`${dx},${dy}`) && (dx || dy)) out.push(`<rect x="${X(dx) + cell / 2 - 1}" y="${Y(dy) + cell / 2 - 1}" width="2" height="2" fill="#3a3542"/>`);
  // 타일: 윗줄 밝게 · 아랫줄 어둡게 (도트 베벨)
  const tile = (dx: number, dy: number, [hi, mid, lo]: string[], op = 1) => {
    const x = X(dx) + 1, y = Y(dy) + 1, s = cell - 2;
    out.push(`<g opacity="${op}"><rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${mid}"/><rect x="${x}" y="${y}" width="${s}" height="1" fill="${hi}"/><rect x="${x}" y="${y}" width="1" height="${s}" fill="${hi}"/><rect x="${x}" y="${y + s - 1}" width="${s}" height="1" fill="${lo}"/><rect x="${x + s - 1}" y="${y}" width="1" height="${s}" fill="${lo}"/></g>`);
  };
  hit.forEach(([dx, dy]) => tile(dx, dy, PAL.hit));
  move.forEach(([dx, dy], i) => tile(dx, dy, PAL.move, t === 'P' && i === 1 ? 0.45 : 1));
  // 가운데: 이 기물 (흰 표식, 검은 테)
  const c0 = X(0) + 2, s0 = cell - 4;
  out.push(`<rect x="${c0 - 1}" y="${Y(0) + 1}" width="${s0 + 2}" height="${s0 + 2}" fill="#000"/><rect x="${c0}" y="${Y(0) + 2}" width="${s0}" height="${s0}" fill="#f2ede4"/>`);
  return `<span class="shape"><svg viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" shape-rendering="crispEdges" aria-hidden="true">${out.join('')}</svg></span>`;
};
