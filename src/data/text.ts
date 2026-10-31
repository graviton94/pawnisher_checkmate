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
 * 화자 (D-089 · D-093, docs/story.md):
 * D-093 (사용자: 정겨운 말투 금지) — 모두 짧고 차갑다. 농담·애칭·말꼬리(~잖아 · ~볼래 · ~해 볼까) 없음.
 * D-098 (사용자: 언더테일 스타일도 섞을 것) — 서술은 줄 앞 「* 」, 담담한 두 박자 + 엉뚱한 작은 디테일 하나
 *   (“* 나사를 먹는 기계. 배가 고파 보인다.”). 웃기려 들지 않고, 사실처럼 말한다. 인물 대사는 그대로 차갑게.
 *  검수관 — 판정만 말한다.      고물상 주인 — 값만 말한다.      공방 장인 — 한두 마디.      뽑기 기계 — 말하지 않는다 (서술만).
 * 버튼은 동사 하나. 느낌표는 위험·결정적인 순간 몇 개만, 물음표는 운에 거는 선택에만 ("~할까?").
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
    codex: '도감',
  },
  /** 도감 (D-108): 한 번 손에 넣은 것만 적힌다 */
  codex: {
    title: '도감',
    lead: '* 한 번 손에 넣은 것만 적힌다. 나머지는 물음표다. 물음표도 언젠가 채워진다.',
    unknown: '???',
    sections: { records: '기록', sets: '시작 세트', bosses: '반장', variants: '도면', enchants: '개조', events: '돌발' },
    records: ['출하', '정품 출하', '최고 공정', '검문! 통과', '푼 묘수', '열린 압력'],
    back: '메뉴',
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
    lead: '* 반품대 위에 불량 세트 셋. 상자마다 같은 도장이 비뚤게 찍혀 있다.',
    back: '뒤로',
  },
  map: {
    choose: '* 컨베이어가 위층으로 오른다. 끝에 반장이 있다. 반장은 기다리는 걸 싫어한다.',
    abandon: '출하 포기',
    abandonDesc: '* 스스로 용광로로 걸어간다. 아무도 말리지 않는다.',
    bossAhead: '이 공정의 반장',
  },
  reward: {
    piece: '새 기물',
    enchant: '개조',
    card: '천공 카드',
    recruit: '영입',
    recruitLead: '* 쓰러진 적 하나가 상자에 실린다. 별말 없이. 원래 말이 없는 부품이다.',
    skip: '건너뛰기',
    next: '계속',
  },
  shop: {
    title: '고물상',
    lead: '* 녹슨 선반. 부품마다 나사 값이 붙어 있다. 주인은 값만 말한다.',
    pieces: '기물',
    cards: '천공 카드',
    enchants: '개조',
    sell: '팔기',
    reroll: '새로 진열',
    leave: '떠나기',
    sold: '팔림',
    polish: '개조 다듬기',
  },
  forge: {
    title: '공방',
    lead: '“거푸집 내려놔.” * 장인은 당신을 보지 않는다. 망치만 본다.',
    rule: '개량하면 그 유형이 모두 강해진다. +5 완성 거푸집은 대국 시작 방열판 20%.',
    variantLead: '+3부터 가진 도면으로 이형을 부을 수 있다 (무료, 되돌릴 수 없음). 도면은 검문!·반장·뽑기·고물상에서 줍는다.',
    variantPick: '이형 고르기',
    leave: '떠나기',
  },
  altar: {
    title: '뽑기 기계',
    lead: '* 나사를 먹는 기계. 배가 고파 보인다.',
    pull: '레버를 당길까?',
    premium: '고급 레버',
    premiumDesc: '꽝 없음',
    release: '행운 톱니가 꽉 찼다 — 원하는 개조를 꺼낸다',
    leave: '떠나기',
    outcomes: ['희귀 개조 3지선다', '상위 기물', '이형 거푸집', '꽝'],
  },
  blueprint: {
    name: '도면',
    lead: '* 쓰러진 군단의 거푸집 도면이 바닥에 흩어져 있다. 하나만 챙긴다.',
    none: '도면 없음',
    empty: '없음 — 검문!·반장·뽑기·고물상에서 줍는다',
  },
  formation: {
    title: '진형',
    lead: '다음 대국부터 이대로 놓인다.',
  },
  defect: {
    damage: '손상',
    seal: '봉인',
    repair: '손상 수리',
    sealedBattle: (name: string) => `* 봉인된 ${name} 하나가 상자에 남았다. 이번 대국엔 없다.`,
  },
  luck: {
    overload: '과적! * 군단이 한 상자 더 실렸다. 개량도 한 번 더 받았다.',
    defective: '* 이 군단은 불량이다. 다들 어딘가 금이 가 있다.',
    jackpot: '* 나사 자루가 터졌다.',
  },
  seed: {
    label: '시드',
    placeholder: 'XXXXX-XXXXX',
    apply: '이 시드로',
    again: '같은 시드로',
    bad: '* 공장 도장이 없는 시드다. 받아 주지 않는다.',
  },
  puzzle: {
    goal: '이번 가동 한 번에 적 킹을 쓰러뜨린다.',
    opening: '* 묘수. 판이 바닥에 볼트로 박혀 있다. 가동은 한 번.',
  },
  over: {
    win: '정품 출하',
    lose: '불량 폐기',
    /** 검수관의 말 (화자 있는 대사) + 서술 한 줄 (다키스트 던전·슬레이 더 스파이어식) */
    winSay: '결함 없음. 출하.',
    winTell: '* 상자 뚜껑이 닫힌다. 트럭이 공장 문을 나선다. 종이 왕관은 구겨지지 않았다.',
    loseSay: '불량 혼입. 세트째 폐기.',
    loseTell: '* 집게가 상자째 들어 올린다. 아래에서 쇳물이 끓는다. 따뜻하다. 너무.',
    menu: '메인 메뉴',
    again: '새 출하',
  },
  battle: {
    mine: '내 차례',
    enemy: '적 차례',
    running: '가동 중',
    over: '대국 종료',
    stall: '정체',
    counter: '받아치기: 대각선에 적이 있으면 움직이지 않고 친다 (태엽 1). 폰을 눌러 그 자리를 다시 누른다.',
    order: '주문서',
    hintPlan: '기물을 눌러 명령을 새긴다',
    hintIntent: '붉은 화살표 = 지금 가동하면 적이 둘 수 · 깜빡이는 HP = 잃을 몫 · 적을 누르면 피해 숫자',
    hintThreat: '적 기물을 누르면 위협 범위가 보인다',
  },
};

/** 기물 소개 (D-091): 한 줄 — 규격 값 + 성격 하나 */
export const PIECE_LORE: Record<'P' | 'N' | 'B' | 'R' | 'Q' | 'K', string> = {
  P: '제일 흔하고, 제일 질기다.',
  N: '머리 위로 넘어온다.',
  B: '렌즈 끝까지가 사거리.',
  R: '보일러 성탑. 안 넘어진다.',
  Q: '공장의 자랑.',
  K: '지금은 종이 왕관.',
};

/** 시작 세트: 반품 사유 한 줄 (D-091) */
export const SET_LORE: Record<string, string> = {
  KPPP: '반품 사유: 머릿수만 많음.',
  KNP: '반품 사유: 도장이 비뚤어짐.',
  BKP: '반품 사유: 렌즈에 금.',
  KNN: '반품 사유: 피스톤 압력 초과.',
  BBK: '반품 사유: 검수대 렌즈 파손.',
  KPR: '반품 사유: 보일러 과열.',
  KPPPPP: '반품 사유: 같은 얼굴이 다섯.',
  BKN: '반품 사유: 너무 잘 맞물림. 수상함.',
  KQ: '반품 사유: 혼자 다 함.',
};
