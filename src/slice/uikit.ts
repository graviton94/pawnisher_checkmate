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

/** 카드 폭 (D-372 정본 168 · D-399 하한 150 — 이보다 작으면 두루마리 글이 10px 아래로 내려가 겹친다) */
export const CARD_W = { max: 168, min: 150 } as const;

/**
 * 받침 크기 맞춤 (D-394 → D-399): 카드는 줄이지 않는다 — 정본 폭(168, 높이가 모자라면 150까지)을 지키고,
 * 줄에 다 들지 않으면 **가로로 미는 줄(레일)**이 된다. 받침(51×69 도트)은 기기 픽셀 정수배로, 그 안 카드가 150 아래로
 * 줄어야 들어가는 높이(667×375 등)에서는 받침 그림을 접고 카드만 놓는다. 스크롤바 대신 가장자리에 다음 카드가 걸쳐 보인다.
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
  const cs = getComputedStyle(row);
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const W = row.clientWidth - 2 * parseFloat(cs.paddingRight); // 왼쪽 여백은 레일이 바꾼다 — 오른쪽(G)으로 잰다
  const H = row.clientHeight - padY - infoH - (infoH ? 4 : 0);
  let w: number, g = 16;
  // 받침 줄: 받침 높이가 드는 가장 큰 정수배 — 그 안 카드(42도트)가 하한 이상이면 받침을 쓴다
  const N = Math.min(Math.floor((CARD_W.max * dpr) / 42), Math.floor((H * dpr) / 69));
  const slotted = !row.classList.contains('bare') && (42 * N) / dpr >= CARD_W.min;
  row.classList.toggle('no-slot', !row.classList.contains('bare') && !slotted);
  if (slotted) {
    row.style.setProperty('--ss', `${N / dpr}px`);
    w = (51 * N) / dpr;
  } else {
    // 카드만: 높이에 드는 만큼(2:3) — 정본 168, 하한 150
    w = Math.max(CARD_W.min, Math.min(CARD_W.max, Math.floor((H * 2) / 3)));
    row.style.setProperty('--card-w', `${w}px`);
  }
  // 다 들면 가운데 한 줄, 아니면 레일 — 오른쪽 끝에 다음 카드가 30 ~ 60% 걸쳐 보이게 사이(12 ~ 32)와 왼쪽 여백(G ~ G+80)을 고른다
  const rail = n * w + (n - 1) * g > W + 1;
  row.classList.toggle('is-rail', rail);
  row.style.removeProperty('--rail-start');
  if (rail) {
    const G = parseFloat(cs.paddingRight) || 16, cw = row.clientWidth;
    let best = { score: Infinity, g: 16, s: G };
    for (let gg = 12; gg <= 32; gg += 2)
      for (let ss = G; ss <= G + 80; ss += 2) {
        const k = Math.floor((cw - ss + gg) / (w + gg));
        const part = (cw - ss - k * (w + gg)) / w;
        const score = Math.abs(part - 0.45) * 4 + (ss - G) / 80 + Math.abs(gg - 16) / 32;
        if (score < best.score) best = { score, g: gg, s: ss };
      }
    g = best.g;
    row.style.setProperty('--rail-start', `${best.s}px`);
  }
  row.style.setProperty('--slot-gap', `${g}px`);
  if (!row.dataset.rail) bindRail(row);
};

/**
 * 레일 밀기 (D-399): 손가락 = 기본 가로 스크롤(관성 그대로), 마우스 = 끌기 · 휠(세로 휠도 가로로).
 * 손을 떼면 가까운 카드 왼쪽 끝에 **계단으로 붙는다** — 지나쳤다 돌아오는 4프레임(예비 → 터짐 → 출렁임, D-216 · 선형 미끄럼 없음).
 * 끌다 뗀 누름은 카드 고르기로 치지 않는다.
 */
export const bindRail = (row: HTMLElement): void => {
  row.dataset.rail = '1';
  let anim = 0, idle = 0, drag: { x: number; left: number; moved: boolean } | null = null, eatClick = false;
  const items = (): HTMLElement[] => [...row.querySelectorAll<HTMLElement>(':scope > .pick-item')];
  const pad = (): number => parseFloat(getComputedStyle(row).paddingLeft) || 0;
  const max = (): number => row.scrollWidth - row.clientWidth;
  /** 계단 붙기: 목표까지 55% → 108% → 97% → 100% (45ms 간격) */
  const glide = (to: number): void => {
    window.clearTimeout(anim);
    const from = row.scrollLeft, d = Math.max(0, Math.min(max(), to)) - from;
    if (Math.abs(d) < 1) return;
    const k = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? [1] : [0.55, 1.08, 0.97, 1];
    let i = 0;
    const step = (): void => {
      row.scrollLeft = from + d * k[i];
      if (++i < k.length) anim = window.setTimeout(step, 45);
      else anim = 0;
    };
    row.dataset.gliding = '1';
    step();
    window.setTimeout(() => delete row.dataset.gliding, 45 * k.length + 30);
  };
  const nearest = (): number => {
    const x0 = row.scrollLeft + pad();
    let best = 0, dist = Infinity;
    for (const it of items()) {
      const d = Math.abs(it.offsetLeft - x0);
      const left = it.offsetLeft - pad();
      if (d < dist) (dist = d, best = left);
    }
    return best;
  };
  const settle = (): void => {
    window.clearTimeout(idle);
    idle = window.setTimeout(() => {
      if (drag || row.dataset.gliding || !row.classList.contains('is-rail')) return;
      glide(row.scrollLeft >= max() - 2 ? max() : nearest());
    }, 140);
  };
  row.addEventListener('scroll', () => !row.dataset.gliding && settle(), { passive: true });
  row.addEventListener('wheel', (e) => {
    if (!row.classList.contains('is-rail')) return;
    e.preventDefault();
    window.clearTimeout(anim);
    delete row.dataset.gliding;
    row.scrollLeft += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  }, { passive: false });
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || !row.classList.contains('is-rail')) return;
    window.clearTimeout(anim);
    delete row.dataset.gliding;
    drag = { x: e.clientX, left: row.scrollLeft, moved: false };
  });
  // 6px 넘게 끌면 그때 누름을 붙잡는다 (그 전에 붙잡으면 마우스 누름이 카드에 닿지 않는다)
  row.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) > 6) (drag.moved = true, row.setPointerCapture(e.pointerId));
    if (drag.moved) row.scrollLeft = drag.left - (e.clientX - drag.x);
  });
  const up = (): void => {
    if (!drag) return;
    eatClick = drag.moved;
    drag = null;
    settle();
  };
  row.addEventListener('pointerup', up);
  row.addEventListener('pointercancel', up);
  row.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && !row.hasPointerCapture(e.pointerId) && up());
  // 끌기 끝의 누름은 고르기가 아니다 (바깥 단계에서 먼저 먹는다) · 고른 카드가 가장자리에 걸쳐 있으면 안으로 들인다
  row.addEventListener('click', (e) => {
    if (eatClick) {
      eatClick = false;
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const it = (e.target as HTMLElement).closest<HTMLElement>('.pick-item');
    if (!it || !row.classList.contains('is-rail')) return;
    const left = it.offsetLeft - pad(), right = left + it.offsetWidth;
    const vw = row.clientWidth - 2 * pad();
    if (left < row.scrollLeft) glide(left);
    else if (right > row.scrollLeft + vw) glide(right - vw);
  }, true);
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
  /** 단추 줄 오른쪽 (고른다 — 황동, 고르기 전 꺼짐). null = 진행 단추 없음(덱 보기) */
  go?: Partial<WinBtn> | null;
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
  const go: WinBtn | undefined = o.go === null ? undefined : { label: '고른다', attrs: 'data-pick', ...o.go, kind: o.go?.kind ?? 'brass' };
  if (go) go.attrs = `${go.attrs ?? ''}${go.attrs?.includes('data-pick') ? '' : ' data-pick'}`;
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

/**
 * 상태 띠 한 자리 (3.8 `.state-band`, D-385 · D-396): 토스트 · 턴 띠 · 판 띠 · 턴 끝 경고가 **한 자리를 줄 세워** 쓴다 — 동시에 1개.
 * 전투 중이면 가운데 열(판) 맨 위 48px, 그 밖은 화면 위 가운데. 짧은 상태 한 줄만 (≤ 20자).
 * kind: toast = 철 토스트(15px) · brass = 내 차례 · 알림 띠 · crimson = 적 차례 · 경고 띠(24px). 누르면 넘긴다.
 */
export type BandKind = 'toast' | 'brass' | 'crimson';
interface BandItem {
  text: string;
  kind: BandKind;
  ms: number;
  icon: string;
}
const bandQ: BandItem[] = [];
let bandNow: { item: BandItem; el: HTMLElement; t: number } | null = null;
/** 띠를 붙일 곳: 전투 HUD가 보이면 판 열 위, 아니면 화면 위 가운데 (부르는 쪽이 정한다) */
let bandAnchor: () => DOMRect | null = () => null;
export const setBandAnchor = (fn: () => DOMRect | null): void => {
  bandAnchor = fn;
};
/** 지금 띠 높이 (판 위 자리 예약 — 판 그리기가 이만큼 위를 비운다) */
export const BAND_ZONE = 48;
const placeBand = (el: HTMLElement): void => {
  const r = bandAnchor();
  el.classList.toggle('on-board', !!r);
  el.style.left = r ? `${Math.round(r.left + r.width / 2)}px` : '50%';
  el.style.top = r ? `${Math.round(r.top + Math.max(0, (BAND_ZONE - el.offsetHeight) / 2))}px` : '';
  // 판 열보다 넓으면 판 열 폭에 맞춘다 (667 폭에서 띠가 레일을 덮지 않게)
  el.style.maxWidth = r ? `${Math.min(480, Math.floor(r.width - 8))}px` : '';
};
const bandNext = (): void => {
  const item = bandQ.shift();
  if (!item) return void (bandNow = null);
  const el = document.createElement('div');
  el.className = `state-band k-${item.kind} k-in`;
  el.setAttribute('role', 'status');
  el.innerHTML = `${item.icon}<span>${item.text}</span>`;
  document.body.appendChild(el);
  placeBand(el);
  const out = (): void => {
    if (bandNow?.el !== el) return;
    window.clearTimeout(bandNow.t);
    bandNow = null;
    pxOut(el, () => (el.remove(), bandNext()), 160);
  };
  el.addEventListener('click', out);
  bandNow = { item, el, t: window.setTimeout(out, item.ms) };
};
/**
 * 상태 띠에 한 줄 올리기. 같은 글이 이미 떠 있거나 줄에 있으면 다시 올리지 않는다.
 * 줄이 길어지면(셋 넘게) 오래된 토스트부터 버린다 — 띠(턴 · 경고)는 버리지 않는다.
 * urgent = 지금 떠 있는 토스트를 바로 걷고 이것부터 (턴 띠 · 턴 끝 경고).
 */
export const stateBand = (text: string, kind: BandKind = 'toast', o: { ms?: number; icon?: string; urgent?: boolean } = {}): void => {
  if (bandNow?.item.text === text || bandQ.some((q) => q.text === text)) return;
  const ms = o.ms ?? (kind === 'toast' ? Math.max(1200 + 70 * text.length, 1600) : 900);
  const item: BandItem = { text, kind, ms, icon: o.icon ?? '' };
  if (o.urgent) {
    for (let k = bandQ.length - 1; k >= 0; k--) if (bandQ[k].kind === 'toast') bandQ.splice(k, 1);
    bandQ.unshift(item);
    if (bandNow && bandNow.item.kind === 'toast') {
      const cur = bandNow;
      window.clearTimeout(cur.t);
      bandNow = null;
      cur.el.remove();
    }
  } else {
    bandQ.push(item);
    while (bandQ.length > 3) {
      const k = bandQ.findIndex((q) => q.kind === 'toast');
      if (k < 0) break;
      bandQ.splice(k, 1);
    }
  }
  if (!bandNow) bandNext();
};
/** 띠를 모두 걷는다 (화면이 바뀔 때) */
export const clearBand = (): void => {
  bandQ.length = 0;
  if (bandNow) {
    window.clearTimeout(bandNow.t);
    bandNow.el.remove();
    bandNow = null;
  }
};
/** 토스트 (3.8): 한 줄 20자 이하 · 1.2초 + 글자당 70ms — 상태 띠 자리에 줄 선다 */
export const toast = (text: string, icon = ''): void => stateBand(text, 'toast', { icon });
/** 띠 (3.10 막 · 턴 · KO): 글자는 처음부터 또렷 · 계단 등장 · 0.9초 뒤 디더 퇴장 — 상태 띠 자리 */
export const band = (text: string, kind: 'brass' | 'crimson' = 'brass'): void => stateBand(text, kind, { urgent: true });

/**
 * 말풍선 (3.8 · 2-2 `.talk`, D-396): 말하는 이 = 초상 액자(UI-04 portrait-frame 64) · 말 = 움푹 칸(이름 12 + 15px).
 * 튜토리얼 · 부관 · 적 킹 · 반장 · 분대원이 모두 이 하나. paper = 이야기 재질 종이 판(튜토리얼 · 부관)에 얹는다.
 * 자리는 부르는 쪽이 정한다(판을 가리지 않는 레일 위 — talkAt).
 */
export const talkHtml = (o: { face: string; name: string; text?: string; paper?: boolean; cls?: string }): string =>
  `<div class="frame-portrait f64 talk-face">${o.face}</div><div class="inset talk-body"><b class="who">${o.name}</b><p class="line">${o.text ?? ''}</p></div>`;
export const makeTalk = (o: { face: string; name: string; text?: string; paper?: boolean; cls?: string }): HTMLElement => {
  const el = document.createElement('div');
  el.className = `talk kit${o.paper ? ' win-paper' : ''}${o.cls ? ` ${o.cls}` : ''}`;
  el.innerHTML = talkHtml(o);
  return el;
};
/**
 * 말풍선 자리: 판을 가리지 않게 레일 위에 (side = 어느 레일). 레일이 안 보이면(지도 · 고르기 화면) 화면 위 가운데.
 * top = 레일 안 위쪽 기준 높이(px) — 계기(64) 아래.
 */
export const talkAt = (el: HTMLElement, side: 'left' | 'right'): void => {
  const rail = document.getElementById(side === 'left' ? 'left' : 'right');
  const r = rail && rail.offsetParent !== null && !document.body.classList.contains('between') ? rail.getBoundingClientRect() : null;
  el.classList.toggle('on-rail', !!r);
  if (!r || !r.width) {
    el.style.left = '50%';
    el.style.top = '';
    el.style.width = '';
    return;
  }
  el.style.left = `${Math.round(r.left + 4)}px`;
  el.style.width = `${Math.round(r.width - 8)}px`;
  el.style.top = `${Math.round(r.top + 76)}px`;
};

/**
 * 정보 엿보기 (3.8 `.peek` → `.k-peek`, D-396): 비모달 S 창 — 머리 줄(아이콘 48 + 이름 24) · 본문 ≤ 4줄 · 단추 없음 · 아무 데나 누르면 닫힘.
 * 판 위 기물이면 그 진영 레일 위에 붙여 판을 가리지 않는다(내 편 = 왼쪽 · 적 = 오른쪽). 같은 것을 다시 열면 그대로 둔다.
 */
let peekNow: HTMLElement | null = null;
export const infoPeek = (o: { key: string; head: string; body: string; side: 'left' | 'right'; bare?: boolean; maxW?: number; cls?: string }): HTMLElement => {
  if (peekNow && peekNow.dataset.key === o.key && peekNow.isConnected) return peekNow;
  peekNow?.remove();
  const el = document.createElement('div');
  el.className = `k-peek kit${o.bare ? ' bare' : ' win win-s'}${o.cls ? ` ${o.cls}` : ''}`;
  el.dataset.key = o.key;
  el.innerHTML = o.bare ? o.body : `${o.head ? `<div class="win-head">${o.head}</div>` : ''}${o.body}`;
  // 판 칸을 덮지 않는 폭까지만 (레일 + 판 옆 빈칸)
  if (o.maxW && !o.bare) el.style.maxWidth = `${Math.floor(o.maxW)}px`;
  document.body.appendChild(el);
  const rail = document.getElementById(o.side === 'left' ? 'left' : 'right');
  const board = document.getElementById('board');
  const r = rail && rail.offsetParent !== null ? rail.getBoundingClientRect() : null;
  if (r && board) {
    // 레일 + 판 옆 빈칸까지만 (판 칸을 덮지 않게) — 창 폭 S 352를 넘지 않는다
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = o.side === 'left' ? r.left + 4 : Math.max(r.right - w - 4, 4);
    el.style.left = `${Math.round(x)}px`;
    const end = document.getElementById('btn-end');
    const bottom = o.cls?.includes('unit-peek') && end && end.offsetParent !== null ? Math.min(innerHeight - 8, end.getBoundingClientRect().top - 8) : innerHeight - 8;
    el.style.top = `${Math.round(Math.max(8, Math.min(bottom - h, r.top + 76)))}px`;
  } else {
    el.style.left = `${Math.round((innerWidth - el.offsetWidth) / 2)}px`;
    el.style.top = `${Math.round((innerHeight - el.offsetHeight) / 2)}px`;
  }
  el.classList.add('k-in');
  peekNow = el;
  // 아무 데나 누르면 닫힘 (여는 누름이 바로 닫지 않게 한 박자 뒤)
  const outside = (event: PointerEvent): void => {
    if (el.contains(event.target as Node) && (event.target as HTMLElement).closest('[data-peek-action]')) {
      document.addEventListener('pointerdown', outside, { once: true, capture: true });
      return;
    }
    closePeek(el);
  };
  window.setTimeout(() => document.addEventListener('pointerdown', outside, { once: true, capture: true }), 0);
  return el;
};
/** 엿보기 닫기 (디더 퇴장) */
export const closePeek = (el: HTMLElement | null = peekNow): void => {
  if (!el) return;
  if (peekNow === el) peekNow = null;
  pxOut(el, () => el.remove(), 160);
};

/**
 * 컷신 크롬 하나 (3.10, D-397): 프롤로그 · 막 카드 · 반장 등장 · 격파 · 승급 · 엔딩 · 크레딧 · 최종장이 모두 이 마크업을 쓴다.
 * `.cut-sub` = 아래 가운데 먹 띠(UI-08 띠 끝 장식 sub-cap-l/r 정수배, 줄 둘 · 줄마다 CUT_TEXT_BUDGET 안) · 띠 안 오른쪽 끝 `.cut-next` ▼ ·
 * `.cut-skip` = 철 단추 「건너뛴다」 112×48 아래 오른쪽. 부르는 쪽 뿌리에 `kit` 클래스를 달면 꼬리표 · 움푹 칸도 키트 그대로.
 */
export const cutChromeHtml = (o: { skip?: string } = {}): string =>
  `<div class="cut-sub"><div class="cut-lines" aria-live="polite"></div><span class="cut-next" aria-hidden="true">▼</span></div>${o.skip ? `<button type="button" class="btn k-iron cut-skip">${o.skip}</button>` : ''}`;
/** 자막 한 줄: n 서술 · s 대사(이름 12 굵게 + “ ”) · m 독백(‘ ’) */
export interface CutLine { k: 'n' | 's' | 'm'; t: string; who?: string }
/** 줄 글자 (따옴표까지) — 찍기(typeIn)와 한 번에 채우기가 같은 글을 쓴다 */
export const cutFill = (l: CutLine): string => (l.k === 's' ? `“${l.t}”` : l.k === 'm' ? `‘${l.t}’` : l.t);
/** 줄 빈 틀 (글은 <span>에 찍는다) */
export const cutLineHtml = (l: CutLine): string => `<p class="cl-${l.k}">${l.k === 's' && l.who ? `<b class="cl-who">${l.who}</b>` : ''}<span></span></p>`;
/** 띠에 줄을 바로 채운다 (찍기 없이) */
export const cutSay = (root: HTMLElement, lines: CutLine[]): void => {
  const box = root.querySelector<HTMLElement>('.cut-lines');
  if (!box) return;
  box.innerHTML = lines.map(cutLineHtml).join('');
  box.querySelectorAll<HTMLElement>('p > span').forEach((s, i) => (s.innerHTML = cutFill(lines[i])));
};
