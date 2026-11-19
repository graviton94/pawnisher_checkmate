import { describe, expect, it } from 'vitest';
import { allCardTexts, cardKey, cardRows, CARD_SPEC, specOver, type CardNature, type CardText } from '../src/slice/card-spec';
import { budgetOver, cardTextHtml, fxHtml, numRole, ROW_FONT, rowPx } from '../src/slice/card-text';
import { CARD_TEXT_GRID, CARD_TEXT_PENDING, CARD_TIERS, FLAVOR_ON_CARD, cardGridH, parseCardText } from '../src/data/card-text';
import { CARD_W } from '../src/slice/uikit';
import { COMMANDS } from '../src/slice/cards';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { START_SETS, type StartSetId } from '../src/data/start-sets';
import { pxWidth, splitTwo } from '../src/slice/desc';

/**
 * 카드 글 문법 통일 (사용자 결정 D-589 — D-515 · D-511 · D-422): 모든 카드 성격의 글은 묘사 · [능력명] · 조건 · 효과 세 칸, 그리기 하나.
 * 예산: 묘사 2행 · 아래 칸 3행 — 작은 단(150px, 조건/효과 갈무리9 10px) · 큰 단(188px, 모든 줄 갈무리11 12px) 모두. 새 카드가 넘치면 여기서 깨진다.
 * 넘치면 문구를 다듬는다(사용자 승인 — 승인 전엔 CARD_TEXT_PENDING에 올린다). 말줄임 · 잘라내기 · 글자 줄이기 금지(D-422).
 */
const all = allCardTexts();
const tiers = Object.keys(CARD_TIERS) as (keyof typeof CARD_TIERS)[];

describe('카드 글 예산 (D-589)', () => {
  it('데이터 전수를 잰다 — 명령(+ · ~ 포함) · 부품 · 손질 · 부적 · 분대원(이름 · 영입 · 기벽 · 이형 · 킹 · 흉터) · 시작 세트', () => {
    const n = (k: CardNature) => all.filter((c) => c.nature === k).length;
    expect(n('cmd')).toBe(Object.keys(COMMANDS).length);
    expect(n('part')).toBe(Object.keys(SLICE_PARTS).length);
    expect(all.length).toBeGreaterThan(387);
    for (const k of Object.keys(CARD_SPEC) as CardNature[]) expect(n(k)).toBeGreaterThan(0);
  });
  for (const k of Object.keys(CARD_SPEC) as CardNature[])
    for (const t of tiers)
      it(`${CARD_SPEC[k].label} · ${t === 's' ? '작은' : '큰'} 단: 묘사 2행 · 아래 칸 3행 · 행 폭 안 (승인 대기 제외)`, () => {
        expect(all.filter((c) => c.nature === k && !CARD_TEXT_PENDING.includes(cardKey(c))).flatMap((c) => specOver(c, t).map((b) => `${c.id}: ${b}`))).toEqual([]);
      });
  it('승인 대기 목록은 낡지 않았다 — 묘사를 카드에 올렸을 때 넘치는 카드와 정확히 같다 (부품 flavor · 세트 line)', () => {
    const withFlavor = (c: CardText): CardText =>
      c.nature === 'part' && !FLAVOR_ON_CARD.part ? { ...c, slots: { ...c.slots, flavor: SLICE_PARTS[c.id as SlicePartId].flavor ?? '' } }
        : c.nature === 'set' && !FLAVOR_ON_CARD.set ? { ...c, slots: { ...c.slots, flavor: START_SETS[c.id as StartSetId].line } } : c;
    const over = all.map(withFlavor).filter((c) => tiers.some((t) => specOver(c, t).length)).map(cardKey);
    // 보고 (승인 대기 — 테스트를 깨지 않는다)
    console.info(`카드 글 승인 대기 ${CARD_TEXT_PENDING.length}장: ${CARD_TEXT_PENDING.join(' · ')}`);
    expect(over.sort()).toEqual([...CARD_TEXT_PENDING].sort());
  });
  it('줄 역할마다 글꼴은 단마다 하나 — 작은 단 조건 · 효과 갈무리9 10px(D-511), 큰 단은 모두 갈무리11 12px(D-213)', () => {
    expect(ROW_FONT.s).toEqual({ say: 'g11', name: 'g11b', if: 'g9', fx: 'g9' });
    expect(ROW_FONT.l).toEqual({ say: 'g11', name: 'g11b', if: 'g11', fx: 'g11' });
  });
  it('설명지 세로 격자가 공통 칸(카드 높이 59.5 ~ 87.3%) 안 — 격자마다 가장 작은 카드에서 (D-594)', () => {
    for (const g of CARD_TEXT_GRID) expect(cardGridH(g), `from ${g.from}`).toBeLessThanOrEqual(g.from * 1.5 * (0.87302 - 0.59524));
    // 카드 폭 하한(도트 정수배 뒤)이 첫 격자의 시작 폭과 같다 · 큰 단 격자는 큰 단 하한에서 시작
    expect(CARD_W.min).toBe(CARD_TEXT_GRID[0].from);
    expect(CARD_TEXT_GRID.some((g) => g.from === CARD_W.crisp)).toBe(true);
    expect(CARD_TEXT_GRID.at(-1)!.from).toBe(CARD_TIERS.l.minW);
  });
  it('묘사 두 줄 · 점선 위아래에 틈이 있다 — 줄이 붙거나 점선에 닿지 않는다 (D-594)', () => {
    for (const g of CARD_TEXT_GRID) {
      expect(g.flavorGap).toBeGreaterThanOrEqual(2);
      expect(g.ruleAbove).toBeGreaterThanOrEqual(g.from >= CARD_W.crisp ? 2 : 1);
      expect(g.ruleBelow).toBeGreaterThanOrEqual(g.from >= CARD_W.crisp ? 2 : 1);
      expect(g.line).toBeGreaterThanOrEqual(12);
      expect(g.name).toBeGreaterThanOrEqual(12);
    }
  });
  it('행 폭: 큰 단은 작은 단보다 넓고, 성격마다 틀 비율 × 단의 가장 작은 폭', () => {
    for (const k of Object.keys(CARD_SPEC) as CardNature[]) expect(rowPx(k, 'l')).toBeGreaterThan(rowPx(k, 's'));
    expect(rowPx('cmd', 's')).toBe(103);
  });
});

/** 문법 (D-589 · D-422): [능력명] / 조건 / : 효과 × voice ⑥ 「비장한 한 문장 + (수치)」 — 모든 성격 같은 꼴 */
describe('카드 글 문법 (D-589)', () => {
  it('글은 한 꼴 — 옛 문법 「묘사. (효과 — 조건)」을 글자 그대로 세 칸으로', () => {
    expect(parseCardText('첫 적을 꿰뚫는다. (뒤의 적도 피해 — 첫 적을 치면)')).toEqual({ flavor: '첫 적을 꿰뚫는다.', title: '', cond: ['첫 적을 치면'], effect: ['뒤의 적도 피해'] });
    // 조건 없는 효과 하나가 한 행보다 길면 「…하면」 앞을 조건으로 뗀다(D-377) — 짧으면 한 행 그대로
    expect(parseCardText('심판받은 자는 둘로 센다. (처치하면 연쇄 +2)').effect).toEqual(['처치하면 연쇄 +2']);
    expect(parseCardText('빛이 갈라진다. (처치하면 다음 카드 태엽 −1)')).toEqual({ flavor: '빛이 갈라진다.', title: '', cond: ['처치하면'], effect: ['다음 카드 태엽 −1'] });
  });
  for (const t of tiers)
    it(`아래 칸 순서: [능력명] → 조건 → 효과, 조건 아래 첫 효과만 「: 」 (${t})`, () => {
      const bad = all.filter((c) => {
        const ks = cardRows(c, t).bot.map((r) => r.k).join('');
        if (!/^(name)?(if)*(fx)*$/.test(ks.replace(/name/g, 'name'))) return true;
        const b = cardRows(c, t).bot, fx = b.filter((r) => r.k === 'fx');
        const hasIf = b.some((r) => r.k === 'if');
        return hasIf && fx.length ? !fx[0].t.startsWith(': ') || fx.slice(1).some((r) => r.t.startsWith(': ')) : fx.some((r) => r.t.startsWith(': '));
      });
      expect(bad.map((c) => `${c.id}: ${cardRows(c, t).bot.map((r) => r.t).join(' / ')}`)).toEqual([]);
    });
  it('명령 · 손질 · 부적 카드는 효과가 하나 이상, 묘사는 마침표로 끝나는 한 문장 (영입 첫마디도)', () => {
    const bad = all.filter((c) => ['cmd', 'svc', 'charm'].includes(c.nature) || c.id.startsWith('영입:')).filter((c) => {
      const say = c.slots.flavor;
      return !say || !/[.]$/.test(say) || /[.!?] /.test(say) || (c.nature !== 'crew' && !c.slots.effect.length);
    });
    expect(bad.map((c) => c.id)).toEqual([]);
  });
  it('조건 · 효과 행은 마침표 없는 명사구, 말줄임 없음', () => {
    expect(all.flatMap((c) => cardRows(c, 's').bot.filter((r) => (r.k === 'if' || r.k === 'fx') && /[.…]$/.test(r.t) && !c.id.startsWith('흉터:')).map((r) => `${c.id}: ${r.t}`))).toEqual([]);
  });
  it('묘사 줄은 「한 / 번」 · 「쓰러뜨린 / 자」처럼 꾸밈말과 의존 명사 사이에서 꺾이지 않는다', () => {
    expect(splitTwo('두 적을 한 번에 노린다.', 101)).toEqual(['두 적을', '한 번에 노린다.']);
    expect(splitTwo('모든 길이 한 점으로 모인다.', 101)).toEqual(['모든 길이', '한 점으로 모인다.']);
    expect(pxWidth('개척자 처단', 'g11b')).toBeLessThanOrEqual(CARD_SPEC.cmd.px.name);
  });
});

describe('카드 설명지 그리기 하나 (D-589)', () => {
  it('두 단을 함께 내고, 위 칸 · 점선 · 아래 칸 자리가 늘 있다 (빈 칸도)', () => {
    const h = cardTextHtml({ flavor: '', title: '', cond: ['장착 중'], effect: ['공격 +6'] }, 'part');
    expect(h.match(/class="ct ct-(s|l)"/g)).toHaveLength(2);
    expect(h.match(/ct-top/g)).toHaveLength(2);
    expect(h.match(/ct-rule/g)).toHaveLength(2);
  });
  it('큰 단 예산을 넘는 글은 작은 단 글 하나만 (ct-all) — 어느 크기에서도 잘리지 않는다', () => {
    const long = { flavor: '', title: '', cond: [], effect: ['아주 긴 효과 문구가 한 행을 훌쩍 넘는다'] };
    expect(budgetOver(long, 'cmd', 'l').length).toBeGreaterThan(0);
    expect(cardTextHtml(long, 'cmd')).toMatch(/class="ct ct-s ct-all"/);
  });
  it('효과 숫자는 굵게 + 색 역할: 피해 · 공격 · 손실 진홍 · 이득 초록 · 그 밖 황동', () => {
    expect(numRole('피해 ×1.6')).toBe('hit');
    expect(numRole('방열판 +20')).toBe('gain');
    expect(numRole('태엽 −1')).toBe('gain');
    expect(numRole('턴마다 킹 −4')).toBe('hit');
    expect(numRole('맞은 적 뒤로 1칸')).toBe('etc');
    expect(fxHtml('연쇄 +1 · 카드 1장 뽑기')).toBe('연쇄 <b class="n n-gain">+1</b> · 카드 <b class="n n-etc">1</b>장 뽑기');
  });
});
