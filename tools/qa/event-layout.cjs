// 모든 사건의 선택지와 정보 쪽지를 실제로 연다. 판정과 효과 함수는 실행하지 않는다.
const assert = require('node:assert/strict');
const check = require('./ui-bounds.cjs');

module.exports = async (pg, shot) => {
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (['error','warning'].includes(m.type())) errors.push(m.text()); });
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const ids = await pg.evaluate(() => window.sliceApi.eventIds);
  let pages = 0;
  for (const id of ids) {
    await pg.evaluate((id) => { window.sliceApi.gold(300); window.sliceApi.event(id); }, id);
    await pg.waitForFunction(() => !document.querySelector('#overlay-panel').classList.contains('locked'));
    await check(pg, '.win-scene');
    const npc = await pg.locator('.ws-say').innerText();
    const buttons = pg.locator('[data-info]');
    for (let k = 0; k < await buttons.count(); k++) {
      await buttons.nth(k).tap();
      const count = Number((await pg.locator('.ws-detail-count').innerText()).split('/').at(-1));
      for (let i = 0; i < count; i++) {
        await check(pg, '.win-scene'); pages++;
        assert.equal(await pg.locator('.ws-say').innerText(), npc, `${id} NPC 대사 유지`);
        if (i < count - 1) await pg.locator('.ws-detail-next').tap();
      }
      await pg.locator('.ws-detail-close').tap();
    }
    if (['tinker','counterweight','gambler','swapDealer','crownAltar'].includes(id)) await shot(`event-layout-${id}`);
  }
  assert.deepEqual(errors, []);
  console.log(`PASS event-layout: ${ids.length} events / ${pages} info pages`);
};
