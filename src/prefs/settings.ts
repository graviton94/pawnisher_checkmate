import { SETTINGS_DEFAULT, SETTINGS_KEY, VOL_STEPS, PROGRESS_KEYS, PROGRESS_PREFIX, type Settings } from '../data/settings';
import { setMotionPref, type MotionPref } from './motion';
import { setSfxLevel } from '../audio/sfx';
import { setMusicLevel } from '../audio/music';

/**
 * 본편 설정 (D-530): 효과음 · 음악 크기와 끄기, 움직임 줄이기. 출하 저장과 다른 열쇠에 따로 둔다 —
 * 「진행 초기화」가 설정을 지우지 않고, 설정이 망가져도 저장은 그대로다.
 */
export interface KeyStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const MOTIONS: readonly MotionPref[] = ['os', 'off', 'on'];
const step = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(VOL_STEPS, Math.round(v))) : d);

/** 저장된 값을 읽는다. 없거나 망가졌으면 기본값 (옛 2.0 켜고 끄기 열쇠가 있으면 그 뜻을 이어받는다) */
export const readSettings = (st: KeyStore): Settings => {
  const d = SETTINGS_DEFAULT;
  let raw: Partial<Settings> = {};
  try {
    const t = st.getItem(SETTINGS_KEY);
    if (t) raw = JSON.parse(t) as Partial<Settings>;
  } catch {
    raw = {};
  }
  if (!raw || typeof raw !== 'object') raw = {};
  let legacySfx = false, legacyMusic = false;
  try {
    legacySfx = st.getItem('pawnisher.sfx') === 'off';
    legacyMusic = st.getItem('pawnisher.music') === 'off';
  } catch {
    /* 무시 */
  }
  return {
    v: 1,
    sfx: step(raw.sfx, d.sfx),
    sfxMute: typeof raw.sfxMute === 'boolean' ? raw.sfxMute : legacySfx,
    music: step(raw.music, d.music),
    musicMute: typeof raw.musicMute === 'boolean' ? raw.musicMute : legacyMusic,
    motion: MOTIONS.includes(raw.motion as MotionPref) ? (raw.motion as MotionPref) : d.motion,
  };
};

/** 저장한다 (못 써도 이번 실행에는 반영된다) */
export const writeSettings = (st: KeyStore, s: Settings): void => {
  try {
    st.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* 저장소를 못 쓰는 창 — 무시 */
  }
};

/** 실제 소리 배율: 기본 칸 = 1(예전 고정 음량), 끔이면 0 */
export const sfxLevel = (s: Settings): number => (s.sfxMute ? 0 : s.sfx / SETTINGS_DEFAULT.sfx);
export const musicLevel = (s: Settings): number => (s.musicMute ? 0 : s.music / SETTINGS_DEFAULT.music);

/** 설정을 소리 · 움직임에 입힌다 */
export const applySettings = (s: Settings): void => {
  setSfxLevel(sfxLevel(s));
  setMusicLevel(musicLevel(s));
  setMotionPref(s.motion);
};

/** 진행 초기화로 지울 열쇠 — 출하 저장 · 기록 · 도감 · 플레이 기록. 설정 열쇠는 남긴다 */
export const progressKeys = (st: KeyStore & { length?: number; key?(i: number): string | null }): string[] => {
  const out = new Set<string>(PROGRESS_KEYS);
  if (typeof st.length === 'number' && st.key) {
    for (let i = 0; i < st.length; i++) {
      const k = st.key(i);
      if (k && k.startsWith(PROGRESS_PREFIX)) out.add(k);
    }
  }
  out.delete(SETTINGS_KEY);
  return [...out];
};

/** 진행을 모두 지운다 (되돌릴 수 없음). 설정은 남는다 */
export const resetProgress = (st: KeyStore & { length?: number; key?(i: number): string | null }): void => {
  for (const k of progressKeys(st)) {
    try {
      st.removeItem(k);
    } catch {
      /* 무시 */
    }
  }
};
