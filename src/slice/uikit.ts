/**
 * 주물 공방 UI 키트 — 빌더 (D-391, 보고서 2026-11-09f 3.11). 겉모습은 kit.css 하나.
 * 창 · 고르기 화면 · 장소 화면 · 토스트 · 띠를 모두 이 함수들로 만든다 — 화면마다 틀을 새로 짓지 않는다.
 * 화면은 게임 상태를 바꾸지 않는다: 단추 동작은 부르는 쪽이 붙인다(돌려준 요소에서 data-* 로 찾는다).
 */
import { pxOut } from './fx3';

/** 창 크기 세 단계 — S 352 · M 592 · L 883 (game-ui-design 3.1) */
export type WinSize = 's' | 'm' | 'l';
/** 단추 재질: brass 진행(화면에 1개) · iron 보조 · 취소 · crimson 되돌릴 수 없는 손해(철 취소와 짝) · teal 내 편 보조 */
export type BtnKind = 'brass' | 'iron' | 'crimson' | 'teal';
export interface WinBtn {
  /** 동사 하나, 6자 이하 (voice ⑧) */
  label: string;
  /** data-* 등 (부르는 쪽이 이것으로 찾아 동작을 붙인다) */
  attrs?: string;
  kind?: BtnKind;
  disabled?: boolean;
  /** 더할 클래스 (has-new 등) */
  cls?: string;
}
export interface WinOpts {
  size: WinSize;
  /** 명패 — 12자 이하, 문장 · 수치 금지 (수치는 head의 꼬리표로) */
  title?: string;
  /** 머리 줄 (아이콘 · 이름 · 꼬리표) */
  head?: string;
  body: string;
  /** 단추 줄 왼쪽 = 뒤로(철) */
  back?: WinBtn;
  /** 단추 줄 오른쪽 = 앞으로(황동) */
  go?: WinBtn;
  /** 단추 줄 가운데 (쪽 표시 등, 단추 아님) */
  mid?: string;
  /** 단추 줄 오른쪽에 둘을 붙여 둘 때 (안내서 이전 · 다음) — go 대신 */
  pair?: [WinBtn, WinBtn];
  /** 뒤 막 · Esc = 이것. 없으면 막을 눌러도 닫히지 않는다 (결정 대기 창) */
  dismiss?: () => void;
  /** 창에 더할 클래스 (내용 배치용) */
  cls?: string;
}

/** 창을 실제로 띄우는 곳 (main.ts의 #overlay — 등장 m3in · 퇴장 디더는 거기서) */
interface WinHost {
  open: (html: string, cls: string) => HTMLElement;
  close: () => void;
}
let host: WinHost | null = null;
/** main.ts가 한 번 연결한다 */
export const bindWinHost = (h: WinHost): void => {
  host = h;
};

/** 단추 하나 */
export const btnHtml = (b: WinBtn, side: 'back' | 'go' | '' = ''): string =>
  `<button type="button" class="btn k-${b.kind ?? (side === 'go' ? 'brass' : 'iron')}${side ? ` ${side}` : ''}${b.cls ? ` ${b.cls}` : ''}" ${b.attrs ?? ''}${b.disabled ? ' disabled' : ''}>${b.label}</button>`;

/** 단추 줄 (왼쪽 뒤로 · 가운데 · 오른쪽 앞으로) */
export const btnRowHtml = (o: { back?: WinBtn; go?: WinBtn; mid?: string; pair?: [WinBtn, WinBtn] }): string => {
  if (!o.back && !o.go && !o.pair && !o.mid) return '';
  const right = o.pair ? `<div class="pair">${btnHtml(o.pair[0])}${btnHtml(o.pair[1], 'go')}</div>` : o.go ? btnHtml(o.go, 'go') : '';
  return `<div class="btn-row">${o.back ? btnHtml(o.back, 'back') : ''}${o.mid !== undefined ? `<div class="mid">${o.mid}</div>` : ''}${right}</div>`;
};

/** 창 안쪽 마크업 (명패 · 머리 줄 · 본문 · 단추 줄) */
export const winHtml = (o: WinOpts): string =>
  `${o.title ? `<div class="plate">${o.title}</div>` : ''}${o.head ? `<div class="win-head">${o.head}</div>` : ''}${o.body}${btnRowHtml(o)}`;

/** 창 높이 상한 (명패 걸침 · 위아래 여백을 뺀 값, game-ui-design 3.1) */
export const WIN_MAX_H: Record<WinSize, number> = { s: 240, m: 364, l: 364 };

let offDismiss: (() => void) | null = null;
const clearDismiss = (): void => {
  offDismiss?.();
  offDismiss = null;
};

/**
 * 창 열기 — 모든 #overlay 창이 이것 하나를 부른다. 돌려준 창에서 [data-*]로 단추를 찾아 동작을 붙인다.
 * 높이가 상한(364 / S 240)을 넘으면 콘솔에 알린다 — 스크롤로 덮지 않고 글을 줄이거나 단계를 올린다.
 */
export const openWin = (o: WinOpts): HTMLElement => {
  if (!host) throw new Error('uikit: bindWinHost 먼저');
  clearDismiss();
  const panel = host.open(winHtml(o), `win win-${o.size}${o.cls ? ` ${o.cls}` : ''}`);
  if (o.dismiss) {
    const over = panel.parentElement!;
    const fn = o.dismiss;
    const onOut = (e: MouseEvent): void => {
      if (e.target === over) (clearDismiss(), fn());
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') (clearDismiss(), fn());
    };
    window.addEventListener('keydown', onKey);
    // 여는 탭이 그대로 바깥 탭으로 잡히지 않게 한 박자 뒤에
    const t = window.setTimeout(() => over.addEventListener('click', onOut), 0);
    offDismiss = () => (window.clearTimeout(t), over.removeEventListener('click', onOut), window.removeEventListener('keydown', onKey));
  }
  requestAnimationFrame(() => {
    const h = panel.offsetHeight;
    if (h > WIN_MAX_H[o.size]) console.warn(`uikit: 창 높이 ${h} > ${WIN_MAX_H[o.size]} (${o.title ?? o.size})`);
  });
  return panel;
};
/** 창 닫기 (디더 퇴장) */
export const closeWin = (): void => {
  clearDismiss();
  host?.close();
};
/** 다른 길로 창이 바뀔 때(옛 openOverlay) 막 · Esc 동작을 걷는다 */
export const dropWinDismiss = clearDismiss;

/** 고르기 화면의 물건 하나 — 카드 얼굴(받침 안) + 받침 아래 한 줄(덱 맞물림 · 가격 꼬리표 · 함께 오는 카드) */
export interface PickItem {
  /** 고른 것을 가리키는 열쇠 (onPick으로 돌아온다) */
  key: string;
  /** 카드 · 부품 · 분대원 얼굴 (카드 얼굴은 바꾸지 않는다) */
  html: string;
  /** 받침 아래 12px 한 줄 (꼬리표 · 짧은 글) */
  info?: string;
  /** 팔림 · 못 삼 (받침은 그대로, 누를 수 없음) */
  off?: boolean;
}

/**
 * 고르기 묶음: [data-slot] 하나를 누르면 고름(받침 -sel · 선택지 sel), 같은 것을 다시 누르면 확정, 황동 [data-pick]도 확정.
 * 고르기 · 고물상 · 덱 빼기가 모두 이것 — 확인 창은 없다 (보고서 2-3 · StS 보상 화면).
 */
export const bindPick = (root: HTMLElement, o: { onSelect?: (key: string, el: HTMLElement) => void; onPick: (key: string, el: HTMLElement) => void }): { select: (key: string | null) => void; selected: () => string | null } => {
  let sel: string | null = null;
  const go = root.querySelector<HTMLButtonElement>('[data-pick]');
  const elOf = (k: string): HTMLElement | null => root.querySelector<HTMLElement>(`[data-slot="${k}"]`);
  const select = (k: string | null): void => {
    sel = k;
    root.querySelectorAll<HTMLElement>('[data-slot]').forEach((s) => {
      const on = s.dataset.slot === k;
      s.classList.toggle('is-sel', on);
      if (s.matches('button')) s.setAttribute('aria-pressed', String(on));
    });
    if (go) go.disabled = k === null;
    if (k !== null) o.onSelect?.(k, elOf(k)!);
  };
  root.querySelectorAll<HTMLElement>('[data-slot]').forEach((s) =>
    s.addEventListener('click', (e) => {
      e.stopPropagation();
      if (s.classList.contains('is-off') || root.classList.contains('locked')) return;
      const k = s.dataset.slot!;
      if (sel === k) return o.onPick(k, s);
      select(k);
    }),
  );
  go?.addEventListener('click', () => sel !== null && !root.classList.contains('locked') && o.onPick(sel, elOf(sel)!));
  if (go) go.disabled = true;
  return { select, selected: () => sel };
};

/** 받침 줄 마크업 (고르기 · 고물상 공용) */
export const slotsHtml = (items: PickItem[], bare = false): string =>
  `<div class="scr-items${bare ? ' bare' : ''}">${items.map((it) => `<div class="pick-item"><div class="${bare ? 'card-bare' : 'card-slot'}${it.off ? ' is-off' : ''}" data-slot="${it.key}">${it.html}</div>${it.info !== undefined ? `<div class="slot-info">${it.info}</div>` : ''}</div>`).join('')}</div>`;

/**
 * 받침 크기 맞춤: 받침 51×69 도트를 **기기 픽셀 정수배**로 — 줄에 다 들어가는 가장 큰 배율(카드 168px 상한).
 * 받침 안 카드 = 받침 폭 × 42/51. 받침 사이는 16 → 8 → 4로 줄여 본다. 스크롤 · 잘림 없음 (667×375에서도).
 */
export const fitSlots = (row: HTMLElement): void => {
  const slots = row.querySelectorAll<HTMLElement>(':scope > .pick-item');
  const n = slots.length;
  if (!n || !row.clientWidth) return;
  const dpr = window.devicePixelRatio || 1;
  let infoH = 0;
  row.style.removeProperty('--info-h');
  row.querySelectorAll<HTMLElement>(':scope > .pick-item > .slot-info').forEach((i) => (infoH = Math.max(infoH, i.offsetHeight)));
  // 받침 아래 줄 높이를 맞춰 카드 윗선이 한 줄로 선다
  if (infoH) row.style.setProperty('--info-h', `${infoH}px`);
  const gapIn = infoH ? 4 : 0;
  const W = row.clientWidth, H = row.clientHeight - infoH - gapIn;
  // 받침 없는 줄(고물상): 카드 얼굴만 — 폭 168 상한, 줄 높이 · 폭에 맞춘다 (카드 얼굴은 원래 비정수 1.5배)
  if (row.classList.contains('bare')) {
    const g = (W - 16 * (n - 1)) / n >= 140 ? 16 : 8;
    const w = Math.floor(Math.min(168, (W - g * (n - 1)) / n, (H * 112) / 168));
    row.style.setProperty('--card-w', `${w}px`);
    row.style.setProperty('--slot-gap', `${g}px`);
    return;
  }
  const cap = Math.floor(4 * dpr);
  let best = { N: 1, g: 4 };
  for (const g of [16, 8, 4]) {
    const N = Math.min(cap, Math.floor((H * dpr) / 69), Math.floor(((W - g * (n - 1)) * dpr) / (51 * n)));
    if (N > best.N) best = { N, g };
  }
  row.style.setProperty('--ss', `${best.N / dpr}px`);
  row.style.setProperty('--slot-gap', `${best.g}px`);
};

/**
 * 장면 그림을 칸에 덮기 — 비율 그대로(늘이지 않음) · 기기 픽셀 정수배 · 초점(fx, fy 0~1)이 칸 안에 오게 자른다 (D-386).
 */
export const coverArt = (img: HTMLImageElement): void => {
  const box = img.parentElement;
  if (!box || !img.naturalWidth || !box.clientWidth) return;
  const dpr = window.devicePixelRatio || 1;
  const bw = box.clientWidth, bh = box.clientHeight;
  const k = Math.ceil(Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * dpr) / dpr;
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  const fx = Number(img.dataset.fx ?? 0.5), fy = Number(img.dataset.fy ?? 0.5);
  const snap = (v: number): number => Math.round(v * dpr) / dpr;
  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
  img.style.left = `${snap(Math.min(0, Math.max(bw - w, bw / 2 - fx * w)))}px`;
  img.style.top = `${snap(Math.min(0, Math.max(bh - h, bh / 2 - fy * h)))}px`;
};
/** 화면이 바뀌면(회전 · 창 크기) 받침 · 장면 그림을 다시 맞춘다 */
const refitAll = (): void => {
  document.querySelectorAll<HTMLElement>('.scr-items').forEach(fitSlots);
  document.querySelectorAll<HTMLImageElement>('img[data-cover]').forEach(coverArt);
};
if (typeof window !== 'undefined') window.addEventListener('resize', () => requestAnimationFrame(refitAll));
const settle = (el: HTMLElement): void => {
  const run = (): void => {
    el.querySelectorAll<HTMLElement>('.scr-items').forEach(fitSlots);
    el.querySelectorAll<HTMLImageElement>('img[data-cover]').forEach((im) => (im.complete ? coverArt(im) : im.addEventListener('load', () => coverArt(im), { once: true })));
  };
  run();
  requestAnimationFrame(run);
  // 글꼴이 늦게 오면 받침 아래 줄 높이가 바뀐다
  void document.fonts?.ready.then(run);
};

export interface PickOpts {
  /** 명패 (≤ 12자) */
  title: string;
  /** 머리 줄 오른쪽 (꼬리표 · 지갑) */
  tag?: string;
  /** 머리 줄 왼쪽 (내 편 보조 행동 — 청록 단추 하나) */
  lead?: string;
  /** 명패 아래 한 줄 (대사 · 안내 — 없으면 비움) */
  say?: string;
  items: PickItem[];
  /** 받침 줄 대신 쓸 몸 (선택지 판 격자 등 — [data-slot]이면 같은 고르기 규칙) */
  body?: string;
  /** 단추 줄 왼쪽 (건너뛴다 · 그만둔다 — 철) */
  skip?: WinBtn;
  /** 단추 줄 오른쪽 (고른다 — 황동, 고르기 전 꺼짐) */
  go?: Partial<WinBtn>;
  onSelect?: (key: string, el: HTMLElement) => void;
  onPick: (key: string, el: HTMLElement) => void;
  cls?: string;
}
/**
 * 하나 고르기 화면 (3.7 .scr-pick): 창을 띄우지 않고 화면 전체가 작업대 — 명패 · 받침 줄 · 단추 줄.
 * 받침 누름 = 고름 + 「고른다」 켜짐, 같은 것 다시 누름 = 확정. 확인 창 없음. 막을 눌러도 닫히지 않는다.
 */
export const pickScreen = (o: PickOpts): HTMLElement => {
  if (!host) throw new Error('uikit: bindWinHost 먼저');
  clearDismiss();
  const go: WinBtn = { label: '고른다', attrs: 'data-pick', ...o.go, kind: o.go?.kind ?? 'brass' };
  go.attrs = `${go.attrs ?? ''}${go.attrs?.includes('data-pick') ? '' : ' data-pick'}`;
  const el = host.open(
    `<div class="scr-top">${o.lead ? `<div class="scr-lead">${o.lead}</div>` : ''}<div class="plate">${o.title}</div>${o.tag ? `<div class="scr-tag">${o.tag}</div>` : ''}</div>${o.say ? `<p class="scr-say">${o.say}</p>` : ''}${o.body ?? slotsHtml(o.items)}${btnRowHtml({ back: o.skip, go })}`,
    `scr-pick${o.cls ? ` ${o.cls}` : ''}`,
  );
  bindPick(el, o);
  settle(el);
  return el;
};

/** 장소 화면 (3.7 .scr-place): 왼쪽 장면 그림 40% · 오른쪽 일. backdrop = 그림을 화면 전체 바탕으로(고물상) */
export const placeScreen = (o: { art: string; focus?: [number, number]; title: string; tag?: string; wallet?: number; body: string; back?: WinBtn; go?: WinBtn; mid?: string; cls?: string; backdrop?: boolean }): HTMLElement => {
  if (!host) throw new Error('uikit: bindWinHost 먼저');
  clearDismiss();
  const [fx, fy] = o.focus ?? [0.5, 0.5];
  const art = `<div class="scr-art${o.backdrop ? '' : ' frame-scene'}"><img src="scenes/${o.art}.png" alt="" data-cover data-fx="${fx}" data-fy="${fy}"></div>`;
  const head = `<div class="win-head"><div class="plate">${o.title}</div>${o.tag ?? ''}${o.wallet !== undefined ? `<span class="wallet push" data-wallet>${o.wallet}</span>` : ''}</div>`;
  const el = host.open(`${art}<div class="scr-work">${head}${o.body}${btnRowHtml(o)}</div>`, `scr-place${o.backdrop ? ' scr-backdrop' : ''}${o.cls ? ` ${o.cls}` : ''}`);
  settle(el);
  return el;
};

/** 토스트 (3.8): 한 줄 20자 이하 · 1.2초 + 글자당 70ms · 누르면 넘김. 등장 계단, 퇴장 디더 */
export const toast = (text: string, icon = ''): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'k-toast k-free k-in';
  el.innerHTML = `${icon}<span>${text}</span>`;
  document.body.appendChild(el);
  const out = (): void => pxOut(el, () => el.remove(), 200);
  const t = window.setTimeout(out, 1200 + 70 * text.length);
  el.addEventListener('click', () => (window.clearTimeout(t), out()));
  return el;
};

/** 상태 띠 (3.8 · 3.10): 황동 띠, 글자는 처음부터 또렷 · 계단 등장 · 0.9초 뒤 디더 퇴장 */
export const band = (text: string, kind: 'brass' | 'crimson' = 'brass'): HTMLElement => {
  const el = document.createElement('div');
  el.className = `k-band kit k-${kind}`;
  el.innerHTML = `<div class="plate">${text}</div>`;
  el.querySelector('.plate')!.classList.add('k-in');
  document.body.appendChild(el);
  window.setTimeout(() => pxOut(el, () => el.remove(), 200), 900);
  return el;
};
