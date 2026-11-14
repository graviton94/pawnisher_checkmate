import { describe, expect, it } from 'vitest';
import { fxFramePixels, RESULT_FX_KINDS } from '../src/slice/resultfx';

// D-506: 결과 도트 연출은 발주 15색만 · 8프레임 모두 무언가 찍고 · 꼬리(디더 퇴장)는 터짐보다 줄어든다
const PAL15 = new Set(['#0B0B0E', '#33313B', '#56545E', '#8A8794', '#8A6416', '#C89B3C', '#F5C542', '#8E877A', '#BFB9AD', '#F1EDE4', '#7A1218', '#E5262F', '#FF7B7B', '#1F8A7A', '#5EEAD4']);
const fake = (cols: Set<string>) => () => {
  let fs = '';
  return {
    get fillStyle() { return fs; },
    set fillStyle(v: string) { fs = v; cols.add(v); },
    fillRect: () => {},
    clearRect: () => {},
  } as unknown as CanvasRenderingContext2D;
};

describe('result fx (code pixel effects)', () => {
  for (const k of RESULT_FX_KINDS) {
    it(`${k}: palette-only, every frame drawn, tail thins out`, () => {
      const cols = new Set<string>();
      const n = Array.from({ length: 8 }, (_, f) => fxFramePixels(k, f, fake(cols)));
      for (const c of cols) expect(PAL15.has(c), `${k} uses ${c}`).toBe(true);
      // 빈 프레임은 마지막 한두 장(완전히 디더로 걷힘)만 허용
      expect(n.slice(0, 6).every((v) => v > 0), `${k} frames ${n}`).toBe(true);
      expect(n[7]).toBeLessThanOrEqual(Math.max(n[2], n[3]));
    });
  }
});
