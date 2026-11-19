import { describe, expect, it } from 'vitest';
import { bayer8, ditherLevel, ditherSvg, ease, snapDev } from '../src/view/motion';
import { SMOOTH } from '../src/data/motion';
import { easingFn, parseTransform, sampleMotion } from '../src/view/bakefast';
import { castOf, castOn, VN_DEFAULT, VN_SCENE } from '../src/data/vn';
import { BOSS_STORY, DEFEAT_CUTS, ENDING_A, PROLOGUE, PROLOGUE_FIELD, bossFallCut, gildedPhase2Cut, promotionCuts, runIntro, shadowCuts, trueEndingCuts, type Cut, type StoryBoss } from '../src/data/script';
import { companionScene } from '../src/data/companion-scenes';

/**
 * 매끈한 도트 움직임 (D-554): 디더는 8×8 베이어 64단 · 곡선은 예비 → 터짐 → 출렁 · 위치는 기기 픽셀 정수 ·
 * CSS 키프레임 디더는 모두 16단으로 펼쳐져 있다(다섯 단 이하 계단 퇴장 없음).
 */
describe('8×8 베이어 디더 (D-554)', () => {
  it('문턱 0~63이 한 번씩', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) seen.add(bayer8(x, y));
    expect(seen.size).toBe(64);
    expect(Math.min(...seen)).toBe(0);
    expect(Math.max(...seen)).toBe(63);
  });
  it('단계 = 보이는 칸 수 (0 · 64 끝 포함, 64단)', () => {
    expect(SMOOTH.levels).toBe(64);
    expect(ditherLevel(0)).toBe(0);
    expect(ditherLevel(1)).toBe(64);
    expect(ditherLevel(0.5)).toBe(32);
    for (const k of [0, 1, 17, 32, 63, 64]) {
      const n = (ditherSvg(k, 1.905).match(/<rect /g) ?? []).length;
      expect(n).toBe(k >= 64 ? 1 : k);
    }
  });
});

describe('곡선 · 정수 위치 (D-554)', () => {
  it('예비 → 터짐 → 출렁: 처음엔 반대로, 중간에 넘치고, 끝은 정확히 1', () => {
    expect(ease.abs(0)).toBe(0);
    expect(ease.abs(1)).toBe(1);
    expect(ease.abs(0.1)).toBeLessThan(0);
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => ease.abs(i / 100)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.1);
    // 연속: 화면 프레임 사이 한 번에 크게 튀지 않는다 (120 표본)
    for (let i = 1; i <= 120; i++) expect(Math.abs(ease.abs(i / 120) - ease.abs((i - 1) / 120))).toBeLessThan(0.06);
  });
  it('기기 픽셀 정수', () => {
    for (const r of [1, 2, 2.625, 3]) for (const v of [0.3, 12.71, -33.333, 205.9]) {
      const d = snapDev(v, r) * r;
      expect(Math.abs(d - Math.round(d))).toBeLessThan(1e-9);
    }
  });
});

describe('CSS 디더 키프레임 16단 (D-554)', () => {
  it('키프레임 안에 다섯 단 가면(--px0 · --pxm1 · --px2~4)이 남지 않았다 (tools/dither-css.cjs로 펼침 — 깜빡임 alarm · blink만 예외)', () => {
    const css = import.meta.glob(['../src/*.css', '../src/slice/*.css'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
    const left: string[] = [];
    for (const [file, src] of Object.entries(css)) {
      const kw = /@keyframes\s+([\w-]+)\s*\{/g;
      let m: RegExpExecArray | null;
      while ((m = kw.exec(src))) {
        let depth = 1, j = m.index + m[0].length;
        while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
        if (!/^(alarm|blink)$/.test(m[1]) && /mask-image:\s*var\(--(px[0-4]|pxm1)\)/.test(src.slice(m.index, j))) left.push(`${file} ${m[1]}`);
      }
    }
    expect(Object.keys(css).length).toBeGreaterThan(3);
    expect(left).toEqual([]);
  });
});

describe('비주얼 노벨 층 데이터 (D-554)', () => {
  it('종이왕은 K0 정본 (D-424) · 반장은 검은 킹', () => {
    expect(castOf('종이왕')).toEqual({ t: 'K', side: 0 });
    expect(castOf('철갑 반장')).toEqual({ t: 'K', side: 1 });
    expect(castOf('없는 이름')).toBeUndefined();
  });
  it('그림이 있는 컷에는 배우(판 도트 말)를 세우지 않는다 (D-580 · D-572)', () => {
    expect(VN_DEFAULT.noCast).toBe(true);
    const company = { alive: [{ name: '먼지투성이', t: 'N' as const }, { name: '구부러진 못', t: 'B' as const }], promised: { name: '먼지투성이', alive: true } };
    const all: Cut[] = [
      ...PROLOGUE, PROLOGUE_FIELD, ...DEFEAT_CUTS, ENDING_A, ...trueEndingCuts([], company),
      ...[0, 1, 2, 3].flatMap((ch) => [...shadowCuts(ch, '법'), ...[0, 1, 2].flatMap((t) => runIntro(ch, t, '법')), ...promotionCuts(ch, '먼지투성이', '법', '거울', company)]),
      ...(Object.keys(BOSS_STORY) as StoryBoss[]).map((r) => bossFallCut(r, `boss-fall-${r}`, 1, 0)), gildedPhase2Cut('boss-gilded', 0, 'plate'),
      ...[0, 1, 2].flatMap((a) => companionScene(a, [{ name: '먼지투성이', t: 'P', serial: 'A1' }] as never).cuts),
    ];
    // 이전에 배우가 섰던 컷(상자 안의 다툼 · 반장 격파 · 도금왕 2단계 · 용해 주조 · 진엔딩 · 동료 장면)을 모두 덮는다
    expect(all.filter((c) => c.lines.some((l) => l.k === 's' && castOf(l.who)) && c.img).length).toBeGreaterThan(8);
    for (const c of all) if (c.img) expect.soft(castOn(c.slug, true), c.slug ?? c.img).toBe(false);
    // 그림 없는 컷도 연 곳이 없다 — 먹 무대(D-579)는 추상으로
    for (const [slug, sc] of Object.entries(VN_SCENE)) expect.soft(sc.noCast, slug).not.toBe(false);
    for (const c of PROLOGUE) expect.soft(castOn(c.slug, false), c.slug).toBe(false);
  });
  it('분위기 표의 컷 이름은 실제 컷에 있다 (프롤로그 컷은 모두 짝이 있다)', () => {
    for (const c of PROLOGUE) if (c.slug) expect.soft(VN_SCENE[c.slug], c.slug).toBeDefined();
  });
});

describe('계산으로 굽기 (D-593)', () => {
  it('transform 글을 읽고, 모르는 꼴은 null', () => {
    expect(parseTransform('none')).toEqual([]);
    expect(parseTransform('translate(10px, -50%) rotate(0.5turn) scale(2)')).toEqual([
      { k: 't', x: 10, xp: false, y: -50, yp: true },
      { k: 'r', deg: 180 },
      { k: 's', x: 2, y: 2 },
    ]);
    expect(parseTransform('translateX(3px) scaleY(.5)')).toEqual([{ k: 't', x: 3, xp: false, y: 0, yp: false }, { k: 's', x: 1, y: 0.5 }]);
    expect(parseTransform('matrix(1,0,0,1,0,0)')).toBeNull();
    expect(parseTransform('translate(calc(1px + 2px))')).toBeNull();
    expect(parseTransform('translate(var(--x))')).toBeNull();
  });
  it('곡선: 끝점 고정 · 계단은 잇는다 · 모르는 꼴은 null', () => {
    const e = easingFn('ease-out')!;
    expect(e(0)).toBeCloseTo(0, 6);
    expect(e(1)).toBeCloseTo(1, 6);
    expect(e(0.5)).toBeGreaterThan(0.5);
    expect(easingFn('steps(4, jump-end)')!(0.3)).toBe(0.3);
    expect(easingFn('linear(0, 1)')).toBeNull();
    // 넘치는 곡선 (y > 1)
    const over = easingFn('cubic-bezier(.3,1.6,.6,1)')!;
    expect(Math.max(...Array.from({ length: 50 }, (_, i) => over(i / 49)))).toBeGreaterThan(1);
  });
  it('표본: 처음 · 끝 · 퍼센트 · 반대 방향', () => {
    const m = sampleMotion([{ transform: 'translate(-50%, 0)' }, { transform: 'translate(50%, 10px)' }], 4, 40, 10)!;
    expect(m).toHaveLength(5);
    expect(m[0][4]).toBeCloseTo(-20);
    expect(m[4][4]).toBeCloseTo(20);
    expect(m[4][5]).toBeCloseTo(10);
    const r = sampleMotion([{ transform: 'none' }, { transform: 'translateY(8px)' }], 2, 1, 1, 'reverse')!;
    expect(r[0][5]).toBeCloseTo(8);
    expect(r[2][5]).toBeCloseTo(0);
  });
  it('꼴이 다른 목록 · 빠진 끝 키프레임은 표본으로 넘긴다 (null)', () => {
    expect(sampleMotion([{ transform: 'rotate(10deg)' }, { transform: 'translate(1px,0)' }], 4, 1, 1)).toBeNull();
    expect(sampleMotion([{ transform: 'none', offset: 0.2 }, { transform: 'translate(1px,0)' }], 4, 1, 1)).toBeNull();
  });
});
