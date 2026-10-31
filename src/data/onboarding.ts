import type { PieceType, Side } from '../engine/types';

/**
 * 온보딩 시험대 (D-116 개정): 처음 한 번, 출하와 따로 세 판. 끝나면 진짜 출하로 (매 출하 1~3층은 무작위 그대로).
 * 메인 메뉴 「시험대」로 언제든 다시. 규칙의 긴 설명은 규칙서(data/rulebook.ts).
 * lines = 판이 열릴 때 차례로 보여 주는 서술 (「안다」로 넘김).
 */
export interface Lesson {
  title: string;
  goal: string;
  width: number;
  height: number;
  /** [유형, 진영, 칸, HP] */
  pieces: [PieceType, Side, string, number?][];
  checkmate: boolean;
  foresight: number;
  /** 적 AI 단계 (0 = 가장 무른) */
  tier: number;
  lines: string[];
}

export const LESSONS: Lesson[] = [
  {
    title: '시험대 1 — 움직여 친다',
    goal: '적 킹을 쓰러뜨린다',
    width: 6,
    height: 6,
    pieces: [['K', 0, 'a1'], ['R', 0, 'c1'], ['P', 0, 'b2'], ['K', 1, 'f6', 30], ['P', 1, 'e5', 12]],
    checkmate: false,
    foresight: 0,
    tier: 0,
    lines: [
      '* 시험대. 흰 기물이 내 군단이다. 검은 것은 적이다.',
      '* 룩을 누른다. 점 = 갈 수 있는 칸. 붉은 과녁 = 가서 칠 수 있는 칸.',
      '* 움직인 기물만 친다. 과녁 칸으로 보낸 뒤 가동을 누른다.',
    ],
  },
  {
    title: '시험대 2 — 순서',
    goal: '적 킹을 쓰러뜨린다',
    width: 6,
    height: 6,
    pieces: [['K', 0, 'a1'], ['N', 0, 'b1'], ['B', 0, 'c1'], ['P', 0, 'd2'], ['K', 1, 'e6', 12], ['P', 1, 'd4', 6], ['P', 1, 'e5', 10]],
    checkmate: false,
    foresight: 0,
    tier: 0,
    lines: [
      '* 태엽 = 한 턴에 쓸 힘. 기물마다 드는 태엽이 다르다. 남는 만큼 더 명령한다.',
      '* 두 기를 예약하면 #1 → #2 순서로 움직이고 친다. 테이프에 순번이 쌓인다.',
      '* 앞 순번이 쓰러뜨리면 다음 순번이 더 세다. 앞이 비켜 주면 뒤의 사선이 열린다.',
    ],
  },
  {
    title: '시험대 3 — 적의 수 · 체크',
    goal: '살아남아 적 킹을 쓰러뜨린다',
    width: 6,
    height: 6,
    pieces: [['K', 0, 'c1'], ['Q', 0, 'd1'], ['P', 0, 'b2'], ['P', 0, 'c2'], ['N', 0, 'f1'], ['K', 1, 'e6', 60], ['R', 1, 'a6', 30], ['N', 1, 'f5', 25]],
    checkmate: true,
    foresight: 1,
    tier: 0,
    lines: [
      '* 붉은 화살표 = 적이 다음에 둘 수. 맞을 몫이 내 HP 게이지에서 깜빡인다.',
      '* 킹은 한 번은 HP 1로 버틴다. 체크. 다음에 맞으면 끝 — 적 킹도 같다.',
      '* 막을지, 먼저 칠지. 여기까지면 출하에 나갈 수 있다.',
    ],
  },
];
