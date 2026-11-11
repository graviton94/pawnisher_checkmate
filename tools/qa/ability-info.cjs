const assert = require('node:assert/strict');

module.exports = async (pg, shot) => {
  const check = async (name, selector = '.unit-peek') => {
    const result = await pg.locator(selector).evaluate((root) => {
      const r = root.getBoundingClientRect();
      const block = root.querySelector('.ability-block');
      const bad = [];
      if (r.top < 0 || r.bottom > innerHeight || r.height > 364) bad.push('window overlap');
      if (root.classList.contains('unit-peek') && r.bottom > document.getElementById('btn-end').getBoundingClientRect().top - 6) bad.push('turn button overlap');
      for (const line of block.querySelectorAll('.ability-description,.ability-effect,.ability-heading')) {
        const s = getComputedStyle(line), b = line.getBoundingClientRect();
        if (b.height > parseFloat(s.lineHeight) + 1 && !line.classList.contains('ability-heading')) bad.push('wrapped line');
        if (line.scrollWidth > line.clientWidth + 1) bad.push(`overflow: ${line.textContent}`);
        if (b.left < r.left + 12 || b.right > r.right - 12 || b.bottom > r.bottom - 12) bad.push('frame overlap');
      }
      return { bad, name: block.querySelector('.ability-name').textContent, lines: [block.querySelector('.ability-name').textContent, block.querySelector('.ability-description').textContent, block.querySelector('.ability-effect').textContent] };
    });
    assert.deepEqual(result.bad, [], `${name}: ${JSON.stringify(result)}`);
    assert(result.lines[2].startsWith(': '));
    return result;
  };
  for (const rule of ['inspect', 'plate', 'spawn', 'magnet', 'alarm', 'thorns', 'gilded']) {
    await pg.evaluate((r) => window.sliceApi.bossOf(r, 1), rule);
    await pg.waitForTimeout(250);
    const at = await pg.evaluate(() => window.sliceApi.screenOf(window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'K')));
    await pg.touchscreen.tap(at.x, at.y);
    await pg.waitForTimeout(250);
    const first = await check(rule);
    const button = pg.locator('.unit-peek [data-ability-next]');
    if (await button.count()) {
      const count = Number((await button.getAttribute('aria-label')).match(/\/(\d+)/)[1]);
      for (let i = 1; i < count; i++) {
        await button.tap();
        const next = await check(`${rule}-${i}`);
        assert.notEqual(next.name, first.name);
      }
      await button.tap();
      assert.equal((await check(`${rule}-wrap`)).name, first.name);
    }
    await shot(`ability-${rule}`);
    await pg.touchscreen.tap(450, 80); await pg.waitForTimeout(200);
  }
  // 같은 폰의 자폭·공격 강화가 모두 남는지 확인한다.
  await pg.evaluate(() => { window.sliceApi.startAt(2, 'battle'); const b = window.slice(); b.traits = ['blastPawn', 'pawnDrill']; b.blastPawns = true; });
  await pg.waitForTimeout(200);
  const at = await pg.evaluate(() => window.sliceApi.screenOf(window.slice().s.pieces.find((p) => p.side === 1 && p.type === 'P')));
  await pg.touchscreen.tap(at.x, at.y); await pg.waitForTimeout(250);
  assert.equal((await check('compound')).name, '[자폭]');
  await pg.locator('.unit-peek [data-ability-next]').tap();
  assert.equal((await check('compound-2')).name, '[송곳 폰]');
  await shot('ability-compound');
  await pg.touchscreen.tap(450, 80); await pg.waitForTimeout(200);
  await pg.evaluate(() => window.sliceApi.bossOf('inspect', 1));
  await pg.waitForTimeout(250);
  await pg.tap('#boss'); await pg.waitForTimeout(350);
  assert.equal((await check('boss-rules', '#overlay-panel')).name, '[검수]');
  await pg.locator('#overlay-panel [data-ability-next]').tap();
  assert.equal((await check('boss-rules-2', '#overlay-panel')).name, '[철갑]');
  await shot('ability-rules'); await pg.tap('#overlay-panel [data-x]');
  for (const [id, part, name] of [['rook', 'siegeLatch', '[공성 걸쇠]'], ['mixed', 'relayGear', '[맞물린 톱니]']]) {
    await pg.evaluate((id) => window.sliceApi.buildTrial(id), id); await pg.waitForTimeout(250);
    await pg.tap(`[data-part-info="${part}"]`); await pg.waitForTimeout(300);
    assert.equal((await check(part, '.part-detail')).name, name);
    await pg.locator('.part-detail [data-ability-next]').tap();
    assert.notEqual((await check(`${part}-2`, '.part-detail')).name, name);
    await shot(`ability-${part}`);
    await pg.touchscreen.tap(450, 80); await pg.waitForTimeout(200);
  }
  console.log('Abilities: seven bosses, every page, compound pawn, rules/parts, three lines, tap persistence, bounds PASS');
};
