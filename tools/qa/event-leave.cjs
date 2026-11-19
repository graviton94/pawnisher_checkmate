// 재현: 사건 「통행 문」(나사 55 — 유일한 선택지 꺼짐) → 「무시하고 떠난다」 → 다음 창(부품 상자)이 눌리는가
// D-597 회귀 재현 (플레이 리뷰 P0-1 소프트락). 사용: 프리뷰 서버를 띄운 뒤 [URL0=http://localhost:4173/?debug] [VW=915 VH=412 DPR=2.625] node tools/qa/event-leave.cjs <출력 접두>
const { chromium } = require('playwright');
const VW=+(process.env.VW||915), VH=+(process.env.VH||412), DPR=+(process.env.DPR||2.625);
const URL0=process.env.URL0||'http://localhost:4173/?debug';
const OUT=process.argv[2]||'/tmp/p0';
(async()=>{
  const br=await chromium.launch();
  const ctx=await br.newContext({viewport:{width:VW,height:VH},deviceScaleFactor:DPR,hasTouch:true,isMobile:true});
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL0); await p.evaluate(()=>{localStorage.clear();localStorage.setItem('pawnisher.slice.meta',JSON.stringify({tut:['battle','recruit','map','kit','drill-a','drill-b','heat']}));});
  await p.goto(URL0); await p.waitForTimeout(4000);
  await p.evaluate(()=>sliceApi.begin(5,0,'story',null,'standard')); await p.waitForTimeout(1500);
  const cls=()=>p.evaluate(()=>document.getElementById('overlay-panel').className);
  const center=(sel)=>p.evaluate((s)=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length);if(!e)return null;const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]},sel);
  await p.evaluate(()=>{sliceApi.map(2);sliceApi.gold(55);sliceApi.event('tollGate');}); await p.waitForTimeout(6500);
  const choiceDisabled=await p.evaluate(()=>document.querySelector('#overlay-panel .choice').disabled);
  await p.screenshot({path:`${OUT}-1-tollgate.png`,scale:'css'});
  const lv=await center('[data-leave]'); await p.touchscreen.tap(lv[0],lv[1]);
  await p.waitForTimeout(250); const during=await cls();
  await p.waitForTimeout(4000); const after=await cls();
  await p.evaluate(()=>sliceApi.partPick()); await p.waitForTimeout(1500);
  const opened=await cls();
  const sl=await center('#overlay-panel [data-slot]');
  await p.touchscreen.tap(sl[0],sl[1]); await p.waitForTimeout(500);
  await p.screenshot({path:`${OUT}-2-partbox-select.png`,scale:'css'});
  const selected=await p.evaluate(()=>!!document.querySelector('#overlay-panel .pick-item.-sel, #overlay-panel [data-slot].-sel, #overlay-panel .sel'));
  await p.touchscreen.tap(sl[0],sl[1]); await p.waitForTimeout(2500);
  const parts=await p.evaluate(()=>sliceApi.parts());
  await p.screenshot({path:`${OUT}-3-after-take.png`,scale:'css'});
  console.log(JSON.stringify({choiceDisabled,during,after,opened,selected,parts,errs}));
  const ok = choiceDisabled && /locked/.test(during) && !/locked/.test(after) && !/locked/.test(opened) && parts.length===1;
  console.log(ok?'PASS: 떠난 뒤 부품 상자가 눌린다':'FAIL');
  await br.close(); process.exit(ok?0:1);
})();
