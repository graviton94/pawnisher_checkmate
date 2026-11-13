import { defineConfig } from 'vitest/config';

/**
 * 단위 테스트 설정 (`npm test`). 규칙 · 공식 테스트는 공정 열기(D-454)와 무관하게 공식 그대로를 본다 —
 * tests/setup.ts가 열기를 1로 둔다. 열기 자체는 tests/heat.test.ts가 실제 값으로 본다.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
});
