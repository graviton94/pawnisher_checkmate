import { describe, expect, it } from 'vitest';
import mainSrc from '../src/slice/main.ts?raw';
import { freshPanel, lockPanel, panelLocked, unlockPanel, withPanelLock, type Lockable } from '../src/slice/panel-lock';

/** classList만 흉내 낸 가짜 창 */
const fake = (): Lockable => {
  const set = new Set<string>();
  return { classList: { add: (c) => void set.add(c), remove: (c) => void set.delete(c), contains: (c) => set.has(c) } };
};

describe('창 잠금 (D-597 사건 떠나기 소프트락)', () => {
  it('사건에서 떠나며 잠근 창도 새 창을 열면 풀린다', () => {
    const panel = fake();
    lockPanel(panel); // 「무시하고 떠난다」 — 작별 대사 동안 잠금
    expect(panelLocked(panel)).toBe(true);
    freshPanel(panel); // 다음 칸(부품 상자 · 영입 · 전리품 · 작업대 · 고물상)이 같은 창을 연다
    expect(panelLocked(panel)).toBe(false);
  });

  it('잠근 채 하던 일이 실패해도 잠금이 남지 않는다', async () => {
    const panel = fake();
    await expect(withPanelLock(panel, () => { throw new Error('대사 실패'); })).rejects.toThrow();
    expect(panelLocked(panel)).toBe(false);
    await withPanelLock(panel, () => expect(panelLocked(panel)).toBe(true));
    expect(panelLocked(panel)).toBe(false);
    unlockPanel(panel);
    expect(panelLocked(panel)).toBe(false);
  });

  it('본편 코드는 잠금을 이 모듈로만 걸고, 창을 열고 닫을 때 반드시 푼다', () => {
    const src = mainSrc;
    // 맨 classList로 「locked」를 걸면 푸는 길을 빠뜨리기 쉽다
    expect(src).not.toMatch(/classList\.(add|remove|toggle)\([^)]*'locked'/);
    const open = src.slice(src.indexOf('const openOverlay ='), src.indexOf('const fitLines ='));
    expect(open).toMatch(/freshPanel\(panel\)/);
    const close = src.slice(src.indexOf('const closeOverlay ='), src.indexOf('/** 쓰러진 킹의 서술'));
    expect(close).toMatch(/freshPanel\(/);
    // 사건 떠나기: 작별 대사가 끝나든 실패하든 잠금을 풀고 다음으로
    const leave = src.slice(src.indexOf("leaveBtn?.addEventListener('click'"), src.indexOf('const purseHtml'));
    expect(leave).toMatch(/unlockPanel\(el\)/);
    expect(leave).toMatch(/\.then\(go, go\)/);
  });
});
