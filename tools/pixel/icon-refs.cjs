// 아이콘 참고판 (D-182 3판): game-icons.net(CC BY 3.0) 원본 64px과 14칸 자동 도트를 나란히 찍는다 — 자동 도트는 뭉개지므로 '참고'만 하고 icons16.py에 손으로 다시 그린다.
// 사용: node tools/pixel/icon-refs.cjs <out.png>
const { chromium } = require('playwright');
const G = require('@iconify-json/game-icons/icons.json');
const L = [['사건','wax-seal'],['사건','envelope'],['검문','magnifying-glass'],['반장','crowned-skull'],['반장','sharp-crown'],['생산선','factory-arm'],['북','drum'],['짓누르는 왕관','weight-crush'],['옥좌','throne-king'],['폭주 코일','tesla-coil'],['메아리','gears'],['공성 망치','siege-ram'],['박차','cowboy-boot'],['종','ringing-bell'],['군기','tattered-banner'],['홀','winged-scepter'],['홀','orb-wand'],['갑주','breastplate'],['도화선','sparky-bomb'],['전도 코일','wire-coil'],['전도 코일','electrical-resistance'],['모루 장갑','anvil-impact'],['모루 장갑','bordered-shield'],['사슬','breaking-chain'],['계약','scroll-quill'],['계약','contract'],['유리 심장','glass-heart'],['유리 심장','broken-heart']];
(async () => {
  const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1400, height: 900 } });
  const cells = L.map(([lab, n]) => { const ic = G.icons[n]; const w = ic.width || G.width || 512, h = ic.height || G.height || 512; return `<div class=c><svg viewBox="0 0 ${w} ${h}" width=64 height=64 fill="#e8e6ef">${ic.body}</svg><canvas data-n="${n}" width=14 height=14></canvas><b>${lab}<br><small>${n}</small></b></div>`; }).join('');
  await pg.setContent(`<style>body{background:#16151c;color:#ddd;font:12px sans-serif;display:flex;flex-wrap:wrap;gap:8px;margin:8px}.c{display:flex;gap:6px;align-items:center;background:#24232c;padding:6px;width:300px}canvas{width:70px;height:70px;image-rendering:pixelated;background:#33313b}small{color:#888}</style>${cells}`);
  await pg.evaluate(async () => {
    for (const cv of document.querySelectorAll('canvas')) {
      const svg = cv.previousElementSibling; const xml = new XMLSerializer().serializeToString(svg).replace('width="64" height="64"', 'width="140" height="140"');
      const img = new Image(); img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))); await img.decode();
      const big = document.createElement('canvas'); big.width = 140; big.height = 140; big.getContext('2d').drawImage(img, 0, 0);
      const d = big.getContext('2d').getImageData(0, 0, 140, 140).data; const x = cv.getContext('2d');
      for (let j = 0; j < 14; j++) for (let i = 0; i < 14; i++) { let a = 0; for (let yy = 0; yy < 10; yy++) for (let xx = 0; xx < 10; xx++) a += d[((j * 10 + yy) * 140 + i * 10 + xx) * 4 + 3]; if (a / 25500 > 0.45) { x.fillStyle = '#e8e6ef'; x.fillRect(i, j, 1, 1); } }
    }
  });
  await pg.screenshot({ path: process.argv[2], fullPage: true }); await br.close();
})();
