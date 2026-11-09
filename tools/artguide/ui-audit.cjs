// UI 통일성 전수 점검 (D-262): 본편의 화면 · 팝업 · 안내창 · 띠 · 토스트를 장면마다 새 페이지로 찍는다 (915×412, 1배).
// 사용: (빌드 · 미리보기 후) node tools/artguide/ui-audit.cjs <출력 폴더> [장면 이름 걸러내기]
const { chromium } = require('playwright');
const out = process.argv[2] || 'ui-audit';
const only = process.argv[3];
require('fs').mkdirSync(out, { recursive: true });
const META = JSON.stringify({ tut: ['battle', 'map', 'recruit', 'kit', 'promote'], runs: 3 });
const SCENES = [
  ['battle', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2600); await S('a'); await A(() => document.getElementById('btn-end').click()); await W(350); await S('enemy-a'); await W(600); await S('enemy-b'); await W(2600); await S('after'); }],
  ['help', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => document.getElementById('btn-help').click()); await W(900); await S(''); }],
  ['crew', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.crew()); await W(900); await S(''); }],
  ['taunt', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.taunt('gloat')); await W(900); await S(''); }],
  ['stand', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.stand(); }); await W(1500); await S(''); }],
  ['bet', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.bet()); await W(1500); await S(''); }],
  ['death', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.die(); }); await W(1500); await S('a'); await W(2000); await S('b'); }],
  ['doom', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.doom()); await A(() => document.getElementById('btn-end').click()); await W(3000); await S('a'); await W(2000); await S('b'); }],
  ['reward', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2400); await A(() => window.sliceApi.finish()); await W(2600); await S('a'); await W(2500); await S('b'); }],
  ['map', async (p, A, W, S) => { await A(() => window.sliceApi.map(2)); await W(2600); await S(''); }],
  ['shop', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(10); window.sliceApi.shop(); }); await W(2600); await S('a'); await p.click('#overlay [data-buy]').catch(() => {}); await W(400); await S('toast'); }],
  ['forge', async (p, A, W, S) => { await A(() => window.sliceApi.forge()); await W(2600); await S(''); }],
  ['partpick', async (p, A, W, S) => { await A(() => window.sliceApi.partPick()); await W(2200); await S(''); }],
  ['event', async (p, A, W, S) => { await A(() => window.sliceApi.event('nightShift')); await W(2600); await S(''); }],
  ['boss', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'boss')); await W(2500); await S('intro-a'); await W(2500); await S('intro-b'); await W(5000); await S('battle'); }],
  ['endfail', async (p, A, W, S) => { await A(() => window.sliceApi.end(false)); await W(2800); await S(''); }],
  // 패스 1 창 갈래 (D-391)
  ['win-nemesis', async (p, A, W, S) => { await A(() => window.sliceApi.nemesisOf()); await W(1200); await S(''); }],
  ['win-promote', async (p, A, W, S) => { await A(() => { window.sliceApi.promote(3); }); await W(1200); await S(''); }],
  ['win-ledger', async (p, A, W, S) => { await A(() => window.sliceApi.ledger()); await W(1200); await S(''); }],
  ['win-dict', async (p, A, W, S) => { await A(() => window.sliceApi.help('dict')); await W(1200); await S(''); }],
  ['win-bug', async (p, A, W, S) => { await A(() => window.sliceApi.bug()); await W(1200); await S(''); }],
  ['win-export', async (p, A, W, S) => { await A(() => window.sliceApi.exportScr()); await W(1200); await S(''); }],
  ['win-survey', async (p, A, W, S) => { for (const i of [0, 1, 5, 6, 7, 8]) { await A((k) => window.sliceApi.survey(k), i); await W(900); await S(`q${i + 1}`); } }],
  ['win-lab', async (p, A, W, S) => { await A(() => window.sliceApi.labPick()); await W(1200); await S(''); }],
  // 패스 2 고르기 · 장소 갈래 (D-394)
  ['pick-kit', async (p, A, W, S) => { await A(() => window.sliceApi.kit()); await W(1600); await S(''); }],
  ['pick-recruit', async (p, A, W, S) => { await A(() => window.sliceApi.recruit()); await W(1600); await S(''); }],
  ['pick-full', async (p, A, W, S) => { await A(() => window.sliceApi.full()); await W(1400); await S(''); }],
  ['pick-refine', async (p, A, W, S) => { await A(() => window.sliceApi.refine()); await W(1400); await S(''); }],
  ['pick-brace', async (p, A, W, S) => { await A(() => window.sliceApi.brace()); await W(1400); await S(''); }],
  ['win-deck', async (p, A, W, S) => { await A(() => window.sliceApi.deckView('view')); await W(1400); await S(''); }],
  ['win-remove', async (p, A, W, S) => { await A(() => window.sliceApi.deckView('remove')); await W(1400); await S(''); }],
  ['endclear', async (p, A, W, S) => { await A(() => window.sliceApi.end(true)); await W(2800); await S(''); }],
];
(async () => {
  const br = await chromium.launch();
  for (const [name, fn] of SCENES) {
    if (only && !name.includes(only)) continue;
    const p = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
    p.on('pageerror', (e) => console.log('ERR', name, e.message));
    const A = (f, a) => p.evaluate(f, a).catch((e) => console.log('A', name, e.message.slice(0, 120)));
    const W = (ms) => p.waitForTimeout(ms);
    // 찍을 때마다 글자 점검 (D-263): 갈무리 격자 크기 · 서체 · 넘침 · 말줄임
    const TEXT = async (n) => {
      const bad = await p.evaluate(() => {
        const OK11 = [12, 24, 36], OK14 = [15, 30, 45, 60];
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
          let hid = false; for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || a.hidden) { hid = true; break; } }
          if (hid) continue;
          const fs = parseFloat(cs.fontSize), fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), w = +cs.fontWeight;
          const txt = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(' ').slice(0, 24);
          const why = [];
          if (fam === 'Galmuri11' && !OK11.includes(fs)) why.push(`G11 ${fs}px`);
          else if (fam === 'Galmuri14' && !OK14.includes(fs)) why.push(`G14 ${fs}px`);
          else if (fam !== 'Galmuri11' && fam !== 'Galmuri14') why.push(`서체 ${fam} ${fs}px`);
          if (fam === 'Galmuri14' && w >= 600) why.push('G14 굵게');
          if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) why.push('말줄임');
          if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + 2) && cs.whiteSpace === 'nowrap') why.push('넘침');
          if (why.length) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} 「${txt}」 ${why.join(' · ')}`);
        }
        return [...new Set(out)];
      }).catch(() => []);
      for (const b of bad) console.log('TXT', name + (n ? '-' + n : ''), b);
    };
    const S = async (n) => { await p.screenshot({ path: `${out}/${name}${n ? '-' + n : ''}.png` }).catch(() => console.log('shot fail', name, n)); await TEXT(n); };
    try {
      await p.goto('http://localhost:4173/?debug');
      await p.evaluate((m) => localStorage.setItem('pawnisher.slice.meta', m), META);
      await p.goto('http://localhost:4173/?debug'); await W(2400); await p.mouse.click(450, 300); await W(1200);
      await fn(p, A, W, S);
    } catch (e) { console.log('FAIL', name, e.message.slice(0, 160)); }
    await p.close().catch(() => {});
  }
  await br.close();
})();
