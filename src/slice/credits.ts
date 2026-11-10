/**
 * 크레딧 · 기록 사진 (각본 S11, D-279 · 크레딧 두 줄 D-286): 한 장씩 계단 프레임으로 나타나고 도트로 사라진다 (D-216 — 선형 슬라이드 금지).
 * D-403: 모든 출하 완주(승급 엔딩 0 ~ 12 · 엔딩 A · 진 엔딩)가 엔딩이다 — 크레딧은 그 뒤마다 돈다.
 * 장 = 제목 → 크레딧 두 줄 → 기록 사진(분대 도트 한 줄 「단체 사진」 + 출하 몇 번째 · 날짜, 진 엔딩만 기록지 12) → 닫는 장(close — 출하 끝 장부).
 * 닫는 장은 크레딧 그림 위에 출하 끝 장부(actclear 「정품 판정」)를 연다 — 따로 서는 결과 화면은 없다(같은 것을 두 번 보이지 않는다).
 */
import { sfx } from '../audio/sfx';
import type { PieceType } from '../engine';
import { CREDIT_TEXT, CREDITS, STUDIO_URL } from '../data/credits';
import { pieceImg } from '../ui/sprites';
import { pxOut, replay } from './fx3';
import { cutChromeHtml, cutSay } from './uikit';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export const creditsScene = (crew: PieceType[], meta: string, o: { record?: boolean; close?: () => Promise<unknown> } = {}): Promise<void> =>
  new Promise((resolve) => {
    const pages = [
      `<h2 class="cr-title">${CREDIT_TEXT.title}</h2>`,
      // 크레딧은 두 줄 한 장 (D-286): Made by 스튜디오(+주소) · Coworked by Claude
      `${CREDITS.map((c, k) => `<p class="cr-role">${c.role}</p>${c.names.map((n) => `<p class="cr-name${k === 0 ? ' cr-lead' : ''}">${n}</p>`).join('')}${k === 0 ? `<p class="cr-meta">${STUDIO_URL.replace(/^https:\/\//, '').replace(/\/$/, '')}</p>` : ''}`).join('<i class="cr-gap"></i>')}`,
      `<p class="cr-role">${CREDIT_TEXT.photo}</p><div class="cr-photo"><span class="cr-pc king">${pieceImg('P', 0, 'large', 64)}<img class="cr-crown" src="ui/hud/paper-crown.png" alt=""></span>${crew.map((t) => `<span class="cr-pc">${pieceImg(t, 0, 'large', 64)}</span>`).join('')}</div><p class="cr-meta">${meta}</p>`,
    ];
    const el = document.createElement('div');
    el.className = 'credits kit';
    // 크레딧 배경 E-06 (D-346) — 받기 전엔 검은 바탕. 아래 자막 띠 · ▼는 모든 컷과 같은 자리 (D-397) — 기록지 12는 마지막 장 띠에
    el.innerHTML = `<img class="cr-bg" src="scenes/credits-bg.png" alt="" onerror="this.remove()"><div class="cr-page"></div>${cutChromeHtml()}`;
    document.body.appendChild(el);
    const page = el.querySelector<HTMLElement>('.cr-page')!;
    let i = -1;
    const next = (): void => {
      i += 1;
      if (i >= pages.length) {
        if (!o.close) return pxOut(el, () => { el.remove(); resolve(); }, 300);
        // 닫는 장: 기록 사진을 걷고(도트 퇴장) 크레딧 그림 위에 출하 끝 장부 — 단추를 누를 때까지 그 자리
        el.removeEventListener('click', next);
        el.classList.add('cr-closing');
        return pxOut(page, () => {
          page.innerHTML = '';
          void o.close!().then(() => { el.remove(); resolve(); });
        }, 240);
      }
      page.innerHTML = pages[i];
      const say = i === pages.length - 1 && o.record ? [{ k: 'n' as const, t: CREDIT_TEXT.record }] : [];
      cutSay(el, say);
      // 글이 없는 장(제목 · 크레딧)은 빈 띠를 걷는다 — ▼ 자리만 남은 빈 먹 띠 (D-399). 앞 두 장은 저절로 넘어간다
      el.querySelector<HTMLElement>('.cut-sub')?.style.setProperty('visibility', say.length ? '' : 'hidden');
      replay(page, 'in');
      sfx('tap', 3);
    };
    el.addEventListener('click', next);
    next();
    // 기록 사진 전까지는 저절로 넘긴다 (탭하면 바로)
    const auto = (): void => { if (!el.isConnected || i >= pages.length - 1) return; window.setTimeout(() => { if (el.isConnected && i < pages.length - 1) { next(); auto(); } }, calm() ? 1200 : 2600); };
    auto();
  });
