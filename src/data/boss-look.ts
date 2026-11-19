/**
 * 반장 등장 모습 정본 (D-249 반장 등장 → D-647: 검수 · 자석 · 경보도 제 등장 효과를 갖는다).
 * accent = 띠 테 · 경계선 빛 색, ramp = 경계선 입자 세 색(밝음 · 가운데 · 어두움), entrance = 경계선 FX 갈래.
 * 판 칸 색은 `boss-board.json` (D-645).
 */
import { BEAT } from './motion';
import type { SfxKind } from './sfx';

export type BossLookKey = 'plate' | 'spawn' | 'thorns' | 'gilded' | 'inspect' | 'magnet' | 'alarm';
/** 경계선 FX: fire 철갑 불 · spark 조립 전기 · shard 가시 쇳조각 · scan 렌즈 훑기 · pull 쇳가루 끌림 · siren 경광등 회전 */
export type BossEntrance = 'fire' | 'spark' | 'shard' | 'scan' | 'pull' | 'siren';
export interface BossLook { accent: string; ramp?: [string, string, string]; entrance: BossEntrance }

export const BOSS_LOOK: Record<BossLookKey, BossLook> = {
  plate: { accent: '#ff8a2a', entrance: 'fire' },
  spawn: { accent: '#7fd45a', ramp: ['#efffdc', '#7fd45a', '#3e8c3a'], entrance: 'spark' },
  thorns: { accent: '#e8e4ec', ramp: ['#ffffff', '#e8e4ec', '#8a8794'], entrance: 'shard' },
  gilded: { accent: '#f4c84a', entrance: 'shard' },
  // D-646 · D-647: 판 색과 같은 계열 — 검수 찬 청록 렌즈 · 자석 남보라 + 붉은/푸른 극 · 경보 붉은 쇠 + 호박 경광등
  inspect: { accent: '#9ee8f0', ramp: ['#e8fbfc', '#9ee8f0', '#2e8a90'], entrance: 'scan' },
  magnet: { accent: '#b89cf0', ramp: ['#e8eaf0', '#9a92b8', '#584c80'], entrance: 'pull' },
  alarm: { accent: '#ff6b6b', ramp: ['#ffe27a', '#facc15', '#c42430'], entrance: 'siren' },
};

/**
 * 새 등장 FX 수치 (D-647, 단위: FX 도트 = 화면 3px · 초). 모두 프레임마다 정수 도트 자리로 움직인다(D-595).
 *  scan: 렌즈가 경계선을 위→아래로 훑고(빠르게→느리게) 끝마다 불량 도장 ✕가 찍혔다 디더로 빠진다.
 *  pull: 쇳가루가 바깥에서 한 번 물러섰다(예비) 가운데로 빨려 들어(점점 빠르게) 붙고 1도트 튄다(출렁) — 물결 셋.
 *  siren: 경계선 위 경광등이 돌며 마주 보는 빛살 두 줄기를 쓸고, 반 바퀴마다 붉은 ↔ 호박이 바뀐다(화면 전체 번쩍임 없음 — 광과민 D-598).
 */
export const BOSS_ENTRANCE = {
  scan: { start: 0.62, period: 0.9, lens: 7, beam: 70, stampHold: 0.18, stampOut: 0.16 },
  pull: { waves: [0.62, 1.5, 2.4], per: 48, from: [24, 64] as [number, number], ring: [3, 9] as [number, number], wind: 0.1, back: 3, snap: 0.3, left: 16 },
  siren: { start: 0.62, rps: 0.75, len: 80, half: 0.22, lampY: 14 },
};

/**
 * 반장 내리찍기 박자 · 소리 (D-690 — 반장마다 다른 모양은 view/bossstrike.ts).
 * 길이는 적 공격 박자 예산(motion.ts BEAT.foe: 공격 + 처치 연출)을 따른다 — 전투 속도를 고치면(D-680) 함께 바뀐다.
 * wind = 예비 소리 · hit = 터짐 소리 (있는 효과음만, D-630 표)
 */
export const BOSS_STRIKE = {
  ms: (): number => BEAT.foe.attack + BEAT.foe.killFx,
  sound: {
    plate: { wind: 'lift', hit: 'crit' },
    spawn: { wind: 'slot', hit: 'parry' },
    thorns: { wind: 'push', hit: 'crit' },
    inspect: { wind: 'cast', hit: 'stamp' },
    magnet: { wind: 'wind', hit: 'parry' },
    alarm: { wind: 'threat', hit: 'crit' },
    gilded: { wind: 'crown', hit: 'crit' },
  } as Record<BossLookKey, { wind: SfxKind; hit: SfxKind }>,
};

/**
 * 반장 2단계 판 (D-690): 칸 그림 곱하기 색. 밝은 칸 휘도 85 → 약 70, 어두운 칸 47 → 약 38 —
 * 흰 기물(밝음) · 검은 기물(흰 테 3칸) · 붉은 과녁이 그대로 읽히는 선에서 붉게.
 */
export const BOSS_RAGE = { tileTint: 0xffb4a8 };
