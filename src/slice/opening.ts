/**
 * 본편 오프닝 (D-192): 프롤로그 컷신 · 안내서. 화면만 그리고 게임 상태는 건드리지 않는다.
 * 컷마다 그림(public/scenes/prologue-0N.png)이 있으면 그것을, 없으면 기물 도트로 짠 자리 그림을 쓴다.
 */
import { calmMotion } from '../prefs/motion';
import { autoAdvance } from '../prefs/fx';
import { AUTO_ADVANCE_MS } from '../data/settings';
import { sfx } from '../audio/sfx';
import { GUIDE_PAGES, OPENING_TEXT, type GuideMedia, type StandIn } from '../data/opening';
import { PROLOGUE, PROLOGUE_FIELD, PROLOGUE_OPEN, SPEAKER_FACE, type Cut, type Face, type Line, type Shot } from '../data/script';
import { pieceImg } from '../ui/sprites';
import { flashScreen, pxOut, replay, shake, typeIn, typeReserve } from './fx3';
import { Camera, FILM, plateHtml, showTitle, Wipe } from './film';
import { logHtml, VnStage, type PlateBox } from './vn';
import { DarkStage } from './darkcut';
import { castOf, castOn, VN_TEXT, VN_VOID } from '../data/vn';
import { clearDither, ditherTo, ease } from '../view/motion';
import { PAPER_FACE } from '../data/portraits';

const PAPER_KING = '종이왕';
import { titleFx } from './uifx';
import { clearBand, clearPeeks, cutChromeHtml, cutFill, cutLineHtml, cutPages, cutSay, speakerSide, type CutLine, type WinBtn, type WinOpts } from './uikit';
import type { VnScene } from '../data/vn';

const calm = (): boolean => calmMotion();
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
  `<div class="tfx"><div class="tfx-vig"></div><div class="tfx-rays"></div><div class="tfx-em"><img class="h1" src="ui/title-pawn.png" alt=""><img class="h2" src="ui/title-pawn.png" alt=""><img class="sl" src="ui/title-slash.png" alt=""><span class="tfx-glint"></span></div><div class="tfx-word"><img src="ui/title-word.png" alt=""></div><div class="tfx-flash"></div></div>`;

/**
 * 컷신 재생기 (D-192 프롤로그 → D-276 각본 전체 → D-504 영화 문법): 모든 이야기 장면(프롤로그 · 그림자 · 동료 · 반장 격파 · 도금왕 · 돌아봄 · 결말 · 패배)이 이 하나를 쓴다.
 * - 레터박스: 위아래 먹 띠가 계단으로 닫히고, 아래 띠 안에 자막 띠(uikit.cutChromeHtml) — 그림은 띠 사이 장면 칸만 덮는다(비율 그대로, 기기 픽셀 정수배).
 * - 비트: 한 쪽 = 한 문장(cutPages). 줄의 첫 쪽에서 그 줄의 연출을 건다 — 카메라 샷(film.Camera 계단 이동) · 숨(pause) · 소리 큐(sfx) · 효과(흔들림 · 번쩍 · 붉은 경보 · 금빛).
 * - 컷 사이: 컷마다 고른 전환(디더 · 조리개 · 쇳물 · 백지 · 암전), 앞에 장 제목 카드(title), 뒤에 맺음 카드(end), 그림 없는 끝 정적(coda).
 * - 화자 명패: 대사 쪽에서 띠 위에 초상 액자 + 이름표(우리 편 왼쪽 · 적 · 도금왕 오른쪽 · NPC 종이 꼬리표). 같은 화자가 이어 말하면 명패를 그대로 둔다.
 * 탭 = 찍는 중이면 그 쪽을 한 번에 · 아니면 다음 쪽(제목 카드는 탭으로 넘김) · 「건너뛴다」 = 바로 끝. logo면 마지막에 베인 타이틀 문장.
 * 박자 표지 `data-beat` (전수 점검 tools/qa/sweep.cjs가 읽는다): move = 전환 · 카메라 · 숨 · 글자 찍는 중, hold = 한 쪽이 다 서서 탭을 기다림.
 */
export const playCuts = (cuts: Cut[], o: { logo?: boolean; before?: () => unknown; faces?: Record<string, Face>; /** 먹 화면에서도 「건너뛴다」를 처음부터 보인다 (D-611 — 둘째 재도전부터의 인트로 B) */ skipShown?: boolean } = {}): Promise<void> =>
  new Promise((resolve) => {
    clearBand();
    clearPeeks();
    const el = document.createElement('div');
    el.className = 'prologue kit film';
    el.dataset.beat = 'move';
    el.innerHTML = `<i class="film-lb lb-t" aria-hidden="true"></i><div class="film-view"><div class="pl-stage"></div><div class="film-over"></div></div><i class="pl-flash"></i><i class="film-lb lb-b" aria-hidden="true"></i>${cutChromeHtml({ skip: OPENING_TEXT.skip })}<button type="button" class="btn k-iron cut-log" data-log>${VN_TEXT.log}</button>`;
    // 검은 화면 가운데 글 (D-582 — Cut.void): 글 단 폭(화면 폭 비율)은 data/vn.VN_VOID
    el.style.setProperty('--void-w', String(VN_VOID.width));
    el.style.setProperty('--void-ws', String(VN_VOID.widthSmall));
    if (cuts[0]?.void) el.classList.add('void');
    if (o.skipShown) el.classList.add('void-ui');
    document.body.appendChild(el);
    document.body.classList.add('cover-pl');
    const stage = el.querySelector<HTMLElement>('.pl-stage')!;
    const over = el.querySelector<HTMLElement>('.film-over')!;
    const text = el.querySelector<HTMLElement>('.cut-lines')!;
    const sub = el.querySelector<HTMLElement>('.cut-sub')!;
    const wipe = new Wipe(over);
    const view = el.querySelector<HTMLElement>('.film-view')!;
    // 비주얼 노벨 층 (D-554): 서 있는 배우 · 장면 입자 · 등잔 · 대사 기록
    // 이 컷에 나올 화자 명패를 몰래 세워 재어 둔다 — 배우는 그 자리를 비켜 선다 (셋이 서도 바깥 배우가 명패 뒤에 숨지 않게)
    let cutLines: (CutLine & Partial<Line>)[] = [];
    const plateBoxes = (): PlateBox[] => {
      const v = view.getBoundingClientRect();
      const seen = new Set<string>();
      const out: PlateBox[] = [];
      for (const l of cutLines) {
        const p = plateOf(l);
        if (!p || seen.has(p.key)) continue;
        seen.add(p.key);
        sub.insertAdjacentHTML('beforeend', plateHtml(p.who, p.side, p.face));
        const probe = sub.lastElementChild as HTMLElement;
        probe.style.visibility = 'hidden';
        const r = probe.getBoundingClientRect();
        probe.remove();
        out.push({ x: r.left - v.left, r: r.right - v.left, y: r.top - v.top, b: r.bottom - v.top });
      }
      return out;
    };
    const vn = new VnStage(view, () => stage.querySelector<HTMLImageElement>('img[data-film]'), plateBoxes);
    wipe.full();
    if (!calm() && !cuts[0]?.void) replay(el, 'lb-in');
    const faces: Record<string, Face> = { ...SPEAKER_FACE, ...(o.faces ?? {}) };
    /** 줄의 화자 명패 (없으면 null): 대사 = 이름 + 얼굴 · 종이왕 표정 (D-506): 대사는 줄의 mood로 명패 얼굴을, 속마음(m)은 mood가 있으면 이름표 없이 얼굴만 */
    const plateOf = (l: CutLine & Partial<Line>): { who: string; side: ReturnType<typeof speakerSide>; face?: Face; key: string } | null => {
      if (l.k === 'm' ? !l.mood : l.k !== 's' || !l.who) return null;
      const face = l.mood && (l.k === 'm' || l.who === PAPER_KING) ? { portrait: PAPER_FACE[l.mood] } : l.who ? faces[l.who] : undefined;
      return { who: l.k === 'm' ? '' : l.who!, side: l.k === 'm' ? 'ally' : speakerSide(l.who!), face, key: `${l.k === 'm' ? '' : l.who}|${l.mood ?? ''}` };
    };
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
    /** 그림 없는 먹 무대 (D-579 — Cut.dark) */
    let dark: DarkStage | null = null;
    let shot: Shot = { x: 0.5, y: 0.5, z: 0 };
    let scene: VnScene = {};
    /** 숨 · 카메라 중에 눌렀을 때 바로 놓을 샷 */
    let pending: Shot | null = null;
    let waiter: (() => void) | null = null;
    /** 제목 카드 · 숨 동안: 탭 하나를 기다린다 */
    const tapped = (): Promise<void> => new Promise((r) => (waiter = () => { waiter = null; r(); }));
    const refit = (): void => { cam?.refit(); vn.refit(); dark?.refit(); };
    /** 검은 화면 가운데 글 (D-582): ▼ 쉼 · 숨은 단추(건너뛴다 · 기록) 드러내기 · 길게 누르기 */
    let idleT = 0, uiT = 0, holdT = 0, held = false;
    const isVoid = (): boolean => el.classList.contains('void');
    const unIdle = (): void => { window.clearTimeout(idleT); el.classList.remove('idle'); };
    /** 한 쪽이 다 선 뒤 한참 손을 대지 않으면 같은 글 색 ▼ (먹 화면은 처음부터 단추를 내밀지 않는다) */
    const armIdle = (): void => {
      unIdle();
      if (!isVoid()) return;
      const my = token;
      idleT = window.setTimeout(() => { if (my === token && el.dataset.beat === 'hold') el.classList.add('idle'); }, VN_VOID.hintMs);
    };
    /** 숨은 「건너뛴다」 · 「기록」을 잠깐 드러낸다 (길게 누르기 · 마우스 움직임 · 뒤로 키) */
    const reveal = (): void => {
      if (!isVoid()) return;
      if (!el.classList.contains('void-ui') && !calm()) for (const b of el.querySelectorAll<HTMLElement>('.cut-skip, .cut-log')) replay(b, 'in');
      el.classList.add('void-ui');
      window.clearTimeout(uiT);
      if (!o.skipShown) uiT = window.setTimeout(() => el.classList.remove('void-ui'), VN_VOID.uiMs);
    };
    el.addEventListener('ui-reveal', reveal);
    el.addEventListener('pointerdown', (ev) => {
      held = false;
      if (!isVoid() || (ev.target as HTMLElement).closest('button, .vn-log')) return;
      holdT = window.setTimeout(() => { held = true; reveal(); }, VN_VOID.holdMs);
    });
    for (const k of ['pointerup', 'pointercancel', 'pointerleave'] as const) el.addEventListener(k, () => window.clearTimeout(holdT));
    el.addEventListener('pointermove', (ev) => { if (ev.pointerType === 'mouse' && Math.abs(ev.movementX) + Math.abs(ev.movementY) > 2) reveal(); });
    /** 이야기 줄이 바뀔 때: 앞 글을 64단 디더로 걷는다 (움직임 줄이기면 바로) */
    const voidOut = async (): Promise<void> => {
      if (!text.childElementCount) return;
      if (!calm()) { await ditherTo(text, 1, 0, VN_VOID.outMs, ease.in); }
      text.innerHTML = '';
      clearDither(text);
    };
    window.addEventListener('resize', refit);
    const finish = async (): Promise<void> => {
      if (ended) return;
      ended = true;
      token++;
      el.dataset.beat = 'move';
      window.removeEventListener('resize', refit);
      unIdle();
      window.clearTimeout(uiT);
      cam?.stop();
      closeLog();
      vn.exitAll();
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
      pxOut(el, () => { vn.destroy(); dark?.destroy(); el.remove(); resolve(); }, 420);
    };
    /** 화자 명패: 대사 첫 쪽이면 새로, 이어 말하는 쪽이면 그대로, 서술 · 독백이면 걷는다 */
    const plate = (l: CutLine & Partial<Line>): void => {
      const now = sub.querySelector<HTMLElement>('.cut-who');
      const key = `${l.k === 'm' ? '' : l.who}|${l.mood ?? ''}`;
      if (now && now.dataset.key === key && ((l.k === 's' && l.cont) || (l.k === 'm' && l.part && l.part !== 'head'))) return;
      now?.remove();
      const p = plateOf(l);
      if (!p) return;
      sub.insertAdjacentHTML('afterbegin', plateHtml(p.who, p.side, p.face));
      sub.querySelector<HTMLElement>('.cut-who')!.dataset.key = key;
      if (!calm()) replay(sub.querySelector('.cut-who')!, 'in');
    };
    /** 컷 하나 세우기: 그림(없으면 대체 · 자리 그림) · 장면 효과 · 첫 샷 */
    const mount = async (c: Cut): Promise<void> => {
      el.classList.toggle('coda', !!c.coda);
      el.classList.toggle('coda-white', c.coda === 'white');
      el.classList.toggle('alarm', c.fx === 'red');
      el.style.setProperty('--em', c.glow && c.glow !== '#f4f1ea' ? c.glow : '#f4d27a');
      cam = null;
      dark?.destroy();
      dark = null;
      el.classList.toggle('dark-stage', !!c.dark);
      // 검은 화면 가운데 글 (D-582): 띠 · 그림 없이 먹만 — 먹 컷에서 그림 컷으로 돌아오면 레터박스가 계단으로 다시 닫힌다
      const wasVoid = isVoid();
      el.classList.toggle('void', !!c.void);
      if (!c.void) el.classList.remove(...(o.skipShown ? ['idle'] : ['void-ui', 'idle']));
      if (wasVoid && !c.void && !calm()) replay(el, 'lb-in');
      if (c.void) { shot = { x: 0.5, y: 0.5, z: 0 }; stage.className = 'pl-stage'; stage.innerHTML = ''; return; }
      // 먹 무대 (D-579): 그림 · 자리 그림 없이 도트 효과 칸만 — 줄의 beat가 효과를 건다
      if (c.dark) { shot = { x: 0.5, y: 0.5, z: 0 }; stage.className = 'pl-stage pl-dark'; stage.innerHTML = ''; dark = new DarkStage(stage, view); return; }
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
    const lineFx = (l: CutLine & Partial<Line>, voidP?: HTMLElement): void => {
      if (l.sfx) sfx(l.sfx);
      if (!l.fx) return;
      // 검은 화면 가운데 글 (D-582): 그림 효과(흔들림 · 번쩍 · 금빛) 없이 — 붉은 경보만 그 줄 글이 진홍으로 두 번 깜빡
      if (voidP) { if (l.fx === 'red' && !calm()) replay(voidP, 'void-red'); return; }
      if (l.fx === 'shake') shake(view, 2);
      else if (l.fx === 'flash') { flashScreen(0.9); shake(view, 3); }
      else if (l.fx === 'red') { if (!calm()) { replay(el, 'red-once'); window.setTimeout(() => el.classList.remove('red-once'), 640); } shake(view, 1); }
      else if (l.fx === 'gold') stage.classList.add('fx-gold');
    };
    /** 서 있는 배우 (D-554 · 배우를 연 그림 없는 컷만 — D-580): 대사 = 그 화자를 세우고 밝힌다 · 서술 = 모두 그늘 · 독백 = 종이왕만 밝게 */
    const cast = (l: CutLine & Partial<Line>): void => {
      if (l.k === 's' && l.who) {
        const f = faces[l.who];
        const sprite = castOf(l.who) ?? (f && 't' in f ? { t: f.t, side: f.side } : undefined);
        const side = speakerSide(l.who);
        vn.speak(l.who, sprite, side === 'ally' || side === 'npc' ? 'l' : 'r');
      } else vn.hush(l.k === 'm' ? PAPER_KING : undefined);
    };
    /** 대사 기록: 한 줄을 나눈 쪽은 앞 줄에 잇는다 */
    const record = (ls: CutLine[]): void => {
      for (const l of ls) {
        const t = cutFill(l).replace(/<[^>]+>/g, '');
        const prev = vn.log[vn.log.length - 1];
        if (prev && l.part && l.part !== 'head') prev.t += ` ${t}`;
        else vn.log.push({ who: l.k === 's' ? l.who : undefined, k: l.k, t });
      }
    };
    /** 대사 기록 창 (game-ui-design 4.3 정보 — M, 닫는다 하나 · 뒤 막 누름 · Esc) */
    const openLog = (): void => {
      if (el.querySelector('.vn-log')) return;
      sfx('tap');
      el.insertAdjacentHTML('afterbegin', logHtml(vn.log));
      void ditherTo(el.querySelector<HTMLElement>('.vn-log .win')!, 0, 1, 300, ease.out);
      el.querySelector<HTMLElement>('.vn-log [data-x]')?.focus({ preventScroll: true });
    };
    function closeLog(): void {
      const w = el.querySelector<HTMLElement>('.vn-log');
      if (!w || w.classList.contains('pxout')) return;
      pxOut(w, () => { w.remove(); armAuto(); }, 300);
    }
    const show = async (k: number): Promise<void> => {
      const my = ++token;
      el.dataset.beat = 'move';
      const pg = pages[k];
      const c = cuts[pg.c];
      unIdle();
      if (pg.c !== shown) {
        busy = true;
        const prev = cuts[shown];
        const trans = c.trans ?? 'dither';
        sub.querySelector('.cut-who')?.remove();
        if (prev?.void) { await voidOut(); if (my !== token) return; }
        text.innerHTML = '';
        // 1 · 막 닫기 (첫 컷은 이미 먹)
        if (shown >= 0) await wipe.close(trans, shot);
        if (my !== token) return;
        // 2 · 앞 컷의 맺음 카드 · 이 컷의 장 제목 카드 (막이 닫힌 먹 위)
        if (prev?.end) { await showTitle(over, prev.end, tapped()); if (my !== token) return; }
        shown = pg.c;
        await mount(c);
        if (my !== token) return;
        // 무대 분위기 (막이 닫힌 사이): 그림이 있는 컷은 배우를 세우지 않는다(D-580 · D-572 — 인물은 그림 안에 이미 있다).
        // 그림 없는 컷도 끝 정적 · 먹 무대(D-579) · 자리 그림 · 실제 배우를 겹친 컷은 아니고, VN_SCENE이 따로 연 컷만(castOn)
        cutLines = c.lines as (CutLine & Partial<Line>)[];
        scene = vn.enter(c.slug, { noCast: !!c.coda || !!c.dark || !!c.showActors || !castOn(c.slug, !!stage.querySelector('img[data-film]')), still: !!c.void });
        if (c.title) { wipe.full('#0b0b0e'); await showTitle(over, c.title, tapped()); if (my !== token) return; }
        if (c.coda) wipe.color = c.coda === 'white' ? '#f1ede4' : '#0b0b0e';
        // 3 · 막 걷기 — 컷의 효과 소리
        await wipe.open(trans === 'melt' || trans === 'white' || trans === 'black' ? 'dither' : trans, shot);
        if (my !== token) return;
        if (c.fx === 'alarm' || c.fx === 'red') { sfx('threat'); window.setTimeout(() => shake(stage, 1), 200); }
        busy = false;
      }
      const l = pg.lines[0] as CutLine & Partial<Line>;
      if (c.void) {
        // 검은 화면 가운데 글 (D-582): 한 문장 = 한 줄로 쌓는다 — 이야기 줄이 바뀌면 앞 글을 디더로 걷고 새로. 명패 대신 대사 이름은 글 위 작은 줄(첫 쪽마다)
        if (pg.head && text.childElementCount) { busy = true; await voidOut(); busy = false; if (my !== token) return; }
        text.insertAdjacentHTML('beforeend', pg.lines.map((x, a) => cutLineHtml(a === 0 && pg.head ? { ...x, cont: false } : x)).join(''));
        el.dataset.voice = /^「/.test(l.t) ? 'law' : l.k;
      } else {
        // 명패 · 빈 줄을 먼저 세운다 — 숨 · 카메라 중에 누르면 글이 바로 다 찍힌다(건너뛰지 않는다)
        plate(l);
        text.innerHTML = pg.lines.map(cutLineHtml).join('');
      }
      typing = true;
      sub.classList.add('typing');
      const ps = [...text.querySelectorAll<HTMLElement>('p > span')].slice(-pg.lines.length);
      // 줄의 첫 쪽: 숨 → 카메라 → 효과 · 소리 (줄을 나눈 다음 쪽은 같은 그림 · 초점에서 글만)
      if (pg.head) {
        pending = l.shot ? { ...l.shot, z: l.shot.z ?? 0 } : null;
        if (l.pause && !calm()) { await wait(l.pause); if (my !== token) return; }
        if (pending && cam) { shot = pending; await cam.move(shot); if (my !== token) return; }
        pending = null;
        lineFx(l, c.void ? ps[0]?.parentElement ?? undefined : undefined);
        if (l.beat) dark?.beat(l.beat);
        // 켄 번스: 줄이 서 있는 동안 천천히 민다 (다음 줄의 카메라 · 컷 전환이 멈춘다)
        if (cam) void cam.drift(l.drift ?? scene.drift);
      } else sfx('tap', 3);
      cast(l);
      record(pg.lines);
      // 쪽의 모든 줄 자리를 먼저 잡는다 (D-594): 둘째 줄이 들어올 때 글 단이 다시 가운데로 밀리지 않게
      ps.forEach((p, a) => typeReserve(p, cutFill(pg.lines[a])));
      for (let a = 0; a < pg.lines.length && my === token; a++) await typeIn(ps[a], cutFill(pg.lines[a]), FILM.type[pg.lines[a].k], undefined, () => my === token);
      if (my === token) { typing = false; sub.classList.remove('typing'); el.dataset.beat = 'hold'; armAuto(); armIdle(); }
    };
    /** 설정 › 컷신 자동 넘김 (D-539): 한 쪽이 다 선 뒤 읽을 틈을 두고 다음 쪽 — 누르기를 대신할 뿐, 연출 속도는 그대로 (D-039) */
    const armAuto = (): void => {
      if (!autoAdvance()) return;
      const my = token, at = i;
      window.setTimeout(() => { if (!ended && my === token && at === i && !typing && !busy && !waiter && el.dataset.beat === 'hold' && !el.querySelector('.vn-log')) next(); }, AUTO_ADVANCE_MS);
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
        const ps = [...text.querySelectorAll<HTMLElement>('p > span')].slice(-pages[i].lines.length);
        pages[i].lines.forEach((l, a) => ps[a] && (ps[a].innerHTML = cutFill(l)));
        el.dataset.beat = 'hold';
        armAuto();
        armIdle();
        return;
      }
      i += 1;
      if (i >= pages.length) return void finish();
      void show(i);
    };
    el.addEventListener('click', (ev) => {
      if (ended) return;
      const tg = ev.target as HTMLElement;
      // 길게 눌러 숨은 단추를 드러낸 누름은 넘기지 않는다 (D-582)
      if (held) { held = false; return; }
      // 대사 기록: 단추 = 열기 · 창 안 = 「닫는다」나 뒤 막만 닫기 (기록이 열린 동안은 넘기지 않는다)
      if (tg.closest('.vn-log')) { if (tg.closest('[data-x]') || !tg.closest('.win')) closeLog(); return; }
      if (tg.closest('.cut-log')) return openLog();
      if (tg.closest('.cut-skip')) { waiter = null; return void finish(); }
      next();
    });
    next();
  });
/**
 * 프롤로그 (S1): 처음 출하 앞 · 메뉴 「프롤로그 다시 보기」(short = ★컷만). before = 걷기 전에 뒤에 세울 다음 화면.
 * field = PRO-08(검은 세트와 먼 왕좌)을 끝에 붙이나 — 처음 출하는 false: 시험대 뒤 첫 실전 대국 직전에 따로 튼다(D-536 · main.onboarding).
 */
export const prologue = (short = false, before?: () => unknown, field = true): Promise<void> => {
  const cuts = [...PROLOGUE, ...(field ? [PROLOGUE_FIELD] : [])];
  return playCuts(short ? cuts.filter((c) => c.key) : cuts, { logo: true, before });
};
/** 처음 출하의 첫 대국 앞 프롤로그 (D-610 — 사용자 결정 3가): 9쪽만. 나머지(PROLOGUE_LATE)는 첫 반장 뒤 main.actClear가 튼다 */
export const prologueOpen = (before?: () => unknown): Promise<void> => {
  return playCuts(PROLOGUE_OPEN, { logo: true, before });
};

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
        ...(list.length === 1 ? { go: { label: last, attrs: 'data-next' } } : { pair: [{ label: OPENING_TEXT.prev, attrs: 'data-prev', disabled: !p, cls: p ? undefined : 'is-hidden' }, { label: fin ? last : OPENING_TEXT.next, attrs: 'data-next' }] as [WinBtn, WinBtn] }),
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
