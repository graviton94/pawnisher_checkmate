import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/slice/cards';
import { SLICE_PARTS } from '../src/slice/parts';
import { DESC_LIMIT, splitDesc, textWidth } from '../src/slice/desc';

/** 설명 문단 (D-333): 묘사 2줄 · 조건 + 효과 한 덩어리 — 어림 폭으로 줄 넘침을 막는다 (실제 화면은 sliceApi.allFaces로 잰다) */
describe('설명 문단', () => {
  // D-370 · D-372: 조건 + 효과는 점선 아래 한 덩어리 — 둘을 합쳐 고정 카드 두루마리 세 줄 안 (넘치면 화면이 묘사 줄을 접는다)
  const over = (d: { say: string; fx: string; cond: string }) =>
    textWidth(d.say) > DESC_LIMIT.say || textWidth(d.cond) + textWidth(d.fx) > DESC_LIMIT.tail;
  it('카드: 묘사가 있고 줄 한도 안', () => {
    const bad = Object.entries(COMMANDS).filter(([id]) => !/[+~]$/.test(id)).map(([id, c]) => [id, splitDesc(c.desc)] as const).filter(([, d]) => !d.say || over(d));
    expect(bad).toEqual([]);
  });
  it('부품: 묘사 · 기능이 있고 줄 한도 안', () => {
    const bad = Object.entries(SLICE_PARTS).map(([id, p]) => [id, splitDesc(p.desc, p.flavor)] as const).filter(([, d]) => !d.say || !d.fx || over(d));
    expect(bad).toEqual([]);
  });
});
