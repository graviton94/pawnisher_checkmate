/**
 * 본편 오프닝 (D-192): 프롤로그 컷신 · 안내서. 화면만 그리고 게임 상태는 건드리지 않는다.
 * 컷마다 그림(public/scenes/prologue-0N.png)이 있으면 그것을, 없으면 기물 도트로 짠 자리 그림을 쓴다.
 */
import { sfx } from '../audio/sfx';
import { GUIDE_PAGES, OPENING_TEXT, type GuideMedia, type StandIn } from '../data/opening';
import { PROLOGUE, type Cut, type Line } from '../data/script';
import { pieceImg } from '../ui/sprites';
import { pxOut, replay, shake, typeIn } from './fx3';
import { titleFx } from './uifx';
import { clearBand, clearPeeks, coverArt, cutChromeHtml, cutFill, cutLineHtml, cutPages, cutSay, type CutLine, type WinOpts } from './uikit';

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
/** 대역 그림의 발끝은 화면 58% 위에서 멈춘다 — 아래는 글 자리 (D-286: 폰이 서술 줄을 덮었다) */
const ART_FLOOR = 58;
const standIn = (c: Cut, overlay = false): string =>
  `<div class="pl-standin${overlay ? ' pl-actors' : ''}" style="--a:${c.bg[0]};--b:${c.bg[1]}">${c.glow ? `<i class="pl-glow" style="--g:${c.glow}"></i>` : ''}${c.art
    .map((p: StandIn) => `<span class="pl-pc${p.dim ? ' dim' : ''}${p.flip ? ' flip' : ''}" style="left:${p.x}%;top:${Math.min(p.y, overlay ? 70 : ART_FLOOR)}%;height:${overlay ? `min(${p.h}%, ${Math.min(12, 72 / c.art.length)}vw)` : `${p.h}%`}">${pieceImg(p.crown ? 'K' : p.t, p.side, 'large', 220)}</span>`)
    .join('')}</div>`;

/** 베인 타이틀 문장 마크업 (메인 화면 · 프롤로그 끝 공통) */
export const crestHtml = (): string =>
  `<div class="tfx"><div class="tfx-vig"></div><div class="tfx-rays"></div><div class="tfx-em"><img class="h1" src="ui/title-pawn.png" alt=""><img class="h2" src="ui/title-pawn.png" alt=""><img class="sl" src="ui/title-slash.png" alt=""><span class="tfx-glint"></span></div><div class="tfx-word"><img src="ui/title-logo.png" alt=""></div><div class="tfx-flash"></div></div>`;

/**
 * 컷신 재생기 (D-192 프롤로그 → D-276 각본 전체): 컷마다 그림이 천천히 밀려 들어오고(켄 번스), 줄이 두 줄씩 한 자씩 찍힌다.
 * 탭 = 다음(찍는 중이면 그 쪽을 한 번에) · 「건너뛴다」 = 바로 끝. logo면 마지막에 베인 타이틀 문장이 내리꽂힌다.
 * 줄: 서술(3인칭 과거) · 대사(이름 + “ ”) · 속말(‘ ’) — 글은 src/data/script.ts.
 * 크롬은 컷신 하나(D-397): 그림이 화면을 채우고(레터박스 없음) 아래 자막 띠 · ▼ · 「건너뛴다」(uikit.cutChromeHtml).
 */
export const playCuts = (cuts: Cut[], o: { logo?: boolean; before?: () => unknown } = {}): Promise<void> =>
  new Promise((resolve) => {
    clearBand();
    clearPeeks();
    const el = document.createElement('div');
    el.className = 'prologue kit';
    el.innerHTML = `<div class="pl-stage"></div><i class="pl-flash"></i>${cutChromeHtml({ skip: OPENING_TEXT.skip })}`;
    document.body.appendChild(el);
    document.body.classList.add('cover-pl');
    const stage = el.querySelector<HTMLElement>('.pl-stage')!;
    const text = el.querySelector<HTMLElement>('.cut-lines')!;
    const sub = el.querySelector<HTMLElement>('.cut-sub')!;
    // 쪽 = (컷 번호, 그 컷의 줄 두 개)
    const pages: { c: number; lines: CutLine[] }[] = [];
    // 긴 줄은 문장 단위 조각으로 (D-451 — cutPages): 한 쪽 = 띠 두 줄
    cuts.forEach((c, k) => { for (const lines of cutPages(c.lines)) pages.push({ c: k, lines }); });
    let i = -1;
    let shown = -1;
    let typing = false;
    let ended = false;
    let token = 0;
    const finish = async (): Promise<void> => {
      if (ended) return;
      ended = true;
      token++;
      if (o.logo) {
        stage.className = 'pl-stage';
        stage.innerHTML = `<div class="pl-logo">${crestHtml()}</div>`;
        text.innerHTML = '';
        el.classList.add('logo');
        void titleFx(stage.querySelector<HTMLElement>('.tfx'));
        await wait(calm() ? 300 : 1900);
        // 로고 뒤에 숨을 돌린다: 누를 때까지 기다린다 (테스터: 끝나자마자 메인 → 온보딩으로 저절로 넘어갔다) — 「눌러 출하」도 같은 띠 · ▼ 자리 (D-397)
        cutSay(el, [{ k: 'n', t: OPENING_TEXT.pressGo }]);
        sub.classList.remove('typing');
        el.classList.add('go-wait');
        await new Promise<void>((r) => el.addEventListener('click', () => r(), { once: true }));
        sfx('submit');
      }
      // 다음 화면을 뒤에 먼저 세우고 걷는다 — 걷는 사이 메인 화면이 비치지 않게
      await o.before?.();
      document.body.classList.remove('cover-pl');
      pxOut(el, () => { el.remove(); resolve(); }, 300);
    };
    const fill = (l: Line): string => cutFill(l);
    const show = async (k: number): Promise<void> => {
      const my = ++token;
      const pg = pages[k];
      const c = cuts[pg.c];
      if (pg.c !== shown) {
        shown = pg.c;
        el.classList.add('dip');
        await wait(calm() ? 0 : 140);
        if (my !== token) return;
        const pick = !c.standIn && (await hasImg(`scenes/${c.img}.png`)) ? c.img : !c.standIn && c.alt && (await hasImg(`scenes/${c.alt}.png`)) ? c.alt : null; // 받을 그림이 없으면 대체 그림 (D-346)
        const src = `scenes/${pick}.png`;
        const focus = c.at?.match(/([\d.]+)%\s+([\d.]+)%/);
        const fx = focus ? Number(focus[1]) / 100 : 0.5;
        const fy = focus ? Number(focus[2]) / 100 : pick?.startsWith('boss-') ? 0.3 : 0.5;
        stage.innerHTML = pick ? `<img class="pl-img pl-pixel${pick.startsWith('boss-') ? ' pl-portrait' : ''}" src="${src}" alt="" data-cover data-fx="${fx}" data-fy="${fy}">` + (c.showActors ? standIn(c, true) : '') : standIn(c);
        const pixel = stage.querySelector<HTMLImageElement>('img[data-cover]');
        if (pixel) {
          if (pixel.complete) coverArt(pixel);
          else pixel.addEventListener('load', () => coverArt(pixel), { once: true });
        }
        if (my !== token) return;
        // 카메라: 명시된 연출만 사용하고 기본은 도트 정렬을 지키는 정지 화면
        const cam = c.img.startsWith('boss-') ? 'still' : c.cam ?? 'still';
        stage.className = `pl-stage cam-${cam}${c.fx ? ` fx-${c.fx}` : ''}`;
        stage.style.setProperty('--at', c.at ?? '50% 50%');
        el.style.setProperty('--em', c.glow && c.glow !== '#f4f1ea' ? c.glow : '#f4d27a');
        el.classList.toggle('alarm', c.fx === 'red');
        el.classList.toggle('caption-top', c.caption === 'top');
        replay(stage, 'in');
        el.classList.remove('dip');
        if (c.fx === 'alarm' || c.fx === 'red') {
          sfx('threat');
          window.setTimeout(() => shake(stage, 1), 200);
        } else sfx('tap');
        await wait(calm() ? 0 : 260);
      } else sfx('tap', 3);
      text.innerHTML = pg.lines.map(cutLineHtml).join('');
      typing = true;
      sub.classList.add('typing');
      const ps = [...text.querySelectorAll<HTMLElement>('p > span')];
      for (let a = 0; a < pg.lines.length && my === token; a++) {
        if (pg.lines[a].k === 'm') await wait(calm() ? 0 : 200);
        if (my === token) await typeIn(ps[a], fill(pg.lines[a]), pg.lines[a].k === 'm' ? 44 : 30, undefined, () => my === token);
      }
      if (my === token) { typing = false; sub.classList.remove('typing'); }
    };
    const next = (): void => {
      if (ended) return;
      if (typing) {
        token++;
        typing = false;
        sub.classList.remove('typing');
        const ps = [...text.querySelectorAll<HTMLElement>('p > span')];
        pages[i].lines.forEach((l, a) => ps[a] && (ps[a].innerHTML = fill(l)));
        return;
      }
      i += 1;
      if (i >= pages.length) return void finish();
      void show(i);
    };
    el.addEventListener('click', (ev) => {
      if (ended) return;
      if ((ev.target as HTMLElement).closest('.cut-skip')) return void finish();
      next();
    });
    next();
  });

/** 프롤로그 (S1): 처음 출하 앞 · 메뉴 「프롤로그 다시 보기」(short = ★컷만). before = 걷기 전에 뒤에 세울 다음 화면 */
export const prologue = (short = false, before?: () => unknown): Promise<void> => playCuts(short ? PROLOGUE.filter((c) => c.key) : PROLOGUE, { logo: true, before });

/** 「화면을 눌러 …」 — 글자마다 한 칸씩 차례로 튀어 오르는 물결 (테스터: 깜빡임이 뚝뚝 끊겼다) */
export const pressHtml = (t: string): string => [...t].map((ch, k) => (ch === ' ' ? ' ' : `<span style="--k:${k}">${ch}</span>`)).join('');

/** 안내서 왼쪽 정사각 (D-205): 실제 게임 화면을 자른 그림, 또는 코드 애니메이션 */
const guideMedia = (m: GuideMedia): string => {
  if ('img' in m) return `<div class="gd-media shot"><img src="guide/${m.img}.png" alt=""></div>`;
  if (m.anim === 'king')
    return `<div class="gd-media anim king"><span class="gd-crowned">${pieceImg('K', 0, 'large', 64)}</span><b>vs</b><span class="gd-foe">${pieceImg('K', 1, 'large', 64)}</span></div>`;
  if (m.anim === 'formula')
    return `<div class="gd-media anim formula" aria-label="피해 = (공격 + 합) × 곱">
      <div class="fx-row r1"><span class="gd-pc">${pieceImg('P', 0, 'small', 30)}</span><span>공격</span><b>10</b></div>
      <div class="fx-row r2"><i class="op op-add">+</i><span>쇄도</span><b class="add">8</b></div>
      <div class="fx-row r3 sum"><span>=</span><b>18</b></div>
      <div class="fx-row r4"><i class="op op-mul">×</i><span>분쇄</span><b class="mul">1.5</b></div>
      <div class="fx-row r5 total"><span>피해</span><b>27</b></div></div>`;
  return `<div class="gd-media anim steam"><div class="st-track">${Array.from({ length: 10 }, (_, k) => `<i style="--k:${k}"></i>`).join('')}</div><div class="st-out"><i class="scr big"></i><b>+35</b></div><p>남은 칸 × 5 = 나사</p></div>`;
};

/**
 * 안내서 (D-391 키트 창): L 창 하나 — 위 탭 줄 · 쪽(그림 164 + 글 단) · 단추 줄 [닫는다] … 쪽 점 … [돌아간다 · 넘긴다].
 * 마지막 쪽 오른쪽 = last (첫 대국으로 / 닫는다). 어느 쪽에서든 닫는다 · Esc · 뒤 막 탭으로 닫힌다 (페르소나 테스트 m1).
 */
export const guide = (open: (o: WinOpts) => HTMLElement, last: string = OPENING_TEXT.close, o: { start?: number; tabs?: string; onTab?: (t: string) => void } = {}): Promise<void> =>
  new Promise((resolve) => {
    let p = Math.max(0, Math.min(GUIDE_PAGES.length - 1, o.start ?? 0));
    let done = false;
    const end = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    const draw = (): void => {
      if (done) return;
      const g = GUIDE_PAGES[p];
      const fin = p === GUIDE_PAGES.length - 1;
      // 쪽 = 그림 + 제목(24) + 세 줄(합니다체) + 요령 한 줄 (D-264)
      const el = open({
        size: 'l',
        title: o.tabs ? OPENING_TEXT.helpTitle : OPENING_TEXT.guideTitle,
        head: o.tabs,
        body: `<div class="gd3"><div class="inset">${guideMedia(g.media)}</div><div class="stack gd-text3"><p class="lead">${g.title}</p>${g.lines.map((l) => `<p>${l}</p>`).join('')}${g.tip ? `<p class="up">“${g.tip}”</p>` : ''}</div></div>`,
        back: fin && last === OPENING_TEXT.close ? undefined : { label: OPENING_TEXT.close, attrs: 'data-x' },
        mid: `<span class="note">${p + 1} / ${GUIDE_PAGES.length}</span>`,
        pair: [{ label: OPENING_TEXT.prev, attrs: 'data-prev', disabled: !p }, { label: fin ? last : OPENING_TEXT.next, attrs: 'data-next' }],
        dismiss: end,
      });
      replay(el.querySelector('.gd-media')!, 'in');
      el.querySelector('[data-x]')?.addEventListener('click', () => (sfx('tap'), end()));
      el.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab === 'guide') return; sfx('tap'); end(); o.onTab?.(t.dataset.tab!); }));
      el.querySelector('[data-prev]')!.addEventListener('click', () => {
        if (p > 0) (p--, sfx('tap'), draw());
      });
      el.querySelector('[data-next]')!.addEventListener('click', () => {
        sfx('tap');
        if (p < GUIDE_PAGES.length - 1) return (p++, draw());
        end();
      });
    };
    draw();
  });
