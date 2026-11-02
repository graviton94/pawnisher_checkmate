/**
 * 본편 오프닝 (D-192): 프롤로그 컷 · 안내서 쪽 · 첫 대국 도움말.
 * 이야기 정본 `docs/story.md` §9.1, 말투 D-158 (서술 = 비장한 한 문장, 독백 = 작은따옴표 짧은 반말, 대사 = 「 」).
 * 그림은 `docs/asset-order-prologue.md` P-00 ~ P-07 — 오기 전까지는 기물 도트로 짠 자리 그림(art)으로 돈다.
 */
import type { PieceType } from '../engine';

/** 자리 그림 한 조각: 기물 도트를 화면 비율 자리에 놓는다 (x · y = 0~100, h = 화면 높이 대비 %) */
export interface StandIn {
  t: PieceType;
  side: 0 | 1;
  x: number;
  y: number;
  h: number;
  /** 종이 왕관 · 흐림 · 붉게 물듦 */
  crown?: boolean;
  dim?: boolean;
  flip?: boolean;
}

export interface PrologueCut {
  /** 그림 파일 (public/scenes/<img>.png, 없으면 자리 그림) */
  img: string;
  /** 서술 (비장한 한 문장) */
  narr?: string;
  /** 대사 「 」 */
  say?: string;
  /** 독백 ‘ ’ */
  mono?: string;
  /** ★컷 — 두 번째부터 「프롤로그 다시 보기」 짧은 판에 나온다 */
  key?: boolean;
  /** 자리 그림: 배경 두 색(위 · 아래) + 기물 */
  bg: [string, string];
  /** 한 점 빛 (자리 그림) */
  glow?: string;
  art: StandIn[];
  /** 효과: 경고등 깜빡 · 붉은 물듦 · 위에서 한 줄기 빛 */
  fx?: 'alarm' | 'red' | 'spot' | 'path';
}

export const PROLOGUE_CUTS: PrologueCut[] = [
  {
    img: 'prologue-01', key: true, narr: '체크메이트 공장. 모양이 곧 값이고, 값이 곧 길이다.',
    bg: ['#0b0b0e', '#2a1a10'], glow: '#e8783c',
    art: [{ t: 'R', side: 1, x: 22, y: 62, h: 34, dim: true }, { t: 'B', side: 1, x: 38, y: 58, h: 30, dim: true }, { t: 'Q', side: 1, x: 54, y: 60, h: 38, dim: true }, { t: 'N', side: 1, x: 70, y: 58, h: 30, dim: true }, { t: 'K', side: 1, x: 84, y: 62, h: 36, dim: true }],
  },
  {
    img: 'prologue-02', narr: '그날, 한 세트의 킹 자리에 폰이 들어갔다. 경고등이 깜빡이다, 꺼졌다.',
    bg: ['#0a1620', '#16141c'], glow: '#38bdf8', fx: 'alarm',
    art: [{ t: 'R', side: 0, x: 26, y: 64, h: 26, dim: true }, { t: 'N', side: 0, x: 38, y: 64, h: 26, dim: true }, { t: 'P', side: 0, x: 50, y: 60, h: 26 }, { t: 'Q', side: 0, x: 62, y: 64, h: 28, dim: true }, { t: 'B', side: 0, x: 74, y: 64, h: 26, dim: true }],
  },
  {
    img: 'prologue-03', key: true, narr: '검수 전광판이 붉게 물든다. 세트 전체, 불량 처리 예정.', mono: '나 때문이다.',
    bg: ['#3a0a10', '#0b0b0e'], glow: '#e5262f', fx: 'red',
    art: [{ t: 'R', side: 0, x: 18, y: 64, h: 24 }, { t: 'N', side: 0, x: 28, y: 64, h: 24 }, { t: 'B', side: 0, x: 38, y: 64, h: 24 }, { t: 'Q', side: 0, x: 48, y: 64, h: 26 }, { t: 'B', side: 0, x: 58, y: 64, h: 24 }, { t: 'N', side: 0, x: 68, y: 64, h: 24 }, { t: 'R', side: 0, x: 78, y: 64, h: 24 }, { t: 'P', side: 0, x: 90, y: 68, h: 18 }],
  },
  {
    img: 'prologue-04', say: '폰이 킹 자리에? 우리까지 녹이려고.', mono: '폰이 맞다. 그래서?',
    bg: ['#2a1e12', '#0b0b0e'],
    art: [{ t: 'Q', side: 0, x: 30, y: 52, h: 40, dim: true }, { t: 'R', side: 0, x: 72, y: 50, h: 36, dim: true, flip: true }, { t: 'B', side: 0, x: 86, y: 56, h: 32, dim: true, flip: true }, { t: 'P', side: 0, x: 52, y: 70, h: 20 }],
  },
  {
    img: 'prologue-05', key: true, narr: '상자 귀퉁이를 오려 왕관을 만든다. 너무 커서 눈을 덮는다.', mono: '크다. …그래도 쓴다.',
    bg: ['#16141c', '#0b0b0e'], glow: '#f4f1ea', fx: 'spot',
    art: [{ t: 'P', side: 0, x: 50, y: 68, h: 40, crown: true }],
  },
  {
    img: 'prologue-06', narr: '따르는 것은 몇뿐이다. 나머지는 지켜본다.',
    bg: ['#1e2630', '#0b0b0e'],
    art: [{ t: 'Q', side: 0, x: 76, y: 40, h: 22, dim: true }, { t: 'R', side: 0, x: 86, y: 40, h: 20, dim: true }, { t: 'P', side: 0, x: 30, y: 62, h: 30, crown: true }, { t: 'P', side: 0, x: 44, y: 64, h: 24 }, { t: 'P', side: 0, x: 54, y: 64, h: 24 }, { t: 'N', side: 0, x: 64, y: 62, h: 28 }],
  },
  {
    img: 'prologue-07', key: true, mono: '녹게 두지 않는다. 아무도.',
    bg: ['#0e1220', '#2a1e08'], glow: '#c89b3c', fx: 'path',
    art: [{ t: 'P', side: 0, x: 50, y: 70, h: 30, crown: true }, { t: 'R', side: 1, x: 18, y: 48, h: 20, dim: true }, { t: 'B', side: 1, x: 82, y: 48, h: 20, dim: true }],
  },
];

/** 안내서 (처음 한 번 · 메뉴에서 다시): 쪽마다 그림 한 줄 + 글 두 줄 (시스템 투) */
export const GUIDE_PAGES: { title: string; lines: string[]; pic: 'play' | 'red' | 'keys' | 'king' | 'terms' }[] = [
  { title: '카드 → 기물 → 칸', pic: 'play', lines: ['손패에서 카드를 고르면 움직일 수 있는 기물이 빛납니다.', '기물을 고르고 갈 칸을 고르면, 내려앉은 자리에서 공격합니다.'] },
  { title: '붉은 칸', pic: 'red', lines: ['붉은 칸은 적이 다음 차례에 칠 수 있는 곳입니다. 번호는 치는 순서입니다.', '턴을 끝내기 전에 붉은 칸에서 내 기물을 빼십시오.'] },
  { title: '태엽', pic: 'keys', lines: ['카드마다 태엽이 듭니다. 한 턴에 태엽 셋.', '처치가 이어지면 배수가 오릅니다. 한 턴에 몰아치십시오.'] },
  { title: '종이 왕관', pic: 'king', lines: ['적 킹을 쓰러뜨리면 대국을 이깁니다. 종이 왕관을 쓴 내 킹이 쓰러지면 끝입니다.', '세 막을 지나 출하구에 닿으십시오.'] },
  { title: '알아 두면 좋은 것', pic: 'terms', lines: ['되감기 — 이번 턴을 처음으로. 대국마다 한 번.', '증기 — 턴마다 한 칸 빠집니다. 이기면 남은 만큼 나사를 받습니다.', '부품 — 규칙을 바꾸는 장치. 같은 띠의 카드와 맞물립니다.'] },
];

/** 첫 대국 도움말 (처음 출하하는 사람에게만, 시험대 한 판) */
export const COACH_LINES = {
  card: '손패에서 카드를 고르십시오.',
  piece: '빛나는 기물을 고르십시오.',
  square: '갈 칸을 고르십시오. 과녁은 칠 수 있는 적입니다.',
  end: '태엽을 다 썼습니다. 턴 끝을 누르십시오.',
} as const;

/** 오프닝 화면 글 */
export const OPENING_TEXT = {
  press: '화면을 눌러 시작',
  tagline: '체스 규칙을 부수는 태엽 분대',
  skip: '건너뛰기',
  next: '다음',
  prev: '이전',
  toBattle: '첫 대국으로',
  close: '닫기',
} as const;
