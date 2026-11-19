import { describe, expect, it } from 'vitest';
import { SFX_BANK, SFX_EVENTS } from '../src/data/sfx';

/** 효과음 표와 파일이 어긋나지 않는다 (D-540) — 표의 소리마다 ogg · m4a가 있고, 표에 없는 파일이 남지 않는다 */
/** 화면 코드 원문 — 사건마다 실제로 부르는 곳이 있는지 본다 (D-630) */
const SRC = Object.entries(import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  .filter(([p]) => !p.endsWith('/data/sfx.ts'))
  .map(([, t]) => t)
  .join('\n');
const FILES = Object.keys(import.meta.glob('../public/audio/sfx/*', { query: '?url', import: 'default' })).map((p) => p.split('/').pop()!);

describe('효과음 묶음', () => {
  const want = Object.entries(SFX_BANK).flatMap(([k, d]) => (d.n > 1 ? Array.from({ length: d.n }, (_, i) => `${k}${i + 1}`) : [k]));

  it('표의 소리마다 ogg · m4a가 있다', () => {
    for (const n of want) for (const e of ['ogg', 'm4a']) expect(FILES, `${n}.${e}`).toContain(`${n}.${e}`);
  });
  it('표에 없는 파일이 없다', () => {
    expect(FILES.filter((f) => !want.includes(f.replace(/\.(ogg|m4a)$/, '')))).toEqual([]);
  });
  it('섞는 크기는 0 초과 1 이하', () => {
    for (const d of Object.values(SFX_BANK)) {
      expect(d.gain).toBeGreaterThan(0);
      expect(d.gain).toBeLessThanOrEqual(1);
    }
  });

  it('화면 사건마다 표에 있는 소리가 묶여 있고 파일이 있다 (D-630)', () => {
    for (const [ev, kind] of Object.entries(SFX_EVENTS)) {
      const d = SFX_BANK[kind];
      expect(d, `${ev} → ${kind}`).toBeDefined();
      const name = d.n > 1 ? `${kind}1` : kind;
      expect(FILES, `${ev} → ${name}.ogg`).toContain(`${name}.ogg`);
    }
  });
  it('화면 사건마다 부르는 곳이 있다 (D-630)', () => {
    for (const ev of Object.keys(SFX_EVENTS)) expect(SRC, ev).toMatch(new RegExp(`sfxFor\\([^;\\n]*'${ev}'`));
  });
  it('무음이던 사건이 모두 묶였다 (D-630: 컷 전환 · 크레딧 · 승급 · 컷인 · 카드 날림 · 방열판 깨짐 · 창 · 승패 맺음)', () => {
    for (const ev of ['cutWipe', 'cutTitle', 'creditsOpen', 'creditsPage', 'boardPromote', 'throneCrown', 'cutIn', 'cardFling', 'ventBreak', 'winOpen', 'winClose', 'winSting', 'loseSting']) expect(SFX_EVENTS, ev).toHaveProperty(ev);
  });
  it('움직임에 붙은 소리는 되풀이 간격이 있다 (D-630)', () => {
    for (const d of Object.values(SFX_BANK)) if (d.motion) expect(d.gap ?? 0).toBeGreaterThan(0);
  });
});
