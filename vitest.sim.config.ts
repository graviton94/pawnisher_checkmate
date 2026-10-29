import { defineConfig } from 'vitest/config';

/** 시뮬레이션 전용 설정: `npm run sim` (테스트와 분리, 오래 걸린다) */
export default defineConfig({
  test: {
    include: ['sim/**/*.sim.ts'],
    testTimeout: 3_600_000,
    silent: false,
  },
});
