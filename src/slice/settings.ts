import './settings.css';
import { closeWin, openWin, winHtml, btnHtml, type WinOpts } from './uikit';
import { sfx } from '../audio/sfx';
import { SETTINGS_TEXT as T, VOL_STEPS, type Settings } from '../data/settings';
import { LICENSES } from '../data/licenses';
import { CREDITS } from '../data/credits';
import { APP_VERSION } from '../data/version';
import { applySettings, readSettings, resetProgress, writeSettings, type KeyStore } from '../prefs/settings';
import type { MotionPref } from '../prefs/motion';

/**
 * 설정 창 (D-530, 출시 점검 1번) — 타이틀 메뉴 · 도움말(?) 탭에서 연다. L 창 하나, 높이 고정, 스크롤 없이 탭 둘:
 * 「소리 · 화면」(효과음 · 음악 크기와 끄기 · 움직임 줄이기 · 진행 초기화 · PC 전용 줄) / 「만든 사람」(제작 + 라이선스 고지 → 전문은 쪽 넘김).
 * 화면은 설정 값만 바꾼다 — 게임 상태는 건드리지 않는다 (UI 원칙 9). 진행 초기화만 저장소를 지우고 처음 화면으로 돌아간다.
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
  /** PC(Electron)일 때만 — 전체 화면 · 게임 끝내기 줄이 생긴다 */
  desktop?: DesktopHooks | null;
}

type Tab = 'sound' | 'screen' | 'credits';
const esc = (t: string): string => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const tabsHtml = (on: Tab): string => {
  const tab = (k: Tab, label: string): string => `<button type="button" class="tab" data-set-tab="${k}" role="tab" aria-selected="${on === k}">${label}</button>`;
  return `<div class="tabs" role="tablist">${tab('sound', T.tabSound)}${tab('screen', T.tabScreen)}${tab('credits', T.tabCredits)}</div>`;
};

/** 크기 줄 하나: 이름 · 끄기 · − · 진공관 10칸 · + */
const volHtml = (k: 'sfx' | 'music', s: Settings): string => {
  const name = k === 'sfx' ? T.sfx : T.music;
  const n = s[k], muted = k === 'sfx' ? s.sfxMute : s.musicMute;
  const tubes = Array.from({ length: VOL_STEPS }, (_, i) => `<i class="${!muted && i < n ? 'lit' : ''}"></i>`).join('');
  return `<div class="set-row" data-vol="${k}"><span class="set-name">${name}</span>
    ${btnHtml({ label: muted ? T.unmute : T.mute, attrs: `data-mute aria-pressed="${muted}" aria-label="${name} ${muted ? T.unmute : T.mute}"`, cls: 'set-mute' })}
    ${btnHtml({ label: T.down, attrs: `data-down aria-label="${T.downAria(name)}"`, cls: 'set-step', disabled: n <= 0 })}
    <span class="set-tubes inset${muted ? ' off' : ''}" role="img" aria-label="${T.levelAria(name, n, muted)}">${tubes}</span>
    ${btnHtml({ label: T.up, attrs: `data-up aria-label="${T.upAria(name)}"`, cls: 'set-step', disabled: n >= VOL_STEPS })}</div>`;
};

const row = (name: string, btn: string): string => `<div class="set-row"><span class="set-name">${name}</span>${btn}</div>`;
/** 소리 쪽: 효과음 · 음악 — 크기 줄 둘 */
const soundHtml = (s: Settings): string => `<div class="set-body inset">${volHtml('sfx', s)}${volHtml('music', s)}</div>`;
/** 화면 쪽: 움직임 줄이기 · (PC) 전체 화면 · 게임 끝내기 · 진행 초기화(맨 아래, 진홍) */
const screenHtml = (s: Settings, d: DesktopHooks | null | undefined): string => {
  const seg = (['os', 'off', 'on'] as MotionPref[]).map((m) => btnHtml({ label: T.motionOpts[m], attrs: `data-motion="${m}" aria-pressed="${s.motion === m}"`, kind: s.motion === m ? 'brass' : 'iron' })).join('');
  return `<div class="set-body inset">${row(T.motion, `<div class="set-seg" role="group" aria-label="${T.motion}">${seg}</div>`)}
    ${d ? `<div class="set-pairs">${row(T.fullscreen, btnHtml({ label: T.fullscreenBtn, attrs: 'data-full' }))}${row(T.quit, btnHtml({ label: T.quitBtn, attrs: 'data-quit' }))}</div>` : ''}
    ${row(T.reset, btnHtml({ label: T.resetBtn, attrs: 'data-reset', kind: 'crimson' }))}</div>`;
};

const creditsHtml = (): string => {
  const who = CREDITS.map((c) => `<span><b>${c.role}</b> ${c.names.join(' · ')}</span>`).join('');
  // 칸마다 이름 + 라이선스 한 줄 + 전문 단추 — 저작권자 · 쓴 곳 · 고친 점 · 주소는 전문 쪽 머리에 (작은 폰에서도 한 화면)
  const lic = LICENSES.map((l, i) => `<div class="set-lic"><div class="set-lic-t"><span class="set-lic-name">${esc(l.name)}</span><span class="note">${l.license}</span></div>${btnHtml({ label: T.licFull, attrs: `data-lic="${i}" aria-label="${esc(l.name)} ${T.licRead}"` })}</div>`).join('');
  return `<div class="set-body inset"><p class="set-who note">${who}</p><div class="set-lics">${lic}</div></div>`;
};

/** 설정 창을 연다 */
export const openSettings = (o: SettingsOpts, startTab: Tab = 'sound'): void => {
  let s = readSettings(o.store);
  let tab: Tab = startTab;
  const close = (): void => (o.onClose ? o.onClose() : closeWin());
  const opts = (): WinOpts => ({
    size: 'l', cls: 'set-win', title: T.title, head: tabsHtml(tab),
    body: tab === 'sound' ? soundHtml(s) : tab === 'screen' ? screenHtml(s, o.desktop) : creditsHtml(),
    back: { label: T.close, attrs: 'data-set-x' }, mid: `<span class="note set-ver">${T.version(APP_VERSION)}</span>`,
    dismiss: close,
  });
  const panel = openWin(opts());
  const save = (next: Settings, tick = true): void => {
    s = next;
    writeSettings(o.store, s);
    applySettings(s);
    if (tick) sfx('tap', 3);
    draw();
  };
  const draw = (): void => {
    const focus = (document.activeElement as HTMLElement | null)?.matches?.('[data-up],[data-down],[data-mute],[data-motion],[data-set-tab]') ? selectorOf(document.activeElement as HTMLElement) : null;
    panel.innerHTML = winHtml(opts());
    bind();
    if (focus) panel.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  };
  const bind = (): void => {
    panel.querySelector('[data-set-x]')!.addEventListener('click', () => (sfx('tap'), close()));
    panel.querySelectorAll<HTMLElement>('[data-set-tab]').forEach((t) => t.addEventListener('click', () => {
      if (t.dataset.setTab === tab) return;
      tab = t.dataset.setTab as Tab;
      sfx('tap');
      draw();
    }));
    panel.querySelectorAll<HTMLElement>('[data-vol]').forEach((r) => {
      const k = r.dataset.vol as 'sfx' | 'music';
      const mk = k === 'sfx' ? 'sfxMute' : 'musicMute';
      r.querySelector('[data-mute]')!.addEventListener('click', () => save({ ...s, [mk]: !s[mk] }));
      // 크기를 바꾸면 꺼 둔 소리도 다시 켠다 (들어 보며 맞추게)
      r.querySelector('[data-down]')!.addEventListener('click', () => save({ ...s, [k]: Math.max(0, s[k] - 1), [mk]: false }));
      r.querySelector('[data-up]')!.addEventListener('click', () => save({ ...s, [k]: Math.min(VOL_STEPS, s[k] + 1), [mk]: false }));
    });
    panel.querySelectorAll<HTMLElement>('[data-motion]').forEach((b) => b.addEventListener('click', () => save({ ...s, motion: b.dataset.motion as MotionPref })));
    panel.querySelector('[data-reset]')?.addEventListener('click', () => (sfx('tap'), resetStep(1)));
    panel.querySelector('[data-full]')?.addEventListener('click', () => (sfx('tap'), o.desktop?.toggleFullscreen()));
    panel.querySelector('[data-quit]')?.addEventListener('click', () => o.desktop?.quitGame());
    panel.querySelectorAll<HTMLElement>('[data-lic]').forEach((b) => b.addEventListener('click', () => (sfx('tap'), licenseReader(Number(b.dataset.lic), () => openSettingsAt('credits')))));
  };
  /** 두 단계 확인 — 둘 다 뒤 막으로 닫히지 않는다 (되돌릴 수 없는 결정 대기) */
  const resetStep = (n: 1 | 2): void => {
    const t = n === 1 ? T.reset1 : T.reset2;
    const el = openWin({ size: 's', title: t.title, body: `<p>${t.body}</p>${n === 1 ? `<p class="note">${T.reset1.note}</p>` : ''}`, back: { label: t.back, attrs: 'data-no' }, go: { label: t.go, attrs: 'data-yes', kind: 'crimson' } });
    el.querySelector('[data-no]')!.addEventListener('click', () => (sfx('tap'), openSettingsAt('screen')));
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
  const openSettingsAt = (t: Tab): void => openSettings(o, t);
  bind();
};

/** 누른 단추를 다시 그린 뒤에도 같은 자리에 초점을 둔다 (키보드 · 게임패드) */
const selectorOf = (el: HTMLElement): string => {
  const row = el.closest<HTMLElement>('[data-vol]');
  const own = ['data-up', 'data-down', 'data-mute', 'data-motion', 'data-set-tab'].find((a) => el.hasAttribute(a))!;
  const val = el.getAttribute(own);
  return `${row ? `[data-vol="${row.dataset.vol}"] ` : ''}[${own}${val ? `="${val}"` : ''}]`;
};

/** 라이선스 전문 — 스크롤 없이 쪽 넘김. 쪽은 실제 칸 높이에 문단을 채워 나눈다 */
const licenseReader = (i: number, back: () => void): void => {
  const l = LICENSES[i];
  // 원문 그대로 (마크다운 원본의 &copy; 만 기호로)
  // 전문이 없는 고지(CC BY)는 저작자 · 라이선스 주소 · 고친 점을 그대로 보인다
  const body = l.text ?? `${l.name} — ${l.by}\n${l.license}: ${l.url}\n${l.use}`;
  const paras = body.replace(/\r/g, '').replace(/&copy;/g, '©').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  let pages: string[][] = [paras];
  let at = 0;
  const html = (): WinOpts => ({
    size: 'l', cls: 'set-win set-read', title: T.licRead, head: `<div class="set-lic-t"><span class="set-lic-name">${esc(l.name)} · ${l.license}</span><span class="note">${esc(l.by)} · ${esc(l.use)}</span></div>`,
    body: `<div class="inset set-text">${pages[at].map((p) => `<p>${esc(p)}</p>`).join('')}</div>`,
    back: { label: T.licBack, attrs: 'data-lic-x' }, mid: `<span class="note">${at + 1} / ${pages.length}</span>`,
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
