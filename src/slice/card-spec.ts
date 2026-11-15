/**
 * 카드 줄 규격 (사용자 결정 D-515 — D-511을 모든 카드 성격 × 모든 글 줄로 넓힌다):
 * 「카드 성격마다 최대 글 줄 수 · 문법 통일, 글자 수를 먼저 다듬고 안 되면 글자 크기 — 줄 수 이탈은 절대 없다.」
 *
 * 화면에 카드 틀(`.cf`)로 나오는 성격은 여섯이다 — 명령 · 부품 · 손질 · 부적 · 분대원(기벽 · 이형 · 킹 · 흉터 · 영입) · 시작 세트.
 * 보상 · 고물상 가격 카드 · 사건 카드 고르기 · 덱 보기 · 다듬기는 모두 명령/부품/손질/부적/분대원 카드를 그대로 쓴다(값은 카드 밖 받침).
 * 줄 하나 = 카드 위 한 행. 행 폭(px)은 화면 실측의 가장 좁은 값(667×375 · 915×412, `tools/qa/card-text.cjs`), 글자 폭은 `pxWidth`(갈무리 BDF 실폭).
 * 규격은 CSS(`slice.css` D-511 · D-515 블록)와 함께 바꾼다. 검사 = `tests/card-spec.test.ts` · 전수 표 = `npx jiti tools/card-text-fit.ts --list`.
 */
import { baseOf, COMMANDS, RECRUITS, type CommandId } from './cards';
import { CHARMS, SLICE_PARTS, type SlicePartId } from './parts';
import { NAMES, QUIRKS, SCAR_DESC } from './crew';
import { FORMS } from '../data/forms';
import { SERVICE_CARDS } from '../data/hud';
import { START_SETS } from '../data/start-sets';
import { partSummaryText } from '../data/ability-text';
import { cardTags, partTags, STYLE_NAMES } from './tags';
import { bottomLogical, pxWidth, splitDesc, splitTwo, stackRows, type CardFont } from './desc';
import { FORGE, SHOP } from './cards';

/** 카드 성격 (화면의 카드 틀 여섯) */
export type CardNature = 'cmd' | 'part' | 'svc' | 'charm' | 'crew' | 'set';
/** 줄 종류: 이름(명패) · 태그(종류 판) · 묘사 · 특성 이름(두루마리 안 이름 줄) · 조건 · 효과 */
export type LineKind = 'name' | 'tag' | 'say' | 'trait' | 'if' | 'fx';

/** 줄 종류 하나의 규격: 최대 행 수 · 글꼴(CardFont) — 글자 크기는 성격 전체에 같다(카드마다 다른 크기 금지) */
export interface LineSpec { max: number; font: CardFont }
export interface NatureSpec {
  label: string;
  /** 명패 · 종류 판 · 두루마리 한 행 폭 (px, 실측 최솟값) */
  px: { name: number; tag: number; row: number; descH: number };
  /** 행 높이 (px): 묘사 · 이름 줄(say) · 조건/효과 줄(row) */
  lh: { say: number; row: number };
  /** 두루마리 위 : 아래 칸 비율 (점선 자리 고정, D-377) — 위 칸이 없으면 [0, 1] */
  split: [number, number];
  lines: Partial<Record<LineKind, LineSpec>>;
  /** 두루마리 위 칸(묘사) · 아래 칸(특성 이름 · 조건 · 효과) 합계 행 수 */
  top: number;
  bottom: number;
}

/** 글꼴 이름 (표 · 보고용) */
export const FONT_LABEL: Record<CardFont, string> = { g9: '갈무리9 10px', g11: '갈무리11 12px', g11b: '갈무리11 굵게 12px' };

const NAME: LineSpec = { max: 1, font: 'g11b' };
const TAG: LineSpec = { max: 1, font: 'g11' };
const SAY: LineSpec = { max: 2, font: 'g11' };
const TRAIT: LineSpec = { max: 1, font: 'g11b' };
const IF2: LineSpec = { max: 2, font: 'g9' };
const IF1: LineSpec = { max: 1, font: 'g9' };
const FX: LineSpec = { max: 1, font: 'g9' };

/**
 * 카드 틀 칸 비율 (틀 그림이 정한다 — 명령 = RF-04 `card-cmd.css`, 그 밖 = cardart `card-layout.css`) · 가장 작은 카드 폭.
 * 가장 작은 카드 = 고물상 667×375의 150px(실측 2026-11-16, 카드 일곱 장 한 줄). 칸 폭 = 비율 × 150 (내림).
 */
export const CARD_MIN_W = 150;
export const CARD_FRAC = {
  cmd: { name: 0.48214, tag: 0.64286, row: 0.67857, descH: 0.29762 },
  card: { name: 0.6875, tag: 0.5625, row: 0.61607, descH: 0.35119 },
} as const;
const slot = (f: { name: number; tag: number; row: number; descH: number }) => ({
  name: Math.floor(f.name * CARD_MIN_W), tag: Math.floor(f.tag * CARD_MIN_W), row: Math.floor(f.row * CARD_MIN_W),
  /** 두루마리 높이 (카드 2 : 3, 위 칸 · 아래 칸은 점선 2px를 뺀다) */
  descH: Math.floor(f.descH * CARD_MIN_W * 1.5),
});

/**
 * 성격별 줄 규격표 (D-515). 행 높이 lh: 묘사(say) · 조건/효과(row) — 명령 카드는 두루마리가 낮아(67px) 묘사 14 · 조건/효과 12, 그 밖 15.
 * 효과(fx)는 「항목 하나 = 한 행」, 조건 아래 첫 효과는 「: 」로 시작한다(D-422).
 */
export const CARD_SPEC: Record<CardNature, NatureSpec> = {
  cmd: { label: '명령 카드', px: slot(CARD_FRAC.cmd), lines: { name: NAME, tag: TAG, say: SAY, if: IF2, fx: { max: 3, font: 'g9' } }, top: 2, bottom: 3, lh: { say: 14, row: 12 }, split: [7, 9] },
  part: { label: '부품 카드', px: slot(CARD_FRAC.card), lines: { name: NAME, tag: TAG, if: IF2, fx: { max: 2, font: 'g9' } }, top: 0, bottom: 3, lh: { say: 15, row: 15 }, split: [0, 1] },
  svc: { label: '손질 카드', px: slot(CARD_FRAC.card), lines: { name: NAME, tag: TAG, say: SAY, if: IF2, fx: { max: 3, font: 'g9' } }, top: 2, bottom: 3, lh: { say: 15, row: 15 }, split: [2, 3] },
  charm: { label: '부적 카드', px: slot(CARD_FRAC.card), lines: { name: NAME, tag: TAG, say: SAY, if: IF2, fx: { max: 3, font: 'g9' } }, top: 2, bottom: 3, lh: { say: 15, row: 15 }, split: [2, 3] },
  crew: { label: '분대원 카드', px: slot(CARD_FRAC.card), lines: { name: NAME, say: SAY, trait: TRAIT, if: IF1, fx: { max: 2, font: 'g9' } }, top: 2, bottom: 3, lh: { say: 15, row: 15 }, split: [2, 3] },
  set: { label: '시작 세트', px: slot(CARD_FRAC.card), lines: { name: NAME, trait: TRAIT, if: IF1, fx: FX }, top: 0, bottom: 3, lh: { say: 15, row: 15 }, split: [0, 1] },
};

/** 카드 한 장의 줄 (화면이 그리는 그대로 — 줄 하나 = 행 여럿일 수 있음) */
export interface CardLine { kind: LineKind; t: string; zone: 'head' | 'top' | 'bottom' }
export interface CardText { nature: CardNature; id: string; lines: CardLine[] }

/** 종류 판 글 (기물 칸은 카드에서 숨는다 — 갈래 · 합/곱/규칙 두 칸, 사이 4px) */
const tagText = (t: { style: keyof typeof STYLE_NAMES; effect: string; word?: string }): string =>
  `${STYLE_NAMES[t.style]} ${t.effect === 'rule' ? t.word || '규칙' : t.effect === '+' ? '합' : '곱'}`;

/** 묘사 · 조건 · 효과 문단(명령 · 손질 · 부적 — `descHtml`과 같은 나눔) */
const descLines = (text: string, px: number): CardLine[] => {
  const d = splitDesc(text);
  return [
    ...(d.say ? splitTwo(d.say, px).map((t) => ({ kind: 'say' as const, t, zone: 'top' as const })) : []),
    ...bottomLogical(d.cond, d.fx).map((l) => ({ kind: l.k, t: l.t, zone: 'bottom' as const })),
  ];
};
const head = (name: string, tag?: string): CardLine[] => [{ kind: 'name', t: name, zone: 'head' }, ...(tag ? [{ kind: 'tag' as const, t: tag, zone: 'head' as const }] : [])];

/** 모든 카드의 줄 (데이터 전수 — 명령 · 부품 · 손질 · 부적 · 분대원 · 시작 세트) */
export const allCardTexts = (): CardText[] => {
  const out: CardText[] = [];
  const S = CARD_SPEC;
  for (const id of Object.keys(COMMANDS) as CommandId[]) {
    const c = COMMANDS[id];
    // 명패 = 본래 이름 — 다듬음(+) · 녹(−) 표는 명패 밖(비용 원판 옆, main.ts refineMark)
    out.push({ nature: 'cmd', id, lines: [...head(COMMANDS[baseOf(id)].name, tagText(cardTags(id))), ...descLines(c.desc || '', S.cmd.px.row)] });
  }
  for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) {
    const p = SLICE_PARTS[id];
    out.push({ nature: 'part', id, lines: [...head(p.shortName ?? p.name, tagText(partTags(id))), ...partRows(id).map((l) => ({ kind: l.k, t: l.t, zone: 'bottom' as const }))] });
  }
  const svcN: Record<string, number[]> = { heal: [Math.round(SHOP.healPct * 100)], repair: [Math.round(SHOP.healPct * 100), Math.round(FORGE.repairOne * 100)], refine: [0], remove: [0], brace: [FORGE.braceDoors] };
  for (const k of ['heal', 'repair', 'refine', 'remove', 'brace'] as const) for (const n of svcN[k]) out.push({ nature: 'svc', id: `${k}:${n}`, lines: [...head(SERVICE_CARDS[k].name, SERVICE_CARDS.kind), ...descLines(SERVICE_CARDS[k].desc(n), S.svc.px.row)] });
  for (const [id, ch] of Object.entries(CHARMS)) out.push({ nature: 'charm', id, lines: [...head(ch.name, '부적'), ...descLines(ch.desc, S.charm.px.row)] });
  // 분대원 카드: 명패 = 이름 풀 전부 · 위 칸 = 영입 첫마디(2행) · 아래 칸 = 기벽 / 이형 / 킹 / 흉터
  const crewTrait = (name: string, rows: CardLine[]): CardLine[] => [{ kind: 'trait', t: name, zone: 'bottom' }, ...rows];
  for (const n of [...NAMES, '이름 없음']) out.push({ nature: 'crew', id: `이름:${n}`, lines: head(n) });
  for (const r of [...RECRUITS.map((x) => ({ id: x.t, line: x.line })), ...Object.entries(FORMS).map(([id, f]) => ({ id, line: f.line }))]) out.push({ nature: 'crew', id: `영입:${r.id}`, lines: splitTwo(r.line.replace(/\.?$/, '.'), S.crew.px.row).map((t) => ({ kind: 'say' as const, t, zone: 'top' as const })) });
  for (const [id, q] of Object.entries(QUIRKS)) out.push({ nature: 'crew', id: `기벽:${id}`, lines: crewTrait(q.name, bottomLogical('', q.desc).map((l) => ({ kind: l.k, t: l.t, zone: 'bottom' as const }))) });
  for (const [id, f] of Object.entries(FORMS)) out.push({ nature: 'crew', id: `이형:${id}`, lines: crewTrait(`이형 · ${f.name}`, [{ kind: 'if', t: f.move, zone: 'bottom' }, { kind: 'fx', t: `: ${f.hit}`, zone: 'bottom' }]) });
  out.push({ nature: 'crew', id: '킹', lines: crewTrait(CREW_KING.name, [{ kind: 'say', t: CREW_KING.say, zone: 'bottom' }]) });
  for (const [s, d] of Object.entries(SCAR_DESC)) out.push({ nature: 'crew', id: `흉터:${s}`, lines: crewTrait(`흉터 · ${s}`, splitTwo(d, S.crew.px.row).map((t) => ({ kind: 'say' as const, t, zone: 'bottom' as const }))) });
  for (const [id, st] of Object.entries(START_SETS)) out.push({ nature: 'set', id, lines: [...head(st.name), { kind: 'trait', t: st.rows[0], zone: 'bottom' }, { kind: 'if', t: st.rows[1], zone: 'bottom' }, { kind: 'fx', t: st.rows[2], zone: 'bottom' }] });
  return out;
};

/** 분대원 카드 킹 칸 (분대의 심장 / 쓰러지면 끝) */
export const CREW_KING = { name: '분대의 심장', say: '쓰러지면 끝' };

/**
 * 부품 카드 두루마리 (D-470 → D-475 → D-511 → D-515): 언제(한 행, 길면 쉼표 뒤에서 두 행) · : 효과 — 항목 하나 = 한 행(명령 카드와 같은 쌓기), 합 세 행.
 * 행 폭 = 부품 카드 실측(CARD_SPEC.part.px.row).
 */
export const partRows = (id: SlicePartId): { t: string; k: 'if' | 'fx' }[] => {
  const a = partSummaryText(id);
  const px = CARD_SPEC.part.px.row;
  const comma = a.description.indexOf(', ');
  const when = pxWidth(a.description) > px && comma > 0 ? [a.description.slice(0, comma + 1), a.description.slice(comma + 2)] : [a.description];
  return stackRows(when, a.effect.split(' · '));
};

/** 줄 하나가 차지하는 행 수 (데이터 줄은 접지 않는다 — 폭을 넘으면 넘침) */
const pxOf = (n: NatureSpec, l: CardLine): number => (l.kind === 'name' ? n.px.name : l.kind === 'tag' ? n.px.tag : n.px.row);

/** 규격 넘침 목록: 줄이 행 폭을 넘음 · 줄 종류의 최대 행 수 · 위/아래 칸 합계 */
export const specOver = (c: CardText): string[] => {
  const n = CARD_SPEC[c.nature];
  const bad: string[] = [];
  const count: Partial<Record<LineKind, number>> = {};
  for (const l of c.lines) {
    const sp = n.lines[l.kind];
    if (!sp) { bad.push(`${l.kind} 줄 없음 「${l.t}」`); continue; }
    count[l.kind] = (count[l.kind] ?? 0) + 1;
    const w = pxWidth(l.t, sp.font);
    if (w > pxOf(n, l)) bad.push(`${l.kind} 「${l.t}」 ${w}/${pxOf(n, l)}px`);
  }
  for (const [k, v] of Object.entries(count)) if (v > (n.lines[k as LineKind]?.max ?? 0)) bad.push(`${k} ${v}행 > ${n.lines[k as LineKind]?.max}`);
  const top = c.lines.filter((l) => l.zone === 'top').length, bot = c.lines.filter((l) => l.zone === 'bottom').length;
  if (top > n.top) bad.push(`위 칸 ${top}행 > ${n.top}`);
  if (bot > n.bottom) bad.push(`아래 칸 ${bot}행 > ${n.bottom}`);
  // 세로: 행 수 × 행 높이가 두루마리 칸(가장 작은 카드) 안 — 줄 수 이탈이 세로로도 없다
  const [a, b] = n.split, inner = n.px.descH - (a ? 2 : 0);
  const topH = a ? Math.floor((inner * a) / (a + b)) : 0, botH = inner - topH;
  const hOf = (ls: CardLine[]) => ls.reduce((h, l) => h + (l.kind === 'if' || l.kind === 'fx' ? n.lh.row : n.lh.say), 0);
  if (hOf(c.lines.filter((l) => l.zone === 'top')) > topH) bad.push(`위 칸 높이 > ${topH}px`);
  if (hOf(c.lines.filter((l) => l.zone === 'bottom')) > botH) bad.push(`아래 칸 높이 > ${botH}px`);
  return bad;
};
