/**
 * 시드 코드 (D-099 · D-100): 출하 시드를 「XXXXX-XXXXX」 10자리로 보여 주고 입력받는다.
 * 같은 시드 = 같은 시작 세트 후보 · 지도 · 군단 · 보상 · 돌발 (대국은 같은 수를 두면 같은 결과).
 *
 * 조작 방지 (사용자: 아무 글자나 넣어 원하는 판을 고르지 못하게):
 *  - 코드 = [시드 30비트 | 검증값 20비트]를 비밀 키 Feistel 4라운드로 섞은 50비트 → Crockford base32 10자.
 *  - 검증값 = 키를 넣은 해시(시드)의 20비트 → 지어낸 코드가 통과할 확률 약 100만분의 1.
 *  - 섞기 때문에 시드 1·2·3이 비슷한 코드가 되지 않는다 (코드만 보고 다음 시드를 짐작할 수 없다).
 * 한계: 키가 클라이언트에 있으므로 코드를 뜯어보면 풀 수 있다. 순위표·도전 시드처럼 진짜 막아야 하면 서버 서명으로 바꾼다.
 */

const SEED_BITS = 30;
const CHECK_BITS = 20;
const HALF = 25; // (30 + 20) / 2
const HALF_MASK = (1 << HALF) - 1;
const SEED_MAX = 2 ** SEED_BITS;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford: I·L·O·U 없음 (헷갈림 방지)
const KEY = [0x5bd1e995, 0x27d4eb2f, 0x165667b1, 0x9e3779b1, 0x85ebca6b];

/** 32비트 해시 (murmur3 마무리) */
const mix = (x: number): number => {
  let h = x >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};

const checkOf = (seed: number): number => mix(seed ^ KEY[4]) & ((1 << CHECK_BITS) - 1);
const round = (half: number, i: number): number => mix(half ^ KEY[i]) & HALF_MASK;

/** 시드 → 「XXXXX-XXXXX」 */
export const seedCode = (seed: number): string => {
  const s = ((Math.floor(seed) % SEED_MAX) + SEED_MAX) % SEED_MAX;
  // 50비트 = 시드 30 | 검증 20 → 왼쪽 25 · 오른쪽 25
  const check = checkOf(s);
  let left = Math.floor(s / 32); // 시드 위 25비트
  let right = ((s & 31) << CHECK_BITS) | check; // 시드 아래 5비트 + 검증 20비트
  for (let i = 0; i < 4; i++) [left, right] = [right, (left ^ round(right, i)) & HALF_MASK];
  const chars = (n: number) => Array.from({ length: 5 }, (_, k) => ALPHABET[(n >>> ((4 - k) * 5)) & 31]).join('');
  return `${chars(left)}-${chars(right)}`;
};

/** 「XXXXX-XXXXX」 → 시드. 형식이 틀리거나 검증값이 안 맞으면 null (대소문자·하이픈·공백 무시, O→0 · I/L→1) */
export const parseSeed = (code: string): number | null => {
  const c = code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (c.length !== 10) return null;
  const vals = [...c].map((ch) => ALPHABET.indexOf(ch));
  if (vals.some((v) => v < 0)) return null;
  const num = (from: number) => vals.slice(from, from + 5).reduce((a, v) => a * 32 + v, 0);
  let left = num(0);
  let right = num(5);
  for (let i = 3; i >= 0; i--) [left, right] = [(right ^ round(left, i)) & HALF_MASK, left];
  const seed = left * 32 + (right >>> CHECK_BITS);
  const check = right & ((1 << CHECK_BITS) - 1);
  return seed > 0 && check === checkOf(seed) ? seed : null;
};

/** 새 출하 시드 (시계 기준, 30비트) */
export const freshSeed = (): number => (Date.now() % (SEED_MAX - 1)) + 1;

/** 오늘의 출하 (D-122): 날짜(기기 현지 날짜)에서 시드 — 같은 날 모두 같은 출하 */
export const todayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dailySeed = (key = todayKey()): number => {
  let h = 2166136261;
  for (const c of `pawnisher-daily-${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return (h % (SEED_MAX - 1)) + 1;
};
