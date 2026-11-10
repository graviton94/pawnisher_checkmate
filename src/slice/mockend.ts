/**
 * 시안 (2026-11-10, 사용자: 「출하 완료 화면은 다른 쪽에 비해 임팩트가 없다 — 막을 끝내도 보상받는 느낌이 없다」 ·
 * 「『흑 기물의 쇠는 더 두껍게 붓는다』는 무슨 말인지 모르겠다」 · 「『출하를 마쳤습니다』 + 이력 디자인이 비고 허전하다」).
 * 기본 화면은 그대로 두고 `?mock=end-a | end-b | end-c`로만 연다. 고르면 그 시안만 기본으로 옮기고 이 파일은 걷는다.
 *  end-a 출하 증명서: 장면 그림 + 종이 증명서(장부 줄 · 으뜸 분대원) → 도장이 내리꽂혀 「출하 합격」 → 다음 출하 예고
 *  end-b 분대 단상: 살아 돌아온 분대원이 한 줄로 서고(처치 · 피해) → 으뜸에게 왕관이 내리꽂힘 → 수치 쪽지 · 다음 출하 예고
 *  end-c 막 마침 장부: 막 반장을 쓰러뜨릴 때마다 — 쓰러진 반장 그림에 「격파」 도장 → 이번 막 장부 → 다음 막 예고(적이 얼마나 단단해지나)
 * 박자(D-180 · D-263): 예비(들어 올림) → 터짐(계단 고리 · 도트 불똥 · 도트 낱말 · 흔들림) → 출렁. 투명도 보간 · 선형 미끄럼 없음.
 * 그림은 받은 것만 빌린다(D-386): 장면 end-clear · boss-fall-* · 아이콘 royalSeal(도장) · ic32-crown-gold(왕관) · UI-24 강조 띠 · UI-25 결과 쪽지.
 */
import { sfx } from '../audio/sfx';
import { burstWord, Layer } from './evstage';
import { replay, shakeEl, tally } from './fx3';
import { btnRowHtml, coverArt } from './uikit';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, calm() ? Math.min(ms, 60) : ms));

/** 분대원 한 줄 (이번 출하 · 이번 막) */
export interface MockMember { name: string; img: string; kills: number; dmg: number; fallen?: boolean }
/** 출하 완료 · 막 마침 시안에 넘기는 값 — 모두 게임이 이미 세고 있는 값 */
export interface MockEnd {
  title: string;
  tag: string;
  /** 장부 줄: 이름 · 값 (값이 숫자면 째깍 올라간다) */
  rows: { k: string; v: number | string; unit?: string }[];
  members: MockMember[];
  /** 으뜸(처치가 가장 많은 분대원) 번호 — members 안 */
  mvp: number;
  /** 새로 열림 · 얻은 것 (강조 띠) */
  opens: string[];
  /** 다음 예고: 머리말(강조 띠) · 묘사 한 문장 · (수치) */
  next: { head: string; line: string; num: string };
  art: string;
  focus?: [number, number];
  /** 도장이 남기는 띠 글 · 터지는 낱말 */
  stampTag: string;
  stampWord: string;
  back?: string;
  go: string;
}

const STAMP = 'ui/icons16/royalSeal.png';
const CROWN = 'ui/props/ic32-crown-gold.png';

const rowsHtml = (rows: MockEnd['rows']): string =>
  // 숫자 줄은 div(집계 tally가 째깍 올린다), 글 줄은 p(집계가 건드리지 않는다)
  rows.map((r) => { const tg = typeof r.v === 'number' ? 'div' : 'p'; return `<${tg} class="mk-row"><span>${r.k}</span><i></i>${typeof r.v === 'number' ? `<b data-v="${r.v}">${r.v}</b>` : `<b class="txt">${r.v}</b>`}${r.unit ? `<small>${r.unit}</small>` : ''}</${tg}>`; }).join('');
const nextHtml = (n: MockEnd['next']): string =>
  `<div class="mk-next"><span class="ribbon r-crimson">${n.head}</span><p class="mk-omen">${n.line}<br><span class="mk-num">(${n.num})</span></p></div>`;
const mvpHtml = (m: MockMember): string =>
  `<div class="mk-mvp"><img src="${CROWN}" alt=""><span class="mk-mvp-k">으뜸</span><b>${m.name}</b><span class="mk-mvp-s">처치 ${m.kills} · 피해 ${m.dmg}</span></div>`;

/** 도장 내리꽂기 (예비 들어 올림 → 터짐 → 출렁): target 위에 도장을 띄웠다가 내리꽂고, 띠를 남긴다 */
const slam = async (scr: HTMLElement, L: Layer, target: HTMLElement, img: string, word: string, col = 0xfacc15): Promise<void> => {
  const s = document.createElement('img');
  s.src = img;
  s.className = 'mk-slam';
  const a = scr.getBoundingClientRect(), b = target.getBoundingClientRect();
  s.style.left = `${Math.round(b.left - a.left + b.width / 2)}px`;
  s.style.top = `${Math.round(b.top - a.top + b.height / 2)}px`;
  scr.appendChild(s);
  if (calm()) { s.remove(); target.classList.add('on'); return; }
  sfx('lift');
  await wait(330); // 예비: 들어 올려 모은다
  sfx('stamp');
  target.classList.add('on');
  replay(target, 'mk-hit');
  burstWord(L, target, word, col);
  shakeEl(scr, 3, 220);
  await wait(420);
  s.classList.add('mk-lift');
  await wait(240);
  s.remove();
};

/** 시안 화면 하나를 연다. 단추를 누르면 끝난다 */
export const mockEndScreen = async (kind: 'end-a' | 'end-b' | 'end-c', d: MockEnd): Promise<'back' | 'go'> => {
  document.querySelector('.mk-end')?.remove();
  const el = document.createElement('div');
  el.className = `mk-end kit mk-${kind}`;
  const btns = btnRowHtml({ back: d.back ? { label: d.back, attrs: 'data-back' } : undefined, go: { label: d.go, attrs: 'data-go' } });
  const head = `<div class="mk-head"><div class="plate">${d.title}</div>${d.tag}</div>`;
  const opens = d.opens.length ? `<div class="mk-opens"><span class="mk-lab">새로 열림</span>${d.opens.map((o) => `<span class="ribbon">${o}</span>`).join('')}</div>` : '';
  const mvp = d.members[d.mvp];
  if (kind === 'end-a' || kind === 'end-c') {
    // 새로 열린 것은 장면 액자 위 왼쪽에 띠로 붙인다 — 오른쪽 단은 증명서 · 다음 예고 · 단추만 (667×375에서도 접히지 않게)
    el.innerHTML = `<div class="mk-art frame-scene"><img src="scenes/${d.art}.png" alt="" data-cover data-fx="${d.focus?.[0] ?? 0.5}" data-fy="${d.focus?.[1] ?? 0.5}">${opens}<span class="ribbon r-crimson mk-stamp">${d.stampTag}</span></div>
      <div class="mk-work">${head}<div class="slip mk-cert"><div class="mk-rows">${rowsHtml(d.rows)}</div>${mvp ? mvpHtml(mvp) : ''}</div>${nextHtml(d.next)}${btns}</div>`;
  } else {
    el.innerHTML = `<div class="mk-bg"><img src="scenes/${d.art}.png" alt="" data-cover data-fx="${d.focus?.[0] ?? 0.5}" data-fy="${d.focus?.[1] ?? 0.5}"></div>${head}
      <div class="mk-line">${d.members.map((m, i) => `<div class="mk-mem${m.fallen ? ' fallen' : ''}${i === d.mvp ? ' mvp' : ''}" style="--i:${i}"><span class="mk-crown${i === d.mvp ? '' : ' none'}"><img src="${CROWN}" alt=""></span><img class="mk-pc" src="${m.img}" alt=""><b>${m.name}</b><span>${m.fallen ? '쓰러짐 · ' : ''}처치 ${m.kills} · 피해 ${m.dmg}</span></div>`).join('')}</div>
      <div class="mk-foot"><div class="slip mk-tally">${d.rows.slice(0, 4).map((r) => `<div><b data-v="${r.v}">${r.v}</b><span>${r.k}</span></div>`).join('')}</div>${nextHtml(d.next)}</div>${btns}`;
  }
  document.body.appendChild(el);
  const fit = (): void => el.querySelectorAll<HTMLImageElement>('img[data-cover]').forEach((im) => (im.complete ? coverArt(im) : im.addEventListener('load', () => coverArt(im), { once: true })));
  fit();
  requestAnimationFrame(fit);
  const L = new Layer(el, kind.length * 31);
  const done = new Promise<'back' | 'go'>((r) => {
    el.querySelector('[data-back]')?.addEventListener('click', () => r('back'), { once: true });
    el.querySelector('[data-go]')!.addEventListener('click', () => r('go'), { once: true });
  });
  // 의식: 장부가 째깍 → 도장 / 왕관 → 다음 예고가 계단으로
  const nx = el.querySelector<HTMLElement>('.mk-next')!;
  nx.classList.add('mk-wait');
  el.querySelector('.mk-opens')?.classList.add('mk-wait');
  await wait(320);
  if (kind === 'end-b') {
    const mem = [...el.querySelectorAll<HTMLElement>('.mk-mem')];
    for (const m of mem) { replay(m, 'mk-drop'); sfx('tap', 3); await wait(130); }
    await wait(260);
    const crown = el.querySelector<HTMLElement>('.mk-mem.mvp .mk-crown');
    if (crown) {
      sfx('lift');
      replay(crown, 'mk-crown-in');
      await wait(330);
      sfx('stamp');
      burstWord(L, el.querySelector<HTMLElement>('.mk-mem.mvp .mk-pc')!, '으뜸!', 0xfacc15);
      replay(el.querySelector<HTMLElement>('.mk-mem.mvp')!, 'mk-hit');
      shakeEl(el, 3, 220);
      await wait(380);
    }
    tally(el.querySelector<HTMLElement>('.mk-tally')!);
    await wait(Math.min(3600, d.rows.slice(0, 4).reduce((t, r) => t + 120 + Math.min(10, Number(r.v) || 0) * 50 + 90, 200)));
  } else {
    const rows = el.querySelector<HTMLElement>('.mk-rows')!;
    tally(rows);
    const n = d.rows.reduce((t, r) => t + (typeof r.v === 'number' ? 120 + Math.min(10, r.v) * 50 + 90 : 210), 200);
    await wait(Math.min(n, 3600));
    const mv = el.querySelector<HTMLElement>('.mk-mvp');
    if (mv) { replay(mv, 'in'); mv.classList.add('on'); sfx('coin', 8); await wait(240); }
    await slam(el, L, el.querySelector<HTMLElement>('.mk-stamp')!, STAMP, d.stampWord);
  }
  for (const w of el.querySelectorAll<HTMLElement>('.mk-wait')) { w.classList.remove('mk-wait'); replay(w, 'in'); sfx('tap', 5); await wait(200); }
  const res = await done;
  sfx('tap');
  L.stop();
  el.remove();
  return res;
};

/* ===================== 2차 시안 (사용자: 「A와 C를 바탕으로 더 발전시켜」) =====================
 * 한 가족: 막 마침 = 그 막의 장부 한 쪽에 「반장 격파」 도장 · 출하 완료 = 막마다 쪽을 모은 증명서에 「출하 합격」 도장.
 *  end2-a 펼친 장부: 왼쪽 장면 액자(막 = 쓰러진 반장 · 출하 = 완료 그림) + 도장 · 오른쪽 = 쪽 띠(1막 · 2막 · 3막 · 종막) → 장부 쪽 → 으뜸 → 다음 예고 → 오른쪽 아래 단추.
 *  end2-b 네 칸 증명서: 화면 하나 = 증명서 한 장, 칸 넷(막마다 쪽). 막 마침이면 지난 칸은 찍혀 있고, 이번 칸이 떨어져 찍히고, 다음 칸에 예고(수치)가 미리 적힌다.
 *          출하 완료면 네 칸이 차례로 떨어져 찍힌 뒤 증명서 가운데에 「출하 합격」.
 * 박자: 예비(들어 올림) → 터짐(내리꽂힘 · 계단 고리 · 도트 낱말 · 흔들림) → 출렁 — 모두 계단, 투명도 보간 없음.
 */
/** 막 한 쪽 (막 반장을 쓰러뜨릴 때 기록) */
export interface ActPage { label: string; name: string; boss: string; art: string; won: number; kills: number; gold: number; mvp?: MockMember }
export interface MockEnd2 {
  mode: 'act' | 'run';
  title: string;
  tag: string;
  /** 칸 이름 (1막 · 2막 · 3막 · 종막) */
  slots: string[];
  /** 찍힌 쪽 — 막 마침이면 마지막이 이번 쪽 */
  pages: ActPage[];
  rows: MockEnd['rows'];
  mvp?: MockMember;
  opens: string[];
  next: MockEnd['next'];
  /** 다음 칸에 미리 보일 다음 막 그림 (막 카드 act-N) */
  nextArt?: string;
  art: string;
  focus?: [number, number];
  stampTag: string;
  stampWord: string;
  back?: string;
  go: string;
}

const pcImg = (m: MockMember, cls = 'mk2-pc'): string => `<img class="${cls}" src="${m.img}" alt="">`;
const mvp2Html = (m: MockMember): string =>
  `<div class="mk-mvp mk2-mvp"><span class="mk2-mvp-pc"><img class="mk2-crown" src="${CROWN}" alt="">${pcImg(m)}</span><span class="mk-mvp-k">으뜸</span><b>${m.name}</b><span class="mk-mvp-s">처치 ${m.kills} · 피해 ${m.dmg}</span></div>`;
/** 쪽 띠 (end2-a): 칸마다 막 이름 · 반장 이름 · 도장 자국(royalSeal) — 지금 쪽은 찍힐 때까지 비어 있다 */
const tabsHtml = (d: MockEnd2): string =>
  `<div class="mk2-tabs">${d.slots.map((s, i) => {
    const p = d.pages[i];
    const now = d.mode === 'act' ? i === d.pages.length - 1 : !!p;
    const st = p ? (now ? 'now' : 'done') : i === d.pages.length ? 'next' : 'todo';
    return `<div class="mk2-tab ${st}" style="--i:${i}"><b>${s}</b><span>${p ? p.boss : st === 'next' ? '다음' : '—'}</span>${p ? `<img class="mk2-seal" src="${STAMP}" alt="">` : ''}</div>`;
  }).join('')}</div>`;
/** 증명서 칸 하나 (end2-b) */
const slotHtml = (d: MockEnd2, i: number): string => {
  const p = d.pages[i];
  const s = d.slots[i];
  if (!p) {
    if (i === d.pages.length && d.mode === 'act')
      return `<div class="mk2-slot next inset" style="--i:${i}"><span class="ribbon r-crimson">다음 · ${s}</span>${d.nextArt ? `<div class="mk2-thumb"><img src="scenes/${d.nextArt}.png" alt="" data-cover data-fx="0.5" data-fy="0.5"></div>` : ''}<p class="mk2-omen">${d.next.line}</p><p class="mk2-num">(${d.next.num})</p></div>`;
    return `<div class="mk2-slot todo inset" style="--i:${i}"><span class="mk2-todo">${s}</span></div>`;
  }
  const now = d.mode === 'run' || i === d.pages.length - 1;
  return `<div class="mk2-slot slip${now ? ' now' : ' done'}" style="--i:${i}"><span class="ribbon">${s}<i class="mk2-rn"> · ${p.name}</i></span>
    <div class="mk2-thumb"><img src="scenes/${p.art}.png" alt="" data-cover data-fx="0.5" data-fy="0.45"><span class="ribbon r-crimson mk2-fell${now ? '' : ' on'}">격파</span></div>
    <b class="mk2-boss">${p.boss}</b><p class="mk2-n">대국 ${p.won} · 처치 ${p.kills}</p><p class="mk2-n">나사 +${p.gold}</p>${p.mvp ? `<p class="mk2-n mk2-n-mvp"><img src="${CROWN}" alt="">${p.mvp.name}</p>` : ''}</div>`;
};

export const mockEnd2Screen = async (kind: 'end2-a' | 'end2-b', d: MockEnd2): Promise<'back' | 'go'> => {
  document.querySelector('.mk-end')?.remove();
  const el = document.createElement('div');
  el.className = `mk-end kit mk2-end mk-${kind} mk2-${d.mode}`;
  const btns = btnRowHtml({ back: d.back ? { label: d.back, attrs: 'data-back' } : undefined, go: { label: d.go, attrs: 'data-go' } });
  const head = `<div class="mk-head"><div class="plate">${d.title}</div>${d.tag}</div>`;
  const opens = d.opens.length ? `<div class="mk-opens"><span class="mk-lab">새로 열림</span>${d.opens.map((o) => `<span class="ribbon">${o}</span>`).join('')}</div>` : '';
  if (kind === 'end2-a') {
    el.innerHTML = `<div class="mk-art frame-scene"><img src="scenes/${d.art}.png" alt="" data-cover data-fx="${d.focus?.[0] ?? 0.5}" data-fy="${d.focus?.[1] ?? 0.5}">${opens}<span class="ribbon r-crimson mk-stamp">${d.stampTag}</span></div>
      <div class="mk-work">${head}${tabsHtml(d)}<div class="slip mk-cert"><div class="mk-rows">${rowsHtml(d.rows)}</div>${d.mvp ? mvp2Html(d.mvp) : ''}</div>${nextHtml(d.next)}${btns}</div>`;
  } else {
    const foot = d.mode === 'act'
      ? `<div class="mk2-foot">${d.mvp ? mvp2Html(d.mvp) : '<span></span>'}${btns}</div>`
      : `<div class="mk2-foot">${nextHtml(d.next)}${btns}</div>`;
    const sum = d.mode === 'run' ? `<p class="mk2-sum">${d.rows.filter((r) => typeof r.v === 'number').map((r) => `${r.k} <b>${r.v}</b>`).join(' · ')}</p>` : '';
    el.innerHTML = `<div class="mk-bg"><img src="scenes/${d.art}.png" alt="" data-cover data-fx="${d.focus?.[0] ?? 0.5}" data-fy="${d.focus?.[1] ?? 0.5}"></div>
      <div class="mk2-top">${head}${sum}${opens}</div>
      <div class="mk2-sheet" style="grid-template-columns:${d.slots.map((_, i) => (i < d.pages.length ? 'minmax(0, 1fr)' : i === d.pages.length && d.mode === 'act' ? 'minmax(0, 1.25fr)' : 'minmax(0, 0.3fr)')).join(' ')}">${d.slots.map((_, i) => slotHtml(d, i)).join('')}<span class="ribbon r-crimson mk-stamp mk2-pass">${d.stampTag}</span></div>${foot}`;
  }
  document.body.appendChild(el);
  const fit = (): void => el.querySelectorAll<HTMLImageElement>('img[data-cover]').forEach((im) => (im.complete ? coverArt(im) : im.addEventListener('load', () => coverArt(im), { once: true })));
  fit();
  requestAnimationFrame(fit);
  const L = new Layer(el, kind.length * 37);
  const done = new Promise<'back' | 'go'>((r) => {
    el.querySelector('[data-back]')?.addEventListener('click', () => r('back'), { once: true });
    el.querySelector('[data-go]')!.addEventListener('click', () => r('go'), { once: true });
  });
  const later = [...el.querySelectorAll<HTMLElement>('.mk-next, .mk-opens, .mk2-foot, .mk2-sum')];
  later.forEach((w) => w.classList.add('mk-wait'));
  await wait(320);
  if (kind === 'end2-a') {
    // 쪽 띠: 지난 쪽은 찍혀 있고, 이번 쪽(출하 완료면 모든 쪽)에 차례로 도장 자국
    const now = [...el.querySelectorAll<HTMLElement>('.mk2-tab.now')];
    now.forEach((t) => t.classList.add('mk-wait'));
    for (const t of now) { t.classList.remove('mk-wait'); replay(t, 'mk-drop'); sfx('stamp', 3); burstWord(L, t.querySelector<HTMLElement>('.mk2-seal') ?? t, '', 0xe5262f); await wait(d.mode === 'run' ? 260 : 120); }
    tally(el.querySelector<HTMLElement>('.mk-rows')!);
    const n = d.rows.reduce((t, r) => t + (typeof r.v === 'number' ? 120 + Math.min(10, r.v) * 50 + 90 : 210), 200);
    await wait(Math.min(n, 3200));
    const mv = el.querySelector<HTMLElement>('.mk-mvp');
    if (mv) { mv.classList.add('on'); replay(mv, 'in'); sfx('coin', 8); await wait(120); replay(mv.querySelector<HTMLElement>('.mk2-crown')!, 'mk-crown-in'); await wait(380); }
    await slam(el, L, el.querySelector<HTMLElement>('.mk-stamp')!, STAMP, d.stampWord);
  } else {
    const slots = [...el.querySelectorAll<HTMLElement>('.mk2-slot.now')];
    slots.forEach((s) => s.classList.add('mk-wait'));
    el.querySelectorAll<HTMLElement>('.mk2-slot.next').forEach((s) => s.classList.add('mk-wait'));
    for (const s of slots) {
      s.classList.remove('mk-wait');
      replay(s, 'mk-drop');
      sfx('tap', 3);
      await wait(d.mode === 'run' ? 220 : 260);
      const fell = s.querySelector<HTMLElement>('.mk2-fell')!;
      if (d.mode === 'act') await slam(el, L, fell, STAMP, d.stampWord);
      else { fell.classList.add('on'); replay(fell, 'mk-hit'); sfx('stamp', 4); burstWord(L, fell, '', 0xe5262f); await wait(200); }
    }
    if (d.mode === 'run') { await wait(200); await slam(el, L, el.querySelector<HTMLElement>('.mk2-pass')!, STAMP, d.stampWord); }
    for (const s of el.querySelectorAll<HTMLElement>('.mk2-slot.next')) { s.classList.remove('mk-wait'); replay(s, 'in'); sfx('tap', 5); await wait(240); }
    const mv = el.querySelector<HTMLElement>('.mk-mvp');
    if (mv) { mv.classList.add('on'); }
  }
  for (const w of later) { w.classList.remove('mk-wait'); replay(w, 'in'); sfx('tap', 5); await wait(200); }
  const mv = el.querySelector<HTMLElement>('.mk2-foot .mk-mvp');
  if (mv) { replay(mv.querySelector<HTMLElement>('.mk2-crown')!, 'mk-crown-in'); }
  const res = await done;
  sfx('tap');
  L.stop();
  el.remove();
  return res;
};
