import { describe, expect, it } from 'vitest';
import { copula, josa } from '../src/data/josa';
import { formAbilityText } from '../src/data/ability-text';
import { FORM_IDS } from '../src/data/forms';

/**
 * 조사 박기 금지 (D-536): 바뀌는 글(`${…}`) 바로 뒤에 을/를 · 이/가 · 은/는 · 과/와 · (으)로를 손으로 박지 않는다.
 * 「내린 자리 둘레을」처럼 받침에 따라 틀린다 — `josa()` · `copula()`를 쓰거나, 숫자 뒤에는 단위(칸 · 기)를 붙여 조사를 고정한다.
 */
const SOURCES = import.meta.glob<string>(['../src/data/*.ts', '../src/slice/*.ts'], { query: '?raw', import: 'default', eager: true });
const HARD = /\$\{([^{}]|\{[^{}]*\})*\}(을|를|이|가|은|는|과|와|으로|로)(?![가-힣])/g;

describe('조사', () => {
  it('josa · copula는 받침을 따른다', () => {
    expect(josa('내린 자리 둘레', '을')).toBe('내린 자리 둘레를');
    expect(josa('첫 적 · 나이트 칸', '을')).toBe('첫 적 · 나이트 칸을');
    expect(copula('나이트')).toBe('나이트다');
    expect(copula('폰')).toBe('폰이다');
  });
  it('이형 능력 줄에 틀린 조사가 없다', () => {
    for (const f of FORM_IDS) expect(formAbilityText(f).effect).not.toMatch(/둘레을|칸를|적를/);
    expect(formAbilityText('hopper').effect).toBe('내린 자리 둘레를 친다');
  });
  it('데이터 · 본편 글에 바뀌는 글 뒤 조사를 박지 않았다', () => {
    const bad: string[] = [];
    expect(Object.keys(SOURCES).length).toBeGreaterThan(20);
    for (const [f, src] of Object.entries(SOURCES)) {
      src.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(HARD)) if (!m[0].startsWith('${josa(') && !m[0].startsWith('${copula(')) bad.push(`${f}:${i + 1} ${m[0]}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
