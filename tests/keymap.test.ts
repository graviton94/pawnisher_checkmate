import { describe, expect, it } from 'vitest';
import { PAD_MAP, bindConflict, cleanBinds, DEFAULT_BINDS, dispatch, keyAction, nearest, setKeyBinds, stickDir, type Action, type InputEnv } from '../src/slice/keymap';
import { splitPreload } from '../src/slice/warmup';
import { PRELOAD } from '../src/data/preload-list';

/** 부른 것을 적어 두는 가짜 화면 */
const fakeEnv = (o: { open?: boolean; battle?: boolean; sel?: boolean; buttons?: boolean; pause?: boolean } = {}) => {
  const log: string[] = [];
  const env: InputEnv = {
    dismiss: () => (log.push('dismiss'), !!o.open),
    inBattle: () => !!o.battle,
    cancel: () => (log.push('cancel'), !!o.sel),
    press: () => (log.push('press'), o.buttons !== false),
    move: (d) => void log.push(`move:${d}`),
    click: (t) => (log.push(typeof t === 'object' ? `card:${t.card}` : t), true),
    pause: () => (log.push('pause'), !!o.pause),
  };
  return { env, log };
};

describe('키 → 행동 (D-531)', () => {
  it('확인 · 뒤로 · 대국 키', () => {
    expect(keyAction({ key: 'Enter' })).toEqual({ t: 'confirm' });
    expect(keyAction({ key: ' ' })).toEqual({ t: 'confirm' });
    expect(keyAction({ key: 'Escape' })).toEqual({ t: 'back' });
    expect(keyAction({ key: 'Backspace' })).toEqual({ t: 'back' });
    expect(keyAction({ key: 'e' })).toEqual({ t: 'endTurn' });
    expect(keyAction({ key: 'E' })).toEqual({ t: 'endTurn' });
    expect(keyAction({ key: 'z' })).toEqual({ t: 'undo' });
    expect(keyAction({ key: 'z', ctrlKey: true })).toEqual({ t: 'undo' });
    expect(keyAction({ key: 'r' })).toEqual({ t: 'reset' });
    expect(keyAction({ key: 'ArrowLeft' })).toEqual({ t: 'focus', dir: 'left' });
  });
  it('카드 1~9 → 손패 0~8, 0은 없음', () => {
    expect(keyAction({ key: '1' })).toEqual({ t: 'card', i: 0 });
    expect(keyAction({ key: '9' })).toEqual({ t: 'card', i: 8 });
    expect(keyAction({ key: '0' })).toBeNull();
  });
  it('Alt+Enter(전체 화면) · Ctrl+R(새로고침)은 가로채지 않는다', () => {
    expect(keyAction({ key: 'Enter', altKey: true })).toBeNull();
    expect(keyAction({ key: 'r', ctrlKey: true })).toBeNull();
    expect(keyAction({ key: 'F11' })).toBeNull();
  });
});

describe('패드 → 같은 행동', () => {
  it('A 확인 · B 뒤로 · Start 메뉴 · 십자키 초점', () => {
    expect(PAD_MAP[0]).toEqual({ t: 'confirm' });
    expect(PAD_MAP[1]).toEqual({ t: 'back' });
    expect(PAD_MAP[9]).toEqual({ t: 'menu' });
    expect([12, 13, 14, 15].map((i) => (PAD_MAP[i] as { dir: string }).dir)).toEqual(['up', 'down', 'left', 'right']);
  });
  it('스틱은 크게 기울였을 때만, 큰 축 쪽으로', () => {
    expect(stickDir(0.3, 0.2)).toBeNull();
    expect(stickDir(0.9, 0.3)).toBe('right');
    expect(stickDir(-0.2, -0.8)).toBe('up');
  });
});

describe('행동 흘리기', () => {
  const run = (a: Action, o: Parameters<typeof fakeEnv>[0]) => {
    const { env, log } = fakeEnv(o);
    return { done: dispatch(a, env), log };
  };
  it('뒤로: 창이 열려 있으면 닫기만', () => {
    expect(run({ t: 'back' }, { open: true, battle: true, sel: true })).toEqual({ done: true, log: ['dismiss'] });
  });
  it('뒤로: 창이 없으면 대국에서 선택 내려놓기', () => {
    expect(run({ t: 'back' }, { battle: true, sel: true })).toEqual({ done: true, log: ['dismiss', 'cancel'] });
    expect(run({ t: 'back' }, { battle: false })).toEqual({ done: false, log: ['dismiss', 'pause'] });
  });
  it('뒤로: 닫을 것 · 내려놓을 것이 없으면 대국 · 지도 일시 정지 메뉴 (D-539)', () => {
    expect(run({ t: 'back' }, { battle: true, pause: true })).toEqual({ done: true, log: ['dismiss', 'cancel', 'pause'] });
    expect(run({ t: 'back' }, { battle: false, pause: true })).toEqual({ done: true, log: ['dismiss', 'pause'] });
  });
  it('Start: 메뉴를 열고, 창이 열려 있으면 닫는다', () => {
    expect(run({ t: 'menu' }, { battle: true, pause: true }).log).toEqual(['pause']);
    expect(run({ t: 'menu' }, { open: true })).toEqual({ done: true, log: ['pause', 'dismiss'] });
  });
  it('대국 키는 대국이 맨 위일 때만 단추를 누른다', () => {
    expect(run({ t: 'endTurn' }, { battle: true }).log).toEqual(['end']);
    expect(run({ t: 'reset' }, { battle: true }).log).toEqual(['rewind']);
    expect(run({ t: 'card', i: 2 }, { battle: true }).log).toEqual(['card:2']);
    for (const a of [{ t: 'endTurn' }, { t: 'reset' }, { t: 'card', i: 0 }, { t: 'undo' }] as Action[]) expect(run(a, { battle: false })).toEqual({ done: false, log: [] });
  });
  it('확인 · 초점은 어느 화면에서나', () => {
    expect(run({ t: 'confirm' }, {}).log).toEqual(['press']);
    expect(run({ t: 'focus', dir: 'down' }, {}).log).toEqual(['move:down']);
  });
});

describe('방향 초점', () => {
  const items = [
    { item: 'left', x: 0, y: 50 },
    { item: 'right', x: 100, y: 50 },
    { item: 'downFar', x: 50, y: 200 },
    { item: 'downSide', x: 120, y: 110 },
  ];
  it('그쪽에 있는 가까운 단추 (옆 거리는 두 배)', () => {
    expect(nearest({ x: 50, y: 50 }, items, 'left')).toBe('left');
    expect(nearest({ x: 50, y: 50 }, items, 'right')).toBe('right');
    expect(nearest({ x: 50, y: 50 }, items, 'down')).toBe('downFar');
    expect(nearest({ x: 50, y: 50 }, items, 'up')).toBeNull();
  });
});

describe('워밍업 두 묶음 (D-531)', () => {
  it('타이틀 전에는 타이틀 그림만, 기물 · 칸 · UI는 판 묶음, 장면은 프롤로그 · 1막만, 안 쓰는 그림은 목록에 없다', () => {
    const { title, first, later } = splitPreload(PRELOAD);
    // 안 쓰는 그림은 public 밖(build-res/unused/)으로 옮겼다 (D-541) — 목록에 없어야 앱에도 실리지 않는다
    const unused = ['scenes/act-0.png', 'scenes/entry-check.png', 'scenes/entry-battle.png', 'scenes/ending-peel.png', 'pieces/m-K0.png', 'ui/marks/select.png'];
    for (const u of unused) expect(PRELOAD).not.toContain(u);
    expect(title.length + first.length + later.length).toBe(PRELOAD.length);
    expect(title).toContain('scenes/prologue-00.png');
    expect(title).toContain('ui/title-logo.png');
    expect(title.length).toBeLessThan(12);
    const core = (p: string) => /^(pieces|ui)\//.test(p);
    expect([...title, ...first].filter(core).length).toBe(PRELOAD.filter(core).length);
    expect(first).toContain('scenes/act-1.png');
    expect(later).toContain('scenes/ending-a.png');
    expect(later.every((p) => /^(scenes|guide)\//.test(p))).toBe(true);
    expect(later[0]).toBe('scenes/act-2.png');
  });
});

describe('키 바꾸기 (D-539)', () => {
  it('바꾼 키가 행동을 대신하고, 옛 키는 풀린다 — 기본으로 되돌릴 수 있다', () => {
    setKeyBinds({ endTurn: 'Q' });
    expect(keyAction({ key: 'q' })).toEqual({ t: 'endTurn' });
    expect(keyAction({ key: 'Q' })).toEqual({ t: 'endTurn' });
    expect(keyAction({ key: 'e' })).toBeNull();
    setKeyBinds({});
    expect(keyAction({ key: 'e' })).toEqual({ t: 'endTurn' });
  });
  it('고정 키 · 다른 행동의 키는 받지 않는다', () => {
    expect(bindConflict(DEFAULT_BINDS, 'endTurn', 'Enter')).toBe('reserved');
    expect(bindConflict(DEFAULT_BINDS, 'endTurn', 'Escape')).toBe('reserved');
    expect(bindConflict(DEFAULT_BINDS, 'endTurn', '3')).toBe('reserved');
    expect(bindConflict(DEFAULT_BINDS, 'endTurn', 'R')).toBe('reset');
    expect(bindConflict(DEFAULT_BINDS, 'endTurn', 'q')).toBeNull();
  });
  it('망가진 저장(겹침 · 고정 키 · 모르는 행동)은 버리고 기본을 쓴다 — 확인 · 뒤로 · 방향은 늘 그대로', () => {
    expect(cleanBinds({ endTurn: 'r' })).toEqual(DEFAULT_BINDS);
    expect(cleanBinds({ endTurn: 'Enter', wild: 'x' } as Record<string, string>)).toEqual(DEFAULT_BINDS);
    expect(cleanBinds({ endTurn: 'r', reset: 'e' })).toEqual({ ...DEFAULT_BINDS, endTurn: 'r', reset: 'e' });
    setKeyBinds({ endTurn: 'Enter' });
    expect(keyAction({ key: 'Enter' })).toEqual({ t: 'confirm' });
    expect(keyAction({ key: 'Escape' })).toEqual({ t: 'back' });
    setKeyBinds({});
  });
});
