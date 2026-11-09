import { describe, expect, it } from 'vitest';
import { ACT_CARD, BOSS_CARD, BOSS_STORY, CROWN_OFF, DEFEAT, ENDING_A, FINALE, GILDED_STORY, PROLOGUE, promotionCuts, shadowCut, trueEndingCuts, CUT_TEXT_BUDGET as B, type Line, type StoryBoss } from '../src/data/script';
import { ASCENSION } from '../src/slice/run';
import { textWidth } from '../src/slice/desc';

/**
 * 컷신 자막 띠 `.cut-sub` 글 예산 (D-397, 보고서 2026-11-09f 3.10): 한 쪽 = 줄 두 개, 줄마다 띠 한 줄(15px) 안.
 * 가장 좁은 띠(667×375 — 화면 폭 − 32 − 띠 끝 장식 둘 − ▼ 자리 ≈ 450px)에서도 줄이 접히지 않게 줄마다 한글 30자 폭 안.
 * 대사는 이름(12px 굵게)과 따옴표 몫을 더해 잰다.
 */
const width = (l: Line): number => textWidth(l.k === 's' ? `“${l.t}”` : l.k === 'm' ? `‘${l.t}’` : l.t) + (l.k === 's' && l.who ? [...l.who].length * 0.8 + 0.6 : 0);
const check = (where: string, lines: Line[]): void => {
  for (const l of lines) expect.soft(width(l), `${where}: ${l.t}`).toBeLessThanOrEqual(B.line);
};
const n = (t: string): Line => ({ k: 'n', t });
const s = (who: string, t: string): Line => ({ k: 's', who, t });

describe('컷신 자막 띠 글 예산 (D-397)', () => {
  it('프롤로그 · 그림자 · 엔딩 · 패배 · 왕관 벗기', () => {
    PROLOGUE.forEach((c) => check(`프롤로그 ${c.img}`, c.lines));
    for (let a = 0; a <= 13; a++) check(`그림자 ${a}`, shadowCut(a).lines);
    check('엔딩 A', ENDING_A.lines);
    check('패배', DEFEAT.lines);
    check('왕관', CROWN_OFF.lines);
    trueEndingCuts([]).forEach((c) => check(`진 엔딩 ${c.img}`, c.lines));
  });
  it('승급 7컷 — 승급마다 조항 · 반장 거울 · 분대원 이름까지', () => {
    for (let a = 0; a < ASCENSION.length; a++)
      for (const r of Object.keys(BOSS_STORY) as StoryBoss[]) promotionCuts(a, '구부러진 못', ASCENSION[a].law, BOSS_STORY[r].mirror).forEach((c) => check(`승급 ${a} ${c.img}`, c.lines));
  });
  it('반장 격파 컷 · 도금왕 2단계 · 반장 등장 띠', () => {
    for (const [r, st] of Object.entries(BOSS_STORY)) {
      check(`격파 ${r}`, [...st.fall.split('\n').map(n), ...st.reply.split('\n').map((t) => s('종이왕', t))]);
      check(`비꼼 ${r}`, st.mock.split('\n').map((t) => s('도금왕', t)));
    }
    for (const a of [0, 1]) check(`도금왕 2단계 ${a}`, [...GILDED_STORY.phase2(a).split('\n'), GILDED_STORY.phase2End].map((t) => s('도금왕', t)));
    for (const [r, c] of Object.entries(BOSS_CARD)) {
      expect.soft(c.length, r).toBeLessThanOrEqual(2);
      check(`등장 ${r}`, c);
    }
  });
  it('최종장 · 막 카드', () => {
    check('최종장', [...FINALE.walk, ...FINALE.taunt, ...FINALE.back, ...FINALE.stunned]);
    ACT_CARD.forEach((t, i) => {
      const ls = t.split('\n');
      expect.soft(ls.length, `막 ${i}`).toBe(2);
      check(`막 ${i}`, ls.map(n));
    });
  });
});
