// 타이틀 메뉴 단추 잼 (D-593): 단추 · 아이콘 · 글 잉크 · 청록 점의 세로 가운데와 위아래 여백을 재고 스크린샷을 남긴다.
//   node tools/qa/title-menu.cjs [--url http://localhost:4321/] [--out <폴더>] [--tag after] [--small | --pc]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4321/');
const OUT = opt('--out', 'production/qa/evidence/title-menu');
const TAG = opt('--tag', 'after');
const vp = args.includes('--small') ? [667, 375, 2] : args.includes('--pc') ? [1920, 1080, 1] : [915, 412, 2.625];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: vp[2], hasTouch: vp[0] < 1000, isMobile: vp[0] < 1000 });
  await ctx.addInitScript(() => { try { localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ prologue: true, runs: 1 })); } catch {} });
  const pg = await ctx.newPage();
  await pg.goto(BASE);
  await pg.waitForSelector('.opening');
  await pg.waitForTimeout(2600);
  await pg.locator('.opening').click({ position: { x: Math.round(vp[0] / 2), y: Math.round(vp[1] * 0.8) } });
  await pg.waitForSelector('.op-menu button');
  await pg.waitForTimeout(1200);
  const m = await pg.evaluate(() => {
    const ink = (el) => {
      // 글 잉크: 같은 글꼴로 캔버스에 재어 기준선 위아래 잉크 (costsnap 방식)
      const cs = getComputedStyle(el);
      const c = document.createElement('canvas').getContext('2d');
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const t = c.measureText(el.textContent.trim());
      const r = el.getBoundingClientRect();
      const lh = parseFloat(cs.lineHeight) || r.height;
      // 줄 상자 안 기준선: (줄높이 - (ascent+descent))/2 + ascent (글꼴 상자 기준)
      const fa = t.fontBoundingBoxAscent, fd = t.fontBoundingBoxDescent;
      const base = r.top + (lh - (fa + fd)) / 2 + fa;
      return { top: base - t.actualBoundingBoxAscent, bottom: base + t.actualBoundingBoxDescent };
    };
    const out = {};
    for (const b of document.querySelectorAll('.op-menu button')) {
      const r = b.getBoundingClientRect();
      const ico = b.querySelector('.op-ico')?.getBoundingClientRect();
      const lab = b.querySelector('b, .op-lbl') ?? [...b.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
      let li = null;
      if (lab && lab.nodeType === 1) li = ink(lab);
      else if (lab) { const rg = document.createRange(); rg.selectNodeContents(lab); const span = document.createElement('span'); li = (() => { const rr = rg.getBoundingClientRect(); const cs = getComputedStyle(b); const c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const t = c.measureText(lab.textContent.trim()); const base = rr.top + (rr.height - (t.fontBoundingBoxAscent + t.fontBoundingBoxDescent)) / 2 + t.fontBoundingBoxAscent; return { top: base - t.actualBoundingBoxAscent, bottom: base + t.actualBoundingBoxDescent }; })(); }
      const dot = b.querySelector('.op-dot')?.getBoundingClientRect();
      // 단추 테: 위 · 아래 테 두께 (border-image-width) — 보이는 판 가운데
      const cs = getComputedStyle(b);
      const bt = parseFloat(cs.borderTopWidth), bb = parseFloat(cs.borderBottomWidth);
      const face = { top: r.top, bottom: r.bottom };
      const mid = (a) => a && +((a.top + a.bottom) / 2).toFixed(2);
      out[b.textContent.trim() || b.getAttribute('aria-label')] = {
        h: +r.height.toFixed(2), btnMid: mid(face), borderTB: [bt, bb],
        ico: ico && { h: +ico.height.toFixed(2), padTop: +(ico.top - r.top).toFixed(2), padBottom: +(r.bottom - ico.bottom).toFixed(2), mid: mid(ico) },
        inkMid: mid(li), dotMid: mid(dot),
      };
    }
    return { px: getComputedStyle(document.documentElement).getPropertyValue('--px'), out };
  });
  console.log(JSON.stringify(m, null, 1));
  const nav = await pg.$('.op-menu');
  const name = `title-${TAG}-${vp[0]}x${vp[1]}`;
  await pg.screenshot({ path: path.join(OUT, `${name}.png`) });
  await nav.screenshot({ path: path.join(OUT, `${name}-menu.png`) });
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(m, null, 1));
  await br.close();
})();
