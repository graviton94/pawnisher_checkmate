import type { BattleState } from '../engine/types';
import type { RunState } from './run';

/**
 * 출하 기록 (D-117, 제안서 P1 2.5): 유저 테스트용 — 서버 없이 기기에 남기고, 설정에서 파일로 내보낸다.
 * StS 핵심 지표: 제시 시 선택률 · 완주 빌드 포함률 · 대국별 잃은 HP + 대국당 실제 시간.
 * 화면 쪽에서만 부른다 (엔진 결정론과 무관).
 */
export type LogEntry =
  | { t: 'offer'; at: number; floor: number; kind: string; options: string[]; picked: string | null }
  | { t: 'battle'; at: number; floor: number; kind: string; boss?: string; won: boolean; rounds: number; hpLost: number; ms: number }
  | { t: 'run'; at: number; seed: number; ascension: number; won: boolean; floor: number; deck: string[]; enchants: Record<string, number>; legends: string[]; cards: string[]; ms: number };

const KEY = 'pawnisher.log.v1';
/** 기기에 남길 최대 줄 수 (오래된 것부터 지운다) */
const MAX = 4000;

const read = (): LogEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as LogEntry[];
  } catch {
    return [];
  }
};
const push = (e: LogEntry): void => {
  try {
    const all = read();
    all.push(e);
    localStorage.setItem(KEY, JSON.stringify(all.slice(-MAX)));
  } catch {
    /* 저장 공간이 없으면 기록하지 않는다 */
  }
};

/** 3지선다를 고르거나 건너뛰었다 */
export const logOffer = (run: RunState, kind: string, options: string[], picked: string | null): void =>
  push({ t: 'offer', at: Date.now(), floor: run.floor, kind, options, picked });

/** 대국이 끝났다: 시작 상태와 끝 상태로 잃은 HP(내 군단 최대 HP 대비 %)를 잰다 */
export const logBattle = (run: RunState, start: BattleState, end: BattleState, ms: number, kind: string, boss?: string): void => {
  const max = start.pieces.filter((p) => p.side === 0).reduce((a, p) => a + p.maxHp, 0);
  const left = end.pieces.filter((p) => p.side === 0).reduce((a, p) => a + Math.max(0, p.hp), 0);
  push({ t: 'battle', at: Date.now(), floor: run.floor, kind, ...(boss ? { boss } : {}), won: end.winner === 0, rounds: Math.ceil(end.turnNumber / 2), hpLost: max ? Math.round(((max - left) / max) * 100) : 0, ms });
};

/** 출하가 끝났다 */
export const logRun = (run: RunState, won: boolean, ms: number): void =>
  push({
    t: 'run',
    at: Date.now(),
    seed: run.seed,
    ascension: run.ascension ?? 0,
    won,
    floor: run.floor,
    deck: [...run.deck],
    enchants: { ...(run.loadout.enchants as Record<string, number>) },
    legends: [...(run.loadout.legends ?? [])],
    cards: [...run.loadout.cards],
    ms,
  });

/** 기록 요약 (설정 화면 한 줄) */
export const logSummary = (): { runs: number; battles: number; offers: number } => {
  const all = read();
  return { runs: all.filter((e) => e.t === 'run').length, battles: all.filter((e) => e.t === 'battle').length, offers: all.filter((e) => e.t === 'offer').length };
};

/** 내보내기: 파일로 내려받고, 안 되면 클립보드로. 결과 문구를 돌려준다 */
export const exportLog = async (): Promise<string> => {
  const text = JSON.stringify({ app: 'pawnisher', version: 1, exported: new Date().toISOString(), entries: read() });
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pawnisher-log-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'file';
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    } catch {
      return 'fail';
    }
  }
};
