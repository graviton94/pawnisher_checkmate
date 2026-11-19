import { describe, expect, it } from 'vitest';
import { LANG, localize, missingKeys, overlay, t } from '../src/data/locale';
import { UI_STRINGS_KO } from '../src/data/ui-strings';
import { CHROME_KO, CHROME_TEXT } from '../src/data/chrome';
import { MAIN_KO, MAIN_TEXT } from '../src/data/menu';
import { SETTINGS_KO, SETTINGS_TEXT } from '../src/data/settings';
import { HUD_KO, HUD_TEXT } from '../src/data/hud';
import { CHROME_EN, HUD_EN, MAIN_EN, SETTINGS_EN, UI_STRINGS_EN } from '../src/data/lang/en-ui';

/** 언어 층 (D-651): 한국어 기본 · 영어는 빈 칸이면 한국어로 떨어진다 */
describe('locale', () => {
  it('기본 언어는 한국어이고, 한국어 표는 원문 객체 그대로다 (동작이 예전과 같다)', () => {
    expect(LANG).toBe('ko');
    expect(MAIN_TEXT).toBe(MAIN_KO);
    expect(SETTINGS_TEXT).toBe(SETTINGS_KO);
    expect(HUD_TEXT).toBe(HUD_KO);
    expect(CHROME_TEXT).toBe(CHROME_KO);
  });

  it('t: 지금 언어 → 한국어 → 열쇠 순으로 찾고 {자리}를 채운다', () => {
    expect(t('hud.endTurn')).toBe('턴 끝');
    expect(t('hud.endTurn', undefined, 'en')).toBe('End');
    expect(t('없는.열쇠', undefined, 'en')).toBe('없는.열쇠');
    expect(t('hud.endTurn', { n: 1 }, 'en')).toBe('End');
  });

  it('UI 열쇠 표는 영어가 다 채워져 있다', () => {
    expect(missingKeys('en')).toEqual([]);
    expect(Object.keys(UI_STRINGS_EN).sort()).toEqual(Object.keys(UI_STRINGS_KO).sort());
  });

  it('overlay: 영어에 없는 칸은 한국어, 있는 칸은 영어 (함수 · 중첩 포함)', () => {
    const ko = { a: '가', b: { c: '나', d: '다' }, f: (n: number) => `${n}개` };
    const en = overlay(ko, { b: { c: 'C' }, f: (n: number) => `${n} pcs` });
    expect(en.a).toBe('가');
    expect(en.b).toEqual({ c: 'C', d: '다' });
    expect(en.f(3)).toBe('3 pcs');
    expect(localize(ko, { a: 'A' }, 'ko')).toBe(ko);
  });

  it('영어 크롬: 메뉴 · 설정 · HUD · 대국 글이 영어로 나오고 한글이 남지 않는다', () => {
    const en = {
      main: localize(MAIN_KO, MAIN_EN, 'en'),
      set: localize(SETTINGS_KO, SETTINGS_EN, 'en'),
      hud: localize(HUD_KO, HUD_EN, 'en'),
      chrome: localize(CHROME_KO, CHROME_EN, 'en'),
    };
    expect(en.main.ship).toBe('Start');
    expect(en.set.tabs.sound).toBe('Sound');
    expect(en.hud.turnHeat(3, 0.5)).toBe('Turn 3 · Heat 50%');
    expect(en.chrome.unit.order(2)).toBe('Moves 2nd');
    // 메인 메뉴 · 설정 탭 · 단추에 한글이 남지 않는다
    const shown = [en.main.cont, en.main.ship, en.main.records, en.main.settings, en.main.quit, ...Object.values(en.set.tabs), en.set.close, en.set.on, en.set.off];
    for (const s of shown) expect(s).not.toMatch(/[가-힣]/);
  });
});
