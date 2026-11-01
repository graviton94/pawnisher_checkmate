import { sfx } from '../audio/sfx';
import { MOTION } from '../data/motion';
import { burst, vignette } from './juice';

/**
 * 조작 반응 모션 (D-109): 누름 · 화면 전환 · 카드 등장 · 고름(고른 것은 들리고 나머지는 사라짐).
 * 원칙 (CLAUDE.md UI 5·6): 누르면 즉시 반응, 예비 동작 → 터짐 → 출렁임, 지수형 곡선.
 * prefers-reduced-motion이면 움직임 없이 바로 넘어간다. 게임 상태는 건드리지 않는다.
 */
export const calm = (): boolean => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** 잠깐 입력을 막는다 (연출 중 두 번 눌림 방지) — 막힌 동안 body.busy */
const lock = (ms: number): void => {
  document.body.classList.add('busy');
  window.setTimeout(() => document.body.classList.remove('busy'), ms);
};

/** 사라지는 쪽: 지금 모습을 복제해 그 자리에 두고 흐리게 지운다 (새 화면은 바로 그 아래 그려진다) */
export const ghostOut = (el: HTMLElement, cls: string, ms: number): void => {
  if (calm() || el.hidden) return;
  const g = el.cloneNode(true) as HTMLElement;
  g.removeAttribute('id');
  g.classList.add('ghost', cls);
  g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  g.setAttribute('aria-hidden', 'true');
  el.parentElement!.insertBefore(g, el.nextSibling);
  window.setTimeout(() => g.remove(), ms);
};

/** 클래스 애니메이션을 처음부터 다시 */
export const replay = (el: Element, cls: string): void => {
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
};

/**
 * 고름: 고른 것은 들리며 금빛으로 번쩍, 같은 줄의 나머지는 가라앉으며 사라진 뒤 then.
 * 고를 수 없는 것(.poor · .sold)은 흔들기만 하고 바로 then (이유 토스트는 then이 띄운다).
 */
export const choose = (el: HTMLElement, then: () => void, dismissPeers = true): void => {
  if (el.classList.contains('poor') || el.classList.contains('sold')) {
    replay(el, 'nope');
    return then();
  }
  if (calm()) return then();
  const peers = dismissPeers ? ([...(el.parentElement?.children ?? [])].filter((x) => x !== el && x.tagName === el.tagName) as HTMLElement[]) : [];
  el.classList.add('picked');
  // 등급별 고름 (D-113): 레어 청색 파편 · 유니크 보라 파편 + 소리 · 에픽 주황 파편 + 가장자리 빛
  if (el.classList.contains('g-rare')) burst(el, 'blue', 10);
  else if (el.classList.contains('g-unique')) {
    burst(el, 'rare', 18);
    sfx('rare');
  } else if (el.classList.contains('g-epic')) {
    burst(el, 'epic', 30);
    vignette('epic', 0.7);
  }
  peers.forEach((p, i) => {
    p.style.setProperty('--d', `${i * MOTION.dismissStagger}ms`);
    p.classList.add('dismissed');
  });
  const ms = dismissPeers ? MOTION.choose : MOTION.buy;
  lock(ms);
  window.setTimeout(then, ms);
};

/** 모두 버림 (건너뛰기): 줄 전체가 가라앉고 then */
export const dismissAll = (box: Element | null, then: () => void): void => {
  if (!box || calm()) return then();
  [...box.children].forEach((p, i) => {
    (p as HTMLElement).style.setProperty('--d', `${i * MOTION.dismissStagger}ms`);
    p.classList.add('dismissed');
  });
  lock(MOTION.choose);
  window.setTimeout(then, MOTION.choose);
};

/** 누름 소리: 누를 수 있는 버튼을 누르는 순간 짧은 딸깍 (손을 떼기 전 반응) */
export const installPressFeedback = (): void => {
  document.addEventListener(
    'pointerdown',
    (e) => {
      const b = (e.target as Element | null)?.closest?.('button');
      if (b && !(b as HTMLButtonElement).disabled && !document.body.classList.contains('busy')) sfx('tap');
    },
    { passive: true },
  );
};
