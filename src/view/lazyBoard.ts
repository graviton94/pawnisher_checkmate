/**
 * 판(BoardRenderer · Phaser)을 처음 쓸 때 늦게 불러온다 (코드 리뷰 6): Phaser(약 1.1 MB)를 타이틀 전에 읽지 않게.
 * 돌려주는 물건은 BoardRenderer와 같은 모양이다 — 불러오기 전에 부른 함수는 차례대로 쌓았다가 판이 서면 그대로 부르고,
 * Promise를 돌려주는 함수(연출)는 그 Promise를 기다린다. 값을 바로 돌려줘야 하는 screenOf만 판 자리 가운데로 어림한다.
 * 불러오기는 start()가 열어 준 뒤에 시작한다 (본편: 타이틀이 뜬 직후 — 타이틀을 보는 동안 판 그림을 받는다).
 */
import type { BoardInput, BoardRenderer } from './BoardRenderer';

export interface LazyBoard {
  /** 판 (불러오기 전에도 부를 수 있다) */
  board: BoardRenderer;
  /** 불러오기를 연다 (여러 번 불러도 한 번) */
  start: () => Promise<BoardRenderer>;
}

/** 판 자리 가운데 (CSS px) — 판 장면이 아직 서지 않아 칸 위치를 모를 때 연출 · 엿보기가 겨눌 곳 */
export const hostCenter = (host: { getBoundingClientRect: () => { left: number; top: number; width: number; height: number } }): { x: number; y: number } => {
  const r = host.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/**
 * 판 장면이 칸 → 화면 계산을 할 수 있나: Phaser가 장면을 부팅했고(카메라) 첫 render가 판 상태 · 칸 크기를 넣은 뒤.
 * lazyBoard는 BoardRenderer를 만들자마자 넘기므로, 그 사이(부하가 걸린 기기에선 수백 ms)에 부른 screenOf는 이것으로 막는다.
 */
export const sceneLive = (sc: { state?: { height?: number } | null; tile?: number; cameras?: { main?: unknown } | null }): boolean =>
  !!(sc.state && typeof sc.state.height === 'number' && sc.tile && sc.cameras?.main);

/** 판을 늦게 만든다 — host · 입력 · 알림은 BoardRenderer 생성자와 같다 */
export const lazyBoard = (host: HTMLElement, input: BoardInput, announce: (text: string) => void): LazyBoard => {
  let real: BoardRenderer | null = null;
  let open!: () => void;
  const gate = new Promise<void>((r) => (open = r));
  const ready: Promise<BoardRenderer> = gate
    .then(() => import('./BoardRenderer'))
    .then((m) => (real = new m.BoardRenderer(host, input, announce)));
  const start = (): Promise<BoardRenderer> => {
    open();
    return ready;
  };
  const board = new Proxy({} as BoardRenderer, {
    get(_t, key) {
      if (real) {
        const v = (real as unknown as Record<PropertyKey, unknown>)[key];
        return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(real) : v;
      }
      if (key === 'then') return undefined;
      if (key === 'screenOf') {
        // 판이 아직 없으면 판 자리 가운데 (연출 · 엿보기가 겨눌 곳)
        return () => hostCenter(host);
      }
      // 판이 서면 부른 순서대로 부른다 (같은 Promise에 단 then은 단 순서대로 돈다)
      return (...a: unknown[]) => ready.then((r) => (r as unknown as Record<PropertyKey, (...b: unknown[]) => unknown>)[key as string](...a));
    },
  });
  return { board, start };
};
