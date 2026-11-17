import { SFX_BANK, SFX_COMBO_MAX, SFX_DEDUPE_MS, type SfxKind } from '../data/sfx';

/**
 * 효과음 (D-540 — D-073의 칩튠 생성기를 대신한다): 주물 공방 소리 파일(`public/audio/sfx/`)을 WebAudio로 튼다.
 * 첫 소리 때 소리 장치를 만들고 모든 파일을 한꺼번에 받아 둔다 (아직 안 받은 소리는 건너뛴다).
 * 크기 · 끄기는 설정 창(D-530), 쉬기는 아래 IDLE_MS(D-537)를 그대로 따른다. 표는 `src/data/sfx.ts`.
 */
export type { SfxKind } from '../data/sfx';

import { bgMuted } from './bg';

const KEY = 'pawnisher.sfx';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** 본편 설정 창이 정한 배율 (0~2, 1 = 예전 고정 음량, D-530). null = 옛 켜고 끄기(2.0)만 따른다 */
let level: number | null = null;
/** 기준 음량 — 설정 크기 1.0일 때 */
const BASE = 0.5;

/** 소리 켜짐 여부 (기본 켜짐) */
export const sfxOn = (): boolean => {
  if (level !== null) return level > 0;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};
/** 본편 설정: 효과음 크기 (0 = 끔). 다음 소리부터가 아니라 바로 바뀐다 */
export const setSfxLevel = (v: number): void => {
  level = Math.max(0, Math.min(2, v));
  if (master) master.gain.value = BASE * level;
};
export const setSfx = (on: boolean): void => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* 저장 못 해도 이번 실행에는 반영 */
  }
  if (master) master.gain.value = on ? BASE * (level ?? 1) : 0;
};

/** 마지막 소리 뒤 이만큼 조용하면 소리 장치를 쉰다 (코드 리뷰 7 — 돌아가는 AudioContext는 폰 소리 장치를 깨워 둔다) */
const IDLE_MS = 4000;
let idleT: number | undefined;

const audio = (): AudioContext | null => {
  if (!sfxOn()) return null;
  // 첫 탭 전에는 소리 장치를 만들지 않는다 (페르소나 테스트 c9 — 브라우저 경고)
  if ((navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === false) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = BASE * (level ?? 1);
    master.connect(ctx.destination);
    // 화면이 가려지면 소리 장치를 쉰다 (돌아오면 다음 소리에서 다시 깨운다)
    document.addEventListener('visibilitychange', () => void (document.hidden && bgMuted() && ctx?.suspend()));
  }
  if (ctx.state === 'suspended') void ctx.resume();
  // 조용해지면 쉰다 — 다음 소리에서 위 resume이 깨운다
  window.clearTimeout(idleT);
  idleT = window.setTimeout(() => void ctx?.suspend(), IDLE_MS);
  return ctx;
};

/** 이 브라우저가 OGG Vorbis를 풀면 ogg, 아니면 m4a (iOS Safari 옛판) */
const ext = (): 'ogg' | 'm4a' => {
  try {
    return new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a';
  } catch {
    return 'ogg';
  }
};
const bufs = new Map<string, AudioBuffer>();
let loading = false;
/** 모든 소리 파일을 받아 풀어 둔다 (한 번만). 실패한 파일은 조용히 빠진다 */
const loadAll = (a: AudioContext): void => {
  if (loading) return;
  loading = true;
  const e = ext();
  for (const [kind, d] of Object.entries(SFX_BANK)) {
    for (let v = 1; v <= d.n; v++) {
      const name = d.n > 1 ? `${kind}${v}` : kind;
      void fetch(`audio/sfx/${name}.${e}`)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((ab) => new Promise<AudioBuffer>((ok, no) => a.decodeAudioData(ab, ok, no)))
        .then((b) => void bufs.set(name, b))
        .catch(() => undefined);
    }
  }
};
/** 받아 둔 소리 수 (점검용) */
export const sfxLoaded = (): number => bufs.size;

const last = new Map<string, number>();

/**
 * 효과음 하나. combo = 이번 턴 몇 번째 타격인지 (0부터) — 순번마다 음이 반음씩 올라간다 (발라트로·페글의 연쇄 쾌감).
 */
export const sfx = (kind: SfxKind, combo = 0): void => {
  if (typeof window === 'undefined') return;
  const d = SFX_BANK[kind];
  if (!d) return;
  const a = audio();
  if (!a || !master) return;
  loadAll(a);
  const now = performance.now();
  const key = `${kind}:${combo}`;
  if (now - (last.get(key) ?? -1e9) < SFX_DEDUPE_MS) return;
  last.set(key, now);
  const v = d.n > 1 ? 1 + Math.floor(Math.random() * d.n) : 0;
  const b = bufs.get(v ? `${kind}${v}` : kind);
  if (!b) return;
  const src = a.createBufferSource();
  src.buffer = b;
  const semis = Math.min(Math.max(combo, 0), SFX_COMBO_MAX) + (d.jitter ? (Math.random() * 2 - 1) * d.jitter : 0);
  src.playbackRate.value = 2 ** (semis / 12);
  const g = a.createGain();
  g.gain.value = d.gain;
  src.connect(g).connect(master);
  src.start(a.currentTime);
  // 긴 소리(승리 · 패배 · 반장)가 끝나기 전에 쉬지 않게
  window.clearTimeout(idleT);
  idleT = window.setTimeout(() => void ctx?.suspend(), Math.max(IDLE_MS, (b.duration / src.playbackRate.value) * 1000 + 500));
};

/** 첫 누름에서 소리 장치를 깨우고 파일을 미리 받는다 — 첫 효과음이 빠지지 않게 */
if (typeof window !== 'undefined') {
  const warm = (): void => {
    window.removeEventListener('pointerdown', warm, true);
    window.removeEventListener('keydown', warm, true);
    const a = audio();
    if (a) loadAll(a);
  };
  window.addEventListener('pointerdown', warm, true);
  window.addEventListener('keydown', warm, true);
}
