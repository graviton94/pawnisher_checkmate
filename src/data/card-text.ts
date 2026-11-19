/**
 * 카드 글 문법 (사용자 결정 D-589 — D-515 · D-422 · D-511을 한 꼴로): 모든 카드 성격(명령 · 부품 · 부적 · 손질 · 분대원 · 시작 세트)의 글은 같은 세 칸이다.
 *
 *   명판(이름 + 비용 톱니) → 그림 창 → 꼬리표 줄 → 설명지 ① 묘사(최대 2행) → 점선 → ② 조건 → ③ 효과 ; 소유 · 맞물림 수는 카드 밖 받침 줄.
 *
 * 데이터 꼴은 하나 — `CardTextSlots`. 글자는 각 카드의 정본 데이터(`src/slice/cards.ts` desc 「묘사. (효과 — 조건)」, `parts.ts` flavor + desc 「효과 — 조건」,
 * `hud.ts` SERVICE_CARDS, `crew.ts` QUIRKS · SCAR_DESC, `forms.ts`, `start-sets.ts` rows)에 그대로 있고, `src/slice/card-text.ts`가 이 꼴로 읽는다(글자는 바꾸지 않는다).
 * 화면 규격 · 예산 = `CARD_TEXT_BUDGET`, 검사 = `tests/card-spec.test.ts`, 전수 표 = `npx jiti tools/card-text-fit.ts`.
 */
export interface CardTextSlots {
  /** ① 묘사 — 비장한 한 문장(설명지 위 칸, 최대 2행). 없으면 '' — 자리는 비워 둔다 */
  flavor: string;
  /** [능력명] 줄 — 분대원 기벽 · 이형 · 킹 · 흉터, 시작 세트 구성(D-422 첫 줄). 없으면 '' */
  title: string;
  /** ② 조건 — 「 : 」 앞까지(…하면 · …때 · 장착 중). 항목 하나 = 한 행, 길면 쉼표 뒤에서 두 행 */
  cond: string[];
  /** ③ 효과 — 항목 하나 = 한 행. 조건이 있으면 첫 효과 행에 화면이 「: 」를 붙인다 */
  effect: string[];
}

/** 설명지 예산 (D-589): 묘사 2행 · 아래 칸([능력명] + 조건 + 효과) 3행 — 넘치면 문구를 다듬는다(글자 축소 · 잘라내기 금지) */
export const CARD_TEXT_BUDGET = { flavor: 2, bottom: 3 } as const;

/**
 * 설명지 글 크기 두 단 (D-589 — D-213 격자 안). 설명지 격자 = 위 칸 2행 · 점선 · 아래 칸 3행, 모든 틀이 담는 공통 칸(카드 높이 59.5 ~ 87.3% = 폭 × 0.4167) 안.
 *  - s(작은 카드, 폭 150 ~ 183px): 묘사 · [능력명] 갈무리11 12px, 조건 · 효과 갈무리9 10px(D-511 카드 맞춤 예외 그대로). 행 폭 예산은 150px로 잰다(보수적).
 *  - l(큰 카드, 폭 184px 이상 — 915 고물상 · 전리품, PC): 모든 줄 갈무리11 12px(효과 숫자 굵게).
 * 15px 본문(갈무리14)은 행이 18px라 다섯 행이 92px — 190px 카드 공통 칸(79px)에 들지 않는다. 그래서 큰 카드도 12px(보조 크기)에서 행 간격과 행 폭(글자 수)만 넓힌다.
 */
export const CARD_TIERS = {
  s: { minW: 150 },
  l: { minW: 184 },
} as const;
/**
 * 설명지 세로 격자 (D-594 — 실기기: 점선 아래 줄이 점선에 닿고, 두 줄 묘사가 서로 붙었다. D-589의 행 12 · 13 · 14px 고른 격자를 대신한다).
 * 카드 폭 from(px) 이상에서 쓰는 값 — 묘사 행(line) 두 줄 사이 틈(flavorGap) · 점선(2px) 위아래 틈(ruleAbove · ruleBelow) · [능력명] 행(name) · 조건/효과 행(row).
 * 합(높이) = 2 × line + flavorGap + ruleAbove + 2 + ruleBelow + name + 2 × row 가 그 폭의 공통 칸(폭 × 0.4167) 안 (tests/card-spec.test.ts).
 * 카드 폭은 도트 정수배로 맞춘다(uikit.fitSlots, D-594 — 915 160 · 667 · 772 168 · 큰 줄 184 이상). 정수배가 높이에 들지 않는 줄만 150 ~ 159(첫 격자 — 틈 1px).
 */
export const CARD_TEXT_GRID = [
  { from: 150, line: 12, flavorGap: 2, ruleAbove: 1, ruleBelow: 1, name: 12, row: 10 },
  { from: 160, line: 12, flavorGap: 2, ruleAbove: 2, ruleBelow: 2, name: 12, row: 11 },
  { from: 166, line: 12, flavorGap: 2, ruleAbove: 2, ruleBelow: 2, name: 12, row: 12 },
  { from: 184, line: 12, flavorGap: 3, ruleAbove: 3, ruleBelow: 3, name: 13, row: 13 },
] as const;
/**
 * 덧 격자 (D-669, slice.css 같은 값): ① 150px 아래 카드(사건 결과 1박 작은 분대원 · 명령 카드 — 772×360에서 138px)는 묘사 틈 1 · [능력명] 11,
 * 칸은 종이 끝까지(분대원 71 ~ 110 · 명령 74 ~ 111도트) ② 시작 세트는 압정(71 ~ 75도트) 아래로 칸을 76 ~ 110도트로 내리고 166px 아래에서 조건/효과 행 10 · 168px 아래 11
 * (160 아래는 틈 1 · 점선 틈 1 · [능력명] 11). `box` = 칸 높이(카드 도트 — 카드 84도트 폭 기준).
 */
export const CARD_TEXT_GRID_EXTRA = {
  small: { below: 150, line: 12, flavorGap: 1, ruleAbove: 1, ruleBelow: 1, name: 11, row: 10, box: { crew: 39, cmd: 37 } },
  set: { box: 34, grids: [
    { from: 150, line: 12, flavorGap: 1, ruleAbove: 1, ruleBelow: 1, name: 11, row: 10 },
    { from: 160, line: 12, flavorGap: 2, ruleAbove: 2, ruleBelow: 2, name: 12, row: 10 },
    { from: 166, line: 12, flavorGap: 2, ruleAbove: 2, ruleBelow: 2, name: 12, row: 11 },
    { from: 168, line: 12, flavorGap: 2, ruleAbove: 2, ruleBelow: 2, name: 12, row: 12 },
    { from: 184, line: 12, flavorGap: 3, ruleAbove: 3, ruleBelow: 3, name: 13, row: 13 },
  ] },
} as const;
/** 세로 격자 한 벌의 높이 (px) */
export const cardGridH = (g: { line: number; flavorGap: number; ruleAbove: number; ruleBelow: number; name: number; row: number }): number => 2 * g.line + g.flavorGap + g.ruleAbove + 2 + g.ruleBelow + g.name + 2 * g.row;
export type CardTier = keyof typeof CARD_TIERS;

/**
 * 부품 · 시작 세트 묘사를 카드 설명지 ① 칸에 올린다 (D-589 → 사용자 승인 D-590): 부품 flavor · 세트 line을 우리 세계 투(짧고 무겁게)로 다시 쓰고 켰다.
 * 세트 line은 카드 묘사로 옮겨 세트 고르기 받침 줄에서는 뺐다(같은 글이 두 번 나오지 않게 — `main.ts` setPick).
 */
export const FLAVOR_ON_CARD = { part: true, set: true } as const;

/**
 * 예산을 넘어 문구 승인을 기다리는 카드 (D-589 — `docs/reports/2026-11-18-card-text-grammar.md` 「다듬을 문구」).
 * D-590으로 19장 문구를 바꿔 비었다. 새로 넘치는 카드가 생기면 여기에 올리고 문구를 다듬는다 — 테스트가 목록이 낡았는지(이미 들어가는데 남아 있음 · 새로 넘치는데 빠짐) 알린다.
 */
export const CARD_TEXT_PENDING: readonly string[] = [];

/** 글 폭 어림(한글 1칸 — `desc.ts` textWidth와 같은 셈): 짧은 「…하면 효과」는 한 행 그대로 둔다(D-377) */
const hanWidth = (s: string): number =>
  [...s].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 1 : ch === ' ' || ch === '\u00a0' ? 0.35 : /[×−—·→「」]/.test(ch) ? 0.9 : 0.6), 0);

/**
 * 옛 글 문법 「묘사. (효과 — 조건)」 · flavor + 「효과 — 조건」을 세 칸으로 나눈다 (글자는 그대로).
 * 효과 · 조건은 「 · 」 항목으로 나눈다. 조건이 없고 효과가 하나뿐이며 「…하면 · …때 · …마다」로 시작하면 그 앞을 조건으로 뗀다(D-377).
 */
export const parseCardText = (text: string, flavor?: string): CardTextSlots => {
  const t = text.trim();
  let say = '', fx = '', cond = '';
  if (flavor !== undefined) {
    const [a, ...rest] = t.replace(/\.$/, '').split(' — ');
    say = flavor; fx = a.trim(); cond = rest.join(' — ').trim();
  } else {
    const m = t.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (!m) say = t;
    else {
      const [a, ...rest] = m[2].split(' — ');
      say = m[1].trim(); fx = a.trim(); cond = rest.join(' — ').trim();
    }
  }
  let effect = fx ? fx.split(' · ') : [];
  let conds = cond ? cond.split(' · ') : [];
  if (!conds.length && effect.length === 1) {
    const c = effect[0].match(/^(.+?(?:면|때|마다|시작에|끝에)) (.+)$/);
    if (c && hanWidth(effect[0]) > 8.5) { conds = [c[1]]; effect = [c[2]]; }
  }
  return { flavor: say, title: '', cond: conds, effect };
};
