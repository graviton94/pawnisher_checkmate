/**
 * 카드 글 한 벌 (사용자 결정 D-589 — 카드 글 문법 통일): 모든 카드 성격의 글을 같은 세 칸(`CardTextSlots`)으로 읽고, 같은 그리기 하나로 설명지에 놓는다.
 *
 *  - 읽기: `cmdText` · `partText` · `svcText` · `charmText` · `crewText` · `setText` — 정본 데이터의 글자를 그대로 세 칸에 나눈다.
 *  - 줄 짓기: `layoutCard` — 묘사는 두 행까지(고른 자리), 아래 칸은 [능력명] · 조건 행 · 효과 항목 하나 = 한 행, 합 세 행(D-515 쌓기).
 *  - 예산: `budgetOver` — 단(s · l)마다 행 수 · 행 폭(글꼴 실폭). 넘치면 문구를 다듬는다(사용자 승인, D-589) — 글자를 줄이거나 자르지 않는다.
 *  - 그리기: `cardTextHtml` — 두 단을 함께 내고 CSS 컨테이너 질의(카드 폭 184px)가 하나를 보인다. 큰 단 예산을 넘는 카드는 작은 단 글을 그대로 쓴다.
 * 줄 종류마다 모양은 하나(`slice.css` D-589 블록): 묘사 보통 · 옅은 먹 / [능력명] 굵게 / 조건 보통 먹 / 효과 짙은 먹 + 숫자 굵게 · 색 역할(피해 · 손실 진홍 · 이득 초록 · 그 밖 황동).
 */
import { CARD_TEXT_BUDGET, CARD_TIERS, FLAVOR_ON_CARD, parseCardText, type CardTextSlots, type CardTier } from '../data/card-text';
import { CARD_FRAME_FRAC } from '../data/card-frames';
import { SERVICE_CARDS } from '../data/hud';
import { FORMS } from '../data/forms';
import { START_SETS, type StartSetId } from '../data/start-sets';
import { partSummaryText } from '../data/ability-text';
import { baseOf, COMMANDS, type CommandId } from './cards';
import { CHARMS, SLICE_PARTS, type SlicePartId } from './parts';
import { QUIRKS, SCAR_DESC, type QuirkId } from './crew';
import { pxWidth, splitTwo, type CardFont } from './desc';

/** 카드 성격 (화면의 카드 틀 여섯) */
export type CardNature = 'cmd' | 'part' | 'svc' | 'charm' | 'crew' | 'set';
/** 설명지 한 행의 역할: 묘사 · [능력명] · 조건 · 효과 */
export type RowKind = 'say' | 'name' | 'if' | 'fx';
export interface Row { t: string; k: RowKind }

/** 성격 → 틀 칸 비율(부적은 부품 틀) */
const FRAME_OF: Record<CardNature, keyof typeof CARD_FRAME_FRAC> = { cmd: 'cmd', part: 'part', svc: 'svc', charm: 'part', crew: 'crew', set: 'set' };
/** 단마다 줄 역할의 글꼴 (D-213 · D-511 · D-589) — 큰 단 효과 숫자는 굵게(`rowWidth`가 따로 잰다) */
export const ROW_FONT: Record<CardTier, Record<RowKind, CardFont>> = {
  s: { say: 'g11', name: 'g11b', if: 'g9', fx: 'g9' },
  l: { say: 'g11', name: 'g11b', if: 'g11', fx: 'g11' },
};
/** 설명지 한 행 폭(px) = 틀 비율 × 그 단의 가장 작은 카드 폭 (내림) */
export const rowPx = (n: CardNature, tier: CardTier): number => Math.floor(CARD_FRAME_FRAC[FRAME_OF[n]].row * CARD_TIERS[tier].minW);

/** 효과 숫자 (부호 · 배수 · 백분율 포함) */
const NUM = /([+×−]?\d+(?:\.\d+)?%?)/;
/** 한 행의 화면 폭 — 큰 단 효과 행은 숫자만 굵게 */
export const rowWidth = (t: string, k: RowKind, tier: CardTier): number =>
  tier === 'l' && k === 'fx' ? t.split(NUM).reduce((a, s, i) => a + pxWidth(s, i % 2 ? 'g11b' : 'g11'), 0) : pxWidth(t, ROW_FONT[tier][k]);

/**
 * 효과 숫자 색 역할 (D-589): 피해 · 공격 · 폭발과 손실(−, 값 오름) = 진홍 · 이득(+ · 배수 · 태엽 줄임) = 초록 · 그 밖(칸 · 장 · 횟수) = 황동.
 * 색만으로 가르지 않는다 — 숫자는 굵게, 부호(+ · − · ×)가 함께 말한다.
 */
export const numRole = (item: string): 'hit' | 'gain' | 'etc' => {
  if (/피해|공격|폭발/.test(item)) return 'hit';
  if (/태엽\s*−/.test(item)) return 'gain';
  if (/−|값 \+/.test(item)) return 'hit';
  if (/\+|×|가득/.test(item)) return 'gain';
  return 'etc';
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 효과 행 HTML: 항목(「 · 」)마다 숫자 역할 색 + 굵게 */
export const fxHtml = (t: string): string =>
  t.split(/( · )/).map((item) => (item === ' · ' ? item : item.split(NUM).map((s, i) => (i % 2 ? `<b class="n n-${numRole(item)}">${esc(s)}</b>` : esc(s))).join(''))).join('');

/** 조건 행 하나가 넘치면: 쉼표 뒤에서 두 행, 쉼표가 없으면 고른 빈칸에서 두 행 (D-475 · D-515) */
const condRows = (c: string, px: number, tier: CardTier): string[] => {
  if (rowWidth(c, 'if', tier) <= px) return [c];
  const comma = c.indexOf(', ');
  return comma > 0 ? [c.slice(0, comma + 1), c.slice(comma + 2)] : splitTwo(c, px, ROW_FONT[tier].if);
};

/**
 * 설명지 줄 짓기 (D-589): 위 칸 = 묘사(두 행까지), 아래 칸 = [능력명] → 조건 행 → 효과 항목 하나 = 한 행, 합 세 행.
 * 자리가 모자라면 조건은 둘째 행에, 효과는 마지막 행에 「 · 」로 잇는다(D-515). 조건 아래 첫 효과 행은 「: 」로 시작한다(D-422).
 */
export const layoutCard = (s: CardTextSlots, n: CardNature, tier: CardTier): { top: string[]; bot: Row[] } => {
  const px = rowPx(n, tier);
  const top = s.flavor ? splitTwo(s.flavor, px, ROW_FONT[tier].say) : [];
  const room = CARD_TEXT_BUDGET.bottom - (s.title ? 1 : 0);
  const conds = s.cond.filter(Boolean).flatMap((c) => condRows(c, px, tier));
  if (conds.length + Math.min(s.effect.length, 1) > room && conds.length > 1) conds.splice(room - 1, conds.length, conds.slice(room - 1).join(' · '));
  let items = [...s.effect];
  const slots = Math.max(1, room - conds.length);
  if (items.length > slots) items = [...items.slice(0, slots - 1), items.slice(slots - 1).join(' · ')];
  const bot: Row[] = [...(s.title ? [{ t: s.title, k: 'name' as const }] : []), ...conds.map((t) => ({ t, k: 'if' as const }))];
  items.forEach((t, i) => bot.push({ t: i === 0 && conds.length && !t.startsWith(': ') ? `: ${t}` : t, k: 'fx' }));
  return { top, bot };
};

/** 예산 넘침 (D-589): 묘사 2행 · 아래 칸 3행 · 행마다 그 단의 행 폭 안 */
export const budgetOver = (s: CardTextSlots, n: CardNature, tier: CardTier): string[] => {
  const { top, bot } = layoutCard(s, n, tier);
  const px = rowPx(n, tier);
  const bad: string[] = [];
  if (top.length > CARD_TEXT_BUDGET.flavor) bad.push(`묘사 ${top.length}행 > ${CARD_TEXT_BUDGET.flavor}`);
  if (bot.length > CARD_TEXT_BUDGET.bottom) bad.push(`아래 칸 ${bot.length}행 > ${CARD_TEXT_BUDGET.bottom}`);
  for (const t of top) { const w = rowWidth(t, 'say', tier); if (w > px) bad.push(`묘사 「${t}」 ${w}/${px}px`); }
  for (const r of bot) { const w = rowWidth(r.t, r.k, tier); if (w > px) bad.push(`${r.k} 「${r.t}」 ${w}/${px}px`); }
  return bad;
};

const rowHtml = (r: Row): string => `<span class="ln ln-${r.k}">${r.k === 'fx' ? fxHtml(r.t) : esc(r.t)}</span>`;
/** 한 단의 설명지: 위 칸(2행 자리) · 점선 · 아래 칸(3행 자리) — 빈 칸도 자리를 지켜 옆 카드와 줄이 맞는다 */
const tierHtml = (s: CardTextSlots, n: CardNature, tier: CardTier, all: boolean, topHtml?: string): string => {
  const { top, bot } = layoutCard(s, n, tier);
  return `<span class="ct ct-${tier}${all ? ' ct-all' : ''}"><span class="ct-top">${topHtml ?? top.map((t) => rowHtml({ t, k: 'say' })).join('')}</span><i class="ct-rule" aria-hidden="true"></i><span class="ct-bot">${bot.map(rowHtml).join('')}</span></span>`;
};

/**
 * 카드 설명지 HTML (D-589 — 모든 카드 성격이 이것 하나): 작은 단 · 큰 단을 함께 내고 카드 폭이 고른다(컨테이너 질의, `slice.css`).
 * 큰 단 예산을 넘는 카드(문구 승인 대기)는 작은 단 글만 내어 어느 크기에서나 그것을 쓴다. topHtml = 위 칸을 글 대신 채울 것(분대원 기록 줄).
 */
export const cardTextHtml = (s: CardTextSlots, n: CardNature, topHtml?: string): string =>
  budgetOver(s, n, 'l').length ? tierHtml(s, n, 's', true, topHtml) : tierHtml(s, n, 's', false, topHtml) + tierHtml(s, n, 'l', false, topHtml);

// ---------- 성격마다 읽기 (글자는 정본 데이터 그대로) ----------
/** 명령 카드: desc 「묘사. (효과 — 조건)」 */
export const cmdText = (id: CommandId): CardTextSlots => parseCardText(COMMANDS[id].desc || '');
/** 부품 카드: flavor(승인 전엔 비움, FLAVOR_ON_CARD) + 요약(언제 · 효과) — 조건 「장착 중」도 조건 행 */
export const partText = (id: SlicePartId): CardTextSlots => {
  const a = partSummaryText(id);
  return { flavor: FLAVOR_ON_CARD.part ? SLICE_PARTS[id].flavor ?? '' : '', title: '', cond: [a.description], effect: a.effect.split(' · ') };
};
/** 손질 카드 (n = 수치: 정비 · 수리 % · 보강 버팀) */
export type SvcKey = 'heal' | 'repair' | 'refine' | 'remove' | 'brace';
export const svcText = (k: SvcKey, n = 0): CardTextSlots => parseCardText(SERVICE_CARDS[k].desc(n));
/** 부적 카드 */
export const charmText = (id: keyof typeof CHARMS): CardTextSlots => parseCardText(CHARMS[id].desc);
/** 분대원 카드 킹 칸 (분대의 심장 / 쓰러지면 끝) */
export const CREW_KING = { name: '분대의 심장', say: '쓰러지면 끝' };
/**
 * 분대원 카드: 위 칸 = 영입 첫마디(say) — 없으면 기록 줄(화면이 topHtml로) · 아래 칸 = [특성 이름] + 이형(움직임 / : 공격) · 기벽(효과) · 킹 · 흉터(조건 행 — 서술).
 */
export const crewText = (u: { t: string; form?: string; quirk?: QuirkId; scars?: string[] }, say = ''): CardTextSlots => {
  const f = u.form ? FORMS[u.form as keyof typeof FORMS] : null;
  if (f) return { flavor: say, title: `이형 · ${f.name}`, cond: [f.move], effect: [f.hit] };
  const q = u.quirk ? QUIRKS[u.quirk] : null;
  if (q) { const p = parseCardText(`(${q.desc})`); return { flavor: say, title: q.name, cond: p.cond, effect: p.effect }; }
  if (u.t === 'K') return { flavor: say, title: CREW_KING.name, cond: [CREW_KING.say], effect: [] };
  if (u.scars?.length) return { flavor: say, title: `흉터 · ${u.scars[0]}`, cond: [SCAR_DESC[u.scars[0]] ?? ''], effect: [] };
  return { flavor: say, title: '', cond: [], effect: [] };
};
/** 시작 세트 카드: 묘사 = 한 줄 소개(line — 승인 전엔 카드 밖 받침 줄, FLAVOR_ON_CARD) · [구성] · 조건 · : 효과 */
export const setText = (id: StartSetId): CardTextSlots => {
  const st = START_SETS[id];
  return { flavor: FLAVOR_ON_CARD.set ? st.line : '', title: st.rows[0], cond: [st.rows[1]], effect: [st.rows[2].replace(/^: /, '')] };
};

/** 카드 한 장의 이름 (명판) — 다듬음 · 녹 표는 명판 밖 */
export const cmdName = (id: CommandId): string => COMMANDS[baseOf(id)].name;
