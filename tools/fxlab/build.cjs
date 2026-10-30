// FX 랩 한 장짜리 HTML 만들기: lab.ts를 묶고, 기물 도트와 갈무리 글꼴을 data URI로 넣는다.
// 사용: node tools/fxlab/build.cjs <출력.html>
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const root = path.join(__dirname, '..', '..');
  const out = process.argv[2] || path.join(root, 'production', 'fxlab.html');
  const { build } = await import('vite');
  const res = await build({
    root,
    logLevel: 'warn',
    configFile: false,
    build: {
      write: false,
      minify: true,
      lib: { entry: path.join(__dirname, 'lab.ts'), formats: ['iife'], name: 'FxLab', fileName: () => 'lab.js' },
    },
  });
  const js = (Array.isArray(res) ? res[0] : res).output[0].code;
  const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');
  const sprites = {};
  for (const t of ['P', 'N', 'B', 'R', 'Q', 'K']) for (const s of [0, 1]) sprites[`${t}${s}`] = `data:image/png;base64,${b64(`public/pieces/s-${t}${s}.png`)}`;
  // 판 위 도트·소품·HUD·프레임·아이콘 (tools/draw-board.py · draw-assets.py · 발주 결과). 판 칸 덧그림은 이름만, 나머지는 '폴더/이름'
  const gallery = [];
  for (const dir of ['board', 'props', 'hud', 'frames', 'icons']) {
    const d = path.join(root, 'public', 'ui', dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort()) {
      const name = f.slice(0, -4);
      const key = dir === 'board' ? name : `${dir}/${name}`;
      const buf = fs.readFileSync(path.join(d, f));
      sprites[key] = `data:image/png;base64,${buf.toString('base64')}`;
      // PNG 머리에서 크기를 읽는다 (그림이 뜨기 전에 목록을 그리므로)
      gallery.push({ dir, name, key, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });
    }
  }
  const html = fs
    .readFileSync(path.join(__dirname, 'template.html'), 'utf8')
    .replace('{{FONT11}}', b64('node_modules/galmuri/dist/Galmuri11.woff2'))
    .replace('{{FONT11B}}', b64('node_modules/galmuri/dist/Galmuri11-Bold.woff2'))
    .replace('{{SPRITES}}', JSON.stringify(sprites))
    .replace('{{GALLERY}}', JSON.stringify(gallery))
    .replace('{{JS}}', () => js.replace(/<\/script/gi, '<\\/script'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(`${out} (${(html.length / 1024).toFixed(0)} KB, 스크립트 ${(js.length / 1024).toFixed(0)} KB)`);
})();
