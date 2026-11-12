/** D-425 왕의 몸과 동료 사이의 결정. 장 진행·저장은 호출자가 처리한다. */
import { sfx } from '../audio/sfx';
import { TESTIMONY } from '../data/script';
import { chapterLabel } from '../data/campaign';
import { pxOut, replay, typeIn, typeSkip } from './fx3';
import { btnHtml, coverArt, sceneFocus } from './uikit';
export const promotionScene = (o: { chapter: number; art: string; companion?: string; promisedLost?: string }): Promise<'throne' | 'depart'> => new Promise((resolve) => {
  const tm = TESTIMONY[Math.min(2, o.chapter)];
  const final = o.chapter === 2;
  const el = document.createElement('section');
  el.className = 'promotion kit';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'promotion-title');
  el.innerHTML = `<div class="pm-art"><img src="scenes/${o.art}.png" data-cover data-fy="0.38" alt="왕의 몸을 권하는 도금왕"></div>
    <div class="pm-content"><header><p class="pm-chapter">${chapterLabel(o.chapter)}</p><h2 id="promotion-title">왕의 몸 앞에서</h2></header>
    <div class="pm-dialogue"><b class="pm-who">도금왕</b><p class="pm-say"></p></div>
    <div class="pm-inner"><b class="pm-who">종이왕</b><p>‘${tm.mono}’</p><p class="pm-stuck" aria-live="polite" hidden></p></div>
    <footer><p class="pm-prompt">${final ? '왕이 되어 남거나, 이 몸으로 나간다.' : '그는 함께 나갈 약속을 알고 있었다.'}</p><div class="pm-actions">${btnHtml({ label: final ? '함께 나간다' : '돌아본다', attrs: 'data-lay' })}${btnHtml({ label: '왕이 된다', attrs: 'data-promote', kind: 'brass' })}</div></footer></div>`;
  document.body.appendChild(el);
  const release = sceneFocus(el), art = el.querySelector<HTMLImageElement>('.pm-art img')!;
  art.addEventListener('load', () => coverArt(art)); if (art.complete) coverArt(art);
  const say = el.querySelector<HTMLElement>('.pm-say')!;
  void typeIn(say, `“${tm.say}”`, 30, undefined, () => el.isConnected);
  el.querySelector('.pm-dialogue')!.addEventListener('click', () => typeSkip(say));
  let chosen = false;
  const finish = (choice: 'throne' | 'depart'): void => {
    if (chosen) return; chosen = true;
    el.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = true; });
    sfx('submit'); pxOut(el, () => { release(); el.remove(); resolve(choice); }, 240);
  };
  el.querySelector('[data-promote]')!.addEventListener('click', () => finish('throne'));
  el.querySelector('[data-lay]')!.addEventListener('click', () => {
    if (final) return finish('depart');
    const memo = el.querySelector<HTMLElement>('.pm-stuck')!;
    // 실제 동료를 돌아보는 행동이다. 거절할 수 있는 척하는 비활성 선택지는 없다.
    memo.textContent = o.companion ? `${o.companion}이 기다리고 있다.` : o.promisedLost ? `${o.promisedLost}의 자리는 비어 있다.` : '출하 자리에는 빈칸만 남았다.';
    memo.hidden = false; typeSkip(say); sfx('tap');
  });
  replay(el.querySelector<HTMLElement>('.pm-content')!, 'in');
});
