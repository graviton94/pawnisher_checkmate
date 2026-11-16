import { describe, expect, it } from 'vitest';
import pkgRaw from '../package.json?raw';
import gradle from '../android/app/build.gradle?raw';
import ci from '../.github/workflows/build.yml?raw';
import { musicLevel, progressKeys, readSettings, resetProgress, sfxLevel, writeSettings, type KeyStore } from '../src/prefs/settings';
import { SETTINGS_DEFAULT, SETTINGS_KEY, VOL_STEPS } from '../src/data/settings';
import { motionMedia } from '../src/prefs/motion';
import { APP_VERSION } from '../src/data/version';
import { LICENSES } from '../src/data/licenses';

/** 메모리 저장소 (localStorage 흉내 — length · key 포함) */
const mem = (init: Record<string, string> = {}): KeyStore & { length: number; key(i: number): string | null; dump(): Record<string, string> } => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    dump: () => Object.fromEntries(m),
  };
};

describe('설정 저장 (D-530)', () => {
  it('처음에는 기본값 — 크기 7칸 = 예전 고정 음량, 움직임은 기기 설정', () => {
    const s = readSettings(mem());
    expect(s).toEqual(SETTINGS_DEFAULT);
    expect(sfxLevel(s)).toBe(1);
    expect(musicLevel(s)).toBe(1);
    expect(s.motion).toBe('os');
  });

  it('쓰고 다시 읽으면 같다', () => {
    const st = mem();
    const s = { ...SETTINGS_DEFAULT, sfx: 3, music: 10, musicMute: true, motion: 'on' as const };
    writeSettings(st, s);
    expect(readSettings(st)).toEqual(s);
    expect(musicLevel(s)).toBe(0);
    expect(sfxLevel(s)).toBeCloseTo(3 / 7);
  });

  it('망가진 값은 칸마다 기본값으로 — 범위 밖은 끝으로 자른다', () => {
    expect(readSettings(mem({ [SETTINGS_KEY]: '{not json' }))).toEqual(SETTINGS_DEFAULT);
    const s = readSettings(mem({ [SETTINGS_KEY]: JSON.stringify({ sfx: 99, music: -3, motion: 'wild', sfxMute: 'yes' }) }));
    expect(s.sfx).toBe(VOL_STEPS);
    expect(s.music).toBe(0);
    expect(s.motion).toBe('os');
    expect(s.sfxMute).toBe(false);
  });

  it('옛 2.0 끄기 열쇠를 이어받는다 (새 설정이 없을 때만)', () => {
    expect(readSettings(mem({ 'pawnisher.sfx': 'off', 'pawnisher.music': 'off' }))).toMatchObject({ sfxMute: true, musicMute: true });
    const st = mem({ 'pawnisher.sfx': 'off', [SETTINGS_KEY]: JSON.stringify({ ...SETTINGS_DEFAULT, sfxMute: false }) });
    expect(readSettings(st).sfxMute).toBe(false);
  });

  it('진행 초기화는 저장 · 기록 · 백업 사본을 지우고 설정은 남긴다', () => {
    const st = mem({ 'pawnisher.slice.save': '{}', 'pawnisher.slice.meta': '{}', 'pawnisher.slice.meta.bak': '{}', 'pawnisher.slice.ledger': '[]', 'pawnisher.telemetry': '[]', [SETTINGS_KEY]: '{"sfx":2}', other: 'x' });
    expect(progressKeys(st)).toContain('pawnisher.slice.meta.bak');
    resetProgress(st);
    expect(st.dump()).toEqual({ [SETTINGS_KEY]: '{"sfx":2}', other: 'x' });
  });
});

describe('움직임 줄이기 미디어 조건', () => {
  it('켬 = 늘 참 · 끔 = 늘 거짓 · 기기 설정 = 원래 그대로', () => {
    const q = '(prefers-reduced-motion: reduce)';
    expect(motionMedia(q, 'os')).toBe(q);
    expect(motionMedia(q, 'on')).toBe('(min-width: 0px)');
    expect(motionMedia(q, 'off')).toBe('(max-width: -1px)');
    expect(motionMedia('(max-width: 600px) and (prefers-reduced-motion: no-preference)', 'on')).toBe('(max-width: 600px) and (max-width: -1px)');
  });
});

describe('버전 하나 (D-530)', () => {
  it('package.json · android versionName · CI 기본값이 APP_VERSION과 같다', () => {
    const pkg = JSON.parse(pkgRaw) as { version: string };
    expect(pkg.version).toBe(APP_VERSION);
    expect(gradle).toContain(`?: "${APP_VERSION}")`);
    for (const m of ci.matchAll(/release_tag \|\| '([^']+)'/g)) expect(m[1]).toBe(APP_VERSION);
  });
});

describe('라이선스 고지', () => {
  it('OFL · MIT 전문을 실어 보낸다', () => {
    const t = Object.fromEntries(LICENSES.map((l) => [l.name, l]));
    expect(t['갈무리 (Galmuri)'].text).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    expect(t['갈무리 (Galmuri)'].text).toMatch(/Lee Minseo/);
    expect(t['Phaser 3'].text).toMatch(/Permission is hereby granted/);
    expect(LICENSES.some((l) => l.license === 'CC BY 3.0')).toBe(true);
  });
});
