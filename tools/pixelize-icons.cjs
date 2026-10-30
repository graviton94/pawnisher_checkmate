// 공개 픽토그램을 도트로 (D-049): game-icons.net(CC BY 3.0) · Tabler Icons(MIT)의 SVG를 크게 그린 뒤
// 칸마다 덮인 넓이로 줄이고 문턱값으로 잘라 흰색 도트 실루엣을 만든다. 색은 코드가 입힌다.
// 사용: node tools/pixelize-icons.cjs   (출처 표기는 docs/CREDITS.md)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const G = require('@iconify-json/game-icons/icons.json');
const T = require('@iconify-json/tabler/icons.json');

/** [저장 이름, 세트, 아이콘, 크기(도트), 문턱값] */
const LIST = [
  // 아이콘 문양 (16×16)
  ['icons/sword', G, 'broadsword', 16],
  ['icons/pierce', G, 'arrowhead', 16],
  ['icons/fork', T, 'arrows-split-2', 16],
  ['icons/wave', T, 'ripple', 16],
  ['icons/flame', G, 'flame', 16],
  ['icons/shield', G, 'shield', 16],
  ['icons/bricks', G, 'brick-wall', 16],
  ['icons/chain', T, 'link', 16, 0.3],
  ['icons/oil', T, 'droplet-filled', 16],
  ['icons/skull', G, 'death-skull', 16],
  ['icons/horseshoe', G, 'horseshoe', 16],
  ['icons/portal', T, 'spiral', 16, 0.3],
  ['icons/swap', T, 'arrows-exchange', 16],
  ['icons/flag', G, 'flying-flag', 16],
  ['icons/claw', T, 'hand-grab', 16, 0.3],
  ['icons/windkey', T, 'key-filled', 16],
  ['icons/watch', T, 'clock-filled', 16],
  ['icons/bell', T, 'bell-filled', 16],
  ['icons/crown', G, 'crown', 16],
  ['icons/star', T, 'star-filled', 16],
  ['icons/eye', T, 'eye-filled', 16],
  ['icons/scale', G, 'scales', 16],
  ['icons/reticle', T, 'target', 16, 0.3],
  ['icons/card', T, 'cards-filled', 16],
  ['icons/anvil', G, 'anvil', 16],
  ['icons/screw', G, 'ancient-screw', 16],
  ['icons/question', T, 'question-mark', 16],
  ['icons/crate', G, 'wooden-crate', 16],
  ['icons/wrench', G, 'wrench', 16],
  ['icons/lever', G, 'lever', 16],
  // 판 위에 쓰는 작은 해골 (처치 숫자 옆 · 처치 과녁 안)
  ['hud/skull-small', G, 'death-skull', 7],
];

const svgOf = (set, name) => {
  const ic = set.icons[name];
  if (!ic) throw new Error(`없는 아이콘: ${name}`);
  const w = ic.width ?? set.width ?? 24;
  const h = ic.height ?? set.height ?? 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ic.left ?? 0} ${ic.top ?? 0} ${w} ${h}" width="256" height="256" color="#ffffff" fill="#ffffff">${ic.body.replace(/currentColor/g, '#ffffff')}</svg>`;
};

const CAND = [
  ['bell-t', T, 'bell-filled', 16, 0.45], ['eye-t', T, 'eye-filled', 16, 0.45], ['chain-t', T, 'link', 16, 0.3], ['claw-t', T, 'hand-grab', 16, 0.3],
  ['oil-g', G, 'drop', 16, 0.45], ['oil-t', T, 'droplet-filled', 16, 0.45], ['portal-t', T, 'spiral', 16, 0.3], ['watch-g', G, 'stopwatch', 16, 0.45],
  ['watch-t', T, 'clock-filled', 16, 0.45], ['card-t', T, 'cards-filled', 16, 0.45], ['reticle-t', T, 'target', 16, 0.3], ['screw-g', G, 'ancient-screw', 16, 0.45],
  ['pierce-g', G, 'arrowhead', 16, 0.45], ['pierce-g2', G, 'piercing-sword', 16, 0.6], ['key-t', T, 'key-filled', 16, 0.45], ['key-g', G, 'key', 16, 0.45],
  ['wave-g', G, 'echo-ripples', 16, 0.45], ['bell-g', G, 'ringing-bell', 16, 0.6], ['clockwork', G, 'clockwork', 16, 0.6],
].map(([n, s, i, z, c]) => [`_cand/${n}`, s, i, z, c]);
const RUN = process.env.CAND ? CAND : LIST;

(async () => {
  const root = path.join(__dirname, '..');
  const b = await chromium.launch();
  const page = await b.newPage();
  await page.setContent('<canvas id="c" width="256" height="256"></canvas>');
  for (const [out, set, name, n, cut = 0.45] of RUN) {
    const svg = svgOf(set, name);
    const png = await page.evaluate(
      async ([svg, n, cut]) => {
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        await img.decode();
        const big = document.getElementById('c');
        const g = big.getContext('2d');
        g.clearRect(0, 0, 256, 256);
        g.drawImage(img, 0, 0, 256, 256);
        const a = g.getImageData(0, 0, 256, 256).data;
        // 그림이 실제로 차지하는 영역에 맞춰 n×n 격자로 (여백 없이 꽉 차게, 비율 유지)
        let x0 = 256, y0 = 256, x1 = 0, y1 = 0;
        for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (a[(y * 256 + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
        const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
        const cell = side / n;
        const out = document.createElement('canvas');
        out.width = out.height = n;
        const o = out.getContext('2d');
        const id = o.createImageData(n, n);
        for (let j = 0; j < n; j++)
          for (let i = 0; i < n; i++) {
            let sum = 0, cnt = 0;
            for (let y = cy - side / 2 + j * cell; y < cy - side / 2 + (j + 1) * cell; y += 1)
              for (let x = cx - side / 2 + i * cell; x < cx - side / 2 + (i + 1) * cell; x += 1) {
                const X = Math.round(x), Y = Math.round(y);
                cnt++;
                if (X >= 0 && Y >= 0 && X < 256 && Y < 256) sum += a[(Y * 256 + X) * 4 + 3] / 255;
              }
            const on = sum / cnt >= cut;
            const k = (j * n + i) * 4;
            id.data[k] = id.data[k + 1] = id.data[k + 2] = 255;
            id.data[k + 3] = on ? 255 : 0;
          }
        o.putImageData(id, 0, 0);
        return out.toDataURL('image/png');
      },
      [svg, n, cut],
    );
    const file = path.join(root, out.startsWith('_') ? 'build-res' : 'public/ui', `${out}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
  }
  await b.close();
  console.log(`ok ${RUN.length}`);
})();
