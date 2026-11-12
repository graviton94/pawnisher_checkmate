import { describe, expect, it } from 'vitest';
import { fitCover } from '../src/view/cover';

describe('일러스트 공통 확대·크롭', () => {
  for (const [bw,bh,dpr] of [[667,375,2.625],[915,412,2.625],[1024,768,2],[1024,748,2],[1280,720,1]]) {
    for (const [sw,sh] of [[320,180],[219,215],[152,152],[300,135]]) {
      it(`${sw}x${sh} → ${bw}x${bh} @${dpr}`, () => {
        const r = fitCover(sw,sh,bw,bh,dpr,.25,.7);
        expect(r.width / r.height).toBeCloseTo(sw / sh);
        expect(r.scale * dpr).toBeCloseTo(Math.round(r.scale * dpr));
        expect(r.x).toBeLessThanOrEqual(.01); expect(r.y).toBeLessThanOrEqual(.01);
        expect(r.x + r.width).toBeGreaterThanOrEqual(bw - 1 / dpr);
        expect(r.y + r.height).toBeGreaterThanOrEqual(bh - 1 / dpr);
      });
    }
  }
});
