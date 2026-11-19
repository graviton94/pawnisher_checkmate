/**
 * 메뉴 글 (D-539 출시 UX): 대국 · 지도 일시 정지 메뉴 · 메인 메뉴(단추 다섯 · 황동 하나) · 출하 준비 창 · 기록 창.
 * 말투 docs/voice.md — 시스템 합니다체 · 단추 동사 하나. 왕관 부제(이야기 이름)는 끝낸 왕관에만 — 그 밖은 별칭 (D-536 campaign.chapterTitle · 스포일러 H1).
 */
export const PAUSE_TEXT = {
  /** 대국 · 지도 머리의 메뉴 단추 (톱니 그림 — 읽는 이용 이름) */
  btn: '메뉴',
  title: '멈춤',
  resume: '이어 간다',
  help: '안내서 · 용어',
  settings: '설정',
  home: '처음으로',
  homeNote: '이 자리부터 이어집니다',
  abandon: '출하 포기',
  abandonOff: '이 판은 포기할 수 없습니다.',
  /** 두 단계 확인 (되돌릴 수 없음 — 진홍 · 뒤 막으로 닫히지 않음) */
  ab1: { title: '출하 포기', body: '이 출하를 패배로 기록하고 끝냅니다.', note: '분대 · 덱 · 부품은 돌아오지 않습니다.', back: '그만둔다', go: '포기한다' },
  ab2: { title: '마지막 확인', body: '되돌릴 수 없습니다. 정말 포기합니까?', back: '그만둔다', go: '포기한다' },
} as const;

export const MAIN_TEXT = {
  cont: '이어하기',
  /** 타이틀 시작 단추 (D-593 사용자: 「출하」 → 「게임 시작」 — 한 판 · 출하 준비 창 이름은 그대로 「출하」) */
  ship: '게임 시작',
  records: '기록',
  settings: '설정',
  quit: '끝내기',
  /** 이어하기 부제 — 왕관 표지 · 막만 (부제 없음) */
  contSub: (crown: string, act: string) => `${crown} · ${act}`,
  /** 오늘의 도전을 아직 안 했다 (게임 시작 단추 위 청록 점 · 읽는 이용) */
  dailyNew: '오늘의 도전 새로 열림',
  quitAsk: { title: '끝내기', body: '게임을 끝냅니다.', back: '그만둔다', go: '끝낸다' },
} as const;

export const SETUP_TEXT = {
  title: '출하 준비',
  tabs: { story: '본편', challenge: '도전', daily: '오늘의 도전' },
  back: '돌아간다',
  go: '출하한다',
  lock: '잠김',
  storyLead: '왕관을 고르세요.',
  crownNew: '새 출하',
  crownAgain: '다시 도전',
  crownLock: '이전 왕관을 마치면 열립니다.',
  challengeLock: '넷째 왕관을 마치면 도전 모드가 열립니다.',
  challengeLead: (n: number) => `난이도 ${n}`,
  challengeRec: (a: number, c: number) => `${a}회 도전 · ${c}회 완주`,
  challengeNone: '아직 도전하지 않았습니다.',
  prev: '이전',
  next: '다음',
  dailyLead: (day: string) => `오늘의 도전 · ${day}`,
  dailyRule: '모두가 같은 지도 · 같은 분대 · 같은 보상 순서로 나섭니다.',
  dailyRuleNote: '첫 시도만 기록에 남습니다.',
  dailyDone: (won: number, act: string, cleared: boolean) => `오늘 기록: ${cleared ? '완주' : `${act}에서 멈춤`} · 승리 ${won}`,
  dailyFresh: '오늘은 아직 나서지 않았습니다.',
  /** 저장이 있을 때 새로 나서기 (S 확인 — 진홍) */
  overwrite: { title: '새 출하', body: '저장한 출하를 버리고 새로 시작합니다.', back: '그만둔다', go: '시작한다' },
} as const;

export const RECORDS_TEXT = {
  title: '기록',
  ledger: '원부',
  ledgerSub: '쓰러진 분대원',
  scenes: '장면 다시 보기',
  scenesSub: '프롤로그',
  guide: '안내서',
  guideSub: '규칙 · 조작',
  stats: '통계',
  statsSub: '출하 · 완주 · 왕관',
  close: '닫는다',
  back: '돌아간다',
  /** 통계 줄 (이름 · 값) */
  statRows: (m: { runs: number; clears: number; bestAct: number; storyCleared: number; storyCount: number; challenge: string; daily: number }) => [
    ['출하', `${m.runs}회`],
    ['완주', `${m.clears}회`],
    ['가장 멀리 간 막', m.bestAct ? `${m.bestAct}막` : '—'],
    ['본편 왕관', `${m.storyCleared} / ${m.storyCount}`],
    ['도전 모드', m.challenge],
    ['오늘의 도전', `${m.daily}일`],
  ] as [string, string][],
} as const;
