// 받은 원본에서 생성된 PNG가 실제 카드·결정·엔딩에 연결됐는지 검사한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
module.exports = async (pg, shot) => {
  const errors=[];pg.on('pageerror',(e)=>errors.push(e.message));
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.waitForTimeout(2400);
  await pg.evaluate(()=>window.sliceApi.buildTrial('mixed'));
  await pg.waitForTimeout(3500);
  const ids=['lastBreath','ledger','veteran','deathMark'];
  await pg.evaluate((ids)=>window.sliceApi.allFaces(ids),ids);await pg.waitForTimeout(500);
  for(const id of ids){
    const image=await pg.locator(`[data-part-id="${id}"] .cf-win .ico`).evaluate(e=>getComputedStyle(e).backgroundImage);
    await require('./art-source.cjs')(pg,image,`public/ui/icons16/${id}.png`);
  }
  await shot('delivery-items');
  await pg.locator('[data-part-id="deathMark"]').evaluate(e=>e.scrollIntoView({inline:'end',block:'nearest'}));
  await pg.waitForTimeout(350);await shot('delivery-items-end');await pg.tap('[data-x]');
  await pg.evaluate(()=>window.sliceApi.promote(2));await pg.waitForTimeout(500);
  const assertScene=async(selector,name)=>{
    const img=pg.locator(selector);await img.waitFor({state:'visible'});
    await pg.waitForFunction((s)=>{const i=document.querySelector(s);return i?.complete&&i.naturalWidth>0},selector);
    assert.equal(await img.getAttribute('src'),`scenes/${name}.png`);
    const bytes=await(await pg.request.get(new URL(await img.getAttribute('src'),pg.url()).href)).body();
    assert(bytes.equals(fs.readFileSync(`public/scenes/${name}.png`)));
    assert.deepEqual(await img.evaluate(i=>[i.naturalWidth,i.naturalHeight]),[320,180]);
  };
  await assertScene('.promotion .pm-art img','throne-mold');
  await require('./ui-bounds.cjs')(pg,'.promotion');await shot('delivery-choice');
  await pg.tap('[data-lay]');await pg.locator('.promotion').waitFor({state:'detached'});
  await require('./cinematics.cjs')(pg,shot);
  assert.deepEqual(errors,[]);
  console.log('PASS asset-delivery: 4 exact icons, mold choice, dedicated cinematic flow');
};
