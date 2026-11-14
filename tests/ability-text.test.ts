import { describe, expect, it } from 'vitest';
import { bossAbilityText, enemyAbilityText, BUILD_PART_ABILITIES, partSummaryText, partAbilityText } from '../src/data/ability-text';
import { abilityHtml } from '../src/slice/ability';
import { BOSS_NUM, BOSS_RULES, TRAIT } from '../src/slice/cards';
import type { BossRule, FoeTrait } from '../src/slice/cards';
import { partSlotsAt } from '../src/slice/cards';
import { pxWidth, textWidth } from '../src/slice/desc';
import { partRuleRows } from '../src/slice/ability';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';

describe('능력 설명 세 줄 계약', () => {
  it('모든 반장의 모든 규칙이 이름·조건·효과로 나뉘고 숫자가 빠지지 않는다', () => {
    for (const rule of Object.keys(BOSS_RULES) as BossRule[]) {
      const abilities = bossAbilityText(rule, 2, (n) => n * 2);
      expect(abilities.length).toBeGreaterThan(0);
      for (const a of abilities) {
        expect([a.name, a.description, a.effect].every((v) => v && !/undefined|\n/.test(v))).toBe(true);
        const markup = abilityHtml(abilities, abilities.indexOf(a));
        expect(markup.match(/class="ability-description"/g)).toHaveLength(1);
        expect(markup.match(/class="ability-effect"/g)).toHaveLength(1);
        expect(markup).toContain(`: ${a.effect}`);
        expect(textWidth(a.description)).toBeLessThanOrEqual(15.5);
        expect(textWidth(a.effect)).toBeLessThanOrEqual(19);
      }
    }
    expect(bossAbilityText('inspect')[0].effect).toContain(`×${BOSS_NUM.stampMult}`);
    expect(bossAbilityText('gilded').map((a) => a.name)).toEqual(['조립', '줄 폭격', '되받아침', '철갑']);
    expect(bossAbilityText('thorns', 0, (n) => n * 2)[0].effect).toContain(String(BOSS_NUM.thorns * 2));
  });
  it('복합 적 특성을 뭉개거나 생략하지 않는다', () => {
    const traits: FoeTrait[] = ['blastPawn', 'rookPlate', 'knightShoe', 'bishopLens', 'pawnDrill', 'queenCrown'];
    const pawn = enemyAbilityText('P', traits, (n) => n * 2);
    expect(pawn.map((a) => a.name)).toEqual(['자폭', '송곳 폰']);
    expect(pawn[0].effect).toContain(String(TRAIT.blast * 2));
    for (const t of ['R', 'N', 'B', 'Q'] as const) expect(enemyAbilityText(t, traits)).toHaveLength(1);
    expect(abilityHtml(pawn, 0)).toContain('data-ability-index="0"');
    expect(abilityHtml(pawn, 1)).toContain('송곳 폰');
    expect(abilityHtml(enemyAbilityText('R', traits))).not.toContain('data-ability-next');
  });
  it('부품 상세도 한 번에 세 줄이며 다음 장에서 판정 조건을 보존한다', () => {
    expect(BUILD_PART_ABILITIES.relayGear[1].effect).toContain('임시 폰·승격·반사 제외');
    expect(BUILD_PART_ABILITIES.siegeLatch[1].description).toContain('룩마다');
    expect(abilityHtml([])).toBe('');
    for (const list of Object.values(BUILD_PART_ABILITIES)) {
      for (const a of list) {
        expect(textWidth(a.description)).toBeLessThanOrEqual(15.5);
        expect(textWidth(a.effect)).toBeLessThanOrEqual(19);
      }
    }
  });
});


describe('부품 조합의 보유·표시 계약', () => {
  it('초반 재료 6칸에서 시작해 8칸에 멈추며 이전 정상 보유량은 모두 수용한다', () => {
    expect([-1, 0, 1, 2, 3, 20].map(partSlotsAt)).toEqual([6, 6, 7, 8, 8, 8]);
    [5, 6, 7, 8].forEach((oldCount, act) => expect(partSlotsAt(act)).toBeGreaterThanOrEqual(oldCount));
  });
  it('대가와 처치 조건을 구별하고 복합 판정의 제외 대상을 보존한다', () => {
    expect(partSummaryText('spare')).toMatchObject({ description: '장착 중', effect: '태엽 +1 · 손패 −1' });
    expect(partSummaryText('echo')).toMatchObject({ description: '적중마다', effect: '쌓이는 연쇄 ×2' }); // D-454: 연쇄 = 적중
    expect(partSummaryText('chainShot')).toMatchObject({ description: '충돌로 처치 시', effect: '연쇄 +2' });
    expect(partSummaryText('fuse')).toMatchObject({ description: '턴에 한 번, 연쇄 5 달성 시', effect: '카드 +1 · 태엽 +1' }); // D-470 사용자 예시
    expect(partAbilityText('conductor')[0].effect).toContain('기본 +4');
    expect(partAbilityText('sharedPlate')[1].effect).toContain('임시 폰 제외');
  });
});

/** 부품 문법 (D-470, 사용자 결정): [이름] / 언제 한 문장 / : 효과(득실 많아야 둘) — 제한(턴에 한 번)이 앞, 조건이 뒤 */
describe('부품 문법 — 언제 · 효과', () => {
  const ids = Object.keys(SLICE_PARTS) as SlicePartId[];
  it('언제 줄은 「…시 · …마다 · …동안」으로 끝나거나 「장착 중」, 제한은 맨 앞', () => {
    const bad = ids.map((id) => partSummaryText(id)).filter((a) => !(a.description === '장착 중' || /(시|마다|동안)$/.test(a.description)) || (a.description.includes('한 번') && !a.description.startsWith('턴에 한 번, ')));
    expect(bad).toEqual([]);
  });
  it('효과는 득실 많아야 둘, 언제 줄에 「 · 」가 섞이지 않는다', () => {
    expect(ids.filter((id) => partSummaryText(id).effect.split(' · ').length > 2 || partSummaryText(id).description.includes(' · '))).toEqual([]);
  });
  it('그림 카드는 언제 한 행 · 효과 한 행 고정, 줄여도 읽힌다 (10px에서 가로 0.7배 안팎 — 화면 실측 최저 0.72, D-473)', () => {
    const scale = (t: string, bold: boolean) => Math.min(1, 99 / ((pxWidth(t, bold) * 10) / 12));
    const bad = ids.flatMap((id) => { const r = partRuleRows(id); return r.length !== 2 || r.some((x) => scale(x.t, x.k === 'fx') < 0.68) ? [`${id}: ${r.map((x) => x.t).join(' / ')}`] : []; });
    expect(bad).toEqual([]);
    expect(partRuleRows('fuse').map((x) => x.t)).toEqual(['턴에 한 번, 연쇄 5 달성 시', ': 카드 +1 · 태엽 +1']);
  });
});
