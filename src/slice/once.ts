/**
 * 화면 하나의 확정은 한 번만 (2026-11-14 기록-1 · D-488): 고르기 화면(보상 · 영입 · 부품 · 키트)의 고름 · 건너뜀은
 * 그 화면 뿌리를 열쇠로 한 번만 받는다. 막 장부 아래에 남은 창을 다시 눌러도 같은 카드가 두 번 들어가거나 노드를 건너뛰지 않는다.
 * 화면이 새로 그려지면(새 뿌리) 다시 받을 수 있다.
 */
export const claimOnce = (): ((key: object | null | undefined) => boolean) => {
  const seen = new WeakSet<object>();
  return (key) => {
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };
};
