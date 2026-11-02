// 타격감 연구실 아티팩트 만들기 (D-179): 템플릿 + 기물 도트 · 갈무리 서체를 data URI로 넣는다.
// 사용: node tools/impactlab/build.cjs <출력.html>
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', '..');
const out = process.argv[2];
let html = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');
const b64 = (p) => fs.readFileSync(path.join(root, p)).toString('base64');
const sprites = {};
for (const t of ['P', 'N', 'B', 'R', 'Q', 'K']) for (const s of [0, 1]) sprites[`${t}${s}`] = `data:image/png;base64,${b64(`public/pieces/s-${t}${s}.png`)}`;
sprites.LOGO = `data:image/png;base64,${b64('public/ui/title-logo.png')}`;
html = html
  .replace('__FONT_B__', `data:font/woff2;base64,${b64('node_modules/galmuri/dist/Galmuri11-Bold.woff2')}`)
  .replace('__FONT_R__', `data:font/woff2;base64,${b64('node_modules/galmuri/dist/Galmuri11.woff2')}`)
  .replace('__SPRITES__', JSON.stringify(sprites));
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0) + 'KB');
