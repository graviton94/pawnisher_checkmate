// UI 통일성 전수 점검 (D-262): 본편의 화면 · 팝업 · 안내창 · 띠 · 토스트를 장면마다 새 페이지로 찍는다 (915×412, 1배).
// 사용: (빌드 · 미리보기 후) node tools/artguide/ui-audit.cjs <출력 폴더> [장면 이름 걸러내기]   — 미리보기 포트는 PORT=4180 처럼 (기본 4173)
const BASE = `http://localhost:${process.env.PORT || 4173}/?debug`;
const { chromium } = require('playwright');
const out = process.argv[2] || 'ui-audit';
const only = process.argv[3];
const PRESETS = { 'small-mobile': [667,375,2.625], mobile: [915,412,2.625], tablet: [1024,768,2], pc: [1280,720,1] };
const preset = PRESETS[process.env.OBSERVE_PRESET || 'mobile'];
if (!preset) throw new Error('unknown OBSERVE_PRESET');
require('fs').mkdirSync(out, { recursive: true });
const META = JSON.stringify({ tut: ['battle', 'map', 'recruit', 'kit', 'promote'], runs: 3 });
const SCENES = [
  ['ability-info', async (p, A, W, S) => { await require('../qa/ability-info.cjs')(p, S); }],
  ['unit-info', async (p, A, W, S) => { await require('../qa/unit-info.cjs')(p, S); }],
  ['builds', async (p, A, W, S) => { await require('../qa/build-prototype.cjs')(p, S); }],
  ['battle', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2600); await S('a'); await A(() => document.getElementById('btn-end').click()); await W(350); await S('enemy-a'); await W(600); await S('enemy-b'); await W(2600); await S('after'); }],
  // 패스 4 (D-396): 전투 HUD — 적 의도 · 엿보기 · 반장 규칙 · 턴 끝 경고 · 기록 · 튜토리얼 말풍선
  ['p4-peek', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => { const q = window.slice().s.pieces.find((x) => x.side === 1 && x.type === 'K'); window.sliceApi.peekAt({ x: q.x, y: q.y }); }); await W(500); await S(''); }],
  ['p4-bossrules', async (p, A, W, S) => { await A(() => window.sliceApi.bossOf('plate', 1)); await W(4000); await A(() => document.getElementById('boss').click()); await W(700); await S(''); }],
  ['p4-warn', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => window.sliceApi.doom()); await W(500); await A(() => document.getElementById('btn-end').click()); await W(500); await S(''); }],
  ['p4-log', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => window.sliceApi.botMove()); await W(2600); await A(() => window.sliceApi.logPeek()); await W(500); await S(''); }],
  ['p4-tut', async (p, A, W, S) => { await A(() => window.sliceApi.start(0)); await W(4500); await A(() => window.sliceApi.tutNow()); await W(3000); await S(''); }],
  // P-B (D-490): 판 위 글 갈래 — 바크 · 자막 띠 · 상태 띠 · 독백 · 판돈 칩 · 2단계 예고
  ['pb-bark', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => window.sliceApi.taunt('start')); await W(1500); await S('foe'); await A(() => window.sliceApi.allyBark()); await W(1500); await S('ally'); }],
  ['pb-sub', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => window.sliceApi.say('B')); await W(2200); await S(''); }],
  ['pb-notice', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => { window.sliceApi.stateBand('이대로 끝내면 킹이 맞습니다', 'crimson'); window.sliceApi.monoNow('‘태엽이 모자라.’'); }); await W(500); await S(''); }],
  ['pb-wager', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2600); await A(() => window.sliceApi.bet()); await W(900); await S('win'); await A(() => { window.sliceApi.betSet('clean'); document.querySelector('#overlay [data-no]')?.click(); }); await W(900); await S('chip'); }],
  ['pb-p2', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'boss')); await W(2600); await A(() => window.sliceApi.p2Warn()); await W(600); await S('warn'); }],
  // 패스 5 (D-397): 컷신 크롬 하나(자막 띠 · ▼ · 건너뛴다) · 막 카드 · 지도 미리보기
  ['p5-prologue', async (p, A, W, S) => { await A(() => void window.sliceApi.pro()); await W(2600); await p.click('.prologue').catch(() => {}); await W(2600); await S(''); }],
  ['p5-act', async (p, A, W, S) => { await A(() => { window.sliceApi.setAct(0); window.sliceApi.map(2); }); await W(800); await A(() => window.sliceApi.nextAct()); await W(4200); await S(''); }],
  ['p5-map-preview', async (p, A, W, S) => { await A(() => window.sliceApi.map(2)); await W(1500); await p.click('.mnd.now').catch(() => {}); await W(600); await S(''); }],
  ['p5-fall', async (p, A, W, S) => { await A(() => window.sliceApi.fallCut('plate')); await W(3500); await S(''); }],
  ['p5-credits', async (p, A, W, S) => { await A(() => window.sliceApi.credits()); await W(4000); await S(''); }],
  ['help', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => document.getElementById('btn-help').click()); await W(900); await S(''); }],
  ['crew', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.crew()); await W(900); await S(''); }],
  ['taunt', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.taunt('gloat')); await W(900); await S(''); }],
  ['stand', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.stand(); }); await W(1500); await S(''); }],
  ['bet', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.bet()); await W(1500); await S(''); }],
  ['death', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => { window.sliceApi.die(); }); await W(1500); await S('a'); await W(2000); await S('b'); }],
  ['doom', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(2400); await A(() => window.sliceApi.doom()); await A(() => document.getElementById('btn-end').click()); await W(3000); await S('a'); await W(2000); await S('b'); }],
  ['reward', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(2400); await A(() => { window.slice().s.winner = 0; window.sliceApi.finish(); }); await W(2600); await S('a'); await W(2500); await S('b'); }],
  ['map', async (p, A, W, S) => { await A(() => window.sliceApi.map(2)); await W(2600); await S(''); }],
  ['shop', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(10); window.sliceApi.shop(); }); await W(2600); await S('a'); await p.locator('[data-slot]').first().click({ force: true }); await W(400); await S('unaffordable'); }],
  ['forge', async (p, A, W, S) => { await A(() => window.sliceApi.forge()); await W(2600); await S(''); }],
  ['partpick', async (p, A, W, S) => { await A(() => window.sliceApi.partPick()); await W(2200); await S(''); }],
  ['event', async (p, A, W, S) => { await A(() => window.sliceApi.event('nightShift')); await W(2600); await S(''); }],
  // 패스 3 (D-395): 사건 창 · 정보 풀이 · 결과 장면 · 결과
  ['event-info', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await W(2600); await p.click("[data-info='1']"); await W(500); await S(''); }],
  ['event-result', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await W(2600); await p.click(".choice[data-slot='0']"); await W(500); await p.click(".choice[data-slot='0']"); await W(4500); await S('fx'); await W(6000); await S(''); }],
  // D-402: 사건 창 Z 읽는 길(단추 하나) · 막 장부 · 출하 끝 장부
  ['p10-event-sel', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await W(2600); await p.click(".choice[data-slot='1']"); await W(1500); await S(''); }],
  ['p10-act-clear', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(1, 'boss')); await W(1500); await A(() => { const api = window.sliceApi; api.richRun(); api.setAct(0); api.nextAct(); }); await W(7500); await S(''); }],
  ['p10-run-clear', async (p, A, W, S) => { await A(() => window.sliceApi.startAt(3, 'boss')); await W(1500); await A(() => { const api = window.sliceApi; api.richRun(); api.setAct(2); api.endNow(true); }); await W(1200); await S(''); await p.click('[data-cr-next]'); await W(350); await S('makers'); }],
  ['boss', async (p, A, W, S) => {
    await A(() => window.sliceApi.intro(2, 'boss'));
    await p.locator('.bossfx .bf-port canvas').waitFor({state:'attached'});
    const fits = await p.locator('.bf-port canvas').evaluate(c => {
      const r=c.getBoundingClientRect(),q=c.parentElement.getBoundingClientRect(),k=r.width/c.width*devicePixelRatio;
      return Math.abs(r.width/r.height-c.width/c.height)<.01 && Math.abs(k-Math.round(k))<.01 && r.left<=q.left+1 && r.right>=q.right-1 && r.top<=q.top+1 && r.bottom>=q.bottom-1;
    });
    if(!fits) throw new Error('boss illustration aspect/coverage/device grid');
    await W(1200); await S('intro-a'); await W(1000); await S('intro-b');
    await p.locator('.bossfx').waitFor({state:'detached'}); await W(500); await S('battle');
  }],
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
  // 패스 6 (D-399): 카드 레일 · 상아 손질 카드 · 덱/분대 레일 · 낮은 화면 손패
  ['p6-shop-rail', async (p, A, W, S) => { await A(() => { window.sliceApi.gold(120); window.sliceApi.shop(); }); await W(2600); await A(() => { const r = document.querySelector('.scr-items'); r.scrollLeft = 9999; }); await W(800); await S(''); }],
  ['p6-forge', async (p, A, W, S) => { await A(() => window.sliceApi.forge()); await W(2600); await p.click('[data-slot="repair"]'); await W(400); await S(''); }],
  ['p6-deck', async (p, A, W, S) => { await A(() => window.sliceApi.deckView('view')); await W(1400); await S(''); }],
  ['p6-crew', async (p, A, W, S) => { await A(() => window.sliceApi.crew()); await W(1400); await S(''); }],
  ['endclear', async (p, A, W, S) => { await A(() => window.sliceApi.end(true)); await W(2800); await S(''); }],
];
(async () => {
  let scenarios = 0, screenshots = 0; const issues = [];
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  for (const [name, fn] of SCENES) {
    if (only && !(only.includes(',') ? only.split(',').includes(name) : name.includes(only))) continue;
    scenarios++;
    const p = await br.newPage({ viewport: { width: preset[0], height: preset[1] }, deviceScaleFactor: preset[2], hasTouch: true, isMobile: preset[0] < 1024 });
    p.on('pageerror', (e) => { issues.push(`ERR ${name} ${e.message}`); console.log('ERR', name, e.message); });
    const A = (f, a) => p.evaluate(f, a).catch((e) => { issues.push(`A ${name} ${e.message}`); console.log('A', name, e.message.slice(0,120)); });
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
          // 카드 글 맞춤 마지막 단계(D-373 · D-377)만 10px 갈무리9 허용
          else if (fam === 'Galmuri9' && fs === 10 && el.closest('.cf .ln.s10')) { /* 허용 */ }
          else if (fam !== 'Galmuri11' && fam !== 'Galmuri14') why.push(`서체 ${fam} ${fs}px`);
          if (fam === 'Galmuri14' && w >= 600) why.push('G14 굵게');
          if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) why.push('말줄임');
          if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + 2) && cs.whiteSpace === 'nowrap') why.push('넘침');
          if (why.length) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} 「${txt}」 ${why.join(' · ')}`);
        }
        return [...new Set(out)];
      }).catch(() => []);
      for (const b of bad) { issues.push(`TXT ${name} ${b}`); console.log('TXT', name + (n ? '-' + n : ''), b); }
    };
    const S = async (n) => {
      const stale = await p.evaluate(() => { const b=document.getElementById('board'); const overlay=document.getElementById('overlay'); const inactive=document.body.classList.contains('between') || document.body.classList.contains('cover-pl') || b?.closest('[inert]') || overlay && !overlay.hidden; return !!inactive && !!document.querySelector('.k-peek:not(.pxout)'); });
      if (stale) { issues.push(`STALE_PEEK ${name}`); console.log('STALE_PEEK',name,n); }
      screenshots++; await p.screenshot({ path: `${out}/${name}${n ? '-' + n : ''}.png` }).catch(() => { issues.push(`shot fail ${name} ${n}`); console.log('shot fail', name, n); }); await TEXT(n); };
    try {
      await p.goto(BASE);
      await p.evaluate((m) => localStorage.setItem('pawnisher.slice.meta', m), META);
      await p.goto(BASE); await p.waitForSelector('#boot', { state: 'detached' }); await W(2400); await p.mouse.click(450, 300); await W(1200);
      await fn(p, A, W, S);
    } catch (e) { issues.push(`FAIL ${name} ${e.message}`); console.log('FAIL', name, e.stack); }
    await p.close().catch(() => {});
  }
  await br.close();
  console.log('AUDIT', JSON.stringify({preset:process.env.OBSERVE_PRESET || 'mobile',scenarios,screenshots,issues:issues.length}));
  if (issues.length) process.exitCode = 1;
})();
