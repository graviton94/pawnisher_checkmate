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
