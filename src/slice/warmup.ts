/**
 * 워밍업 로딩 (D-239, 사용자: 「첫 로딩에 죄다 불러오면서 버벅인다 — 워밍업 로딩을 넣어라」).
 * 타이틀을 보이기 전에 그림(public · 묶음 안 HUD 부품)과 갈무리 글꼴을 미리 받아 풀어(decode) 둔다.
 * 그동안 부팅 화면의 황동 막대가 계단으로 찬다. 오래 걸리면(상한) 그냥 넘어간다 — 그림은 쓸 때 다시 받는다.
 *
 * 세 묶음 (D-531 → 코드 리뷰 1): 타이틀 전에는 「타이틀 묶음」(글꼴 + 로고 · 로딩 막대 · 타이틀 바탕)만 기다린다 (상한 3초).
 * 「판 묶음」(기물 · 판 칸 · UI · 묶음 안 HUD 부품 + 프롤로그 · 1막 장면)은 타이틀이 뜬 직후부터 뒤에서 받는다 —
 * 타이틀 · 프롤로그를 보는 동안 다 받아 판에서 그림이 늦게 튀어나오지 않게. 나머지 장면(사건 · 보스 · 엔딩 · 승급 …)은
 * 그 뒤 쉬는 틈(requestIdleCallback)에 두 장씩 천천히 받는다.
 */
import { PRELOAD } from '../data/preload-list';
import { PRELOAD_BUNDLED } from '../data/preload-bundled';

/** 묶음 안 큰 그림 (CSS가 쓰는 HUD 부품 등) — 작은 것은 CSS 안에 base64로 이미 들어 있다 (코드 리뷰 8: 예전 glob은 JS에도 한 벌 더 넣었다) */
const BUNDLED = PRELOAD_BUNDLED;

const FONTS = ['12px Galmuri11', '700 12px Galmuri11', '24px Galmuri11', '700 24px Galmuri11', '15px Galmuri14', '30px Galmuri14', '60px Galmuri14'];

/** 타이틀 화면이 쓰는 그림 (로고 · 문장 조각 · 로딩 톱니 · 막대 · 타이틀 바탕) — 이것만 타이틀 전에 기다린다 */
const TITLE = /^(ui\/title-|ui\/hud\/load-|scenes\/prologue-00\.)/;
/** 타이틀 · 1막까지 쓰는 장면 그림 (프롤로그 · 1막 표지 · 사건 · 상점 바탕) */
const FIRST_SCENES = /^scenes\/(prologue-|act-1\.|bg-|departure-|shipping-|casting-floor)/;

/**
 * public 그림 목록을 「타이틀 전」 · 「판」 · 「나중」으로 나눈다. 기물 · 칸 · UI · 아이콘은 판 묶음, 안내서 그림(guide/)은 나중.
 * 나중 묶음은 막 순서대로 (act-2 → act-3 → 그 밖) — 쉬는 틈에 앞 막 것부터 받는다.
 */
export const splitPreload = (list: readonly string[]): { title: string[]; first: string[]; later: string[] } => {
  const title: string[] = [];
  const first: string[] = [];
  const later: string[] = [];
  for (const p of list) {
    if (TITLE.test(p)) title.push(p);
    else ((p.startsWith('scenes/') && !FIRST_SCENES.test(p)) || p.startsWith('guide/') ? later : first).push(p);
  }
  const rank = (p: string): number => (p.startsWith('guide/') ? 10 : Number(/^scenes\/act-(\d)\./.exec(p)?.[1] ?? 9));
  later.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return { title, first, later };
};

/** 그림 하나를 받아 풀어 둔다 (실패해도 넘어간다) */
const loadImg = (src: string): Promise<void> =>
  new Promise((done) => {
    const im = new Image();
    im.onload = () => void (im.decode?.() ?? Promise.resolve()).catch(() => undefined).then(() => done());
    im.onerror = () => done();
    im.src = src;
  });

const abs = (p: string): string => new URL(p, location.href).href;

/** 쉬는 틈 기다리기 (requestIdleCallback이 없으면 짧은 타이머) */
const idle = (): Promise<void> =>
  new Promise((r) => {
    const ric = (window as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => r(), { timeout: 2000 });
    else window.setTimeout(r, 200);
  });

/** 나중 묶음을 쉬는 틈마다 두 장씩 받는다 (대국 · 연출을 막지 않게) */
const warmLater = async (urls: string[]): Promise<void> => {
  for (let i = 0; i < urls.length; i += 2) {
    await idle();
    await Promise.all(urls.slice(i, i + 2).map(loadImg));
  }
};

/** 그림 묶음을 n장씩 나란히 받는다 (폰 메모리 · 디코딩이 한꺼번에 몰리지 않게) */
const pool = (urls: string[], n: number, tick: () => void = () => undefined): Promise<unknown> => {
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < urls.length) {
      await loadImg(urls[i++]);
      tick();
    }
  };
  return Promise.all(Array.from({ length: n }, worker));
};

/**
 * 미리 부르기: 타이틀 묶음 진행률(0~1)을 알린다. 상한 ms가 지나면 끝난 것으로 (그림은 쓸 때 다시 받는다).
 * `heavy`(판 Phaser 읽기 · 부팅 · 판 그림 — D-593)도 막대 칸으로 세고 함께 기다린다: 메인 스레드를 오래 막는 일은
 * 부팅 화면(톱니 = 합성기 애니메이션이라 막혀도 돈다) 뒤에서 끝내고, 타이틀 베기 연출 · 메뉴 펼침 동안에는 하지 않는다.
 * 무거운 일의 상한은 heavyLimit — 느린 기기에서 그보다 길면 타이틀을 먼저 연다(판은 뒤에서 마저 선다).
 * 끝나면 판 묶음 → 나중 묶음을 뒤에서 받는다.
 */
export const warmup = async (onProgress: (k: number) => void, limit = 3000, heavy: Promise<unknown>[] = [], heavyLimit = 9000): Promise<void> => {
  const { title, first, later } = splitPreload(PRELOAD);
  const urls = title.map(abs);
  const total = urls.length + 1 + heavy.length;
  let n = 0;
  const tick = () => onProgress(Math.min(1, ++n / total));
  const fonts = Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => undefined))).then(tick);
  const all = Promise.all([fonts, pool(urls, 6, tick)]);
  const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
  await Promise.race([all, wait(limit)]);
  if (heavy.length) await Promise.race([Promise.all(heavy.map((h) => h.catch(() => undefined).then(tick))), wait(heavyLimit)]);
  // 타이틀이 뜨면 판 묶음(기물 · 칸 · UI)을 넷씩, 그다음 나머지를 쉬는 틈에
  void all.then(() => pool([...BUNDLED, ...first.map(abs)], 4)).then(() => warmLater(later.map(abs)));
  // 두 화면 쉼 — 레이아웃이 다 그려진 뒤에 타이틀을 연다
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
