import { describe, expect, it } from 'vitest';
import { SLICE_EVENTS } from '../src/slice/events';
import { effectChunks, effectHtml, effectNumbers } from '../src/slice/effect-text';

describe('사건은 늘 빠져나갈 수 있다 (D-597)', () => {
  it('어느 상태에서도 고를 수 있는 길이 하나는 있다 — 선택지가 다 꺼지면 「무시하고 떠난다」가 남는다', () => {
    // 가장 가난한 상태(나사 0 · 킹만 · 덱 얇음)와 분대가 가득 찬 상태 — 「통행 문」처럼 유일한 선택지가 꺼지는 경우
    const poor = { squad: [{ t: 'K' as const, name: '종이왕' }], deck: ['charge' as never], refined: [], gold: 0, parts: [], charms: { revive: 0, rewind: 0 } };
    const crowd = { ...poor, gold: 55, squad: Array.from({ length: 8 }, (_, i) => ({ t: i ? ('P' as const) : ('K' as const), name: `분대원 ${i}` })) };
    for (const [id, ev] of Object.entries(SLICE_EVENTS)) {
      const leaves = ev.choices.filter((c) => !c.desc);
      expect(leaves.length, `${id}: 떠나기는 하나까지`).toBeLessThanOrEqual(1);
      for (const st of [poor, crowd]) {
        const open = ev.choices.filter((c) => (c.blocked?.(st as never) ?? null) === null);
        expect(open.length, `${id}: 고를 길`).toBeGreaterThan(0);
        // 떠나기가 있는 사건은 떠나기가 막히지 않는다
        if (leaves.length) expect(open).toContain(leaves[0]);
      }
    }
  });
});

describe('사건 선택지의 실제 득실', () => {
  it('모든 선택지는 효과 조각마다 득실을 명시한다', () => {
    for (const [id, ev] of Object.entries(SLICE_EVENTS)) for (const c of ev.choices) {
      if (!c.desc) continue;
      expect(c.tones?.length, `${id}: ${c.desc}`).toBe(effectChunks(c.desc).length);
      expect(c.tones?.every((t) => ['gain', 'loss', 'neutral'].includes(t))).toBe(true);
    }
  });
  it('저울추의 비용 감소는 이득, 다른 카드의 비용 증가는 손실이다', () => {
    const c = SLICE_EVENTS.counterweight.choices[0];
    expect(c.tones).toEqual(['gain', 'loss']);
    const html = effectHtml(c.desc, c.tones);
    expect(html).toContain('class="effect-gain">고른 카드 태엽 <b class="effect-num">−1</b>');
    expect(html).toContain('class="effect-loss">다른 카드 하나 <b class="effect-num">+1</b>');
  });
  it('기물과 나사의 교환은 포기하는 것과 받는 것을 나눈다', () => {
    const c = SLICE_EVENTS.scout.choices[0];
    expect(c.tones).toEqual(['loss', 'gain']);
    expect(effectHtml(c.desc, c.tones)).toContain('<i class="effect-sep"> → </i>');
  });
  it('확률과 수치를 굵게 보여도 따옴표와 HTML을 손상시키지 않는다', () => {
    expect(effectNumbers("'50%' <img> +2")).toBe('&#39;<b class="effect-num">50%</b>&#39; &lt;img&gt; <b class="effect-num">+2</b>');
    expect(effectHtml('나사 −40 · 버팀 +1', ['loss', 'gain'])).toContain('class="effect-loss">나사 <b class="effect-num">−40</b>');
  });
});
