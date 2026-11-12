import { canPlay, cardPieces, cardMoves, isInstant, playCard, type SliceBattle } from './battle';
import { COMMANDS } from './cards';
import { PART_NUM, type SlicePartId } from './parts';

export type PartState = 'waiting' | 'ready' | 'spent';
export interface PartStatus { state: PartState; detail: string }
export const PART_STATE_LABEL: Record<PartState, string> = { waiting: '조건 대기', ready: '발동 가능', spent: '이번 턴 소진' };
const TRACKED_PARTS = ['relayGear','relaySeal','sharedPlate','siegeLatch','gameRecord','pinNeedle','recoilSpring','whistle','queenFan','fuse','tally'] as const;

/** 실제 턴별 소모 기록이 있는 부품만 표시한다. 상시 효과에는 임의의 소진을 붙이지 않는다. */
export const partStatuses = (b: SliceBattle): Partial<Record<SlicePartId, PartStatus>> => {
  const out: Partial<Record<SlicePartId, PartStatus>> = {};
  const types = b.once.filter(k => k.startsWith('relayType:')).map(k => k.slice(10));
  const rooks = b.s.pieces.filter(p => p.side === 0 && p.type === 'R' && p.hp > 0);
  for (const id of TRACKED_PARTS) {
    if (!b.parts.includes(id)) continue;
    const spent = id === 'siegeLatch' ? rooks.length > 0 && rooks.every(p => b.once.includes(`siegeLatch:${p.id}`)) : b.once.includes(id);
    const progress = id === 'relayGear' || id === 'relaySeal' ? `공격 유형 ${types.length}/${id === 'relayGear' ? 2 : 3}`
      : id === 'siegeLatch' ? `미사용 룩 ${rooks.filter(p => !b.once.includes(`siegeLatch:${p.id}`)).length}/${rooks.length}`
        : id === 'sharedPlate' ? '3승 동료의 방열판을 이웃에 전달'
          : id === 'fuse' || id === 'tally' ? `연쇄 ${b.kills}/${id === 'fuse' ? PART_NUM.fuseAt : PART_NUM.tallyAt}` : '실제 낼 수 있는 명령으로 판정';
    out[id] = { state: spent ? 'spent' : 'waiting', detail: progress };
  }
  if (b.s.winner !== null || !Object.keys(out).length) return {};
  const waiting = () => Object.values(out).some(s => s?.state === 'waiting');
  // 표시 전용 복제에서 실제 실행을 시험한다. 효과 조건을 UI에 다시 구현하지 않는다.
  const probe = (i: number, pieceId?: number, to?: {x: number; y: number}) => {
    const copy: SliceBattle = JSON.parse(JSON.stringify(b));
    if (typeof playCard(copy, i, pieceId, to) === 'string') return;
    for (const id of TRACKED_PARTS) {
      if (out[id]?.state !== 'waiting') continue;
      const fired = id === 'siegeLatch'
        ? copy.once.some(k => k.startsWith('siegeLatch:') && !b.once.includes(k))
        : copy.once.includes(id);
      if (fired) out[id]!.state = 'ready';
    }
  };
  for (let i = 0; i < b.hand.length && waiting(); i++) {
    if (!canPlay(b, i)) continue;
    if (isInstant(b.hand[i])) { probe(i); continue; }
    for (const p of cardPieces(b, i)) {
      if (!waiting()) break;
      if (COMMANDS[b.hand[i]].kind !== 'move') { probe(i, p.id); continue; }
      for (const to of cardMoves(b, i, p.id)) {
        probe(i, p.id, to);
        if (!waiting()) break;
      }
    }
  }
  return out;
};
