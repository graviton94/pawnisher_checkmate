/**
 * PC 키보드 · 게임패드를 화면에 잇는다 (D-531). 행동표 · 흘리기는 keymap.ts.
 */
import './keys.css';
import { closePeek, dismissWin } from './uikit';
import { PAD_HOLD, PAD_HOLD_MS, PAD_MAP, dispatch, keyAction, nearest, stickDir, type Dir, type InputEnv } from './keymap';
import { clampCell, cursorRect, moveCursor, tapCell, type Cell, type CursorBoard, type Rect } from './boardcursor';

/**
 * 판 커서가 대국에 닿는 곳 (D-533) — main.ts가 준다. 탭 · 길게 누르기와 같은 함수만 부른다 (게임 상태를 직접 바꾸지 않는다).
 */
export interface BoardPort {
  /** 지금 판 (없으면 대국 아님) */
  board(): CursorBoard | null;
  /** 지금 갈 수 있는 칸 (카드 · 기물을 고른 뒤) */
  dests(): Cell[];
  /** 커서가 처음 설 칸 (고른 기물 · 없으면 내 킹) */
  home(): Cell;
  /** 칸 한 번 탭 */
  tap(c: Cell): void;
  /** 칸 길게 누르기 (정보 창) */
  info(c: Cell): void;
  /** 판에 커서 테 그리기 (null = 숨김) */
  show(r: Rect | null): void;
  /** 칸 가운데의 화면 좌표 (CSS px) — 손가락이 닿을 자리 */
  screenOf(c: Cell): { x: number; y: number };
}

/**
 * 그 자리를 손가락으로 누르면 판에 닿는가 — 부관 안내(.tut)의 막처럼 판을 덮은 것이 있으면 키도 막힌다 (터치와 같게).
 * 엿보기 · 말풍선처럼 누름이 통과하는 것(pointer-events: none)은 판으로 친다.
 */
const reachesBoard = (x: number, y: number): boolean => {
  const hit = document.elementFromPoint(x, y);
  return !!hit && !!document.getElementById('board')?.contains(hit);
};
/** 부관 안내가 「구멍 안에서 해 보세요」 걸음인가 (그때는 대국 판 키가 구멍 안에서만 산다) */
const tutAct = (): boolean => {
  const t = document.querySelector('.tut');
  return !!t && t.classList.contains('act') && !t.classList.contains('paused');
};

const visible = (el: Element): boolean => el.getClientRects().length > 0 && (el as HTMLElement).checkVisibility?.({ visibilityProperty: true } as CheckVisibilityOptions) !== false;

/** 맨 위 층 = 화면 가운데를 덮은 body 바로 아래 요소 (창 · 장면 · 타이틀 · 대국) */
const topLayer = (): HTMLElement | null => {
  let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2) as HTMLElement | null;
  while (el && el.parentElement && el.parentElement !== document.body) el = el.parentElement;
  return el && el.parentElement === document.body ? el : null;
};

/** 맨 위 층의 누를 수 있는 단추 */
const buttons = (layer: HTMLElement | null): HTMLElement[] =>
  layer ? [...layer.querySelectorAll<HTMLElement>('button:not(:disabled), [role="button"]:not([aria-disabled="true"])')].filter((b) => !b.closest('[inert]') && visible(b)) : [];

const centre = (el: Element): { x: number; y: number } => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** 키보드 · 패드로 움직였다 → 초점 테두리를 보인다 (손가락 · 마우스가 닿으면 걷는다) */
const markNav = (): void => document.body.classList.add('kb-nav');

const focusEl = (el: HTMLElement): void => {
  markNav();
  el.focus({ preventScroll: true });
};

/** 단추를 다시 찾을 열쇠 (id 또는 첫 data-* 속성) — 누른 뒤 화면이 다시 그려져도 초점을 잇는다 */
const keyOf = (el: HTMLElement): string | null => {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const a = [...el.attributes].find((x) => x.name.startsWith('data-'));
  return a ? `[${a.name}="${CSS.escape(a.value)}"]` : null;
};

/** 단추를 누른다 (탭과 같은 click). 다시 그려져 사라졌으면 같은 자리의 새 단추에 초점 */
const pressEl = (el: HTMLElement): void => {
  const key = keyOf(el);
  el.click();
  if (el.isConnected || !key) return;
  const again = document.querySelector<HTMLElement>(key);
  if (again && !again.closest('[inert]') && visible(again)) again.focus({ preventScroll: true });
};

/** 판 커서 상태 (D-533): 초점이 판인가 손패인가 · 커서 칸 */
let boardMode = true;
let cursor: Cell | null = null;
let port: BoardPort | null = null;
let inBattleNow: () => boolean = () => false;
/** 커서 테가 지금 판에 보이나 */
let cursorShown = false;

/** 커서 테를 지금 상태에 맞춘다 — 키 · 패드로 움직이는 중 · 대국 판이 맨 위 · 초점이 판일 때만 보인다 */
export const syncBoardCursor = (): void => {
  if (!port) return;
  const b = port.board();
  const on = !!b && boardMode && document.body.classList.contains('kb-nav') && inBattleNow();
  cursorShown = on;
  if (!on || !b) return port.show(null);
  cursor = clampCell(cursor ?? port.home(), b.w, b.h);
  port.show(cursorRect(cursor, b));
};

const boardEnv = (): NonNullable<InputEnv['board']> => ({
  focused: () => !!port?.board() && boardMode,
  toggle: () => {
    boardMode = !boardMode;
    markNav();
    if (boardMode) (document.activeElement as HTMLElement | null)?.blur?.();
    else {
      // 손패로: 첫 카드(없으면 턴 끝)에 초점
      const first = [...document.querySelectorAll<HTMLElement>('#hand [data-card], #btn-end')].find((el) => visible(el) && !(el as HTMLButtonElement).disabled);
      if (first) focusEl(first);
    }
    syncBoardCursor();
  },
  move: (dir: Dir) => {
    const b = port?.board();
    if (!b || !port) return;
    const was = cursorShown;
    markNav();
    cursor = clampCell(cursor ?? port.home(), b.w, b.h);
    // 커서가 숨어 있었으면 보이기만 한다 (어디 있는지 먼저 보여 준다)
    if (was) cursor = moveCursor(cursor, dir, b);
    syncBoardCursor();
  },
  press: () => {
    const b = port?.board();
    if (!b || !port) return false;
    const was = cursorShown;
    markNav();
    if (!was || !cursor) return syncBoardCursor(), true;
    // 손가락으로 판을 누르면 열린 정보 창이 닫히고 그 탭도 판에 닿는다 — 같게
    document.querySelectorAll<HTMLElement>('.k-peek:not(.pxout)').forEach((el) => closePeek(el));
    const cell = tapCell(cursor, b, port.dests());
    // 판을 덮은 막(부관 안내의 구멍 밖 등) 아래 칸은 손가락처럼 닿지 않는다
    const at = port.screenOf(cell);
    if (!reachesBoard(at.x, at.y)) return true;
    port.tap(cell);
    syncBoardCursor();
    return true;
  },
  info: () => {
    const b = port?.board();
    if (!b || !port) return false;
    markNav();
    cursor = clampCell(cursor ?? port.home(), b.w, b.h);
    syncBoardCursor();
    port.info(tapCell(cursor, b, []));
    return true;
  },
});

/** 화면용 InputEnv — cancel은 대국(main.ts)이 준다 */
const domEnv = (cancel: () => boolean): InputEnv => {
  const app = (): HTMLElement | null => document.getElementById('app');
  return {
    dismiss: () => {
      if (dismissWin()) return true;
      // 판 정보 창(엿보기 · 길게 누르기)은 뒤로로 닫는다 — 터치에서 아무 데나 누르는 것과 같다
      const peeks = [...document.querySelectorAll<HTMLElement>('.k-peek:not(.pxout)')];
      if (peeks.length) return peeks.forEach((el) => closePeek(el)), true;
      // 고르기 · 배치 화면(.scr-*)처럼 .win 밖의 「닫는다 · 그만둔다」 단추도 맨 위 층이면 누른다 (대국 판은 빼고)
      const layer = topLayer();
      if (!layer || layer === app()) return false;
      const back = buttons(layer).find((b) => b.matches('[data-x], [data-back], [data-no], [data-close]'));
      return back ? (back.click(), true) : false;
    },
    inBattle: () => {
      const top = topLayer();
      // 부관 안내의 「해 보세요」 걸음은 대국 판 위 막이라 판 키를 그대로 쓴다 (누름은 구멍 안만 닿는다 — reachesBoard)
      return !!top && (top === app() || (top.classList.contains('tut') && tutAct())) && !document.body.classList.contains('between') && !app()!.inert;
    },
    cancel,
    press: () => {
      const layer = topLayer();
      const list = buttons(layer);
      const at = document.activeElement as HTMLElement | null;
      // 부관 안내의 「눌러서 다음」 걸음: 초점이 건너뛰기에 있지 않으면 말풍선을 누른 것과 같다 (첫 Enter가 건너뛰기에 초점만 주지 않게)
      const tapStep = layer?.classList.contains('tut') ? layer.querySelector<HTMLElement>('.tut-catch:not([hidden])') : null;
      if (tapStep && !(at && list.includes(at))) return tapStep.click(), true;
      if (at && list.includes(at)) {
        // 손패에서 카드를 쥐면 초점이 판으로 간다 (다음은 기물 · 칸을 고를 차례)
        const card = !!port && !!at.closest('#hand');
        pressEl(at);
        if (card && !boardMode) boardEnv().toggle();
        return true;
      }
      if (list.length) return focusEl(list[0]), true;
      // 단추가 없는 장면(컷 · 타이틀 「누르세요」)은 한 번 탭과 같다 — 대국 판은 빼고
      if (layer && layer !== app()) return layer.click(), true;
      return false;
    },
    move: (dir) => {
      const list = buttons(topLayer());
      if (!list.length) return;
      const at = document.activeElement as HTMLElement | null;
      if (!at || !list.includes(at)) return focusEl(list[0]);
      const next = nearest(centre(at), list.filter((b) => b !== at).map((item) => ({ item, ...centre(item) })), dir);
      if (next) focusEl(next);
    },
    click: (target) => {
      const el = typeof target === 'object'
        ? document.querySelector<HTMLElement>(`#hand [data-card="${target.card}"]`)
        : document.getElementById(target === 'end' ? 'btn-end' : target === 'rewind' ? 'btn-rewind' : 'btn-help');
      if (!el || (el as HTMLButtonElement).disabled || !visible(el)) return false;
      // 부관 안내 중에는 막 밖의 단추를 키로도 누를 수 없다 (구멍 안만 — 터치와 같게)
      if (document.querySelector('.tut')) {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 12));
        if (!hit || !el.contains(hit)) return false;
      }
      if (document.body.classList.contains('kb-nav') && !(port && boardMode)) el.focus({ preventScroll: true });
      pressEl(el);
      syncBoardCursor();
      return true;
    },
    board: port ? boardEnv() : undefined,
  };
};

/** 글을 치는 칸에서는 키를 가로채지 않는다 */
const typing = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * 키보드 · 패드 켜기 (main.ts가 한 번 부른다). cancel = 대국 선택 내려놓기.
 * Enter · Space가 초점 단추에 있으면 브라우저 기본 동작(click)에 맡겨 두 번 눌리지 않게 한다.
 */
export const installInput = (cancel: () => boolean, board?: BoardPort): void => {
  port = board ?? null;
  const env = domEnv(cancel);
  inBattleNow = env.inBattle;
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || typing(e.target)) return;
    const a = keyAction(e);
    if (!a) return;
    if (a.t === 'focus' || a.t === 'confirm') markNav();
    if (e.repeat && a.t !== 'focus') return void (a.t === 'confirm' && e.preventDefault());
    // 확인은 브라우저 기본 click 대신 우리가 누른다 (다시 그려진 단추로 초점을 잇게) — Space keyup의 기본 click도 막는다
    if (dispatch(a, env)) {
      e.preventDefault();
      if (a.t === 'confirm' && e.key === ' ') spaceHandled = true;
    }
  });
  let spaceHandled = false;
  window.addEventListener('keyup', (e) => {
    if (e.key === ' ' && spaceHandled) (e.preventDefault(), (spaceHandled = false));
  });
  // 손가락 · 마우스가 닿으면 초점 테와 판 커서를 걷는다 (다음 키에서 같은 자리로 돌아온다)
  window.addEventListener('pointerdown', () => (document.body.classList.remove('kb-nav'), syncBoardCursor()), { capture: true, passive: true });

  // 게임패드: 연결되면 rAF로 단추 눌림(내려간 순간)만 읽는다
  if (typeof navigator.getGamepads !== 'function') return;
  let held = new Set<string>();
  /** 길게 누르기 단추: 누른 시각 (-1 = 긴 행동을 이미 했다 · -2 = 긴 행동이 안 맞아 뗄 때 짧은 행동) */
  const holdAt = new Map<string, number>();
  let polling = false;
  let stickAt = 0;
  const poll = (): void => {
    const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected);
    if (!pads.length) return void (polling = false);
    const now = new Set<string>();
    for (const p of pads) {
      p.buttons.forEach((b, i) => {
        const id = `${p.index}:${i}`;
        // 길게 누르면 다른 행동인 단추 (Y: 짧게 = 선택 취소 · 길게 = 칸 정보) — 뗄 때 짧은 행동, 오래 쥐면 긴 행동 한 번
        if (PAD_HOLD[i]) {
          const t0 = holdAt.get(id);
          if (b.pressed) {
            now.add(id);
            if (t0 === undefined) holdAt.set(id, performance.now());
            else if (t0 >= 0 && performance.now() - t0 >= PAD_HOLD_MS) {
              markNav();
              holdAt.set(id, dispatch(PAD_HOLD[i], env) ? -1 : -2);
            }
          } else if (t0 !== undefined) {
            holdAt.delete(id);
            if (t0 !== -1) (markNav(), dispatch(PAD_MAP[i], env));
          }
          return;
        }
        if (!b.pressed || !PAD_MAP[i]) return;
        now.add(id);
        if (!held.has(id)) {
          markNav();
          dispatch(PAD_MAP[i], env);
        }
      });
      const d = stickDir(p.axes[0] ?? 0, p.axes[1] ?? 0);
      // 스틱은 기울인 채면 0.25초마다 한 칸
      if (d && performance.now() - stickAt > 250) {
        stickAt = performance.now();
        markNav();
        dispatch({ t: 'focus', dir: d }, env);
      } else if (!d) stickAt = 0;
    }
    held = now;
    requestAnimationFrame(poll);
  };
  const start = (): void => {
    if (polling) return;
    polling = true;
    requestAnimationFrame(poll);
  };
  window.addEventListener('gamepadconnected', start);
  if ([...navigator.getGamepads()].some((p) => p?.connected)) start();
};

/** 새 대국: 커서를 고른 기물 · 내 킹 자리로 되돌린다 (판이 바뀌었다) */
export const resetBoardCursor = (): void => {
  cursor = null;
  boardMode = true;
  syncBoardCursor();
};
/** 지금 보이는 판 커서 칸 (검수용 · 숨었으면 null) */
export const boardCursorAt = (): Cell | null => (cursorShown && cursor ? { ...cursor } : null);
