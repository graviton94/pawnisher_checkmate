/**
 * 본편 오프닝 (D-192): 프롤로그 컷신 · 안내서. 화면만 그리고 게임 상태는 건드리지 않는다.
 * 컷마다 그림(public/scenes/prologue-0N.png)이 있으면 그것을, 없으면 기물 도트로 짠 자리 그림을 쓴다.
 */
import { sfx } from '../audio/sfx';
import { GUIDE_PAGES, OPENING_TEXT, PROLOGUE_CUTS, type PrologueCut, type StandIn } from '../data/opening';
import { pieceImg } from '../ui/sprites';
import { replay, shakeEl, typeIn } from './fx3';
import { titleFx } from './uifx';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** 그림 파일이 있는지 (없으면 자리 그림) */
const hasImg = (src: string): Promise<boolean> =>
  new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im.naturalWidth > 0);
    im.onerror = () => res(false);
    im.src = src;
  });

/** 자리 그림: 기물 도트를 화면 비율 자리에 */
const standIn = (c: PrologueCut): string =>
  `<div class="pl-standin" style="--a:${c.bg[0]};--b:${c.bg[1]}">${c.glow ? `<i class="pl-glow" style="--g:${c.glow}"></i>` : ''}${c.art
    .map((p: StandIn) => `<span class="pl-pc${p.dim ? ' dim' : ''}${p.flip ? ' flip' : ''}" style="left:${p.x}%;top:${p.y}%;height:${p.h}%">${pieceImg(p.t, p.side, 'large', 220)}${p.crown ? '<img class="pl-crown" src="ui/hud/paper-crown.png" alt="">' : ''}</span>`)
    .join('')}</div>`;

/** 베인 타이틀 문장 마크업 (메인 화면 · 프롤로그 끝 공통) */
export const crestHtml = (): string =>
  `<div class="tfx"><div class="tfx-vig"></div><div class="tfx-rays"></div><div class="tfx-em"><img class="h1" src="ui/title-pawn.png" alt=""><img class="h2" src="ui/title-pawn.png" alt=""><img class="sl" src="ui/title-slash.png" alt=""><span class="tfx-glint"></span></div><div class="tfx-word"><img src="ui/title-logo.png" alt=""></div><div class="tfx-flash"></div></div>`;

/**
 * 프롤로그: 컷마다 그림이 천천히 밀려 들어오고(켄 번스) 서술 · 대사 · 독백이 한 자씩. 탭 = 다음(찍는 중이면 끝까지),
 * 「건너뛰기」 = 바로 끝. short면 ★컷만. 마지막엔 베인 타이틀 문장이 내리꽂힌다.
 */
export const prologue = (short = false): Promise<void> =>
  new Promise((resolve) => {
    const cuts = short ? PROLOGUE_CUTS.filter((c) => c.key) : PROLOGUE_CUTS;
    const el = document.createElement('div');
    el.className = 'prologue';
    el.innerHTML = `<div class="pl-stage"></div><i class="pl-bar t"></i><i class="pl-bar b"></i><div class="pl-text"></div><button class="btn pl-skip" type="button">${OPENING_TEXT.skip}</button><p class="pl-tap">▼</p>`;
    document.body.appendChild(el);
    const stage = el.querySelector<HTMLElement>('.pl-stage')!;
    const text = el.querySelector<HTMLElement>('.pl-text')!;
    let i = -1;
    let typing = false;
    let ended = false;
    let token = 0;
    const finish = async (): Promise<void> => {
      if (ended) return;
      ended = true;
      token++;
      // 마지막: 검은 막 위로 베인 타이틀 문장
      stage.innerHTML = `<div class="pl-logo">${crestHtml()}</div>`;
      text.innerHTML = '';
      el.classList.add('logo');
      void titleFx(stage.querySelector<HTMLElement>('.tfx'));
      await wait(calm() ? 300 : 1900);
      el.classList.add('out');
      await wait(calm() ? 0 : 300);
      el.remove();
      resolve();
    };
    const show = async (k: number): Promise<void> => {
      const my = ++token;
      const c = cuts[k];
      // 컷 사이: 짧은 암전 (레트로 컷 전환)
      el.classList.add('dip');
      await wait(calm() ? 0 : 140);
      if (my !== token) return;
      const src = `scenes/${c.img}.png`;
      stage.innerHTML = (await hasImg(src)) ? `<img class="pl-img" src="${src}" alt="">` : standIn(c);
      if (my !== token) return;
      stage.className = `pl-stage kb${k % 2}${c.fx ? ` fx-${c.fx}` : ''}`;
      replay(stage, 'in');
      el.classList.remove('dip');
      if (c.fx === 'alarm' || c.fx === 'red') {
        sfx('threat');
        window.setTimeout(() => shakeEl(stage, 3, 300), 200);
      } else sfx('tap');
      text.innerHTML = `${c.narr ? '<p class="pl-narr"></p>' : ''}${c.say ? '<p class="pl-say"></p>' : ''}${c.mono ? '<p class="pl-mono"></p>' : ''}`;
      typing = true;
      await wait(calm() ? 0 : 260);
      if (c.narr && my === token) await typeIn(text.querySelector<HTMLElement>('.pl-narr')!, c.narr, 34, undefined, () => my === token);
      if (c.say && my === token) await typeIn(text.querySelector<HTMLElement>('.pl-say')!, `「${c.say}」`, 34, undefined, () => my === token);
      if (c.mono && my === token) {
        await wait(calm() ? 0 : 200);
        if (my === token) await typeIn(text.querySelector<HTMLElement>('.pl-mono')!, `‘${c.mono}’`, 44, undefined, () => my === token);
      }
      if (my === token) typing = false;
    };
    const next = (): void => {
      if (ended) return;
      if (typing) {
        // 찍는 중이면 그 컷 글을 한 번에
        token++;
        typing = false;
        const c = cuts[i];
        const set = (sel: string, v?: string) => { const p = text.querySelector<HTMLElement>(sel); if (p && v) p.textContent = v; };
        set('.pl-narr', c.narr);
        set('.pl-say', c.say && `「${c.say}」`);
        set('.pl-mono', c.mono && `‘${c.mono}’`);
        return;
      }
      i += 1;
      if (i >= cuts.length) return void finish();
      void show(i);
    };
    el.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('.pl-skip')) return void finish();
      next();
    });
    next();
  });

/** 안내서 그림 (자산 조합) */
const guidePic = (k: (typeof GUIDE_PAGES)[number]['pic']): string => {
  if (k === 'play')
    return `<div class="gd-pic play"><span class="gd-card">${pieceImg('N', 0, 'small', 28)}</span><b>→</b>${pieceImg('N', 0, 'large', 44)}<b>→</b><img src="ui/board/target-kill.png" alt=""></div>`;
  if (k === 'red') return `<div class="gd-pic red"><i></i><i class="r"><img src="ui/board/badge-e1.png" alt=""></i><i></i><i class="r"><img src="ui/board/badge-e2.png" alt=""></i>${pieceImg('B', 1, 'large', 40)}</div>`;
  if (k === 'keys') return `<div class="gd-pic keys"><img src="ui/hud/key-full.png" alt=""><img src="ui/hud/key-full.png" alt=""><img src="ui/hud/key-spent.png" alt=""><span>×1.25 → ×1.50</span></div>`;
  return `<div class="gd-pic king"><span class="gd-crowned">${pieceImg('P', 0, 'large', 48)}<img class="pl-crown" src="ui/hud/paper-crown.png" alt=""></span><b>vs</b>${pieceImg('K', 1, 'large', 48)}</div>`;
};

/** 안내서: 네 쪽, 이전 · 다음. 마지막 쪽 버튼 = last (첫 대국으로 / 닫기) */
export const guide = (open: (html: string) => HTMLElement, last: string = OPENING_TEXT.close): Promise<void> =>
  new Promise((resolve) => {
    let p = 0;
    const draw = (): void => {
      const g = GUIDE_PAGES[p];
      const el = open(`<div class="guide"><p class="sf-eyebrow">안내서 ${p + 1} / ${GUIDE_PAGES.length}</p><h2>${g.title}</h2>${guidePic(g.pic)}${g.lines.map((l) => `<p>${l}</p>`).join('')}
        <div class="gd-dots">${GUIDE_PAGES.map((_, k) => `<i${k === p ? ' class="on"' : ''}></i>`).join('')}</div>
        <div class="row"><button class="btn" type="button" data-prev${p ? '' : ' disabled'}>${OPENING_TEXT.prev}</button><button class="btn brass" type="button" data-next>${p === GUIDE_PAGES.length - 1 ? last : OPENING_TEXT.next}</button></div></div>`);
      replay(el.querySelector('.gd-pic')!, 'in');
      el.querySelector('[data-prev]')!.addEventListener('click', () => {
        if (p > 0) (p--, sfx('tap'), draw());
      });
      el.querySelector('[data-next]')!.addEventListener('click', () => {
        sfx('tap');
        if (p < GUIDE_PAGES.length - 1) return (p++, draw());
        resolve();
      });
    };
    draw();
  });
