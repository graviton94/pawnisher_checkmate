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

/** 하나 고르기 화면 (3.7 .scr-pick — 패스 2): 받침 누름 = 고름 + 「고른다」 켜짐, 같은 것 다시 누름 = 확정. 확인 창 없음 */
export const pickScreen = (o: { title: string; tag?: string; items: string[]; skip?: WinBtn; go?: WinBtn; onPick: (i: number) => void }): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'scr-pick';
  el.innerHTML = `<div class="scr-top"><div class="plate">${o.title}</div>${o.tag ?? ''}</div><div class="scr-items">${o.items.map((h, i) => `<div class="card-slot" data-slot="${i}">${h}</div>`).join('')}</div>${btnRowHtml({ back: o.skip, go: { label: '고른다', attrs: 'data-pick', disabled: true, ...o.go } })}`;
  let sel = -1;
  const go = el.querySelector<HTMLButtonElement>('[data-pick]');
  el.querySelectorAll<HTMLElement>('[data-slot]').forEach((s) =>
    s.addEventListener('click', () => {
      const i = Number(s.dataset.slot);
      if (sel === i) return o.onPick(i);
      sel = i;
      el.querySelectorAll('.card-slot').forEach((c) => c.classList.toggle('is-sel', c === s));
      if (go) go.disabled = false;
    }),
  );
  go?.addEventListener('click', () => sel >= 0 && o.onPick(sel));
  document.body.appendChild(el);
  return el;
};

/** 장소 화면 (3.7 .scr-place — 패스 2): 왼쪽 장면 그림 40% · 오른쪽 일 */
export const placeScreen = (o: { bg: string; title: string; wallet?: number; body: string; back?: WinBtn; go?: WinBtn }): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'scr-place';
  el.innerHTML = `<div class="scr-art"><img src="scenes/${o.bg}.png" alt=""></div><div class="scr-work"><div class="win-head"><div class="plate">${o.title}</div>${o.wallet !== undefined ? `<span class="wallet push">${o.wallet}</span>` : ''}</div>${o.body}${btnRowHtml(o)}</div>`;
  document.body.appendChild(el);
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
