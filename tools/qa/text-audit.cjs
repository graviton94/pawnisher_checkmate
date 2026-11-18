// 글자 점검 한 벌 (D-263) — tools/artguide/ui-audit.cjs · tools/qa/sweep.cjs가 같이 쓴다.
// 지금 보이는 글 요소마다 갈무리 격자 크기(11: 12·24·36 / 14: 15·30·45·60) · 서체 · 갈무리14 굵게 · 넘침 · 말줄임을 본다.
// 글자 잉크 점검 (D-556): 글자마다 실제 잉크 높이(canvas measureText의 actualBoundingBox — 계산된 서체 그대로)를
// 글자 자리(Range 사각)에 얹어, ① 자르는 조상(overflow ≠ visible)의 안쪽 밖으로 잉크가 나가면 「잘림 위/아래 N」,
// ② 가장 가까운 꾸민 상자(바탕 · 테 · 9-slice · 그림자 — 칩 · 명판 · 단추 · 띠)의 안쪽 가장자리에서 잉크까지 2px가 안 되면
// 「빠듯 위/아래 N」(음수 = 잉크가 상자 테를 넘어선다)으로 적는다. 판 위(Phaser) 글은 sliceApi.boardTexts()가 주는
// 글 텍스처 여백(Phaser가 잰 ascent/descent + padding)과 같은 잉크를 대어 「판 글 잘림」으로 적는다.

/** 브라우저 안에서 도는 잉크 점검 — 자세한 상자 목록을 돌려준다 (자르기 · 전후 대조에도 쓴다) */
function inkProbe(opt) {
  // 여유 기준 (D-556 소유자 실기 피드백 「배경이 글자에 너무 딱 맞는다」): 면 안쪽(9-slice는 외곽선 · 빛 줄 2도트 안)에서
  // 위아래 잉크 3px · 옆 글자 자리 4px 이상 — 보이는 테 가장자리로는 위아래 ≈ 5–7px · 옆 ≈ 6–8px
  const ROOM = opt?.room ?? 3, ROOMX = opt?.roomX ?? 4;
  const cv = document.createElement('canvas').getContext('2d');
  const cache = new Map();
  const ink = (font, ch) => {
    const k = font + '\u0000' + ch;
    let m = cache.get(k);
    if (!m) { cv.font = font; const t = cv.measureText(ch); m = { a: t.actualBoundingBoxAscent, d: t.actualBoundingBoxDescent, fa: t.fontBoundingBoxAscent, fd: t.fontBoundingBoxDescent }; cache.set(k, m); }
    return m;
  };
  const vis = (el) => { for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || a.hidden || +c.opacity === 0) return false; } return true; };
  const shown = (col) => !/rgba\([^)]*,\s*0\)$/.test(col) && col !== 'transparent';
  /** 꾸민 상자인가 — 바탕(색 · 그림 · 9-slice)이면 네 변 모두, 테두리만이면 테가 있는 변만 (가로줄 하나는 위아래 · 옆 여유를 따지지 않는다) */
  const sides = (c) => {
    if (shown(c.backgroundColor) || (c.backgroundImage && c.backgroundImage !== 'none') || (c.borderImageSource && c.borderImageSource !== 'none')) return { t: 1, b: 1, l: 1, r: 1 };
    const o = {};
    for (const [k, S] of [['t', 'Top'], ['b', 'Bottom'], ['l', 'Left'], ['r', 'Right']]) if (parseFloat(c[`border${S}Width`]) > 0 && c[`border${S}Style`] !== 'none' && shown(c[`border${S}Color`])) o[k] = 1;
    return o;
  };
  const decorated = (c) => { const o = sides(c); return !!(o.t || o.b || o.l || o.r); };
  /** 다른 층(창 · 막 · 컷)이 위를 덮은 글은 지금 보이지 않는다 — 첫 글자 가운데에서 이 요소보다 위에 남이 있으면 덮인 것 */
  const covered = (el, nodes) => {
    const rg = document.createRange();
    const tn = nodes[0], i = tn.textContent.search(/\S/);
    rg.setStart(tn, i); rg.setEnd(tn, i + 1);
    const q = rg.getClientRects()[0];
    if (!q) return true;
    const x = q.left + q.width / 2, y = q.top + q.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return true;
    for (const h of document.elementsFromPoint(x, y)) {
      if (h === el || el.contains(h) || h.contains(el)) return false;
      const c = getComputedStyle(h);
      if (decorated(c) && +c.opacity > 0.3) return true;
    }
    return false;
  };
  const out = [];
  const VW = innerWidth, VH = innerHeight;
  for (const el of document.querySelectorAll('body *')) {
    const nodes = [...el.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim());
    if (!nodes.length) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) continue;
    if (r.bottom < 0 || r.top > VH || r.right < 0 || r.left > VW) continue;
    if (!vis(el)) continue;
    if (covered(el, nodes)) continue;
    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // 자르는 조상: 절대 위치는 담는 블록까지 건너뛰고, 고정 위치는 거기서 멈춘다
    const clips = [];
    let frame = null;
    let needPos = false;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const c = getComputedStyle(a);
      const skip = needPos && c.position === 'static' && c.transform === 'none';
      if (!skip) {
        if (needPos) needPos = false;
        const ar = a.getBoundingClientRect();
        const s = a.offsetHeight ? ar.height / a.offsetHeight : 1;
        const inner = { t: ar.top + parseFloat(c.borderTopWidth) * s, b: ar.bottom - parseFloat(c.borderBottomWidth) * s, l: ar.left + parseFloat(c.borderLeftWidth) * s, r: ar.right - parseFloat(c.borderRightWidth) * s, el: a };
        if (c.overflowY !== 'visible') clips.push({ ...inner, scroll: c.overflowY === 'auto' || c.overflowY === 'scroll' });
        if (!frame && decorated(c) && ar.height < VH * 0.6) {
          // 9-slice 틀(border-image)은 테 칸에도 면이 그려진다 — 보이는 면 = 바깥 테두리에서 2도트(외곽선 + 빛 줄) 안
          if (c.borderImageSource && c.borderImageSource !== 'none') { const px = (parseFloat(c.getPropertyValue('--px')) || 2) * s; frame = { t: ar.top + 2 * px, b: ar.bottom - 2 * px, l: ar.left + 2 * px, r: ar.right - 2 * px, el: a, sides: { t: 1, b: 1, l: 1, r: 1 } }; }
          else frame = { ...inner, sides: sides(c) };
        }
      }
      if (c.position === 'absolute') needPos = true;
      if (c.position === 'fixed') break;
    }
    let top = Infinity, bot = -Infinity, rt = Infinity, rb = -Infinity, lft = Infinity, rgt = -Infinity, clipT = 0, clipB = 0, n = 0;
    const rg = document.createRange();
    for (const tn of nodes) {
      const s = tn.textContent;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (/\s/.test(ch)) continue;
        // 서로게이트 짝은 한 글자로
        const w = s.codePointAt(i) > 0xffff ? 2 : 1;
        rg.setStart(tn, i); rg.setEnd(tn, i + w);
        const g = ink(font, s.slice(i, i + w));
        const q = rg.getClientRects()[0];
        i += w - 1;
        if (!q || !q.height || !(g.fa + g.fd)) continue;
        const k = q.height / (g.fa + g.fd);
        const it = q.top + (g.fa - g.a) * k, ib = q.top + (g.fa + g.d) * k;
        // 이미 다 가려진 글자(접힌 줄 · 스크롤 밖)는 넘긴다 — 반만 걸친 글자가 문제다
        const hidden = clips.some((c) => q.bottom <= c.t + 0.5 || q.top >= c.b - 0.5);
        if (hidden) continue;
        for (const c of clips) {
          if (c.scroll && (q.top < c.t - 0.5 || q.bottom > c.b + 0.5)) continue; // 스크롤 중간에 걸친 줄
          clipT = Math.max(clipT, c.t - it); clipB = Math.max(clipB, ib - c.b);
        }
        top = Math.min(top, it); bot = Math.max(bot, ib); rt = Math.min(rt, q.top); rb = Math.max(rb, q.bottom); lft = Math.min(lft, q.left); rgt = Math.max(rgt, q.right); n++;
      }
    }
    if (!n) continue;
    const why = [];
    if (clipT > 0.5) why.push(`잘림 위 ${clipT.toFixed(1)}`);
    if (clipB > 0.5) why.push(`잘림 아래 ${clipB.toFixed(1)}`);
    let roomT = null, roomB = null;
    // 꾸민 상자: 잉크가 상자 안에 걸쳐 있을 때만 (상자 위에 매달린 이름표 등은 제 상자가 아니다)
    if (frame && bot > frame.t && top < frame.b) {
      roomT = top - frame.t; roomB = frame.b - bot;
      if (!why.length) {
        const sd = frame.sides;
        if (sd.t && roomT < ROOM - 0.25) why.push(`빠듯 위 ${roomT.toFixed(1)}`);
        if (sd.b && roomB < ROOM - 0.25) why.push(`빠듯 아래 ${roomB.toFixed(1)}`);
        // 옆: 글자 자리(옆 베어링 포함)가 상자 안쪽에서 ROOMX 미만 — 글자가 테에 붙어 보인다
        if (rgt > frame.l && lft < frame.r) {
          if (sd.l && lft - frame.l < ROOMX - 0.25) why.push(`빠듯 왼쪽 ${(lft - frame.l).toFixed(1)}`);
          if (sd.r && frame.r - rgt < ROOMX - 0.25) why.push(`빠듯 오른쪽 ${(frame.r - rgt).toFixed(1)}`);
        }
      }
    }
    if (!why.length) continue;
    const txt = nodes.map((c) => c.textContent.trim()).join(' ').slice(0, 24);
    out.push({ sel: `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]}`, txt, why, font: `${cs.fontFamily.split(',')[0].replace(/["']/g, '')} ${cs.fontSize} ${cs.fontWeight} lh ${cs.lineHeight}`,
      ink: { x: Math.round(r.left), y: Math.round(top), w: Math.round(r.width), h: Math.round(bot - top) }, frame: frame ? { t: Math.round(frame.t), b: Math.round(frame.b) } : null });
  }
  // 판 위 글 (Phaser): 글 텍스처가 잉크를 다 담는지
  const bt = window.sliceApi?.boardTexts?.() ?? [];
  for (const t of bt) {
    let a = 0, d = 0;
    for (const ch of t.text) { if (/\s/.test(ch)) continue; const g = ink(t.font, ch); a = Math.max(a, g.a); d = Math.max(d, g.d); }
    const why = [];
    // Phaser 글 캔버스: 기준선 = padding.top + 획/2 + ascent, 높이 = ascent + descent + 획 + padding — 획은 위아래가 상쇄되어 잉크만 잰다
    if (a > t.ascent + t.padTop + 0.5) why.push(`판 글 잘림 위 ${(a - t.ascent - t.padTop).toFixed(1)}`);
    if (d > t.descent + t.padBottom + 0.5) why.push(`판 글 잘림 아래 ${(d - t.descent - t.padBottom).toFixed(1)}`);
    if (why.length) out.push({ sel: 'phaser.text', txt: t.text.slice(0, 24), why, font: t.font, ink: { x: Math.round(t.x), y: Math.round(t.y), w: 0, h: 0 }, frame: null });
  }
  return out;
}

/** 페이지의 잉크 점검 결과(자세히) */
async function inkAudit(page, opt) {
  return page.evaluate(inkProbe, opt ?? {}).catch(() => []);
}

/** 페이지에서 어긋난 글 요소를 「태그.클래스 「글」 이유」 줄로 돌려준다 (중복 없음) */
async function textAudit(page) {
  const base = await page.evaluate(() => {
    const OK11 = [12, 24, 36], OK14 = [15, 30, 45, 60];
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      if (!el.childNodes.length || ![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // 화면 읽기 프로그램 전용 글(.sr-only · 컷 자막 속 화자 이름 cl-who — 1px 상자로 잘라 눈에 안 보인다)은 글자 점검 대상이 아니다 (D-534)
      if (r.width <= 1 && r.height <= 1) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      let hid = false; for (let a = el; a; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || a.hidden) { hid = true; break; } }
      if (hid) continue;
      const fs = parseFloat(cs.fontSize), fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(), w = +cs.fontWeight;
      const txt = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join(' ').slice(0, 24);
      const why = [];
      if (fam === 'Galmuri11' && !OK11.includes(fs)) why.push(`G11 ${fs}px`);
      else if (fam === 'Galmuri14' && !OK14.includes(fs)) why.push(`G14 ${fs}px`);
      // 카드 글 맞춤 마지막 단계(D-373 · D-377)와 카드 조건 · 효과 줄(D-511)만 10px 갈무리9 보통 허용
      else if (fam === 'Galmuri9' && fs === 10 && w < 600 && el.closest('.cf .ln.s10, .cf .ln-if, .cf .ln-fx')) { /* 허용 */ }
      else if (fam !== 'Galmuri11' && fam !== 'Galmuri14') why.push(`서체 ${fam} ${fs}px`);
      if (fam === 'Galmuri14' && w >= 600) why.push('G14 굵게');
      if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) why.push('말줄임');
      if (cs.overflow !== 'visible' && (el.scrollWidth > el.clientWidth + 2) && cs.whiteSpace === 'nowrap') why.push('넘침');
      if (why.length) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} 「${txt}」 ${why.join(' · ')}`);
    }
    return out;
  }).catch(() => []);
  const ink = (await inkAudit(page)).map((f) => `${f.sel} 「${f.txt}」 ${f.why.join(' · ')} (${f.font})`);
  return [...new Set([...base, ...ink])];
}

module.exports = textAudit;
module.exports.inkAudit = inkAudit;
module.exports.inkProbe = inkProbe;
