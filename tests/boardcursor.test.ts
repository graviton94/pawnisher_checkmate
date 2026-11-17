import { describe, expect, it } from 'vitest';
import { bodyRect, clampCell, cursorRect, moveCursor, tapCell, type BodyPiece, type CursorBoard } from '../src/slice/boardcursor';
import { PAD_HOLD, PAD_MAP, dispatch, keyAction, type Action, type InputEnv } from '../src/slice/keymap';

/** 6×6 판 + 기물 목록 → 커서가 읽는 판 */
const boardOf = (pieces: BodyPiece[], w = 6, h = 6): CursorBoard => ({ w, h, body: (c) => bodyRect(pieces, c) });

/** 2×2 반장: 본체(왼아래 2,3) + 몸 칸 셋 */
const BOSS: BodyPiece[] = [
  { id: 10, x: 2, y: 3, giant: { id: 10, boss: true } },
  { id: 11, x: 3, y: 3, body: 10 },
  { id: 12, x: 2, y: 4, body: 10 },
  { id: 13, x: 3, y: 4, body: 10 },
];
/** 거대 주물: 부위 넷이 따로 (HP 따로) */
const GIANT: BodyPiece[] = [
  { id: 20, x: 1, y: 1, giant: { id: 7 } },
  { id: 21, x: 2, y: 1, giant: { id: 7 } },
  { id: 22, x: 1, y: 2, giant: { id: 7 } },
  { id: 23, x: 2, y: 2, giant: { id: 7 } },
];

describe('판 커서 이동 (D-533)', () => {
  const b = boardOf([]);
  it('방향 한 칸 — 위 = y+1 (엔진 좌표, 화면 위)', () => {
    expect(moveCursor({ x: 2, y: 2 }, 'up', b)).toEqual({ x: 2, y: 3 });
    expect(moveCursor({ x: 2, y: 2 }, 'down', b)).toEqual({ x: 2, y: 1 });
    expect(moveCursor({ x: 2, y: 2 }, 'left', b)).toEqual({ x: 1, y: 2 });
    expect(moveCursor({ x: 2, y: 2 }, 'right', b)).toEqual({ x: 3, y: 2 });
  });
  it('판 끝에서 멈춘다 (감싸 돌지 않는다)', () => {
    expect(moveCursor({ x: 0, y: 0 }, 'left', b)).toEqual({ x: 0, y: 0 });
    expect(moveCursor({ x: 0, y: 0 }, 'down', b)).toEqual({ x: 0, y: 0 });
    expect(moveCursor({ x: 5, y: 5 }, 'right', b)).toEqual({ x: 5, y: 5 });
    expect(moveCursor({ x: 5, y: 5 }, 'up', b)).toEqual({ x: 5, y: 5 });
  });
  it('판이 줄면 커서를 판 안으로 당긴다', () => {
    expect(clampCell({ x: 9, y: -2 }, 6, 8)).toEqual({ x: 5, y: 0 });
    expect(moveCursor({ x: 7, y: 7 }, 'right', boardOf([], 6, 6))).toEqual({ x: 5, y: 5 });
  });
  it('2×2 반장: 들어서면 몸 왼아래 칸에 붙고 테는 몸 전체', () => {
    const bb = boardOf(BOSS);
    const at = moveCursor({ x: 1, y: 4 }, 'right', bb);
    expect(at).toEqual({ x: 2, y: 3 });
    expect(cursorRect(at, bb)).toEqual({ x: 2, y: 3, w: 2, h: 2 });
    expect(moveCursor({ x: 3, y: 5 }, 'down', bb)).toEqual({ x: 2, y: 3 });
  });
  it('2×2 반장: 한 번 더 누르면 몸을 건너 나간다', () => {
    const bb = boardOf(BOSS);
    expect(moveCursor({ x: 2, y: 3 }, 'right', bb)).toEqual({ x: 4, y: 3 });
    expect(moveCursor({ x: 2, y: 3 }, 'up', bb)).toEqual({ x: 2, y: 5 });
    expect(moveCursor({ x: 2, y: 3 }, 'left', bb)).toEqual({ x: 1, y: 3 });
    expect(moveCursor({ x: 2, y: 3 }, 'down', bb)).toEqual({ x: 2, y: 2 });
  });
  it('2×2 반장이 판 끝에 붙어 있으면 그 자리에 남는다', () => {
    const edge: BodyPiece[] = BOSS.map((p) => ({ ...p, x: p.x + 2, y: p.y + 1 })); // 4..5 × 4..5
    const bb = boardOf(edge);
    expect(moveCursor({ x: 4, y: 4 }, 'right', bb)).toEqual({ x: 4, y: 4 });
    expect(moveCursor({ x: 4, y: 4 }, 'up', bb)).toEqual({ x: 4, y: 4 });
  });
  it('거대 주물: 부위마다 한 칸씩 서고(부위가 따로 노리는 칸) 테는 몸 전체', () => {
    const bb = boardOf(GIANT);
    expect(moveCursor({ x: 1, y: 1 }, 'right', bb)).toEqual({ x: 2, y: 1 });
    expect(cursorRect({ x: 2, y: 2 }, bb)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
    // 부서진 부위가 빠지면 남은 칸만 감싼다
    const two = boardOf(GIANT.slice(0, 2));
    expect(cursorRect({ x: 1, y: 1 }, two)).toEqual({ x: 1, y: 1, w: 2, h: 1 });
    // 부위 하나만 남으면 한 칸
    expect(cursorRect({ x: 1, y: 1 }, boardOf(GIANT.slice(0, 1)))).toEqual({ x: 1, y: 1, w: 1, h: 1 });
  });
});

describe('판 커서 확인 = 그 칸 탭', () => {
  it('보통 칸은 커서 칸 그대로', () => {
    expect(tapCell({ x: 3, y: 1 }, boardOf([]), [{ x: 0, y: 0 }])).toEqual({ x: 3, y: 1 });
  });
  it('반장 몸: 몸 안의 목적지 칸을 탭한다 (없으면 커서 칸)', () => {
    const bb = boardOf(BOSS);
    expect(tapCell({ x: 2, y: 3 }, bb, [{ x: 3, y: 4 }, { x: 0, y: 0 }])).toEqual({ x: 3, y: 4 });
    expect(tapCell({ x: 2, y: 3 }, bb, [{ x: 2, y: 3 }, { x: 3, y: 4 }])).toEqual({ x: 2, y: 3 });
    expect(tapCell({ x: 2, y: 3 }, bb, [])).toEqual({ x: 2, y: 3 });
  });
  it('거대 주물 부위는 고른 부위 그대로', () => {
    expect(tapCell({ x: 2, y: 2 }, boardOf(GIANT), [{ x: 1, y: 1 }])).toEqual({ x: 2, y: 2 });
  });
});

describe('판 초점 키 · 패드 (D-533)', () => {
  it('Tab · I · 패드 LB/RB · Back · Y 길게', () => {
    expect(keyAction({ key: 'Tab' })).toEqual({ t: 'toggle' });
    expect(keyAction({ key: 'i' })).toEqual({ t: 'info' });
    expect(keyAction({ key: 'I' })).toEqual({ t: 'info' });
    expect(PAD_MAP[4]).toEqual({ t: 'toggle' });
    expect(PAD_MAP[5]).toEqual({ t: 'toggle' });
    expect(PAD_MAP[8]).toEqual({ t: 'info' });
    expect(PAD_MAP[3]).toEqual({ t: 'undo' });
    expect(PAD_HOLD[3]).toEqual({ t: 'info' });
  });

  const env = (o: { battle?: boolean; board?: boolean; focused?: boolean }) => {
    const log: string[] = [];
    const e: InputEnv = {
      dismiss: () => (log.push('dismiss'), false),
      inBattle: () => !!o.battle,
      cancel: () => (log.push('cancel'), true),
      press: () => (log.push('press'), true),
      move: (d) => void log.push(`move:${d}`),
      click: (t) => (log.push(typeof t === 'object' ? `card:${t.card}` : t), true),
      pause: () => false,
      board: o.board
        ? {
            focused: () => !!o.focused,
            toggle: () => void log.push('toggle'),
            move: (d) => void log.push(`cursor:${d}`),
            press: () => (log.push('tap'), true),
            info: () => (log.push('info'), true),
          }
        : undefined,
    };
    return { e, log };
  };
  const run = (a: Action, o: Parameters<typeof env>[0]) => {
    const { e, log } = env(o);
    return { done: dispatch(a, e), log };
  };
  it('대국 판에 초점이면 방향 · 확인 · 정보는 판 커서로', () => {
    expect(run({ t: 'focus', dir: 'left' }, { battle: true, board: true, focused: true }).log).toEqual(['cursor:left']);
    expect(run({ t: 'confirm' }, { battle: true, board: true, focused: true }).log).toEqual(['tap']);
    expect(run({ t: 'info' }, { battle: true, board: true, focused: true }).log).toEqual(['info']);
  });
  it('초점이 손패면 예전처럼 단추 초점 · 누르기', () => {
    expect(run({ t: 'focus', dir: 'left' }, { battle: true, board: true, focused: false }).log).toEqual(['move:left']);
    expect(run({ t: 'confirm' }, { battle: true, board: true, focused: false }).log).toEqual(['press']);
    expect(run({ t: 'info' }, { battle: true, board: true, focused: false })).toEqual({ done: false, log: [] });
  });
  it('대국 밖(창 · 장면)에서는 판 커서를 건드리지 않는다', () => {
    expect(run({ t: 'focus', dir: 'up' }, { battle: false, board: true, focused: true }).log).toEqual(['move:up']);
    expect(run({ t: 'confirm' }, { battle: false, board: true, focused: true }).log).toEqual(['press']);
    expect(run({ t: 'toggle' }, { battle: false, board: true })).toEqual({ done: false, log: [] });
  });
  it('Tab은 대국에서만 손패 ↔ 판 (밖에서는 브라우저 Tab에 맡긴다)', () => {
    expect(run({ t: 'toggle' }, { battle: true, board: true })).toEqual({ done: true, log: ['toggle'] });
    expect(run({ t: 'toggle' }, { battle: true })).toEqual({ done: false, log: [] });
  });
  it('뒤로 · 카드 키는 판 초점과 상관없이 그대로', () => {
    expect(run({ t: 'back' }, { battle: true, board: true, focused: true }).log).toEqual(['dismiss', 'cancel']);
    expect(run({ t: 'card', i: 1 }, { battle: true, board: true, focused: true }).log).toEqual(['card:1']);
  });
});
