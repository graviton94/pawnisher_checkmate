import { describe, expect, it } from 'vitest';
import { ACT_CARD, BOSS_CARD, BOSS_STORY, CROWN_OFF, DEFEAT, ENDING_A, GILDED_STORY, PROLOGUE, promotionCuts, shadowCut, stageProg, trueEndingCuts, type Line, type StoryBoss } from '../src/data/script';
import { companionScene } from '../src/data/companion-scenes';
import { ASCENSION } from '../src/slice/run';
import { textWidth } from '../src/slice/desc';
import { CUT_ROW, cutFill, cutLineHtml, cutPages, cutPieces, cutW, speakerSide } from '../src/slice/uikit';

/**
 * 컷신 자막 띠 (D-397 → D-451): 바이블 컷신은 글자 수 제한이 없다. 띠는 두 줄 그대로 두고 긴 줄은 문장 단위 조각으로 쪽을 넘긴다.
 * 여기서는 ① 모든 조각이 띠 두 줄(가장 좁은 667 화면 기준 CUT_ROW × 2) 안에 들고 ② 조각을 다시 이으면 원래 글이 그대로인지 본다.
 */
const width = (l: Line): number => textWidth(cutFill(l)) + (l.k === 's' && l.who ? [...l.who].length * 0.8 + 0.6 : 0);
/** 한 쪽 = 한 문장 (D-488 #2): 문장이 띠 두 줄 안 · 쉼표에서 쪽을 넘기지 않음 · 조각을 이으면 원문 그대로 */
const check = (where: string, lines: Line[]): void => {
  for (const l of lines) {
    const pieces = cutPieces(l);
    for (const p of pieces) expect.soft(width(p), `${where}: ${p.t}`).toBeLessThanOrEqual(CUT_ROW * 2);
    for (const p of pieces.slice(0, -1)) expect.soft(/[.?!…][」’”』)]*$/.test(p.t), `${where}: 문장 가운데서 쪽이 넘어감 — ${p.t}`).toBe(true);
    expect.soft(pieces.map((p) => p.t).join(' ').replace(/\s+/g, ' '), where).toBe(l.t.replace(/\s+/g, ' '));
  }
  for (const page of cutPages(lines)) {
    expect.soft(page.length, where).toBe(1);
    expect.soft(cutW(page[0]), where).toBeLessThanOrEqual(CUT_ROW * 2);
  }
};
const n = (t: string): Line => ({ k: 'n', t });
const s = (who: string, t: string): Line => ({ k: 's', who, t });
const crew = { alive: [{ name: '삐걱거리는 경첩', t: 'P' as const }, { name: '박차', t: 'N' as const }], promised: { name: '삐걱거리는 경첩', alive: true }, melted: ['구부러진 못', '먼지투성이'] };

describe('컷신 자막 띠 쪽 나누기 (D-451 → D-488)', () => {
  it('쉼표에서 쪽을 넘기지 않는다 — 「…치르게 하고,」 다음 쪽 「끝까지…」 (#2)', () => {
    const ps = cutPieces(n('세 번의 공정을 치르게 하고, 끝까지 살아남은 쪽만 상자에 담긴다. 나머지는 녹는다.'));
    expect(ps.map((p) => p.t)).toEqual(['세 번의 공정을 치르게 하고, 끝까지 살아남은 쪽만 상자에 담긴다.', '나머지는 녹는다.']);
    expect(cutPieces(n('「금단의 승급대」 전설이 돈다.'))).toHaveLength(1);
    expect(cutPieces(n('「킹 누락. 규격 미달 — 폐기 대기」 검수기가 찍었다.'))).toHaveLength(1);
  });
  it('같은 화자가 이어 말하면 이름표는 첫 쪽에만 · 적과 우리 편 이름 색이 다르다 (#22)', () => {
    const pages = cutPages([s('박차', '박차라고 한다. 쇠가 덜 식었을 때 틀에서 뜯어지는 바람에 정품 상자엔 못 들어가고 뒷줄만 맴돌았지.'), s('검수 반장', '불량이다.'), s('박차', '아니.')]);
    expect(pages.map((p) => !!p[0].cont)).toEqual([false, true, false, false]);
    expect(cutLineHtml(pages[1][0])).not.toContain('cl-who');
    expect(cutLineHtml(pages[0][0])).toContain('side-ally');
    expect(cutLineHtml(pages[2][0])).toContain('side-foe');
    expect(speakerSide('도금왕')).toBe('gilded');
  });
  it('긴 서술은 문장 끝에서, 대사는 따옴표를 처음 · 끝 조각에만', () => {
    const long = s('박차', '박차라고 한다. 쇠가 덜 식었을 때 틀에서 뜯어지는 바람에, 태어날 때부터 정품 상자엔 못 들어가고 뒷줄만 맴돌았지.');
    const ps = cutPieces(long);
    expect(ps.length).toBeGreaterThan(1);
    expect(cutFill(ps[0]).startsWith('“')).toBe(true);
    expect(cutFill(ps[0]).endsWith('”')).toBe(false);
    expect(cutFill(ps.at(-1)!).endsWith('”')).toBe(true);
    expect(cutPieces(n('짧은 줄.'))).toHaveLength(1);
  });
  it('짧은 두 문장은 한 쪽에 줄을 바꿔 (D-504 · 사용자 #2) — 「대장!」 한 낱말 쪽이 잇달아 넘어가지 않게', () => {
    const ps = cutPieces(s('박차', '대장! 갑자기 바닥이 열리고 있습니다! 쇠사슬이 우릴 아래로 끌어당기고 있어요!'));
    expect(ps[0].t).toBe('대장!\n갑자기 바닥이 열리고 있습니다!');
    expect(ps.every((p) => p.t.split('\n').length <= 2)).toBe(true);
    expect(cutPieces(n('아… 이것이 왕의 눈인가.'))).toHaveLength(1);
  });
  it('프롤로그 · 그림자 · 엔딩 · 패배 · 동료 장면', () => {
    PROLOGUE.forEach((c) => check(`프롤로그 ${c.img}`, c.lines));
    for (let a = 0; a <= 3; a++) {
      check(`그림자 ${a}`, shadowCut(a, ASCENSION[a].law).lines);
      check(`그림자 재도전 ${a}`, shadowCut(a, undefined, true).lines);
      for (let act = 0; act < 3; act++) companionScene(act, crew.alive, undefined, a).cuts.forEach((c) => check(`동료 ${a}-${act}`, c.lines));
    }
    check('엔딩 A', ENDING_A.lines);
    check('패배', DEFEAT.lines);
    check('왕관', CROWN_OFF.lines);
    trueEndingCuts([], crew).forEach((c) => check(`진 엔딩 ${c.img}`, c.lines));
  });
  it('왕이 된 결말 — 승천마다 조항 · 반장 거울', () => {
    for (let a = 0; a < 4; a++)
      for (const r of Object.keys(BOSS_STORY) as StoryBoss[]) promotionCuts(a, '', ASCENSION[a].law, BOSS_STORY[r].mirror, crew).forEach((c) => check(`왕 ${a} ${c.img}`, c.lines));
  });
  it('반장 격파 컷 · 도금왕 2단계 · 반장 등장 띠', () => {
    for (const [r, st] of Object.entries(BOSS_STORY)) {
      check(`격파 ${r}`, [...st.fall.split('\n').map(n), s(st.name, st.temptation), s('종이왕', st.reply)]);
      check(`비꼼 ${r}`, [s('도금왕', st.mock)]);
    }
    for (let nth = 1; nth <= 3; nth++) for (let a = 0; a < 4; a++) check(`속마음 ${nth}-${a}`, [{ k: 'm', t: stageProg(nth, a) }]);
    for (const a of [0, 1]) check(`도금왕 2단계 ${a}`, [...GILDED_STORY.phase2(a).split('\n'), GILDED_STORY.phase2End].map((t) => s('도금왕', t)));
    for (const [r, c] of Object.entries(BOSS_CARD)) {
      expect.soft(c.length, r).toBeLessThanOrEqual(2);
      check(`등장 ${r}`, c);
    }
  });
  it('막 카드: 서술 한 줄 + 속마음 한 줄', () => {
    ACT_CARD.forEach((t, i) => {
      const ls = t.split('\n');
      expect.soft(ls.length, `막 ${i}`).toBe(2);
      check(`막 ${i}`, ls.map(n));
    });
  });
});

describe('꾸밈말 줄 끝 홀로 금지 (#2 · D-488)', () => {
  it('「옛 상처들」 · 「우리 모두」는 줄바꿈 없는 빈칸으로 묶인다', async () => {
    const { bindModifiers } = await import('../src/slice/uikit');
    expect(bindModifiers('깊게 패인 옛 상처들이')).toBe('깊게 패인 옛 상처들이');
    expect(bindModifiers('이 상자의 우리 모두가 산다.')).toBe('이 상자의 우리 모두가 산다.');
    expect(bindModifiers('상처가 이 정도다.')).toBe('상처가 이 정도다.');
  });
});
