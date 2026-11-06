/**
 * 승급 13 최종장 — 이긴 뒤 판 위 연출 (각본 docs/script.md §2.5 · §13 컷 1 ~ 4, D-270 · D-277).
 * 쓰러진 도금왕 앞, 폰(종이 왕관을 벗은 아홉째)이 끝 줄 바로 앞까지 한 칸씩 걷는다 → 도금왕의 비웃음 →
 * 앞(승급 칸) · 뒤(한 칸) 두 칸이 빛나고 플레이어가 고른다 → 뒤면 판 위의 기물들이 웅성거린다.
 * 화면만 그린다 — 어느 쪽을 골랐는지만 돌려준다.
 */
import { sfx } from '../audio/sfx';
import type { PieceType } from '../engine';
import { FINALE, type Line } from '../data/script';
import { pieceImg } from '../ui/sprites';
import { pxOut, replay, shake, typeIn } from './fx3';

const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, calm() ? Math.min(ms, 60) : ms));

const COLS = 5;
const ROWS = 6;

/** 판 위 연출을 돌리고 'front'(승급 칸) · 'back'(뒤로 한 발)을 돌려준다. crew = 이번 분대(킹 제외) 유형 */
export const finaleScene = (crew: PieceType[]): Promise<'front' | 'back'> =>
  new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'finale';
    const cells = Array.from({ length: COLS * ROWS }, (_, i) => `<i class="fn-sq${(Math.floor(i / COLS) + (i % COLS)) % 2 ? ' dk' : ''}${i === 2 ? ' gold' : ''}" data-i="${i}"></i>`).join('');
    el.innerHTML = `<div class="fn-board">${cells}<span class="fn-pc fn-king" style="--c:0;--r:0">${pieceImg('K', 1, 'large', 88)}</span><span class="fn-pc fn-me" style="--c:2;--r:5">${pieceImg('P', 0, 'large', 88)}</span>${crew
      .slice(0, 4)
      .map((t, k) => `<span class="fn-pc fn-crew" style="--c:${[0, 1, 3, 4][k]};--r:5">${pieceImg(t, 0, 'large', 88)}</span>`)
      .join('')}<div class="fn-bubbles"></div></div><div class="fn-text"></div><p class="pl-tap">▼</p>`;
    document.body.appendChild(el);
    const board = el.querySelector<HTMLElement>('.fn-board')!;
    const me = el.querySelector<HTMLElement>('.fn-me')!;
    const text = el.querySelector<HTMLElement>('.fn-text')!;
    let tap: (() => void) | null = null;
    el.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('.fn-pick')) return;
      tap?.();
    });
    const waitTap = () => new Promise<void>((r) => (tap = () => { tap = null; r(); }));
    /** 두 줄씩 찍고 탭을 기다린다 */
    const speak = async (lines: Line[]): Promise<void> => {
      for (let a = 0; a < lines.length; a += 2) {
        const pg = lines.slice(a, a + 2);
        text.innerHTML = pg.map((l) => (l.k === 's' ? `<p class="pl-say"><b class="pl-who">${l.who}</b> <span></span></p>` : `<p class="pl-${l.k === 'm' ? 'mono' : 'narr'}${l.k === 'm' && l.t.length > 20 ? ' long' : ''}"><span></span></p>`)).join('');
        const ps = [...text.querySelectorAll<HTMLElement>('p > span')];
        let skip = false;
        tap = () => (skip = true);
        for (let k = 0; k < pg.length; k++) {
          const s = pg[k].k === 's' ? `“${pg[k].t}”` : pg[k].k === 'm' ? `‘${pg[k].t}’` : pg[k].t;
          if (skip) ps[k].textContent = s;
          else await typeIn(ps[k], s, 30, undefined, () => !skip);
          if (skip) ps[k].textContent = s;
        }
        await waitTap();
      }
      text.innerHTML = '';
    };
    const stepTo = async (r: number): Promise<void> => {
      me.style.setProperty('--r', String(r));
      replay(me, 'fn-step');
      sfx('tap', 2);
      await wait(420);
    };
    void (async () => {
      replay(board, 'in');
      await wait(500);
      await speak(FINALE.walk.slice(0, 1));
      text.innerHTML = '';
      for (const r of [4, 3, 2, 1]) await stepTo(r);
      await speak(FINALE.walk.slice(1));
      el.querySelector<HTMLElement>('.fn-king')!.classList.add('laugh');
      sfx('threat');
      shake(board, 1);
      await speak(FINALE.taunt);
      // 두 칸: 앞 = 승급 칸(끝 줄 가운데) · 뒤 = 한 칸 아래
      const front = el.querySelector<HTMLElement>('.fn-sq[data-i="2"]')!;
      const back = el.querySelector<HTMLElement>(`.fn-sq[data-i="${2 * COLS + 2}"]`)!;
      for (const [sq, label] of [[front, '승급 칸'], [back, '한 칸 뒤']] as const) {
        sq.classList.add('fn-pick');
        sq.insertAdjacentHTML('beforeend', `<b class="fn-lbl">${label}</b>`);
      }
      text.innerHTML = `<p class="pl-narr"><span>${FINALE.choose}</span></p>`;
      const pick = await new Promise<'front' | 'back'>((r) => {
        front.addEventListener('click', () => r('front'), { once: true });
        back.addEventListener('click', () => r('back'), { once: true });
      });
      for (const sq of [front, back]) { sq.classList.remove('fn-pick'); sq.querySelector('.fn-lbl')?.remove(); }
      text.innerHTML = '';
      if (pick === 'front') {
        await stepTo(0);
        sfx('submit');
        await wait(500);
        return pxOut(el, () => { el.remove(); resolve('front'); }, 300);
      }
      await speak(FINALE.back.slice(0, 2));
      await stepTo(2);
      await speak(FINALE.back.slice(2));
      // 웅성웅성: 판 위 여기저기서 말풍선이 하나씩 터진다
      const bubbles = el.querySelector<HTMLElement>('.fn-bubbles')!;
      const spots = [[0, 1], [4, 0], [1, 5], [3, 5], [4, 3], [0, 3]];
      for (const [k, word] of FINALE.murmur.entries()) {
        const [c, r] = spots[k % spots.length];
        bubbles.insertAdjacentHTML('beforeend', `<i class="fn-bub" style="--c:${c};--r:${r}">${word}</i>`);
        sfx('tap', 3);
        await wait(380);
      }
      await speak(FINALE.stunned);
      pxOut(el, () => { el.remove(); resolve('back'); }, 300);
    })();
  });
