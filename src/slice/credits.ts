/**
 * 크레딧 · 기록 사진 (각본 S11, D-279): 진 엔딩 뒤. 한 장씩 계단 프레임으로 나타나고 도트로 사라진다 (D-216 — 선형 슬라이드 금지).
 * 마지막 장 = 기록 사진: 이번 출하의 분대 도트를 한 줄로 세운 「단체 사진」 + 기록지 12.
 */
import { sfx } from '../audio/sfx';
import type { PieceType } from '../engine';
import { CREDIT_TEXT, CREDITS } from '../data/credits';
import { pieceImg } from '../ui/sprites';
import { pxOut, replay } from './fx3';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const creditsScene = (crew: PieceType[], meta: string): Promise<void> =>
  new Promise((resolve) => {
    const pages = [
      `<h2 class="cr-title">${CREDIT_TEXT.title}</h2>`,
      ...CREDITS.map((c) => `<p class="cr-role">${c.role}</p>${c.names.map((n) => `<p class="cr-name">${n}</p>`).join('')}`),
      `<p class="cr-name">${CREDIT_TEXT.thanks}</p>`,
      `<p class="cr-role">${CREDIT_TEXT.photo}</p><div class="cr-photo"><span class="cr-pc king">${pieceImg('P', 0, 'large', 64)}<img class="cr-crown" src="ui/hud/paper-crown.png" alt=""></span>${crew.map((t) => `<span class="cr-pc">${pieceImg(t, 0, 'large', 64)}</span>`).join('')}</div><p class="cr-meta">${meta}</p><p class="cr-rec">${CREDIT_TEXT.record}</p>`,
    ];
    const el = document.createElement('div');
    el.className = 'credits';
    el.innerHTML = `<div class="cr-page"></div><p class="pl-tap">▼</p>`;
    document.body.appendChild(el);
    const page = el.querySelector<HTMLElement>('.cr-page')!;
    let i = -1;
    const next = (): void => {
      i += 1;
      if (i >= pages.length) return pxOut(el, () => { el.remove(); resolve(); }, 300);
      page.innerHTML = pages[i];
      replay(page, 'in');
      sfx('tap', 3);
    };
    el.addEventListener('click', next);
    next();
    // 기록 사진 전까지는 저절로 넘긴다 (탭하면 바로)
    const auto = (): void => { if (!el.isConnected || i >= pages.length - 1) return; window.setTimeout(() => { if (el.isConnected && i < pages.length - 1) { next(); auto(); } }, calm() ? 1200 : 2600); };
    auto();
  });
