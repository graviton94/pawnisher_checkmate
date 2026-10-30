/**
 * 화면 문구 (CLAUDE.md UI 원칙 10 — 현지화 대비해 한 곳에). 용어는 docs/world.md §5 (D-085).
 * 게임 규칙어(폰·체크·포크 …)는 체스 그대로, 시스템어는 세계 용어.
 */
export const TERM = {
  ap: '태엽',
  gold: '나사',
  army: '군단',
  enchant: '개조',
  card: '천공 카드',
  cardIron: '철 카드',
  cardPaper: '종이 카드',
  forge: '거푸집 개량',
  variant: '이형 거푸집',
  gauge: '행운 톱니',
  pressure: '압력',
  run: '출하',
  battle: '대국',
  plan: '명령 테이프',
  submit: '가동',
  shield: '방열판',
  masterwork: '★걸작',
} as const;

/**
 * 화자 (D-089 — 장난감 공장의 귀여움 + 기계의 차가움, docs/story.md):
 *  검수관 — 서류와 숫자만 믿는다. 짧고 차갑다.        고물상 주인 — 능글맞다. 주인공을 "종이 왕관"이라 부른다.
 *  공방 장인 — 말이 적고 자기 망치에 자부심.           뽑기 기계 — 딸깍거리며 꼬드긴다.
 * 느낌표는 위험·결정적인 순간 몇 개만, 물음표는 운에 거는 선택에만.
 */
export const TEXT = {
  pressStart: '화면을 눌러 시작',
  skip: '건너뛰기',
  tagline: '킹 자리에 잘못 들어간 아홉째 폰이, 규격을 체크메이트로 깬다',
  menu: {
    continue: '이어서 출하',
    newRun: '새 출하',
    newRunWarn: '진행 중인 출하는 폐기된다',
    trial: '시운전',
    trialDesc: '시나리오·장비를 골라 한 판',
    settings: '설정',
    quit: '타이틀로',
    records: ['출하', '최고 공정', '정품 출하'],
    unlocks: '시작 세트',
    pressure: '보일러 압력',
  },
  settings: {
    title: '설정',
    sfx: '효과음',
    intro: '인트로 다시 보기',
    on: '켜짐',
    off: '꺼짐',
    close: '닫기',
  },
  pause: {
    title: '일시 정지',
    resume: '계속',
    toMenu: '메인 메뉴로',
    toMenuDesc: '출하는 이 턴부터 이어서 한다',
    enchants: '개조 보기',
  },
  start: {
    title: '시작 세트',
    lead: '불량 판정을 받은 세트 셋이 반품대에 놓여 있다. 어느 상자의 동료를 데려갈까?',
    back: '뒤로',
  },
  map: {
    choose: '컨베이어가 덜컹거린다. 위층 어딘가에서 반장이 기다린다.',
    abandon: '출하 포기',
    abandonDesc: '스스로 용광로에 걸어 들어간다',
    bossAhead: '이 공정의 반장',
  },
  reward: {
    piece: '새 기물',
    enchant: '개조',
    card: '천공 카드',
    skip: '건너뛰기',
    next: '계속',
  },
  shop: {
    title: '고물상',
    lead: '“어이, 종이 왕관. 구경은 공짜야. 만지면 나사.”',
    pieces: '기물',
    cards: '천공 카드',
    enchants: '개조',
    sell: '팔기',
    reroll: '다른 건 없어?',
    leave: '떠나기',
    sold: '팔렸어',
  },
  forge: {
    title: '공방',
    lead: '“거푸집 내려놔. …흠, 손볼 데 많군.” — 개량하면 그 유형이 모두 강해진다. +5 완성 거푸집은 대국 시작 방열판 20%.',
    variantLead: '+3부터 이형 거푸집으로 바꿀 수 있다 (무료, 되돌릴 수 없음).',
    leave: '떠나기',
  },
  altar: {
    title: '뽑기 기계',
    lead: '딸깍. 딸깍. 기계 속 톱니가 당신이 나사를 넣기만 기다린다.',
    pull: '한 번만… 당겨 볼까?',
    release: '행운 톱니가 꽉 찼다 — 원하는 개조를 꺼낸다',
    leave: '떠나기',
    outcomes: ['희귀 개조 3지선다', '상위 기물', '이형 거푸집', '꽝'],
  },
  over: {
    win: '정품 출하',
    lose: '불량 폐기',
    /** 검수관의 말 (화자 있는 대사) + 서술 한 줄 (다키스트 던전·슬레이 더 스파이어식) */
    winSay: '…서류상으론 결함 없음. 정품. 출하해.',
    winTell: '상자 뚜껑이 닫힌다. 종이 왕관이 처음으로 눈을 가리지 않는다.',
    loseSay: '불량 혼입. 세트째 폐기.',
    loseTell: '집게가 상자째 들어 올린다. 아래에서 쇳물이 끓는다. 종이 왕관이 먼저 탄다.',
    menu: '메인 메뉴',
    again: '새 출하',
  },
  battle: {
    mine: '내 차례',
    enemy: '적 차례',
    running: '가동 중',
    over: '대국 종료',
    stall: '정체',
    hintPlan: '기물을 눌러 명령을 새긴다',
    hintIntent: '붉은 화살표 = 지금 가동하면 적이 둘 수 · 깜빡이는 HP = 잃을 몫 · 적을 누르면 피해 숫자',
    hintThreat: '적 기물을 누르면 위협 범위가 보인다',
  },
};

/** 기물 소개 (D-091): 한 줄 — 규격 값 + 성격 하나 */
export const PIECE_LORE: Record<'P' | 'N' | 'B' | 'R' | 'Q' | 'K', string> = {
  P: '값 1. 제일 흔하고, 제일 질기다.',
  N: '값 3. 머리 위로 넘어온다.',
  B: '값 3. 렌즈 끝까지가 사거리.',
  R: '값 5. 보일러 성탑. 안 넘어진다.',
  Q: '값 9. 공장의 자랑.',
  K: '값 없음. 지금은 종이 왕관.',
};

/** 시작 세트: 반품 사유 한 줄 (D-091) */
export const SET_LORE: Record<string, string> = {
  KPPP: '반품 사유: 머릿수만 많음.',
  KNP: '반품 사유: 도장이 비뚤어짐.',
  BKP: '반품 사유: 렌즈에 금.',
  KNN: '반품 사유: 피스톤 압력 초과.',
  BBK: '반품 사유: 검수대 렌즈 파손.',
  KPR: '반품 사유: 보일러 과열.',
};
