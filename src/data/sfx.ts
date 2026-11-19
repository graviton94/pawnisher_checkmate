/**
 * 효과음 표 (D-540 · D-545 꼬리 단축): 주물 공방 소리 — 쇠 · 황동 · 종이 · 증기. 손 · 창 · 카드 ≤ 0.25초 · 타격 ≤ 0.35초 · 큰 장면만 꼬리 ≤ 0.6초. 파일은 `public/audio/sfx/<이름>[번호].ogg|m4a`,
 * `tools/audio/sfx_synth.py`가 찍는다 (자체 합성, CC0). 이름 · 변형 수는 그 스크립트의 BANK와 같아야 한다.
 *
 * - n: 변형 수 (자주 나는 소리는 2~3 — 같은 소리 반복의 기계음을 깬다)
 * - gain: 섞는 크기 (파일은 모두 −16 LUFS 근처로 맞춰 두었다 — 여기서 장면 안 비중만 정한다)
 * - jitter: 재생마다 음높이를 ± 이만큼(반음) 흔든다
 */
export type SfxKind =
  // 옛 이름 (2.0 · 본편 공용)
  | 'lift' | 'land' | 'hit' | 'kill' | 'check' | 'submit' | 'threat' | 'win' | 'lose' | 'coin' | 'spend' | 'rare' | 'jackpot' | 'hurt' | 'loss' | 'stamp' | 'awaken' | 'tap'
  // D-540에서 더한 사건
  | 'tick' | 'open' | 'close' | 'deny' | 'card' | 'cast' | 'burn' | 'crit' | 'kinghit' | 'parry' | 'stun' | 'push' | 'wind' | 'buy' | 'step' | 'slot' | 'boss' | 'phase'
  // D-630에서 더한 사건 (무음이던 컷 전환 · 크레딧 · 승급 · 컷인 · 카드 날림 · 방열판 깨짐 · 승패 맺음)
  | 'wipe' | 'melt' | 'page' | 'title' | 'reel' | 'promo' | 'forge' | 'crown' | 'throw' | 'slash' | 'fling' | 'vent' | 'fanfare' | 'dirge';

export interface SfxDef {
  n: number;
  gain: number;
  jitter?: number;
  /** 같은 소리가 이 시간(ms) 안에 다시 오면 건너뛴다 — 연달아 열리는 창 · 넘기는 쪽 · 날리는 카드가 따닥이지 않게 (D-630) */
  gap?: number;
  /** 움직임에 붙은 소리 — 움직임 줄이기(calmMotion)면 연출이 빠지므로 소리도 뺀다 (D-630) */
  motion?: boolean;
}

export const SFX_BANK: Record<SfxKind, SfxDef> = {
  // 손 · 창
  tap: { n: 3, gain: 0.35, jitter: 0.5 }, // 단추 — 작은 황동 똑
  tick: { n: 2, gain: 0.3, jitter: 0.4 }, // 계기 한 칸 — 톱니 딸깍
  lift: { n: 2, gain: 0.45, jitter: 0.4 }, // 기물 · 카드를 집는다 — 쇠 팅
  land: { n: 3, gain: 0.5, jitter: 0.4 }, // 쇠판 위에 놓인다 — 쿵
  submit: { n: 1, gain: 0.6 }, // 레버 — 래칫 + 걸쇠
  open: { n: 1, gain: 0.4 }, // 창이 열린다 — 철 덧문
  close: { n: 1, gain: 0.35 }, // 창이 닫힌다
  deny: { n: 1, gain: 0.5 }, // 안 된다 — 잠긴 걸쇠 덜컥 두 번
  // 명령서
  card: { n: 2, gain: 0.45, jitter: 0.5 }, // 종이가 넘어간다
  cast: { n: 1, gain: 0.55 }, // 즉시 명령 — 종이 탁 + 황동 반짝
  burn: { n: 1, gain: 0.6 }, // 카드가 불탄다
  // 대국
  hit: { n: 3, gain: 0.7, jitter: 0.3 }, // 가벼운 타격 — 쇠에 쇠
  crit: { n: 2, gain: 0.85 }, // 무거운 일격 — 모루
  kinghit: { n: 1, gain: 0.85 }, // 내 킹이 맞는다
  hurt: { n: 2, gain: 0.75 }, // 내 기물이 쓰러진다 — 찌그러짐
  kill: { n: 2, gain: 0.8 }, // 처치 — 주철이 깨진다
  check: { n: 1, gain: 0.7 }, // 체크 — 공장 종
  parry: { n: 1, gain: 0.75 }, // 받아치기 · 가시 반격 — 칼날 쇳소리
  stun: { n: 1, gain: 0.7 }, // 경직 — 떨리는 쇠
  push: { n: 1, gain: 0.65 }, // 밀림 — 판을 긁는 쇠
  threat: { n: 2, gain: 0.6 }, // 경고 — 증기 + 낮은 쇠 두 번
  wind: { n: 2, gain: 0.55 }, // 태엽이 감긴다 — 빨라지는 래칫
  // 나사 · 보상
  coin: { n: 3, gain: 0.5, jitter: 0.3 }, // 나사가 쏟아진다
  spend: { n: 1, gain: 0.45 }, // 나사를 넘긴다
  buy: { n: 1, gain: 0.6 }, // 산다 — 서랍 · 나사 · 걸쇠
  loss: { n: 1, gain: 0.6 }, // 잃는다 — 굴러 떨어지는 나사
  rare: { n: 1, gain: 0.55 }, // 귀한 것 — 황동 종 막대
  jackpot: { n: 1, gain: 0.65 }, // 큰 보상
  stamp: { n: 2, gain: 0.65 }, // 도장 압인
  awaken: { n: 1, gain: 0.6 }, // 깨어남 · 승격 — 증기 + 종
  // 길 · 장면
  step: { n: 1, gain: 0.55 }, // 지도 한 칸 — 핀 + 걸음
  slot: { n: 1, gain: 0.55 }, // 사건 칸이 멈춘다 — 릴 철컥
  boss: { n: 1, gain: 0.9 }, // 반장 등장 — 단조 해머
  phase: { n: 1, gain: 0.8 }, // 반장 2단계 — 증기 기적 + 용광로
  win: { n: 1, gain: 0.75 }, // 승리 — 종 셋 + 증기
  lose: { n: 1, gain: 0.75 }, // 패배 — 태엽이 풀려 멎는다 + 조종
  // D-630: 무음이던 사건
  wipe: { n: 2, gain: 0.4, jitter: 0.4, gap: 250, motion: true }, // 컷 전환 — 먹 천이 쓸려 덮인다 + 걸쇠 똑
  melt: { n: 1, gain: 0.5, gap: 250, motion: true }, // 쇳물 전환 — 국자에서 쏟아지는 쇳물
  page: { n: 2, gain: 0.4, jitter: 0.4, gap: 120 }, // 종이 쪽 넘김 (컷 · 크레딧 장)
  title: { n: 1, gain: 0.55, gap: 400 }, // 장 제목 카드 — 황동 명판 + 쥐어 막은 징
  reel: { n: 1, gain: 0.5, gap: 600 }, // 크레딧 — 영사기 릴이 돈다
  promo: { n: 1, gain: 0.6, gap: 150 }, // 판 위 승급 — 황동 고리 + 오르는 종 막대
  forge: { n: 1, gain: 0.55, gap: 600 }, // 승급대 앞 — 용광로 울컥 + 먼 사슬
  crown: { n: 1, gain: 0.75, gap: 600 }, // 왕관을 쓴다 — 무거운 금이 내려앉아 죈다
  throw: { n: 1, gain: 0.7, gap: 600 }, // 왕관을 던진다 — 쇠 바닥에 튀며 구른다
  slash: { n: 1, gain: 0.8, gap: 300, motion: true }, // 컷인 내리꽂힘 — 칼날 김 + 쇠판
  fling: { n: 2, gain: 0.4, jitter: 0.6, gap: 70, motion: true }, // 명령서를 날린다 — 종이 휙
  vent: { n: 1, gain: 0.7, gap: 80 }, // 방열판이 깨진다 — 쇠 날개 우두둑 + 김
  fanfare: { n: 1, gain: 0.6, gap: 1500 }, // 승리 맺음 — 종 막대 넷 + 증기 기적 화음 (효과음, 음악 트랙 아님)
  dirge: { n: 1, gain: 0.6, gap: 1500 }, // 패배 맺음 — 내려가는 낮은 종 + 멎는 톱니 + 김 한숨
};

/**
 * 화면 사건 → 소리 (D-630). 무음이던 사건을 이름으로 묶어 두고 부르는 쪽은 `sfxFor('사건')`만 쓴다 —
 * 테스트(tests/sfx-bank.test.ts)가 사건마다 소리 파일이 있고 실제로 불리는 곳이 있는지 본다.
 */
export const SFX_EVENTS = {
  /** 컷신 장면 전환 (디더 · 조리개 · 사선 · 블라인드 · 철문 · 암전 · 백지) */
  cutWipe: 'wipe',
  /** 컷신 쇳물 전환 */
  cutMelt: 'melt',
  /** 컷신 종이 쪽 전환 */
  cutPage: 'page',
  /** 장 제목 카드가 선다 */
  cutTitle: 'title',
  /** 크레딧이 열린다 */
  creditsOpen: 'reel',
  /** 크레딧 장 넘김 (누름 · 저절로) */
  creditsPage: 'page',
  /** 판 위 폰 승급 */
  boardPromote: 'promo',
  /** 왕위 결정 화면(승급대)이 열린다 */
  throneOpen: 'forge',
  /** 왕관을 쓴다 */
  throneCrown: 'crown',
  /** 왕관을 던진다 (넷째 왕관) */
  throneThrow: 'throw',
  /** 반장 2단계 컷인 — 사선 베기가 내리꽂힌다 */
  cutIn: 'slash',
  /** 명령서 표가 손패에서 대상으로 날아간다 */
  cardFling: 'fling',
  /** 방열판이 다 깨진다 */
  ventBreak: 'vent',
  /** 창이 열린다 */
  winOpen: 'open',
  /** 창이 닫힌다 */
  winClose: 'close',
  /** 승리 띠 뒤 맺음 */
  winSting: 'fanfare',
  /** 패배 띠 뒤 맺음 */
  loseSting: 'dirge',
} as const satisfies Record<string, SfxKind>;
export type SfxEvent = keyof typeof SFX_EVENTS;
/** 승패 띠가 뜬 뒤 맺음 소리까지 (ms) — 띠 첫 소리(win · lose)의 종이 잦아든 뒤 */
export const SFX_STING_DELAY = 640;

/** 연쇄 음높이 (발라트로식): 순번 하나에 반음 하나, 이만큼까지 */
export const SFX_COMBO_MAX = 9;
/** 같은 소리가 이 시간(ms) 안에 또 오면 한 번만 (여러 칸 동시 피격이 겹쳐 울리지 않게) */
export const SFX_DEDUPE_MS = 25;
/** 같은 소리가 동시에 이만큼까지만 울린다 — 연쇄 타격에서 앞 소리 꼬리를 닫는다 (D-545) */
export const SFX_VOICES_PER_KIND = 2;
/** 효과음 전체 동시 소리 상한 */
export const SFX_VOICES = 8;
