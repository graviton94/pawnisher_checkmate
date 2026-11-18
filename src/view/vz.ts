/**
 * 웹 PC 정수 확대(D-539 · pxsnap.ts의 루트 CSS zoom) 좌표 맞춤 (D-563).
 * 크롬 표준 zoom에서는 루트에 zoom이 걸리면 innerWidth · getBoundingClientRect · 포인터 좌표 · elementFromPoint가 「보이는 px」(확대 뒤)이고,
 * style.left · width · transform 같은 CSS 길이는 「배치 px」(확대 전)다 — 보이는 px를 그대로 CSS에 쓰면 확대 배수만큼 밀린다
 * (반장 등장이 화면 왼위 4분의 1만 보이고, 연쇄 딱지 · 바크가 레일 밖으로 나갔다).
 * 그래서 확대가 걸린 동안만 이 값들을 배치 px로 돌려주게 덮는다(installZoomGeometry) — 게임 코드 전체가 한 좌표계(배치 px)를 쓴다.
 * 확대가 없는 모바일 · 일렉트론(setZoomFactor는 DPR을 바꿀 뿐)에서는 덮지 않는다. 원래 값은 rawInnerW/H로.
 */
/** 루트 CSS 확대 배수 (웹 PC만 1보다 크다) */
export const uiZoom = (): number => (typeof document === 'undefined' ? 1 : Number(document.documentElement.dataset.zoom || 1) || 1);

/** 보이는 px ÷ 배치 px (덮기가 걸렸을 때만 1보다 크다) */
let K = 1;
const desc = (o: object, k: string): PropertyDescriptor | undefined => {
  for (let p: object | null = o; p; p = Object.getPrototypeOf(p)) { const d = Object.getOwnPropertyDescriptor(p, k); if (d) return d; }
  return undefined;
};
const winW = typeof window === 'undefined' ? undefined : desc(window, 'innerWidth');
const winH = typeof window === 'undefined' ? undefined : desc(window, 'innerHeight');
/** 덮기 전 창 크기 (보이는 px) — 확대 배수를 정하는 pxsnap.ts만 쓴다 */
export const rawInnerW = (): number => (winW?.get ? (winW.get.call(window) as number) : window.innerWidth);
export const rawInnerH = (): number => (winH?.get ? (winH.get.call(window) as number) : window.innerHeight);

let installed = false;
const scaleRect = (r: DOMRect): DOMRect => (K === 1 ? r : new DOMRect(r.x / K, r.y / K, r.width / K, r.height / K));
const scaleList = (l: DOMRectList): DOMRectList => (K === 1 ? l : (Array.from(l, scaleRect) as unknown as DOMRectList));
const install = (): void => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const P of [Element.prototype, Range.prototype] as { getBoundingClientRect(): DOMRect; getClientRects(): DOMRectList }[]) {
    const gb = P.getBoundingClientRect, gc = P.getClientRects;
    P.getBoundingClientRect = function (this: never) { return scaleRect(gb.call(this)); };
    P.getClientRects = function (this: never) { return scaleList(gc.call(this)); };
  }
  for (const [k, d] of [['innerWidth', winW], ['innerHeight', winH]] as const)
    if (d?.get) Object.defineProperty(window, k, { configurable: true, enumerable: true, get: () => (d.get!.call(window) as number) / K });
  for (const k of ['clientX', 'clientY', 'pageX', 'pageY', 'x', 'y', 'offsetX', 'offsetY', 'screenX', 'screenY']) {
    const d = desc(MouseEvent.prototype, k);
    if (d?.get) Object.defineProperty(MouseEvent.prototype, k, { configurable: true, enumerable: d.enumerable, get(this: MouseEvent) { return (d.get!.call(this) as number) / K; } });
  }
  const efp = Document.prototype.elementFromPoint, efps = Document.prototype.elementsFromPoint;
  Document.prototype.elementFromPoint = function (this: Document, x: number, y: number) { return efp.call(this, x * K, y * K); };
  Document.prototype.elementsFromPoint = function (this: Document, x: number, y: number) { return efps.call(this, x * K, y * K); };
};
/**
 * 루트 zoom을 바꾼 뒤 부른다 (pxsnap.ts): 이 브라우저가 확대 뒤 값을 주는지 실제로 재서(100px 상자) 그 배수로 덮는다.
 * 확대 전 값을 그대로 주는 브라우저(옛 비표준 zoom)면 배수 1 — 아무것도 바꾸지 않는다.
 */
export const installZoomGeometry = (): void => {
  if (typeof document === 'undefined' || !document.body) return;
  K = 1;
  if (uiZoom() === 1) return;
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:100px;height:1px;visibility:hidden;pointer-events:none';
  document.body.appendChild(d);
  const k = d.getBoundingClientRect().width / 100;
  d.remove();
  if (Math.abs(k - 1) < 0.01) return;
  install();
  K = k;
};

/** 화면 폭 · 높이 (배치 px) */
export const viewW = (): number => window.innerWidth;
export const viewH = (): number => window.innerHeight;
/** 화면 좌표 → 배치 px (덮기 뒤에는 이미 배치 px — 그대로. 화면 좌표를 CSS에 쓰는 자리를 표시해 둔다) */
export const lay = (v: number): number => v;
export const layRect = (r: DOMRect): DOMRect => r;
/** 배치 px 하나 = 기기 픽셀 몇 개 (웹 PC 확대 × DPR) */
export const devPerCss = (): number => (window.devicePixelRatio || 1) * uiZoom();
