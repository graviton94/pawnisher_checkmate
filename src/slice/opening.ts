/**
 * 본편 오프닝 (D-192): 프롤로그 컷신 · 안내서. 화면만 그리고 게임 상태는 건드리지 않는다.
 * 컷마다 그림(public/scenes/prologue-0N.png)이 있으면 그것을, 없으면 기물 도트로 짠 자리 그림을 쓴다.
 */
import { sfx } from '../audio/sfx';
import { GUIDE_PAGES, OPENING_TEXT, type GuideMedia, type StandIn } from '../data/opening';
import { PROLOGUE, SPEAKER_FACE, type Cut, type Face, type Line, type Shot } from '../data/script';
import { pieceImg } from '../ui/sprites';
import { flashScreen, pxOut, replay, shake, typeIn } from './fx3';
import { Camera, FILM, plateHtml, showTitle, Wipe } from './film';
import { titleFx } from './uifx';
import { clearBand, clearPeeks, cutChromeHtml, cutFill, cutLineHtml, cutPages, cutSay, speakerSide, type CutLine, type WinBtn, type WinOpts } from './uikit';

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
 * 컷신 재생기 (D-192 프롤로그 → D-276 각본 전체 → D-504 영화 문법): 모든 이야기 장면(프롤로그 · 그림자 · 동료 · 반장 격파 · 도금왕 · 돌아봄 · 결말 · 패배)이 이 하나를 쓴다.
 * - 레터박스: 위아래 먹 띠가 계단으로 닫히고, 아래 띠 안에 자막 띠(uikit.cutChromeHtml) — 그림은 띠 사이 장면 칸만 덮는다(비율 그대로, 기기 픽셀 정수배).
 * - 비트: 한 쪽 = 한 문장(cutPages). 줄의 첫 쪽에서 그 줄의 연출을 건다 — 카메라 샷(film.Camera 계단 이동) · 숨(pause) · 소리 큐(sfx) · 효과(흔들림 · 번쩍 · 붉은 경보 · 금빛).
 * - 컷 사이: 컷마다 고른 전환(디더 · 조리개 · 쇳물 · 백지 · 암전), 앞에 장 제목 카드(title), 뒤에 맺음 카드(end), 그림 없는 끝 정적(coda).
 * - 화자 명패: 대사 쪽에서 띠 위에 초상 액자 + 이름표(우리 편 왼쪽 · 적 · 도금왕 오른쪽 · NPC 종이 꼬리표). 같은 화자가 이어 말하면 명패를 그대로 둔다.
 * 탭 = 찍는 중이면 그 쪽을 한 번에 · 아니면 다음 쪽(제목 카드는 탭으로 넘김) · 「건너뛴다」 = 바로 끝. logo면 마지막에 베인 타이틀 문장.
 */
export const playCuts = (cuts: Cut[], o: { logo?: boolean; before?: () => unknown; faces?: Record<string, Face> } = {}): Promise<void> =>
  new Promise((resolve) => {
    clearBand();
    clearPeeks();
    const el = document.createElement('div');
    el.className = 'prologue kit film';
    el.innerHTML = `<i class="film-lb lb-t" aria-hidden="true"></i><div class="film-view"><div class="pl-stage"></div><div class="film-over"></div></div><i class="pl-flash"></i><i class="film-lb lb-b" aria-hidden="true"></i>${cutChromeHtml({ skip: OPENING_TEXT.skip })}`;
    document.body.appendChild(el);
    document.body.classList.add('cover-pl');
    const stage = el.querySelector<HTMLElement>('.pl-stage')!;
    const over = el.querySelector<HTMLElement>('.film-over')!;
    const text = el.querySelector<HTMLElement>('.cut-lines')!;
    const sub = el.querySelector<HTMLElement>('.cut-sub')!;
    const wipe = new Wipe(over);
    wipe.full();
    if (!calm()) replay(el, 'lb-in');
    const faces: Record<string, Face> = { ...SPEAKER_FACE, ...(o.faces ?? {}) };
    // 쪽 = (컷 번호, 그 쪽의 한 문장, 줄의 첫 쪽인가 — 줄의 연출은 첫 쪽에서만)
    const pages: { c: number; lines: CutLine[]; head: boolean }[] = [];
    // 한 화면 = 한 문장 (D-451 → D-488 — cutPages): 문장은 쪽을 넘기지 않고, 같은 화자가 이어 말하면 이름표는 첫 쪽에만
    cuts.forEach((c, k) => { for (const lines of cutPages(c.lines)) pages.push({ c: k, lines, head: !lines[0].part || lines[0].part === 'head' }); });
    let i = -1;
    let shown = -1;
    let typing = false;
    let busy = false;
    let ended = false;
    let token = 0;
    let cam: Camera | null = null;
    let shot: Shot = { x: 0.5, y: 0.5, z: 0 };
    /** 숨 · 카메라 중에 눌렀을 때 바로 놓을 샷 */
    let pending: Shot | null = null;
    let waiter: (() => void) | null = null;
    /** 제목 카드 · 숨 동안: 탭 하나를 기다린다 */
    const tapped = (): Promise<void> => new Promise((r) => (waiter = () => { waiter = null; r(); }));
    const refit = (): void => cam?.refit();
    window.addEventListener('resize', refit);
    const finish = async (): Promise<void> => {
      if (ended) return;
      ended = true;
      token++;
      window.removeEventListener('resize', refit);
      const last = cuts[shown];
      // 맺음 카드가 남았으면(건너뛰지 않고 끝까지 본 경우) — 막을 닫고 카드
      if (last?.end && i >= pages.length) {
        await wipe.close('dither', shot);
        el.classList.remove('coda', 'coda-white');
        text.innerHTML = '';
        await showTitle(over, last.end, tapped());
      }
      if (o.logo) {
        stage.className = 'pl-stage';
        stage.innerHTML = `<div class="pl-logo">${crestHtml()}</div>`;
        wipe.clear();
        text.innerHTML = '';
        el.querySelector('.cut-who')?.remove();
        el.classList.remove('coda', 'coda-white');
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
    /** 화자 명패: 대사 첫 쪽이면 새로, 이어 말하는 쪽이면 그대로, 서술 · 독백이면 걷는다 */
    const plate = (l: CutLine): void => {
      const now = sub.querySelector<HTMLElement>('.cut-who');
      if (l.k === 's' && l.cont && now) return;
      now?.remove();
      if (l.k !== 's' || !l.who) return;
      sub.insertAdjacentHTML('afterbegin', plateHtml(l.who, speakerSide(l.who), faces[l.who]));
      if (!calm()) replay(sub.querySelector('.cut-who')!, 'in');
    };
    /** 컷 하나 세우기: 그림(없으면 대체 · 자리 그림) · 장면 효과 · 첫 샷 */
    const mount = async (c: Cut): Promise<void> => {
      el.classList.toggle('coda', !!c.coda);
      el.classList.toggle('coda-white', c.coda === 'white');
      el.classList.toggle('alarm', c.fx === 'red');
      el.style.setProperty('--em', c.glow && c.glow !== '#f4f1ea' ? c.glow : '#f4d27a');
      cam = null;
      if (c.coda) { stage.className = 'pl-stage'; stage.innerHTML = ''; return; }
      const pick = !c.standIn && c.img && (await hasImg(`scenes/${c.img}.png`)) ? c.img : !c.standIn && c.alt && (await hasImg(`scenes/${c.alt}.png`)) ? c.alt : null; // 받을 그림이 없으면 대체 그림 (D-346)
      const focus = c.at?.match(/([\d.]+)%\s+([\d.]+)%/);
      shot = c.shot ?? { x: focus ? Number(focus[1]) / 100 : 0.5, y: focus ? Number(focus[2]) / 100 : pick?.startsWith('boss-') ? 0.3 : 0.5, z: 0 };
      stage.innerHTML = pick ? `<img class="pl-img pl-pixel${pick.startsWith('boss-') ? ' pl-portrait' : ''}" src="scenes/${pick}.png" alt="" data-film>` + (c.showActors ? standIn(c, true) : '') : standIn(c);
      stage.className = `pl-stage cam-still${c.fx ? ` fx-${c.fx}` : ''}`;
      stage.style.setProperty('--at', c.at ?? '50% 50%');
      const img = stage.querySelector<HTMLImageElement>('img[data-film]');
      if (img) {
        if (!img.complete) await new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
        cam = new Camera(img);
        cam.set(shot);
      }
    };
    /** 줄의 효과 (첫 쪽에서): 흔들림 · 흰 번쩍 · 붉은 경보 한 번 · 금빛 */
    const lineFx = (l: CutLine & Partial<Line>): void => {
      if (l.sfx) sfx(l.sfx);
      if (!l.fx) return;
      if (l.fx === 'shake') shake(stage, 2);
      else if (l.fx === 'flash') { flashScreen(0.9); shake(stage, 3); }
      else if (l.fx === 'red') { if (!calm()) { replay(el, 'red-once'); window.setTimeout(() => el.classList.remove('red-once'), 640); } shake(stage, 1); }
      else if (l.fx === 'gold') stage.classList.add('fx-gold');
    };
    const show = async (k: number): Promise<void> => {
      const my = ++token;
      const pg = pages[k];
      const c = cuts[pg.c];
      if (pg.c !== shown) {
        busy = true;
        const prev = cuts[shown];
        const trans = c.trans ?? 'dither';
        sub.querySelector('.cut-who')?.remove();
        text.innerHTML = '';
        // 1 · 막 닫기 (첫 컷은 이미 먹)
        if (shown >= 0) await wipe.close(trans, shot);
        if (my !== token) return;
        // 2 · 앞 컷의 맺음 카드 · 이 컷의 장 제목 카드 (막이 닫힌 먹 위)
        if (prev?.end) { await showTitle(over, prev.end, tapped()); if (my !== token) return; }
        shown = pg.c;
        await mount(c);
        if (my !== token) return;
        if (c.title) { wipe.full('#0b0b0e'); await showTitle(over, c.title, tapped()); if (my !== token) return; }
        if (c.coda) wipe.color = c.coda === 'white' ? '#f1ede4' : '#0b0b0e';
        // 3 · 막 걷기 — 컷의 효과 소리
        await wipe.open(trans === 'melt' || trans === 'white' || trans === 'black' ? 'dither' : trans, shot);
        if (my !== token) return;
        if (c.fx === 'alarm' || c.fx === 'red') { sfx('threat'); window.setTimeout(() => shake(stage, 1), 200); }
        busy = false;
      }
      const l = pg.lines[0] as CutLine & Partial<Line>;
      // 명패 · 빈 줄을 먼저 세운다 — 숨 · 카메라 중에 누르면 글이 바로 다 찍힌다(건너뛰지 않는다)
      plate(l);
      text.innerHTML = pg.lines.map(cutLineHtml).join('');
      typing = true;
      sub.classList.add('typing');
      const ps = [...text.querySelectorAll<HTMLElement>('p > span')];
      // 줄의 첫 쪽: 숨 → 카메라 → 효과 · 소리 (줄을 나눈 다음 쪽은 같은 그림 · 초점에서 글만)
      if (pg.head) {
        pending = l.shot ? { ...l.shot, z: l.shot.z ?? 0 } : null;
        if (l.pause && !calm()) { await wait(l.pause); if (my !== token) return; }
        if (pending && cam) { shot = pending; await cam.move(shot); if (my !== token) return; }
        pending = null;
        lineFx(l);
      } else sfx('tap', 3);
      for (let a = 0; a < pg.lines.length && my === token; a++) await typeIn(ps[a], cutFill(pg.lines[a]), FILM.type[pg.lines[a].k], undefined, () => my === token);
      if (my === token) { typing = false; sub.classList.remove('typing'); }
    };
    const next = (): void => {
      if (ended) return;
      if (waiter) return void waiter();
      if (busy) return;
      if (typing) {
        token++;
        typing = false;
        sub.classList.remove('typing');
        if (pending) { shot = pending; cam?.set(shot); pending = null; }
        const ps = [...text.querySelectorAll<HTMLElement>('p > span')];
        pages[i].lines.forEach((l, a) => ps[a] && (ps[a].innerHTML = cutFill(l)));
        return;
      }
      i += 1;
      if (i >= pages.length) return void finish();
      void show(i);
    };
    el.addEventListener('click', (ev) => {
      if (ended) return;
      if ((ev.target as HTMLElement).closest('.cut-skip')) { waiter = null; return void finish(); }
      next();
    });
    next();
  });
/** 프롤로그 (S1): 처음 출하 앞 · 메뉴 「프롤로그 다시 보기」(short = ★컷만). before = 걷기 전에 뒤에 세울 다음 화면 */
export const prologue = (short = false, before?: () => unknown): Promise<void> => playCuts(short ? PROLOGUE.filter((c) => c.key) : PROLOGUE, { logo: true, before });

/** 「화면을 눌러 …」 — 글자마다 한 칸씩 차례로 튀어 오르는 물결 (테스터: 깜빡임이 뚝뚝 끊겼다) */
export const pressHtml = (t: string): string => [...t].map((ch, k) => (ch === ' ' ? ' ' : `<span style="--k:${k}">${ch}</span>`)).join('');

/** 안내서 왼쪽 정사각 (D-205): 실제 게임 화면을 자른 그림, 또는 코드 애니메이션 */
export const guideMedia = (m: GuideMedia): string => {
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
export const guide = (open: (o: WinOpts) => HTMLElement, last: string = OPENING_TEXT.close, o: { start?: number; tabs?: string; onTab?: (t: string) => void; /** 이 쪽들만 (입문 시험대 사이 한 쪽 — P-C D-502) */ only?: number[]; /** 쪽 번호 대신 가운데 글 */ mid?: string } = {}): Promise<void> =>
  new Promise((resolve) => {
    const list = o.only ?? GUIDE_PAGES.map((_, k) => k);
    let p = Math.max(0, Math.min(list.length - 1, o.start ?? 0));
    let done = false;
    const end = (): void => {
      if (done) return;
      done = true;
      resolve();
    };
    const draw = (): void => {
      if (done) return;
      const g = GUIDE_PAGES[list[p]];
      const fin = p === list.length - 1;
      // 쪽 = 그림 + 제목(24) + 세 줄(합니다체) + 요령 한 줄 (D-264)
      const el = open({
        size: 'l',
        title: o.tabs ? OPENING_TEXT.helpTitle : OPENING_TEXT.guideTitle,
        head: o.tabs,
        body: `<div class="gd3"><div class="inset">${guideMedia(g.media)}</div><div class="stack gd-text3"><p class="lead">${g.title}</p>${g.lines.map((l) => `<p>${l}</p>`).join('')}${g.tip ? `<p class="up">“${g.tip}”</p>` : ''}</div></div>`,
        back: (fin && last === OPENING_TEXT.close) || o.only ? undefined : { label: OPENING_TEXT.close, attrs: 'data-x' },
        mid: `<span class="note">${o.mid ?? `${p + 1} / ${list.length}`}</span>`,
        // 한 쪽만이면 [넘긴다]만 (돌아갈 쪽이 없다)
        ...(list.length === 1 ? { go: { label: last, attrs: 'data-next' } } : { pair: [{ label: OPENING_TEXT.prev, attrs: 'data-prev', disabled: !p }, { label: fin ? last : OPENING_TEXT.next, attrs: 'data-next' }] as [WinBtn, WinBtn] }),
        dismiss: end,
      });
      replay(el.querySelector('.gd-media')!, 'in');
      el.querySelector('[data-x]')?.addEventListener('click', () => (sfx('tap'), end()));
      el.querySelectorAll<HTMLElement>('[data-tab]').forEach((t) => t.addEventListener('click', () => { if (t.dataset.tab === 'guide') return; sfx('tap'); end(); o.onTab?.(t.dataset.tab!); }));
      el.querySelector('[data-prev]')?.addEventListener('click', () => {
        if (p > 0) (p--, sfx('tap'), draw());
      });
      el.querySelector('[data-next]')!.addEventListener('click', () => {
        sfx('tap');
        if (p < list.length - 1) return (p++, draw());
        end();
      });
    };
    draw();
  });
