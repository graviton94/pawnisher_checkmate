// 슬롯 상한·두 페이지 교체·84개 공통 문법을 실제 렌더링과 터치로 검증한다.
const assert = require('node:assert/strict');
module.exports = async (pg, shot) => {
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  const errors = []; pg.on('pageerror', (e) => errors.push(e.message));
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => window.sliceApi.buildTrial('mixed'));
  await pg.waitForTimeout(700);
  const saved = await pg.evaluate(() => JSON.stringify(localStorage));
  await pg.evaluate(() => window.sliceApi.allFaces());
  await pg.waitForTimeout(400);
  const ids = await pg.locator('[data-part-id]').evaluateAll((els) => els.map((e) => e.dataset.partId));
  assert.equal(ids.length, 84);
  const artwork = await pg.locator('[data-part-id]').evaluateAll((els) => els.map((e) => ({
    h: e.getBoundingClientRect().height, lines: e.querySelectorAll('.part-rule-lines > .ln').length,
    flavor: e.querySelector('.db-top') !== null,
  })));
  assert(artwork.every((c) => c.lines === 3 && !c.flavor));
  assert(Math.max(...artwork.map((c) => c.h)) - Math.min(...artwork.map((c) => c.h)) < 1);
  await pg.locator('[data-part-id="relaySeal"]').evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'start' }));
  await pg.waitForTimeout(350); await shot('part-rule-cards');
  await pg.tap('[data-x]');

  const checkText = async (selector) => pg.locator(selector).evaluateAll((els) => els.flatMap((el) => {
    const bad = [], box = el.getBoundingClientRect();
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) {
      if (!n.textContent.trim()) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1)
        bad.push({ text: n.textContent.trim(), box: box.toJSON(), ink: r.toJSON() });
    }
    return bad;
  }));
  const checkPage = async () => {
    await pg.waitForTimeout(350);
    const cards = await pg.locator('.part-replace').evaluateAll((els) => els.map((e) => ({
      id: e.dataset.slot, h: e.getBoundingClientRect().height,
      rows: e.querySelector('.part-replace-rule').children.length,
      fx: e.querySelector('strong').textContent,
      box: e.getBoundingClientRect().toJSON(),
    })));
    assert(cards.length > 0 && cards.length <= 4);
    assert(cards.every((c) => c.h === 96 && c.rows === 3 && c.fx.startsWith(': ')));
    assert.deepEqual(await checkText('.part-replace-rule'), []);
    const bounds = await pg.locator('.part-replace-screen [data-slot],.part-replace-screen .btn').evaluateAll((els) => els.map((e) => ({
      r: e.getBoundingClientRect().toJSON(), visible: e.getBoundingClientRect().width >= 48 && Math.max(e.getBoundingClientRect().height, Number.parseFloat(getComputedStyle(e, '::before').height) || 0) >= 48,
    })));
    const v = pg.viewportSize();
    assert(bounds.every(({ r, visible }) => visible && r.left >= 0 && r.right <= v.width + 1 && r.top >= 0 && r.bottom <= v.height + 1), JSON.stringify(bounds));
    return cards.map((c) => c.id);
  };
  // 84종을 8개씩 보유하고 모든 페이지의 세 줄을 자르지 않고 표시한다.
  let checked = 0;
  await pg.evaluate(() => window.sliceApi.setAct(2));
  for (let i = 0; i < ids.length; i += 8) {
    const batch = ids.slice(i, i + 8);
    while (batch.length < 8) batch.push(ids[batch.length]);
    await pg.evaluate((batch) => window.sliceApi.full(batch), batch);
    await pg.waitForTimeout(100);
    const seen = await checkPage();
    await pg.tap('[data-part-page="1"]');
    seen.push(...await checkPage());
    assert.deepEqual(seen, batch);
    checked += Math.min(8, ids.length - i);
  }
  // 6칸의 둘째 페이지는 두 개만 표시하고 빈 자리를 유지한다.
  await pg.evaluate(() => { window.sliceApi.setAct(0); window.sliceApi.full(); });
  assert.equal((await pg.evaluate(() => window.sliceApi.parts())).length, 6);
  assert.equal((await checkPage()).length, 4);
  await shot('parts-six-page1');
  await pg.tap('.part-replace:first-child');
  assert.equal(await pg.locator('[data-pick]').isEnabled(), true);
  await pg.tap('[data-part-page="1"]');
  assert.equal((await checkPage()).length, 2);
  assert.equal(await pg.locator('[data-pick]').isDisabled(), true, '페이지 이동 시 숨은 선택 해제');
  await shot('parts-six-page2');
  const kept = await pg.evaluate(() => window.sliceApi.parts().slice());
  await pg.tap('[data-skip]');
  assert.deepEqual(await pg.evaluate(() => window.sliceApi.parts()), kept);

  await pg.evaluate(() => { window.sliceApi.setAct(3); window.sliceApi.full(); });
  const before = await pg.evaluate(() => window.sliceApi.parts().slice());
  assert.equal(before.length, 8);
  await pg.tap('[data-part-page="1"]');
  await checkPage(); await shot('parts-eight-page2');
  const old = await pg.locator('.part-replace:last-child').getAttribute('data-slot');
  await pg.tap('.part-replace:last-child'); await pg.tap('[data-pick]');
  await pg.waitForSelector('#overlay', { state: 'hidden' });
  const after = await pg.evaluate(() => window.sliceApi.parts().slice());
  assert.equal(after.length, 8); assert(!after.includes(old));
  assert(before.filter((id) => id !== old).every((id) => after.includes(id)), '선택한 하나만 교체');
  assert.equal(after.filter((id) => !before.includes(id)).length, 1);

  await pg.evaluate(() => window.sliceApi.redraw());
  assert.equal(await pg.locator('[data-part-info]').count(), 8, '전투 HUD에도 여덟 부품 표시');
  await pg.locator('[data-part-info]').last().tap();
  assert.equal(await pg.locator('.part-detail').count(), 1, '마지막 부품까지 탭으로 접근');
  await pg.touchscreen.tap(650, 16);
  await shot('parts-eight-hud');
  await pg.evaluate(() => window.sliceApi.buildTrial('mixed'));
  await pg.waitForTimeout(500);
  // 보유 칸의 모든 부품 상세도 같은 세 줄. 복합 판정의 다음 장까지 범위 검사.
  for (const id of ids) {
    if (ids.indexOf(id) % 14 === 0) console.log('DETAIL_PROGRESS', ids.indexOf(id), id);
    await pg.evaluate((id) => { window.sliceApi.parts([id]); window.sliceApi.redraw(); }, id);
    await pg.tap(`[data-part-info="${id}"]`); await pg.waitForTimeout(20);
    assert.equal(await pg.locator('.part-detail .ability-description').count(), 1);
    assert.equal(await pg.locator('.part-detail .ability-effect').count(), 1);
    assert.deepEqual(await checkText('.part-detail .ability-block'), [], id);
    const next = pg.locator('.part-detail [data-ability-next]');
    if (await next.count()) {
      const total = Number((await next.getAttribute('aria-label')).match(/\/(\d+)/)[1]);
      for (let i = 1; i < total; i++) { await next.tap(); assert.deepEqual(await checkText('.part-detail .ability-block'), [], `${id} page ${i + 1}`); }
    }
    if (id === 'spare') await shot('part-rule-cost');
    if (id === 'sharedPlate') await shot('part-rule-detail');
    await pg.touchscreen.tap(650 < pg.viewportSize().width ? 650 : 600, 16);
  }
  assert.equal(await pg.evaluate(() => JSON.stringify(localStorage)), saved, '실험실은 실제 저장을 변경하지 않음');
  assert.deepEqual(errors, []);
  console.log(`PASS part-rules: ${checked} replacement rules + ${ids.length} details, 6/8 slots, fixed96px, paging/reset, skip/replace, saved run preserved`);
};
