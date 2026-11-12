// 기물 정보를 연 상태에서 장소/팝업/컷으로 옮겨도 전투 입력과 검사판이 새 화면을 침범하지 않는다.
const assert = require('node:assert/strict');
module.exports = async (pg,shot) => {
  const scenes = ['crew','shop','forge','partPick','map','help','promote','credits','pro','event','act-clear','boss-intro'];
  for (const scene of scenes) {
    await pg.goto(pg.url().split('?')[0]+'?debug');
    await pg.waitForSelector('#boot',{state:'detached'});
    await pg.evaluate(()=>window.sliceApi.startAt(1,'battle'));
    await pg.waitForTimeout(300);
    const pos=await pg.evaluate(()=>{const k=window.slice().s.pieces.find(p=>p.side===1&&p.type==='K');return {x:k.x,y:k.y};});
    await pg.evaluate(pos=>window.sliceApi.peekAt(pos),pos);
    assert.equal(await pg.locator('.unit-peek').count(),1,`${scene}: setup info`);
    await pg.evaluate(scene=>{
      const a=window.sliceApi;
      if(scene==='event')a.event('tinker');
      else if(scene==='act-clear'){a.setAct(0);a.nextAct();}
      else if(scene==='boss-intro')a.intro(1,'boss');
      else if(scene==='map')a.map(2);
      else if(scene==='help')a.help('dict');
      else if(scene==='promote')void a.promote(2);
      else if(scene==='credits')void a.credits();
      else if(scene==='pro')void a.pro();
      else a[scene]();
    },scene);
    await pg.waitForTimeout(500);
    assert.equal(await pg.locator('.k-peek').count(),0,`${scene}: old info cleared`);
    const original=await pg.evaluate(()=>JSON.stringify(window.slice()));
    await pg.evaluate(pos=>{window.sliceApi.peekAt(pos);void window.sliceApi.tap(pos);},pos);
    await pg.waitForTimeout(100);
    assert.equal(await pg.locator('.k-peek').count(),0,`${scene}: background input blocked`);
    assert.equal(await pg.evaluate(()=>JSON.stringify(window.slice())),original,`${scene}: background battle unchanged`);
    if(['shop','promote','credits'].includes(scene))await shot(`input-${scene}`);
  }
  console.log('PASS scene-input: twelve real scene transitions clear inspection; inactive battle input cannot reopen or mutate');
};
