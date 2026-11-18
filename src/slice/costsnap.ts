/**
 * 카드 비용 숫자 = 톱니 구멍 한가운데 (D-571, 사장님 스토어 스크린샷 점검).
 * 명령 카드의 비용 칸(.cf-cost)은 틀 그림의 톱니 구멍(10×10 도트, tools/pixel/cmd_frames.py가 잰 자리)과 같은 상자다.
 * 갈무리11 숫자는 잉크가 글자 상자 위쪽에 붙어 있고(D-558) 숫자마다 폭이 달라(1이 좁다) `place-items: center`로는
 * 위로 뜨고 옆으로 밀렸다. 숫자마다 canvas 잉크 상자를 재서 「잉크 가운데 = 구멍 가운데」가 되게 안쪽 여백을 주고,
 * 화면의 정수 픽셀 자리에 맞춘다 — 카드 크기 · 화면 크기 · 0~9 모두 같은 규칙.
 * UI는 게임 상태를 바꾸지 않는다(글자 자리만).
 */
const SEL = '.cf > .cf-cost';

let ctx: CanvasRenderingContext2D | null = null;
/** 잉크 상자: l · r = 글자 원점에서 잉크 왼쪽 · 오른쪽, up · dn = 기준선 위 · 아래 잉크, asc · desc = 줄 배치용 글꼴 올림 · 내림(블링크는 정수 px로 반올림) */
interface Ink { l: number; r: number; up: number; dn: number; asc: number; desc: number }
const ink = new Map<string, Ink>();

const measure = (font: string, text: string): Ink | null => {
  const key = `${font}|${text}`;
  const hit = ink.get(key);
  if (hit) return hit;
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return null;
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  if (!m.actualBoundingBoxAscent && !m.actualBoundingBoxDescent) return null;
  const box = { l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, up: m.actualBoundingBoxAscent, dn: m.actualBoundingBoxDescent, asc: Math.round(m.fontBoundingBoxAscent), desc: Math.round(m.fontBoundingBoxDescent) };
  ink.set(key, box);
  return box;
};

/**
 * 비용 칸 하나를 맞춘다 (칸 크기가 바뀌면 ResizeObserver, 등장 연출이 끝나면 animationend가 다시 부른다).
 * 크롬은 글자 기준선을 CSS px 정수에, 가로 글자 자리는 기기 픽셀에 찍는다(2026-11-18 실측: 915×412에서 0.25px 기준선이 내려 찍혀 잉크가 1.5 기기 픽셀 위로 떴다) —
 * 그래서 화면 좌표로 「기준선 = CSS px 정수 · 잉크 왼쪽 = 기기 픽셀 정수」 가운데 구멍 가운데에 가장 가까운 자리를 고른다.
 */
export function fit(el: HTMLElement): void {
  if (!el.isConnected) return;
  const cs = getComputedStyle(el);
  const w = parseFloat(cs.width);
  const h = parseFloat(cs.height);
  const text = (el.textContent ?? '').trim();
  if (!w || !h || !text || cs.display === 'none') return;
  const size = parseFloat(cs.fontSize);
  const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if (document.fonts && !document.fonts.check(font, text)) {
    void document.fonts.load(font, text).then(() => fit(el));
    return;
  }
  const m = measure(font, text);
  if (!m) return;
  const z = Number(document.documentElement.dataset.zoom || 1) || 1;
  const r = (window.devicePixelRatio || 1) * z;
  const box = el.getBoundingClientRect();
  // 확대 · 축소 연출(transform) 중이면 화면 좌표가 배치와 달라 — 칸 안 기준으로만 두고 연출이 끝나면 다시 맞춘다
  const still = Math.abs(box.width - w) < 0.05 && Math.abs(box.height - h) < 0.05;
  const left = still ? box.left : 0;
  const top = still ? box.top : 0;
  const lineTop = (size - (m.asc + m.desc)) / 2; // 줄높이 1 — 글자 상자 위 → 줄 위(반 행간, 음수일 수 있다)
  // 가로: 잉크 가운데 = 구멍 가운데, 잉크 왼쪽을 기기 픽셀 정수로
  const inkL = Math.round((left + w / 2 - (m.r - m.l) / 2) * r) / r;
  const x = inkL - left - m.l;
  // 세로: 기준선 = CSS px 정수(확대면 1/z) 가운데 잉크 가운데가 구멍 가운데에 가장 가까운 것
  const base = Math.round((top + h / 2 + (m.up - m.dn) / 2) * z) / z;
  const y = base - m.asc - lineTop - top;
  el.style.padding = `${y}px 0 0 ${x}px`;
  el.dataset.ink = `${Math.round(m.r - m.l)}x${Math.round(m.up + m.dn)}`;
}

const seen = new WeakSet<HTMLElement>();
const ro = typeof ResizeObserver === 'function' ? new ResizeObserver((es) => es.forEach((e) => fit(e.target as HTMLElement))) : null;
const scan = (root: ParentNode): void => {
  root.querySelectorAll<HTMLElement>(SEL).forEach((el) => {
    if (seen.has(el)) return fit(el);
    seen.add(el);
    if (ro) ro.observe(el);
    else fit(el);
  });
};

if (typeof document !== 'undefined' && typeof MutationObserver === 'function') {
  const start = (): void => {
    scan(document);
    new MutationObserver((ms) => {
      for (const m of ms) {
        m.addedNodes.forEach((n) => {
          if (n instanceof HTMLElement && n.matches(SEL)) scan(n.parentElement ?? document);
          else if (n instanceof Element) scan(n);
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', () => document.querySelectorAll<HTMLElement>(SEL).forEach(fit));
    void document.fonts?.ready.then(() => document.querySelectorAll<HTMLElement>(SEL).forEach(fit));
    // 카드 등장 · 들기 연출이 끝나면 화면 자리가 바뀐다 — 그 안의 비용 칸만 다시
    const settle = (e: Event): void => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      (t.closest('.cf') ?? t).querySelectorAll<HTMLElement>(SEL).forEach(fit);
    };
    document.addEventListener('animationend', settle, true);
    document.addEventListener('transitionend', settle, true);
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
}
