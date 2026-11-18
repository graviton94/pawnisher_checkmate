/**
 * 왕위 결정 화면 「금단의 승급대 앞에서」(바이블 THR, D-451). 첫째~셋째 왕관은 [돌아본다] [왕관을 쓴다], 넷째 왕관만 [왕관을 쓴다] [왕관을 던진다]. 진행·저장은 호출자가.
 * art가 없으면 검은 화면 가운데 글 (D-582 — VA-08 취소): 그림 없이 먹 위 한가운데 글 단, 단추는 철판 없는 글 단추. 진엔딩 첫 컷(같은 먹)으로 끊김 없이 이어진다.
 */
import { sfx } from '../audio/sfx';
import { THRONE_TEXT, lookBackCut, testimony, type Face } from '../data/script';
import { playCuts } from './opening';
import { josa } from '../data/josa';
import { STORY_COUNT, chapterLabel } from '../data/campaign';
import { pxOut, replay, typeIn, typeSkip } from './fx3';
import { btnHtml, coverArt, sceneFocus, type WinBtn } from './uikit';
import { VN_VOID } from '../data/vn';
export const promotionScene = (o: { chapter: number; prev?: string[]; art?: string; companion?: string; promisedLost?: string; faces?: Record<string, Face> }): Promise<'throne' | 'depart'> => new Promise((resolve) => {
  const tm = testimony(Math.min(STORY_COUNT - 1, o.chapter), o.prev);
  const final = o.chapter === STORY_COUNT - 1;
  const T = THRONE_TEXT;
  const el = document.createElement('section');
  const bare = !o.art;
  el.className = `promotion kit${bare ? ' void' : ''}`;
  el.style.setProperty('--void-w', String(VN_VOID.width));
  el.style.setProperty('--void-ws', String(VN_VOID.widthSmall));
  /** 단추: 그림 판은 키트 철판 단추, 먹 판(D-582)은 글 단추(밑줄 · 초점 ▶) */
  const choice = (b: WinBtn): string => (bare ? `<button type="button" class="pm-choice${b.kind === 'brass' ? ' is-key' : ''}" ${b.attrs ?? ''}><span>${b.label}</span></button>` : btnHtml(b));
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'promotion-title');
  el.innerHTML = `${o.art ? `<div class="pm-art"><img src="scenes/${o.art}.png" data-cover data-fx="0.72" data-fy="0.5" alt=""></div>` : ''}
    <div class="pm-content"><header><p class="pm-chapter">${chapterLabel(o.chapter)}</p><h2 id="promotion-title">${T.title}</h2></header>
    <div class="pm-dialogue"><b class="pm-who">도금왕</b><p class="pm-say"></p></div>
    <div class="pm-inner"><b class="pm-who">종이왕</b><p>‘${tm.mono}’</p><p class="pm-stuck" aria-live="polite" hidden></p></div>
    <footer><p class="pm-prompt">${final ? T.promptFinal : T.prompt}</p><div class="pm-actions">${final ? choice({ label: T.crown, attrs: 'data-promote' }) + choice({ label: T.throw, attrs: 'data-lay', kind: 'brass' }) : choice({ label: T.look, attrs: 'data-lay' }) + choice({ label: T.crown, attrs: 'data-promote', kind: 'brass' })}</div></footer></div>`;
  document.body.appendChild(el);
  const release = sceneFocus(el), art = el.querySelector<HTMLImageElement>('.pm-art img');
  if (art) { art.addEventListener('load', () => coverArt(art)); if (art.complete) coverArt(art); }
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
  let looking = false;
  el.querySelector('[data-lay]')!.addEventListener('click', () => {
    if (final) return finish('depart');
    if (looking || chosen) return;
    looking = true;
    // 「돌아본다」 (#31 · D-504): 문구를 바꿔 끼우던 것을 실제 돌아보는 짧은 컷으로 — 컷이 글을 끝까지 읽힌 뒤 결정 화면으로 돌아온다.
    // 돌아온 화면에는 돌아본 줄이 다 찍힌 채 남고(끊기지 않게), [돌아봤다]는 잠기고 [왕관을 쓴다]만 남는다.
    typeSkip(say); sfx('tap');
    const lay = el.querySelector<HTMLButtonElement>('[data-lay]')!;
    const crown = el.querySelector<HTMLButtonElement>('[data-promote]')!;
    lay.disabled = true; crown.disabled = true;
    void playCuts([lookBackCut({ companionWithJosa: o.companion ? josa(o.companion, '이') : undefined, lost: o.companion ? undefined : o.promisedLost })], { faces: o.faces }).then(() => {
      const memo = el.querySelector<HTMLElement>('.pm-stuck')!;
      // 실제 동료를 돌아보는 행동이다. 거절할 수 있는 척하는 비활성 선택지는 없다.
      memo.textContent = o.companion ? T.lookAt(josa(o.companion, '이')) : o.promisedLost ? T.lookLost(o.promisedLost) : T.lookNone;
      // 돌아본 줄이 단추 위 안내 줄 자리를 대신한다 (겹치지 않게 — 915×412에서 안내 줄과 겹쳤다)
      memo.hidden = false; el.querySelector<HTMLElement>('.pm-prompt')!.hidden = true;
      replay(el.querySelector<HTMLElement>('.pm-inner')!, 'in');
      (lay.querySelector('span') ?? lay).textContent = T.looked; crown.disabled = false; crown.focus();
    });
  });
  replay(el.querySelector<HTMLElement>('.pm-content')!, 'in');
});
