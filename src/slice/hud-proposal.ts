/**
 * 시안 전용 (2026-11-16 사용자 피드백 — 속전 보상 계기 · 반장 이름 띠): 기본값은 지금 화면 그대로.
 * 주소에 `?hud=a|b|c`(속전 계기 시안) · `?boss=x|y|z`(반장 띠 시안)를 붙일 때만 켜진다. 확정 전에는 게임 규칙 · 데이터를 건드리지 않는다.
 * 그림은 이미 받은 에셋만 조합한다(D-386): 지갑 · 진공관 · 꼬리표 · 적 이름 명패 · 움푹 칸.
 */
import { pieceImg } from '../ui/sprites';
import { rollNumber, replay } from './fx3';

const q = new URLSearchParams(location.search);
/** 속전 계기 시안: a = 지갑 숫자 · b = 한 턴 한 관 · c = 턴 끝 값표 */
export const HUD_V = (['a', 'b', 'c'] as const).find((v) => v === q.get('hud')) ?? null;
/** 반장 띠 시안: x = 목록 머리 명패 · y = 판 위 꼬리표 · z = 의도 목록 첫 줄 */
export const BOSS_V = (['x', 'y', 'z'] as const).find((v) => v === q.get('boss')) ?? null;
if (HUD_V) document.body.classList.add(`hp-${HUD_V}`);
if (BOSS_V) document.body.classList.add(`hb-${BOSS_V}`);
if (HUD_V || BOSS_V) void import('./hud-proposal.css');

type Speed = { coins: number; max: number; was: number | null; reward: number; per: number; calm: boolean };

/** 속전 계기 시안 그리기 — `#coins` 안을 시안 마크업으로 바꾼다. 줄어드는 순간 연출까지 */
export const speedProposal = (host: HTMLElement, s: Speed): void => {
  const drop = s.was !== null && s.was > s.coins && !s.calm;
  const prevReward = drop ? s.reward + s.per * (s.was! - s.coins) : s.reward;
  if (HUD_V === 'a') {
    // A — 지갑 + 큰 숫자 하나 (Balatro 점수 · StS 나사): 이기면 받는 나사가 주인공, 아래 한 줄로 「턴 끝 −4」
    host.innerHTML = `<span class="pa-w"><i class="pa-bag" aria-hidden="true"></i><b class="pa-n">${prevReward}</b></span><span class="pa-sub"><span>이기면 나사</span><span class="pa-cost">턴 끝 −${s.per}</span></span>`;
  } else if (HUD_V === 'b') {
    // B — 한 턴 = 진공관 하나 (ITB 칸 · D-209 관 줄): 남은 턴을 셀 수 있고, 이번 턴 끝에 꺼질 관이 깜빡인다
    const tubes = Array.from({ length: s.max }, (_, i) => {
      const st = i < s.coins - 1 ? 'lit' : i === s.coins - 1 ? 'next' : 'dead';
      const out = drop && i >= s.coins && i < s.was! ? ' out' : '';
      return `<i class="pb-t t-${st}${out}"></i>`;
    }).join('');
    host.innerHTML = `<span class="pb-lbl">속전 <b class="pb-n">${prevReward}</b><i class="coin-key" aria-hidden="true"></i></span><span class="pb-row">${tubes}</span>`;
  } else {
    // C — 값은 결정하는 자리에: 위엔 받을 나사 한 줄, 「턴 끝」 단추에 붉은 값표 「−4」가 매달린다 (ITB · Monster Train 결과 미리 보기)
    host.innerHTML = `<span class="pc-lbl">속전<i class="coin-key" aria-hidden="true"></i><b class="pc-n">${prevReward}</b></span>`;
    let tag = document.getElementById('pc-cost');
    if (!tag) {
      tag = document.createElement('i');
      tag.id = 'pc-cost';
      document.getElementById('btn-end')?.parentElement?.appendChild(tag);
    }
    tag.hidden = s.coins <= 0;
    tag.innerHTML = `<i class="coin-key" aria-hidden="true"></i>−${s.per}`;
    tag.setAttribute('aria-label', `턴을 끝내면 속전 나사 −${s.per}`);
    if (drop) replay(tag, 'snap');
  }
  if (!drop) return;
  const num = host.querySelector<HTMLElement>('.pa-n, .pb-n, .pc-n');
  const box = host.querySelector<HTMLElement>('.pa-w, .pb-lbl, .pc-lbl');
  if (num && box) {
    // 예비(움츠림) → 숫자가 계단으로 줄어듦 → 쾅 출렁 + 붉은 도트 낱말 「−4」가 떠올라 디더로 지워진다
    const pop = document.createElement('i');
    pop.className = 'hp-pop';
    pop.textContent = `−${prevReward - s.reward}`;
    box.appendChild(pop);
    window.setTimeout(() => pop.remove(), 1400);
    void rollNumber(num, prevReward, s.reward, box);
  }
};

/** 반장 띠 시안 — 진홍 큰 단추(#boss) 대신. 누르면 지금처럼 규칙 창(#boss 클릭) */
export const bossProposal = (b: { boss: boolean; bossPat?: string }, name: string, _pat: string | null, at: { x: number; y: number } | null): void => {
  const chip = document.getElementById('boss');
  if (!chip) return;
  if (BOSS_V === 'x') {
    // X — 목록 머리 한 줄: 「적의 수」 글 자리에 적 이름 명패(name-foe). ? 단추와 같은 48 줄 안 — 띠 한 칸(48 + 8)이 비워진다
    const lbl = document.querySelector<HTMLElement>('.rmid .r-head .r-lbl');
    if (lbl) lbl.innerHTML = b.boss ? `<button type="button" class="hbx-name" data-boss-open>${name}</button>` : '적의 수';
    lbl?.querySelector('[data-boss-open]')?.addEventListener('click', () => chip.click());
    return;
  }
  if (BOSS_V === 'z') {
    // Z — 의도 목록 첫 줄(32): 반장 얼굴 24 · 이름 · 「규칙 보기」(이번 패턴은 바로 아래 줄이 이미 말한다). 같은 줄 문법이라 띠가 「목록의 머리」로 읽힌다
    const ints = document.getElementById('intents');
    ints?.querySelector('.hbz-row')?.remove();
    if (b.boss && ints) {
      const row = document.createElement('span');
      row.className = 'it-row hbz-row';
      row.innerHTML = `<span class="who">${pieceImg('K', 1, 'small', 24)}</span><b class="hbz-name">${name}</b><span class="hbz-pat">규칙 보기</span>`;
      row.addEventListener('click', (e) => { e.stopPropagation(); chip.click(); });
      ints.prepend(row);
    }
    return;
  }
  // Y — 판 위 꼬리표: 2×2 몸 왼쪽 아래 모서리에 적 이름 명패 한 장. 레일에서는 뺀다
  let tag = document.getElementById('hby-tag');
  if (!tag) {
    tag = document.createElement('button');
    tag.id = 'hby-tag';
    (tag as HTMLButtonElement).type = 'button';
    tag.addEventListener('click', () => chip.click());
    document.body.appendChild(tag);
  }
  tag.hidden = !b.boss || !at;
  if (at) { tag.style.left = `${Math.round(at.x)}px`; tag.style.top = `${Math.round(at.y)}px`; }
  tag.textContent = name;
};
