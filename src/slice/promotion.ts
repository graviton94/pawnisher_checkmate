/** 왕관 앞의 결정. 진행 상태는 호출자가 관리하고, 승급을 확정할 때만 끝난다. */
import { sfx } from '../audio/sfx';
import { PROMOTE_TEXT } from '../data/script';
import { pxOut, replay, typeIn, typeSkip } from './fx3';
import { btnHtml, coverArt, sceneFocus } from './uikit';

export const promotionScene = (o: { asc: number; art: string; say: string; mono: string; echo?: string }): Promise<void> =>
  new Promise((resolve) => {
    const el = document.createElement('section');
    el.className = 'promotion kit';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'promotion-title');
    el.innerHTML = `<div class="pm-art"><img src="scenes/${o.art}.png" data-cover data-fy="0.38" alt="왕관을 쓴 도금왕"></div>
      <div class="pm-content"><header><p class="pm-chapter">승급 ${o.asc} · 마지막 공정</p><h2 id="promotion-title">왕관 앞에서</h2></header>
      <div class="pm-dialogue"><b class="pm-who">도금왕</b><p class="pm-say"></p>${o.echo ? `<p class="pm-echo">“${o.echo}”</p>` : ''}</div>
      <div class="pm-inner"><b class="pm-who">종이왕</b><p>‘${o.mono}’</p><p class="pm-stuck" aria-live="polite" hidden>${PROMOTE_TEXT.hint}<br>‘${PROMOTE_TEXT.stuck}’</p></div>
      <footer><p class="pm-prompt">왕관에 손을 뻗는다.</p><div class="pm-actions">${btnHtml({ label: PROMOTE_TEXT.lay, attrs: 'data-lay' })}${btnHtml({ label: PROMOTE_TEXT.promote, attrs: 'data-promote', kind: 'brass' })}</div></footer></div>`;
    document.body.appendChild(el);
    const release = sceneFocus(el);
    const art = el.querySelector<HTMLImageElement>('.pm-art img')!;
    art.addEventListener('load', () => coverArt(art));
    if (art.complete) coverArt(art);
    art.addEventListener('error', () => { art.src = 'scenes/boss-gilded.png'; }, { once: true });
    const say = el.querySelector<HTMLElement>('.pm-say')!;
    void typeIn(say, `“${o.say}”`, 30, undefined, () => el.isConnected);
    el.querySelector('.pm-dialogue')!.addEventListener('click', () => typeSkip(say));
    const lay = el.querySelector<HTMLButtonElement>('[data-lay]')!;
    let choosing = false;
    lay.addEventListener('click', () => {
      if (lay.disabled || choosing) return;
      lay.disabled = true;
      typeSkip(say);
      sfx('threat');
      replay(lay, 'tremble');
      // 이 회차의 거절 시도는 기존 서사대로 실패한다. 승급 확정으로 취급하지 않는다.
      window.setTimeout(() => {
        if (!el.isConnected || choosing) return;
        el.querySelector<HTMLElement>('.pm-stuck')!.hidden = false;
        el.querySelector<HTMLElement>('.pm-prompt')!.textContent = '아직 손을 거둘 수 없다.';
        replay(el.querySelector<HTMLElement>('.pm-inner')!, 'in');
      }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 300 + o.asc * 180);
    });
    el.querySelector<HTMLButtonElement>('[data-promote]')!.addEventListener('click', () => {
      if (choosing) return;
      choosing = true;
      el.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = true; });
      sfx('submit');
      pxOut(el, () => { release(); el.remove(); resolve(); }, 240);
    });
    replay(el.querySelector<HTMLElement>('.pm-content')!, 'in');
  });
