// 설정 창 (D-530 → D-539 여섯 탭) 실화면: 타이틀 메뉴 → 설정 → 크기 · 움직임 · 만든 이 · 전문 쪽 넘김 · 진행 초기화 두 단계 → 대국 중 메뉴 단추 → 멈춤 → 설정.
// 사용: node tools/slice-observe.cjs settings
module.exports = async (pg, shot) => {
  const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
  const wait = (ms = 500) => pg.waitForTimeout(ms);
  const tap = async (sel) => { await pg.tap(sel); await wait(450); };
  await pg.goto(BASE);
  await pg.evaluate(() => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true })); sessionStorage.setItem('op-menu', '1'); });
  await pg.reload(); await pg.waitForSelector('#boot', { state: 'detached' }); await wait(1200);
  await shot('settings-0-menu');
  await tap('[data-settings]');
  await wait(400);
  await shot('settings-1-main');
  console.log('MAIN_OVERFLOW', await pg.evaluate(() => { const b = document.querySelector('.set-body'); return b ? [b.scrollHeight - b.clientHeight, b.scrollWidth - b.clientWidth] : null; }));
  // 효과음 두 칸 올리고 음악 끄기
  await tap('[data-vol="sfx"] [data-up]'); await tap('[data-vol="sfx"] [data-up]');
  await tap('[data-vol="music"] [data-mute]');
  await shot('settings-2-sound');
  await tap('[data-set-tab="access"]');
  await tap('[data-seg="motion"][data-v="on"]');
  const st = await pg.evaluate(() => ({ saved: localStorage.getItem('pawnisher.settings'), calm: document.documentElement.dataset.calm, rules: [...document.styleSheets].flatMap((s) => { try { return [...s.cssRules]; } catch { return []; } }).filter((r) => r instanceof CSSMediaRule && /min-width: 0px/.test(r.media.mediaText)).length }));
  console.log('STATE', JSON.stringify(st));
  await shot('settings-2-screen');
  await tap('[data-set-tab="info"]');
  await tap('[data-credits]');
  await shot('settings-3-credits');
  console.log('CREDITS_OVERFLOW', await pg.evaluate(() => { const b = document.querySelector('.set-body'); return b ? [b.scrollHeight - b.clientHeight, b.scrollWidth - b.clientWidth] : null; }));
  await tap('[data-lic="0"]');
  await shot('settings-4-license-p1');
  await tap('[data-lic-next]');
  await shot('settings-5-license-p2');
  const pages = await pg.evaluate(() => document.querySelector('#overlay-panel .btn-row .mid')?.textContent);
  console.log('PAGES', pages, 'overflow', await pg.evaluate(() => { const b = document.querySelector('.set-text'); return b ? b.scrollHeight - b.clientHeight : null; }));
  await tap('[data-lic-x]');
  await tap('[data-x]');
  await tap('[data-set-tab="game"]');
  if (!(await pg.$('[data-reset]'))) await tap('[data-set-next]');
  await tap('[data-reset]');
  await shot('settings-6-reset1');
  await tap('[data-yes]');
  await shot('settings-7-reset2');
  await tap('[data-no]');
  await tap('[data-set-tab="access"]');
  await tap('[data-seg="motion"][data-v="os"]');
  console.log('SCREEN_OVERFLOW', await pg.evaluate(() => { const b = document.querySelector('.set-body'); return b ? [b.scrollHeight - b.clientHeight, b.scrollWidth - b.clientWidth] : null; }));
  await tap('[data-set-x]');
  // 대국 중: 메뉴 단추 → 멈춤 → 설정
  await pg.goto(BASE + '?debug'); await pg.waitForSelector('#boot', { state: 'detached' }); await wait(800);
  const s = await pg.$('.stagefx'); if (s) { await s.click(); await wait(600); }
  await tap('#btn-menu');
  await wait(400);
  await shot('settings-8-pause');
  await tap('[data-pz-set]');
  await shot('settings-9-from-battle');
  // PC 줄(전체 화면 · 게임 끝내기)이 들어가도 넘치지 않는지
  await pg.evaluate(() => window.sliceApi.settingsWin(true)); await wait(600);
  await tap('[data-set-tab="screen"]');
  await shot('settings-10-desktop');
  const h = await pg.evaluate(() => { const p = document.querySelector('#overlay-panel'); return p ? Math.round(p.getBoundingClientRect().height) : null; });
  // 진행 초기화 끝까지: 대국 중에 지우고 다시 읽은 뒤 저장 · 기록이 남지 않았는지 (설정은 남는다)
  await pg.tap('[data-set-tab="game"]').catch(() => {});
  await wait(300);
  if (!(await pg.$('[data-reset]'))) await tap('[data-set-next]');
  await tap('[data-reset]'); await tap('[data-yes]');
  await Promise.all([pg.waitForNavigation({ timeout: 10000 }).catch(() => {}), pg.tap('[data-yes]')]);
  await wait(1500);
  console.log('AFTER_RESET', JSON.stringify(await pg.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('pawnisher')))));
  console.log('WIN_H', h, 'BODY_OVERFLOW', await pg.evaluate(() => { const b = document.querySelector('.set-body'); return b ? b.scrollHeight - b.clientHeight : null; }));
};
