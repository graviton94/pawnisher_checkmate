/**
 * PC 키보드 · 게임패드를 화면에 잇는다 (D-531). 행동표 · 흘리기는 keymap.ts.
 */
import './keys.css';
import { dismissWin } from './uikit';
import { PAD_MAP, dispatch, keyAction, nearest, stickDir, type InputEnv } from './keymap';

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

/** 화면용 InputEnv — cancel은 대국(main.ts)이 준다 */
const domEnv = (cancel: () => boolean): InputEnv => {
  const app = (): HTMLElement | null => document.getElementById('app');
  return {
    dismiss: () => {
      if (dismissWin()) return true;
      // 고르기 · 배치 화면(.scr-*)처럼 .win 밖의 「닫는다 · 그만둔다」 단추도 맨 위 층이면 누른다 (대국 판은 빼고)
      const layer = topLayer();
      if (!layer || layer === app()) return false;
      const back = buttons(layer).find((b) => b.matches('[data-x], [data-back], [data-no], [data-close]'));
      return back ? (back.click(), true) : false;
    },
    inBattle: () => {
      const top = topLayer();
      return !!top && top === app() && !document.body.classList.contains('between') && !app()!.inert;
    },
    cancel,
    press: () => {
      const layer = topLayer();
      const list = buttons(layer);
      const at = document.activeElement as HTMLElement | null;
      if (at && list.includes(at)) return pressEl(at), true;
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
      if (document.body.classList.contains('kb-nav')) el.focus({ preventScroll: true });
      pressEl(el);
      return true;
    },
  };
};

/** 글을 치는 칸에서는 키를 가로채지 않는다 */
const typing = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * 키보드 · 패드 켜기 (main.ts가 한 번 부른다). cancel = 대국 선택 내려놓기.
 * Enter · Space가 초점 단추에 있으면 브라우저 기본 동작(click)에 맡겨 두 번 눌리지 않게 한다.
 */
export const installInput = (cancel: () => boolean): void => {
  const env = domEnv(cancel);
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
  window.addEventListener('pointerdown', () => document.body.classList.remove('kb-nav'), { capture: true, passive: true });

  // 게임패드: 연결되면 rAF로 단추 눌림(내려간 순간)만 읽는다
  if (typeof navigator.getGamepads !== 'function') return;
  let held = new Set<string>();
  let polling = false;
  let stickAt = 0;
  const poll = (): void => {
    const pads = [...navigator.getGamepads()].filter((p): p is Gamepad => !!p && p.connected);
    if (!pads.length) return void (polling = false);
    const now = new Set<string>();
    for (const p of pads) {
      p.buttons.forEach((b, i) => {
        if (!b.pressed || !PAD_MAP[i]) return;
        const id = `${p.index}:${i}`;
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
        env.move(d);
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
