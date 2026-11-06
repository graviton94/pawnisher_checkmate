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
/**
 * 안내서 (D-205 리뉴얼, 사용자: "왼쪽 정사각형에 예시 스크린샷이나 실제 애니메이션, 오른쪽에 설명 — 가로 카드").
 * media: img = public/guide/<이름>.png (tools/guide-capture.cjs가 실제 게임을 찍는다) · anim = 코드 애니메이션.
 * 말투: 규칙은 합니다체(시스템), 마지막 한 줄은 짧은 요령.
 */
export type GuideMedia = { img: string } | { anim: 'king' | 'formula' | 'steam' };
/** 쪽마다 줄 = [이름표, 짧은 설명] (D-263, 사용자: 「글은 길고 핵심만 알려 주지도 않는다」) — 한 줄에 하나, 핵심만 */
export const GUIDE_PAGES: { title: string; lines: [string, string][]; tip?: string; media: GuideMedia }[] = [
  { title: '목표', media: { anim: 'king' }, lines: [['승리', '적 킹을 쓰러뜨립니다.'], ['패배', '종이 왕관을 쓴 내 킹이 쓰러집니다.'], ['출하', '세 막을 지나 출하구에 닿습니다.']], tip: '분대원은 대신 맞아 줄 수 있습니다. 킹만은 지키십시오.' },
  { title: '카드 → 기물 → 칸', media: { img: 'play' }, lines: [['1', '손패에서 카드를 고릅니다.'], ['2', '빛나는 기물을 고릅니다.'], ['3', '갈 칸을 누르면 그 자리에서 칩니다.'], ['표시', '점 = 갈 칸 · 과녁 = 칠 적 · 숫자 = 피해']], tip: '기물을 먼저 눌러도 맞는 카드가 골라집니다.' },
  { title: '적의 예고', media: { img: 'intent' }, lines: [['붉은 칸', '적이 다음 차례에 칠 곳'], ['번호', '치는 순서'], ['턴 끝', '적이 예고대로 둡니다.']], tip: '붉은 칸에서 빠지거나, 그 적을 먼저 쓰러뜨리십시오.' },
  { title: '태엽', media: { img: 'keys' }, lines: [['값', '카드 왼쪽 톱니 숫자만큼 듭니다.'], ['한 턴', '태엽 셋'], ['처치', '태엽 +1 (한 턴에 둘까지)']], tip: '싼 카드로 먼저 쓰러뜨리면 턴이 길어집니다.' },
  { title: '피해 = (공격 + 합) × 곱', media: { anim: 'formula' }, lines: [['청록 +', '합 — 지금 바로 셉니다.'], ['주황 ×', '곱 — 쌓일수록 셉니다.'], ['적', '막을 지날수록 단단해집니다.']], tip: '처음엔 합으로 버티고, 곱을 모아 뒤를 넘으십시오.' },
  { title: '연쇄', media: { img: 'chain' }, lines: [['연쇄', '한 턴에 처치할 때마다 다음 공격 +4'], ['폭주 코일', '이 부품이 있으면 처치마다 ×1.5'], ['연쇄 소모', '방출 · 증기 폭발 · 회수 — 쌓인 연쇄를 씁니다.']], tip: '약한 적부터 쓰러뜨려 연쇄를 쌓으십시오.' },
  { title: '속전 보상과 나사', media: { anim: 'steam' }, lines: [['속전', '턴마다 한 칸 줄어듭니다.'], ['나사', '이기면 남은 칸 × 5 · 넘친 피해 10마다 1'], ['되감기', '이번 턴을 처음으로 (대국마다 한 번)']], tip: '빨리 이길수록 나사가 많습니다.' },
  { title: '분대', media: { img: 'squad' }, lines: [['이어짐', '분대원은 대국 사이에도 남습니다.'], ['심장 톱니', '쓰러지면 하나가 깨진 채 돌아옵니다. 깨진 채 또 쓰러지면 폐기됩니다.'], ['승격', '끝 줄에 닿은 폰은 퀸 — 그 대국에서만']], tip: '분대원을 길게 누르면 기벽과 문턱이 보입니다.' },
  { title: '반장', media: { img: 'boss' }, lines: [['반장', '막의 끝에서 규칙 하나를 들고 섭니다.'], ['표시', '불꽃 줄 = 줄 폭격 · 발톱 = 되받아침 · 불꽃 폰 = 자폭'], ['확인', '반장을 길게 누르면 규칙이 나옵니다.']], tip: '모르는 말은 「용어」에서 찾으십시오.' },
];

/** 첫 대국 도움말 (처음 출하하는 사람에게만, 시험대 한 판) */
export const COACH_LINES = {
  // 화자 = 부관 박차 (D-242, 사용자: 「어떤 건 부관이, 어떤 건 시스템이 말한다 — 화자 통일」). \n = 줄 바꿈
  card: '좌측의 카드를 선택하면\n자세한 능력을 볼 수 있습니다.',
  piece: '빛나는 기물을 고르십시오.',
  square: '갈 칸을 고르십시오.\n과녁은 칠 수 있는 적입니다.',
  end: '태엽을 다 썼습니다.\n턴 끝을 누르십시오.',
  /** 입문 1턴 (D-232): 첫 처치 뒤 — 연쇄 */
  chain: '공격으로 처치하면 태엽이 하나 회복되고,\n연쇄가 축적됩니다. (다음 공격 +4)',
  /** 입문 2턴: 내 기물이 붉은 칸 위에 — 빠지며 치기 */
  graze: '붉은 칸은 다음 턴 적이 칠 자리입니다.\n회피하며 공격하면 ×1.5의 데미지로 공격합니다.',
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
