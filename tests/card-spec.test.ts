import { describe, expect, it } from 'vitest';
import { allCardTexts, CARD_SPEC, specOver, type CardNature } from '../src/slice/card-spec';
import { COMMANDS } from '../src/slice/cards';
import { SLICE_PARTS } from '../src/slice/parts';
import { pxWidth, splitTwo } from '../src/slice/desc';

/**
 * 카드 줄 규격 (사용자 결정 D-515 — D-511을 모든 카드 성격 × 모든 글 줄로): 「절대로 줄 수 이탈은 없어야 함」.
 * 모든 카드 성격 × 줄 종류가 규격 행 수 · 행 폭(글꼴 실폭, 가장 작은 카드 150px) · 두루마리 높이 안. 새 카드가 넘치면 여기서 깨진다.
 * 넘치면: ① 문구를 다듬는다(뜻 · 수치 그대로) ② 그래도 안 되면 그 줄 종류 글자 크기를 성격 전체에 한 단계(CSS + CARD_SPEC). 말줄임 · 잘라내기 · 자간 줄이기 금지(D-422).
 */
describe('카드 줄 규격 (D-515)', () => {
  const all = allCardTexts();
  it('데이터 전수를 잰다 — 명령(+ · ~ 포함) · 부품 · 손질 · 부적 · 분대원(이름 · 영입 · 기벽 · 이형 · 킹 · 흉터) · 시작 세트', () => {
    const n = (k: CardNature) => all.filter((c) => c.nature === k).length;
    expect(n('cmd')).toBe(Object.keys(COMMANDS).length);
    expect(n('part')).toBe(Object.keys(SLICE_PARTS).length);
    expect(all.length).toBeGreaterThan(387);
    for (const k of Object.keys(CARD_SPEC) as CardNature[]) expect(n(k)).toBeGreaterThan(0);
  });
  for (const k of Object.keys(CARD_SPEC) as CardNature[]) {
    it(`${CARD_SPEC[k].label}: 모든 줄이 규격 행 수 · 행 폭 · 두루마리 높이 안`, () => {
      expect(all.filter((c) => c.nature === k).flatMap((c) => specOver(c).map((b) => `${c.id}: ${b}`))).toEqual([]);
    });
  }
  it('글자 크기는 성격마다 하나 — 이름 · 특성 이름 = 갈무리11 굵게 12 · 묘사 · 태그 = 갈무리11 12 · 조건 · 효과 = 갈무리9 10 (D-213 · D-511)', () => {
    for (const sp of Object.values(CARD_SPEC)) {
      expect(sp.lines.name?.font).toBe('g11b');
      if (sp.lines.trait) expect(sp.lines.trait.font).toBe('g11b');
      if (sp.lines.say) expect(sp.lines.say.font).toBe('g11');
      if (sp.lines.tag) expect(sp.lines.tag.font).toBe('g11');
      expect([sp.lines.if?.font, sp.lines.fx?.font]).toEqual(['g9', 'g9']);
    }
  });
});

/** 문법 통일 (D-515): D-422 [이름] / 조건·행동 / : 효과 × voice ⑥ 「비장한 한 문장 + (수치)」 — 모든 성격 같은 꼴 */
describe('카드 문법 통일 (D-515)', () => {
  const all = allCardTexts();
  it('아래 칸: 조건 행이 효과 행보다 먼저, 효과는 늘 하나 이상', () => {
    const bad = all.filter((c) => c.lines.some((l) => l.zone === 'bottom')).filter((c) => {
      const ks = c.lines.filter((l) => l.zone === 'bottom' && (l.kind === 'if' || l.kind === 'fx')).map((l) => l.kind);
      if (!ks.length) return false; // 킹 · 흉터 칸은 묘사 줄
      return !ks.includes('fx') || ks.lastIndexOf('if') > ks.indexOf('fx');
    });
    expect(bad.map((c) => c.id)).toEqual([]);
  });
  it('조건 아래 첫 효과 행은 「: 」로 시작하고, 조건이 없으면 「: 」가 없다 (D-422)', () => {
    const bad = all.filter((c) => {
      const b = c.lines.filter((l) => l.kind === 'if' || l.kind === 'fx');
      const fx = b.filter((l) => l.kind === 'fx');
      if (!fx.length) return false;
      const hasIf = b.some((l) => l.kind === 'if');
      return hasIf ? !fx[0].t.startsWith(': ') || fx.slice(1).some((l) => l.t.startsWith(': ')) : fx.some((l) => l.t.startsWith(': '));
    });
    expect(bad.map((c) => `${c.id}: ${c.lines.map((l) => l.t).join(' / ')}`)).toEqual([]);
  });
  it('묘사는 비장한 한 문장 — 마침표로 끝나고 문장은 하나 (명령 · 손질 · 부적 · 영입)', () => {
    const bad = all.filter((c) => ['cmd', 'svc', 'charm'].includes(c.nature) || c.id.startsWith('영입:')).filter((c) => {
      const say = c.lines.filter((l) => l.kind === 'say').map((l) => l.t).join(' ');
      return !say || !/[.]$/.test(say) || /[.!?] /.test(say);
    });
    expect(bad.map((c) => c.id)).toEqual([]);
  });
  it('조건 · 효과 행은 마침표 없는 명사구, 말줄임 없음', () => {
    expect(all.flatMap((c) => c.lines.filter((l) => (l.kind === 'if' || l.kind === 'fx') && /[.…]$/.test(l.t)).map((l) => `${c.id}: ${l.t}`))).toEqual([]);
  });
  it('묘사 줄은 「한 / 번」 · 「쓰러뜨린 / 자」처럼 꾸밈말과 의존 명사 사이에서 꺾이지 않는다', () => {
    expect(splitTwo('두 적을 한 번에 노린다.', 101)).toEqual(['두 적을', '한 번에 노린다.']);
    expect(splitTwo('모든 길이 한 점으로 모인다.', 101)).toEqual(['모든 길이', '한 점으로 모인다.']);
    expect(pxWidth('개척자 처단', 'g11b')).toBeLessThanOrEqual(CARD_SPEC.cmd.px.name);
  });
});
