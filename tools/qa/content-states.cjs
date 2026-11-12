// 전체 카드 텍스트와 합법적인 꽉 찬 부품 칸·긴 실제 이름·저장 복귀를 점검한다.
const assert = require('node:assert/strict');
module.exports = async (pg, shot) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; pg.on('pageerror', (e) => errors.push(e.message));
  await pg.evaluate(() => window.sliceApi.allFaces());
  await pg.waitForTimeout(350); await pg.evaluate(() => document.fonts.ready);
  const catalog = await pg.locator('#overlay-panel').evaluate((root) => {
    const issues = [], cards = [...root.querySelectorAll('.cf')];
    for (const card of cards) {
      for (const region of card.querySelectorAll('.cf-name,.cf-desc')) {
        const box = region.getBoundingClientRect();
        const walk = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
        for (let node; (node = walk.nextNode());) {
          if (!node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const r of range.getClientRects()) if (r.width && (r.left < box.left - 2 || r.right > box.right + 2 || r.top < box.top - 2 || r.bottom > box.bottom + 2))
            issues.push({ name: card.querySelector('.cf-name')?.textContent, region: region.className, text: node.textContent.trim() });
        }
      }
    }
    return { count: cards.length, issues };
  });
  assert.equal(catalog.count, 176, '현재 기본 명령92+부품84 전체');
  assert.deepEqual(catalog.issues, [], '실제 카드 배율의 명패·설명 경계');
  console.log('CATALOG', JSON.stringify(catalog)); await shot('audit-catalog');
  await pg.tap('[data-x]');
  await pg.evaluate(() => window.sliceApi.full()); await pg.waitForTimeout(400);
  await shot('audit-full-parts');
  await pg.evaluate(() => {
    const u = window.sliceApi.squad().find((u) => u.t !== 'K');
    Object.assign(u, { name: '삐걱거리는 경첩', nick: '나이트 분쇄기', kills: 12, wins: 3, protectedDamage: 36 });
    window.sliceApi.crew();
  });
  await pg.waitForTimeout(350); await shot('audit-long-crew');
  const names = await pg.locator('.crew-card .cf-name').evaluateAll((els) => els.map((e) => {
    const range = document.createRange(); range.selectNodeContents(e); const ink = range.getBoundingClientRect(), box = e.getBoundingClientRect();
    return { text: e.textContent, overflow: ink.left < box.left - 2 || ink.right > box.right + 2 || ink.bottom > box.bottom + 2 };
  }));
  assert(names.every((n) => !n.overflow), '본명 명패 경계');
  assert.match(await pg.locator('#overlay-panel').innerText(), /나이트 분쇄기/);
  console.log('CREW_NAMES', JSON.stringify(names));
  assert.deepEqual(errors, []);
  console.log(`PASS content-state execution: ${catalog.count} cards, full slots, earned nickname preserved, text bounds`);
};
