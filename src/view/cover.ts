/** 비율을 유지하며 영역 전체를 채운다. 배율·위치는 기기 픽셀 격자에 맞춘다. */
export const fitCover = (sw: number, sh: number, bw: number, bh: number, dpr = 1, fx = .5, fy = .5) => {
  const scale = Math.ceil(Math.max(bw / sw, bh / sh) * dpr) / dpr;
  const width = sw * scale, height = sh * scale;
  const snap = (v: number) => Math.round(v * dpr) / dpr;
  const x = snap(Math.min(0, Math.max(bw - width, bw / 2 - Math.max(0, Math.min(1, fx)) * width)));
  const y = snap(Math.min(0, Math.max(bh - height, bh / 2 - Math.max(0, Math.min(1, fy)) * height)));
  return { width, height, x, y, scale };
};
