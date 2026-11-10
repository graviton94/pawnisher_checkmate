/**
 * 워밍업 로딩 (D-239, 사용자: 「첫 로딩에 죄다 불러오면서 버벅인다 — 워밍업 로딩을 넣어라」).
 * 타이틀을 보이기 전에 그림(public · 묶음 안 HUD 부품)과 갈무리 글꼴을 미리 받아 풀어(decode) 둔다.
 * 그동안 부팅 화면의 황동 막대가 계단으로 찬다. 오래 걸리면(상한) 그냥 넘어간다 — 그림은 쓸 때 다시 받는다.
 */
import { PRELOAD } from '../data/preload-list';

/** 묶음 안 그림 (CSS가 쓰는 HUD 부품 등) — 빌드가 주소를 붙인다 */
const BUNDLED = Object.values(import.meta.glob('../assets/**/*.png', { eager: true, query: '?url', import: 'default' })) as string[];

const FONTS = ['12px Galmuri11', '700 12px Galmuri11', '24px Galmuri11', '700 24px Galmuri11', '15px Galmuri14', '30px Galmuri14', '60px Galmuri14'];

/** 그림 하나를 받아 풀어 둔다 (실패해도 넘어간다) */
const loadImg = (src: string): Promise<void> =>
  new Promise((done) => {
    const im = new Image();
    im.onload = () => void (im.decode?.() ?? Promise.resolve()).catch(() => undefined).then(() => done());
    im.onerror = () => done();
    im.src = src;
  });

/** 미리 부르기: 진행률(0~1)을 알린다. 상한 ms가 지나면 끝난 것으로 */
export const warmup = async (onProgress: (k: number) => void, limit = 9000): Promise<void> => {
  const urls = [...BUNDLED, ...PRELOAD.map((p) => new URL(p, location.href).href)];
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
  // 두 화면 쉼 — 레이아웃 · 판 캔버스가 다 그려진 뒤에 타이틀을 연다
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
