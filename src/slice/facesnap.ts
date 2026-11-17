/**
 * 얼굴 도트 = 기기 픽셀 정수 (D-552, 격자 감사 2026-11-17).
 * 대사 띠 · 말풍선 · 컷신 명패 · 분대 현황판의 얼굴(56 · 60 · 64칸)은 초상 홈(장치 도트 15 · 16 · 43칸 …)에 `object-fit: cover`로 들어가
 * 얼굴 도트 하나가 기기 픽셀 1.3~5.3개로 고르지 않게 찍혔다. 홈 크기는 액자 그림의 홈이라 바꿀 수 없으므로,
 * 얼굴을 「홈을 덮는 가장 작은 정수 k」(기기 픽셀 k개 = 얼굴 도트 하나)로 키우고 CSS가 정한 초점(object-position)에 맞춰
 * 기기 픽셀 정수 자리에서 잘라 보인다 — 늘이지 않는다(D-386). 그림은 img의 배경으로 그리고 img 내용은 비킨다.
 * UI는 게임 상태를 바꾸지 않는다(그림 크기만).
 */
const SEL = '.dl-face > img, .talk-face > img, .cw-face > img:not(.piece-img), img.mr-face, .frame-portrait > img:not(.fs-plate):not(.piece-img)';

const seen = new WeakSet<HTMLImageElement>();
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver((es) => es.forEach((e) => fit(e.target as HTMLImageElement))) : null;

/** CSS object-position(퍼센트 · 키워드) → 0~1 두 값 */
const focusOf = (s: string): [number, number] => {
  const kw: Record<string, number> = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
  const v = s.trim().split(/\s+/).map((t) => (t in kw ? kw[t] : t.endsWith('%') ? parseFloat(t) / 100 : 0.5));
  return [v[0] ?? 0.5, v[1] ?? 0.5];
};

/** 한 얼굴을 정수 배율로 맞춘다 (홈 크기가 바뀌면 ResizeObserver가 다시 부른다) */
export function fit(img: HTMLImageElement): void {
  if (!img.isConnected) return;
  if (!img.complete || !img.naturalWidth) {
    img.addEventListener('load', () => fit(img), { once: true });
    return;
  }
  if (!img.dataset.fsFocus) {
    img.style.objectPosition = '';
    img.dataset.fsFocus = getComputedStyle(img).objectPosition || '50% 30%';
  }
  const w = img.clientWidth;
  const h = img.clientHeight;
  if (!w || !h) return;
  const z = Number(document.documentElement.dataset.zoom || 1) || 1;
  const r = (window.devicePixelRatio || 1) * z; // img 안 CSS px 하나 = 기기 픽셀 r개
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const bw = w * r;
  const bh = h * r;
  const k = Math.max(1, Math.ceil(Math.max(bw / nw, bh / nh) - 0.01));
  const [fx, fy] = focusOf(img.dataset.fsFocus);
  const ox = Math.round((bw - nw * k) * fx);
  const oy = Math.round((bh - nh * k) * fy);
  const s = img.style;
  s.objectFit = 'none';
  s.objectPosition = '-99999px -99999px';
  s.backgroundImage = `url("${img.currentSrc || img.src}")`;
  s.backgroundRepeat = 'no-repeat';
  s.backgroundSize = `${(nw * k) / r}px ${(nh * k) / r}px`;
  s.backgroundPosition = `${ox / r}px ${oy / r}px`;
  img.dataset.fsK = String(k);
}

const scan = (root: ParentNode): void => {
  root.querySelectorAll<HTMLImageElement>(SEL).forEach((img) => {
    if (seen.has(img)) return;
    seen.add(img);
    if (ro) ro.observe(img);
    else fit(img);
  });
};

if (typeof document !== 'undefined' && typeof MutationObserver === 'function') {
  const start = (): void => {
    scan(document);
    new MutationObserver((ms) => {
      for (const m of ms) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLImageElement && n.matches(SEL)) scan(n.parentElement ?? document);
          else if (n instanceof Element) scan(n);
        });
        if (m.type === 'attributes' && m.target instanceof HTMLImageElement && seen.has(m.target)) {
          delete m.target.dataset.fsFocus;
          fit(m.target);
        }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    window.addEventListener('resize', () => document.querySelectorAll<HTMLImageElement>(SEL).forEach(fit));
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
