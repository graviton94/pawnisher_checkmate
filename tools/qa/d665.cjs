// D-665 ~ D-669 확인 (2026-11-19): 카드 설명지 압정 · 사건 결과 분대원 카드 잘림 · 펼친 카드 창 자리 · 덱 줄 단추 · 판 선명도 설정.
// 미리 `npm run build` · `npx vite preview --port <포트>`. 사용:
//   node tools/qa/d665.cjs <pin|evres|cardwin|piles|settings|walk|all> [--url http://localhost:4173/] [--out <폴더>] [--tag after] [--w 915 --h 412 --dpr 2.625]
// 결과: <폴더>/<tag>-<w>-<장면>.png + 콘솔 실측(JSON 한 줄씩)
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4173/');
const OUT = opt('--out', 'production/qa/evidence/2026-11-19-d665');
const TAG = opt('--tag', 'after');
const W = Number(opt('--w', 915)), H = Number(opt('--h', 412)), DPR = Number(opt('--dpr', 2.625));
const which = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) || 'all';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const ctx = await br.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
  // 입문을 마친 사람 (부관 입문 말풍선이 결과 화면을 덮지 않게) — walk 장면은 첫 출하 그대로
  if (which !== 'walk') await ctx.addInitScript(() => { if (!localStorage.getItem('pawnisher.slice.meta')) localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ runs: 1, prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'hud-deck', 'hud-parts', 'hud-help'] })); });
  const pg = await ctx.newPage();
  const errors = [];
  pg.on('pageerror', (e) => errors.push(e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = (n, clip) => pg.screenshot({ path: path.join(OUT, `${TAG}-${W}-${n}.png`), ...(clip ? { clip } : {}) });
  const log = (k, v) => console.log(k, JSON.stringify(v));
  const boot = async (q = '') => {
    await pg.goto(BASE + '?debug' + q);
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.waitForTimeout(300);
    const s0 = await pg.$('.stagefx'); if (s0) { await s0.click(); await pg.waitForTimeout(400); }
  };
  const A = (fn, arg) => pg.evaluate(fn, arg);

  /** 카드 설명지 압정 ↔ 묘사 첫 줄: 압정 아래 끝(틀 도트) · 첫 줄 글 위 끝(잉크 = 줄 상자 + 글꼴 위 여백)을 카드 도트로 */
  const pinScan = () => A(() => [...document.querySelectorAll('.cf.part-card, .cf.start-set')].filter((c) => c.getClientRects().length).slice(0, 12).map((c) => {
    const r = c.getBoundingClientRect();
    const dot = r.width / 84;
    const vis = [...c.querySelectorAll('.cf-desc .ct')].find((t) => getComputedStyle(t).display !== 'none');
    const first = vis?.querySelector('.ln-say');
    const fr = first?.getBoundingClientRect();
    return { card: c.getAttribute('aria-label') ?? c.querySelector('.cf-name')?.textContent, set: c.classList.contains('start-set'), w: +r.width.toFixed(1), lineTopDot: fr && first.textContent.trim() ? +((fr.top - r.top) / dot).toFixed(2) : null, text: first?.textContent ?? '' };
  }));
  const S = {
    pin: async () => {
      await boot();
      await A(() => window.sliceApi.allFaces(['relaySeal', 'sharedPlate', 'relayGear', 'siegeLatch', 'lastBreath', 'ledger']));
      await pg.waitForTimeout(900);
      log('PIN parts', await pinScan());
      const c = await pg.$('.cf.part-card');
      const b = await c.boundingBox();
      await shot('pin-part', { x: b.x, y: b.y + b.height * 0.5, width: b.width, height: b.height * 0.25 });
      await shot('pin-parts');
      await A(() => localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ runs: 1, prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'] })));
      await boot();
      await A(() => { void window.sliceApi.begin(1); });
      await pg.waitForSelector('.cf.start-set', { timeout: 8000 }).catch(() => {});
      await pg.waitForTimeout(1200);
      // 두 줄 묘사 세트(기마) — 첫 줄이 압정 높이에 선다
      const set = (await pg.$$('.cf.start-set'))[1];
      if (set) {
        log('PIN sets', await pinScan());
        const sb = await set.boundingBox();
        await shot('pin-set', { x: sb.x, y: sb.y + sb.height * 0.5, width: sb.width, height: sb.height * 0.25 });
        await shot('pin-sets');
      } else log('PIN sets', 'no start-set screen');
    },
    /** 사건 결과 1박의 작은 분대원 카드: 설명지 칸(cf-desc) 안에서 글 격자가 넘친 몫 */
    evres: async () => {
      await boot();
      await A(() => window.sliceApi.campaign(0));
      await pg.waitForTimeout(1200);
      await A(() => { void window.sliceApi.resultFx('repair'); });
      let best = null;
      for (let t = 0; t < 30; t++) {
        await pg.waitForTimeout(200);
        const m = await A(() => [...document.querySelectorAll('.er-crewcard .cf')].map((c) => {
          const d = c.querySelector('.cf-desc');
          const ct = [...d.querySelectorAll('.ct')].find((x) => getComputedStyle(x).display !== 'none');
          const dr = d.getBoundingClientRect(), tr = ct?.getBoundingClientRect();
          return { w: +c.getBoundingClientRect().width.toFixed(1), box: +dr.height.toFixed(2), grid: tr ? +tr.height.toFixed(2) : null, clipTop: tr ? +(dr.top - tr.top).toFixed(2) : null, clipBottom: tr ? +(tr.bottom - dr.bottom).toFixed(2) : null };
        }));
        if (m.length) { best = m; if (t > 6) break; }
      }
      log('EVRES', best);
      const el = await pg.$('.er-crewcard');
      if (el) { const b = await el.boundingBox(); await shot('evres-card', { x: Math.max(0, b.x - 4), y: Math.max(0, b.y - 4), width: b.width + 8, height: Math.min(H - b.y + 4, b.height + 8) }); }
      await shot('evres');
    },
    /** 펼친 카드 창: 겨누는 동안 고른 기물 · 갈 칸 · 맞을 적 · 내 기물 줄을 덮나 */
    cardwin: async () => {
      await boot();
      const seeds = [1, 2, 3];
      const res = [];
      for (const act of seeds) {
        await A((a) => window.sliceApi.startAt(a, 'battle'), act);
        await pg.waitForTimeout(3500);
        const n = await A(() => window.slice().hand.length);
        for (let i = 0; i < n; i++) {
          // 카드 → 그 카드로 움직일 수 있는 첫 기물 (손가락 탭으로)
          const pick = await A((i) => {
            const b = window.slice(), api = window.sliceApi;
            const pcs = api.cardPieces(b, i);
            if (!pcs.length) return null;
            const card = document.querySelector(`#hand > [data-card="${i}"]`);
            const r = card?.getBoundingClientRect();
            return r ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, pieces: pcs.map((p) => ({ id: p.id, x: p.x, y: p.y })) } : null;
          }, i);
          if (!pick) continue;
          await pg.touchscreen.tap(pick.cx, pick.cy);
          await pg.waitForTimeout(350);
          for (const pc of pick.pieces.slice(0, 2)) {
            const sel = await A(() => window.sliceApi.sel());
            if (sel.piece !== pc.id) {
              const at = await A((p) => window.sliceApi.screenOf(p), pc);
              await pg.touchscreen.tap(at.x, at.y);
              await pg.waitForTimeout(450);
            }
            const m = await A(() => {
              const b = window.slice(), api = window.sliceApi, s = api.sel();
              const win = document.querySelector('.card-win');
              if (!win || s.piece === null || s.card === null) return null;
              const w = win.getBoundingClientRect();
              const a0 = api.screenOf({ x: 0, y: 0 }), a1 = api.screenOf({ x: 1, y: 0 });
              const half = Math.abs(a1.x - a0.x) / 2 - 1;
              const cov = (p) => { const c = api.screenOf(p); return c.x + half > w.left && c.x - half < w.right && c.y + half > w.top && c.y - half < w.bottom; };
              const dests = api.cardMoves(b, s.card, s.piece);
              const me = b.s.pieces.find((p) => p.id === s.piece);
              const mine = b.s.pieces.filter((p) => p.side === 0 && p.hp > 0);
              const g0 = api.screenOf({ x: 0, y: 0 }), g1 = api.screenOf({ x: b.s.width - 1, y: b.s.height - 1 });
              const gx0 = Math.min(g0.x, g1.x) - half, gx1 = Math.max(g0.x, g1.x) + half, gy0 = Math.min(g0.y, g1.y) - half, gy1 = Math.max(g0.y, g1.y) + half;
              const onGrid = w.right > gx0 && w.left < gx1 && w.bottom > gy0 && w.top < gy1;
              const name = document.querySelector(`#hand > [data-card="${s.card}"]`)?.textContent.trim().slice(0, 10);
              return { at: win.dataset.at, onGrid, name, knight: me?.type === 'N', sel: !!me && cov(me), dests: dests.filter(cov).length, destN: dests.length, mine: mine.filter(cov).length, mineN: mine.length, win: [Math.round(w.left), Math.round(w.top), Math.round(w.width), Math.round(w.height)] };
            });
            if (m) res.push({ act, card: i, piece: pc.id, ...m });
            if (m && (res.length <= 3 || m.sel || m.dests || m.mine || m.onGrid || (m.knight && !res.some((q, k) => q.knight && k < res.length - 1)))) await shot(`cardwin-${res.length}${m.knight ? '-knight' : ''}${m.sel || m.dests || m.mine || m.onGrid ? '-cover' : ''}`);
          }
          // 고르기 풀기 (같은 카드를 다시 눌러 접는다)
          await pg.touchscreen.tap(pick.cx, pick.cy);
          await pg.waitForTimeout(250);
          await A(() => { const s = window.sliceApi.sel(); if (s.card !== null) document.querySelector(`#hand > [data-card="${s.card}"]`)?.click(); });
          await pg.waitForTimeout(250);
        }
      }
      const bad = res.filter((r) => r.sel || r.dests || r.mine || r.onGrid);
      const at = {};
      res.forEach((r) => (at[r.at] = (at[r.at] ?? 0) + 1));
      log('CARDWIN', { cases: res.length, knight: res.filter((r) => r.knight).length, at, onGrid: res.filter((r) => r.onGrid).length, coverSel: res.filter((r) => r.sel).length, coverDest: res.filter((r) => r.dests).length, coverMine: res.filter((r) => r.mine).length, bad: bad.slice(0, 6) });
    },
    piles: async () => {
      await boot();
      await A(() => window.sliceApi.startAt(1, 'battle'));
      await pg.waitForTimeout(3500);
      const row = await pg.$('#deckrow');
      if (row) {
        const b = await row.boundingBox();
        await shot('piles', { x: Math.max(0, b.x - 6), y: Math.max(0, b.y - 6), width: b.width + 12, height: b.height + 12 });
        // D-676: 단추 폭 · 사이 틈 · 누름 칸(::before) · 문양 오른 끝 ↔ 소켓 왼 끝 여유
        log('PILES', await A(() => {
          const bs = [...document.querySelectorAll('#deckrow .pile-btn')];
          const row = document.querySelector('#deckrow').getBoundingClientRect();
          return { row: { x: row.x, w: row.width }, btns: bs.map((e, i) => {
            const r = e.getBoundingClientRect(); const hit = getComputedStyle(e, '::before');
            const ico = e.querySelector('.pile-ico').getBoundingClientRect(); const n = e.querySelector('.pile-n').getBoundingClientRect();
            const u = parseFloat(getComputedStyle(e).getPropertyValue('--u')) || ico.width / 30;
            return { w: +r.width.toFixed(2), hitH: parseFloat(hit.height), gapNext: bs[i + 1] ? +(bs[i + 1].getBoundingClientRect().left - r.right).toFixed(2) : null,
              wDots: +(r.width / (ico.width / 30)).toFixed(1), icoToSocket: +(n.left - (ico.right)).toFixed(2), inRow: r.left >= row.left - 0.5 && r.right <= row.right + 0.5 };
          }) };
        }));
      }
      await shot('battle');
    },
    /** 첫 실전 HUD 짚기 (D-610 · D-666): 열기 → (한 수) → 덱 줄 이름 → 펼쳐 보기 */
    walk: async () => {
      await boot();
      await A(() => localStorage.setItem('pawnisher.slice.meta', JSON.stringify({ runs: 1, prologue: true, onboarded: true, tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop'] })));
      await boot();
      await A(() => window.sliceApi.startAt(1, 'battle'));
      await pg.waitForTimeout(3000);
      await A(() => window.sliceApi.hudWalkNow());
      await pg.waitForTimeout(2500);
      await shot('walk-1-heat');
      // 말풍선을 눌러 넘긴다 (찍는 중이면 한 번 더)
      for (let i = 0; i < 6 && (await A(() => !!document.querySelector('.tut'))); i++) {
        await A(() => document.querySelector('.tut .talk')?.click());
        await pg.waitForTimeout(500);
      }
      await A(() => window.sliceApi.botMove('greedy'));
      await pg.waitForTimeout(3500);
      await shot('walk-2-piles');
      log('WALK step', await A(() => document.querySelector('.tut-root .talk, .talk.on-sub')?.textContent ?? document.querySelector('[class*=tut] .talk')?.textContent ?? null));
      await pg.tap('.tut-catch').catch(() => {});
      await pg.waitForTimeout(400);
      await pg.tap('.tut-catch').catch(() => {});
      await pg.waitForTimeout(2000);
      await shot('walk-3-open');
    },
    settings: async () => {
      await boot();
      await A(() => window.sliceApi.settingsWin());
      await pg.waitForTimeout(600);
      await pg.tap('[data-set-tab="screen"]');
      await pg.waitForTimeout(500);
      await shot('settings-screen');
      const fast = await pg.$('[data-seg="boardRes"][data-v="fast"]');
      if (fast) { await fast.tap(); await pg.waitForTimeout(400); await shot('settings-fast'); }
      log('SETTINGS', await A(() => localStorage.getItem('pawnisher.settings')));
    },
  };
  const list = which === 'all' ? Object.keys(S) : which.split(',');
  for (const k of list) {
    try { await S[k](); } catch (e) { console.log('FAIL', k, String(e)); }
  }
  console.log('errors', errors.length, errors.slice(0, 5));
  await br.close();
})();
