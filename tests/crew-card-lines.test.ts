import { describe, expect, it } from 'vitest';
import { QUIRKS, SCAR_DESC } from '../src/slice/crew';
import { RECRUITS } from '../src/slice/cards';
import { DESC_LIMIT, textWidth } from '../src/slice/desc';

/**
 * 분대원 카드 두루마리 (D-376): 명령 · 부품 카드와 같은 5줄 — 위 2줄(기록 칸 또는 첫마디) · 점선 · 아래 3줄(기벽 이름 1 + 풀이 ≤ 2).
 * 한 줄 ≈ 한글 8.5자 (두루마리 폭). 흉터는 기벽이 없을 때만 아래 칸에 든다.
 */
describe('분대원 카드 줄 한도', () => {
  const LINE = DESC_LIMIT.say / 2;
  it('기벽 이름 1줄 · 풀이 2줄 안', () => {
    const bad = Object.entries(QUIRKS).filter(([, q]) => textWidth(q.name) > LINE || textWidth(q.desc) > DESC_LIMIT.say).map(([id, q]) => [id, q.name, q.desc]);
    expect(bad).toEqual([]);
  });
  it('흉터 풀이 2줄 안', () => {
    expect(Object.entries(SCAR_DESC).filter(([, d]) => textWidth(d) > DESC_LIMIT.say)).toEqual([]);
  });
  it('영입 첫마디 2줄 안', () => {
    expect(RECRUITS.filter((r) => textWidth(r.line) > DESC_LIMIT.say).map((r) => r.line)).toEqual([]);
  });
});
