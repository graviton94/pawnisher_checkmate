// CSS 키프레임 디더를 16단으로 펼친다 (D-546 — D-538의 다섯 단 px0 · pxm1 · px2 · px3 · px4 → --dq0 ~ --dq16).
// 키프레임 안의 mask-image: var(--pxN)을 --dqL로 바꾸고, 두 디더 칸 사이에 빠진 단을 고르게 끼운다.
// 한쪽 끝만 있는 디더(0%만 · 100%만)는 반대쪽을 다 보임(--dq16)으로 본다. 일부러 깜빡이는 것(alarm · blink)은 그대로.
// --dqN은 view/motion.ts installDitherVars가 기기 DPR의 게임 도트 크기로 <html>에 건다.
// 사용: node tools/dither-css.cjs [--check] <css...> (기본: src/style.css src/legacy.css src/slice/*.css)
const fs = require('fs');
const path = require('path');

const LV = { px0: 16, pxm1: 12, px2: 8, px3: 4, px4: 0 };
const SKIP = /^(alarm|blink)$/;
const VAR = /var\(--(px0|pxm1|px2|px3|px4)\)/g;

const fmt = (v) => `${+v.toFixed(2)}%`;
const offOf = (sel) => (sel === 'from' ? 0 : sel === 'to' ? 100 : parseFloat(sel));

/** 키프레임 블록 하나를 펼친다 */
const densify = (name, body) => {
  if (SKIP.test(name) || !VAR.test(body)) return body;
  VAR.lastIndex = 0;
  // 칸 나누기: selector { decls }
  const stops = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) stops.push({ sel: m[1].trim(), decls: m[2] });
  const marks = [];
  const have = new Set();
  for (const s of stops) {
    const offs = s.sel.split(',').map((x) => offOf(x.trim()));
    offs.forEach((o) => have.add(+o.toFixed(2)));
    const mm = /mask-image:\s*var\(--(px0|pxm1|px2|px3|px4)\)/.exec(s.decls);
    if (mm) offs.forEach((o) => marks.push({ o, l: LV[mm[1]] }));
  }
  marks.sort((a, b) => a.o - b.o);
  const add = [];
  if (marks.length === 1) {
    if (marks[0].o === 0) (marks.push({ o: 100, l: 16 }), !have.has(100) && add.push({ o: 100, l: 16 }));
    else if (marks[0].o === 100) (marks.unshift({ o: 0, l: 16 }), !have.has(0) && add.push({ o: 0, l: 16 }));
  }
  for (let i = 0; i + 1 < marks.length; i++) {
    const a = marks[i], b = marks[i + 1];
    const d = b.l - a.l;
    if (!d || b.o <= a.o) continue;
    const n = Math.abs(d);
    for (let j = 1; j < n; j++) {
      const o = +(a.o + ((b.o - a.o) * j) / n).toFixed(2);
      if (have.has(o)) continue;
      have.add(o);
      add.push({ o, l: a.l + Math.sign(d) * j });
    }
  }
  let out = body.replace(VAR, (_, k) => `var(--dq${LV[k]})`);
  out = out.replace(/\s*$/, '') + add.map((x) => ` ${fmt(x.o)} { -webkit-mask-image: var(--dq${x.l}); mask-image: var(--dq${x.l}); }`).join('') + ' ';
  return out;
};

/** 파일 하나 — @keyframes 블록마다 (괄호 짝 맞춤) */
const run = (src) => {
  let out = '';
  let i = 0;
  const kw = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  let n = 0;
  while ((m = kw.exec(src))) {
    const start = m.index + m[0].length;
    let depth = 1, j = start;
    while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
    const body = src.slice(start, j - 1);
    const nb = densify(m[1], body);
    if (nb !== body) n++;
    out += src.slice(i, start) + nb + '}';
    i = j;
    kw.lastIndex = j;
  }
  return { css: out + src.slice(i), n };
};

const args = process.argv.slice(2);
const check = args.includes('--check');
let files = args.filter((a) => !a.startsWith('--'));
if (!files.length) files = ['src/style.css', 'src/legacy.css', ...fs.readdirSync('src/slice').filter((f) => f.endsWith('.css')).map((f) => path.join('src/slice', f))];
let total = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const { css, n } = run(src);
  total += n;
  if (n) console.log(`${f}: ${n} keyframes`);
  if (!check && css !== src) fs.writeFileSync(f, css);
}
console.log(`${check ? '(check) ' : ''}펼친 키프레임 ${total}`);
if (check && total) process.exit(1);
