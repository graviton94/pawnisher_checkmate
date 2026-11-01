import type { BossId } from './run';
import type { Mood, NpcId } from './npcs';
import type { PieceType } from '../engine/types';

/**
 * 이야기 (D-130 · D-131 · D-135 — docs/story.md v5): 컷 · 대사 · 독백 · 기록지를 한 곳에.
 * 말투: 서술 「* 」(tell) · 기물 대사 「」(say, who = 말하는 이) · 아홉째 폰 독백 ‘ ’(mono). 짧고 차갑게, 설교하지 않는다.
 */
export type LineKind = 'tell' | 'say' | 'mono';
export interface Line {
  kind: LineKind;
  text: string;
  /** say의 화자 이름 */
  who?: string;
}
/** 컷 위의 배우: 말하는 기물(눈 초상화) 또는 기물 도트 */
export interface Actor {
  npc?: NpcId;
  piece?: { t: PieceType; side: 0 | 1 };
  /** 가로 · 세로 위치 (%) · 크기 (px) */
  x: number;
  y: number;
  size: number;
  mood?: Mood;
  /** 흐리게 (등 돌림 · 뒤편) */
  dim?: boolean;
}
export type Backdrop = 'factory' | 'box' | 'furnace' | 'top' | 'room' | 'dark' | 'line';
export interface Cut {
  bg: Backdrop;
  actors: Actor[];
  lines: Line[];
  /** 효과: 경고등 깜빡 · 붉은 도장 · 흔들림 · 금빛 · 조용함 */
  fx?: 'alarm' | 'stamp' | 'shake' | 'gold' | 'calm';
}

const tell = (text: string): Line => ({ kind: 'tell', text });
const say = (who: string, text: string): Line => ({ kind: 'say', who, text });
const mono = (text: string): Line => ({ kind: 'mono', text });
const me = (x = 50, y = 62, size = 120, mood: Mood = 'calm'): Actor => ({ npc: 'ninth', x, y, size, mood });
const pawns = (n: number, y = 74, size = 56, from = 14, step = 9): Actor[] => Array.from({ length: n }, (_, i) => ({ piece: { t: 'P', side: 0 }, x: from + i * step, y, size }));

/** 프롤로그 (처음 출하 한 번 · 도감에서 다시) */
export const PROLOGUE: Cut[] = [
  { bg: 'factory', actors: [], lines: [tell('* 체크메이트 공장.'), tell('* 모양이 곧 값이고, 값이 곧 길이다.')] },
  { bg: 'line', actors: [...pawns(8), me(88, 70, 72, 'wide')], lines: [tell('* 그날 한 세트에'), tell('* 킹 대신 폰이 들어갔다.')], fx: 'alarm' },
  { bg: 'box', actors: [me(50, 60, 120, 'wide')], lines: [tell('* 검수 전광판: 킹 자리에 폰. 세트 전체 불량 처리 예정.'), mono('나 때문이다.')], fx: 'stamp' },
  {
    bg: 'box',
    actors: [{ npc: 'whiteQueen', x: 24, y: 48, size: 110, mood: 'glare' }, { npc: 'whiteRook', x: 76, y: 52, size: 100, mood: 'narrow', dim: true }, { npc: 'whiteBishop', x: 50, y: 40, size: 92, mood: 'look', dim: true }, me(50, 78, 76, 'calm')],
    lines: [say('흰 퀸', '「폰이 킹 자리에? 우리까지 녹이려고.」'), mono('폰이 맞다. 그래서?')],
  },
  { bg: 'box', actors: [me(50, 60, 130, 'sleepy')], lines: [tell('* 상자 귀퉁이를 오려 왕관을 쓴다. 너무 커서 눈까지 내려온다.'), mono('크다. …그래도 쓴다.')] },
  { bg: 'box', actors: [me(50, 58, 96), { piece: { t: 'P', side: 0 }, x: 32, y: 72, size: 60 }, { piece: { t: 'N', side: 0 }, x: 68, y: 72, size: 60 }, { npc: 'whiteRook', x: 88, y: 50, size: 70, mood: 'narrow', dim: true }], lines: [tell('* 따르는 건 몇뿐이다.'), tell('* 나머지는 상자 구석에서 지켜본다.')] },
  { bg: 'factory', actors: [me(50, 60, 120, 'look')], lines: [tell('* 첫 검수대의 불빛.'), mono('녹게 두지 않는다. 아무도.')], fx: 'gold' },
];

/** 공정 진입 (공정 첫 층, 출하마다 한 컷) */
export const ACT_ENTRY: Cut[] = [
  { bg: 'furnace', actors: [me(50, 64, 96)], lines: [tell('* 주조 공정. 기물이 태어나는 곳. 모양이 굳는 곳.'), mono('여기서 모양이 굳는다고 했다.')] },
  { bg: 'line', actors: [me(50, 64, 96, 'look')], lines: [tell('* 조립 공정. 맞는 자리에, 맞는 부품을.'), mono('맞는 자리. 누가 정한 자리.')] },
  { bg: 'top', actors: [{ npc: 'scale', x: 72, y: 50, size: 110, mood: 'narrow' }, me(32, 64, 96)], lines: [tell('* 검수 공정. 틀린 것은 지나갈 수 없다.'), mono('틀렸다는 도장. 많이 받았다.')] },
];

/** 반장: 신념 한 줄 · 쓰러질 때 서술 · 아홉째 폰이 건네는 말 */
export const BOSS_STORY: Record<BossId, { npc: NpcId; belief: string; fall: string; reply: string }> = {
  knight: { npc: 'bossKnight', belief: '* 무거운 것이 밟는다. 나이트는 뛰고, 폰은 밟힌다 — 그가 믿는 것.', fall: '* 편자가 철판에 미끄러진다. 몸의 숫자 3에 금이 간다.', reply: '밟히는 쪽이 정해져 있다고 누가 그랬지.' },
  bishop: { npc: 'bossBishop', belief: '* 사선만이 바른 길이다 — 그가 믿는 것.', fall: '* 렌즈가 깨진다. 몸의 숫자 3에 금이 간다.', reply: '가까이서 보면, 길은 사선만이 아니다.' },
  rook: { npc: 'bossRook', belief: '* 곧게, 자리를 지켜라. 벽 밖은 위험하다 — 그가 믿는 것.', fall: '* 성벽이 옆으로 기운다. 몸의 숫자 5에 금이 간다.', reply: '벽만 보고 섰으니 옆을 못 봤지.' },
  pawn: { npc: 'bossPawn', belief: '* 하나는 아무것도 아니다. 줄 맞춰 앞으로만 — 그가 믿는 것.', fall: '* 열이 한꺼번에 쓰러진다. 숫자 1이 여럿, 같이 갈라진다.', reply: '너희도 하나씩이었다. 줄 밖으로 나와도 된다.' },
  variant: { npc: 'bossVariant', belief: '* 모양이 싫으면 다른 모양을 사라 — 그가 믿는 것.', fall: '* 용접이 풀린다. 사 온 각인이 하나씩 떨어진다.', reply: '바꾼 것도 남이 판 틀이다. 길은 사는 게 아니다.' },
  affix: { npc: 'bossAffix', belief: '* 서류에 없는 길은 없는 길이다 — 그가 믿는 것.', fall: '* 서류가 흩어진다. 아무도 서명하지 않은 판이다.', reply: '서류 밖에도 판은 있다. 지나간다.' },
};

/** 도금왕 (마지막 층) */
export const GILDED = {
  intro: [say('도금왕', '「그 왕관, 종이로군.」'), mono('모양이 운명이라고 쓴 손.')],
  fall: [say('도금왕', '「모양이 길이다. 그래야 아무도 안 다쳐.」'), say('도금왕', '「…나는 칠했다. 너는?」'), mono('…나는 뭐가 되고 싶었지.')],
  /** 승급 칸 앞 울부짖음 (압력과 상관없이) */
  howl: [say('도금왕', '「보아라! 너도 결국 여기까지 왔다. 더 높은 모양이 되려고.」'), say('도금왕', '「폰이라 무시당한 게 억울했지? 그래서 퀸이 되고 싶은 거다. 나처럼.」')],
};

/** 압력 묶음별 승급 장면 (D-131 · 규격 2.0 압력 10단계): from ~ to 압력 — 최고 압력에서만 내려놓는다 */
export const PROMOTION: { from: number; to: number; taunt: string; mono: string; after: string; mood: Mood }[] = [
  { from: 0, to: 1, taunt: '「규격을 깨러 왔다고? 아니. 너는 규격 위에 올라서고 싶었을 뿐이다.」', mono: '아니다. …이번만.', after: '* 퀸이 된다. 흰 기물들이 박수 치듯 철컥인다. 종이 왕관이 바닥에 떨어진다.', mood: 'glare' },
  { from: 2, to: 4, taunt: '「또 왔구나. 무시당한 만큼 올라가고 싶은 거다.」', mono: '또 여기다. 손이 먼저 간다.', after: '* 승급. 박수가 줄었다. 누군가 종이 왕관을 주워 든다.', mood: 'narrow' },
  { from: 5, to: 7, taunt: '「나는 너다. 이 왕관은 네 거다.」', mono: '무겁다. 그런데 놓지 못한다.', after: '* 승급. 흰 기물들이 말없이 본다.', mood: 'look' },
  { from: 8, to: 9, taunt: '「봐라, 또 쓴다. 너는 결국 내가 된다.」', mono: '저 얼굴이 된다. 알면서.', after: '* 승급. 쓰는 순간 금빛이 갈라진다. 아무도 박수 치지 않는다.', mood: 'sleepy' },
  { from: 10, to: 99, taunt: '「써라! 너도 원했다! 힘을, 자리를, 인정을!」', mono: '원했다. 그래서 내려놓는다.', after: '', mood: 'wide' },
];
export const promotionFor = (pressure: number) => PROMOTION.find((p) => pressure >= p.from && pressure <= p.to) ?? PROMOTION[0];

/** 승급 화면 (D-131) */
export const PROMOTE_UI = {
  promote: '승급한다',
  lay: '내려놓는다',
  /** 최고 압력 전: 「내려놓는다」가 떨리다 꺼진다 */
  stuck: '* 손이 떨어지지 않는다.',
  stuckMono: '…아직이다.',
  /** 떨림이 버티는 시간 (ms) = base + 압력 × per */
  holdBase: 300,
  holdPer: 180,
};

/** 승급 뒤 공통 (새 도금왕) */
export const AFTER_PROMOTION: Cut = {
  bg: 'top',
  actors: [{ npc: 'gilded', x: 50, y: 56, size: 130, mood: 'narrow' }],
  lines: [tell('* 새 도금왕이 포장대에 선다. 경고등이 깜빡인다.'), tell('* 손을 뻗어 끈다. 공장은 그렇게 굴러간다.')],
  fx: 'alarm',
};

/** 진 엔딩 「해방」 (최고 압력 · 내려놓는다) */
export const TRUE_ENDING: Cut[] = [
  { bg: 'top', actors: [me(50, 60, 130, 'calm')], lines: [tell('* 종이 왕관을 벗어 접는다. 승급 표시가 꺼진다. 울부짖음이 멈춘다.'), mono('원했다. 그래서 내려놓는다.')], fx: 'calm' },
  { bg: 'top', actors: [{ piece: { t: 'P', side: 1 }, x: 60, y: 64, size: 96 }, { piece: { t: 'K', side: 1 }, x: 34, y: 60, size: 90 }], lines: [tell('* 금 왕관이 혼자 굴러가 멈춘다. 금빛이 벗겨진다 — 안에 흠집 난 폰 하나.'), say('도금왕', '「…나는, 못 했다.」')], fx: 'gold' },
  { bg: 'top', actors: [{ piece: { t: 'P', side: 0 }, x: 38, y: 64, size: 96 }, { piece: { t: 'P', side: 1 }, x: 62, y: 64, size: 96 }], lines: [tell('* 폰 둘이 나란히 선다.'), mono('폰으로 여기까지 왔다. 그거면 됐다.')] },
  { bg: 'box', actors: [{ npc: 'whiteQueen', x: 20, y: 50, size: 90, mood: 'calm' }, { npc: 'whiteRook', x: 38, y: 54, size: 80, mood: 'calm' }, { npc: 'whiteBishop', x: 62, y: 52, size: 80, mood: 'calm' }, { piece: { t: 'N', side: 1 }, x: 80, y: 58, size: 70 }, me(50, 82, 70)], lines: [tell('* 아무도 그를 킹이라 부르지 않는다.'), tell('* 아무도 떠나지 않는다.')] },
  { bg: 'factory', actors: [], lines: [tell('* 경고등이 깜빡인다. 아무도 끄지 않는다.'), tell('* 컨베이어가 멈춘다. 공장이 처음으로 조용하다.')], fx: 'calm' },
  { bg: 'room', actors: [...pawns(9, 70, 52, 10, 10)], lines: [tell('* 어느 방. 아이가 상자를 연다. 설명서는 보지 않는다.'), mono('…판이 펴졌다.')] },
  { bg: 'room', actors: [me(50, 58, 120, 'look')], lines: [tell('* 정해진 길은 없었다.'), tell('* 이 판을 펴는 것도, 당신이다.')] },
];

/** 최고 압력에서도 승급하면 */
export const ENDING_A_MONO = mono('맞는다. 너무.');

/** 패배 (용광로) */
export const DEFEAT: Cut = { bg: 'furnace', actors: [me(50, 60, 110, 'sleepy')], lines: [tell('* 불량 혼입. 집게가 상자째 용광로로. 다시 주조.'), mono('또 아홉째다. 이번엔 누가 먼저 설까.')], fx: 'stamp' };

/** 지켜보던 흰 기물의 합류 (새 기물 보상) */
export const JOIN: Record<Exclude<PieceType, 'K'>, string> = {
  P: '* 폰 하나가 줄 끝에 선다. 「하나 더.」',
  N: '* 나이트 하나가 상자 구석에서 뛰어나온다. 「나도 L자만 뛰는 건 지겨웠다.」',
  B: '* 비숍 하나가 렌즈를 닦고 줄 끝에 선다. 「모양이… 틀린 게 아니었나.」',
  R: '* 룩 하나가 상자 구석에서 걸어 나온다. 「명령은 안 받는다. 옆에 서는 거다.」',
  Q: '* 흰 퀸이 내려온다. 「…폰이 여기까지 온 건 처음 봤어.」',
};
/** 진 흑 기물의 영입 */
export const RECRUIT = '* 쓰러진 흑 기물이 일어나 판 이쪽으로 건너온다. 「…정해진 대로만 두다 졌다.」';
/** 흑 세트의 비웃음 (일반 대국 · 검문! 시작) */
export const TAUNTS = ['「폰이 킹 흉내를.」', '「괴짜 세트다.」', '「모양부터 틀렸어.」', '「정해진 대로 둬.」', '「저건 불량이다. 보면 안다.」', '「폰은 앞으로만 가는 거다.」'];

/** 검수 기록지 12장 (도감) — 풀리는 조건은 run/meta.ts recordsOpen */
export const RECORDS: { title: string; need: string; text: string }[] = [
  { title: '첫 규격표', need: '첫 출하', text: '「모양이 곧 값이며 길이다.」 아래에 서명 하나. 글씨가 둥글다. 폰의 손 같다.' },
  { title: '경고등 기록', need: '처음 녹을 때', text: '경보는 울렸다. 수동으로 꺼졌다. 끈 시각은 매번 같다.' },
  { title: '퀸의 메모', need: '흰 퀸이 합류', text: '「폰 명령은 듣지 않는다」 — 고 적었다. 두 줄로 지웠다.' },
  { title: '나이트 반장의 편자', need: '나이트 반장 해체', text: '편자 안쪽 각인: 「L자 외 이동 금지」. 누가 긁어 지우려 한 자국이 있다.' },
  { title: '비숍 반장의 렌즈 일지', need: '비숍 반장 해체', text: '렌즈는 도금왕이 갈았다. 주문: "사선만 보이게."' },
  { title: '룩 반장의 출입 명부', need: '룩 반장 해체', text: '명부 첫 줄: 도금왕 — 「폰 (임시)」.' },
  { title: '폰 반장의 생산 대장', need: '폰 반장 해체', text: '하루 8,000. 줄 밖으로 나간 폰: 0. 그날까지는.' },
  { title: '이형 반장의 영수증', need: '이형 반장 해체', text: '각인 다섯을 판 값: 「반장 자리 하나.」' },
  { title: '검문 반장의 서류철', need: '검문 반장 해체', text: '맨 아래 「최종 승인」 칸 — 늘 비어 있다.' },
  { title: '도금왕의 첫 상자', need: '도금왕 첫 격파', text: '킹 자리에 폰 하나. 금 왕관은 나중에 칠한 것이다.' },
  { title: '꺼진 경고등의 메모', need: '첫 승급', text: '메모의 글씨가 내 글씨다. 「누군가 다른 답을.」' },
  { title: '접힌 종이 왕관', need: '해방 (최고 압력)', text: '접은 자국이 열세 겹이다.' },
];

/** 대국 중 처음 체크를 당할 때 독백 (안내 말풍선에 붙는다) */
export const FIRST_CHECK_MONO = '‘한 번은 버틴다. 두 번은 없다.’';

/** 컷신 화면 글 */
export const CUT_UI = { skip: '건너뛰기', next: '탭해서 넘긴다', prologueAgain: '프롤로그 다시 보기' };

/** 결과 화면 (엔딩별) */
export const OVER_STORY = {
  freeTitle: '해방',
  /** 검수 저울도 판정할 말이 없다 */
  freeSay: '…판정 불가.',
  freeTell: '* 판이 펴진 채로 남는다. 출하는 없다. 종이 왕관은 접혀 상자 귀퉁이에.',
  promoteTell: '* 상자 뚜껑이 닫힌다. 새 도금왕을 실은 트럭이 공장 문을 나선다.',
};
