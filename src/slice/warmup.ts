/**
 * 워밍업 로딩 (D-239, 사용자: 「첫 로딩에 죄다 불러오면서 버벅인다 — 워밍업 로딩을 넣어라」).
 * 타이틀을 보이기 전에 그림(public · 묶음 안 HUD 부품)과 갈무리 글꼴을 미리 받아 풀어(decode) 둔다.
 * 그동안 부팅 화면의 황동 막대가 계단으로 찬다. 오래 걸리면(상한) 그냥 넘어간다 — 그림은 쓸 때 다시 받는다.
 *
 * 두 묶음 (D-531): 타이틀 전에는 「첫 묶음」(기물 · 판 칸 · UI 전부 + 프롤로그 · 1막 장면)만 기다린다 —
 * 판에서 그림이 늦게 튀어나오지 않게 기물 · 칸 · UI는 꼭 여기. 나머지 장면(사건 · 보스 · 엔딩 · 승급 …)은
 * 타이틀이 뜬 뒤 쉬는 틈(requestIdleCallback)에 두 장씩 천천히 받는다.
 */
import { PRELOAD } from '../data/preload-list';

/** 묶음 안 그림 (CSS가 쓰는 HUD 부품 등) — 빌드가 주소를 붙인다 */
const BUNDLED = Object.values(import.meta.glob('../assets/**/*.png', { eager: true, query: '?url', import: 'default' })) as string[];

const FONTS = ['12px Galmuri11', '700 12px Galmuri11', '24px Galmuri11', '700 24px Galmuri11', '15px Galmuri14', '30px Galmuri14', '60px Galmuri14'];

/** 타이틀 · 1막까지 쓰는 장면 그림 (프롤로그 · 1막 표지 · 첫 대국 들어가기 · 사건 · 상점 바탕) */
const FIRST_SCENES = /^scenes\/(prologue-|act-[01]\.|entry-|bg-|departure-|shipping-|casting-floor)/;

/**
 * public 그림 목록을 「타이틀 전」 · 「나중」으로 나눈다. 기물 · 칸 · UI · 아이콘은 모두 첫 묶음, 안내서 그림(guide/)은 나중.
 * 나중 묶음은 막 순서대로 (act-2 → act-3 → 그 밖) — 쉬는 틈에 앞 막 것부터 받는다.
 */
export const splitPreload = (list: readonly string[]): { first: string[]; later: string[] } => {
  const first: string[] = [];
  const later: string[] = [];
  for (const p of list) ((p.startsWith('scenes/') && !FIRST_SCENES.test(p)) || p.startsWith('guide/') ? later : first).push(p);
  const rank = (p: string): number => (p.startsWith('guide/') ? 10 : Number(/^scenes\/act-(\d)\./.exec(p)?.[1] ?? 9));
  later.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return { first, later };
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

/** 미리 부르기: 첫 묶음 진행률(0~1)을 알린다. 상한 ms가 지나면 끝난 것으로. 나머지는 뒤에서 천천히 */
export const warmup = async (onProgress: (k: number) => void, limit = 9000): Promise<void> => {
  const { first, later } = splitPreload(PRELOAD);
  const urls = [...BUNDLED, ...first.map(abs)];
  const total = urls.length + 1;
  let n = 0;
  const tick = () => onProgress(Math.min(1, ++n / total));
  const fonts = Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => undefined))).then(tick);
  // 동시에 여섯 장씩 (폰 메모리 · 디코딩이 한꺼번에 몰리지 않게)
  let i = 0;
  const worker = async (): Promise<void> => {
    while (i < urls.length) {
      const u = urls[i++];
      await loadImg(u);
      tick();
    }
  };
  const all = Promise.all([fonts, ...Array.from({ length: 6 }, worker)]);
  await Promise.race([all, new Promise((r) => window.setTimeout(r, limit))]);
  // 첫 묶음이 끝나면(상한에 걸렸어도 그 뒤에) 나머지를 쉬는 틈에
  void all.then(() => warmLater(later.map(abs)));
  // 두 화면 쉼 — 레이아웃 · 판 캔버스가 다 그려진 뒤에 타이틀을 연다
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
