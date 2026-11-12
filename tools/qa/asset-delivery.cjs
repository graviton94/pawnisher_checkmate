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
  const expected=await pg.evaluate(()=>window.sliceApi.squad().filter(u=>u.t!=='K').length+1);
  await pg.evaluate(()=>{void window.sliceApi.trueEnd();});await pg.waitForTimeout(400);
  const actorsFit=async(expected)=>{
    const boxes=await pg.locator('.pl-actors .piece-img').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().toJSON()));
    assert.equal(boxes.length,expected);
    const v=pg.viewportSize();
    assert(boxes.every(r=>r.left>=0&&r.right<=v.width&&r.top>=0&&r.bottom<=v.height));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];assert(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,'실제 기물 그림끼리 겹치지 않음');
    }
  };
  let dock=false,shipping=false,home=false;
  for(let i=0;i<20&&await pg.locator('.prologue').count();i++){
    const src=await pg.locator('.pl-stage>.pl-img').getAttribute('src');
    if(src==='scenes/throne-mold.png'){
      await assertScene('.pl-stage>.pl-img','throne-mold');assert.equal(await pg.locator('.pl-actors').count(),0);
      await shot('delivery-empty-mold');
    }
    if(src==='scenes/departure-dock.png'&&!dock){
      dock=true;await assertScene('.pl-stage>.pl-img','departure-dock');
      assert.equal(await pg.locator('.pl-actors .pl-pc').count(),expected,'현재 분대만 배경 위에 표시');
      assert.equal(await pg.locator('.pl-actors').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
      await actorsFit(expected);await shot('delivery-departure');
    }
    if(src==='scenes/shipping-interior.png'){
      shipping=true;await assertScene('.pl-stage>.pl-img','shipping-interior');
      assert.equal(await pg.locator('.pl-actors .pl-pc').count(),expected);
      await actorsFit(expected);await shot('delivery-shipping');
    }
    if(src==='scenes/epilogue-hands.png'){home=true;assert.equal(await pg.locator('.pl-pc').count(),0);break;}
    await require('./ui-bounds.cjs')(pg,'.prologue');
    await pg.locator('.prologue').tap({position:{x:80,y:80}});await pg.waitForTimeout(100);
  }
  assert(dock&&shipping&&home,'새 배경과 기존 부모/아이 장면까지 연결');
  await pg.locator('.cut-skip').tap();await pg.locator('.prologue').waitFor({state:'detached'});
  // 최대 허용 분대10명도 전부 보이고 서로 겹치지 않는다.
  await pg.evaluate(()=>{
    const us=window.sliceApi.squad(),sample=us.find(u=>u.t!=='K');
    while(us.length<10)us.push({...sample,serial:`cast-test-${us.length}`,name:`먼지투성이 ${us.length}`});
    void window.sliceApi.trueEnd();
  });
  await pg.waitForTimeout(300);
  for(let i=0;i<8&&!(await pg.locator('.pl-stage>.pl-img').getAttribute('src')).endsWith('departure-dock.png');i++){
    await pg.locator('.prologue').tap({position:{x:80,y:80}});await pg.waitForTimeout(100);
  }
  await actorsFit(10);await shot('delivery-full-company');
  await pg.locator('.cut-skip').tap();await pg.locator('.prologue').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log(`PASS asset-delivery: 4 exact icon payloads, mold choice, 3 exact scenes, actual company ${expected}, full company10, no overlaps or fixed home actors, image/text bounds`);
};
