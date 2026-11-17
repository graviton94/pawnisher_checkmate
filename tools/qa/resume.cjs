// 출시 완주 점검 (2026-11-16): 앱을 닫고(pagehide → 새로고침) 메뉴 「이어하기」로 돌아왔을 때 잃거나 겹치는 것이 없는지 —
// 지도 · 대국 중간 · 보상 · 사건 · 고물상 · 반장 등장 · 결말 컷(END-K) · 하자 폐기 창 · 패배 컷(END-F).
// 멈춤 메뉴 「처음으로」(D-539 — 대국 · 지도에서 저장하고 메인 메뉴)도 같은 표로 본다.
// 사용: 프리뷰 서버를 띄운 뒤 node tools/qa/resume.cjs <출력 폴더>
const fs = require('fs');
const { chromium, URL, W, MENU, setOut, open, seedMeta, toMenu, click, clickText, startFromMenu, pauseToTitle, drive } = require('./drive.cjs');
const OUT = (process.argv[2] ?? 'production/qa/resume') + '/';
fs.mkdirSync(OUT, { recursive: true });
setOut(OUT);
const rows = [];
const say = (s) => { rows.push(s); console.log(s); };

/** 지금 출하의 핵심 값 (저장 · 화면 둘 다에서) */
const key = (p) => p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pawnisher.slice.save') || 'null');
  const m = JSON.parse(localStorage.getItem('pawnisher.slice.meta') || 'null');
  return { save: s && { at: s.at, act: s.actI, row: s.rowI, node: s.node, gold: s.gold, won: s.won, deck: s.deck.length, parts: s.parts.join(','), squad: s.squad.map((u) => `${u.t}${u.hp ?? ''}${u.cracked ? '!' : ''}`).join(','), charms: JSON.stringify(s.charms), picked: JSON.stringify(s.picked), fightTurn: s.fight?.b?.turn ?? null }, runs: m?.runs, clears: m?.clears, story: m?.storyCleared };
});
const screen = (p) => p.evaluate(() => {
  const vis = (s) => [...document.querySelectorAll(s)].some((e) => e.getClientRects().length);
  const ov = document.getElementById('overlay');
  const panel = document.getElementById('overlay-panel');
  if (vis('.promotion')) return 'promotion';
  if (vis('.bossfx')) return 'boss-intro';
  if (vis('.prologue')) return `cut:${document.querySelector('.prologue .pl-stage img')?.getAttribute('src')?.replace(/.*scenes\/|\.png/g, '') ?? ''}`;
  if (vis('.ws-choices, .ev-stage')) return 'event';
  if (ov && !ov.hidden) return `overlay:${(panel?.querySelector('h2, .plate-title, .win-title')?.textContent ?? panel?.textContent ?? '').trim().slice(0, 12)}`;
  if (vis('.mapfx')) return 'map';
  if (document.querySelector('#hand [data-card]') && !document.body.classList.contains('between')) return `battle:t${window.slice().turn}`;
  return 'other';
});
/** 화면에 걸린 선택지 (보상 카드 · 사건 · 고물상 진열) — 같아야 한다 */
const offers = (p) => p.evaluate(() => [...document.querySelectorAll('#overlay-panel [data-slot], #overlay-panel [data-buy], .ws-choices .choice, .ws-title, .ev-title')].filter((e) => e.getClientRects().length).map((e) => (e.getAttribute('data-slot') ?? '') + (e.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 14)).join(' | '));

/** 닫고(pagehide → 새로고침) 메뉴 「이어하기」. viaPause = 앱을 닫는 대신 멈춤 메뉴 「처음으로」(D-539) */
const quitAndResume = async (p, label, viaPause = false) => {
  const k0 = await key(p), s0 = await screen(p), o0 = await offers(p);
  await p.screenshot({ path: `${OUT}${label}-before.png` });
  let k1;
  if (viaPause) {
    k1 = await key(p);
    const ok = await pauseToTitle(p);
    if (!ok) say(`    ${label}: 멈춤 메뉴 「처음으로」를 못 눌렀다!`);
    await p.waitForFunction(() => window.sliceApi).catch(() => {});
    k1 = (await key(p)).save ? await key(p) : k1;
  } else {
    await p.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })); });
    k1 = await key(p);
    await p.goto(URL + '&opening'); await p.waitForFunction(() => window.sliceApi);
  }
  await p.waitForSelector('#boot', { state: 'detached', timeout: 20000 }).catch(() => {});
  for (let i = 0; i < 12 && !(await p.$(MENU)); i++) { await p.mouse.click(457, 300); await W(700); }
  const hasCont = await click(p, '[data-cont]');
  await W(3500);
  const s2 = await screen(p), k2 = await key(p), o2 = await offers(p);
  await p.screenshot({ path: `${OUT}${label}-after.png` });
  return { label, s0, s2, k0, k1, k2, o0, o2, hasCont };
};
const verdict = (r, expect) => {
  const ok = expect(r);
  say(`| ${r.label} | ${r.s0} | ${r.hasCont ? '있음' : '없음'} | ${r.s2} | ${ok ? '✓' : '✗'} |`);
  say(`    저장(닫기 직전) ${JSON.stringify(r.k1.save)}\n    저장(이어한 뒤) ${JSON.stringify(r.k2.save)} · runs ${r.k1.runs}→${r.k2.runs}`);
  if (r.o0 || r.o2) say(`    선택지 전 ${r.o0}\n    선택지 후 ${r.o2}`);
  return ok;
};
const same = (a, b, ks) => ks.every((k) => JSON.stringify(a?.[k]) === JSON.stringify(b?.[k]));
const CORE = ['act', 'row', 'gold', 'won', 'deck', 'parts', 'squad', 'charms', 'picked'];

const winBattle = (p) => p.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((x) => x.side === 0); b.s.winner = 0; window.sliceApi.finish(); });
const loseBattle = (p) => p.evaluate(() => { const b = window.slice(); b.s.pieces = b.s.pieces.filter((x) => x.side === 1); b.s.winner = 1; window.sliceApi.finish(); });
const until = async (p, f, n = 30) => { for (let i = 0; i < n; i++) { if (await f()) return true; await W(500); } return false; };

(async () => {
  const br = await chromium.launch();
  const p = await open(br);
  say('| 닫은 자리 | 닫기 전 화면 | 이어하기 | 이어한 화면 | 판정 |\n|---|---|---|---|---|');
  await seedMeta(p, {});
  await toMenu(p); await startFromMenu(p, 'story');
  // 1) 대국 중간: 카드 한 장 내고 턴을 넘긴 뒤 (대국 중 저장 D-529). 봇 한 수로 대국이 끝나 버리면(쉬운 첫 대국) 다음 대국에서 다시
  const midBattle = () => p.evaluate(() => !!document.querySelector('#hand [data-card]') && !document.body.classList.contains('between') && document.getElementById('overlay').hidden && window.slice().s.winner === null);
  for (let k = 0; k < 4; k++) {
    await drive(p, { tag: 'r-battle', stop: (st) => st.battle });
    await W(1500);
    await Promise.race([p.evaluate(() => window.sliceApi.botMove('greedy')), W(8000)]);
    await W(800);
    if (!(await midBattle())) continue;
    const t0 = await p.evaluate(() => window.slice().turn);
    await click(p, '#btn-end'); await W(500); await click(p, '#btn-end.warn');
    await until(p, () => p.evaluate((t0) => window.slice().turn > t0 && !document.body.classList.contains('busy'), t0));
    await W(2500);
    if (await midBattle()) break;
  }
  let r = await quitAndResume(p, 'battle-mid');
  verdict(r, (r) => r.hasCont && /^battle/.test(r.s2) && r.s0 === r.s2 && r.k1.save.fightTurn !== null && same(r.k1.save, r.k2.save, [...CORE, 'fightTurn']));
  // 2) 보상 화면 (이긴 뒤 고르기 전, D-488)
  await drive(p, { tag: 'r-battle2', stop: (st) => st.battle });
  await winBattle(p);
  await until(p, async () => /^overlay/.test(await screen(p)));
  await W(1200);
  r = await quitAndResume(p, 'reward');
  verdict(r, (r) => r.hasCont && r.s0 === r.s2 && r.o0 === r.o2 && same(r.k1.save, r.k2.save, CORE));
  // 3) 지도
  await drive(p, { tag: 'r-map', stop: (st) => st.map });
  await W(1200);
  r = await quitAndResume(p, 'map');
  verdict(r, (r) => r.hasCont && r.s2 === 'map' && same(r.k1.save, r.k2.save, CORE));
  // 3b) 멈춤 메뉴 「처음으로」 — 지도 · 대국 중간 (D-539)
  r = await quitAndResume(p, 'pause-home-map', true);
  verdict(r, (r) => r.hasCont && r.s2 === 'map' && same(r.k1.save, r.k2.save, CORE));
  await drive(p, { tag: 'r-battle3', stop: (st) => st.battle });
  await W(1500);
  await Promise.race([p.evaluate(() => window.sliceApi.botMove('greedy')), W(8000)]);
  await W(1500);
  r = await quitAndResume(p, 'pause-home-battle', true);
  verdict(r, (r) => r.hasCont && /^battle/.test(r.s2) && r.k2.save.fightTurn !== null && same(r.k1.save, r.k2.save, CORE));
  // 4) 사건 · 5) 고물상 · 6) 반장 등장 — 지도를 나아가며 처음 만나는 곳에서 닫는다 (사건 · 고물상 안에서는 저장하지 않는다 → 들어가기 전 지도, 다시 들어가면 같은 것)
  const seen = {};
  for (let k = 0; k < 3; k++) {
    const d = await drive(p, { tag: 'r-place', stop: (st) => (!seen.event && st.ev) || (!seen.shop && st.shop) || (!seen.boss && !!st.boss) });
    if (!d.stopped) break;
    await W(1500);
    const kind = d.st.boss ? 'boss' : d.st.shop ? 'shop' : 'event';
    seen[kind] = true;
    r = await quitAndResume(p, kind === 'boss' ? 'boss-intro' : kind);
    if (kind === 'boss') { verdict(r, (r) => r.hasCont && /boss-intro|battle/.test(r.s2) && same(r.k1.save, r.k2.save, CORE)); continue; }
    const ok = verdict(r, (r) => r.hasCont && r.s2 === 'map' && same(r.k1.save, r.k2.save, CORE));
    if (ok) {
      await drive(p, { tag: 'r-again', stop: (st) => (kind === 'shop' ? st.shop : st.ev) });
      await W(1500);
      const again = await offers(p);
      say(`    다시 들어간 ${kind === 'shop' ? '고물상' : '사건'}: ${again === r.o0 ? '같음' : `다름! ${again}`}`);
    }
  }
  say(`    (만난 장소: ${JSON.stringify(seen)})`);
  // 7) 왕위 결정 · 8) 결말 컷 (END-K)
  await drive(p, { tag: 'r-promo', stop: (st) => st.promo });
  await W(2000);
  r = await quitAndResume(p, 'promotion');
  verdict(r, (r) => r.hasCont && (r.s2 === 'promotion' || /^cut/.test(r.s2)) && r.k2.runs === r.k1.runs && same(r.k1.save, r.k2.save, CORE));
  await drive(p, { tag: 'r-promo2', stop: (st) => st.promo });
  await W(1500);
  await click(p, '.promotion [data-promote]');
  await until(p, async () => /^cut/.test(await screen(p)));
  await W(1500); await p.mouse.click(457, 200); await W(800);
  r = await quitAndResume(p, 'ending-cut');
  verdict(r, (r) => r.hasCont && (r.s2 === 'promotion' || /^cut/.test(r.s2)) && r.k2.runs === r.k1.runs && r.k2.story === r.k1.story);
  const end = await drive(p, { tag: 'r-end' });
  const kEnd = await key(p);
  say(`    결말 끝: ${end.end ? '메인 화면 단추' : '멈춤!'} · 저장 ${kEnd.save ? '남음!' : '지움'} · runs ${r.k1.runs}→${kEnd.runs} (한 번) · 본편 ${r.k1.story}→${kEnd.story}`);
  await p.screenshot({ path: `${OUT}ending-done.png` });
  // 9) 크레딧 도중 (기록은 이미 남았다)
  // 10) 하자 폐기 창 — 여벌 심장이 있을 때(첫째 왕관 첫 출하, D-542) · 없을 때(도전 10) · 11) 패배 컷 (END-F)
  for (const [where, m, kind] of [['loss-window-spare', { storyCleared: 0, runs: 0 }, 'story'], ['loss-window', { storyCleared: 4, challengeOpen: 13, trueEnd: true, runs: 5 }, 'challenge'], ['defeat-cut', { storyCleared: 4, challengeOpen: 13, trueEnd: true, runs: 5 }, 'challenge']]) {
    await seedMeta(p, m);
    await toMenu(p); await startFromMenu(p, kind);
    await drive(p, { tag: `r-${where}`, stop: (st) => st.battle });
    await W(1500);
    const rev0 = await p.evaluate(() => window.sliceApi.revive === undefined ? null : JSON.parse(localStorage.getItem('pawnisher.slice.save'))?.charms?.revive);
    await loseBattle(p);
    await until(p, async () => { await clickText(p, /눈을 감는다/); return !!(await p.$('[data-quit]')); });
    await W(800);
    if (where === 'defeat-cut') { await click(p, '[data-quit]'); await until(p, async () => /^cut/.test(await screen(p))); await W(1200); }
    r = await quitAndResume(p, where);
    if (where === 'loss-window-spare') verdict(r, (r) => r.hasCont && /^battle:t1/.test(r.s2) && JSON.parse(r.k2.save.charms).revive === rev0 - 1 && r.k2.save.fightTurn === null);
    else verdict(r, (r) => !r.hasCont && r.k2.save === null && r.k2.runs === 6);
  }
  say(p.errs.length ? `오류: ${p.errs.join(' / ')}` : '오류 없음');
  fs.writeFileSync(OUT + 'report.txt', rows.join('\n'));
  await br.close();
})();
