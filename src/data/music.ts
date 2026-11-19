/**
 * 배경 음악 표 (D-545 — D-123의 칩튠 생성기를 대신한다): 사용자가 고른 시안 A · B · D · C1을 장면마다 건다 (C1은 D-548).
 * 파일은 `public/audio/music/<file>.ogg|m4a` (`tools/audio/bgm_game.py`가 찍는다 — 자체 작곡 · A · B · D는 FluidR3_GM 렌더, C1은 자체 칩 합성, 90초 넘는 이음매 없는 루프).
 * 같은 파일을 쓰는 장면끼리(타이틀 → 지도)는 곡을 다시 틀지 않고 거름 · 속도 · 크기만 바꾼다.
 */
export type TrackId = 'menu' | 'map' | 'workshop' | 'act1' | 'act2' | 'act3' | 'check' | 'boss' | 'boss2' | 'final' | 'final2' | 'ending';

/** 곡 파일 이름 (확장자 없이) */
export type MusicFile = 'waltz' | 'anvil' | 'anvil-boss' | 'crown' | 'crown-final' | 'gear' | 'gear-boss';

export interface TrackDef {
  file: MusicFile;
  /** 재생 속도 = 음높이 · 빠르기 함께 (1 = 원곡). 막이 오를수록 조금씩 높고 빠르게 */
  rate: number;
  /** 낮은 통과 거름 (Hz, 0 = 끔) — 지도는 오르골을 멀리서 듣는다 */
  lowpass: number;
  /** 곡 안 크기 (1 = 파일 그대로 · −18 LUFS) */
  gain: number;
}

const SEMI = 2 ** (1 / 12);

export const TRACKS: Record<TrackId, TrackDef> = {
  // 타이틀 · 메뉴: B 태엽 오르골 왈츠
  menu: { file: 'waltz', rate: 1, lowpass: 0, gain: 1 },
  // 지도: 같은 왈츠를 벽 너머로 (거름 + 조금 작게) — 타이틀에서 넘어오면 곡이 이어진다
  map: { file: 'waltz', rate: 1, lowpass: 1600, gain: 0.8 },
  // 고물상 · 작업대(정비) · 사건: C1 톱니 칩 (D-548 — 손이 일하는 장면, 지도 왈츠를 대신한다)
  workshop: { file: 'gear', rate: 1, lowpass: 0, gain: 1 },
  // 대국: A 모루 행진 — 1막 원곡 · 2막 반음 위 · 3막 온음 위 (빠르기도 6% · 12% 오른다)
  act1: { file: 'anvil', rate: 1, lowpass: 0, gain: 1 },
  act2: { file: 'anvil', rate: SEMI, lowpass: 0, gain: 1 },
  act3: { file: 'anvil', rate: SEMI * SEMI, lowpass: 0, gain: 1 },
  // 검문 대국: C1 반장 변주 112 BPM (D-548 — 막 대국과 반장 사이의 결)
  check: { file: 'gear-boss', rate: 1, lowpass: 0, gain: 1 },
  // 반장전 · 레이드: A 반장 변주
  boss: { file: 'anvil-boss', rate: 1, lowpass: 0, gain: 1 },
  // 반장 2단계 (D-690): 같은 곡을 반음 위 · 6% 빠르게 — 파일이 같아 다시 틀지 않고 속도만 바뀐다
  boss2: { file: 'anvil-boss', rate: SEMI, lowpass: 0, gain: 1 },
  // 도금왕: D 긴장 변주
  final: { file: 'crown-final', rate: 1, lowpass: 0, gain: 1 },
  final2: { file: 'crown-final', rate: SEMI, lowpass: 0, gain: 1 },
  // 왕관 장면 · 결말 · 크레딧 · 출하 끝: D 녹슨 왕관
  ending: { file: 'crown', rate: 1, lowpass: 0, gain: 1 },
};

/**
 * 음량 (설정 크기 1.0일 때): 파일 −18 LUFS × 0.28 ≈ −29 LUFS. 효과음은 −16 LUFS × 기준 0.5 × 소리별 0.35~0.9 ≈ −23~−31이라
 * 음악이 타격 · 처치보다 3~6 dB 아래에 깔린다.
 */
export const MUSIC_VOLUME = 0.28;
/** 곡이 바뀔 때 겹쳐 넘기는 시간 (ms) — 소리만 (D-216은 화면 규칙) */
export const MUSIC_XFADE_MS = 450;
/** 풀어 둔 곡을 몇 개까지 들고 있나 (곡 하나 ≈ 25 MB 메모리 — 지도 ↔ 대국 · 지도 ↔ 고물상 왕복을 덮는다. 셋째 곡은 HTTP 캐시에서 다시 푼다) */
export const MUSIC_CACHE = 2;
