import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import { SLICE_EVENTS, type EventState } from '../src/slice/events';
import { crewMaxHp, newSliceBattle } from '../src/slice/battle';
import { START_DECK } from '../src/slice/cards';
import type { Crew } from '../src/slice/crew';

/** 사건의 새 화폐 (D-459): 기벽 갈아 끼우기 · 단련(영구 공격) · 대가 붙은 부품 · 덱 수술 · 심장 톱니 */
const crew = (): Crew[] => [{ t: 'K', serial: 'K1', name: '종이왕' }, { t: 'N', serial: 'N1', name: '박차', kills: 7, battles: 9 }, { t: 'P', serial: 'P1', name: '먼지투성이', kills: 1, battles: 2 }];
const state = (): EventState => ({ squad: crew(), deck: [...START_DECK], refined: [], gold: 200, parts: [] });
const choose = (id: keyof typeof SLICE_EVENTS, k: number, s = state()) => ({ s, out: SLICE_EVENTS[id].choices[k].apply(s, new Rng(3)) });

describe('사건의 새 화폐 (D-459)', () => {
  it('렌즈를 갈아 끼우면 에이스의 기벽이 유리 렌즈 — HP는 같은 비율', () => {
    const { s } = choose('tinker', 1);
    const u = s.squad.find((x) => x.serial === 'N1')!;
    expect(u.quirk).toBe('glass');
    expect(u.hp).toBe(crewMaxHp(u));
  });
  it('단련은 대국 시작 공격에 더해진다', () => {
    const { s } = choose('smith', 0);
    const u = s.squad.find((x) => x.serial === 'N1')!;
    expect(u.temper).toBe(6);
    const plain = newSliceBattle(crew(), ['K', 'P'], [...START_DECK], 1);
    const tempered = newSliceBattle(s.squad, ['K', 'P'], [...START_DECK], 1);
    const atk = (b: typeof plain) => b.s.pieces.find((p) => p.side === 0 && p.type === 'N')!.atk;
    expect(atk(tempered) - atk(plain)).toBe(6);
  });
  it('피로 서명하면 그 부품을 곧바로 받고, 이미 있으면 막힌다', () => {
    expect(choose('pact', 1).out.givePart).toBe('bloodPact');
    const s = state(); s.parts = ['bloodPact'];
    expect(SLICE_EVENTS.pact.choices[1].blocked?.(s)).toBeTruthy();
  });
  it('금고 · 동전 뒷면은 HP가 아니라 심장 톱니를 깬다', () => {
    const { s } = choose('safe', 0);
    expect(s.squad.some((u) => u.cracked)).toBe(true);
    expect(s.gold).toBe(350);
  });
  it('덱 수술: 시작 카드 셋 → 희귀 이상 · 가장 흔한 시작 카드 한 종류를 통째로', () => {
    const a = choose('conveyor', 0).s;
    expect(a.deck.filter((id) => (START_DECK as string[]).includes(id)).length).toBe(START_DECK.length - 3);
    const b = choose('echoWell', 1).s;
    expect(b.deck.includes('advance')).toBe(false);
  });
});
