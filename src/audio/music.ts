import { MUSIC_CACHE, MUSIC_VOLUME, MUSIC_XFADE_MS, TRACKS, type MusicFile, type TrackId } from '../data/music';
import { bgMuted } from './bg';
import { loadAudio } from './file';

/**
 * 배경 음악 재생기 (D-545 — D-123의 칩튠 생성기를 대신한다): 곡 파일(`public/audio/music/`)을 WebAudio 루프로 튼다.
 * - 곡은 장면에 처음 들어갈 때 받는다 (시작 화면을 늦추지 않게 — 첫 누름 전에는 받지도 않는다, D-537).
 * - 곡이 바뀌면 짧게(0.45초) 겹쳐 넘긴다. 같은 파일 장면끼리(타이틀 → 지도)는 이어 틀며 거름 · 속도 · 크기만 바꾼다.
 * - 켜고 끄기 · 크기는 설정(효과음과 따로, D-530), 화면이 가려지면 멈춘다(D-539 설정).
 */
const KEY = 'pawnisher.music';
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
/** 지금 장면이 원하는 곡 (소리가 꺼져 있어도 기억한다 — 켜면 이 곡부터) */
let track: TrackId | null = null;
/** 본편 설정 창이 정한 배율 (0~2, 1 = 기준 음량, D-530). null = 옛 켜고 끄기(2.0)만 따른다 */
let level: number | null = null;

interface Voice {
  file: MusicFile;
  src: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  gain: GainNode;
}
let voice: Voice | null = null;
/** 곡 요청 순번 — 받는 사이 장면이 또 바뀌면 늦게 온 곡은 버린다 */
let want = 0;

export const musicOn = (): boolean => {
  if (level !== null) return level > 0;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

const activated = (): boolean => (navigator as { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive !== false;

const ensure = (): AudioContext | null => {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    // 32 kHz로 풀어 메모리를 줄인다 (96 kbps 곡은 16 kHz 위가 원래 비어 있다). 못 하는 브라우저는 기본값
    try {
      ctx = new AC({ sampleRate: 32000, latencyHint: 'playback' });
    } catch {
      ctx = new AC();
    }
    out = ctx.createGain();
    out.gain.value = MUSIC_VOLUME * (level ?? 1);
    out.connect(ctx.destination);
    document.addEventListener('visibilitychange', () => (document.hidden ? bgMuted() && void ctx?.suspend() : track && musicOn() && void ctx?.resume()));
  }
  if (ctx.state === 'suspended' && !document.hidden) void ctx.resume();
  return ctx;
};

/** 풀어 둔 곡 (최근 쓴 순 — 맨 뒤가 가장 최근) */
const cache = new Map<MusicFile, Promise<AudioBuffer>>();
const load = (a: AudioContext, file: MusicFile): Promise<AudioBuffer> => {
  const hit = cache.get(file);
  if (hit) {
    cache.delete(file);
    cache.set(file, hit);
    return hit;
  }
  const p = loadAudio(a, 'music', file);
  p.catch(() => cache.delete(file));
  cache.set(file, p);
  while (cache.size > MUSIC_CACHE) cache.delete(cache.keys().next().value as MusicFile);
  return p;
};
/** 받아 둔 곡 이름 (점검용) */
export const musicNow = (): { track: TrackId | null; file: MusicFile | null; state: string; cached: MusicFile[] } => ({
  track,
  file: voice?.file ?? null,
  state: ctx?.state ?? 'none',
  cached: [...cache.keys()],
});

const XF = MUSIC_XFADE_MS / 1000;

/** 지금 목소리를 이 장면 모양(거름 · 속도 · 크기)으로 짧게 옮긴다 */
const shape = (a: AudioContext, v: Voice, id: TrackId, ramp: number): void => {
  const T = TRACKS[id];
  const t = a.currentTime;
  v.src.playbackRate.setTargetAtTime(T.rate, t, ramp / 3);
  v.filter.frequency.setTargetAtTime(T.lowpass > 0 ? T.lowpass : a.sampleRate / 2 - 100, t, ramp / 3);
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setValueAtTime(v.gain.gain.value, t);
  v.gain.gain.linearRampToValueAtTime(T.gain, t + ramp);
};

/** 목소리를 짧게 줄여 멈춘다 */
const drop = (a: AudioContext, v: Voice, ramp = XF): void => {
  const t = a.currentTime;
  v.gain.gain.cancelScheduledValues(t);
  v.gain.gain.setValueAtTime(v.gain.gain.value, t);
  v.gain.gain.linearRampToValueAtTime(0, t + ramp);
  try {
    v.src.stop(t + ramp + 0.05);
  } catch {
    /* 이미 멈춤 */
  }
};

/** 지금 track을 실제로 튼다 (첫 누름 뒤 · 소리 켜짐일 때만) */
const start = (): void => {
  if (!track || !musicOn() || !activated()) return;
  const a = ensure();
  if (!a || !out) return;
  const id = track;
  const T = TRACKS[id];
  // 같은 파일이면 이어 튼다 — 거름 · 속도 · 크기만
  if (voice && voice.file === T.file) return void shape(a, voice, id, XF);
  const my = ++want;
  void load(a, T.file)
    .then((b) => {
      if (my !== want || track !== id || !musicOn() || !out) return;
      const src = a.createBufferSource();
      src.buffer = b;
      src.loop = true;
      src.playbackRate.value = T.rate;
      const filter = a.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.5;
      filter.frequency.value = T.lowpass > 0 ? T.lowpass : a.sampleRate / 2 - 100;
      const gain = a.createGain();
      gain.gain.value = 0;
      src.connect(filter).connect(gain).connect(out);
      const t = a.currentTime + 0.02;
      src.start(t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(T.gain, t + XF);
      if (voice) drop(a, voice);
      voice = { file: T.file, src, filter, gain };
    })
    .catch(() => undefined);
};

/** 곡을 튼다 (같은 장면이면 그대로). 첫 누름 전이면 기억만 하고 첫 누름에서 튼다 */
export const playMusic = (id: TrackId): void => {
  if (track === id && (voice || !musicOn())) return;
  track = id;
  start();
};

/** 본편 설정: 음악 크기 (0 = 끔). 0으로 가면 멈추고, 다시 올리면 지금 장면 곡을 튼다 */
export const setMusicLevel = (v: number): void => {
  const was = musicOn();
  level = Math.max(0, Math.min(2, v));
  if (out && ctx) out.gain.setTargetAtTime(MUSIC_VOLUME * level, ctx.currentTime, 0.03);
  if (was && level === 0) halt();
  else if (!was && level > 0) start();
};

/** 소리만 멈춘다 (장면 곡은 기억) */
const halt = (): void => {
  want++;
  if (ctx && voice) drop(ctx, voice, 0.3);
  voice = null;
  // 곡이 없으면 소리 장치를 쉰다 (남은 꼬리가 끝난 뒤 — 코드 리뷰 7). 다시 틀면 ensure가 깨운다
  window.setTimeout(() => void (!voice && ctx?.suspend()), 600);
};

export const stopMusic = (): void => {
  track = null;
  halt();
};

export const setMusic = (on: boolean): void => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* 무시 */
  }
  if (!on) halt();
  else start();
};

/** 첫 누름: 자동 재생 규칙으로 미뤄 둔 장면 곡을 이제 튼다 (터치는 손을 뗄 때 사용자 활성이 생긴다) */
if (typeof window !== 'undefined') {
  const evs = ['pointerup', 'click', 'keydown'] as const;
  const wake = (): void => {
    if (!activated()) return;
    evs.forEach((e) => window.removeEventListener(e, wake, true));
    if (!document.hidden) start();
  };
  evs.forEach((e) => window.addEventListener(e, wake, true));
}
