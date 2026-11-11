const assert = require('node:assert/strict');
module.exports = async (pg, shot) => {
  const inspect = async (name) => {
    const pos = await pg.evaluate(() => { const k = window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'K'); return window.sliceApi.screenOf(k); });
    await pg.touchscreen.tap(pos.x, pos.y);
    await pg.waitForTimeout(350);
    const popup = pg.locator('.unit-peek');
    assert.equal(await popup.count(), 1);
    const text = await popup.innerText();
    for (const label of ['적 기물', '체력', '공격', '방어']) assert(text.includes(label));
    const bad = await popup.evaluate((root) => {
      const r = root.getBoundingClientRect();
      const issues = [];
      if (r.top < 8 || r.bottom > innerHeight - 8 || r.left < 0 || r.right > innerWidth || r.height > 364) issues.push('panel bounds');
      if (r.bottom > document.getElementById('btn-end').getBoundingClientRect().top - 6) issues.push('covers turn button');
      for (const el of root.querySelectorAll('span, strong, small, p')) {
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          const well = el.closest('.inset')?.getBoundingClientRect();
          for (const t of range.getClientRects()) {
            if (t.left < r.left + 12 || t.right > r.right - 12 || t.bottom > r.bottom - 12) issues.push(node.textContent);
            if (well && (t.left < well.left + 8 || t.right > well.right - 8 || t.bottom > well.bottom - 6)) issues.push(`well: ${node.textContent}`);
          }
        }
      }
      return issues;
    });
    assert.deepEqual(bad, []);
    await shot(name);
    await pg.touchscreen.tap(450, 80);
    await pg.waitForTimeout(200);
  };
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
  await pg.waitForTimeout(400);
  await inspect('unit-info-normal');
  await pg.evaluate(() => window.sliceApi.bossOf('inspect', 1));
  await pg.waitForTimeout(600);
  await inspect('unit-info-boss');
  await pg.evaluate(() => {
    const k = window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'K');
    Object.assign(k, { hp: 12345, maxHp: 18000, shield: 87, atk: 234, def: 18 });
    window.sliceApi.redraw();
  });
  await inspect('unit-info-large');
  console.log('Unit info: enemy tap, normal/boss/large stats, panel/text bounds PASS');
};
