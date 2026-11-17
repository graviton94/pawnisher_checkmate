/**
 * 효과음 표 (D-540): 주물 공방 소리 — 쇠 · 황동 · 종이 · 증기. 파일은 `public/audio/sfx/<이름>[번호].ogg|m4a`,
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
  | 'tick' | 'open' | 'close' | 'deny' | 'card' | 'cast' | 'burn' | 'crit' | 'kinghit' | 'parry' | 'stun' | 'push' | 'wind' | 'buy' | 'step' | 'slot' | 'boss' | 'phase';

export interface SfxDef {
  n: number;
  gain: number;
  jitter?: number;
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
};

/** 연쇄 음높이 (발라트로식): 순번 하나에 반음 하나, 이만큼까지 */
export const SFX_COMBO_MAX = 9;
/** 같은 소리가 이 시간(ms) 안에 또 오면 한 번만 (여러 칸 동시 피격이 겹쳐 울리지 않게) */
export const SFX_DEDUPE_MS = 25;
