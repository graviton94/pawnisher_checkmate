import type { BossId } from './run';

/**
 * 반장 비틀기 (규격 2.0, GDD 14장 §3.4 — Balatro 보스 블라인드식): 반장마다 규칙 하나. 지도에서 미리 보인다.
 * 반장에게 유리하지만, 무엇을 준비하면 되는지가 문장 안에 있다.
 */
export type TwistId = 'horseshoe' | 'lens' | 'wall' | 'line' | 'molds' | 'papers' | 'gild';

export interface TwistDef {
  name: string;
  desc: string;
  /** 준비할 것 (지도 반장 카드 한 줄) */
  prep: string;
}

export const TWISTS: Record<TwistId, TwistDef> = {
  horseshoe: { name: '편자 질주', desc: '적 나이트의 이동 태엽 −1.', prep: '철갑 · 방열판으로 버틴다' },
  lens: { name: '렌즈 조명', desc: '적 비숍은 두 칸 이상 떨어져서 맞으면 피해 절반.', prep: '붙어서 친다 — 나이트 · 폰' },
  wall: { name: '성벽', desc: '적 룩은 받는 피해 −40%. 대각선에서 맞으면 그대로.', prep: '비숍 · 퀸으로 사선에서' },
  line: { name: '양산 라인', desc: '적 폰이 쓰러지면 맨 뒷줄에 다시 선다 (네 번까지).', prep: '튐 각인으로 한꺼번에, 아니면 킹을 빨리' },
  molds: { name: '거푸집 상인', desc: '적 기물마다 각인이 하나씩 있다.', prep: '각인을 읽고 친다 — 철갑은 나중에' },
  papers: { name: '서류 검문', desc: '내 명령은 한 턴에 세 개까지.', prep: '한 기 한 기를 세게 — 단조 각인' },
  gild: { name: '금칠', desc: '적 킹은 곁에 아군이 붙어 있으면 받는 피해 절반.', prep: '킹 곁의 기물부터 걷어 낸다' },
};

/** 반장 → 비틀기 */
export const BOSS_TWIST: Record<BossId | 'final', TwistId> = {
  knight: 'horseshoe',
  bishop: 'lens',
  rook: 'wall',
  pawn: 'line',
  variant: 'molds',
  affix: 'papers',
  final: 'gild',
};

export const TWIST_FX = { lensCut: 0.5, wallCut: 0.6, lineMax: 4, papersMax: 3, gildCut: 0.5 };
