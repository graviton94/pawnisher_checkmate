/**
 * 막 장부 (D-402 — 2차 시안 end2-a 「펼친 장부」를 기본으로, 사용자 결정): 막 반장을 쓰러뜨릴 때마다 · 출하를 끝낼 때 같은 뼈대.
 *  왼쪽 = 장면 액자(막 = 쓰러진 반장 그림 · 출하 끝 = 완료 그림) + 도장 띠(「반장 격파」 · 「정품 판정」) + 새로 열림 띠
 *  오른쪽 = 명패 + 꼬리 → 쪽 띠(1막 · 2막 · 3막 · 종막, 찍힌 쪽에 도장 자국) → 장부(결과 쪽지 UI-25: 줄마다 이름 · 점선 · 값 · 으뜸 한 줄)
 *          → 다음 예고(카드 말투 한 문장 + (수치), voice ⑥) → 오른쪽 아래 단추.
 * 막 타이틀 카드(actCard)는 이 뒤에 서사만 말한다 — 수치는 여기 다음 예고 한 곳에만.
 * 박자(D-180 · D-263): 쪽 띠 도장 자국 → 장부 째깍 → 으뜸 왕관 → 도장 예비(들어 올림) → 터짐(내리꽂힘 · 계단 고리 · 도트 낱말 · 흔들림) → 출렁 → 다음 예고 계단 등장.
 * 투명도 보간 · 선형 미끄럼 없음. 그림은 받은 것만(D-386): 장면 · royalSeal(도장 — UI-26 도장 자국 받기 전 임시) · 왕관 · UI-24 띠 · UI-25 쪽지.
 */
import { sfx } from '../audio/sfx';
import { burstWord, Layer } from './evstage';
import { replay, shakeEl, tally } from './fx3';
import { btnRowHtml, coverArt } from './uikit';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, calm() ? Math.min(ms, 60) : ms));

/** 분대원 한 명 (으뜸 줄) — pc = 기물 그림 마크업 */
export interface ClearMember { name: string; pc: string; kills: number; dmg: number }
/** 쪽 띠 한 칸: 막 이름표 · 쓰러뜨린 반장 (없으면 아직) */
export interface ClearTab { label: string; boss?: string }
export interface ClearData {
  /** act = 막 마침(이번 쪽에 도장), run = 출하 끝(모든 쪽에 도장) */
  mode: 'act' | 'run';
  title: string;
  /** 명패 옆 꼬리 (강조 띠 마크업) */
  tag: string;
  tabs: ClearTab[];
  /** 장부 줄: 이름 · 값 (값이 숫자면 째깍 올라간다) */
  rows: { k: string; v: number | string; unit?: string }[];
  mvp?: ClearMember;
  /** 새로 열림 (강조 띠) */
  opens: string[];
  /** 다음 예고: 머리말(진홍 띠) · 묘사 한 문장 · (수치) */
  next: { head: string; line: string; num: string };
  art: string;
  focus?: [number, number];
  /** 도장이 남기는 띠 글 · 터지는 낱말 */
  stampTag: string;
  stampWord: string;
  back?: string;
  go: string;
}

/** 도장 (임시 — UI-26 도장 자국 받기 전) · 으뜸 왕관 */
const STAMP = 'ui/icons16/royalSeal.png';
const CROWN = 'ui/props/ic32-crown-gold.png';

const rowsHtml = (rows: ClearData['rows']): string =>
  // 숫자 줄은 div(집계 tally가 째깍 올린다), 글 줄은 p(집계가 건드리지 않는다)
  rows.map((r) => { const tg = typeof r.v === 'number' ? 'div' : 'p'; return `<${tg} class="clr-row"><span>${r.k}</span><i></i>${typeof r.v === 'number' ? `<b data-v="${r.v}">${r.v}</b>` : `<b class="txt">${r.v}</b>`}${r.unit ? `<small>${r.unit}</small>` : ''}</${tg}>`; }).join('');
const nextHtml = (n: ClearData['next']): string =>
  `<div class="clr-next"><span class="ribbon r-crimson">${n.head}</span><p class="clr-omen">${n.line}<br><span class="clr-num">(${n.num})</span></p></div>`;
/** 으뜸 한 줄 (사용자: 왕관 · 「으뜸」 · 이름 · 기물 그림 순, 수치는 한 줄에 들 때만) */
const mvpHtml = (m: ClearMember): string =>
  `<div class="clr-mvp"><img class="clr-crown" src="${CROWN}" alt=""><span class="clr-mvp-k">으뜸</span><b>${m.name}</b><span class="clr-mvp-pc">${m.pc}</span><span class="clr-mvp-s">처치 ${m.kills} · 피해 ${m.dmg}</span></div>`;
/** 쪽 띠: 칸마다 막 이름 · 반장 이름 · 도장 자국 — 이번에 찍을 쪽(now)은 찍힐 때까지 비어 있다 */
const tabsHtml = (d: ClearData): string => {
  const done = d.tabs.filter((t) => t.boss).length;
  return `<div class="clr-tabs">${d.tabs.map((t, i) => {
    const now = !!t.boss && (d.mode === 'run' || i === done - 1);
    const st = t.boss ? (now ? 'now' : 'done') : i === done ? 'next' : 'todo';
    return `<div class="clr-tab ${st}"><b>${t.label}</b><span>${t.boss ?? (st === 'next' ? '다음' : '—')}</span>${t.boss ? `<img class="clr-seal" src="${STAMP}" alt="">` : ''}</div>`;
  }).join('')}</div>`;
};

/** 도장 내리꽂기 (예비 들어 올림 → 터짐 → 출렁): target 위에 도장을 띄웠다가 내리꽂고, 띠를 남긴다 */
const slam = async (scr: HTMLElement, L: Layer, target: HTMLElement, word: string): Promise<void> => {
  const s = document.createElement('img');
  s.src = STAMP;
  s.className = 'clr-slam';
  const a = scr.getBoundingClientRect(), b = target.getBoundingClientRect();
  s.style.left = `${Math.round(b.left - a.left + b.width / 2)}px`;
  s.style.top = `${Math.round(b.top - a.top + b.height / 2)}px`;
  scr.appendChild(s);
  if (calm()) { s.remove(); target.classList.add('on'); return; }
  sfx('lift');
  await wait(330); // 예비: 들어 올려 모은다
  sfx('stamp');
  target.classList.add('on');
  replay(target, 'clr-hit');
  burstWord(L, target, word, 0xfacc15);
  shakeEl(scr, 3, 220);
  await wait(420);
  s.classList.add('clr-lift');
  await wait(240);
  s.remove();
};

/** 으뜸 줄이 한 줄을 넘으면 수치를 걷는다 (한 줄 약속) */
const fitMvp = (el: HTMLElement): void => {
  const m = el.querySelector<HTMLElement>('.clr-mvp');
  const s = m?.querySelector<HTMLElement>('.clr-mvp-s');
  if (!m || !s) return;
  s.hidden = false;
  if (m.scrollWidth > m.clientWidth + 1) s.hidden = true;
};

/** 막 장부 하나를 연다. 단추를 누르면 끝난다 */
export const clearScreen = async (d: ClearData): Promise<'back' | 'go'> => {
  document.querySelector('.clr')?.remove();
  const el = document.createElement('div');
  el.className = `clr kit clr-${d.mode}`;
  const btns = btnRowHtml({ back: d.back ? { label: d.back, attrs: 'data-back' } : undefined, go: { label: d.go, attrs: 'data-go' } });
  const opens = d.opens.length ? `<div class="clr-opens"><span class="clr-lab">새로 열림</span>${d.opens.map((o) => `<span class="ribbon">${o}</span>`).join('')}</div>` : '';
  el.innerHTML = `<div class="clr-art frame-scene"><img src="scenes/${d.art}.png" alt="" data-cover data-fx="${d.focus?.[0] ?? 0.5}" data-fy="${d.focus?.[1] ?? 0.5}">${opens}<span class="ribbon r-crimson clr-stamp">${d.stampTag}</span></div>
    <div class="clr-work"><div class="clr-head"><div class="plate">${d.title}</div>${d.tag}</div>${tabsHtml(d)}<div class="slip clr-cert"><div class="clr-rows">${rowsHtml(d.rows)}</div>${d.mvp ? mvpHtml(d.mvp) : ''}</div>${nextHtml(d.next)}${btns}</div>`;
  document.body.appendChild(el);
  const fit = (): void => {
    el.querySelectorAll<HTMLImageElement>('img[data-cover]').forEach((im) => (im.complete ? coverArt(im) : im.addEventListener('load', () => coverArt(im), { once: true })));
    fitMvp(el);
  };
  fit();
  requestAnimationFrame(fit);
  void document.fonts?.ready.then(fit);
  window.addEventListener('resize', fit);
  const L = new Layer(el, d.mode.length * 37);
  const done = new Promise<'back' | 'go'>((r) => {
    el.querySelector('[data-back]')?.addEventListener('click', () => r('back'), { once: true });
    el.querySelector('[data-go]')!.addEventListener('click', () => r('go'), { once: true });
  });
  const later = [...el.querySelectorAll<HTMLElement>('.clr-next, .clr-opens')];
  later.forEach((w) => w.classList.add('clr-wait'));
  await wait(320);
  // 쪽 띠: 지난 쪽은 찍혀 있고, 이번 쪽(출하 끝이면 모든 쪽)에 차례로 도장 자국
  const now = [...el.querySelectorAll<HTMLElement>('.clr-tab.now')];
  now.forEach((t) => t.classList.add('clr-wait'));
  for (const t of now) { t.classList.remove('clr-wait'); replay(t, 'clr-drop'); sfx('stamp', 3); burstWord(L, t.querySelector<HTMLElement>('.clr-seal') ?? t, '', 0xe5262f); await wait(d.mode === 'run' ? 260 : 120); }
  tally(el.querySelector<HTMLElement>('.clr-rows')!);
  const n = d.rows.reduce((t, r) => t + (typeof r.v === 'number' ? 120 + Math.min(10, r.v) * 50 + 90 : 210), 200);
  await wait(Math.min(n, 3200));
  const mv = el.querySelector<HTMLElement>('.clr-mvp');
  if (mv) { mv.classList.add('on'); replay(mv, 'in'); sfx('coin', 8); await wait(120); replay(mv.querySelector<HTMLElement>('.clr-crown')!, 'clr-crown-in'); await wait(380); }
  await slam(el, L, el.querySelector<HTMLElement>('.clr-stamp')!, d.stampWord);
  for (const w of later) { w.classList.remove('clr-wait'); replay(w, 'in'); sfx('tap', 5); await wait(200); }
  const res = await done;
  sfx('tap');
  window.removeEventListener('resize', fit);
  L.stop();
  el.remove();
  return res;
};
