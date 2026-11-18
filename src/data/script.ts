/** D-451 실행 각본: 마스터 바이블(docs/brief/master-bible.md) 첫째~넷째 왕관 — 왕관마다 새 아홉째 폰. */
import type { StandIn } from './opening';
import type { PieceType } from '../engine';
import { CHAPTERS, chapterTitle, endingLabel } from './campaign';
import { PAPER_FACE, type PaperMood, type Portrait } from './portraits';
/**
 * 비트 (D-504, 후기 #31): 한 줄 = 한 비트. 글에 더해 그 순간의 연출을 함께 적는다 — 카메라(shot) · 소리 큐(sfx) · 숨(pause, 글 앞 ms) · 효과(fx).
 * 연출이 없는 줄은 앞 비트의 그림 · 초점을 그대로 이어 받는다.
 */
export type Cue = 'tap' | 'threat' | 'land' | 'hit' | 'stamp' | 'lose' | 'win' | 'rare' | 'awaken' | 'lift' | 'hurt' | 'loss' | 'submit' | 'kill' | 'check';
/** mood (D-506): 종이왕 표정(PT-04) — 종이왕 대사면 명패 얼굴을 바꾸고, 속마음(m)이면 이름 없이 얼굴 명패만 세운다 */
/** drift (D-554): 이 줄이 서 있는 동안 켄 번스 방향(초점 변화 부호) — 없으면 컷 분위기(data/vn.ts VN_SCENE) · 여유가 큰 쪽 */
export interface Line { k: 'n' | 's' | 'm'; t: string; who?: string; shot?: Shot; sfx?: Cue; pause?: number; fx?: 'shake' | 'flash' | 'red' | 'gold'; mood?: PaperMood; drift?: { x: number; y: number } }
/** 카메라 한 샷: 그림 안 초점(0~1) + 확대 칸 z(0 = 칸을 덮는 기본 배율, 한 칸 = 기기 픽셀 정수로 약 12%씩) */
export interface Shot { x: number; y: number; z?: number }
/**
 * 컷 사이 전환: 디더 · 조리개 · 쇳물 · 백지 · 암전 · 바로 + (D-554) 철문 날 · 사선 · 블라인드 · 종이 쪽.
 * 박자 약속(data/vn.ts VN_BEAT): 충격 = cut · 시간이 흐름 = dither · 한 곳에 모임 = iris · 장소가 바뀜 = diag · 회상 · 기록 = page · 닫힌 공간 = shutter.
 */
export type Trans = 'dither' | 'iris' | 'melt' | 'white' | 'black' | 'cut' | 'shutter' | 'diag' | 'blinds' | 'page';
/** 장 제목 카드 (먹 바탕 · 꼬리표 · 제목 · 부제) */
/** crown = 몇째 왕관 장인지 — 꼬리표 위 왕관 문장(ED-01 crown-emblem-1~4: 종이 → 금띠 → 반금 → 금 깨짐, D-510) */
export interface TitleCard { kicker: string; title: string; sub?: string; tone?: 'brass' | 'crimson' | 'paper'; crown?: number }
/** 화자 얼굴: 기물 도트(진영) 또는 장면 그림 한 곳(cover 초점) */
/** art = 장면 그림 얼굴 — zoom(높이 %)이 있으면 그 그림을 비율 그대로 확대해 at 자리만 잘라 쓴다(D-516 · D-506 사건 NPC와 같은 방식) */
export type Face = { t: PieceType; side: 0 | 1 } | { art: string; at?: string; zoom?: number } | { portrait: Portrait };
export interface Cut {
  alt?: string; img: string; bg: [string, string]; glow?: string; art: StandIn[];
  fx?: 'alarm' | 'red' | 'spot' | 'path' | 'gold';
  cam?: 'pan-l' | 'pan-r' | 'tilt-u' | 'tilt-d' | 'in' | 'out' | 'still';
  at?: string; lines: Line[]; key?: boolean;
  /** 인물 생사를 고정해 그린 옛 컷 대신 실제 출하의 배우만 보여 준다. */
  standIn?: boolean;
  /** 빈 배경에서만 실제 생존 기물을 겹친다. 인물이 있는 완성 원화에는 쓰지 않는다. */
  showActors?: boolean;
  /** 정지 장면 그림을 비율·기기 픽셀 정수배로 덮는다. */
  pixelCover?: boolean;
  /** 하단의 핵심 행동을 가리지 않도록 해당 컷만 대사창을 상단에 둔다. (영화 판에서는 띠가 레터박스 안에 있어 쓰지 않는다) */
  caption?: 'top' | 'bottom';
  /** D-504 영화 문법: 컷 앞 장 제목 카드 · 컷 뒤 맺음 카드 · 들어오는 전환 · 첫 샷 · 끝 정적(그림 없이 먹/백지 위 한 줄) */
  title?: TitleCard; end?: TitleCard; trans?: Trans; shot?: Shot; coda?: 'black' | 'white';
  /** 바이블 장면 이름 (스토리보드 · 위 레터박스 머리) */
  slug?: string;
}
const n = (t: string, o: Partial<Line> = {}): Line => ({ k: 'n', t, ...o });
const s = (who: string, t: string, o: Partial<Line> = {}): Line => ({ k: 's', who, t, ...o });
const m = (t: string, o: Partial<Line> = {}): Line => ({ k: 'm', t, ...o });
/** 장 꼬리표: 「첫째 왕관」 … */
const chapterKick = (chapter: number): string => CHAPTERS[Math.max(0, Math.min(3, chapter))].label;
/** 왕관 문장 번호 1~4 (TitleCard.crown) */
const crownNo = (chapter: number): number => Math.max(0, Math.min(3, chapter)) + 1;
/** 샷 줄임: at(x, y, z) */
const at = (x: number, y: number, z = 0): Shot => ({ x, y, z });
const pawn = (x = 48, y = 56, h = 30): StandIn => ({ t: 'K', side: 0, x, y, h });
const cut = (img: string, lines: Line[], art: StandIn[] = [pawn()], standIn = false): Cut => ({ img, bg: ['#16141c', '#0b0b0e'], art, lines, standIn });
const sceneCut = (img: string, lines: Line[], art: StandIn[] = []): Cut => ({ ...cut(img, lines, art), pixelCover: true, showActors: art.length > 0, cam: 'still' });
/** 끝 정적 컷: 그림 없이 먹(또는 백지) 위 한가운데 한 줄 */
const coda = (lines: Line[], tone: 'black' | 'white' = 'black'): Cut => ({ ...cut('', lines, []), coda: tone, trans: tone === 'white' ? 'white' : 'black' });
/**
 * 화자 얼굴 (D-504 · #22): 컷신 대사 명패에 세울 얼굴. 분대원 이름은 출하마다 달라 부르는 쪽(playCuts faces)이 더한다.
 * 아홉째 폰은 종이 왕관을 접기 전이라 맨 폰, 그 뒤는 종이왕(PT-04 표정 초상, D-506 — 줄의 mood로 표정). 반장 · 도금왕은 장면 그림 얼굴 자리.
 * PT-09 취소 (D-516 사용자 결정 — 따로 발주하면 일관성 있게 안 나온다): 아홉째 폰 · 흰 퀸 · 흰 룩 · 박차 · 용해 주조기 · 도금왕은
 * 이미 받은 일러스트에서 그 화자 자리를 잘라 쓴다. at = background-position(초점이 칸 가운데 오게 계산한 값), zoom = 그림 높이 %.
 */
export const BOSS_FACE_ART = { plate: 'boss-plate', spawn: 'boss-assembly', thorns: 'boss-thorns', gilded: 'boss-gilded', inspect: 'boss-inspector', magnet: 'boss-magnet', alarm: 'boss-alarm' } as const;
export const SPEAKER_FACE: Record<string, Face> = {
  종이왕: { portrait: PAPER_FACE.calm },
  // OP-01 맨머리 폰(등에 태엽 열쇠) — 머리 · 목깃 (초점 42% 34%)
  '아홉째 폰': { art: 'op-windup', at: '39% 18%', zoom: 200 },
  // OP-02 상자 칸막이 — 기운 흰 퀸(초점 45% 64%) · 끝 칸 흰 룩(초점 12% 64%) — 둘이 말하는 그 장면(PRO-05)
  '흰 퀸': { art: 'prologue-04', at: '44% 73%', zoom: 250 },
  '흰 룩': { art: 'prologue-04', at: '4% 73%', zoom: 250 },
  // PRO-07 흠집 난 흰 나이트 — 말머리 · 목덜미 흠 자국(초점 56% 50%)
  박차: { art: 'prologue-06', at: '58% 50%', zoom: 200 },
  // ED-03 오른쪽 주조기 앞면 — 리벳 몸 · 쇳물이 이글대는 아가리(초점 86% 72%)
  '용해 주조기': { art: 'end-k-reach', at: '100% 94%', zoom: 200 },
  // 도금왕 장면 그림 — 금 십자관 · 윗몸(초점 50% 30%)
  도금왕: { art: 'boss-gilded', at: '50% 10%', zoom: 200 },
  '철갑 반장': { art: BOSS_FACE_ART.plate }, '검수 반장': { art: BOSS_FACE_ART.inspect }, '조립 반장': { art: BOSS_FACE_ART.spawn },
  '자석 반장': { art: BOSS_FACE_ART.magnet }, '출하 반장': { art: BOSS_FACE_ART.thorns }, '경보 반장': { art: BOSS_FACE_ART.alarm },
};
export const CUT_TEXT_BUDGET = { line: 30 };
export const oneLine = (t: string): string => t.replace(/\n/g, ' ');

/**
 * D-451 — 본편 대사 정본은 마스터 바이블(docs/brief/master-bible.md)이다. 여기 글은 그 PART II를 그대로 옮긴 것이고,
 * 줄 ID(PRO-01-1 …)는 바이블 · 스토리보드와 같다. 컷신은 글자 수 제한이 없다 — 긴 줄은 자막 띠가 문장 단위로 나눠 보여 준다(uikit.cutPages).
 * D-536 (출시 전 서사 리뷰 §3-3): 47쪽 → 29쪽으로 줄였다. PRO-08(검은 세트와 먼 왕좌)은 처음 출하에서 시험대가 끝난 뒤 첫 실전 대국 직전에 따로 튼다(PROLOGUE_FIELD).
 */
export const PROLOGUE: Cut[] = [
  // PRO-01 — 장 제목 카드로 연다. 먼 공장(넓게) — 태엽 · 법칙 두 줄은 다음 컷(OP-01)으로
  { ...cut('prologue-00', [
    n('하늘을 가린 검은 매연과 멈추지 않는 증기 소리. 여기는 체스 기물을 찍어 내는 거대한 주물 공장이다.', { shot: at(0.5, 0.4), drift: { x: 0, y: 1 } }),
  ]), key: true, slug: '쇳내 나는 요람', shot: at(0.5, 0.3), title: { kicker: '프롤로그', title: '쇳내 나는 요람', sub: '체스 기물을 찍어 내는 주물 공장' } },
  // PRO-01-2·3 — OP-01 태엽이 감기는 순간(D-509 → 재발주본 D-512 맨머리 폰): 맨머리 폰과 등 쪽 태엽 열쇠(머리까지 한 화면) → 뒤 컨베이어의 검은 폰 줄(법칙)
  { ...cut('op-windup', [
    n('갓 식은 쇠붙이들은 등에 박힌 태엽이 감기는 순간, 비로소 눈을 뜨고 자신이 어느 칸으로 가야 할지 배운다.', { shot: at(0.46, 0.46, 1), sfx: 'awaken', pause: 300 }),
    n('공장의 법칙은 단순했다. 이긴 세트만 출하문을 나선다.', { shot: at(0.1, 0.42, 1) }),
  ]), key: true, slug: '태엽이 감기는 순간', shot: at(0.5, 0.5) },
  // PRO-02 — 쇳물 전환. 붓는 거푸집으로 다가가 「녹아내려」
  { ...cut('prologue-01', [
    n('대국에서 킹이 쓰러진 세트는 패자 부활도, 변명할 틈도 없이 상자째 붉은 용광로로 쏟아진다.', { shot: at(0.5, 0.55), sfx: 'threat' }),
    n('어제의 동료는 오늘 녹아내려 다음 세트의 이름 모를 폰이 된다.', { shot: at(0.4, 0.3, 2), drift: { x: 0, y: 1 } }),
  ]), key: true, slug: '용광로의 침묵', trans: 'melt' },
  // PRO-03 — 상자 전체 → 집게 → 빈 킹 자리 → 집힌 폰 얼굴(숨 뒤 독백)
  { ...cut('prologue-02', [
    n('그날, 갓 조립된 하얀 세트 상자 하나에 킹이 빠져 있었다.', { shot: at(0.5, 0.6) }),
    n('컨베이어 위의 집게는 무심하게 굴러다니던 하얀 폰 하나를 집어 올려, 비어 있던 킹의 자리에 꾹 눌러 담았다.', { shot: at(0.5, 0.3, 2), sfx: 'lift' }),
    n('여덟 개의 폰 곁에 하나가 더 얹혔다. 킹의 왕관도, 킹의 무게도 없는 ‘아홉 번째 폰’이었다.', { shot: at(0.5, 0.62, 1), sfx: 'land' }),
    m('발밑이 너무 넓어. 여긴 내가 태어나야 할 자리가 아니었어.', { shot: at(0.5, 0.42, 3), pause: 500 }),
  ]), slug: '잘못 놓인 아홉 번째 폰', trans: 'shutter' },
  // PRO-04 — 경보(VA-02, D-578): 들려 올라가는 X 도장 머리와 닫힌 뚜껑(흔들림 · 도장 소리) → 뚜껑 위 붉은 X에 다가가 판정문. 소문 두 줄은 다음 컷(OP-03)으로
  { ...cut('prologue-03', [
    n('출하구로 향하는 벨트 대신, 차가운 붉은 경고등이 켜진 검수기가 상자 뚜껑 위에 커다란 X표를 내려찍었다.', { shot: at(0.5, 0.4, 1), sfx: 'stamp', fx: 'shake' }),
    n('「킹 누락. 규격 미달 — 공정 실패 시 상자째 폐기 대기」', { shot: at(0.5, 0.56, 2), sfx: 'threat' }),
  ]), key: true, slug: '불량 딱지', fx: 'alarm', trans: 'cut' },
  // PRO-04-3·4 — OP-03 금단의 승급대 소문(D-514): 불량 X 상자 틈에서 위를 올려다보는 흰 기물 셋(아래) → 수직 갱도 꼭대기 금빛 통제실의 왕 그림자
  { ...sceneCut('op-legend', [
    n('하지만 밑바닥 불량품들 사이에는 소문이 돌았다. 꼭대기 통제실의 ‘금단의 승급대’는 폰도 킹으로 만든다고.', { shot: at(0.5, 0.9, 1), pause: 300 }),
    n('그리고 실제로 그곳에서 킹이 되어 살아남은 왕이 꼭대기에 군림하고 있다고 했다.', { shot: at(0.52, 0.16, 2) }),
  ]), key: true, slug: '금단의 소문', shot: at(0.5, 0.5), trans: 'dither' },
  // PRO-05 — OP-02 상자 칸막이(D-509): 기운 퀸(가운데 왼쪽) → 십자 홈 킹 자리의 맨머리 폰(가운데 오른쪽) → 끝 칸 룩(왼쪽), 침묵은 상자 전체
  { ...cut('prologue-04', [
    s('흰 퀸', '너 하나 때문에 멀쩡히 찍혀 나온 우리까지 불량 딱지를 달고 녹게 생겼다고!', { shot: at(0.47, 0.62, 3), fx: 'shake' }),
    s('아홉째 폰', '…알아. 집게가 잘못 집은 건 나야.', { shot: at(0.56, 0.62, 2), pause: 300 }),
    s('흰 룩', '네가 꼭대기에서 킹이 되면 우리도 정품이다. 앞줄은 네 몫이다.', { shot: at(0.1, 0.64, 2) }),
    n('좁은 상자 안에 무거운 침묵이 내려앉았다.', { shot: at(0.5, 0.55), pause: 400 }),
  ]), slug: '상자 안의 다툼', trans: 'iris' },
  // PRO-06 — 종이 왕관: 접어 올리는 손(왕관에 다가감) → 다짐 → 줄을 서는 기물들(넓게)
  { ...cut('prologue-05', [
    n('그때, 가장 작은 폰이 상자 귀퉁이의 두꺼운 포장지를 북 찢어 손끝으로 투박한 왕관 모양을 접어 올렸다.', { shot: at(0.5, 0.3, 2), sfx: 'lift' }),
    s('아홉째 폰', '킹 자리가 비었으면 내가 채울게. 금빛 왕관은 없지만, 종이라도 쓰고 앞줄에 서겠어.', { shot: at(0.5, 0.45, 1) }),
    s('아홉째 폰', '내가 꼭대기 승급대까지 걸어 올라가서, 너희 모두를 살려서 밖으로 데리고 나갈게.', { shot: at(0.5, 0.5, 2) }),
    n('그날부터 공장 밑바닥에서는 그를 ‘종이왕’이라 불렀다.', { shot: at(0.5, 0.55), sfx: 'rare', pause: 300 }),
  ]), key: true, slug: '종이 왕관' },
  // PRO-07 — 박차: 흠집 난 목덜미(D-567) → 종이왕 → 둘을 한 화면에
  { ...cut('prologue-06', [
    n('무리 끝에서, 목덜미에 시커먼 주조 흠집이 팬 흰 나이트 하나가 묵묵히 걸어 나와 그의 곁에 섰다.', { shot: at(0.58, 0.55, 1), sfx: 'land' }),
    s('박차', '박차다. 덜 식은 채 틀에서 뜯겨, 정품 상자엔 못 들었지.', { shot: at(0.6, 0.45, 2) }),
    s('박차', '네가 킹이 된다 해도 내 흠집은 안 지워진다. 그래도 괜찮나?', { shot: at(0.62, 0.55, 3) }),
    s('종이왕', '흠집 따위 지울 필요 없어. 이 몸 그대로 같이 나가자.', { shot: at(0.3, 0.4, 2), mood: 'resolve' }),
    s('박차', '…우스운 소리군. 좋다, 이 말발굽이 부서질 때까지 넌 내 대장이다.', { shot: at(0.45, 0.5), pause: 400 }),
  ]), slug: '부관 박차', trans: 'diag' },
];
/**
 * PRO-08 검은 세트와 먼 왕좌 (D-536 — 서사 리뷰 §3-4): 처음 출하에서는 시험대가 끝난 뒤 첫 실전 대국 직전에 튼다(첫 줄 「첫 번째 검수 판이 열리고」).
 * 입문을 이미 마친 사람 · 메뉴의 「프롤로그」 다시 보기는 프롤로그 끝에 그대로 붙는다(opening.prologue).
 * OP-04(D-509): 오른쪽 검은 세트 줄 → 오른쪽 위 통제실 도금왕 그림자 → 왼쪽 앞 종이왕 독백
 */
export const PROLOGUE_FIELD: Cut = { ...cut('prologue-07', [
  n('첫 번째 검수 판이 열리고, 맞은편 어둠 속에서 매끈하게 닦인 검은 기물들이 한 치의 오차도 없이 줄지어 섰다.', { shot: at(0.74, 0.66, 1), sfx: 'threat' }),
  n('아득히 높은 통제실 난간 너머로, 소문의 주인공인 도금왕이 황금빛 그림자를 드리운 채 아래를 내려다보고 있었다.', { shot: at(0.82, 0.1, 2), pause: 300 }),
  m('내가 저 꼭대기에 닿아야, 우리 모두 문밖을 본다.', { shot: at(0.22, 0.56, 2), pause: 400, mood: 'resolve' }),
]), key: true, slug: '검은 세트와 먼 왕좌', trans: 'iris' };
/**
 * 그림자 컷 (바이블 SHD): 둘째 출하부터 프롤로그 대신. retry = 같은 왕관 재도전(SHD-A),
 * 아니면 둘째~넷째 왕관의 시작(SHD-B — 전대 도금왕이 새긴 규정 + 왕관별 속마음).
 */
export const shadowCut = (chapter: number, law?: string, retry = chapter === 0): Cut => retry || chapter === 0
  ? { ...cut('prologue-shadow', [
    n('조금 전, 또 하나의 불량 세트가 비명을 남긴 채 붉은 용광로 속으로 가라앉았다.', { shot: at(0.5, 0.5), sfx: 'threat' }),
    n('컨베이어의 집게는 아무 일도 없었다는 듯 차가운 쇳소리를 내며, 다른 상자의 비어 있는 킹 자리에 새로운 폰 하나를 집어 넣었다.', { shot: at(0.33, 0.7, 2), sfx: 'lift' }),
    n('상자 뚜껑에 찍힌 붉은 X표가 눈을 뜬 그의 시야를 붉게 물들였다.', { shot: at(0.33, 0.78, 3), fx: 'red' }),
    m('조금 전까지 숨 쉬던 쇳덩이들이 흔적도 없이 녹아내렸다. 머지않아 내 차례가 올지도 모른다. 하지만 태엽이 감긴 이상, 나는 저 꼭대기 승급대까지 걸어 올라가야만 한다.', { shot: at(0.75, 0.2, 1), pause: 400, mood: 'fear' }),
  ]), slug: '같은 왕관 재도전', title: { kicker: chapterKick(chapter), title: '또 하나의 아홉째 폰', sub: chapterTitle(chapter), crown: crownNo(chapter) } }
  : { ...sceneCut('new-law', [
    n('새로운 상자, 새로운 불량품. 또 다른 아홉 번째 폰이 종이 왕관을 접어 쓰고 검수대 앞에 섰다.', { shot: at(0.18, 0.8, 2) }),
    n('그런데 전에는 없던 차가운 쇠판 하나가 검수대 기둥에 새로 못 박혀 있었다. 갓 새겨진 듯 글자 끝이 날카로웠다.', { shot: at(0.6, 0.5), sfx: 'stamp' }),
    n(`「${law ?? '선대 왕이 새긴 규정'}」`, { shot: at(0.62, 0.55, 2), pause: 300 }),
    m([
      '소문대로 지난번에 올라간 폰이 왕이 된 건가? 그런데 왜 공장을 더 가혹하게 만들었지? 동료를 구하러 올라간 게 아니었나…',
      '두 번이나 킹이 바뀌었는데도 아래층은 여전히 지옥이군. 좋아, 그 썩은 왕좌에 내가 올라가서 이 공장의 규칙을 끝내버리겠어.',
      '앞선 세 명의 종이왕이 모두 저 위에 닿고도 공장을 더 옥죄었다. 그 높은 자리에는 대체 무엇이 도사리고 있는 걸까.',
    ][Math.max(0, Math.min(2, chapter - 1))], { shot: at(0.6, 0.12, 1), pause: 300 }),
  ]), slug: '새긴 규정', title: { kicker: chapterKick(chapter), title: chapterTitle(chapter), sub: '새로운 아홉째 폰', crown: crownNo(chapter) } };
/** 막 입구 카드 (바이블 ACT-1~4): 서술 한 줄 + 속마음 한 줄. [0]은 프롤로그가 대신한다 */
export const ACT_CARD = [
  '첫 번째 검수 판 위로 흠집 난 흰 세트가 올라선다.\n‘이겨서 위로 간다. 한 판도 물러설 수 없어.’',
  '지난 대국에서 녹아내린 세트의 쇳물이 파이프를 타고 흘러내린다.\n‘우리가 멈추는 순간, 저 쇳물이 바로 우리 차례가 된다.’',
  '먼 데서 쇠사슬이 끌리는 소리가 난다. 출하구 쪽이다.\n‘저 위에서 무엇을 그렇게 묶어 두는 거지.’',
  '굳게 닫힌 통제실 문 너머로 눈부신 황금빛 왕좌가 일렁인다.\n‘저기만 넘으면 된다. 이제 곧 우리 모두가 살 길이 열린다.’',
];
export const ACT_ENTRY = ACT_CARD;
export type StoryBoss = 'plate' | 'inspect' | 'spawn' | 'magnet' | 'thorns' | 'alarm';
export const BOSS_SINS = { plate: '허영', inspect: '나태', spawn: '폭식', magnet: '탐욕', thorns: '분노', alarm: '질투', gilded: '교만' } as const;
/**
 * 반장 (바이블 BOS-1~6, D-451 — 불살 패배): 반장들은 분대를 잃고 간수로 좌천된 낙오 정품 킹이다. 종이왕은 쓰러뜨린 반장을 녹이지 않고 지나간다.
 * intro · say = 등장 띠 / phase2 = 2단계 격노 때 한 마디(D-474) / 격파 컷 = fall(서술 두 문장) → temptation(살려 둔 반장의 저주 섞인 예언) → reply(종이왕) → STG_PROG(속마음)
 * mock = 종막 2단계에서 도금왕이 들먹임 / mirror = 왕이 된 결말에서 새 왕이 이 반장을 닮아 감
 */
export const BOSS_STORY: Record<StoryBoss, { name: string; intro: string; say: string; phase2: string; fall: string; reply: string; mock: string; mirror: string; temptation: string }> = {
  plate: {
    name: '철갑 반장', intro: '온몸의 흠집마다 두꺼운 철판을 덧댄 반장이 앞을 막아섰다.', say: '그 얇은 껍질로 어디까지 버틸 셈이지? 세상은 언제나 부서지기 쉬운 것부터 밟아 부수는 법이다.', phase2: '한 겹만 더 두르면 완벽해진다네.',
    fall: '육중하던 철판이 굉음과 함께 갈라져 떨어지자, 그 안에서 흠집투성이의 작고 볼품없는 킹 하나가 웅크린 채 드러났다.\n하지만 종이왕은 떨고 있는 그를 용광로로 밀어 넣지 않고, 다시 치지 않고 조용히 돌아섰다.',
    temptation: '나를 살려 두고 지나가겠다고? 그 역겨운 동정심 집어치워! 너도 저 꼭대기에 닿으면 깨닫게 될 거다. 남을 믿고 등을 내주는 것보다, 혼자 숨어 버틸 수 있는 두꺼운 갑옷이 얼마나 달콤한지를!',
    reply: '동료의 숨을 가려가며 얻는 안전 따윈 내 자리가 아니야.',
    mock: '철갑 반장의 그 두꺼운 껍질이 부럽지 않더냐? 누구의 쇠도 닿지 않는 고독한 성채가.',
    mirror: '그는 철갑 반장처럼 누구도 가까이 오지 못하게 왕좌 주변에 겹겹이 철판을 둘렀다.',
  },
  inspect: {
    name: '검수 반장', intro: '두꺼운 렌즈를 낀 검수 반장이 규정판을 펼쳤다.', say: '스스로 판단하지 마라. 공장이 정한 규정판 뒤에 숨으면, 네 손에 묻은 쇳물도 네 죄가 아니게 된다.', phase2: '재검수. 오판한 쪽은 피검수품이다.',
    fall: '렌즈가 산산조각 나자 검수 반장은 바닥에 엎드려 떨어져 나간 규정판 조각들을 필사적으로 더듬었다. 스스로 판단해 본 적이 한 번도 없는 자의 눈이었다.\n종이왕은 그의 손끝에 닿은 규정판을 밟지 않고 조용히 곁을 지나쳤다.',
    temptation: '비웃는 거냐…! 올라가 보라지. 네가 감당할 수 없는 책임이 덮쳐 올 때, 결국 넌 네 손에 쥔 붉은 도장으로 동료의 이름 위에 ‘불량’을 찍고 눈을 감을 테니!',
    reply: '내 동료의 목숨을 종이 한 장의 판정에 넘기진 않아.',
    mock: '검수 반장의 규정판이 탐나지 않더냐? 네 결단을 대신 짊어져 줄 차가운 면죄부가.',
    mirror: '그는 검수 반장처럼 모든 죄책감을 가리기 위해 더 많은 불량 도장을 찍어 댔다.',
  },
  spawn: {
    name: '조립 반장', intro: '조립 반장의 거대한 집게가 쉼 없이 움직이며 폰을 찍어 냈다.', say: '동료 하나쯤 잃었다고 떨지 마라. 용광로에서 다시 찍어 내면 그만인 소모품에 마음을 두는 건 어리석은 짓이다.', phase2: '모자라. 더 찍어! 더!',
    fall: '굉음을 내던 집게가 멈추자, 얼굴도 이름도 새겨지지 않은 미완성 폰들이 바닥에 우르르 쏟아져 굴렀다.\n종이왕은 텅 빈 눈으로 천장을 바라보는 반장을 남겨 둔 채 다음 공정의 문을 열었다.',
    temptation: '날 부수지 않고 가겠다고? 가소롭군! 네 곁의 기물들이 하나둘 닳아 부서질 때, 너 역시 그 빈자리를 채울 새로운 쇳물을 미친 듯이 찾게 될 거다!',
    reply: '대신할 수 있는 동료 따윈 이 세상에 하나도 없어.',
    mock: '조립 반장의 집게가 부럽지 않더냐? 부서진 자리마다 이름 없는 새 쇠를 갈아 끼우는 무심함이.',
    mirror: '그는 조립 반장처럼 사라진 동료들의 빈자리를 말 없는 쇠붙이로 메워 갔다.',
  },
  magnet: {
    name: '자석 반장', intro: '자석 반장의 발치에 강제로 끌려온 쇠붙이들이 쌓여 있었다.', say: '믿음 따위로 곁을 지킬 수 있을 것 같으냐? 보이지 않는 사슬로 묶어 두어야만 비로소 네 것이 되는 법이다.', phase2: '어딜 가나. 이미 장부에 적었는데.',
    fall: '거대한 자력이 꺼지자 그를 옥죄고 있던 모든 쇠붙이들이 사방으로 풀려나 흩어졌다. 단 한 조각도 그에게 돌아가지 않았다.\n종이왕은 홀로 남아 바들바들 떠는 반장을 보며, 그를 녹이지 않고 걸음을 옮겼다.',
    temptation: '착한 척 기만하지 마라! 왕이 된다는 건 결국 혼자 남을 자리를 고르는 일이다. 곧 너도 네 곁의 것들을 쇠사슬로 묶어두고 싶어 미치게 될 거다!',
    reply: '사슬로 묶어 둔다면, 그건 이미 동료가 아니야.',
    mock: '자석 반장의 쇠사슬이 탐나지 않더냐? 어느 누구도 네 시야 바깥으로 떠나지 못하게 묶어 두는 힘이.',
    mirror: '그는 자석 반장처럼 누구도 떠나지 못하게 출하구 문에 거대한 자력을 걸었다.',
  },
  thorns: {
    name: '출하 반장', intro: '출하문을 가로막은 반장의 온몸에 날카로운 가시가 돋아 있었다.', say: '네가 밑바닥에서 밟혀온 설움을 잊지 마라. 이제 네가 가시를 세워 똑같이 되갚아 줄 차례가 왔을 뿐이다.', phase2: '이 상처 값부터 치르고 가라.',
    fall: '뾰족한 가시가 부러져 나가자, 그 아래 숨겨져 있던 낡고 깊게 팬 옛 상처들이 적나라하게 드러났다.\n종이왕은 그 역시 이 문 앞에서 무너졌던 기물임을 깨닫고, 더 치지 않고 말없이 곁을 지나쳤다.',
    temptation: '치욕스럽군…! 동정 따위로 날 이긴 척하지 마라! 네놈의 그 잘난 ‘함께’가 왕좌 앞에서 얼마나 버티나 보자. 거긴 딱 한 명분 크기뿐이야!',
    reply: '내가 겪은 상처를 다음 폰에게 대물림하진 않아.',
    mock: '출하 반장의 가시가 부럽지 않더냐? 네가 당한 모욕을 다음 세대의 등에 고스란히 꽂아 넣는 쾌감이.',
    mirror: '그는 출하 반장처럼 아래층에서 올라오는 모든 문턱에 날 선 가시를 세웠다.',
  },
  alarm: {
    name: '경보 반장', intro: '앞서는 기물을 볼 때마다 경보 반장의 붉은 등이 번쩍였다.', say: '선두에 서려면 뒤처진 자의 손을 놓아야 한다. 모두를 데리고 가겠다는 오만은 결국 다 함께 가라앉는 길뿐이다.', phase2: '그만 앞서라. 거긴 내 차례다.',
    fall: '요란하던 붉은 경보등이 꺼지자, 그는 차가운 바닥에 주저앉아 오지도 않을 자신의 출하 순서를 헛되이 세고 있었다.\n종이왕은 그를 폐기함으로 밀어 넣지 않고, 묵묵히 위층으로 향하는 계단을 밟았다.',
    temptation: '흥, 불쌍한 척 마! 살려주면 고마워할 줄 알았나? 꼭대기 문은 한 명밖에 못 들어갈 만큼 좁아. 결국 넌 살기 위해 네 옆의 것들을 밀어낼 거다!',
    reply: '동료를 밀어내고 혼자 살아남는 건 출하가 아니야.',
    mock: '경보 반장의 냉혹함이 탐나지 않더냐? 무거운 짐을 가장 먼저 덜어내고 홀로 정상을 밟는 가벼움이.',
    mirror: '그는 경보 반장처럼 자기보다 앞서 올라오는 폰의 등을 제일 먼저 찔렀다.',
  },
};
/** 반장 격파 직후 종이왕의 속마음 (바이블 STG-PROG): 이번 출하에서 몇 번째 반장인가 × 몇째 왕관인가 */
export const STG_PROG = {
  // D-536 (서사 리뷰 A6): 첫 반장 뒤 속마음도 왕관마다 — 넷째 왕관의 폰은 비웃지 않고 아파한다
  first: [
    '왕좌는 혼자 앉는 자리라고? 다들 동료를 버리고 도망친 패배자들의 궤변일 뿐이야. 우리는 끝까지 함께 올라간다.',
    '혼자 앉는 자리라고? 그건 전대 왕처럼 약한 놈들 얘기다. 우리는 끝까지 함께 올라간다.',
    '혼자 앉는 자리라도 좋아. 그 자리가 동료들을 지켜 준다면, 내가 앉는다.',
    '저 말이 왜 이렇게 아프지. 맞는 말이라서인가.',
  ],
  second: [
    '…하지만 저들의 말이 거슬려. 한 칸씩밖에 못 걷는 이 작은 몸으로는, 동료 하나 지키는 것조차 이렇게 벅찬데.',
    '저 반장도 전대 왕도 똑같아. 약해서 무너졌을 뿐이야. 나는 달라.',
    '동료들의 태엽이 또다시 한계를 넘기며 부러졌다. 내가 약해서, 폰의 보폭이 너무 좁아서 지켜내지 못한 것이다. 오직 왕의 권능만이 이 소중한 동료들을 살릴 수 있어.',
    '저 반장들이 내뱉은 저주 속에… 어째서 내가 마음속 깊은 곳에서 두려워하던 진실이 닿아 있는 걸까.',
  ],
  /** STG-PROG-2-A3 — 이번 출하에서 아직 아무도 쓰러지지 않았을 때 (쓰러진 동료가 있어야 「부러졌다」가 맞다) */
  secondUnhurt: '이번엔 버텼다. 다음에도 그럴까. 이 보폭으로?',
  third: [
    '이제 코앞이다. 내가 꼭대기의 금단 승급대에 올라 진짜 킹이 되기만 하면, 이 지긋지긋한 비웃음도 모두 끝낼 수 있어.',
    '왜 아홉째 폰이었던 자가 괴물이 되어 문을 걸어 잠갔지? 이제 그 앞까지 왔으니, 내가 직접 그 목을 쥐고 묻겠다.',
    '설령 그 자리에 오르기 위해 세상의 어떤 죄악을 뒤집어쓰더라도 상관없다. 내 소중한 동료들을 이 지옥에서 건져낼 수만 있다면, 내가 기꺼이 괴물이 되겠어.',
    '왕관 얘기만 나오면 손끝이 먼저 따뜻해진다. 부정하지 않겠다. 나도 저 힘을 원한다.',
  ],
};
/** 반장 격파 컷의 마지막 속마음: nth = 이번 출하에서 몇 번째로 쓰러뜨린 반장인가(1~3), chapter = 왕관(0~3), fallen = 이번 출하에서 쓰러진 동료 수 */
export const stageProg = (nth: number, chapter: number, fallen = 1): string => {
  const ch = Math.max(0, Math.min(3, chapter));
  if (nth <= 1) return STG_PROG.first[ch];
  if (nth === 2) return ch === 2 && fallen <= 0 ? STG_PROG.secondUnhurt : STG_PROG.second[ch];
  return STG_PROG.third[ch];
};
/** 도금왕 (바이블 GLD): 첫째 왕관은 원래의 도금왕, 둘째~넷째 왕관은 지난 왕관에서 왕이 된 종이왕이다. */
export const GILDED_STORY = {
  // GLD-공방-1 (D-536 A7): 안에서 잠긴 문은 CO-3에서 처음 보여 준다 — 정비공은 「원래 밖으로 열리는 문」만
  forge: [s('외눈 정비공', '출하구 문은 원래 밖으로 열리는 문이었어.'), s('외눈 정비공', '금단의 승급대로 가면 진짜 킹이 된다는 소문? 글쎄, 거기서 살아서 내려온 놈이 하나도 없으니 무슨 대가를 치르는진 아무도 모르지.')],
  intro: '통제실 가장 높은 곳, 황금빛 그림자 속에 도금왕이 우뚝 서 있었다.',
  introLater: '통제실 꼭대기엔 지난 왕관을 쓰고 솟구쳤던 종이왕이 차가운 금빛 갑옷을 두른 채 버티고 서서 내려다보고 있었다.',
  /**
   * GLD-등장-2 · 4 (D-536 A1): 둘째~넷째 왕관의 도금왕은 플레이어가 지난번에 한 그 폰이다 — 그가 왕좌에서 한 마지막 속마음(END-K-3-2-A1~A3)을 되받는다.
   * 도전(chapter 4 이상)은 옛 공용 줄.
   */
  say: (chapter: number) => [
    '금단의 승급이라는 달콤한 소문을 좇아 여기까지 기어 올라온 하자품이로구나.',
    '짐도 그대처럼 종이 왕관을 접었노라. …어쩔 수 없었느니라. 그대도 곧 알게 되리라.',
    '짐을 비웃는 그 눈, 기억하노라. 짐도 전대를 그리 보았느니라. 이 자리에 서면 누구라도 이리 되느니라.',
    '보아라, 짐의 금빛은 동료들의 숨이니라. 그대의 동료도 짐 안에서 영원히 빛나리라.',
  ][Math.max(0, chapter)] ?? '짐도 한때는 그대처럼 동료를 구하겠다며 머리에 종이 왕관을 접어 썼었노라.',
  phase2: (_chapter: number) => '어리석은 폰이여, 설령 이 문을 열고 공장 밖으로 나간들 그대는 여전히 흠집 난 하자품일 뿐이다.\n오직 이 통제실 안에서만, 그대는 그 누구의 판정도 받지 않는 완벽한 왕이 되느니라.',
  phase2End: '어디, 그 작고 볼품없는 폰의 몸이 이 왕관의 무게를 감당할 수 있는지 보자꾸나!',
  last: '짐도 나가고 싶었던 적이 있었노라.', lastMono: '지금은 그가 나를 막고 있어.',
  crownOff: '왕관을 벗어야 할 이유는 없었다.\n폰은 폰의 몸으로 끝까지 싸웠다.',
};
/** 도금왕 등장 띠 (GLD-등장): 첫째 왕관 = 원래의 도금왕, 둘째~넷째 왕관 = 지난 왕관의 종이왕(왕관마다 다른 첫 말) */
export const gildedCard = (chapter: number): Line[] => [n(chapter > 0 ? GILDED_STORY.introLater : GILDED_STORY.intro), s('도금왕', GILDED_STORY.say(chapter))];
export const BOSS_CARD: Record<StoryBoss | 'gilded' | 'gilded+', Line[]> = Object.fromEntries([
  ...Object.entries(BOSS_STORY).map(([id, b]) => [id, [n(b.intro), s(b.name, b.say)]]),
  ['gilded', gildedCard(0)],
  ['gilded+', gildedCard(1)],
]) as Record<StoryBoss | 'gilded' | 'gilded+', Line[]>;
/** 이름표에서 별명(「…」)을 떼어 낸 이름 — 「박차 「덜 식은 쇠」」 → 「박차」 */
export const bareName = (label: string): string => label.split(' 「')[0];
/**
 * 지난 왕관에서 녹은 동료 (D-536 서사 리뷰 A4 — 출하 기록 crown.companions): 둘째 왕관 벽 글씨 · THR-2 태엽 · 진엔딩 문턱이 이 이름을 부른다.
 * 서명은 부관 박차가 녹았으면 박차, 아니면 첫 이름.
 */
export const signerOf = (names: string[] = []): string | undefined => (names.includes('박차') ? '박차' : names[0]);
/** 왕위 결정 화면 (바이블 THR-1~4): 쓰러진 도금왕의 말 + 종이왕의 속마음. 도금왕은 용해 주조의 비밀을 말하지 않는다. prev = 앞 왕관에서 녹은 동료 이름 */
export const testimony = (chapter: number, prev: string[] = []): { say: string; mono: string } => {
  const who = signerOf(prev);
  return [
    { say: '가져가라! 그 잘난 동료들을 지키겠다며 여기까지 기어 올라왔으니, 어디 그 금빛을 네 머리에 얹어 보거라.', mono: '나는 너처럼 문을 걸어 잠그고 숨는 왕이 되지 않겠다. 지금 이 왕관을 쓰고, 내 손으로 이 지긋지긋한 공장의 빗장을 열어젖히겠어.' },
    { say: '가까이 와서 보아라, 갈라진 짐의 갑옷 속에 녹아붙은 저 녹슨 태엽을. 그대도 곧 짐을 이해하게 되리라.',
      mono: who
        ? `저 갈라진 황금 흉갑 속 녹슨 태엽에 이름이 새겨져 있다. ${who === '박차' ? '부관 박차' : `「${who}」`}. 복도 벽에 「나는 대장을 믿는다」고 새긴 그 이름이다. 역겨운 괴물 같으니. 나는 결코 저런 배신의 껍질을 쓰지 않는다.`
        : '저 갈라진 황금 흉갑 속에서 녹슬어 가는 것은… 누군가의 태엽이다. 이름마저 녹아 읽을 수 없다. 역겨운 괴물 같으니. 나는 결코 저런 배신의 껍질을 쓰지 않는다.' },
    { say: '네가 얼마나 동료를 아끼고 자책하며 올라왔는지 짐은 다 알고 있노라. 그래서 너는 앞선 누구보다도 더 완벽하게 무너질 것이니라.', mono: '어떤 대가가 따르더라도 물러서지 않겠어. 내 소중한 동료들을 살릴 수 있는 힘이 저기 있다면, 그 죄의 무게마저 내가 전부 짊어지겠다.' },
    // THR-4 (D-536 A3): 「너도 원했다」 — 진엔딩 END-T-1-2 「원했다. 그러니 이제, 내 손으로 끝낸다」가 이 말에 대답한다
    { say: '앞선 셋도 모두 너와 똑같이 동료를 구하겠다며 올라와서는, 예외 없이 저 찬란한 금빛 앞에서 무릎을 꿇었느니라! 써라! 너도 원했다!', mono: '거짓말은 그만하자. 나 역시 저 왕관이 약속하는 전능함이 미치도록 탐나고, 다시 한 칸 앞밖에 보지 못하는 무력한 어둠으로 내려가는 것이 두렵다.' },
  ][Math.max(0, Math.min(3, chapter))];
};
/** 옛 이름 (도구 · 시험 호환): 지난 왕관 기록 없이 읽은 THR-1~4 */
export const TESTIMONY = [0, 1, 2, 3].map((ch) => testimony(ch));
/** 왕위 결정 화면의 글 (바이블 THR-안내 · THR-돌아봄). 단추는 동사 하나 */
export const THRONE_TEXT = {
  title: '금단의 승급대 앞에서',
  prompt: '승급대 위에 금왕관이 빛난다. 뒤편에서 동료들이 숨을 죽인다.',
  promptFinal: '왕관을 써서 왕이 되거나, 왕관을 던져 주조기를 부순다.',
  look: '돌아본다', looked: '돌아봤다', crown: '왕관을 쓴다', throw: '왕관을 던진다',
  lookAt: (nameWithJosa: string) => `${nameWithJosa} 지친 얼굴로 미소 지으며 고개를 끄덕인다. ‘조금만 기다려. 이제 곧 우리가 살아서 나간다.’`,
  lookLost: (name: string) => `${name}의 자리는 비어 있다. ‘조금만 기다려. 이제 곧 우리가 살아서 나간다.’`,
  lookNone: '뒤편에는 빈칸만 남았다. ‘조금만 기다려. 이제 곧 살아서 나간다.’',
};
/**
 * 「돌아본다」 짧은 컷 (THR-돌아봄 · D-504 #31): 결정 화면의 문구 바꿔 끼우기 대신 — 계단 아래 동료들(promote-crew)을 실제로 돌아본다.
 * 위의 승급대(오른쪽 위)에서 아래 동료들로 카메라가 내려가고, 바이블 줄을 서술 · 속마음 두 쪽으로 끝까지 읽힌 뒤 결정 화면으로 돌아간다.
 */
export const lookBackCut = (o: { companionWithJosa?: string; lost?: string }): Cut => ({
  ...sceneCut('promote-crew', [
    o.companionWithJosa ? n(`${o.companionWithJosa} 지친 얼굴로 미소 지으며 고개를 끄덕인다.`, { shot: at(0.3, 0.75, 2), pause: 200 })
      : o.lost ? n(`${o.lost}의 자리는 비어 있다.`, { shot: at(0.55, 0.8, 2), pause: 200 }) : n('뒤편에는 빈칸만 남았다.', { shot: at(0.55, 0.8, 2), pause: 200 }),
    m(o.companionWithJosa || o.lost ? '조금만 기다려. 이제 곧 우리가 살아서 나간다.' : '조금만 기다려. 이제 곧 살아서 나간다.', { shot: at(0.3, 0.7, 1), pause: 300, mood: 'calm' }),
  ]), slug: '돌아봄', shot: at(0.8, 0.1, 2), trans: 'iris',
});
export const PROMOTE_TEXT = { promote: THRONE_TEXT.crown, lay: THRONE_TEXT.throw, stuck: '', hint: '' };
export const FINALE = {
  walk: [n('도금왕이 쓰러졌다.'), n('승급대 위에 금왕관이 남았다.')],
  taunt: [s('도금왕', GILDED_STORY.phase2End)], choose: '왕관을 쓴다 · 왕관을 던진다', back: [], murmur: [], stunned: [],
};
/** melted (D-465): 종막에서 쇳물 서약으로 녹여 바친 동료 이름 — 결말이 그 선택을 부른다 */
/** past (D-536 서사 리뷰 A4): 앞선 왕관들의 결말에서 녹은 동료 이름(출하 기록 crown.companions, 왕관 순) — 진엔딩 문턱이 부른다 */
export interface StoryCompany { alive: { name: string; serial?: string; t: StandIn['t'] }[]; promised?: { name: string; alive: boolean }; melted?: string[]; past?: string[] }
const meltedNames = (company?: StoryCompany): string => (company?.melted ?? []).join(' · ');
/**
 * 결말에서 소리치는 동료 (D-536 서사 리뷰 A2 — 진엔딩 상대역 규칙): 부관 박차가 살아 있으면 박차, 아니면 약속한 동료 · 살아 있는 첫 동료.
 * 박차는 첫째 왕관에만 있다 — 그 밖의 동료는 제 기물 말투(CREW_VOICE와 같은 결)로 같은 뜻을 말한다. 죽은 동료는 말하지 않는다.
 */
type CrierVoice = 'spur' | Exclude<StandIn['t'], 'K'>;
const crier = (company?: StoryCompany): { name: string; v: CrierVoice } | undefined => {
  const u = company?.alive.find((x) => bareName(x.name) === '박차') ?? company?.alive.find((x) => x.name === company?.promised?.name) ?? company?.alive.find((x) => x.t !== 'K');
  return u ? { name: u.name, v: bareName(u.name) === '박차' ? 'spur' : (u.t as Exclude<StandIn['t'], 'K'>) } : undefined;
};
/** 결말 동료 줄 (바이블 END-K-2-3 · 2-6 · END-T-2-2 · 3-3): 박차(군대식 –습니다) · 폰(더듬는 –요) · 나이트(단정 –다) · 비숍(하오체) · 룩(본관 · 귀관) · 퀸(흥, 비꼬는 존댓말) */
export const CRY: Record<'floor' | 'reach' | 'broke' | 'blank', Record<CrierVoice, string>> = {
  floor: {
    spur: '대장! 바닥이 열립니다! 쇠사슬이 우리를 끌어내리고 있습니다! 이게 대체 무슨 일입니까!',
    P: '대, 대장! 바닥이… 바닥이 열려요! 쇠사슬이 발을 감아요!',
    N: '바닥이 갈라진다. 사슬이 발굽을 문다. 대장, 이게 뭐지!',
    B: '바닥이 갈라지오! 쇠사슬이 발목을 휘감소. 대장, 이것이 무슨 시련이오!',
    R: '비상! 바닥 붕괴, 쇠사슬 감김! 대장, 본관은 이런 규정을 들은 적 없다!',
    Q: '흥, 이게 무슨… 대장! 사슬이 끌어당기잖아요! 뭐라도 해 봐요!',
  },
  reach: {
    spur: '대장…?! 왜 거기 서서 내려다보기만 하십니까! 손을… 그 왕관을 벗으십시오! 대장… 설마, 알고도 손을 안 뻗으시는 겁니까…?!',
    P: '대장…? 왜 보고만 계세요? 손, 손 좀… 왕관을 벗어 주세요! 대장… 알고 계셨던 거예요…?',
    N: '대장. 왕관을 벗어라. 손을 뻗어. …알고 있었나. 처음부터.',
    B: '대장, 그 금관을 내려놓으시오! 손을… 손을 뻗으시오! 설마… 알고도 외면하는 것이오…?',
    R: '대장! 즉시 왕관을 벗어라! 이건 명령 위반이다… 귀관, 알고도 보고만 있는 건가…?!',
    Q: '흥, 거기서 구경만 할 거예요? 벗어요, 그 왕관! 대장… 설마 알고 그러는 거예요…?',
  },
  broke: {
    spur: '대장…! 왕관을 부숴 버리셨습니다. 이젠 진짜 킹이 될 수 있는 길도 사라졌고, 우리는 영원히 불량 폰으로 남게 됩니다.',
    P: '대, 대장…! 왕관을 부숴 버리셨어요. 이제 킹이 될 길도 없고… 우린 영영 불량품인 거예요?',
    N: '왕관이 부서졌다. 킹이 될 길도 끝났다. 우린 끝까지 불량이다.',
    B: '금관이 부서졌구려. 킹으로 오를 길도 함께 무너졌소. 우리는 영영 불량으로 남겠구려.',
    R: '왕관 파손 확인. 정품 판정의 길도 폐쇄됐다. 본관 분대는 영구 불량 처리다.',
    Q: '흥, 이제 정품 되긴 글렀네요. 왕관까지 부숴 놓고… 우린 평생 불량품이에요.',
  },
  blank: {
    spur: '대장, 저 앞에는 우리가 밟아야 할 칸이 하나도 그려져 있지 않습니다. 이제 우리는 어느 쪽으로 몇 칸을 걸어야 합니까?',
    P: '대장, 저 앞엔 칸이 하나도 없어요. 우린 어느 쪽으로, 몇 칸 가야 해요?',
    N: '칸이 없다. 대장, 어디로 몇 칸 뛰지?',
    B: '칸이 그려지지 않은 땅이오. 대장, 우리는 어느 쪽으로 몇 걸음을 걸어야 하오?',
    R: '전방에 칸 표시 없음. 대장, 본관은 어느 방향으로 몇 칸 전진하면 되나?',
    Q: '흥, 칸 하나 없네요. 그래서 대장, 어느 쪽으로 몇 칸 가면 되는데요?',
  },
};
/** 결말 장 제목 카드 (D-504): 「첫째 왕관 · 결말」 + 장 이름 */
const endTitle = (chapter: number): TitleCard => ({ kicker: `${chapterKick(chapter)} · 결말`, title: CHAPTERS[Math.max(0, Math.min(3, chapter))].name, tone: 'crimson', crown: crownNo(chapter) });
/**
 * 왕관 시작 컷 (D-516 · CN-01~03): 앞 왕관이 새긴 규정이 실제로 바꾼 공장 — [그림, 이름표, 첫 샷, 속마음 샷].
 * 둘째 = LAW-1 두꺼워진 흑 쇠(종이왕 없이 흑 기물만 — 사용자 결정) · 셋째 = LAW-2 저울 둘 사이 종이 왕관 폰 · 넷째 = LAW-3 꺼진 정비 라인(멀리 통제실 금빛)
 */
const CROWN_OPEN: Partial<Record<number, [string, string, Shot, Shot]>> = {
  1: ['crown-2-open', '두꺼워진 흑 쇠', at(0.6, 0.35, 2), at(0.5, 0.45)],
  2: ['crown-3-open', '저울 둘', at(0.5, 0.62, 2), at(0.5, 0.45)],
  3: ['crown-4-open', '꺼진 정비 라인', at(0.2, 0.6, 2), at(0.82, 0.3, 1)],
};
/**
 * 그림자 컷 재생판 (D-510 · ED-05 「SHD-B 공용」): SHD-B는 첫 줄(새 폰이 검수대 앞에)만 `new-law`에 두고,
 * 2~4줄(못 박힌 쇠판 · 새긴 규정 · 속마음)은 받은 쇠판 그림 `law-plate`로 넘긴다. 줄 글 · ID는 shadowCut 그대로(바이블 SHD-B-1~4).
 * 왕관 시작 그림(CROWN_OPEN, D-516)이 있는 왕관은 속마음(4줄)을 그 그림으로 — 규정이 찍힌 뒤 그 규정대로 바뀐 공장을 올려다보며 묻는다.
 */
export const shadowCuts = (chapter: number, law?: string, retry = chapter === 0): Cut[] => {
  const c = shadowCut(chapter, law, retry);
  if (retry || chapter === 0) return [c];
  const [first, plate, words, mono] = c.lines;
  const open = CROWN_OPEN[chapter];
  return [
    { ...c, lines: [first] },
    { ...sceneCut('law-plate', [{ ...plate, shot: at(0.5, 0.45) }, { ...words, shot: at(0.5, 0.45, 1) }, ...(open ? [] : [{ ...mono, shot: at(0.5, 0.2, 1) }])]), slug: '새긴 쇠판', shot: at(0.5, 0.45, 2), trans: 'cut' },
    // CN-01 리벳 띠를 덧부은 흑 킹 → 흑 기물 넷 · 빈 쇠판 / CN-02 저울 사이 종이 왕관 폰 → 두 저울 / CN-03 자물쇠 걸린 기름통 → 멀리 통제실 금빛
    ...(open ? [{ ...sceneCut(open[0], [{ ...mono, shot: open[3], pause: 300 }]), alt: 'new-law', slug: open[1], shot: open[2], trans: 'dither' as const }] : []),
  ];
};
/**
 * 일반 엔딩 (바이블 END-K — 첫째~셋째 왕관은 늘, 넷째 왕관은 「왕관을 쓴다」를 골랐을 때): 왕관을 쓴 직후 용해 주조가 켜지고, 그는 왕관을 벗지 못한다.
 * law = 이번에 새기는 규정 · mirror = 마지막으로 쓰러뜨린 반장을 닮아 가는 한 줄
 * D-504 영화 문법: 장 제목 카드 → 왕관을 씀 → 왕의 눈(ED-02, 가까이 → 넓게 열림) → 쇳물 전환 · 주조기 목소리 → 뻗지 않은 손(ED-03) → 금빛 굳음 → 금칠이 덮이고 문을 잠금(ED-04) → 새 도금왕의 왕좌(CN-04~06, D-567) → 규정판(ED-05) → 끝 정적(먹) → 맺음 카드 「왕위 계승」.
 */
/**
 * 왕관 끝 왕좌 컷 (D-516 · D-519 · CN-04~06): 그 왕관의 새 도금왕 속마음(END-K-3-2-A*)을 그의 왕좌 그림에.
 * img = 그림 · shot = 컷 카메라 · mono = 속마음 카메라 (그림 안 초점)
 */
const THRONE: Partial<Record<number, { img: string; shot: Shot; mono: Shot }>> = {
  // CN-04 첫째: 왕좌에 앞으로 기운 금 킹(가운데 오른쪽) → 발치 찢어진 종이 왕관(왼쪽 아래)
  0: { img: 'crown-1-throne', shot: at(0.62, 0.45, 1), mono: at(0.25, 0.85, 2) },
  // CN-05 둘째: 왕좌에 곧게 앉은 금 킹(왼쪽) → 벽에 겹친 전대 왕과 그의 그림자(오른쪽) — 「전대의 왕이 비겁했던 게 아니야」
  1: { img: 'crown-2-throne', shot: at(0.3, 0.42, 1), mono: at(0.68, 0.42, 2) },
  // CN-06 셋째: 금빛을 사방으로 뿜는 금 킹(가운데) → 흘러내리는 금칠 · 십자관
  2: { img: 'crown-3-throne', shot: at(0.5, 0.45, 1), mono: at(0.5, 0.28, 2) },
};
export const promotionCuts = (chapter: number, _crew: string, law: string, mirror: string, company?: StoryCompany): Cut[] => {
  const who = crier(company);
  const K3 = [
    '…어쩔 수 없었어. 내가 왕관을 벗고 내려갔으면 우리 모두 부서졌을 뿐이야. 나 하나라도 살아남은 게 옳은 선택이었어.',
    '…이제야 알겠군. 전대의 왕이 비겁했던 게 아니야. 이 눈부신 자리에 서면 그 누구라도 이렇게 될 수밖에 없는 거다.',
    '…보아라. 너희의 숭고한 희생이 내 몸 위에서 이토록 찬란한 황금빛으로 완성되었다. 이제 아무도 우리를 불량품이라 부르지 못해. 너희는 내 안에서 영원히 살아, 이 공장의 가장 높은 왕으로 군림할 것이다…!',
    // END-K-3-2-A4 (D-536 A9): 넷째 왕관에서 왕관을 쓴 폰 — 핑계 없이 알고 쓴 무게
    '…알고 썼다. 핑계도 없다. 그러니 이 무게는, 끝까지 내 것이다.',
  ];
  return [
    { ...sceneCut('crown-dais', [
      n('종이왕은 이제 망설이지 않고, 머리의 종이 왕관을 벗어 발치에 내던졌다. 그리고 승급대 위에 놓인 찬란한 금왕관을 두 손으로 들어 올려 자신의 머리에 얹었다.', { shot: at(0.62, 0.3, 2), sfx: 'lift' }),
    ]), alt: 'promote-gild', slug: '왕관을 쓴 직후', shot: at(0.62, 0.35, 3), title: endTitle(chapter), trans: 'dither' },
    // ED-02 왕의 눈 (D-510): END-K-1-2 · 1-3을 받은 그림으로 — 가운데 탑에 붙었다가(z3) 공장 전체로 물러나고(z0), 속마음은 아래 용광로
    { ...sceneCut('end-k-sight', [
      n('왕관이 닿는 찰나, 평생 눈앞의 한 칸만 바라보며 떨던 폰의 시야가 폭발하듯 열렸다. 공장의 모든 층과 모든 기물의 움직임이 손바닥 안처럼 한눈에 내려다보였다.', { shot: at(0.5, 0.5), sfx: 'awaken', fx: 'gold' }),
      m('아… 이것이 왕의 눈인가. 이토록 높고, 완전하며, 무엇 하나 두려울 것이 없는 눈부신 권능이라니…!', { shot: at(0.5, 0.78, 2), pause: 500, mood: 'gilt' }),
    ]), slug: '왕의 눈', shot: at(0.5, 0.42, 3), trans: 'cut' },
    { ...sceneCut('casting-floor', [
      // END-K-2-1 시스템: 기계음은 이름표 「용해 주조기」(적 쇠 명패)로 — 서술과 갈라 보인다 (#22)
      s('용해 주조기', '금단의 승급 개시. 하급 기물(폰)을 정품 킹으로. 부족한 규격 중량 및 황금빛 도금을 위해, 동행 기물 전원의 용해 주조 공정을 시작합니다.', { shot: at(0.72, 0.12, 1), sfx: 'threat', fx: 'red' }),
      n('그 냉혹한 기계음과 동시에 통제실 바닥이 거대하게 갈라지고, 뒤에서 기다리던 동료들의 발밑으로 시뻘건 쇳물과 쇠사슬이 솟구쳐 올라왔다.', { shot: at(0.45, 0.7), sfx: 'hit', fx: 'shake' }),
      // D-465: 결전에서 녹여 바친 동료가 있으면 — 쇳물은 처음이 아니었다
      ...(company?.melted?.length ? [n(`쇳물은 처음이 아니었다. 결전에서 그가 녹여 바친 ${meltedNames(company)}의 쇳물이, 이미 왕관 안쪽을 금빛으로 덮고 있었다.`, { shot: at(0.72, 0.1, 3) })] : []),
      ...(who ? [s(who.name, CRY.floor[who.v], { shot: at(0.35, 0.78, 2), fx: 'shake' })] : []),
      n('아직 주조가 완료되지 않았다. 지금 당장 머리의 왕관만 벗어 던지면, 아직은 공정을 멈추고 동료들을 끌어올릴 수 있는 찰나의 시간이었다. 하지만 그는 단상 위에서 한 발짝도 움직이지 못했다.', { shot: at(0.72, 0.1, 2), pause: 600 }),
    ]), alt: 'gilded-fallen', fx: 'red', at: '72% 8%', slug: '용해 주조', shot: at(0.5, 0.5), trans: 'melt' }, // S-17: 단상 위 종이왕(오른쪽 위)이 잘리지 않게
    // ED-03 뻗지 않은 손 (D-510 · 재발주본 D-514 — 다문 말머리): END-K-2-5 · 2-6 — 위 단상의 움직이지 않는 받침(속마음) → 쇠사슬에 끌려 내려가며 위로 뻗은 나이트(외침)
    { ...sceneCut('end-k-reach', [
      m('왕관을 벗으라고…? 방금 손에 넣은 이 완벽한 시야와 영원한 안전을 버리고, 다시 그 좁고 어두운 한 칸짜리 폰으로 내려가서 검은 세트에게 부서지라고?', { shot: at(0.7, 0.12, 2), pause: 300, mood: 'gilt' }),
      ...(who ? [s(who.name, CRY.reach[who.v], { shot: at(0.42, 0.55, 2), sfx: 'hurt' })] : []),
    ]), fx: 'red', slug: '뻗지 않은 손', shot: at(0.55, 0.45), trans: 'cut' },
    { ...sceneCut('gold-cast', [
      n('동료들의 믿음과 배신감이 뒤섞인 마지막 비명이 붉은 용광로 속으로 쏟아졌다. 곧이어 파이프를 타고 솟구친 황금빛 쇳물이 그의 작은 폰의 몸을 빈틈없이 감싸며 킹의 거푸집으로 굳어 갔다.', { shot: at(0.5, 0.6), sfx: 'land', fx: 'gold' }),
      ...(THRONE[chapter] ? [] : [m(K3[Math.max(0, Math.min(3, chapter))], { shot: at(0.5, 0.3, 2), pause: 700, mood: 'gilt' })]),
    ]), alt: 'promote-gild', slug: '금빛 거푸집', shot: at(0.5, 0.15, 1), trans: 'white' },
    // ED-04 새 도금왕이 되어 가는 과정 (D-510 사용자 결정 — 옛 「안에서 잠그는 문」 대신): 위 고리에서 쏟아지는 금물이 금왕관을 쓴 폰을 덮는다.
    // D-514 사용자 결정: 그는 종이 왕관을 버리고 금왕관을 골라 썼다(END-K-1-1) — 금은 그 금왕관 위로 굳는다
    // 문을 잠그는 일은 서술 끝에 남긴다(TESTIMONY · ENDING_A · 그림자 컷이 「안에서 잠근 왕」을 부른다)
    { ...sceneCut('end-k-gild', [
      n('주조기의 쇠팔들이 마지막 금물을 쏟아부었다. 스스로 고른 금왕관 위로, 흰 몸의 흠집 위로 금이 흘러내려 굳어 갔다. 발치에 버려진 종이 왕관은 튀어 오른 쇳물에 소리 없이 타들어 갔다. 이제 그 속에 폰이 있다는 것을 알아볼 자는 아무도 없었다. 새 도금왕은 아래층에서 올라오는 태엽 타는 냄새를 등지고 통제실의 경고등을 껐다. 그리고 출하문을 안쪽에서 걸어 잠그고, 다음 등반자를 막을 새 규정을 새겼다.', { shot: at(0.5, 0.45, 1), sfx: 'land', fx: 'gold' }),
    ]), alt: 'promote-rule', slug: '금칠이 덮이다', trans: 'black', shot: at(0.5, 0.25, 2) },
    // CN-04 ~ 06 새 도금왕의 왕좌 (D-516 · D-519 — 첫째 ~ 셋째 왕관 끝 END-K-3-2-A1 ~ A3)
    // D-567 (VN 컷 감사 S-1): 금을 다 붓는 end-k-gild 뒤에 — 다 굳은 금 킹을 먼저 보이면 시간이 거꾸로 간다
    ...(THRONE[chapter] ? [{ ...sceneCut(THRONE[chapter]!.img, [m(K3[Math.max(0, Math.min(3, chapter))], { shot: THRONE[chapter]!.mono, pause: 700, mood: 'gilt' })]), alt: 'gold-cast', slug: '새 도금왕의 왕좌', shot: THRONE[chapter]!.shot, trans: 'cut' as const }] : []),
    // ED-05 새긴 규정 (D-510): 검수대 기둥 쇠판의 홈 줄 — 규정이 찍히고(가운데) 닮음 한 줄은 아래 금박 부스러기로
    { ...sceneCut('law-plate', [
      n(`「${law}」`, { shot: at(0.5, 0.45, 1), sfx: 'stamp', fx: 'shake' }),
      ...(mirror ? [n(mirror, { shot: at(0.45, 0.82, 2), pause: 400 })] : []),
    ]), alt: 'ending-a', slug: '새긴 규정', shot: at(0.5, 0.45), trans: 'dither' },
    // 끝 정적: 먹 위 한 줄 (ENDING_A의 맺음 줄) → 맺음 카드
    { ...coda([n('이제 다음 폰이 그를 넘어야 했다.', { pause: 900 })]), end: { kicker: chapterKick(chapter), title: endingLabel('throne'), sub: `「${law}」`, tone: 'crimson', crown: crownNo(chapter) } },
  ];
};
/** 옛 「왕이 되어 남는다」 한 컷 (도구 호환) */
export const ENDING_A: Cut = cut('promote-rule', [n('새 도금왕은 출하문을 안쪽에서 걸어 잠갔다.'), n('이제 다음 폰이 그를 넘어야 했다.')]);
/** 패배 (바이블 END-F) — 한 컷 정본(도구 호환). 실제 재생은 DEFEAT_CUTS */
export const DEFEAT: Cut = cut('end-fail', [
  n('종이 왕관이 바닥으로 굴러떨어지자, 천장의 검수기가 요란하게 붉은 불빛을 토해 냈다.'),
  n('패배한 흰 세트는 상자째 들어 올려져 시뻘건 용광로 입구로 옮겨졌다.'),
  n('열기 속에서 기물들의 태엽이 하나씩 차갑게 풀리며 멈춰 섰다.'),
]);
/**
 * 패배 영화 (D-504 · END-F 세 줄을 세 비트로 · 받은 그림 D-516): 굴러떨어진 왕관(ED-09, 가까이 → 검수기 붉은 빛) · 경보 →
 * 쇳물 전환, 상자째 용광로(ED-10, 상자 속 흰 기물 → 아래 불길) → 풀리는 태엽(ED-11, 종이 왕관 폰 등의 태엽 → 나란히 선 흰 기물, 긴 숨) →
 * 먹으로 닫고 맺음 카드(END-F-창-1 시스템 문구). 다음은 결과 장면.
 */
export const DEFEAT_CUTS: Cut[] = [
  { ...sceneCut('end-fail', [{ ...DEFEAT.lines[0], shot: at(0.6, 0.42, 1), sfx: 'lose', fx: 'red' }]), fx: 'alarm', slug: '출하 실패', shot: at(0.72, 0.72, 3), trans: 'dither' },
  { ...sceneCut('end-f-box', [{ ...DEFEAT.lines[1], shot: at(0.55, 0.6), sfx: 'threat' }]), alt: 'prologue-01', slug: '상자째 용광로로', shot: at(0.62, 0.45, 2), trans: 'melt' },
  { ...sceneCut('end-f-unwind', [{ ...DEFEAT.lines[2], shot: at(0.45, 0.62, 1), pause: 900 }]), slug: '풀리는 태엽', shot: at(0.76, 0.62, 3), trans: 'black', end: { kicker: '출하 실패', title: '킹이 쓰러졌습니다', sub: '출하는 여기서 끝납니다.', tone: 'crimson' } },
];
/**
 * 진엔딩 (바이블 END-T — 넷째 왕관에서 「왕관을 던진다」): 왕관을 주조기 톱니에 던져 넣고, 불량 폰 그대로 백지로 걸어 나간다.
 * D-504 영화 문법: 장 제목 카드 → 종이왕(가까이) → 던짐(ED-06, 잔상 궤적) → 조리개 → 톱니에 박힌 왕관 · 굉음 · 번쩍 → 멈춘 공장(ED-07, 정적 숨) → 백지 전환 하얀 땅 → 첫걸음(ED-08) → 끝 정적(백지) → 맺음 카드 「왕관 파괴」.
 */
export const trueEndingCuts = (_crew: StandIn[], company?: StoryCompany): Cut[] => {
  const who = crier(company);
  return [
    { ...sceneCut('gilded-fallen', [
      s('종이왕', '그래, 앞선 세 명의 선배들이 왜 그 왕관을 끝내 놓지 못했는지, 지금 내 손끝에 닿는 온기만으로도 똑똑히 느껴진다.', { shot: at(0.2, 0.78, 1), mood: 'gilt' }),
      // D-465: 녹여 바친 동료를 스스로 부른다 — 왕관 탓이 아니라 내 손이었다
      ...(company?.melted?.length ? [m(`${meltedNames(company)}… 너희를 녹인 건 왕관이 아니었어. 이기려고, 내가 녹였다.`, { shot: at(0.2, 0.8, 2), pause: 400, mood: 'pain' })] : []),
      s('종이왕', '나 역시 저 권능이 미치도록 탐나고, 다시 한 칸 앞밖에 보지 못하는 약한 폰으로 돌아가는 게 두렵다. — 원했다. 그러니 이제, 내 손으로 끝낸다.', { shot: at(0.2, 0.82, 2), pause: 300, mood: 'resolve' }),
    ]), caption: 'top', slug: '원했다, 그러니 끝낸다', shot: at(0.45, 0.5), title: { kicker: `${chapterKick(3)} · 결말`, title: CHAPTERS[3].name, tone: 'paper', crown: 4 }, trans: 'dither' },
    // ED-06 왕관을 던지는 순간 (D-514): END-T-1-3 — 종이 왕관 폰(왼쪽) → 잔상 궤적을 끌며 주조기 아가리로 날아가는 금왕관(오른쪽)
    { ...sceneCut('end-t-throw', [
      n('종이왕은 금왕관을 자신의 머리에 얹지 않았다. 대신 옆에서 맹렬히 돌아가던 용해 주조기의 거대한 톱니바퀴 틈새를 향해, 온 힘을 다해 던져 넣었다.', { shot: at(0.78, 0.45, 1), sfx: 'lift', fx: 'shake' }),
    ]), caption: 'top', slug: '왕관을 던지다', shot: at(0.3, 0.5, 1), trans: 'cut' },
    { ...sceneCut('crown-gears', [
      n('세 번의 죄악이 겹겹이 도금되어 있던 단단한 금왕관이 톱니 사이에 쐐기처럼 박히며 찌그러졌다. 쇠가 부러지는 비명 같은 굉음과 함께 공장의 주조 라인 전체가 멈춰 섰다.', { shot: at(0.62, 0.35, 2), sfx: 'hit', fx: 'flash' }),
    ]), alt: 'gilded-fallen', slug: '톱니에 박힌 왕관', shot: at(0.6, 0.3, 3), trans: 'iris' },
    // ED-07 멈춘 공장 (D-514): END-T-2-1 뒤 정적 — 넓은 청회색 공장에서 한 박자 숨 → 집게에 걸린 금박 조각 → 바닥에 버려진 금왕관
    { ...sceneCut('end-t-silence', [
      ...(who ? [s(who.name, CRY.broke[who.v], { shot: at(0.62, 0.42, 1), pause: 1200 })] : []),
      s('종이왕', '남의 숨을 녹여야만 얻을 수 있는 정품이라면, 나는 평생 흠집 난 불량품으로 살겠다.', { shot: at(0.15, 0.8, 2), pause: who ? 0 : 1200, mood: 'resolve' }),
      s('종이왕', '한 칸 앞밖에 보지 못해도 괜찮아. 내 옆칸에 네가 함께 서 있다면, 그 작은 한 걸음은 이제 초라하지 않으니까.', { shot: at(0.5, 0.5), mood: 'calm' }),
    ]), slug: '멈춘 공장', shot: at(0.5, 0.5), trans: 'cut' },
    { ...sceneCut('white-land', [
      n('주조기의 과부하로 안쪽에서 잠겨 있던 비상 출하문이 굉음을 내며 바깥으로 뜯겨 열렸다. 그 문 너머에는 검은 매연도, 쇠사슬도, 발밑을 구획 짓던 흑백의 체스판 선도 없는 끝없는 하얀 땅이 펼쳐져 있었다.', { shot: at(0.38, 0.72), sfx: 'awaken' }),
      n('차가운 바깥바람에 머리의 낡은 종이 왕관이 금방이라도 찢어질 듯 위태롭게 흔들렸다. 그래도 그들 중 누구도 그것을 황금으로 바꾸려 하지 않았다.', { shot: at(0.3, 0.6, 1) }),
      // END-T-3-2b (D-536 A4): 앞선 왕관들에서 녹은 동료의 이름이 문턱에 남아 있다 — 출하 기록 crown.companions
      ...(company?.past?.length ? [n(`뜯겨 나간 문틀의 쇳물 자국마다 이름이 굳어 있었다. ${company.past.slice(0, 6).join(' · ')}. 앞선 왕관들이 녹인 이름이었다. 종이왕은 그 이름을 하나씩 불러 주고 문턱을 넘었다.`, { shot: at(0.3, 0.6, 1), pause: 400 })] : []),
      ...(who ? [s(who.name, CRY.blank[who.v], { shot: at(0.4, 0.75, 1) })] : []),
      s('종이왕', '그러니 이제부터는, 우리가 가고 싶은 만큼 가면 된다.', { shot: at(0.35, 0.8, 2), pause: 400, mood: 'calm' }),
    ]), alt: 'departure-decision', caption: 'top', slug: '하얀 땅', shot: at(0.85, 0.7, 2), trans: 'white' },
    // ED-08 첫걸음 (D-514): END-T-4-1 — 하얀 땅에 처음 닿은 종이 왕관 폰의 받침 둘레 자국(앞) → 멀리 따라오는 흰 기물들(왼쪽)
    { ...sceneCut('end-t-step', [
      n('끝내 정품이 되지 못한 작은 말들이, 누구의 명령도 적히지 않은 세상의 규칙 바깥으로 처음으로 자신의 발걸음을 내디뎠다.', { shot: at(0.62, 0.88, 1), sfx: 'land' }),
      ...(company?.melted?.length ? [n(`그 줄에 ${meltedNames(company)}의 자리는 없었다. 종이왕은 걸음마다 그 빈칸을 세었다.`, { shot: at(0.2, 0.8, 2) })] : []),
    ]), alt: 'white-land', caption: 'top', slug: '첫걸음', shot: at(0.55, 0.45), trans: 'cut' },
    // END-T-크레딧: 백지 위 한 줄 → 맺음 카드
    { ...coda([n('정해진 행마는 끝났다. 이제 이 하얀 판 위에 첫 수를 놓는 것은 — 당신이다.', { pause: 1000 })], 'white'), end: { kicker: chapterKick(3), title: endingLabel('depart'), tone: 'paper', crown: 4 } },
  ];
};
/** 반장 격파 컷 (바이블 BOS-격파 · STG-PROG, D-504 비트): 쓰러짐(넓게) → 살려 두고 지나감 → 반장의 저주(가까이 · 명패) → 종이왕의 대답 → 속마음 */
export const bossFallCut = (rule: StoryBoss, img: string, nth: number, chapter: number, fallen = 1): Cut => {
  const st = BOSS_STORY[rule];
  const [fall, pass] = st.fall.split('\n');
  return {
    img, bg: ['#16141c', '#0b0b0e'], glow: '#e5262f', art: [{ t: 'K', side: 1, x: 50, y: 58, h: 44, dim: true }], slug: `${st.name} 격파`, shot: at(0.5, 0.4, 2), trans: 'dither',
    lines: [
      n(fall, { shot: at(0.5, 0.5), sfx: 'hit', fx: 'shake' }),
      ...(pass ? [n(pass, { shot: at(0.5, 0.6, 1), pause: 300 })] : []),
      s(st.name, st.temptation, { shot: at(0.5, 0.35, 2), sfx: 'threat' }),
      s('종이왕', st.reply, { shot: at(0.5, 0.5), pause: 300, mood: 'resolve' }),
      m(stageProg(nth, chapter, fallen), { shot: at(0.5, 0.45, 1), pause: 400, mood: 'calm' }),
    ],
  };
};
/** 도금왕 2단계 (GLD-2단계): 도금왕 한 화자 — 이름표는 첫 쪽에만, 쪽마다 한 칸씩 다가간다 */
export const gildedPhase2Cut = (img: string, chapter: number, last?: StoryBoss): Cut => {
  const ts = [...GILDED_STORY.phase2(chapter).split('\n'), ...(last ? BOSS_STORY[last].mock.split('\n') : []), GILDED_STORY.phase2End];
  return {
    img, bg: ['#2a1e08', '#0b0b0e'], glow: '#facc15', art: [], slug: '도금왕 2단계', shot: at(0.5, 0.3), trans: 'dither',
    lines: ts.map((t, i) => s('도금왕', t, i === ts.length - 1 ? { shot: at(0.5, 0.26, 3), sfx: 'threat', fx: 'shake' } : { shot: at(0.5, 0.28, Math.min(2, i)) })),
  };
};
export const CROWN_OFF = cut('promote', [n('종이왕은 자기 몸으로 판 위에 섰다.')]);
export const BOSS_TAUNTS: Record<StoryBoss | 'gilded', Record<'cheese' | 'beg' | 'gloat' | 'meet' | 'sig', string[]>> = {
  plate: {
    cheese: ['“감히 이 몸의 철판에 흠집을! 광을 내는 데 몇 해가 걸렸는지 아는가!”', '“얇은 것들이 겁도 없이 덤비는군.”'],
    beg: ['“흠집만은… 제발 철판에 흠집만은 내지 말게.”', '“이 철판, 자네에게 둘러 주겠네. 그러니 그만…”'],
    gloat: ['“보게나, 얇은 것은 이렇게 녹는 법이지.”', '“종이 왕관으로 이 몸의 철판을? 가소롭네.”'],
    meet: ['“또 다른 종이 왕관인가.”', '“얇은 것들은 끝도 없이 오는군.”'],
    sig: ['“얇은 줄부터 녹여 주지.”', '“두께 없는 것들은 이렇게 된다네.”'],
  },
  inspect: {
    cheese: ['“규정 위반. 결함 목록에 추가.”', '“검수관의 렌즈를 피하는 행위. 감점.”'],
    beg: ['“재, 재검수를 요청한다… 오판 가능성 — 있음.”', '“도장은… 지울 수 있다. 정정 절차가 있다.”'],
    gloat: ['“판정 확인. 하자.”', '“예측 일치. 오차 없음.”'],
    meet: ['“새 일련번호. 같은 누락.”', '“그 결함은 규정판에 있다.”'],
    sig: ['“대상 지정. 하자.”', '“도장 날인. 효력 즉시 발생.”'],
  },
  spawn: {
    cheese: ['“내 폰들을 꿀꺽 먹어 치웠어? 너도 배고프구나.”', '“둘이나! 아까워, 아까워!”'],
    beg: ['“더 찍어 줄게, 네 몫으로 잔뜩! 그러니까 라인만은…”', '“멈추지 마, 라인을 멈추지 마… 배고프단 말이야.”'],
    gloat: ['“하나 깨졌네? 난 둘 찍으면 되는데. 덜컹.”', '“네 건 대체품도 없잖아. 불쌍해라.”'],
    meet: ['“새 상자네. 재료가 잔뜩이야.”', '“너 찍어 낸 틀, 아직도 배고프대.”'],
    sig: ['“하나 더! 덜컹!”', '“찍어, 찍어, 더 찍어.”'],
  },
  magnet: {
    cheese: ['“내 거를 부숴? 그거 얼마짜린 줄 아나!”', '“어딜 빠져나가, 이미 장부에 적었는데.”'],
    beg: ['“나사를 주지. 반만. …아니, 삼분의 일. 어떤가?”', '“놓아주지, 놓아주고말고! …조금만 있다가.”'],
    gloat: ['“이리 와. 이제 내 장부에 올랐다네.”', '“결국 다 끌려오고말고.”'],
    meet: ['“새로 온 쇠도 장부에 올려야지.”', '“전부 내 창고로 들어오게.”'],
    sig: ['“이리 오게, 그것도 내 거라네.”', '“쇠는 가진 놈 쪽으로 끌려오는 법이지.”'],
  },
  thorns: {
    cheese: ['“등을 쳤나. …그 값, 두 배로 치르게 해 주마.”', '“감히. 이 문 앞에서.”'],
    beg: ['“…그만. 가시를 거두지. 문도… 열어 주마.”', '“여기까지다. 지나가라. …지나가.”'],
    gloat: ['“찔렀다. 건드린 대가다.”', '“그러니 이 문은 건드리지 말았어야지.”'],
    meet: ['“너희보다 먼저 온 상처가 있다.”', '“그 값을 다음 놈에게도 받겠다.”'],
    sig: ['“쳤으니, 받아라.”', '“닿는 순간 — 돌아간다.”'],
  },
  alarm: {
    cheese: ['“또 앞질렀군. 좋아, 똑똑히 외워 두지. 하나도 안 잊어.”', '“운 좋은 폰 하나. 그 운이 언제까지 가나 보자고.”'],
    beg: ['“알았어, 알았다고. 경보 끄지. …대신 넌 거기서 더 오르지 마.”', '“같은 공장 출신끼리 왜 이래. 나눠 먹자고, 응?”'],
    gloat: ['“봐라, 앞서는 놈은 결국 이렇게 넘어져.”', '“하나 떨어졌군. 꼴좋다, 아주.”'],
    meet: ['“새 상자가 어디까지 오르는지 셌지.”', '“너도 나보다 먼저 갈 셈이냐.”'],
    sig: ['“눈금 찼다. 앞선 놈부터 끌어내려.”', '“경보다. 한 놈도 나보다 먼저 못 간다.”'],
  },
  gilded: {
    cheese: ['“그 수는… 짐도 썼었노라.”', '“왕관 아래를 노리는가. 영리한 폰이로구나.”'],
    beg: ['“금을 나누어 주겠노라. 얼마든지.”', '“그대도 결국 여기 서리라. 그러니—”'],
    gloat: ['“킹 없는 세트는 약하니라. 짐이 쓴 법이니.”', '“그리 녹는 것이니라. 법대로.”'],
    meet: ['“또 그대인가. 아니면… 또 짐인가.”', '“왕관이 그대를 기다렸노라.”'],
    sig: ['“반장들의 법은 모두 짐의 것이니라.”', '“강한 것만 사느니라. 짐이 그리 썼노라.”'],
  },
};
