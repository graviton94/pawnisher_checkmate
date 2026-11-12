// 글자 경계와 실제(가상 요소 포함) 48px 터치 영역을 검사한다.
const assert = require('node:assert/strict');
module.exports = async (pg, selector) => {
    await pg.waitForFunction((selector) => [...document.querySelectorAll(`${selector} img[data-cover]`)].every((img) => img.complete && img.naturalWidth > 0), selector);
    const bad = await pg.locator(selector).evaluate((root) => {
      const bad = [];
      const visible = (e) => e.checkVisibility() && getComputedStyle(e).visibility !== 'hidden';
      for (const img of root.querySelectorAll('img[data-cover]')) {
        if (!img.complete || !img.naturalWidth) { bad.push('scene image missing'); continue; }
        const r = img.getBoundingClientRect();
        const scale = r.width / img.naturalWidth * devicePixelRatio;
        if (Math.abs(scale - Math.round(scale)) > 0.01) bad.push('fractional device pixel scale');
        if (Math.abs(r.width / r.height - img.naturalWidth / img.naturalHeight) > 0.01) bad.push('image aspect distortion');
        const p = img.parentElement, pr = p.getBoundingClientRect();
        const left = pr.left + p.clientLeft, top = pr.top + p.clientTop;
        if (r.left > left + 1 || r.top > top + 1 || r.right < left + p.clientWidth - 1 || r.bottom < top + p.clientHeight - 1) bad.push('illustration does not cover its scene');
      }
      for (const e of root.querySelectorAll('button,p,h2,b,span')) {
        if (!visible(e)) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push(`viewport: ${e.className} ${e.textContent}`);
        const hitHeight = Math.max(r.height, parseFloat(getComputedStyle(e, '::before').height) || 0);
        if (e.tagName === 'BUTTON' && (r.width < 47.9 || hitHeight < 47.9)) bad.push(`touch: ${e.className} ${r.width}x${r.height}`);
        const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
        for (let t; (t = walker.nextNode());) {
          if (!t.textContent.trim()) continue;
          const range = document.createRange(); range.selectNodeContents(t);
          for (const box of range.getClientRects()) {
            if (box.left < r.left - 1 || box.right > r.right + 1 || box.top < r.top - 2 || box.bottom > r.bottom + 2) bad.push(`text: ${e.className} ${t.textContent}`);
          }
        }
      }
      return bad;
    });
    assert.deepEqual(bad, [], `${selector}: ${JSON.stringify(bad)}`);
};
