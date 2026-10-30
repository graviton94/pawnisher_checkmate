/**
 * 칩튠 효과음 (GDD 12장 §12.3 소리 최소 세트, D-073): 파일 없이 WebAudio로 그때그때 만든다 (sfxr류).
 * 나중에 필요한 것만 녹음·에셋으로 바꾼다 (사용자 결정). 켜고 끄기는 메인 메뉴, 값은 localStorage에.
 */

export type SfxKind = 'lift' | 'land' | 'hit' | 'kill' | 'check' | 'submit' | 'threat' | 'win' | 'lose';

const KEY = 'pawnisher.sfx';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

/** 소리 켜짐 여부 (기본 켜짐) */
export const sfxOn = (): boolean => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setSfx = (on: boolean): void => {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* 저장 못 해도 이번 실행에는 반영 */
  }
  if (master) master.gain.value = on ? 0.5 : 0;
};

const audio = (): AudioContext | null => {
  if (!sfxOn()) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

/** 네모·세모 파형 한 음: 주파수가 f0 → f1로 지수형으로 미끄러지고, 소리는 빠르게 올라 지수형으로 꺼진다 */
const tone = (a: AudioContext, at: number, f0: number, f1: number, dur: number, type: OscillatorType, vol: number): void => {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(master!);
  o.start(at);
  o.stop(at + dur + 0.02);
};

/** 잡음 한 덩이 (타격·착지의 "탁") */
const noise = (a: AudioContext, at: number, dur: number, vol: number, hp = 800): void => {
  const len = Math.ceil(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const s = a.createBufferSource();
  s.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  s.connect(f).connect(g).connect(master!);
  s.start(at);
};

/** 반음 n개 위의 주파수 */
const semi = (base: number, n: number) => base * 2 ** (n / 12);

/**
 * 효과음 하나. combo = 이번 턴 몇 번째 타격인지 (0부터) — 순번마다 음이 반음씩 올라간다 (발라트로·페글의 연쇄 쾌감).
 */
export const sfx = (kind: SfxKind, combo = 0): void => {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime;
  switch (kind) {
    case 'lift':
      tone(a, t, 330, 520, 0.07, 'square', 0.06);
      break;
    case 'land':
      noise(a, t, 0.06, 0.18, 300);
      tone(a, t, 160, 90, 0.08, 'triangle', 0.2);
      break;
    case 'hit': {
      const f = semi(440, Math.min(combo, 12) * 2);
      noise(a, t, 0.05, 0.25, 1200);
      tone(a, t, f * 1.5, f, 0.12, 'square', 0.12);
      break;
    }
    case 'kill':
      noise(a, t, 0.18, 0.3, 500);
      tone(a, t, 523, 1046, 0.09, 'square', 0.12);
      tone(a, t + 0.08, 784, 1568, 0.16, 'square', 0.1);
      break;
    case 'check':
      // 종소리: 기음 + 비화성 배음
      tone(a, t, 880, 870, 0.6, 'triangle', 0.2);
      tone(a, t, 2350, 2300, 0.35, 'sine', 0.08);
      break;
    case 'submit':
      // 레버: 철컥 두 번
      noise(a, t, 0.03, 0.3, 2000);
      noise(a, t + 0.07, 0.04, 0.25, 1500);
      tone(a, t + 0.07, 200, 140, 0.08, 'square', 0.08);
      break;
    case 'threat':
      tone(a, t, 220, 200, 0.12, 'square', 0.07);
      tone(a, t + 0.14, 196, 180, 0.16, 'square', 0.07);
      break;
    case 'win':
      [0, 4, 7, 12].forEach((n, i) => tone(a, t + i * 0.1, semi(523, n), semi(523, n), 0.18, 'square', 0.1));
      break;
    case 'lose':
      [0, -3, -6, -12].forEach((n, i) => tone(a, t + i * 0.16, semi(392, n), semi(392, n - 1), 0.24, 'triangle', 0.14));
      break;
  }
};
