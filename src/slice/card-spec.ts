/**
 * 카드 규격 (D-515 → 사용자 결정 D-589 「카드 글 문법 통일」): 모든 카드 성격 × 모든 글 줄의 예산 검사.
 *
 * 화면에 카드 틀(`.cf`)로 나오는 성격은 여섯이다 — 명령 · 부품 · 손질 · 부적 · 분대원(기벽 · 이형 · 킹 · 흉터 · 영입) · 시작 세트.
 * 보상 · 고물상 가격 카드 · 사건 카드 고르기 · 덱 보기 · 다듬기 · 작업대는 모두 이 카드를 그대로 쓴다(값 · 소유 수는 카드 밖 받침).
 * 글은 한 꼴(`CardTextSlots` 묘사 · [능력명] · 조건 · 효과, `src/data/card-text.ts`), 줄 짓기 · 그리기는 `card-text.ts` 하나.
 * 설명지 예산 = 묘사 2행 · 아래 칸 3행, 단 둘(작은 카드 150px · 큰 카드 188px)마다 행 폭(틀 비율 × 단의 가장 작은 폭) · 글꼴 실폭(`pxWidth`).
 * 검사 = `tests/card-spec.test.ts` · 전수 표 = `npx jiti tools/card-text-fit.ts [--list]`.
 */
import { baseOf, COMMANDS, RECRUITS, type CommandId } from './cards';
import { CHARMS, SLICE_PARTS, type SlicePartId } from './parts';
import { NAMES, QUIRKS, SCAR_DESC, type QuirkId } from './crew';
import { FORMS } from '../data/forms';
import { SERVICE_CARDS } from '../data/hud';
import { START_SETS, START_SET_IDS } from '../data/start-sets';
import { partSummaryText } from '../data/ability-text';
import { cardTags, partTags, STYLE_NAMES } from './tags';
import { pxWidth, stackRows } from './desc';
import { FORGE, SHOP } from './cards';
import { CARD_FRAME_FRAC } from '../data/card-frames';
import type { CardTextSlots, CardTier } from '../data/card-text';
import { budgetOver, charmText, cmdText, crewText, layoutCard, partText, rowPx, setText, svcText, type CardNature, type Row, type SvcKey } from './card-text';
export { CREW_KING, type CardNature } from './card-text';

/**
 * 카드 틀 칸 비율 (틀 그림이 정한다 — D-585 카드 F 가족: `tools/pixel/card_f_import.py`가 받은 틀을 재어 `src/data/card-frames.ts`를 쓴다) · 가장 작은 카드 폭.
 * 가장 작은 카드 = 150px(D-399 하한). 명판 · 꼬리표 칸 폭 = 비율 × 150 (내림).
 */
export const CARD_MIN_W = 150;
export const CARD_FRAC = CARD_FRAME_FRAC;
const LABEL: Record<CardNature, string> = { cmd: '명령 카드', part: '부품 카드', svc: '손질 카드', charm: '부적 카드', crew: '분대원 카드', set: '시작 세트' };
const FRAME: Record<CardNature, keyof typeof CARD_FRAME_FRAC> = { cmd: 'cmd', part: 'part', svc: 'svc', charm: 'part', crew: 'crew', set: 'set' };

/** 성격별 규격: 이름 · 명판 · 꼬리표 폭(작은 카드) · 설명지 행 폭(작은 단 s · 큰 단 l) */
export const CARD_SPEC: Record<CardNature, { label: string; px: { name: number; tag: number; row: number; rowL: number } }> = Object.fromEntries(
  (Object.keys(LABEL) as CardNature[]).map((n) => {
    const f = CARD_FRAC[FRAME[n]];
    return [n, { label: LABEL[n], px: { name: Math.floor(f.name * CARD_MIN_W), tag: Math.floor(f.tag * CARD_MIN_W), row: rowPx(n, 's'), rowL: rowPx(n, 'l') } }];
  }),
) as never;

/** 종류 판 글 (기물 칸은 카드에서 숨는다 — 갈래 · 합/곱/규칙 두 칸, 사이 4px) */
const tagText = (t: { style: keyof typeof STYLE_NAMES; effect: string; word?: string }): string =>
  `${STYLE_NAMES[t.style]} ${t.effect === 'rule' ? t.word || '규칙' : t.effect === '+' ? '합' : '곱'}`;

/** 카드 한 장 (D-589): 성격 · id · 명판 이름 · 꼬리표 글 · 세 칸 글. 분대원은 영입 첫마디 · 기벽 · 이형 · 킹 · 흉터를 낱낱의 카드로 잰다 */
export interface CardText { nature: CardNature; id: string; name: string; tag: string; slots: CardTextSlots }

/** 모든 카드 (데이터 전수 — 명령 · 부품 · 손질 · 부적 · 분대원 · 시작 세트) */
export const allCardTexts = (): CardText[] => {
  const out: CardText[] = [];
  const none: CardTextSlots = { flavor: '', title: '', cond: [], effect: [] };
  for (const id of Object.keys(COMMANDS) as CommandId[]) out.push({ nature: 'cmd', id, name: COMMANDS[baseOf(id)].name, tag: tagText(cardTags(id)), slots: cmdText(id) });
  for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) out.push({ nature: 'part', id, name: SLICE_PARTS[id].shortName ?? SLICE_PARTS[id].name, tag: tagText(partTags(id)), slots: partText(id) });
  const svcN: Record<SvcKey, number[]> = { heal: [Math.round(SHOP.healPct * 100)], repair: [Math.round(SHOP.healPct * 100), Math.round(FORGE.repairOne * 100)], refine: [0], remove: [0], brace: [FORGE.braceDoors] };
  for (const k of Object.keys(svcN) as SvcKey[]) for (const n of svcN[k]) out.push({ nature: 'svc', id: `${k}:${n}`, name: SERVICE_CARDS[k].name, tag: SERVICE_CARDS.kind, slots: svcText(k, n) });
  for (const id of Object.keys(CHARMS) as (keyof typeof CHARMS)[]) out.push({ nature: 'charm', id, name: CHARMS[id].name, tag: '부적', slots: charmText(id) });
  // 분대원: 명판 = 이름 풀 전부 · 위 칸 = 영입 첫마디 · 아래 칸 = 기벽 / 이형 / 킹 / 흉터
  for (const n of [...NAMES, '이름 없음']) out.push({ nature: 'crew', id: `이름:${n}`, name: n, tag: '', slots: none });
  for (const r of [...RECRUITS.map((x) => ({ id: x.t, line: x.line })), ...Object.entries(FORMS).map(([id, f]) => ({ id, line: f.line }))]) out.push({ nature: 'crew', id: `영입:${r.id}`, name: '', tag: '', slots: { ...none, flavor: r.line.replace(/\.?$/, '.') } });
  for (const id of Object.keys(QUIRKS) as QuirkId[]) out.push({ nature: 'crew', id: `기벽:${id}`, name: '', tag: '', slots: crewText({ t: 'P', quirk: id }) });
  for (const id of Object.keys(FORMS)) out.push({ nature: 'crew', id: `이형:${id}`, name: '', tag: '', slots: crewText({ t: 'P', form: id }) });
  out.push({ nature: 'crew', id: '킹', name: '', tag: '', slots: crewText({ t: 'K' }) });
  for (const sc of Object.keys(SCAR_DESC)) out.push({ nature: 'crew', id: `흉터:${sc}`, name: '', tag: '', slots: crewText({ t: 'P', scars: [sc] }) });
  for (const id of START_SET_IDS) out.push({ nature: 'set', id, name: START_SETS[id].name, tag: '', slots: setText(id) });
  return out;
};

/** 카드 키 (승인 대기 목록 `CARD_TEXT_PENDING`과 같은 꼴) */
export const cardKey = (c: CardText): string => `${c.nature}:${c.id}`;

/** 명판 · 꼬리표 넘침 (명판 글은 두 단 모두 굵게 12px라 작은 카드가 가장 빠듯하다) */
const headOver = (c: CardText): string[] => {
  const px = CARD_SPEC[c.nature].px, bad: string[] = [];
  if (c.name && pxWidth(c.name, 'g11b') > px.name) bad.push(`명판 「${c.name}」 ${pxWidth(c.name, 'g11b')}/${px.name}px`);
  if (c.tag && pxWidth(c.tag, 'g11') > px.tag) bad.push(`꼬리표 「${c.tag}」 ${pxWidth(c.tag, 'g11')}/${px.tag}px`);
  return bad;
};
/** 규격 넘침 (D-589): 작은 단 = 명판 · 꼬리표 + 설명지 예산, 큰 단 = 설명지 예산 */
export const specOver = (c: CardText, tier: CardTier = 's'): string[] => [...(tier === 's' ? headOver(c) : []), ...budgetOver(c.slots, c.nature, tier)];
/** 화면이 그리는 행 (보고 · 표용) */
export const cardRows = (c: CardText, tier: CardTier): { top: string[]; bot: Row[] } => layoutCard(c.slots, c.nature, tier);

/**
 * 부품 규칙 행 (D-470 → D-515 — 길게 누름 · 능력 시험용, 작은 단): 언제(길면 쉼표 뒤에서 두 행) · : 효과 — 항목 하나 = 한 행, 합 세 행.
 */
export const partRows = (id: SlicePartId): { t: string; k: 'if' | 'fx' }[] => {
  const a = partSummaryText(id);
  const px = CARD_SPEC.part.px.row;
  const comma = a.description.indexOf(', ');
  const when = pxWidth(a.description) > px && comma > 0 ? [a.description.slice(0, comma + 1), a.description.slice(comma + 2)] : [a.description];
  return stackRows(when, a.effect.split(' · '));
};
