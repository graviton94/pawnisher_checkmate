// 전용 원화의 실제 바이트·배우 중복·생존 분기·진행·기기 도트 배율을 실제 컷신에서 확인한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const bounds = require('./ui-bounds.cjs');

module.exports = async (pg, shot) => {
  const errors = [];
  pg.on('pageerror', e => errors.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await pg.emulateMedia({ reducedMotion: 'reduce' });
  await pg.evaluate(() => window.sliceApi.buildTrial('mixed'));
  await pg.waitForTimeout(2600);
  const images = new Set();
  const inspect = async (tag) => {
    const im = pg.locator('.pl-stage > .pl-img');
    await im.waitFor({ state: 'visible' });
    await pg.waitForFunction(() => { const im = document.querySelector('.pl-stage > .pl-img'); return im?.complete && im.naturalWidth > 0; });
    const src = await im.getAttribute('src');
    if (!/departure-decision|shipping-company|gilded-solitude/.test(src)) return src;
    assert.equal(await pg.locator('.pl-actors,.pl-pc').count(), 0, '완성 원화 위에 기물을 합성하지 않음');
    const response = await pg.request.get(new URL(src, pg.url()).href);
    assert((await response.body()).equals(fs.readFileSync(`public/${src}`)), `실제 원화 바이트: ${src}`);
    assert.deepEqual(await im.evaluate(i => [i.naturalWidth, i.naturalHeight]), [320, 180]);
    await bounds(pg, '.prologue');
    const blocked = await im.evaluate((img, src) => {
      const region = src.includes('departure-decision') ? [120, 136, 234, 153]
        : src.includes('gilded-solitude') ? [98, 118, 193, 147] : null;
      if (!region) return false;
      const r = img.getBoundingClientRect(), k = r.width / img.naturalWidth;
      const a = { left: r.left + region[0] * k, top: r.top + region[1] * k,
        right: r.left + region[2] * k, bottom: r.top + region[3] * k };
      return [...document.querySelectorAll('.cut-sub,.cut-skip')].some(el => {
        const b = el.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      });
    }, src);
    assert.equal(blocked, false, '대사창/단추가 문턱 접점과 버린 왕관을 가리지 않음');
    images.add(src);
    if (tag) await shot(`cinematics-${tag}`);
    return src;
  };
  const skip = async () => {
    await pg.locator('.prologue .cut-skip').tap();
    await pg.locator('.prologue').waitFor({ state: 'detached' });
  };
  const until = async (name, tag) => {
    for (let i = 0; i < 40; i++) {
      await pg.waitForTimeout(130);
      if (await pg.locator('.cut-sub.typing').count()) {
        await pg.locator('.prologue').tap({ position: { x: 80, y: 80 } });
        await pg.waitForTimeout(60);
      }
      const src = await inspect();
      if (src.endsWith(`${name}.png`)) {
        if (tag) await inspect(tag);
        return await pg.locator('.cut-lines').innerText();
      }
      await pg.locator('.prologue').tap({ position: { x: 80, y: 80 } });
    }
    throw new Error(`장면에 도달하지 못함: ${name}`);
  };
  // 같은 완성 원화가 임의의 생존 동료를 확정하지 않는지 0/1/9명에서 확인.
  for (const count of [0, 1, 9]) {
    await pg.evaluate((count) => {
      const squad = window.sliceApi.squad(), template = squad.find(u => u.t !== 'K');
      squad.splice(0, squad.length, ...squad.filter(u => u.t === 'K'));
      for (let i = 0; i < count; i++) squad.push({ ...template, t: ['P','N','B','R','Q'][i % 5], serial: `cinematic-${i}`, name: `흠집동료${i + 1}`, hp: 10 });
      void window.sliceApi.trueEnd();
    }, count);
    await pg.waitForTimeout(200);
    const dock = await until('departure-decision', `S05-company${count}`);
    assert(dock.includes(count ? '흠집동료1' : '남겨진 이름들'), '실제 생존 분기의 대사');
    const shipping = await until('shipping-company', `S06-company${count}`);
    assert(shipping.includes(count ? '동료가 잠들었다' : '남겨진 이름'), '상자 대사 분기');
    await until('epilogue-hands');
    assert.equal(await pg.locator('.pl-pc').count(), 0, '부모·아이 컷에도 대역을 넣지 않음');
    await skip();
  }
  // 실제 왕위 결정 흐름을 통해 S-07과 출하 기록까지 확인.
  await pg.evaluate(() => { const a = window.sliceApi; a.startAt(3, 'boss'); a.richRun(); a.setAct(2); a.endFlow(0); });
  await pg.locator('.promotion').waitFor({ state: 'visible' });
  await pg.locator('[data-promote]').tap();
  await pg.locator('.prologue').waitFor({ state: 'visible' });
  const king = await until('gilded-solitude', 'S07');
  assert(king.includes('대장, 안 오세요?') || king.includes('빈칸'), '배신 장면의 분기 유지');
  await skip();
  await pg.locator('.credits').waitFor({ state: 'visible' });
  assert.equal(images.size, 3);
  assert.deepEqual(errors, []);
  console.log('PASS cinematics: 3 exact images, native320x180, integer device scale, no actor overlays, company0/1/9, promotion→credits');
};
