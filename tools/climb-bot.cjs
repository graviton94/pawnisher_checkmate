// 등반 봇 (실화면, D-196): 처음부터 출하 끝까지 실제 버튼을 눌러 간다. 막힌 화면 · 오류 · 걸린 시간을 남긴다.
// 사용: npm run build && npx vite preview --port 4173 → node tools/climb-bot.cjs <이름> <1=움직임 줄이기> <분>
const { chromium } = require('playwright');
const [,, tag, calm, minutes] = process.argv;
const OUT = `production/qa/evidence/${new Date().toISOString().slice(0, 10)}-climb-${tag}`;
(async () => {
  const br = await chromium.launch();
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: calm === '1' ? 'reduce' : 'no-preference' });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:4173/?debug'); await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await pg.goto('http://localhost:4173/?debug'); await pg.waitForTimeout(1500);
  // 디버그 시작은 시험대 대국이 바로 열린다 → 처음 화면 흐름 대신 출하 시작과 같은 상태
  const t0 = Date.now(); const log = []; let last = '', same = 0, stuckShots = 0, result = null;
  while (Date.now() - t0 < Number(minutes) * 60000) {
    await pg.waitForTimeout(calm === '1' ? 200 : 320);
    const st = await pg.evaluate(() => {
      const q = (s) => document.querySelector(s); const vis = (e) => e && !e.hidden && e.offsetParent !== null;
      const click = (e, tag) => { e.click(); return tag; };
      const skip = q('.pl-skip'); if (skip) return click(skip, 'prologue');
      const sf = q('.stagefx'); if (sf) return click(sf, 'scene');
      const ov = q('#overlay'); const p = q('#overlay-panel');
      if (ov && !ov.hidden && !ov.classList.contains('m3off')) {
        const h = (p.querySelector('h2')?.textContent || '').slice(0, 24);
        if (p.querySelector('[data-restart]')) return 'END:' + (p.querySelector('h2')?.innerText || '');
        const order = ['[data-confirm]', '[data-next]', '[data-again]', '[data-no]', '[data-go]', '.reward-cards .cmd', '[data-rec]', '.part-cards .part-card[data-part]', '[data-forge="repair"]', '[data-leave]', '.ev-choice:not(.off)', '[data-pick]', '.part-cards .part-card:not(.sold)', '.deck-grid .cmd', '[data-skip]', '[data-close]', '[data-back]', '.row .btn.brass', '.row .btn'];
        for (const s of order) { const e = p.querySelector(s); if (e && !e.disabled) return click(e, 'ov:' + s + ':' + h); }
        return 'ov-stuck:' + h;
      }
      const mfx = q('.mapfx');
      if (mfx) { const g = [...mfx.querySelectorAll('button')].find((x) => x.textContent.trim() === '간다'); if (g) return click(g, 'map-go'); const n = mfx.querySelector('.mnd.now'); if (n) return click(n, 'map-pick'); return 'map-wait'; }
      const b = window.slice?.(); if (!b) return 'noslice';
      if (b.s.winner !== null) return 'over';
      const end = q('#btn-end'); if (end.disabled) return 'busy';
      const api = window.sliceApi; let best = null;
      for (let i = 0; i < b.hand.length; i++) for (const pc of api.cardPieces(b, i)) for (const to of api.cardMoves(b, i, pc.id)) {
        const sim = api.previewPlay(b, i, pc.id, to); if (!sim) continue;
        const ek = b.s.pieces.find((x) => x.side === 1 && x.type === 'K'); const d0 = ek ? Math.max(Math.abs(pc.x - ek.x), Math.abs(pc.y - ek.y)) : 0; const d1 = ek ? Math.max(Math.abs(to.x - ek.x), Math.abs(to.y - ek.y)) : 0;
        const danger = (window.__danger || []); 
        let sc = 1 + (d0 - d1) * 0.5 + (pc.type === 'K' ? -0.6 : 0); for (const e of sim.events) if (e.type === 'attack') for (const h of e.hits) { const t = b.s.pieces.find((x) => x.id === h.targetId); if (t && t.side === 1) sc += h.damage + (h.killed ? 60 + (t.type === 'K' ? 500 : 0) : 0); }
        if (!best || sc > best.sc) best = { i, pc, to, sc };
      }
      if (best && best.sc > 1) { document.querySelector(`[data-card="${best.i}"]`)?.click(); api.tap({ x: best.pc.x, y: best.pc.y }); api.tap(best.to); return 'play'; }
      if (best && best.sc > 1.2) { document.querySelector(`[data-card="${best.i}"]`)?.click(); api.tap({ x: best.pc.x, y: best.pc.y }); api.tap(best.to); return 'move'; }
      end.click(); end.click(); return 'end';
    }).catch((e) => 'evalerr:' + e.message.slice(0, 60));
    log.push(st);
    if (st.startsWith('END:')) { result = st; break; }
    const key = st.split(':').slice(0, 2).join(':');
    if (key === last && !['busy', 'play', 'move', 'end', 'over', 'map-wait'].includes(key)) same++; else same = 0;
    last = key;
    if ((same === 25 || st.startsWith('ov-stuck')) && stuckShots < 5) { stuckShots++; await pg.screenshot({ path: `${OUT}-stuck${stuckShots}.png` }); log.push('STUCK@' + st); }
  }
  await pg.screenshot({ path: `${OUT}-final.png` });
  const counts = {}; log.forEach((x) => { const k = x.split(':')[0]; counts[k] = (counts[k] || 0) + 1; });
  const meta = await pg.evaluate(() => { const b = window.slice?.(); return { title: document.querySelector('#overlay-panel h2')?.innerText?.slice(0, 60) }; });
  console.log(JSON.stringify({ tag, calm, minutes: ((Date.now() - t0) / 60000).toFixed(1), result, counts, stuck: log.filter((x) => x.startsWith('STUCK')).slice(0, 5), ovs: [...new Set(log.filter((x) => x.startsWith('ov:')).map((x) => x.split(':').slice(1).join(':')))].slice(0, 60), errs: errs.slice(0, 8), meta }, null, 1));
  await br.close();
})();
