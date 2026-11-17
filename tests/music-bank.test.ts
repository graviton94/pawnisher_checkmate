import { describe, expect, it } from 'vitest';
import { MUSIC_VOLUME, TRACKS } from '../src/data/music';

/** 배경 음악 표와 파일이 어긋나지 않는다 (D-545) — 장면 곡마다 ogg · m4a가 있고, 표가 부르지 않는 파일이 남지 않는다 */
const FILES = Object.keys(import.meta.glob('../public/audio/music/*', { query: '?url', import: 'default' })).map((p) => p.split('/').pop()!);

describe('배경 음악 묶음', () => {
  const files = [...new Set(Object.values(TRACKS).map((t) => t.file))];

  it('장면 곡마다 ogg · m4a가 있다', () => {
    for (const f of files) for (const e of ['ogg', 'm4a']) expect(FILES, `${f}.${e}`).toContain(`${f}.${e}`);
  });
  it('표가 부르지 않는 파일이 없다', () => {
    expect(FILES.filter((f) => !files.includes(f.replace(/\.(ogg|m4a)$/, '') as never))).toEqual([]);
  });
  it('사용자 배정: 타이틀 · 지도 = B, 대국 = A, 반장 = A 변주, 도금왕 = D 변주, 결말 = D', () => {
    expect([TRACKS.menu.file, TRACKS.map.file]).toEqual(['waltz', 'waltz']);
    expect([TRACKS.act1.file, TRACKS.act2.file, TRACKS.act3.file]).toEqual(['anvil', 'anvil', 'anvil']);
    expect(TRACKS.boss.file).toBe('anvil-boss');
    expect(TRACKS.final.file).toBe('crown-final');
    expect(TRACKS.ending.file).toBe('crown');
  });
  it('사용자 배정 C1 (D-548): 고물상 · 작업대 · 사건 = 톱니 칩, 검문 = 톱니 칩 반장 변주, 지도는 왈츠 그대로', () => {
    expect(TRACKS.workshop.file).toBe('gear');
    expect(TRACKS.check.file).toBe('gear-boss');
    expect(TRACKS.map.file).toBe('waltz');
  });
  it('막이 오를수록 빠르게 · 속도는 온음(12%) 안', () => {
    expect(TRACKS.act1.rate).toBeLessThan(TRACKS.act2.rate);
    expect(TRACKS.act2.rate).toBeLessThan(TRACKS.act3.rate);
    for (const t of Object.values(TRACKS)) {
      expect(t.rate).toBeGreaterThanOrEqual(1);
      expect(t.rate).toBeLessThanOrEqual(2 ** (2 / 12) + 1e-9);
      expect(t.gain).toBeGreaterThan(0);
      expect(t.gain).toBeLessThanOrEqual(1);
    }
    expect(MUSIC_VOLUME).toBeLessThan(0.5);
  });
});
