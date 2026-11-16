// CSS 특이성 정리 검사 (D-529 비주얼 일괄 정리): 본편 CSS의 `!important`와 `.cf.cf.cf` 류 특이성 올리기를 하나씩 떼어 보고,
// 실제 화면들의 계산된 스타일이 그대로인 것만 「뗄 수 있음」으로 낸다. 눈대중이 아니라 브라우저 캐스케이드가 판정한다.
//
// 사용: node tools/qa/css-cascade.cjs [--apply]   (OBSERVE_URL을 주면 그 vite 개발 서버, 없으면 빈 포트에 `vite` 를 띄운다)
//   1) 화면 여럿(전투 손패 · 보상 · 부품 · 영입 · 고물상 · 작업대 · 덱 · 분대 · 지도 · 사건 · 기물 정보 …)을 차례로 띄우고
//   2) 화면마다 후보 하나씩: 개발 서버가 넣은 <style>의 글에서 그 한 곳만 바꿔 넣고(값 그대로 · !important만 뺌 / `.cf.cf.cf` → 더 짧은 사슬),
//      그 규칙이 닿는 속성(긴 이름으로 펼침)을 문서의 모든 요소(+ ::before · ::after)에서 바꾸기 전 · 후 비교. 움직이는 값(애니메이션)은 두 번 재서 뺀다.
//   3) 한 화면이라도 달라지면 「필요」, 어느 화면에서도 닿은 요소가 없으면 「확인 못 함」(남김), 닿았고 모두 같으면 「뗄 수 있음」.
//   4) 뗄 수 있는 것을 한꺼번에 바꾼 뒤 모든 화면을 다시 재서 0 차이인지 확인(아니면 반씩 되돌려 찾는다).
//   --apply = 확인된 바꿈을 src의 CSS 파일에 그대로 적는다(같은 순번의 같은 글자 자리).
// 결과: stdout 표 + production/qa/evidence/css-cascade-<날짜>.json
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const APPLY = process.argv.includes('--apply');
const FILES = ['src/style.css', 'src/slice/slice.css', 'src/slice/card-layout.css', 'src/slice/card-cmd.css', 'src/slice/kit.css', 'src/slice/voice.css', 'src/slice/film.css', 'src/slice/hud-rarity.css'];
const W = (ms) => new Promise((r) => setTimeout(r, ms));
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true, terms: [], termsNew: [] };

/** 화면 = [이름, 띄우기(page 안에서 도는 함수 글), 기다림 ms] */
const SCENES = [
  ['battle', () => window.sliceApi.startAt(1, 'battle'), 2200],
  ['hand-pick', () => { window.sliceApi.startAt(1, 'battle'); setTimeout(() => document.querySelector('#hand [data-card]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })), 1500); }, 2400],
  ['giant', () => { window.sliceApi.battleWith(2, 'check', { giants: ['R'], forms: undefined, process: undefined }); setTimeout(() => { const q = window.slice().s.pieces.find((x) => x.giant); window.sliceApi.peekAt({ x: q.x, y: q.y }); }, 1800); }, 2600],
  ['variant', () => { window.sliceApi.battleWith(2, 'check', { enemy: ['K', 'R', 'N', 'Q', 'B', 'R', 'P'], forms: ['cannon', 'camel', 'hopper', 'archbishop', 'chancellor'], giants: undefined, process: undefined }); setTimeout(() => { const q = window.slice().s.pieces.find((x) => x.side === 1 && x.form); window.sliceApi.peekAt({ x: q.x, y: q.y }); }, 1800); }, 2600],
  ['peek', () => { window.sliceApi.startAt(1, 'battle'); setTimeout(() => { const q = window.slice().s.pieces.find((x) => x.side === 1); window.sliceApi.peekAt({ x: q.x, y: q.y }); }, 1500); }, 2300],
  ['peek-ally', () => { window.sliceApi.startAt(1, 'battle'); setTimeout(() => { const q = window.slice().s.pieces.find((x) => x.side === 0); window.sliceApi.peekAt({ x: q.x, y: q.y }); }, 1500); }, 2300],
  ['boss', () => window.sliceApi.startAt(1, 'boss'), 2600],
  ['reward', () => { window.sliceApi.seed(7); window.sliceApi.reward(); }, 2400],
  ['parts', () => window.sliceApi.partPick(), 2000],
  ['recruit', () => window.sliceApi.recruit(), 2000],
  ['kit', () => window.sliceApi.kit(), 2000],
  ['full', () => window.sliceApi.full(), 1800],
  ['shop', () => { window.sliceApi.gold(400); window.sliceApi.shop(); }, 2200],
  ['forge', () => window.sliceApi.forge(), 2200],
  ['refine', () => window.sliceApi.refine(), 1800],
  ['deck-remove', () => window.sliceApi.deckView('remove'), 1800],
  ['deck', () => window.sliceApi.deckView('view'), 1800],
  ['crew', () => { const a = window.sliceApi; a.richRun(); a.crew(); }, 1800],
  ['map', () => { const a = window.sliceApi; a.richRun(); a.setAct(0); a.map(2); }, 1600],
  ['event', () => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }, 4800],
  ['ledger', () => window.sliceApi.ledger(), 1500],
  ['dict', () => window.sliceApi.help('dict'), 1500],
  ['guide', () => window.sliceApi.guideMenu(), 1500],
  ['promote', () => window.sliceApi.promote(3), 2000],
];

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });

/** 글에서 후보 자리 찾기: !important 와 `.cf` 두 번 이상 사슬 (주석 안은 뺀다) */
function candidates(text) {
  const out = [];
  const masked = text.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  // 자리마다 감싼 @media 조건 (중괄호 깊이로) — 움직임 줄이기 · 맞지 않는 조건 안의 것은 이 화면에서 판정할 수 없다
  const mediaAt = (at) => { const st = []; let i = 0; for (const m of masked.slice(0, at).matchAll(/@media([^{]*)\{|\{|\}/g)) { if (m[0] === '}') st.pop(); else st.push(m[1] ? m[1].trim() : null); i++; } return st.filter(Boolean).join(' and '); };
  for (const m of masked.matchAll(/\s*!important/g)) out.push({ kind: 'imp', at: m.index, len: m[0].length, rep: '', media: mediaAt(m.index) });
  for (const m of masked.matchAll(/(?:\.cf){2,}/g)) {
    const n = m[0].length / 3;
    out.push({ kind: 'chain', at: m.index, len: m[0].length, n, rep: '.cf', media: mediaAt(m.index) });
  }
  return out;
}


/** 페이지에 심는 도우미: 후보가 든 규칙의 선택자 · 긴 속성 이름 / 선택자가 닿는 [요소, 가상 요소] */
const PAGE_HELPERS = () => {
  window.__ruleOf = (c, t) => {
    let body, sel;
    if (c.kind === 'imp') { const open = t.lastIndexOf('{', c.devAt); body = t.slice(open + 1, t.indexOf('}', c.devAt)); sel = t.slice(t.lastIndexOf('}', open) + 1, open); }
    else { const o2 = t.indexOf('{', c.devAt); body = t.slice(o2 + 1, t.indexOf('}', o2)); sel = t.slice(t.lastIndexOf('}', c.devAt) + 1, o2); }
    sel = sel.replace(/@media[^{]*\{/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    const probe = document.createElement('div');
    probe.style.cssText = body.replace(/!important/g, '');
    return { sel, props: [...probe.style] };
  };
  window.__parts = (sel) => sel.split(/,(?![^(]*\))/).map((part) => {
    const pe = /::?(before|after)\s*$/.exec(part.trim());
    return { base: part.trim().replace(/::?(before|after)\s*$/, '').replace(/:(hover|active|focus|focus-visible)\b/g, '') || '*', pe: pe ? `::${pe[1]}` : null };
  });
  window.__targets = (sel) => {
    const out = [];
    for (const { base, pe } of window.__parts(sel)) { let els = []; try { els = [...document.querySelectorAll(base)]; } catch { continue; } for (const el of els) out.push([el, pe]); }
    return out;
  };
  window.__freeze = () => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.pause(); } });
  window.__all = () => { const out = []; for (const el of document.querySelectorAll('body *')) for (const pe of [null, '::before', '::after']) { const cs = getComputedStyle(el, pe); if (pe && cs.content === 'none') continue; out.push([el, pe]); } return out; };
  window.__snap = (list, props) => list.map(([el, pe]) => { const cs = getComputedStyle(el, pe); return props.map((p) => cs.getPropertyValue(p)); });
  window.__setCss = (pairs) => { for (const [f, t] of pairs) { const s = [...document.querySelectorAll('style[data-vite-dev-id]')].find((x) => x.dataset.viteDevId.endsWith('/' + f)); if (s) s.textContent = t; } window.__freeze(); };
};

async function main() {
  let url = process.env.OBSERVE_URL;
  let server = null;
  if (!url) {
    const port = await freePort();
    server = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
    url = `http://localhost:${port}/`;
    for (let i = 0; i < 60; i++) { try { const r = await fetch(url); if (r.ok) break; } catch {} await W(500); }
  }
  const src = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  // 저장(meta)은 페이지 스크립트보다 먼저 — 화면마다 새 탭(무거운 판 페이지를 다시 navigate하면 탭이 죽는 일이 있어서)
  await ctx.addInitScript((m) => { try { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); } catch {} }, JSON.stringify(META));
  let pg = null;
  const go = async () => {
    if (pg) await pg.close().catch(() => {});
    pg = await ctx.newPage();
    await pg.goto(`${url}?debug`);
    await pg.waitForFunction(() => !!window.sliceApi && !document.getElementById('boot'), null, { timeout: 120000 });
    await pg.evaluate(`(${PAGE_HELPERS.toString()})()`);
    await W(600);
  };
  // 개발 서버 <style> 글 ↔ 소스 글: 후보 순번이 같아야 한다 (url() 다시 쓰기만 다르다)
  await go();
  const devText = await pg.evaluate((files) => Object.fromEntries(files.map((f) => [f, [...document.querySelectorAll('style[data-vite-dev-id]')].find((s) => s.dataset.viteDevId.endsWith('/' + f))?.textContent ?? null])), FILES);
  const cands = [];
  for (const f of FILES) {
    if (devText[f] == null) { console.log(`! ${f}: 개발 서버 style 없음 — 건너뜀`); continue; }
    const a = candidates(src[f]), b = candidates(devText[f]);
    if (a.length !== b.length || a.some((c, i) => c.kind !== b[i].kind)) { console.log(`! ${f}: 후보 순번이 어긋남 (${a.length} vs ${b.length}) — 건너뜀`); continue; }
    a.forEach((c, i) => {
      const line = src[f].slice(0, c.at).split('\n').length;
      cands.push({ id: `${f}#${i}`, file: f, i, kind: c.kind, n: c.n, media: c.media, line, srcAt: c.at, srcLen: c.len, devAt: b[i].at, devLen: b[i].len, snippet: src[f].split('\n')[line - 1].trim().slice(0, 120) });
    });
  }
  console.log(`후보 ${cands.length} (imp ${cands.filter((c) => c.kind === 'imp').length} · chain ${cands.filter((c) => c.kind === 'chain').length})`);

  /** 개발 글에 바꿈(여럿)을 적용 — 뒤에서부터 */
  const patched = (f, edits) => { let t = devText[f]; for (const e of [...edits].sort((x, y) => y.devAt - x.devAt)) t = t.slice(0, e.devAt) + e.rep + t.slice(e.devAt + e.devLen); return t; };

  // 페이지 안: 규칙 블록(후보 자리를 담은 { … })의 선언에서 긴 속성 이름을 뽑고, 그 속성들을 모든 요소에서 잰다
  const CACHE = path.join(require('os').tmpdir(), 'css-cascade-verdict.json'); // 1단계 판정 저장 (--resume)
  const resume = process.argv.includes('--resume') && fs.existsSync(CACHE);
  const verdict = new Map(resume ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : cands.map((c) => [c.id, { touched: 0, diff: 0, scenes: [] }]));
  for (const [name, fn, wait] of resume ? [] : SCENES) {
    await go();
    try { await pg.evaluate(`(${fn.toString()})()`); } catch (e) { console.log(`  ${name}: 띄우기 실패 ${e.message.split('\n')[0]}`); continue; }
    await W(wait);
    // 움직이는 것 멈추기 — 계산값 비교를 흔들지 않게
    await pg.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.pause(); } }));
    await W(200);
    let n = 0;
    for (const c of cands) {
      const res = await pg.evaluate(({ c, orig, mod }) => {
        const { sel, props } = window.__ruleOf(c, orig);
        // 판정할 수 없는 자리: 맞지 않는 @media(움직임 줄이기 포함) · 누름/올림 상태 선택자 → 닿은 요소 없음으로 (남긴다)
        if (!props.length || /prefers-reduced-motion/.test(c.media) || (c.media && !matchMedia(c.media).matches) || /:(hover|active|focus)/.test(sel)) return { touched: 0, diff: 0, props: [] };
        const targets = window.__targets(sel);
        if (!targets.length) return { touched: 0, diff: 0, props };
        const read = () => targets.map(([el, pe]) => { const cs = getComputedStyle(el, pe); return props.map((p) => cs.getPropertyValue(p)).join('|'); });
        const s = [...document.querySelectorAll('style[data-vite-dev-id]')].find((x) => x.dataset.viteDevId.endsWith('/' + c.file));
        const a1 = read(); const a2 = read();
        s.textContent = mod; document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.pause(); } });
        const b = read();
        s.textContent = orig; document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.pause(); } });
        let diff = 0, sample = null;
        a1.forEach((v, i) => { if (v === a2[i] && v !== b[i]) { diff++; if (!sample) sample = { el: (targets[i][0].className?.baseVal ?? targets[i][0].className) + (targets[i][1] ?? ''), before: v.slice(0, 160), after: b[i].slice(0, 160) }; } });
        return { touched: targets.length, diff, props, sample };
      }, { c, orig: devText[c.file], mod: patched(c.file, [{ devAt: c.devAt, devLen: c.devLen, rep: c.kind === 'imp' ? '' : '.cf' }]) });
      const v = verdict.get(c.id);
      v.touched += res.touched; v.diff += res.diff;
      if (res.diff) v.scenes.push({ scene: name, sample: res.sample });
      if (res.touched) n++;
    }
    console.log(`  ${name}: 닿은 후보 ${n}`);
  }

  if (!resume) fs.writeFileSync(CACHE, JSON.stringify([...verdict]));
  const removable = cands.filter((c) => { const v = verdict.get(c.id); return v.touched > 0 && v.diff === 0; });
  const edits = removable.map((c) => ({ ...c, rep: c.kind === 'imp' ? '' : '.cf' }));
  // 한꺼번에 적용 → 화면마다 모든 요소(+ ::before · ::after)의 모든 계산값을 전 · 후 비교. 달라진 (요소, 속성)이 있으면
  // 그 요소에 닿고 그 속성을 가진 후보를 범인으로 되돌리고 다시 (두 바꿈이 서로 맞물려 혼자일 땐 괜찮던 것까지 잡는다)
  const checkScene = async ([name, fn, wait], set) => {
    await go();
    try { await pg.evaluate(`(${fn.toString()})()`); } catch { return null; }
    await W(wait);
    await pg.evaluate(() => window.__freeze());
    await W(200);
    const byFile = {};
    for (const e of set) (byFile[e.file] ??= []).push(e);
    return pg.evaluate(({ mods, origs, set }) => {
      const list = window.__all();
      const cs0 = getComputedStyle(document.body); const props = [...cs0].filter((p) => !p.startsWith('transition') && !p.startsWith('animation-play'));
      const a1 = window.__snap(list, props), a2 = window.__snap(list, props);
      window.__setCss(mods); const b = window.__snap(list, props); window.__setCss(origs);
      const diffs = [];
      a1.forEach((row, i) => { const ps = props.filter((p, k) => row[k] === a2[i][k] && row[k] !== b[i][k]); if (ps.length) diffs.push([i, ps, ps.map((p) => `${p}: ${row[props.indexOf(p)]} → ${b[i][props.indexOf(p)]}`.slice(0, 140))]); });
      if (!diffs.length) return { d: 0, culprits: [] };
      // 의심 = 달라진 요소에 닿고 달라진 속성을 가진 후보. 의심을 모두 빼서 차이가 사라지면, 하나씩 되돌려 넣어 봐도 차이가 없는 것은 무죄(최소 범인만 남긴다)
      const patch = (f, es) => { let t = origs.find(([g]) => g === f)[1]; for (const e of [...es].sort((x, y) => y.devAt - x.devAt)) t = t.slice(0, e.devAt) + e.rep + t.slice(e.devAt + e.devLen); return t; };
      const files = [...new Set(set.map((e) => e.file))];
      const dl = diffs.map(([i]) => list[i]);
      const base = diffs.map(([i]) => a1[i]);
      const differs = (ids) => {
        const es = set.filter((e) => !ids.has(e.id));
        window.__setCss(files.map((f) => [f, patch(f, es.filter((e) => e.file === f))]));
        const r = window.__snap(dl, props);
        window.__setCss(origs);
        return r.some((row, j) => diffs[j][1].some((p) => { const k = props.indexOf(p); return row[k] !== base[j][k]; }));
      };
      const suspects = [];
      for (const c of set) {
        const { sel, props: cp } = window.__ruleOf(c, origs.find(([f]) => f === c.file)[1]);
        const parts = window.__parts(sel);
        const hit = diffs.some(([i, ps]) => { const [el, pe] = list[i]; return ps.some((p) => cp.includes(p)) && parts.some((q) => q.pe === pe && (() => { try { return el.matches(q.base); } catch { return false; } })()); });
        if (hit) suspects.push(c.id);
      }
      let out = new Set(suspects);
      // 사용자 정의 속성(--wpat 같은 var())은 계산값 이름이 달라 속성으로 못 잡는다 → 그 요소에 닿는 후보 전부, 그래도 안 되면 바꿈 전부를 의심
      if (differs(out)) {
        const near = set.filter((c) => { const { sel } = window.__ruleOf(c, origs.find(([f]) => f === c.file)[1]); return diffs.some(([i]) => { const [el, pe] = list[i]; return window.__parts(sel).some((q) => q.pe === pe && (() => { try { return el.matches(q.base) || !!el.closest(q.base); } catch { return false; } })()); }); }).map((c) => c.id);
        out = new Set(near);
        if (differs(out)) out = new Set(set.map((c) => c.id));
        suspects.splice(0, suspects.length, ...out);
      }
      for (const id of suspects) { out.delete(id); if (differs(out)) out.add(id); }
      const culprits = [...out];
      const ex = diffs.slice(0, 3).map(([i, , txt]) => { const [el, pe] = list[i]; return `${el.tagName.toLowerCase()}.${String(el.className?.baseVal ?? el.className).split(' ').join('.')}${pe ?? ''} ${txt[0]}`; });
      return { d: diffs.length, culprits, ex };
    }, { mods: Object.entries(byFile).map(([f, es]) => [f, patched(f, es)]), origs: Object.keys(byFile).map((f) => [f, devText[f]]), set });
  };
  let final = edits;
  const culprits = [];
  let bad = [];
  for (let round = 0; round < 6; round++) {
    bad = [];
    for (const sc of SCENES) {
      const r = await checkScene(sc, final);
      if (r && r.d) { bad.push([sc[0], r.d]); for (const id of r.culprits) if (!culprits.includes(id)) culprits.push(id); console.log(`  ${sc[0]}: 차이 ${r.d} · 범인 ${r.culprits.join(' ') || '못 찾음'} · ${(r.ex ?? []).join(' / ')}`); }
    }
    console.log(`확인 ${round + 1}: ${final.length}곳 → 차이 화면 ${bad.length ? bad.map((x) => x.join(':')).join(' ') : '없음'}`);
    if (!bad.length) break;
    const before = final.length;
    final = final.filter((e) => !culprits.includes(e.id));
    if (final.length === before) break;
  }
  await br.close();
  if (server) server.kill();

  const day = new Date().toISOString().slice(0, 10);
  const rep = cands.map((c) => { const v = verdict.get(c.id); return { id: c.id, kind: c.kind, line: c.line, snippet: c.snippet, touched: v.touched, diff: v.diff, scenes: v.scenes.slice(0, 3), result: final.some((e) => e.id === c.id) ? 'removed' : culprits.includes(c.id) ? 'needed(겹침)' : v.touched === 0 ? 'unverified' : 'needed' }; });
  fs.writeFileSync(path.join(ROOT, `production/qa/evidence/css-cascade-${day}.json`), JSON.stringify({ ok: !bad.length, rep }, null, 1));
  for (const r of rep) console.log(`${r.result.padEnd(10)} ${r.kind.padEnd(5)} ${r.id.padEnd(30)} L${r.line} ${r.snippet}`);
  if (APPLY && !bad.length) {
    for (const f of FILES) {
      const es = final.filter((e) => e.file === f).sort((a, b) => b.srcAt - a.srcAt);
      if (!es.length) continue;
      let t = src[f];
      for (const e of es) t = t.slice(0, e.srcAt) + e.rep + t.slice(e.srcAt + e.srcLen);
      fs.writeFileSync(path.join(ROOT, f), t);
      console.log(`적용 ${f}: ${es.length}곳`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
