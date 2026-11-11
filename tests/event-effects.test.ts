import { describe, expect, it } from 'vitest';
import { SLICE_EVENTS } from '../src/slice/events';
import { effectChunks, effectHtml, effectNumbers } from '../src/slice/effect-text';

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
    expect(effectHtml('나사 −40 · 생명 +1', ['loss', 'gain'])).toContain('class="effect-loss">나사 <b class="effect-num">−40</b>');
  });
});
