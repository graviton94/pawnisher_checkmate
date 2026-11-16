// 글자 점검 한 벌 (D-263) — tools/artguide/ui-audit.cjs · tools/qa/sweep.cjs가 같이 쓴다.
// 지금 보이는 글 요소마다 갈무리 격자 크기(11: 12·24·36 / 14: 15·30·45·60) · 서체 · 갈무리14 굵게 · 넘침 · 말줄임을 본다.
/** 페이지에서 어긋난 글 요소를 「태그.클래스 「글」 이유」 줄로 돌려준다 (중복 없음) */
module.exports = async function textAudit(page) {
  return page.evaluate(() => {
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
    return [...new Set(out)];
  }).catch(() => []);
};
