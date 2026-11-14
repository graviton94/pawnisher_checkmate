// 베타 점검 (D-477): 오래 하기 — 대국 40판 · 지도 · 사이 화면을 오가며 DOM 노드 · JS 힙 · 리스너가 계속 불어나는지 본다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/leak.cjs
const { chromium } = require('playwright');
const W = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const br = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const p = await (await br.newContext({ viewport: { width: 915, height: 412 }, reducedMotion: 'reduce' })).newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:4173/?debug');
  await p.waitForFunction(() => window.sliceApi);
  await W(2000);
  const cdp = await p.context().newCDPSession(p);
  const sample = async (tag) => {
    await p.evaluate(() => window.gc && window.gc());
    const m = await cdp.send('Performance.getMetrics').catch(() => null);
    const get = (n) => m?.metrics.find((x) => x.name === n)?.value ?? 0;
    const d = await p.evaluate(() => ({ nodes: document.getElementsByTagName('*').length, heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6) }));
    console.log(`${tag}: DOM ${d.nodes} · 힙 ${d.heap}MB · 리스너 ${get('JSEventListeners')} · 문서 ${get('Documents')}`);
  };
  await cdp.send('Performance.enable');
  await sample('시작');
  const screens = [(a) => a.shop(), (a) => a.forge(), (a) => a.event('oilMerchant'), (a) => a.partPick(), (a) => a.reward(), (a) => a.map(2)];
  for (let i = 1; i <= 40; i++) {
    await p.evaluate((k) => window.sliceApi.startAt(((k % 3) + 1), k % 5 === 0 ? 'boss' : 'battle'), i);
    await W(900);
    // 몇 수 두고 판을 비워 끝낸다
    for (let m = 0; m < 3; m++) await Promise.race([p.evaluate(() => window.sliceApi.botMove('greedy')), W(4000)]);
    await p.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((x) => x.side === 0); b.s.winner = 0; window.sliceApi.finish(); });
    await W(1200);
    await p.evaluate((k) => { try { window.sliceApi.richRun(); } catch {} }, i);
    await p.evaluate(`(${screens[i % screens.length].toString()})(window.sliceApi)`);
    await W(900);
    if (i % 10 === 0) await sample(`대국 ${i}판`);
  }
  console.log('오류', errs.length ? errs.slice(0, 5).join(' / ') : '없음');
  await br.close();
})();
