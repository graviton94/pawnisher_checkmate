import { describe, expect, it } from 'vitest';
import { buildLog } from '../src/game/controller';
import { resolveTurn } from '../src/engine';
import { board, sq } from './helpers';

describe('기록 줄 (D-073)', () => {
  it('이동한 뒤 공격한 칸과 대상·피해·처치를 남긴다', () => {
    const s = board([['R', 0, 'a1'], ['K', 0, 'h1'], ['P', 1, 'a6', { hp: 1 }], ['K', 1, 'h8']]);
    const r = resolveTurn(s, [{ pieceId: 1, to: sq('a5') }]);
    const log = buildLog(s, r.events);
    expect(log).toHaveLength(1);
    expect(log[0].attacker.pos).toEqual(sq('a5'));
    expect(log[0].targets[0]).toMatchObject({ type: 'P', side: 1, killed: true });
  });
});
