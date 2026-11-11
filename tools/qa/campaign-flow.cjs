const assert = require('node:assert/strict');
const bounds = require('./ui-bounds.cjs');
module.exports = async (pg, shot) => {
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (['error','warning'].includes(m.type())) errors.push(m.text()); });
  const wait = (n = 200) => pg.waitForTimeout(n);
  const meta = () => pg.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.meta')));
  const boot = async () => { await pg.waitForSelector('#boot', { state: 'detached' }); await wait(); };
  const finishCuts = async () => { await pg.locator('.prologue .cut-skip').tap(); await pg.locator('.prologue').waitFor({ state: 'detached' }); };
  const home = async () => {
    await pg.locator('.credits [data-cr-result]').tap();
    await pg.locator('.clr').waitFor({ state: 'visible' }); await wait(500);
    await bounds(pg, '.clr');
    const ctx = await pg.evaluate(() => window.sliceApi.context());
    await shot(`campaign-ledger-${ctx.mode}-${ctx.chapter + 1}`);
    await pg.locator('.clr [data-go]').tap();
    await pg.waitForSelector('#boot', { state: 'detached' });
    await pg.locator('.op-menu').waitFor({ state: 'visible' }); await wait();
  };
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const base = new URL(pg.url()); base.search = '?debug&opening';
  await pg.evaluate(() => { localStorage.clear(); sessionStorage.setItem('op-menu', '1'); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ campaignVersion: 1, runs: 0, clears: 0, storyCleared: 0, challengeOpen: 3, prologue: true, tut: ['battle','battle-a','battle-b','map','event','kit','recruit'], daily: {}, nemeses: [] })); });
  await pg.goto(base.href); await boot();
  await bounds(pg, '.op-menu'); await shot('campaign-menu-locked');
  assert(await pg.locator('[data-mode="challenge"]').isDisabled());
  await pg.locator('[data-level-pick]').tap();
  assert.equal(await pg.locator('[data-chapter]').count(), 3);
  assert(await pg.locator('[data-chapter="1"]').isDisabled());
  await bounds(pg, '#overlay-panel'); await shot('campaign-chapters');
  await pg.locator('[data-x]').tap();
  const identities = [];
  let oldSave;
  for (const chapter of [0,1,2]) {
    await pg.locator('.op-menu [data-go]').tap();
    if (chapter > 0) await finishCuts();
    await pg.locator('.opening').waitFor({ state: 'detached' });
    const ctx = await pg.evaluate(() => window.sliceApi.context());
    assert.equal(ctx.mode, 'story'); assert.equal(ctx.chapter, chapter); assert.equal(ctx.asc, chapter);
    if (chapter === 0) oldSave = await pg.evaluate(() => JSON.parse(localStorage.getItem('pawnisher.slice.save')));
    identities.push(await pg.evaluate(() => `${window.sliceApi.context().runId}:${window.sliceApi.squad().find((u) => u.t === 'K').serial}`));
    if (chapter === 0) {
      assert.equal(await pg.evaluate(() => window.sliceApi.squad().find((u) => u.t === 'N').name), '박차');
      await pg.evaluate(() => window.sliceApi.nextAct());
      await pg.locator('.clr').waitFor({ state: 'visible' }); await wait(400);
      await pg.locator('.clr [data-go]').tap();
      await pg.locator('.prologue').waitFor({ state: 'visible' });
      await shot('campaign-promise'); await finishCuts();
      await pg.waitForFunction(() => !!window.sliceApi.context().promise);
      const promised = await pg.evaluate(() => window.sliceApi.context().promise);
      await pg.waitForFunction(() => { const sv = JSON.parse(localStorage.getItem('pawnisher.slice.save') || '{}'); return sv.at === 'map' && !!sv.promise; });
      assert(await pg.evaluate((serial) => window.sliceApi.squad().some((u) => u.serial === serial), promised.serial));
      // 실제 이어하기에 약속의 일련번호와 장이 함께 저장된다.
      await pg.reload(); await boot();
      await pg.locator('[data-cont]').tap(); await pg.locator('.opening').waitFor({ state: 'detached' });
      assert.equal((await pg.evaluate(() => window.sliceApi.context().promise)).serial, promised.serial);
    }
    await pg.evaluate((ch) => window.sliceApi.endFlow(ch), chapter);
    await pg.locator('.promotion').waitFor({ state: 'visible' });
    await bounds(pg, '.promotion'); await shot(`campaign-choice-${chapter + 1}`);
    const before = (await meta()).runs;
    if (chapter < 2) {
      assert.equal(await pg.locator('[data-lay]').innerText(), '돌아본다');
      await pg.locator('[data-lay]').tap();
      assert.equal((await meta()).runs, before);
      await pg.locator('[data-promote]').tap();
    } else {
      assert.equal(await pg.locator('[data-lay]').innerText(), '함께 나간다');
      await pg.locator('[data-lay]').tap();
    }
    if (chapter === 2) {
      for (let i = 0; i < 14 && !(await pg.locator('.cut-lines').innerText()).includes('반품하자'); i++) { await pg.locator('.prologue').tap({ position: { x: 100, y: 100 } }); await wait(60); }
      const parent = await pg.locator('.cut-lines').innerText();
      assert(parent.includes('부모') && parent.includes('아이') && parent.includes('난 이 세트가 좋아'));
      assert.equal(await pg.locator('.prologue .pl-img[data-cover]').getAttribute('src'), 'scenes/epilogue-hands.png');
      assert.equal(await pg.locator('.prologue .pl-pc').count(), 0, '고정 동료 대역을 집 장면에 겹치지 않는다');
      assert.equal(await pg.locator('.state-band').count(), 0, '이전 대국 띠가 엔딩을 덮지 않는다');
      await bounds(pg, '.prologue'); await shot('campaign-child-dialogue');
    }
    await finishCuts();
    await pg.locator('.credits').waitFor({ state: 'visible' }); await wait();
    assert.equal((await meta()).storyCleared, chapter + 1);
    assert.equal((await meta()).runs, before + 1);
    assert.equal((await meta()).trueEnd, chapter === 2);
    await bounds(pg, '.credits'); await shot(`campaign-ending-${chapter + 1}`);
    await home();
    await bounds(pg, '.op-menu');
  }
  assert.equal(new Set(identities).size, 3, '각 장은 새 출하의 인물 ID다');
  assert(await pg.locator('[data-mode="challenge"]').isEnabled());
  await shot('campaign-menu-challenge');
  await pg.locator('[data-level-pick]').tap(); await bounds(pg, '#overlay-panel'); await shot('campaign-difficulty'); await pg.locator('[data-x]').tap();
  await pg.locator('.op-menu [data-go]').tap(); await pg.locator('.opening').waitFor({ state: 'detached' });
  assert.equal((await pg.evaluate(() => window.sliceApi.context())).mode, 'challenge');
  const story = await meta();
  await pg.evaluate(() => window.sliceApi.challengeEnd(3));
  await pg.locator('.credits').waitFor({ state: 'visible' });
  assert.equal(await pg.locator('.promotion,.prologue').count(), 0, '선택 도전에서 본편 엔딩을 재강제하지 않는다');
  const challenged = await meta();
  assert.equal(challenged.challengeOpen, 4); assert.equal(challenged.storyCleared, story.storyCleared); assert.equal(challenged.trueEnd, true);
  await shot('campaign-challenge-clear'); await home();
  // 셋째 장을 다시 읽을 수 있다. 동료가 전멸해도 새로운 배우를 만들어 내지 않는다.
  await pg.locator('[data-mode="story"]').tap();
  await pg.locator('.op-menu [data-go]').tap(); await finishCuts(); await pg.locator('.opening').waitFor({ state: 'detached' });
  await pg.evaluate(() => { window.sliceApi.squad().splice(1); window.sliceApi.endFlow(2); });
  await pg.locator('[data-lay]').tap();
  await pg.locator('.prologue').waitFor({ state: 'visible' }); await shot('campaign-empty-ending'); await finishCuts();
  assert.equal((await meta()).storyCleared, 3);
  await home();
  // 모드가 없던 옛 저장은 도전으로 계속하며, 새 본편을 본 것으로 만들지 않는다.
  delete oldSave.mode; delete oldSave.chapter; delete oldSave.promise; delete oldSave.storyBeats; oldSave.asc = 13;
  await pg.evaluate((save) => { localStorage.setItem('pawnisher.slice.save', JSON.stringify(save)); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ runs: 42, clears: 14, ascOpen: 13, trueEnd: true, prologue: true, daily: {}, nemeses: [], tut: ['battle','battle-a','battle-b','map'] })); sessionStorage.setItem('op-menu', '1'); }, oldSave);
  await pg.reload(); await boot();
  const legacy = await pg.evaluate(() => window.sliceApi.progress());
  assert.equal(legacy.storyCleared, 0); assert.equal(legacy.trueEnd, false); assert.equal(legacy.legacyStory.trueEnd, true); assert.equal(legacy.runs, 42);
  assert(await pg.locator('[data-mode="challenge"]').isDisabled());
  await bounds(pg, '.op-menu'); await shot('campaign-legacy-resume');
  await pg.locator('[data-cont]').tap(); await pg.locator('.opening').waitFor({ state: 'detached' });
  const resumed = await pg.evaluate(() => window.sliceApi.context());
  assert.equal(resumed.mode, 'challenge'); assert.equal(resumed.asc, 13);
  assert.equal(await pg.evaluate(() => window.sliceApi.squad()[0].serial), oldSave.squad[0].serial);
  assert.deepEqual(errors, [], '브라우저 오류/경고');
  console.log('PASS campaign-flow: 3 distinct pawns, promise/resume, real departure, unlocks, separate challenge, empty company, legacy resume');
};
