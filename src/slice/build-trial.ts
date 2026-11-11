import { BUILD_TRIAL, BUILD_TRIAL_DECK, type BuildTrialCase, type BuildTrialId } from '../data/build-trial';
import { findPiece } from '../engine';
import { Rng } from '../engine/rng';
import { depthAt, newSliceBattle, replanTelegraph, type Squad } from './battle';
import { cardFits } from './cards';
import { battleFor } from './run';

/** 비교 뒤 이어가는 첫막 고정 동선: 일반전 → 정예전 → 반장. 획득·지도 시험은 후속 단계다. */
export const createBuildAct = (id: BuildTrialId, step: number, squad?: Squad[]) => {
  const parts = [BUILD_TRIAL[id].part];
  const crew = squad ?? trialSquad();
  const def = battleFor(1, step === 2 ? 'boss' : step === 1 ? 'check' : 'battle', new Rng(420 + step));
  const deck = BUILD_TRIAL_DECK.filter((card) => cardFits(card, crew.map((u) => u.t)));
  const b = newSliceBattle(crew, def.enemy, deck, 420 + step, {
    parts, enemyKingHp: def.kingHp, enemyHp: def.enemyHp,
    boss: def.boss, bossRule: def.bossRule, traits: def.traits,
    width: def.w, height: def.h, guard: def.guard, atkMul: def.atk,
    depth: depthAt(0, (step + 1) / 3), rewindCharms: 1, shock: false,
  });
  return { b, squad: crew, parts, deck, def };
};

const trialSquad = (): Squad[] => [{ t: 'K', name: '종이왕' }, { t: 'P', name: '먼지투성이' }, { t: 'N', name: '박차' }, { t: 'R', name: '금 간 벽' }];

/** 정상·재료 부족·막힌 사선·동료 손실을 같은 조건으로 재현한다. 본편 저장은 건드리지 않는다. */
export const createBuildTrial = (id: BuildTrialId, condition: BuildTrialCase = 'ready') => {
  const squad = trialSquad();
  const parts = [BUILD_TRIAL[id].part];
  const deck = [...BUILD_TRIAL_DECK];
  const b = newSliceBattle(squad, ['K', 'P', 'P', 'R'], deck, 420, {
    parts, ordered: true, width: 6, height: 6, rewindCharms: 1, shock: false,
  });
  const positions = [[0, 0], [1, 1], [3, 0], [5, 0], [0, 5], [0, 3], [2, 3], [5, 5]];
  const used = new Set<number>();
  const enemies = (['K', 'P', 'P', 'R'] as const).map((t) => {
    const p = b.s.pieces.find((p) => p.side === 1 && p.type === t && !used.has(p.id))!;
    used.add(p.id); return p;
  });
  const ordered = [...b.squadIds.map((id) => findPiece(b.s, id)!), ...enemies];
  ordered.forEach((p, i) => { [p.x, p.y] = positions[i]; });
  findPiece(b.s, b.squadIds[3])!.shield = 15;
  if (condition === 'missing') {
    if (id === 'rook') findPiece(b.s, b.squadIds[3])!.shield = 0;
    if (id === 'mixed') b.hand = ['leap', 'leap', 'rebound', 'plate', 'repair'];
    if (id === 'knight') for (const p of b.s.pieces) if (p.side === 1) p.hp = p.maxHp = 200;
  }
  if (condition === 'blocked') {
    Object.assign(findPiece(b.s, b.squadIds[1])!, { x: 5, y: 1 });
    Object.assign(findPiece(b.s, b.squadIds[2])!, { x: 4, y: 0 });
  }
  if (condition === 'loss') {
    const lost = b.squadIds[id === 'knight' ? 2 : id === 'rook' ? 3 : 1];
    b.s.pieces = b.s.pieces.filter((p) => p.id !== lost);
    b.falls.push({ pieceId: lost, turn: 1, by: '비교 조건' });
  }
  replanTelegraph(b);
  b.snap = JSON.stringify({ ...b, snap: '' });
  return { b, squad, parts, deck };
};
