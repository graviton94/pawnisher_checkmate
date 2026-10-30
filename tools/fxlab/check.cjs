// FX 랩 한 번 보기: 콘솔 오류 · 폰 너비 가로 넘침 · 나이트/비숍 장면 캡처
const { chromium } = require('playwright');
(async () => {
  const [file, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const errs = [];
  const page = await b.newPage({ viewport: { width: 1100, height: 900 } });
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + file);
  await page.waitForTimeout(500);
  await page.click('[data-speed="0.25"]');
  await page.click('[data-t="B"]');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/lab-N.png`, clip: { x: 0, y: 0, width: 1100, height: 760 } });
  await page.click('[data-t="Q"]');
  await page.waitForTimeout(2900);
  await page.locator('#stage').screenshot({ path: `${out}/lab-Q.png` });
  await page.locator('#gallery').screenshot({ path: `${out}/lab-gallery.png` });
  await page.setViewportSize({ width: 400, height: 800 });
  await page.waitForTimeout(200);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log('errors:', errs.length ? errs : 'none', '| 400px 가로 넘침:', over);
  await b.close();
})();
