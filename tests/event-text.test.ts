import { describe, expect, it } from 'vitest';
import { choicePay, SLICE_EVENTS, SLICE_EVENT_IDS } from '../src/slice/events';
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
    for (const [id, t] of Object.entries(EVENT_TALK)) for (const l of [t.hi ?? '', ...t.react, ...t.idle, t.win, t.lose ?? '', t.bye]) if (l) expect.soft(textWidth(l), `${id}: ${l}`).toBeLessThanOrEqual(B.say);
    for (const [id, m] of Object.entries(EVENT_OUTCOME)) for (const [k, o] of Object.entries(m)) if (o.line) expect.soft(textWidth(o.line), `${id} ${k}: ${o.line}`).toBeLessThanOrEqual(B.say);
  });
});

/**
 * 알고 치르는 나사 (D-402): 나사가 모자라 막히는 선택지는 고르는 순간 치를 값이 있어야 한다 — 화면은 그 값만 꼬리표 숫자로 굴리고,
 * 확률로 잃거나 얻는 나사만 결과 FX로 보인다. 값은 apply가 실제로 깎는 값과 같아야 한다(확률 결과로 얻는 나사는 빼고 본다).
 */
/**
 * 단계마다 대사가 바뀐다 (D-403 타자기): 말하는 NPC(반응이 괄호 묘사가 아닌 사건)는 소개 대사(사건 글 속 “ ” 또는 hi)가 있고,
 * 떠나기를 뺀 선택지마다 제 반응 한 줄이 있다.
 */
describe('사건 대사 단계 (D-403)', () => {
  it('소개 → 고름 반응 → 결과: 말하는 NPC는 소개 대사 · 선택지마다 반응', () => {
    for (const id of SLICE_EVENT_IDS) {
      const t = EVENT_TALK[id];
      expect.soft(t, id).toBeTruthy();
      if (!t) continue;
      const ev = SLICE_EVENTS[id];
      ev.choices.forEach((c, k) => c.desc && expect.soft(t.react[k], `${id} 선택지 ${k} 반응`).toBeTruthy());
      const speaks = t.react.some((r) => !/^\(.*\)$/.test(r));
      if (speaks) expect.soft(/“[^”]+”/.test(ev.text) || !!t.hi, `${id} 소개 대사`).toBe(true);
    }
  });
});

describe('알고 치르는 나사 (D-402)', () => {
  it('「나사 N 필요」로 막히는 선택지는 치를 값이 있고, 실제로 깎이는 값과 맞는다', async () => {
    const { Rng } = await import('../src/engine/rng');
    const { START_COMMANDS } = await import('../src/slice/cards');
    const mk = () => ({ squad: [{ t: 'K' as const }, { t: 'P' as const, name: 'a', kills: 3 }, { t: 'N' as const, name: 'c' }, { t: 'B' as const, name: 'd', cracked: true }], deck: [...START_COMMANDS, 'order~' as never, 'leap~' as never], refined: [] as never[], gold: 300 });
    const poor = { squad: mk().squad, deck: mk().deck, refined: [], gold: 0 };
    for (const id of SLICE_EVENT_IDS)
      for (const c of SLICE_EVENTS[id].choices) {
        if (!c.desc) continue;
        const why = c.blocked?.(poor as never) ?? '';
        const pay = choicePay(c, mk() as never);
        if (/나사 \d+/.test(why)) expect.soft(pay, `${id}: ${c.label}`).toBeGreaterThan(0);
        if (!pay || c.blocked?.(mk() as never)) continue;
        // 결과가 나사를 더 주지 않는 시드에서는 깎인 값 = pay
        const drops = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const s = mk(); c.apply(s as never, new Rng(k)); return 300 - s.gold; });
        expect.soft(Math.max(...drops), `${id}: ${c.label} ${drops}`).toBe(pay);
      }
  });
});
