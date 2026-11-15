// 카드 글 줄 실측 (D-511): 카드 견본(명령 · 부품 전부)과 분대 화면의 두루마리 줄을 실제 화면에서 잰다.
// 넘침 = 줄 글 폭(scrollWidth) > 줄 칸 폭(clientWidth). 조건(.ln-if) · 효과(.ln-fx) 줄 글꼴 · 크기도 함께 적는다.
// 사용: OBSERVE_URL=http://localhost:4173/ node tools/slice-observe.cjs card-text   (OBSERVE_PRESET=small-mobile 로 667×375)
// 결과: 넘친 줄 목록 + production/qa/evidence/<날짜>-cardtext-*.png 대표 두 장
const assert = require('node:assert/strict');

module.exports = async (pg, shot) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const scan = () => pg.evaluate(() => [...document.querySelectorAll('.cf .cf-desc .ln')].filter((l) => l.textContent.trim()).map((l) => {
    const s = getComputedStyle(l.classList.contains('ln-fx') ? (l.querySelector('b') ?? l) : l);
    return { card: l.closest('.cf').getAttribute('aria-label') ?? l.closest('.cf').querySelector('.cf-name')?.textContent, k: [...l.classList].find((c) => c.startsWith('ln-')), t: l.textContent, w: l.clientWidth, sw: l.scrollWidth, font: `${s.fontFamily.split(',')[0]} ${s.fontSize} ${s.fontWeight}` };
  }));
  await pg.evaluate(() => window.sliceApi.allFaces());
  await pg.waitForTimeout(600);
  const faces = await scan();
  await pg.locator('[data-part-id="oath"]').evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'center' }));
  await pg.waitForTimeout(300); await shot('parts');
  await pg.locator('.cf.cmd').nth(6).evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'start' }));
  await pg.waitForTimeout(300); await shot('commands');
  await pg.tap('[data-x]'); await pg.waitForTimeout(300);
  // 분대 화면: 기벽 있는 분대원 카드 (기벽 효과 줄)
  await pg.evaluate(() => { window.sliceApi.begin(1); const q = ['overwound', 'boiler', 'glass']; window.sliceApi.squad().forEach((u, i) => { if (u.t !== 'K') u.quirk = q[i % 3]; }); const s = window.sliceApi.squad(); const n = s.find((u) => u.t !== 'K'); if (n) { delete n.quirk; n.form = 'chancellor'; } window.sliceApi.crew(); });
  await pg.waitForTimeout(600);
  const crew = await scan();
  await shot('crew');
  const rows = [...faces, ...crew];
  const over = rows.filter((r) => r.sw > r.w + 1);
  const fonts = [...new Set(rows.filter((r) => r.k === 'ln-if' || r.k === 'ln-fx').map((r) => `${r.k}: ${r.font}`))];
  console.log(`CARDTEXT rows=${rows.length} cards=${new Set(rows.map((r) => r.card)).size} rowWidth=${Math.min(...rows.map((r) => r.w))}~${Math.max(...rows.map((r) => r.w))}px over=${over.length}`);
  console.log(`CARDTEXT fonts ${fonts.join(' | ')}`);
  over.forEach((r) => console.log(`OVER ${r.card} [${r.k}] ${r.t} (${r.sw}/${r.w})`));
  assert.deepEqual(over, []);
};
