import { CUT_UI, PROMOTE_UI, promotionFor, type Actor, type Cut, type Line } from '../data/story';
import { NPCS } from '../data/npcs';
import { sfx } from '../audio/sfx';
import { paintPortraits } from './portrait';
import type { Hud } from './hud';

/**
 * 컷신 재생기 (D-135): 컷 = 배경 + 배우 + 두 줄 글. 탭하면 다음 줄 → 다음 컷. 건너뛰기는 늘 오른쪽 위.
 * 배우는 말하는 기물 초상화(D-134) 또는 기물 도트. 그림이 오면 같은 자리에 바꿔 끼운다.
 */
const actorHtml = (a: Actor, i: number): string => {
  const style = `left:${a.x}%;top:${a.y}%;width:${a.size}px;height:${a.size}px;--d:${i * 90}ms`;
  const cls = `actor${a.dim ? ' dim' : ''}`;
  if (a.npc) return `<canvas class="${cls} portrait" data-npc="${a.npc}"${a.mood ? ` data-mood="${a.mood}"` : ''} style="${style}" aria-label="${NPCS[a.npc].name}"></canvas>`;
  const p = a.piece!;
  return `<img class="${cls}" src="pieces/l-${p.t}${p.side}.png" alt="" style="${style}">`;
};

export const lineHtml = (l: Line): string =>
  l.kind === 'say' ? `<p class="ln say"><b>${l.who}</b>${l.text}</p>` : l.kind === 'mono' ? `<p class="ln mono">‘${l.text}’</p>` : `<p class="ln tell">${l.text}</p>`;

const cutHtml = (c: Cut): string =>
  `<div class="cut-stage bg-${c.bg}${c.fx ? ` fx-${c.fx}` : ''}"><div class="cut-bg"></div>${c.actors.map(actorHtml).join('')}</div>
  <div class="cut-box">${c.lines.map(lineHtml).join('')}<span class="cut-next">▼ ${CUT_UI.next}</span></div>
  <button class="cut-skip" type="button" data-skip>${CUT_UI.skip} ›</button>`;

/** 컷 여러 장을 차례로 보여 주고, 끝나거나 건너뛰면 done */
export const playCuts = (hud: Hud, cuts: Cut[], done: () => void): void => {
  if (!cuts.length) return done();
  let ci = 0;
  let li = 0;
  let over = false;
  const finish = () => {
    if (over) return;
    over = true;
    const el = document.getElementById('scene');
    if (el) el.onclick = null;
    done();
  };
  const draw = () => {
    hud.sceneKey = `cut:${Math.random()}`;
    const el = hud.openScene(cutHtml(cuts[ci]), 'cutscene');
    li = 0;
    reveal(el);
    if (cuts[ci].fx === 'alarm') sfx('check');
    else if (cuts[ci].fx === 'stamp') sfx('stamp');
    // 장면 요소는 화면끼리 같이 쓴다: 손잡이 하나만 (쌓이지 않게), 끝나면 뗀다
    // 이 컷을 연 탭이 장면 요소까지 거품처럼 올라오므로, 손잡이는 한 틱 뒤에 단다
    el.onclick = null;
    window.setTimeout(() => {
      if (over) return;
      el.onclick = (e) => {
        if ((e.target as HTMLElement).closest('[data-skip]')) {
          sfx('tap');
          return finish();
        }
        step(el);
      };
    }, 0);
    paintPortraits(el);
  };
  const reveal = (el: HTMLElement) => {
    const ls = el.querySelectorAll<HTMLElement>('.ln');
    ls.forEach((x, i) => x.classList.toggle('on', i <= li));
    el.querySelector('.cut-next')!.classList.toggle('on', li >= ls.length - 1);
  };
  const step = (el: HTMLElement) => {
    if (over) return;
    const n = el.querySelectorAll('.ln').length;
    sfx('tap');
    if (li < n - 1) {
      li++;
      return reveal(el);
    }
    ci++;
    if (ci >= cuts.length) return finish();
    draw();
  };
  draw();
};

/**
 * 승급 화면 (D-131): 「승급한다」 · 「내려놓는다」. 압력 13 전에는 내려놓으려 해도 손이 떨리다 꺼진다.
 * choose(lay): lay=true면 내려놓았다 (진 엔딩).
 */
export const promotionScene = (hud: Hud, pressure: number, choose: (lay: boolean) => void): void => {
  const g = promotionFor(pressure);
  const free = pressure >= 13;
  hud.sceneKey = 'promotion';
  const el = hud.openScene(
    `<div class="cut-stage bg-top fx-gold"><div class="cut-bg"></div>
      <canvas class="actor portrait" data-npc="gilded" data-mood="${g.mood}" style="left:24%;top:46%;width:120px;height:120px" aria-label="${NPCS.gilded.name}"></canvas>
      <canvas class="actor portrait" data-npc="ninth" data-mood="look" style="left:72%;top:58%;width:110px;height:110px" aria-label="${NPCS.ninth.name}"></canvas>
      <div class="promo-tile" aria-hidden="true">♛</div>
    </div>
    <div class="cut-box"><p class="ln say on"><b>${NPCS.gilded.name}</b>${g.taunt}</p><p class="ln mono on">‘${g.mono}’</p>
      <div class="promo-row"><button class="btn brass promo" type="button" data-promote>${PROMOTE_UI.promote}</button><button class="btn lay${free ? ' free' : ''}" type="button" data-lay>${PROMOTE_UI.lay}</button></div>
      <p class="ln tell stuck on" hidden></p>
    </div>`,
    'cutscene promotion',
  );
  paintPortraits(el);
  let busy = false;
  el.querySelector('[data-promote]')!.addEventListener('click', () => {
    if (busy) return;
    busy = true;
    sfx('jackpot');
    choose(false);
  });
  const lay = el.querySelector<HTMLButtonElement>('[data-lay]')!;
  lay.addEventListener('click', () => {
    if (busy) return;
    if (free) {
      busy = true;
      sfx('submit');
      return choose(true);
    }
    // 손이 떨어지지 않는다: 압력이 높을수록 오래 버티다 꺼진다
    busy = true;
    lay.classList.add('trembling');
    lay.style.setProperty('--hold', `${PROMOTE_UI.holdBase + pressure * PROMOTE_UI.holdPer}ms`);
    sfx('tap');
    window.setTimeout(() => {
      lay.classList.remove('trembling');
      lay.classList.add('failed');
      const s = el.querySelector<HTMLElement>('.stuck')!;
      s.hidden = false;
      s.innerHTML = `${PROMOTE_UI.stuck} ‘${PROMOTE_UI.stuckMono}’`;
      sfx('loss');
      busy = false;
    }, PROMOTE_UI.holdBase + pressure * PROMOTE_UI.holdPer);
  });
};
