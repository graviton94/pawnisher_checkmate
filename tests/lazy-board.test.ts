import { describe, expect, it } from 'vitest';
import { hostCenter, lazyBoard, sceneLive } from '../src/view/lazyBoard';

const host = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 200 }) } as unknown as HTMLElement;

describe('늦게 서는 판 (lazyBoard) — 판이 서기 전 screenOf', () => {
  it('판 자리 가운데를 어림한다', () => {
    expect(hostCenter(host)).toEqual({ x: 160, y: 120 });
  });

  it('불러오기 전 프록시의 screenOf는 던지지 않고 판 가운데를 준다', () => {
    const { board } = lazyBoard(host, { tap: () => {}, hover: () => {}, longPress: () => {}, longPressEnd: () => {} } as never, () => {});
    expect(board.screenOf({ x: 3, y: 4 })).toEqual({ x: 160, y: 120 });
  });

  // 회귀 (sweep battle/channels, 부하 915×412): BoardRenderer는 만들어졌지만 Phaser 장면이 아직 첫 render 전이면
  // state가 없어 screenOf가 TypeError(reading 'height')로 터졌다 — 이 때는 장면이 서지 않은 것으로 본다
  it('장면이 부팅 · 첫 render 전이면 서지 않은 것으로 본다', () => {
    expect(sceneLive({ tile: 48 })).toBe(false);
    expect(sceneLive({ tile: 48, cameras: { main: {} } })).toBe(false);
    expect(sceneLive({ tile: 48, state: { height: 8 } })).toBe(false);
    expect(sceneLive({ tile: 48, state: { height: 8 }, cameras: { main: {} } })).toBe(true);
  });
});
