/**
 * 카드 · 부품 세 갈래 태그 (D-325, 사용자: 「누가 쓰는지 · 어떤 수인지 · 합이냐 곱이냐 — 모든 카드 · 유물에 같은 세 칸」).
 *   누가  = 폰 · 나이트 · 비숍 · 룩 · 퀸 · 킹 · 공용
 *   어떤  = 연쇄(처치를 이어 간다) · 밀치기(밀어 부딪친다) · 수읽기(핀 · 포크 · 체크 같은 체스 수) · 방어(막고 고친다) · 돌격(한 방 치고 들어간다) · 운영(태엽 · 카드 · 나사를 불린다)
 *   효과  = 합(+ 공격에 더한다) · 곱(× 배율) · 규칙(태엽 · 카드 · 이동처럼 수치 밖을 바꾼다)
 * 예전 「축」(기병 · 보병 · 왕관 · 연쇄 · 밀치기 · 수읽기)은 맞물림 계산에만 남고, 화면에는 이 세 칸만 보인다.
 * 기병 · 보병 · 왕관 축은 「누가」(나이트 · 폰 · 킹)로 옮겨 간다.
 */
import type { PieceType } from '../engine';
import { COMMANDS, type Axis, type CommandId } from './cards';
import { PART_OP, SLICE_PARTS, type SlicePartId } from './parts';

export type Who = PieceType | 'any';
export type Style = 'chain' | 'push' | 'tactic' | 'guard' | 'strike' | 'tempo';
export type Effect = '+' | '×' | 'rule';

export const WHO_NAMES: Record<Who, string> = { P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹', any: '공용' };
export const STYLE_NAMES: Record<Style, string> = { chain: '연쇄', push: '밀치기', tactic: '수읽기', guard: '방어', strike: '돌격', tempo: '운영' };
export const EFFECT_NAMES: Record<Effect, string> = { '+': '합', '×': '곱', rule: '규칙' };

const AXIS_WHO: Partial<Record<Axis, PieceType>> = { cav: 'N', inf: 'P', king: 'K' };
const AXIS_STYLE: Partial<Record<Axis, Style>> = { chain: 'chain', push: 'push', tactic: 'tactic' };
const PIECE_WORD: [RegExp, PieceType][] = [[/폰/, 'P'], [/나이트|기사/, 'N'], [/비숍|사제/, 'B'], [/룩|성벽/, 'R'], [/퀸|여왕/, 'Q'], [/킹|왕/, 'K']];

/** 글에서 「어떤」을 고른다 (축이 연쇄 · 밀치기 · 수읽기가 아닐 때) */
const styleFromText = (t: string): Style =>
  /핀|포크|체크|스큐어|묶|디스커버드|캐슬링|앙파상|수읽기/.test(t) ? 'tactic'
  : /밀|충돌|부딪/.test(t) ? 'push'
  : /공격 [×+]|피해 [×+]|배율/.test(t) ? 'strike'
  : /처치|연쇄/.test(t) ? 'chain'
  : /방열판|HP|문턱|회복|땜질|쇼크|곁에 폰/.test(t) ? 'guard'
  : /태엽|카드|나사|손패|되감기|값/.test(t) ? 'tempo'
  : 'strike';

/** 글에서 합 · 곱을 읽는다 (수치 필드에 없는 배율 — 포크 · 핀 · 디스커버드 ×1.5 같은 것) */
const effectFromText = (t: string): Effect => (/×\s?\d/.test(t) ? '×' : /\(\+\d|공격 \+\d|피해 \+\d/.test(t) ? '+' : 'rule');

/** 카드의 세 칸 */
export const cardTags = (id: CommandId): { who: Who; style: Style; effect: Effect } => {
  const c = COMMANDS[id];
  const ax = [c.axis, c.axis2].find((a) => a && AXIS_STYLE[a]);
  const style: Style = ax ? AXIS_STYLE[ax]! : c.rage ? 'strike' : c.kind === 'shield' || c.kind === 'repair' || c.kind === 'draft' ? 'guard' : c.kind === 'spark' || c.kind === 'spend' ? 'chain' : c.kind === 'draw' ? 'tempo' : styleFromText(c.desc ?? '');
  const effect: Effect = c.add ? '+' : c.mult || c.multPerKill || c.rage ? '×' : effectFromText(c.desc ?? '');
  return { who: c.who as Who, style, effect };
};

/** 부품의 세 칸 */
export const partTags = (id: SlicePartId): { who: Who; style: Style; effect: Effect } => {
  const d = SLICE_PARTS[id];
  const fromAxis = d.axis ? AXIS_WHO[d.axis] : undefined;
  // 글에 가장 먼저 나오는 기물 이름 (「적 킹」은 대상이라 빼고) → 없으면 축의 기물 → 없으면 공용. 「모든 · 분대 · 전원」이면 공용
  const text = d.desc.replace(/적 킹/g, '').split('대가:')[0];
  const hits = PIECE_WORD.map(([re, t]) => ({ t, i: text.search(re) })).filter((h) => h.i >= 0).sort((x, y) => x.i - y.i);
  const who: Who = /모든|분대|전원/.test(text) ? 'any' : hits[0]?.t ?? fromAxis ?? 'any';
  const style: Style = d.axis && AXIS_STYLE[d.axis] ? AXIS_STYLE[d.axis]! : styleFromText(d.desc);
  const op = PART_OP[id];
  return { who, style, effect: op ?? effectFromText(d.desc) };
};

/** 세 칸 칩 HTML (카드 얼굴 · 부품 얼굴 · 확인 창이 같이 쓴다) */
export const tags3Html = (t: { who: Who; style: Style; effect: Effect }): string =>
  `<span class="t3"><i class="t3-who">${WHO_NAMES[t.who]}</i><i class="t3-sty sty-${t.style}">${STYLE_NAMES[t.style]}</i><i class="t3-fx fx-${t.effect === '+' ? 'add' : t.effect === '×' ? 'mul' : 'rule'}">${t.effect === 'rule' ? '규칙' : t.effect}</i></span>`;
