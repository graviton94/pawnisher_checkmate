/**
 * 전투 바탕 · 덱 · 분대 · 버림 단추 (D-640 · 발주 30위 BG-01 ~ 03 · BT-01).
 * - 바탕: 막마다 public/scenes/battle-{1,2,3}.png를 #app 뒤(::before)에 정수 배율로 덮어 깐다(coverBg — 비율 그대로 · 가운데 초점, D-386).
 * - 단추: 받은 쇠 단추 9-slice(pile-btn-{idle,down,new}.png, 왼 14 · 오른 35도트) + 왼쪽 문양 + 오른쪽 황동 소켓에 수(갈무리11).
 *   카드가 그 더미에 막 들어오면(수가 늘면) 「새 카드」 상태(소켓 황동 밝게 · 청록 등불 줄)를 잠깐 켠다.
 * 화면만 그린다 — 게임 상태는 바꾸지 않는다(UI 원칙 9).
 */
import deckPng from '../assets/ui/chrome/v2/pile-deck.png';
import crewPng from '../assets/ui/chrome/v2/pile-crew.png';
import discardPng from '../assets/ui/chrome/v2/pile-discard.png';
import { coverBg } from './uikit';
import './battlebg.css';
import { PILE_TEXT } from '../data/hud';

export type PileKey = 'deck' | 'crew' | 'discard';

const ICON: Record<PileKey, string> = { deck: deckPng, crew: crewPng, discard: discardPng };
/** 「새 카드」 상태를 켜 두는 시간 (ms) — 카드 한 장 날아드는 연출(≤ 1초) 뒤 한 박자 */
const NEW_MS = 1600;
const last: Partial<Record<PileKey, number>> = {};
const glowUntil: Partial<Record<PileKey, number>> = {};
const glowTimer: Partial<Record<PileKey, number>> = {};

/** 막 번호(1 ~ 3)의 전투 바탕을 깐다. 종막 · 4막은 3막 바탕을 쓴다 */
export const battleBg = (act: number): void => {
  const app = document.getElementById('app');
  if (!app) return;
  const n = Math.min(3, Math.max(1, Math.round(act) || 1));
  const url = new URL(`scenes/battle-${n}.png`, location.href).href;
  document.body.dataset.battleBg = String(n);
  app.style.setProperty('--battle-bg', `url(${url})`);
  coverBg(app, url, { vars: ['--battle-bg-size', '--battle-bg-pos'] });
};

/** 덱 줄 단추 셋. 수가 늘어난 더미는 NEW_MS 동안 「새 카드」 상태 */
export const pileRowHtml = (n: Record<PileKey, number>): string => {
  const now = performance.now();
  const keys: PileKey[] = ['deck', 'crew', 'discard'];
  for (const k of keys) {
    const prev = last[k];
    last[k] = n[k];
    if (k !== 'crew' && prev !== undefined && n[k] > prev) {
      glowUntil[k] = now + NEW_MS;
      window.clearTimeout(glowTimer[k]);
      glowTimer[k] = window.setTimeout(() => document.querySelector(`#deckrow [data-${k}]`)?.classList.remove('is-new'), NEW_MS);
    }
  }
  return keys
    .map((k) => {
      const fresh = (glowUntil[k] ?? 0) > now ? ' is-new' : '';
      return `<button type="button" class="pile-btn${fresh}" data-${k} aria-label="${PILE_TEXT.aria[k](n[k])}" title="${PILE_TEXT.name[k]}"><img class="pile-ico" src="${ICON[k]}" alt=""><b class="pile-n">${n[k]}</b></button>`;
    })
    .join('');
};
