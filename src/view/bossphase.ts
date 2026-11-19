/**
 * 반장 1단계 쓰러짐 가리기 (D-690): 같은 사건 묶음 안에서 쓰러진 킹이 같은 id로 다시 서면(respawn) 그것은 격파가 아니라 2단계 돌입이다.
 * 판은 이때 킹 마무리(레터박스 · 응축 · 왕관 — 대국 끝 연출)를 틀지 않고 「무릎 꿇음」만 보인다 — 격파 연출은 진짜 끝에 한 번.
 */
import type { BattleEvent } from '../engine';

/** 이 사건 묶음에서 쓰러졌다가 다시 선 기물 id (반장 2단계) */
export const risenIds = (events: readonly BattleEvent[]): Set<number> => {
  const killed = new Set<number>();
  const out = new Set<number>();
  for (const e of events) {
    if (e.type === 'attack' || e.type === 'blast') for (const h of e.hits) if (h.killed) killed.add(h.targetId);
    if (e.type === 'respawn' && killed.has(e.pieceId)) out.add(e.pieceId);
  }
  return out;
};
/** 대국 끝 사건 수 — 한 묶음에 둘 이상이거나, 다시 선 반장과 함께 들면 끝 연출이 겹친다 */
export const gameOvers = (events: readonly BattleEvent[]): number => events.filter((e) => e.type === 'gameOver').length;
