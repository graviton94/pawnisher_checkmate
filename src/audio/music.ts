import { MUSIC_VOLUME, TRACKS, type TrackId } from '../data/music';
import { bgMuted } from './bg';

/**
 * 배경 음악 재생기 (D-123): 칩튠 루프를 미리 0.12초씩 예약한다 (끊김 없이). 곡을 바꾸면 다음 박에서 바뀐다.
 * 켜고 끄기는 설정 (효과음과 따로), 화면이 가려지면 멈춘다.
 */
const KEY = 'pawnisher.music';
let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let track: TrackId | null = null;
let step = 0;
let next = 0;
let timer: number | undefined;
/** 본편 설정 창이 정한 배율 (0~2, 1 = 예전 고정 음량, D-530). null = 옛 켜고 끄기(2.0)만 따른다 */
let level: number | null = null;

export const musicOn = (): boolean => {
  if (level !== null) return level > 0;
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};

const ensure = (): AudioContext | null => {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = MUSIC_VOLUME * (level ?? 1);
    out.connect(ctx.destination);
    document.addEventListener('visibilitychange', () => (document.hidden ? bgMuted() && void ctx?.suspend() : track && musicOn() && void ctx?.resume()));
    // 첫 탭 전에 만든 소리 장치는 잠겨 있다 — 첫 누름에서 깨운다 (자동 재생 규칙)
    const wake = (): void => {
      if (ctx?.state === 'running') return void window.removeEventListener('pointerdown', wake, true);
      if (!document.hidden && track && musicOn()) void ctx?.resume();
    };
    window.addEventListener('pointerdown', wake, true);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const note = (a: AudioContext, at: number, f: number, dur: number, type: OscillatorType, vol: number): void => {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out!);
  o.start(at);
  o.stop(at + dur + 0.02);
};

const hit = (a: AudioContext, at: number, kind: 'kick' | 'hat'): void => {
  if (kind === 'kick') {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    g.gain.setValueAtTime(0.7, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    o.connect(g).connect(out!);
    o.start(at);
    o.stop(at + 0.16);
    return;
  }
  const len = Math.ceil(a.sampleRate * 0.03);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 6000;
  const g = a.createGain();
  g.gain.value = 0.18;
  s.connect(f).connect(g).connect(out!);
  s.start(at);
};

/** 8분음표 하나를 예약한다 */
const schedule = (a: AudioContext, at: number): void => {
  const T = TRACKS[track!];
  const eighth = 30 / T.bpm;
  const bar = Math.floor(step / 8) % T.prog.length;
  const i = step % 8;
  const [r, third] = T.prog[bar];
  const tones = [r, r + third, r + 7, r + 12];
  const f = (semi: number, oct = 0) => T.root * 2 ** ((semi + oct * 12) / 12);
  // 베이스: 1 · 5박 (근음), 마디 끝에 5도
  if (i === 0 || i === 4) note(a, at, f(r, -1), eighth * 1.8, 'triangle', 0.5);
  if (i === 7) note(a, at, f(r + 7, -1), eighth * 0.8, 'triangle', 0.35);
  // 아르페지오 (한 옥타브 위)
  const k = T.arp[i];
  if (k >= 0) note(a, at, f(tones[k], 1), eighth * 0.9, T.lead, 0.16);
  // 북
  if (T.drums !== 'none') {
    const kick = T.drums === 'soft' ? i === 0 : T.drums === 'march' ? i % 4 === 0 : i % 2 === 0;
    if (kick) hit(a, at, 'kick');
    if (T.drums !== 'soft' && i % 2 === 1) hit(a, at, 'hat');
  }
  step += 1;
  next = at + eighth;
};

const tick = (): void => {
  if (!ctx || !track) return;
  while (next < ctx.currentTime + 0.12) schedule(ctx, Math.max(next, ctx.currentTime + 0.01));
};

/** 곡을 튼다 (같은 곡이면 그대로) */
export const playMusic = (id: TrackId): void => {
  if (track === id) return;
  track = id;
  if (!musicOn()) return;
  const a = ensure();
  if (!a) return;
  step = 0;
  next = a.currentTime + 0.05;
  window.clearInterval(timer);
  timer = window.setInterval(tick, 25);
};

/** 본편 설정: 음악 크기 (0 = 끔). 0으로 가면 멈추고, 다시 올리면 지금 곡을 처음부터 튼다 */
export const setMusicLevel = (v: number): void => {
  const was = musicOn();
  level = Math.max(0, Math.min(2, v));
  if (out) out.gain.value = MUSIC_VOLUME * level;
  const id = track;
  if (was && level === 0) {
    stopMusic();
    track = id;
  } else if (!was && level > 0 && id) {
    track = null;
    playMusic(id);
  }
};

export const stopMusic = (): void => {
  track = null;
  window.clearInterval(timer);
  // 곡이 없으면 소리 장치를 쉰다 (남은 음이 끝난 뒤 — 코드 리뷰 7). 다시 틀면 ensure가 깨운다
  window.setTimeout(() => void (!track && ctx?.suspend()), 600);
};

export const setMusic = (on: boolean): void => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* 무시 */
  }
  const id = track;
  if (!on) {
    stopMusic();
    track = id;
  } else if (id) {
    track = null;
    playMusic(id);
  }
};
