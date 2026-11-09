import { describe, expect, it } from 'vitest';
import { SLICE_EVENTS, SLICE_EVENT_IDS } from '../src/slice/events';
import { EVENT_TALK } from '../src/data/event-talk';
import { EVENT_OUTCOME } from '../src/data/event-outcome';
import { textWidth } from '../src/slice/desc';
import { EVENT_TEXT_BUDGET as B } from '../src/data/event-talk';

/**
 * 사건 창 글 예산 (D-395, 보고서 2026-11-09f 3.7 `.win-scene`): 가장 작은 화면 667×375에서도 잘리지 않게.
 * 오른쪽 단 폭 352px(15px 한 줄 ≈ 한글 23자) · 대사 칸은 이름표 몫을 빼고 두 줄 · 선택지 결과는 12px 한 줄(정보 단추 몫을 뺀 264px).
 */
describe('사건 창 글 예산 (D-395)', () => {
  const sents = (t: string): string[] => t.split(/(?<=[.?!…])\s+/).filter(Boolean);
  it('서술은 두 문장 · 문장마다 한 줄, 대사는 두 줄 안', () => {
    for (const id of SLICE_EVENT_IDS) {
      const m = SLICE_EVENTS[id].text.match(/^(.*?)\s*(“[^”]+”)(.*)$/);
      const narr = m ? `${m[1]} ${m[3]}`.trim() : SLICE_EVENTS[id].text;
      expect.soft(sents(narr).length, id).toBeLessThanOrEqual(2);
      for (const s of sents(narr)) expect.soft(textWidth(s), `${id}: ${s}`).toBeLessThanOrEqual(B.narr);
      if (m) expect.soft(textWidth(m[2]), `${id}: ${m[2]}`).toBeLessThanOrEqual(B.say);
      expect.soft([...SLICE_EVENTS[id].title].length, id).toBeLessThanOrEqual(12);
    }
  });
  it('선택지: 떠나기 빼고 둘 이하 · 이름 16자 · 결과 한 줄 28자 · 대시로 잇지 않음', () => {
    for (const id of SLICE_EVENT_IDS) {
      const real = SLICE_EVENTS[id].choices.filter((c) => c.desc);
      expect.soft(real.length, id).toBeLessThanOrEqual(2);
      expect.soft(SLICE_EVENTS[id].choices.length, id).toBeLessThanOrEqual(3);
      for (const c of real) {
        expect.soft([...c.label].length, `${id}: ${c.label}`).toBeLessThanOrEqual(16);
        expect.soft([...c.desc].length, `${id}: ${c.desc}`).toBeLessThanOrEqual(28);
        expect.soft(textWidth(c.desc), `${id}: ${c.desc}`).toBeLessThanOrEqual(B.res);
        expect.soft(`${c.label} ${c.desc}`, id).not.toMatch(/—|\?/);
        if (c.info) expect.soft(textWidth(c.info), `${id}: ${c.info}`).toBeLessThanOrEqual(B.info);
      }
    }
  });
  it('NPC 한마디(반응 · 망설임 · 결과 · 작별)와 결과 대사는 대사 칸 두 줄 안', () => {
    for (const [id, t] of Object.entries(EVENT_TALK)) for (const l of [...t.react, ...t.idle, t.win, t.lose ?? '', t.bye]) if (l) expect.soft(textWidth(l), `${id}: ${l}`).toBeLessThanOrEqual(B.say);
    for (const [id, m] of Object.entries(EVENT_OUTCOME)) for (const [k, o] of Object.entries(m)) if (o.line) expect.soft(textWidth(o.line), `${id} ${k}: ${o.line}`).toBeLessThanOrEqual(B.say);
  });
});
