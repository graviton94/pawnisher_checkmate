import { describe, expect, it } from 'vitest';
import { CREW_BARK, EVENT_PONDER, FOE_KING_LINES, FOE_PIECE_BARK, VOICE_TIMING } from '../src/data/battle-voice';
import { holdMs } from '../src/slice/voice';
import { CREW_VOICE } from '../src/data/crew-voice';

// P-B (D-490): 판 위 목소리 데이터 — 바크는 한 줄(띠 한 줄 폭), 상황마다 되풀이되지 않을 만큼, 말투 규칙(느낌표 · 「 」 없음)
const bare = (t: string) => t.replace(/^[“‘]|[”’]$/g, '');
const all = [...Object.values(FOE_KING_LINES).flat(), ...Object.values(FOE_PIECE_BARK).flatMap((c) => Object.values(c).flat()), ...Object.values(CREW_BARK).flatMap((c) => Object.values(c).flat())];

describe('battle voice lines', () => {
  it('보통 적 킹은 상황마다 여섯 이상 · 분대원 합류 · 쓰러짐도 여섯 이상 (D-536 — 한 출하에 같은 줄이 되풀이되지 않게)', () => {
    for (const cue of Object.keys(FOE_KING_LINES) as (keyof typeof FOE_KING_LINES)[]) expect(FOE_KING_LINES[cue].length).toBeGreaterThanOrEqual(6);
    for (const v of Object.values(CREW_VOICE)) { expect(v.join.length).toBeGreaterThanOrEqual(6); expect(v.fall.length).toBeGreaterThanOrEqual(6); }
    for (const l of Object.values(CREW_VOICE).flatMap((v) => [...v.join, ...v.fall])) expect(l.startsWith('“') && l.endsWith('”')).toBe(true);
  });
  it('바크는 큰따옴표 대사 · 한 줄 22자 이하 · 느낌표 · 「 」 없음', () => {
    for (const l of all) {
      expect(l.startsWith('“') && l.endsWith('”')).toBe(true);
      expect([...bare(l)].length).toBeLessThanOrEqual(22);
      expect(l).not.toMatch(/[!「」]/);
    }
  });
  it('말 없는 사건의 망설임은 종이왕 독백 둘', () => {
    for (const lines of Object.values(EVENT_PONDER)) {
      expect(lines.length).toBe(2);
      for (const l of lines) expect(l.startsWith('‘') && l.endsWith('’')).toBe(true);
    }
  });
  it('머무는 시간은 글 길이로 늘고 바크 기본보다 짧지 않다', () => {
    expect(holdMs('bark', '하나.')).toBeGreaterThanOrEqual(VOICE_TIMING.bark.base);
    expect(holdMs('bark', '정품 킹을 부수면 너희만 손해야.')).toBeGreaterThan(holdMs('bark', '하나.'));
    expect(holdMs('sub', '<em>가</em>')).toBe(VOICE_TIMING.sub.base + VOICE_TIMING.sub.perChar);
  });
});
