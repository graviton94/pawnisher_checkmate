const assert = require('node:assert/strict');
module.exports = async (pg, shot) => {
  const saved = await pg.evaluate(() => JSON.stringify(localStorage));
  const setup = async (id, parts) => {
    await pg.evaluate(({ id, parts }) => {
      window.sliceApi.buildTrial(id);
      const b = window.slice(); b.parts = parts; window.sliceApi.parts(parts);
      b.graze = []; b.grazeDanger = []; b.shocked = [];
      for (const p of b.s.pieces) if (p.side === 1) { p.hp = p.maxHp = 300; p.def = 0; p.shield = 0; }
    }, { id, parts });
    await pg.waitForTimeout(300);
  };
  const redraw = async () => { await pg.evaluate(() => window.sliceApi.redraw()); await pg.waitForTimeout(300); };
  const play = async (card, actor, to) => {
    await pg.waitForFunction(() => !document.getElementById('btn-end').disabled, null, { timeout: 15000 });
    const { index, from, dest } = await pg.evaluate(({ card, actor, to }) => {
      const b = window.slice(), p = b.s.pieces.find((p) => p.side === 0 && p.type === actor);
      return { index: b.hand.indexOf(card), from: window.sliceApi.screenOf(p), dest: to ? window.sliceApi.screenOf(to) : null };
    }, { card, actor, to });
    assert(index >= 0, card);
    const before = await pg.evaluate(() => (window.slice().played ?? []).length);
    await pg.tap(`[data-card="${index}"]`); await pg.waitForTimeout(150);
    await pg.touchscreen.tap(from.x, from.y);
    if (dest) { await pg.waitForTimeout(100); await pg.touchscreen.tap(dest.x, dest.y); }
    await pg.waitForFunction((n) => (window.slice().played ?? []).length > n, before, { timeout: 5000 });
    await pg.waitForFunction(() => !document.getElementById('btn-end').disabled, null, { timeout: 15000 });
    await pg.waitForTimeout(250);
  };
  await setup('mixed', ['relayGear', 'relaySeal']); await redraw();
  await play('advance', 'P', { x: 1, y: 2 });
  await play('leap', 'N', { x: 2, y: 2 });
  assert.equal(await pg.evaluate(() => window.slice().ap), 2);
  await play('rookLine', 'R', { x: 5, y: 1 });
  assert(await pg.evaluate(() => window.slice().once.includes('relaySeal')));
  await shot('builds-complete-mixed');
  await pg.tap('[data-part-info="relaySeal"]'); await pg.waitForTimeout(250);
  assert.match(await pg.locator('.part-detail').innerText(), /첫 직접 피해 ×1.8/);
  await shot('builds-seal-detail'); await pg.touchscreen.tap(4, 4);

  await setup('rook', ['siegeLatch', 'sharedPlate']);
  await pg.evaluate(() => {
    const b = window.slice(), pawn = b.s.pieces.find((p) => p.side === 0 && p.type === 'P');
    Object.assign(pawn, { x: 4, y: 0 }); b.squadWins[pawn.id] = 3;
    b.s.pieces.find((p) => p.side === 0 && p.type === 'R').hp = 20;
  }); await redraw();
  await play('plate', 'P');
  assert.equal(await pg.evaluate(() => window.slice().s.pieces.find((p) => p.side === 0 && p.type === 'R').shield), 21);
  await shot('builds-shared-plate');
  await play('rookLine', 'R', { x: 5, y: 1 });
  assert.equal(await pg.evaluate(() => window.slice().s.pieces.find((p) => p.side === 0 && p.type === 'R').shield), 9);
  await shot('builds-complete-rook');

  await setup('knight', ['horseshoe', 'magnet']);
  await pg.evaluate(() => {
    const b = window.slice(); b.hand = ['knightRaid', 'rebound']; b.draw = ['hoofKick', 'leap', 'advance'];
    for (const p of b.s.pieces) if (p.side === 1 && p.type !== 'K') p.hp = 10;
  }); await redraw();
  const target = async (card) => pg.evaluate((card) => {
    const b = window.slice(), actor = b.s.pieces.find((p) => p.side === 0 && p.type === 'N');
    const i = b.hand.indexOf(card);
    return window.sliceApi.cardMoves(b, i, actor.id).find((to) => window.sliceApi.previewPlay(b, i, actor.id, to)?.events.some((e) => e.type === 'attack' && e.hits.some((h) => h.killed && b.s.pieces.find((p) => p.id === h.targetId)?.type !== 'K')));
  }, card);
  const first = await target('knightRaid'); assert(first); await play('knightRaid', 'N', first);
  assert.equal(await pg.evaluate(() => window.slice().ap), 4);
  const second = await target('rebound'); assert(second); await play('rebound', 'N', second);
  assert.equal(await pg.evaluate(() => window.slice().ap), 5);
  assert((await pg.evaluate(() => window.slice().kills)) >= 2);
  await shot('builds-complete-knight');
  await pg.evaluate(() => {
    const crew = window.sliceApi.squad().find((u) => u.t === 'N');
    crew.wins = 3; crew.protectedDamage = 6; window.sliceApi.crew();
  });
  await pg.waitForTimeout(350);
  assert.match(await pg.locator('#overlay-panel').innerText(), /생존 승리 3.*보호 6/s);
  await shot('builds-crew-record'); await pg.tap('[data-x]');
  await pg.evaluate(() => { window.sliceApi.gold(100); window.sliceApi.shop(); });
  await pg.waitForTimeout(500);
  const partSlot = pg.locator('[data-slot^="part:"]');
  assert.equal(await partSlot.count(), 1);
  assert.equal(await partSlot.locator('.part-card').getAttribute('data-grade'), 'common');
  await shot('builds-first-shop');
  const offered = (await partSlot.getAttribute('data-slot')).slice(5);
  await partSlot.tap(); await partSlot.tap();
  await pg.waitForFunction((id) => window.sliceApi.parts().includes(id), offered);
  assert.equal(await pg.evaluate(() => JSON.stringify(localStorage)), saved, '시험판 저장 격리');
  console.log('PASS three build chains: mixed order, veteran→rook shield spend, knight kill→AP/draw→kill, save isolation');
};
