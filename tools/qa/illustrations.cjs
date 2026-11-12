// 현재 장면 전체의 실제 컷신 경로를 검사한다. 내용/화풍 판정과 기하 검사를 구분한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const bounds = require('./ui-bounds.cjs');
module.exports = async (pg, shot) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; pg.on('pageerror', e => errors.push(e.message));
  const scenes = fs.readdirSync('public/scenes').filter(x => x.endsWith('.png'));
  for (const file of scenes) {
    await pg.evaluate(img => { void window.sliceApi.artScene(img); }, file.slice(0,-4));
    await pg.locator('.prologue .pl-img').waitFor({ state:'visible' });
    await pg.waitForFunction(() => { const i=document.querySelector('.prologue .pl-img');return i?.complete && i.naturalWidth; });
    await bounds(pg,'.prologue');
    assert.equal(await pg.locator('.prologue img[data-cover]').count(),1);
    if (['departure-decision.png','shipping-company.png','gilded-solitude.png','boss-inspector.png','smith.png','epilogue-hands.png'].includes(file)) await shot(`cover-${file.slice(0,-4)}`);
    await pg.locator('.cut-skip').tap();
    await pg.locator('.prologue').waitFor({ state:'detached' });
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS illustrations: ${scenes.length} actual cut images, aspect/coverage/device grid/text/touch bounds`);
};
