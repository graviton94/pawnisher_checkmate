/** 출하 뒤 크레딧. 그림 · 이름 · 역할을 읽고 결과 장부로 간다. */
import { sfx } from '../audio/sfx';
import type { PieceType } from '../engine';
import { CREDIT_TEXT, CREDITS, STUDIO_URL } from '../data/credits';
import { PIECE_NAMES_KO } from '../data/pieces';
import { pxOut, replay } from './fx3';
import { btnHtml, coverArt, sceneFocus } from './uikit';

export interface CreditMember { t: PieceType; name: string; fallen?: boolean }
const escape = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const creditsScene = (crew: CreditMember[], meta: string, o: { record?: boolean; ending?: string; close?: () => Promise<unknown> } = {}): Promise<void> =>
  new Promise((resolve) => {
    const groups: CreditMember[][] = [];
    // 장당 여섯 이름. 긴 출하의 명단도 글자를 줄이거나 잘라 내지 않는다.
    for (let k = 0; k < crew.length || k === 0; k += 6) groups.push(crew.slice(k, k + 6));
    const pages = groups.map((group) => `<p class="cr-kicker">${escape(o.ending ?? '출하 완료')}</p><h2 class="cr-title">함께 오른 이름</h2>
      <p class="cr-meta">${escape(meta)}</p>
      <div class="cr-cast"><div class="cr-person cr-leader"><b>종이왕</b><span>분대를 이끈 폰</span></div>${group.map((u) => `<div class="cr-person"><b>${escape(u.name)}</b><span>${PIECE_NAMES_KO[u.t]}${u.fallen ? ' · 돌아오지 못함' : ''}</span></div>`).join('')}</div>`);
    pages.push(`<p class="cr-kicker">${CREDIT_TEXT.title}</p><h2 class="cr-title">만든 사람들</h2><div class="cr-makers">${CREDITS.map((c, k) => `<div><p class="cr-role">${c.role}</p>${c.names.map((n) => `<p class="cr-name">${n}</p>`).join('')}${k === 0 ? `<p class="cr-meta">${STUDIO_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}</p>` : ''}</div>`).join('')}</div>`);
    const el = document.createElement('section');
    el.className = 'credits kit';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', '출하 크레딧');
    el.innerHTML = `<div class="cr-visual"><img class="cr-bg" src="scenes/credits-bg.png" data-cover alt="출하를 기다리는 열린 상자">${o.record ? `<p class="cr-record">${CREDIT_TEXT.record}</p>` : ''}</div><div class="cr-content"><div class="cr-page" aria-live="polite"></div><footer><span class="cr-count"></span>${btnHtml({ label: '다음', attrs: 'data-cr-next', kind: 'brass' })}</footer></div>${o.close ? btnHtml({ label: '결과를 본다', attrs: 'data-cr-result', cls: 'cr-skip' }) : ''}`;
    document.body.appendChild(el);
    const bg = el.querySelector<HTMLImageElement>('.cr-bg')!;
    bg.addEventListener('load', () => coverArt(bg));
    if (bg.complete) coverArt(bg);
    const release = sceneFocus(el);
    const page = el.querySelector<HTMLElement>('.cr-page')!;
    const nextBtn = el.querySelector<HTMLButtonElement>('[data-cr-next]')!;
    let i = 0;
    let closing = false;
    const show = (): void => {
      page.innerHTML = pages[i];
      const skip = el.querySelector<HTMLButtonElement>('[data-cr-result]');
      if (skip) skip.hidden = i === pages.length - 1;
      el.querySelector('.cr-count')!.textContent = `${i + 1} / ${pages.length}`;
      nextBtn.textContent = i === pages.length - 1 ? o.close ? '결과를 본다' : '마친다' : '다음';
      replay(page, 'in');
    };
    const finish = (): void => {
      if (closing) return;
      closing = true;
      el.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = true; });
      sfx('submit');
      // 장부를 뒤에 먼저 세워 화면 사이에 전투판이 비치지 않게 한다.
      if (o.close) {
        release();
        el.classList.add('cr-closing');
        void o.close().then(() => { el.remove(); resolve(); });
      } else pxOut(el, () => { release(); el.remove(); resolve(); }, 240);
    };
    nextBtn.addEventListener('click', () => {
      if (closing) return;
      sfx('tap', 3);
      if (++i >= pages.length) finish();
      else show();
    });
    el.querySelector('[data-cr-result]')?.addEventListener('click', finish);
    show();
  });
