// 지도 아래 노드 미리보기 띠 겹침 · 넘침 점검 (D-685 · D-688).
// 모든 노드 종류(대국 · 검문 · 반장 · 도금왕 · 작업대 · 최종 정비 · 고물상 · 사건 · 부품 상자) × 실제 출하에서 가장 긴 이름 · 꼬리표 · 적 명단(+ 셋을 합친 최악 사례)을
// 세 해상도(915×412 DPR 2.625 · 667×375 DPR 2 · 1920×1080 DPR 1)에서 열고, 이름 · 꼬리표 · 명단 · 설명 · 아이콘 · 「진입」 상자가 서로 겹치지 않는지,
// 띠 안쪽(테 제외)을 넘지 않는지, 글이 잘리지 않는지, 「진입」이 48 이상인지, 띠가 지금 · 다음 노드를 덮지 않는지 본다.
// 사용: 프리뷰 서버를 띄운 뒤 [URL0=http://localhost:4173/?debug] [SHOT=<폴더>] [TAG=before|after] node tools/qa/map-peek.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const URL0 = process.env.URL0 || 'http://localhost:4173/?debug';
const SHOT = process.env.SHOT || '';
const TAG = process.env.TAG || 'after';
// 분대 수: 6 = 사용자 실기기 화면 · 10 = 분대 최대(SLICE.squadMax) — 분대 현황판이 길수록 띠가 좁아진다. 스크린샷은 첫 값으로만
const SQUADS = (process.env.SQUADS || '6,10').split(',').map(Number);
const SIZES_ALL = [
  { name: '915', w: 915, h: 412, dpr: 2.625 },
  { name: '667', w: 667, h: 375, dpr: 2 },
  { name: '1920', w: 1920, h: 1080, dpr: 1 },
];
// SIZE=915 처럼 한 해상도만 돌릴 수 있다
const SIZES = SIZES_ALL.filter((z) => !process.env.SIZE || process.env.SIZE.split(',').includes(z.name));
// 스크린샷은 종류마다 대표 하나 (최악 합성 · 장소)
const SHOTS = new Set(['battle-worst', 'check-worst', 'boss-name', 'boss-worst', 'final-boss-name', 'forge', 'forge-final', 'shop', 'event', 'chest']);

const measure = () => {
  const bar = document.querySelector('.mapfx .peek-bar');
  const R = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const cs = getComputedStyle(bar);
  const pr = R(bar);
  const inner = { l: pr.l + parseFloat(cs.borderLeftWidth), t: pr.t + parseFloat(cs.borderTopWidth), r: pr.r - parseFloat(cs.borderRightWidth), b: pr.b - parseFloat(cs.borderBottomWidth) };
  const boxes = [];
  const add = (group, e) => { if (e && e.getClientRects().length && getComputedStyle(e).display !== 'none') boxes.push({ group, ...R(e), clip: e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1, text: e.textContent }); };
  add('ico', bar.querySelector('.pb-ico'));
  add('name', bar.querySelector('.pb-name'));
  add('desc', bar.querySelector('.pb-desc'));
  bar.querySelectorAll('.pb-tags .ribbon').forEach((e) => add('tags', e));
  bar.querySelectorAll('.pb-foe').forEach((e) => add('foes', e));
  add('go', bar.querySelector('.pb-go'));
  const nodes = [...document.querySelectorAll('.mapfx .mnd.now, .mapfx .mnd.later, .mapfx .mnd.done')].map((e) => ({ cls: e.className, ...R(e) }));
  const hidden = bar.querySelectorAll('.pb-foes').length && getComputedStyle(bar.querySelector('.pb-foes')).display === 'none';
  return { pr, inner, boxes, nodes, hidden, vw: innerWidth, vh: innerHeight };
};

const hit = (a, b) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;

(async () => {
  const br = await chromium.launch();
  let fails = 0, checks = 0;
  const rows = [];
  for (const sz of SIZES) for (const crew of SQUADS) {
    const ctx = await br.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr, hasTouch: true, isMobile: sz.w < 1000 });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(URL0);
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ tut: ['battle', 'recruit', 'map', 'kit', 'drill-a', 'drill-b', 'heat'] })); });
    await p.goto(URL0);
    await p.waitForTimeout(3500);
    await p.evaluate(() => sliceApi.begin(5, 0, 'story', null, 'standard'));
    await p.waitForTimeout(1500);
    await p.evaluate((n) => { const s = sliceApi.squad(); while (s.length < n) s.push(JSON.parse(JSON.stringify(s[s.length - 1]))); }, crew);
    const labels = await p.evaluate(() => sliceApi.peekCases());
    for (let i = 0; i < labels.length; i++) {
      await p.evaluate((k) => sliceApi.mapPeek(k), i);
      await p.waitForTimeout(450);
      // 띠가 계단으로 자라는 동안(pbOpen)은 재지 않는다 — 다 자란 뒤에
      await p.waitForFunction(() => document.querySelector('.mapfx')?.getAnimations({ subtree: true }).filter((a) => a.effect?.target?.closest?.('.peek-bar, .mapfx') === a.effect?.target && a.effect.getTiming().iterations !== Infinity).every((a) => a.playState !== 'running'), null, { timeout: 5000 });
      const m = await p.evaluate(measure);
      const bad = [];
      if (m.hidden) bad.push('적 명단이 숨음');
      for (const b of m.boxes) {
        checks++;
        if (b.l < m.inner.l - 0.5 || b.r > m.inner.r + 0.5 || b.t < m.inner.t - 0.5 || b.b > m.inner.b + 0.5) bad.push(`${b.group} 띠 밖(${b.text})`);
        if (b.clip && b.group !== 'go') bad.push(`${b.group} 잘림(${b.text})`);
      }
      const groups = [...new Set(m.boxes.map((b) => b.group))];
      for (let x = 0; x < m.boxes.length; x++)
        for (let y = x + 1; y < m.boxes.length; y++) {
          const a = m.boxes[x], b = m.boxes[y];
          checks++;
          if (hit(a, b)) bad.push(`${a.group}×${b.group} 겹침(${a.text} / ${b.text})`);
        }
      const go = m.boxes.find((b) => b.group === 'go');
      if (!go || go.h < 48 || go.w < 48) bad.push(`진입 ${go ? `${go.w.toFixed(0)}×${go.h.toFixed(0)}` : '없음'}`);
      for (const n of m.nodes) { checks++; if (hit(m.pr, n)) bad.push(`노드를 덮음(${n.cls})`); }
      if (m.pr.r > m.vw || m.pr.b > m.vh || m.pr.l < 0) bad.push('띠가 화면 밖');
      if (bad.length) fails++;
      rows.push({ size: sz.name, crew, case: labels[i], bar: `${m.pr.w.toFixed(0)}×${m.pr.h.toFixed(0)}`, groups: groups.join(','), ok: !bad.length, bad });
      if (SHOT && crew === SQUADS[0] && SHOTS.has(labels[i])) {
        fs.mkdirSync(SHOT, { recursive: true });
        await p.screenshot({ path: `${SHOT}/${TAG}-${sz.name}-${labels[i]}.png` });
      }
    }
    if (errs.length) { fails++; rows.push({ size: sz.name, crew, case: 'pageerror', ok: false, bad: errs }); }
    await ctx.close();
  }
  await br.close();
  for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.size.padEnd(4)} c${r.crew} ${String(r.case).padEnd(16)} ${r.bar ?? ''} ${r.ok ? '' : r.bad.join(' · ')}`);
  console.log(`${rows.length} cases · ${checks} checks · ${fails} fail`);
  process.exit(fails ? 1 : 0);
})();
