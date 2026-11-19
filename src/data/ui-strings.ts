import { registerStrings, t } from './locale';
import { UI_STRINGS_EN } from './lang/en-ui';

/**
 * 열쇠 글 표 (D-651 · D-652): `t('열쇠')`로 읽는 평평한 글. index.html의 고정 글(data-t · data-t-aria)과 uikit 공용 단추가 쓴다.
 * 한국어가 원문 — 영어 표(`lang/en-ui.ts`)에 없는 열쇠는 한국어로 나온다.
 */
export const UI_STRINGS_KO = {
  /** 세로 화면 안내 (index.html #rotate) */
  'app.rotate': '화면을 가로로 돌려 주십시오',
  /** 대국 머리 · 레일 (index.html) */
  'hud.apAria': '남은 태엽',
  'hud.turn1': '1턴',
  'hud.menu': '메뉴',
  'hud.speedAria': '속전 보상',
  'hud.partsAria': '부품',
  'hud.rewind': '되감기',
  'hud.rewindAria': '되감기 — 이번 턴 처음으로',
  'hud.endTurn': '턴 끝',
  /** 카드 레일 화살표 · 고르기 창 기본 단추 (uikit) */
  'ui.prevCard': '앞 카드',
  'ui.nextCard': '다음 카드',
  'ui.pick': '고른다',
} as const;
export type UiKey = keyof typeof UI_STRINGS_KO;

registerStrings({ ko: UI_STRINGS_KO, en: UI_STRINGS_EN });

/** 열쇠가 표에 있는 것만 받는 t (오타를 타입이 잡는다) */
export const ui = (key: UiKey, vars?: Readonly<Record<string, string | number>>): string => t(key, vars);

/**
 * 정적 HTML의 글을 지금 언어로 채운다: `data-t="열쇠"` → 글자, `data-t-aria="열쇠"` → aria-label.
 * 한국어면 HTML에 적힌 글과 같다 (다시 써도 화면이 바뀌지 않는다).
 */
export const applyStaticText = (root: ParentNode = document): void => {
  root.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => (el.textContent = t(el.dataset.t!)));
  root.querySelectorAll<HTMLElement>('[data-t-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.tAria!)));
};
