import { SHAKE_MUL, type ShakePref } from '../data/settings';
import { reduceFlash, setFlashPref } from './motion';

/**
 * 화면 흔들림 · 번쩍임 줄이기 · 컷신 자동 넘김 (D-539). 연출 코드는 이 값만 묻는다 — 움직임 줄이기(motion.ts)와 같은 방식.
 * 번쩍임 줄이기는 motion.ts의 setFlashPref · reduceFlash(D-538 FX 정리 — 움직임 줄이기면 함께 꺼짐) 하나로 모은다.
 * CSS 쪽은 <html data-shake="off|weak|normal" data-noflash="1"> 로 같은 값을 따른다.
 */
let shake: ShakePref = 'normal';
let auto = false;

/** 흔들림 배율 (끔 0 · 약하게 0.5 · 보통 1) — 진폭에 곱한다 */
export const shakeMul = (): number => SHAKE_MUL[shake];
/** 흰 · 붉은 화면 섬광을 걷어야 하나 */
export const lessFlash = (): boolean => reduceFlash();
let cb = false;
/** 색 보조 무늬 (D-539): 적 위협 · 적 범위 칸 빗금, 적 HP 게이지 체크 무늬 — 판 그리기가 묻는다 */
export const cbAid = (): boolean => cb;
export const setCbAid = (v: boolean): void => {
  cb = v;
  if (typeof document !== 'undefined') document.documentElement.dataset.cb = v ? '1' : '0';
};
/** 컷신 글을 다 찍은 뒤 저절로 다음 쪽으로 가나 */
export const autoAdvance = (): boolean => auto;

/** 설정을 연출에 입힌다 */
export const setFxPrefs = (o: { shake: ShakePref; lessFlash: boolean; autoAdvance: boolean }): void => {
  shake = o.shake;
  auto = o.autoAdvance;
  setFlashPref(o.lessFlash);
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.shake = shake;
};
