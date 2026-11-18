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
 *  - s(작은 카드, 폭 150 ~ 183px): 묘사 · [능력명] 갈무리11 12px, 조건 · 효과 갈무리9 10px(D-511 카드 맞춤 예외 그대로), 행 12px · 점선 2px = 62px(150px 칸 62.5).
 *    폭 166px 이상(덱 · 분대 · 작업대 168)은 행 13px · 점선 칸 4px(69px) — 글 · 예산은 같다(CSS만, `slice.css` D-589).
 *  - l(큰 카드, 폭 184px 이상 — 915 고물상 · 전리품, PC): 모든 줄 갈무리11 12px(효과 숫자 굵게), 행 14px · 점선 칸 4px(2px 선 + 위아래 1px) = 74px(184px 칸 76.7).
 * 15px 본문(갈무리14)은 행이 18px라 다섯 행이 92px — 190px 카드 공통 칸(79px)에 들지 않는다. 그래서 큰 카드도 12px(보조 크기)에서 행 간격과 행 폭(글자 수)만 넓힌다.
 */
export const CARD_TIERS = {
  s: { minW: 150, pitch: 12, rule: 2 },
  l: { minW: 184, pitch: 14, rule: 4 },
} as const;
export type CardTier = keyof typeof CARD_TIERS;

/**
 * 아직 카드에 올리지 않는 묘사 (사용자 승인 대기, D-589): 부품 flavor · 시작 세트 line은 데이터에 있지만 카드 설명지에 오른 적이 없다.
 * 올리면 작은 카드에서 부품 18장 · 세트 1장이 두 행을 넘는다(재고 보고서 「다듬을 문구」) — 문구가 승인되면 true로 바꾼다. 그때까지 묘사 칸은 비워 자리만 지킨다.
 */
export const FLAVOR_ON_CARD = { part: false, set: false } as const;

/**
 * 예산을 넘어 문구 승인을 기다리는 카드 (D-589 — `docs/reports/2026-11-18-card-text-grammar.md` 「다듬을 문구」).
 * 지금은 모두 「묘사를 카드에 올리면」 작은 카드(150px) 두 행을 넘는 부품 flavor · 세트 line이다(FLAVOR_ON_CARD가 꺼져 있어 화면은 넘치지 않는다).
 * 승인된 문구로 바꾸면 여기서 지운다 — 테스트가 목록이 낡았는지(이미 들어가는데 남아 있음 · 새로 넘치는데 빠짐) 알린다.
 */
export const CARD_TEXT_PENDING: readonly string[] = [
  'part:relaySeal', 'part:sharedPlate', 'part:lastBreath', 'part:ledger', 'part:heavyHand', 'part:scarPlate', 'part:oath', 'part:assembly', 'part:bloodPact',
  'part:greed', 'part:thickWall', 'part:rosary', 'part:firstSpring', 'part:lastAxle', 'part:afterheat', 'part:royalSeal', 'part:flywheel', 'part:redLine', 'set:scatter',
];

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
