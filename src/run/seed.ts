/**
 * 시드 코드 (D-099): 출하 시드를 6자리 영숫자로 보여 주고 입력받는다 — 같은 시드 = 같은 지도·군단·보상·돌발.
 * (대국 결과는 내 수에 따라 달라진다. 같은 수를 두면 같은 결과)
 */
const MAX = 36 ** 6;

/** 시드 → 코드 (예: 4F2K9Q) */
export const seedCode = (seed: number): string => (((seed % MAX) + MAX) % MAX).toString(36).toUpperCase().padStart(6, '0');

/** 코드 → 시드. 영숫자 1~6자가 아니면 null */
export const parseSeed = (code: string): number | null => {
  const c = code.trim().toLowerCase();
  if (!/^[0-9a-z]{1,6}$/.test(c)) return null;
  const n = parseInt(c, 36);
  return n > 0 ? n : null;
};

/** 새 출하 시드 (시계 기준) */
export const freshSeed = (): number => (Date.now() % (MAX - 1)) + 1;
