import './settings.css';
import { closeWin, openWin, winHtml, btnHtml, morphHtml, toast, type WinOpts } from './uikit';
import { sfx } from '../audio/sfx';
import { SETTINGS_TEXT as T, VOL_STEPS, KEY_GUIDE, type Settings, type ShakePref } from '../data/settings';
import { LICENSES } from '../data/licenses';
import { CREDITS } from '../data/credits';
import { APP_VERSION } from '../data/version';
import { DEV_PAGE, PRIVACY_KO, PRIVACY_URL } from '../data/legal';
import { applySettings, readSettings, resetProgress, writeSettings, type KeyStore } from '../prefs/settings';
import type { MotionPref } from '../prefs/motion';
import { BIND_IDS, bindConflict, cleanBinds, DEFAULT_BINDS, keyLabel, normKey, type BindId } from './keymap';

/**
 * 설정 창 (D-530 → D-539 출시 표준 여섯 탭): 소리 · 화면 · 접근성 · 조작 · 게임 · 정보.
 * L 창 하나, 높이 고정(탭을 바꿔도 창이 튀지 않는다) · 스크롤 없음 — 한 탭 줄이 칸을 넘으면 쪽으로 나눈다(이전 · 다음).
 * 화면은 설정 값만 바꾼다 — 게임 상태는 건드리지 않는다 (UI 원칙 9). 진행 초기화만 저장소를 지우고 처음 화면으로 돌아간다.
 * 안내서 · 용어집은 부른 쪽(main.ts)이 연다 — 닫으면 이 창의 「게임」 탭으로 돌아온다.
 */
export interface DesktopHooks {
  /** 전체 화면 켜고 끄기 */
  toggleFullscreen: () => void;
  /** 게임 끝내기 */
  quitGame: () => void;
}
export interface SettingsOpts {
  store: KeyStore & { length?: number; key?(i: number): string | null };
  /** 창을 닫을 때 (기본: 창만 닫는다) */
  onClose?: () => void;
  /** 진행 초기화 뒤 (기본: 처음 화면으로 다시 읽기) */
  onReset?: () => void;
  /** PC(Electron)일 때만 — 전체 화면 줄이 생긴다 */
  desktop?: DesktopHooks | null;
  /** 안내서 다시 보기 — back = 다 보면 설정으로 돌아오기 (없으면 줄을 뺀다) */
  onGuide?: (back: () => void) => void;
  /** 용어집 — back = 닫으면 설정으로 (없으면 줄을 뺀다) */
  onGlossary?: (back: () => void) => void;
}

export type Tab = 'sound' | 'screen' | 'access' | 'input' | 'game' | 'info';
const TABS: readonly Tab[] = ['sound', 'screen', 'access', 'input', 'game', 'info'];
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const tabsHtml = (on: Tab): string =>
  `<div class="tabs tabs9 set-tabs" role="tablist">${TABS.map((k) => `<button type="button" class="tab" data-set-tab="${k}" role="tab" aria-selected="${on === k}"><span class="tl">${T.tabs[k]}</span></button>`).join('')}</div>`;

/** 크기 줄 하나: 이름 · 끄기 · − · 진공관 10칸 · + */
type VolKey = 'master' | 'sfx' | 'music';
const MUTE: Record<VolKey, 'masterMute' | 'sfxMute' | 'musicMute'> = { master: 'masterMute', sfx: 'sfxMute', music: 'musicMute' };
const volHtml = (k: VolKey, s: Settings): string => {
  const name = T[k];
  const n = s[k], muted = s[MUTE[k]];
  const tubes = Array.from({ length: VOL_STEPS }, (_, i) => `<i class="${!muted && i < n ? 'lit' : ''}"></i>`).join('');
  return `<div class="set-row" data-vol="${k}"><span class="set-name">${name}</span><div class="set-ctl">
    ${btnHtml({ label: muted ? T.unmute : T.mute, attrs: `data-mute aria-pressed="${muted}" aria-label="${name} ${muted ? T.unmute : T.mute}"`, cls: 'set-mute' })}
    ${btnHtml({ label: T.down, attrs: `data-down aria-label="${T.downAria(name)}"`, cls: 'set-step', disabled: n <= 0 })}
    <span class="set-tubes inset${muted ? ' off' : ''}" role="img" aria-label="${T.levelAria(name, n, muted)}">${tubes}</span>
    ${btnHtml({ label: T.up, attrs: `data-up aria-label="${T.upAria(name)}"`, cls: 'set-step', disabled: n >= VOL_STEPS })}</div></div>`;
};

/** 줄 하나: 왼쪽 이름(+ 아래 12px 설명) · 오른쪽 조작(같은 x에서 시작) */
const row = (name: string, ctl: string, note = '', cls = ''): string =>
  `<div class="set-row${cls ? ` ${cls}` : ''}"><span class="set-name">${name}${note ? `<small class="note">${note}</small>` : ''}</span><div class="set-ctl">${ctl}</div></div>`;
/** 고르기 칸 (고른 칸 = 황동 눌림 · 나머지 = 철) */
const seg = (key: string, name: string, opts: readonly (readonly [string, string])[], now: string): string =>
  `<div class="set-seg" role="group" aria-label="${name}">${opts.map(([v, label]) => btnHtml({ label, attrs: `data-seg="${key}" data-v="${v}" aria-pressed="${now === v}"`, kind: now === v ? 'brass' : 'iron' })).join('')}</div>`;
const onOff = (key: string, name: string, v: boolean): string => seg(key, name, [['0', T.off], ['1', T.on]], v ? '1' : '0');

/** 탭의 줄들 (쪽 나누기 전) */
const rowsOf = (tab: Tab, s: Settings, o: SettingsOpts): string[] => {
  switch (tab) {
    case 'sound': return [volHtml('master', s), volHtml('sfx', s), volHtml('music', s), row(T.bgMute, onOff('bgMute', T.bgMute, s.bgMute))];
    case 'screen': return [
      ...(o.desktop ? [row(T.fullscreen, btnHtml({ label: T.fullscreenBtn, attrs: 'data-full' }), T.fullscreenNote)] : []),
      row(T.shake, seg('shake', T.shake, (['off', 'weak', 'normal'] as ShakePref[]).map((v) => [v, T.shakeOpts[v]] as const), s.shake)),
    ];
    case 'access': return [
      row(T.motion, seg('motion', T.motion, (['os', 'off', 'on'] as MotionPref[]).map((v) => [v, T.motionOpts[v]] as const), s.motion)),
      row(T.lessFlash, onOff('lessFlash', T.lessFlash, s.lessFlash)),
      row(T.autoAdvance, onOff('autoAdvance', T.autoAdvance, s.autoAdvance)),
      row(T.cbAid, onOff('cbAid', T.cbAid, s.cbAid), T.cbAidNote),
    ];
    case 'input': return [row(T.keyHints, onOff('keyHints', T.keyHints, s.keyHints)), row(T.keyMap, btnHtml({ label: T.keyMapBtn, attrs: 'data-keymap' })), row(T.keyBind, btnHtml({ label: T.keyBindBtn, attrs: 'data-keybind' }))];
    case 'game': return [
      ...(o.onGuide ? [row(T.guide, btnHtml({ label: T.openBtn, attrs: 'data-guide' }))] : []),
      ...(o.onGlossary ? [row(T.glossary, btnHtml({ label: T.openBtn, attrs: 'data-glossary' }))] : []),
      // 파괴 행동은 맨 아래 · 구분선 위로 띄운다 (M8)
      `<hr class="divider set-gap">${row(T.reset, btnHtml({ label: T.resetBtn, attrs: 'data-reset', kind: 'crimson' }))}`,
    ];
    case 'info': return [
      row(T.credits, btnHtml({ label: T.keyMapBtn, attrs: 'data-credits' })),
      row(T.privacy, btnHtml({ label: T.readBtn, attrs: 'data-privacy' }) + (PRIVACY_URL ? btnHtml({ label: T.webBtn, attrs: 'data-privacy-web' }) : ''), (PRIVACY_URL ?? '').replace('.io/', '.io/<wbr>')),
      row(T.feedback, btnHtml({ label: T.copyBtn, attrs: 'data-copy-url' }), DEV_PAGE),
    ];
  }
};

/**
 * 웹 주소를 기기 브라우저로 연다 (D-636). 새 창 링크를 눌린 것처럼 — 안드로이드(Capacitor)는 앱 밖 주소를 시스템 브라우저로 넘기고,
 * 웹은 새 탭, PC(Electron)는 main.cjs가 스튜디오 사이트 주소만 기본 브라우저로 넘긴다. 게임 상태는 건드리지 않는다.
 */
const openWeb = (url: string): void => {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
};

/** 한 쪽에 넣는 줄 수 — 탭마다 (줄 높이가 탭마다 달라 처음 그릴 때 재어 줄인다, 창 높이 364 안) */
const perTab: Partial<Record<Tab, number>> = {};

/** 설정 창을 연다 */
export const openSettings = (o: SettingsOpts, startTab: Tab = 'sound'): void => {
  let s = readSettings(o.store);
  let tab: Tab = startTab;
  let page = 0;
  const close = (): void => (o.onClose ? o.onClose() : closeWin());
  const pages = (): string[][] => {
    const rows = rowsOf(tab, s, o);
    const out: string[][] = [];
    const perPage = perTab[tab] ?? 4;
    for (let i = 0; i < rows.length; i += perPage) out.push(rows.slice(i, i + perPage));
    return out.length ? out : [[]];
  };
  const opts = (): WinOpts => {
    const ps = pages();
    page = Math.min(page, ps.length - 1);
    const many = ps.length > 1;
    return {
      size: 'l', cls: 'set-win', title: T.title, head: tabsHtml(tab),
      body: `<div class="set-body inset">${ps[page].join('')}</div>`,
      back: { label: T.close, attrs: 'data-set-x' },
      mid: many ? `<span class="note">${T.page(page + 1, ps.length)}</span>` : tab === 'info' ? `<span class="note set-ver">${T.version(APP_VERSION)}</span>` : '',
      ...(many ? { pair: [{ label: T.prev, attrs: 'data-set-prev', disabled: page <= 0 }, { label: T.next, attrs: 'data-set-next', disabled: page >= ps.length - 1 }] as WinOpts['pair'] } : {}),
      dismiss: close,
    };
  };
  const panel = openWin(opts());
  const save = (next: Settings, tick = true): void => {
    s = next;
    writeSettings(o.store, s);
    applySettings(s);
    if (tick) sfx('tap', 3);
    draw();
  };
  // 다시 그리기 (D-593 — 사용자: 「설정을 누를 때마다 위 「설정」 명패가 깜빡인다」): 예전엔 창 속 전체를 innerHTML로 갈아
  // 명패 · 탭 · 단추가 매번 새로 붙었다. 이제 바뀐 칸만 고치고(morphHtml) 명패는 그대로 둔다. 노드가 남아 초점도 남는다.
  const draw = (): void => {
    morphHtml(panel, winHtml(opts()));
    // 쪽이 칸을 넘으면 한 쪽 줄 수를 줄여 다시 (스크롤 · 잘림 없이)
    const body = panel.querySelector<HTMLElement>('.set-body');
    const perPage = perTab[tab] ?? 4;
    if (body && perPage > 1 && body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
      perTab[tab] = perPage - 1;
      return draw();
    }
  };
  const reopen = (t: Tab): (() => void) => () => openSettings(o, t);
  /** 누름은 창에 한 번만 위임해 받는다 (노드가 다시 그려도 남으므로) */
  panel.addEventListener('click', (e) => {
    const at = (sel: string): HTMLElement | null => (e.target instanceof Element ? e.target.closest<HTMLElement>(sel) : null);
    const hit = at('button');
    if (!hit || !panel.contains(hit) || (hit as HTMLButtonElement).disabled) return;
    if (hit.matches('[data-set-x]')) return void (sfx('close'), close());
    if (hit.matches('[data-set-tab]')) {
      if (hit.dataset.setTab === tab) return;
      tab = hit.dataset.setTab as Tab;
      page = 0;
      sfx('tap');
      return draw();
    }
    if (hit.matches('[data-set-prev]')) return void ((page = Math.max(0, page - 1)), sfx('tap'), draw());
    if (hit.matches('[data-set-next]')) return void ((page += 1), sfx('tap'), draw());
    const vol = hit.closest<HTMLElement>('[data-vol]');
    if (vol) {
      const k = vol.dataset.vol as VolKey;
      const mk = MUTE[k];
      if (hit.matches('[data-mute]')) return save({ ...s, [mk]: !s[mk] });
      // 크기를 바꾸면 꺼 둔 소리도 다시 켠다 (들어 보며 맞추게)
      if (hit.matches('[data-down]')) return save({ ...s, [k]: Math.max(0, s[k] - 1), [mk]: false });
      if (hit.matches('[data-up]')) return save({ ...s, [k]: Math.min(VOL_STEPS, s[k] + 1), [mk]: false });
    }
    if (hit.matches('[data-seg]')) {
      const k = hit.dataset.seg as keyof Settings, v = hit.dataset.v!;
      const val = k === 'motion' || k === 'shake' ? v : v === '1';
      return save({ ...s, [k]: val } as Settings);
    }
    if (hit.matches('[data-reset]')) return void (sfx('tap'), resetStep(1));
    if (hit.matches('[data-full]')) return void (sfx('tap'), o.desktop?.toggleFullscreen());
    if (hit.matches('[data-keymap]')) return void (sfx('tap'), keyMapPage(s, reopen('input')));
    if (hit.matches('[data-keybind]')) return void (sfx('tap'), keyBindPage(o, reopen('input')));
    if (hit.matches('[data-guide]')) return void (sfx('tap'), o.onGuide?.(reopen('game')));
    if (hit.matches('[data-glossary]')) return void (sfx('tap'), o.onGlossary?.(reopen('game')));
    if (hit.matches('[data-credits]')) return void (sfx('tap'), creditsPage(reopen('info')));
    if (hit.matches('[data-privacy]')) return void (sfx('tap'), textReader({ title: T.privacy, head: `<span class="note">${esc(PRIVACY_URL ?? DEV_PAGE)}</span>`, paras: [...PRIVACY_KO] }, reopen('info')));
    if (hit.matches('[data-privacy-web]') && PRIVACY_URL) return void (sfx('tap'), openWeb(PRIVACY_URL));
    if (hit.matches('[data-copy-url]')) {
      sfx('tap');
      if (!navigator.clipboard) return toast(T.copyFail);
      void navigator.clipboard.writeText(DEV_PAGE).then(() => toast(T.copied), () => toast(T.copyFail));
    }
  });
  /** 두 단계 확인 — 둘 다 뒤 막으로 닫히지 않는다 (되돌릴 수 없는 결정 대기) */
  const resetStep = (n: 1 | 2): void => {
    const t = n === 1 ? T.reset1 : T.reset2;
    const el = openWin({ size: 's', title: t.title, body: `<p>${t.body}</p>${n === 1 ? `<p class="note">${T.reset1.note}</p>` : ''}`, back: { label: t.back, attrs: 'data-no' }, go: { label: t.go, attrs: 'data-yes', kind: 'crimson' } });
    el.querySelector('[data-no]')!.addEventListener('click', () => (sfx('tap'), openSettings(o, 'game')));
    el.querySelector('[data-yes]')!.addEventListener('click', () => {
      if (n === 1) return resetStep(2);
      resetProgress(o.store);
      try {
        sessionStorage.removeItem('op-menu');
      } catch {
        /* 무시 */
      }
      sfx('loss');
      closeWin();
      (o.onReset ?? (() => location.reload()))();
    });
  };
  draw();
};

/** 키 · 패드 배치표 한 쪽 (L 창 · 표 셋 칸) — 바꿀 수 있는 행동은 지금 배치로. 칸이 낮으면 쪽으로 나눈다 (D-558: 아래 줄이 칸 밖에서 잘렸다) */
let keyMapPer = 0;
const keyMapPage = (s: Settings, back: () => void, page = 0): void => {
  const k = cleanBinds(s.keys);
  const all = KEY_GUIDE.map(([act, key, pad, id]) => {
    const kb = id ? `${keyLabel(k[id as BindId])}${id === 'undo' ? ' · Ctrl+Z' : ''}` : key;
    return `<span class="km-act">${act}</span><span class="km-key">${kb}</span><span class="km-pad">${pad}</span>`;
  });
  const per = keyMapPer || all.length;
  const count = Math.ceil(all.length / per);
  page = Math.max(0, Math.min(page, count - 1));
  const cells = all.slice(page * per, page * per + per).join('');
  const many = count > 1;
  const el = openWin({ size: 'l', cls: 'set-win set-keys', title: T.keyMapTitle, body: `<div class="inset set-keymap"><span class="note">행동</span><span class="note">키보드</span><span class="note">패드</span>${cells}</div>`, back: { label: T.licBack, attrs: 'data-x' }, ...(many ? { mid: `<span class="note">${T.page(page + 1, count)}</span>`, pair: [{ label: T.prev, attrs: 'data-set-prev', disabled: page <= 0 }, { label: T.next, attrs: 'data-set-next', disabled: page >= count - 1 }] as WinOpts['pair'] } : {}), dismiss: back });
  const body = el.querySelector<HTMLElement>('.set-keymap');
  if (body && per > 1 && body.scrollHeight > body.clientHeight + 1) {
    keyMapPer = per - 1;
    return keyMapPage(s, back, Math.floor((page * per) / (per - 1)));
  }
  el.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), back()));
  el.querySelector('[data-set-prev]')?.addEventListener('click', () => (sfx('tap'), keyMapPage(s, back, page - 1)));
  el.querySelector('[data-set-next]')?.addEventListener('click', () => (sfx('tap'), keyMapPage(s, back, page + 1)));
};

/**
 * 키 바꾸기 (D-539): 행동 다섯(턴 끝 · 선택 취소 · 되감기 · 칸 정보 · 손패↔판) — 키 단추를 누르고 새 키를 누른다.
 * 고정 키(확인 · 뒤로 · 방향 · 숫자)와 다른 행동의 키는 받지 않고 까닭을 한 줄로. [기본값으로]는 바꾼 키를 모두 지운다.
 * 기다리는 동안 Esc = 그만두기(키는 그대로).
 */
// 안내 줄은 표의 빈 여섯째 칸에 (D-558: 표 아래 따로 두면 낮은 화면에서 칸 밖으로 잘렸다)
const keyBindPage = (o: SettingsOpts, back: () => void): void => {
  let wait: BindId | null = null;
  const html = (): WinOpts => {
    const k = cleanBinds(readSettings(o.store).keys);
    const rows = BIND_IDS.map((id) => `<div class="set-row kb-row"><span class="set-name">${T.bindNames[id]}</span><div class="set-ctl">${btnHtml({ label: wait === id ? T.bindWait : keyLabel(k[id]), attrs: `data-bind="${id}" aria-pressed="${wait === id}" aria-label="${T.bindNames[id]} ${keyLabel(k[id])}"`, kind: wait === id ? 'brass' : 'iron', cls: 'kb-key' })}</div></div>`).join('');
    return { size: 'l', cls: 'set-win set-bind', title: T.bindTitle, body: `<div class="set-body inset"><div class="kb-grid">${rows}<p class="note kb-note">${T.bindNote}</p></div></div>`, back: { label: T.licBack, attrs: 'data-x' }, go: { label: T.bindDefault, attrs: 'data-bind-reset', kind: 'iron' }, dismiss: () => (stop(), back()) };
  };
  const panel = openWin(html());
  const onKey = (e: KeyboardEvent): void => {
    if (!wait) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape') return void ((wait = null), draw());
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const s = readSettings(o.store);
    const cur = cleanBinds(s.keys);
    const c = bindConflict(cur, wait, e.key);
    const label = keyLabel(normKey(e.key));
    if (c === 'reserved') return void (sfx('tap', 3), toast(T.bindReserved(label)));
    if (c) return void (sfx('tap', 3), toast(T.bindTaken(label, T.bindNames[c])));
    const keys = { ...s.keys, [wait]: normKey(e.key) };
    if (keys[wait] === DEFAULT_BINDS[wait]) delete keys[wait];
    const next = { ...s, keys };
    writeSettings(o.store, next);
    applySettings(next);
    sfx('tap');
    toast(T.bindSaved(T.bindNames[wait], label));
    wait = null;
    draw();
  };
  const stop = (): void => window.removeEventListener('keydown', onKey, true);
  // 창 키(keys.ts)보다 먼저 받는다 — 같은 window의 캡처 단계
  window.addEventListener('keydown', onKey, true);
  const draw = (): void => {
    panel.innerHTML = winHtml(html());
    panel.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), stop(), back()));
    panel.querySelector('[data-bind-reset]')!.addEventListener('click', () => {
      const s = readSettings(o.store);
      const next = { ...s, keys: {} };
      writeSettings(o.store, next);
      applySettings(next);
      sfx('tap');
      wait = null;
      draw();
    });
    panel.querySelectorAll<HTMLElement>('[data-bind]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.bind as BindId;
      wait = wait === id ? null : id;
      sfx('tap');
      draw();
    }));
  };
  draw();
};

/** 만든 사람 + 라이선스 목록 (전문은 쪽 넘김) — 칸이 낮으면(772×360 등) 라이선스를 쪽으로 나눈다 (D-558: 셋째 줄이 반만 보였다) */
let creditsPer = 0;
const creditsPage = (back: () => void, page = 0): void => {
  const who = CREDITS.map((c) => `<span><b>${c.role}</b> ${c.names.join(' · ')}</span>`).join('');
  // 칸마다 이름 + 라이선스 한 줄 + 전문 단추 — 저작권자 · 쓴 곳 · 고친 점 · 주소는 전문 쪽 머리에 (작은 폰에서도 한 화면)
  const licOf = (l: (typeof LICENSES)[number], i: number): string => `<div class="set-lic"><div class="set-lic-t"><span class="set-lic-name">${esc(l.name)}</span><span class="note">${l.license}</span></div>${btnHtml({ label: T.licFull, attrs: `data-lic="${i}" aria-label="${esc(l.name)} ${T.licRead}"` })}</div>`;
  const per = creditsPer || LICENSES.length;
  const count = Math.ceil(LICENSES.length / per);
  page = Math.max(0, Math.min(page, count - 1));
  const lic = LICENSES.map(licOf).slice(page * per, page * per + per).join('');
  const many = count > 1;
  const el = openWin({ size: 'l', cls: 'set-win', title: T.credits.split(' · ')[0], body: `<div class="set-body inset"><p class="set-who note">${who}</p><div class="set-lics">${lic}</div></div>`, back: { label: T.licBack, attrs: 'data-x' }, mid: many ? `<span class="note">${T.page(page + 1, count)}</span>` : `<span class="note set-ver"><img class="set-emblem" src="ui/crown-emblem.png" alt="">${T.version(APP_VERSION)}</span>`, ...(many ? { pair: [{ label: T.prev, attrs: 'data-set-prev', disabled: page <= 0 }, { label: T.next, attrs: 'data-set-next', disabled: page >= count - 1 }] as WinOpts['pair'] } : {}), dismiss: back });
  // 넘치면 한 쪽 라이선스 수를 둘씩(한 줄씩) 줄여 다시 — 스크롤 · 잘림 없이
  const body = el.querySelector<HTMLElement>('.set-body');
  if (body && per > 2 && body.scrollHeight > body.clientHeight + 1) {
    creditsPer = per - 2;
    return creditsPage(back, Math.floor((page * per) / (per - 2)));
  }
  el.querySelector('[data-x]')!.addEventListener('click', () => (sfx('tap'), back()));
  el.querySelector('[data-set-prev]')?.addEventListener('click', () => (sfx('tap'), creditsPage(back, page - 1)));
  el.querySelector('[data-set-next]')?.addEventListener('click', () => (sfx('tap'), creditsPage(back, page + 1)));
  el.querySelectorAll<HTMLElement>('[data-lic]').forEach((b) => b.addEventListener('click', () => {
    sfx('tap');
    const l = LICENSES[Number(b.dataset.lic)];
    // 원문 그대로 (마크다운 원본의 &copy; 만 기호로) · 전문이 없는 고지(CC BY)는 저작자 · 라이선스 주소 · 고친 점을 그대로
    const text = l.text ?? `${l.name} — ${l.by}\n${l.license}: ${l.url}\n${l.use}`;
    const paras = text.replace(/\r/g, '').replace(/&copy;/g, '©').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    textReader({ title: T.licRead, head: `<div class="set-lic-t"><span class="set-lic-name">${esc(l.name)} · ${l.license}</span><span class="note">${esc(l.by)} · ${esc(l.use)}</span></div>`, paras }, () => creditsPage(back, page));
  }));
};

/** 긴 글 읽기 (라이선스 전문 · 개인정보 처리방침) — 스크롤 없이 쪽 넘김. 쪽은 실제 칸 높이에 문단을 채워 나눈다 */
const textReader = (doc: { title: string; head: string; paras: string[] }, back: () => void): void => {
  const { paras } = doc;
  let pages: string[][] = [paras];
  let at = 0;
  const html = (): WinOpts => ({
    size: 'l', cls: 'set-win set-read', title: doc.title, head: doc.head,
    body: `<div class="inset set-text">${pages[at].map((p) => `<p>${esc(p)}</p>`).join('')}</div>`,
    back: { label: T.licBack, attrs: 'data-lic-x' }, mid: `<span class="note">${T.page(at + 1, pages.length)}</span>`,
    pair: [{ label: T.licPrev, attrs: 'data-lic-prev', disabled: at <= 0 }, { label: T.licNext, attrs: 'data-lic-next', disabled: at >= pages.length - 1 }],
    dismiss: back,
  });
  const panel = openWin(html());
  // 쪽 나누기: 같은 칸에 문단을 하나씩 넣어 넘치면 다음 쪽으로 (긴 문단은 줄 단위로 쪼갠다)
  const box = panel.querySelector<HTMLElement>('.set-text')!;
  const fits = (): boolean => box.scrollHeight <= box.clientHeight + 1;
  const out: string[][] = [];
  let cur: string[] = [];
  const paint = (pg: string[]): void => void (box.innerHTML = pg.map((q) => `<p>${esc(q)}</p>`).join(''));
  // 원문 줄 하나씩 채운다 — 문단 중간에서 쪽이 바뀌면 다음 쪽은 그 문단의 남은 줄로 시작한다
  for (const p of paras) {
    let part = '';
    for (const ln of p.split('\n')) {
      const next = part ? `${part}\n${ln}` : ln;
      paint([...cur, next]);
      if (fits() || (!cur.length && !part)) { part = next; continue; }
      if (part) cur.push(part);
      out.push(cur);
      cur = [];
      part = ln;
    }
    if (part) cur.push(part);
  }
  if (cur.length) out.push(cur);
  pages = out.length ? out : [[]];
  const draw = (): void => {
    panel.innerHTML = winHtml(html());
    panel.querySelector('[data-lic-x]')!.addEventListener('click', () => (sfx('tap'), back()));
    panel.querySelector('[data-lic-prev]')!.addEventListener('click', () => { at = Math.max(0, at - 1); sfx('tap'); draw(); });
    panel.querySelector('[data-lic-next]')!.addEventListener('click', () => { at = Math.min(pages.length - 1, at + 1); sfx('tap'); draw(); });
  };
  draw();
};
