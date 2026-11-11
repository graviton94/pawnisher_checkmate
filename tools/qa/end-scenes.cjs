// 실제 터치: 출하 크레딧 → 장부, 승급 거절/확정, NPC 대사를 보존하는 효과 쪽지.
const assert = require('node:assert/strict');

module.exports = async (pg, shot) => {
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  const wait = (ms) => pg.waitForTimeout(ms);
  const check = (selector) => require('./ui-bounds.cjs')(pg, selector);
  const event = async (id) => {
    await pg.evaluate((id) => { window.sliceApi.gold(300); window.sliceApi.event(id); }, id);
    // 타자기 진행은 실제 대사/서술 칸을 터치해 끝낸다.
    await pg.locator('.ws-cap').tap(); await wait(80);
    await pg.locator('.ws-say').tap();
    await pg.waitForFunction(() => !document.querySelector('#overlay-panel').classList.contains('locked'));
    await wait(100);
  };
  await event('tinker');
  const dialogue = await pg.locator('.ws-say').innerText();
  await pg.locator('[data-info="1"]').tap(); await wait(250);
  assert.equal(await pg.locator('.ws-say').innerText(), dialogue, '정보가 NPC 대사를 바꾸면 안 된다');
  assert.equal(await pg.locator('.ws-choices .is-sel').count(), 0, '정보 버튼은 선택이 아니다');
  await check('.win-scene'); await shot('event-info');
  const text = await pg.locator('.ws-detail-text').innerText();
  await pg.locator('.ws-detail-next').tap();
  assert.notEqual(await pg.locator('.ws-detail-text').innerText(), text);
  await pg.locator('.ws-detail-close').tap();
  await pg.locator('[data-slot="0"]').tap(); await wait(100);
  assert.equal(await pg.locator('.ws-choices .is-sel').count(), 1);
  await pg.locator('[data-info="1"]').tap();
  assert.equal(await pg.locator('.ws-choices .is-sel').count(), 1);
  await pg.locator('[data-slot="0"]').tap();
  await pg.waitForFunction(() => document.querySelector('.win-scene')?.classList.contains('ws-done'), { timeout: 12000 });
  await pg.locator('.ws-say').tap(); await wait(200);
  await pg.locator('[data-final]').waitFor({ state: 'visible' });
  assert.equal(await pg.locator('.ws-detail').isVisible(), false);
  await check('.win-scene'); await shot('event-result');
  assert(await pg.locator('.ws-sum-i .effect-gain').count() > 0);

  await event('counterweight');
  const effect = await pg.locator('.choice-res').first().evaluate((e) => [...e.querySelectorAll('span')].map((s) => ({ text: s.textContent, color: getComputedStyle(s).color, weight: getComputedStyle(s.querySelector('b')).fontWeight })));
  assert(effect[0].text.includes('−1') && effect[1].text.includes('+1'));
  assert.notEqual(effect[0].color, effect[1].color);
  assert(effect.every((e) => e.weight === '700'));
  await check('.win-scene'); await shot('event-gains');

  for (const asc of [0, 1, 2]) {
    await pg.evaluate((a) => window.sliceApi.promote(a), asc); await wait(300);
    await pg.locator('.pm-dialogue').tap();
    const save = await pg.evaluate(() => JSON.stringify(localStorage));
    await check('.promotion');
    await pg.keyboard.press('Tab');
    assert(await pg.evaluate(() => !!document.activeElement.closest('.promotion')), '결정 장면 안에서 키보드 초점 유지');
    if (asc < 2) {
      await shot(`promote-${asc}`);
      await pg.locator('[data-lay]').tap();
      await pg.locator('.pm-stuck').waitFor({ state: 'visible' });
      assert.equal(await pg.evaluate(() => JSON.stringify(localStorage)), save, '거절 시도는 메타 진행을 바꾸지 않는다');
      await check('.promotion'); await shot(`promote-${asc}-refuse`);
    }
    await pg.locator('[data-promote]').tap();
    await pg.locator('.promotion').waitFor({ state: 'detached' });
  }
  // 긴 명단과 진 엔딩 기록도 모든 장에서 경계 안에 들어간다.
  await pg.evaluate(() => window.sliceApi.credits(14, true)); await wait(300);
  for (let i = 0; i < 4; i++) {
    await check('.credits');
    if (i === 0) await shot('credits-long-roster');
    await pg.locator('[data-cr-next]').tap(); await wait(260);
  }
  await pg.locator('.credits').waitFor({ state: 'detached' });
  // 실제 엔딩 흐름: 결정 → 승급 컷 → 메타 저장 → 크레딧 → 장부.
  const runs = await pg.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.meta') || '{}').runs || 0);
  await pg.evaluate(() => { const api = window.sliceApi; api.startAt(3, 'boss'); api.richRun(); api.setAct(2); api.endFlow(0); });
  await pg.locator('.promotion').waitFor({ state: 'visible' });
  await pg.locator('[data-promote]').tap();
  await pg.locator('.prologue .cut-skip').tap();
  await pg.locator('.credits').waitFor({ state: 'visible' }); await wait(400);
  await check('.credits'); await shot('run-clear');
  assert.equal(await pg.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.meta')).runs), runs + 1, '엔딩 확정 후 출하가 정확히 한 번 기록된다');
  await pg.keyboard.press('Tab');
  assert(await pg.evaluate(() => !!document.activeElement.closest('.credits')), '크레딧 안에서 키보드 초점 유지');
  assert.equal(await pg.locator('.cr-photo,.cr-crown').count(), 0);
  assert(await pg.locator('.cr-person').count() > 1);
  await pg.locator('[data-cr-next]').tap(); await wait(300);
  await check('.credits'); await shot('credits-makers');
  assert((await pg.locator('.cr-page').innerText()).includes('당신의 하루 스튜디오'));
  await pg.locator('[data-cr-next]').tap();
  await pg.locator('.clr').waitFor({ state: 'visible' });
  await pg.waitForFunction(() => [...document.querySelectorAll('.clr-rows > div')].every((r) => r.classList.contains('in'))
    && [...document.querySelectorAll('.clr-rows b[data-v]')].every((b) => b.textContent === b.dataset.v));
  await wait(350);
  await require('./art-source.cjs')(pg, await pg.locator('.clr-cert').evaluate((e) => getComputedStyle(e).borderImageSource), 'src/assets/ui/chrome/v2/ledger-slip.png');
  for (const pseudo of ['::before', '::after']) assert.equal(await pg.locator('.clr-cert').evaluate((e, p) => getComputedStyle(e, p).display, pseudo), 'none');
  assert.equal(await pg.locator('.state-band').count(), 0);
  await check('.clr'); await shot('clear-ledger');
  assert.deepEqual(errors, [], '브라우저 오류/경고');
  console.log('PASS end-scenes: events, story choices 1/2/3, credits, result ledger');
};
