// 키보드로만 부팅 → 타이틀 → 대국 (D-531) · 판 커서로 연습 대국을 키만으로 몇 턴 (D-533). 915×412 · DPR 2.625에서 Playwright 키 누름만 쓴다.
// 사용: OBSERVE_URL=http://localhost:4173/ node tools/qa/keyboard.cjs → production/qa/evidence/<날짜>-kb-*.png
const { chromium } = require('playwright');
const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
const day = new Date().toISOString().slice(0, 10);
(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  let errors = 0;
  pg.on('pageerror', (e) => { errors++; console.log('ERR', e.message); });
  const state = () => pg.evaluate(() => {
    const a = document.activeElement;
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el && el.parentElement && el.parentElement !== document.body) el = el.parentElement;
    return { focus: a && a !== document.body ? `${a.tagName.toLowerCase()} ${(a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24)}` : '-', top: el?.id || String(el?.className).split(' ')[0], between: document.body.classList.contains('between') };
  });
  const step = async (name, keys, wait = 700) => {
    for (const k of keys) { await pg.keyboard.press(k); await pg.waitForTimeout(wait); }
    const s = await state();
    console.log(name.padEnd(14), keys.join(' ').padEnd(28), JSON.stringify(s));
    if (name) await pg.screenshot({ path: `production/qa/evidence/${day}-kb-${name}.png` });
    return s;
  };
  /** 판 커서를 칸까지 방향키로 (커서 칸은 ?debug sliceApi.cursor로 읽기만 한다) */
  const toCell = async (to) => {
    for (let i = 0; i < 24; i++) {
      const c = await pg.evaluate(() => window.sliceApi.cursor());
      if (!c) { await pg.keyboard.press('ArrowUp'); await pg.waitForTimeout(80); continue; }
      if (c.x === to.x && c.y === to.y) return true;
      await pg.keyboard.press(c.x < to.x ? 'ArrowRight' : c.x > to.x ? 'ArrowLeft' : c.y < to.y ? 'ArrowUp' : 'ArrowDown');
      await pg.waitForTimeout(80);
    }
    return false;
  };
  /** 조작을 받을 수 있을 때까지 (적 차례 · 연출이 끝날 때까지) */
  const idle = async () => {
    for (let i = 0; i < 60; i++) {
      const ok = await pg.evaluate(() => { const e = document.getElementById('btn-end'); return !!e && !e.disabled && !document.querySelector('.bossfx,.clr') && document.getElementById('overlay').hidden && !/적 차례|움직이는 중/.test(document.getElementById('turn-label')?.textContent || ''); });
      if (ok) return true;
      // 창 · 장면이 떴으면 Enter로 넘긴다 (키만으로)
      const top = (await state()).top;
      if (top !== 'app') await pg.keyboard.press('Enter');
      await pg.waitForTimeout(400);
    }
    return false;
  };
  /** 읽기만 하는 수 고르기 (sliceApi.cardPieces · cardMoves · previewPlay) — 피해가 큰 수, 없으면 적에게 다가가는 수 */
  const plan = () => pg.evaluate(() => {
    const A = window.sliceApi, b = window.slice();
    const foes = b.s.pieces.filter((p) => p.side === 1);
    let best = null;
    b.hand.forEach((_, i) => {
      for (const p of A.cardPieces(b, i)) for (const to of A.cardMoves(b, i, p.id)) {
        const sim = A.previewPlay(b, i, p.id, to);
        const dmg = (sim?.events || []).flatMap((e) => (e.type === 'attack' && e.attackerId === p.id ? e.hits : [])).reduce((a, h) => a + (h.damage || 1) + (h.killed ? 100 : 0), 0);
        const near = Math.min(...foes.map((f) => Math.max(Math.abs(f.x - to.x), Math.abs(f.y - to.y))));
        const score = dmg * 10 - near - (p.type === 'K' ? 50 : 0);
        if (!best || score > best.score) best = { i, piece: { x: p.x, y: p.y }, id: p.id, to, score, dmg };
      }
    });
    return best;
  });
  /** 부관 안내 · 판 상태 한 번 읽기 */
  const look = () => pg.evaluate(() => {
    const t = document.querySelector('.tut');
    const f = t?.querySelector('.tut-frame');
    const r = f && !f.hidden ? f.getBoundingClientRect() : null;
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el && el.parentElement && el.parentElement !== document.body) el = el.parentElement;
    const e = document.getElementById('btn-end');
    const b = window.slice();
    return {
      tut: !!t, act: !!t?.classList.contains('act'), paused: !!t?.classList.contains('paused'),
      frame: r && { l: r.left, t: r.top, r: r.right, b: r.bottom },
      top: el?.id || String(el?.className).split(' ')[0],
      ready: !!e && !e.disabled && document.getElementById('overlay').hidden && !document.body.classList.contains('between') && !/적 차례|움직이는 중/.test(document.getElementById('turn-label')?.textContent || ''),
      winner: b?.s.winner ?? null, turn: b?.turn ?? 0, w: b?.s.width, h: b?.s.height,
    };
  });
  /** 안내가 짚은 테 안의 것을 키로 한다: 손패 카드 → 번호 · 턴 끝 → E · 되감기 → R · 판 칸 → 커서 + Enter */
  const tutAct = async (fr) => {
    const inF = (x, y) => x >= fr.l && x <= fr.r && y >= fr.t && y <= fr.b;
    const what = await pg.evaluate((F) => {
      const inF = (x, y) => x >= F.l && x <= F.r && y >= F.t && y <= F.b;
      const mid = (el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + Math.min(r.height / 2, 12)]; };
      for (const c of document.querySelectorAll('#hand [data-card]')) if (inF(...mid(c))) return { key: String(Number(c.dataset.card) + 1) };
      for (const [id, key] of [['btn-end', 'e'], ['btn-rewind', 'r']]) { const el = document.getElementById(id); if (el && inF(...mid(el))) return { key }; }
      const b = window.slice(), cells = [];
      for (let x = 0; x < b.s.width; x++) for (let y = 0; y < b.s.height; y++) { const p = window.sliceApi.screenOf({ x, y }); if (inF(p.x, p.y)) cells.push({ x, y }); }
      return { cells };
    }, fr);
    void inF;
    if (what.key) {
      await pg.keyboard.press(what.key);
      return `key ${what.key}`;
    }
    if (what.cells?.length === 1) { await toCell(what.cells[0]); await pg.keyboard.press('Enter'); return `cell ${what.cells[0].x},${what.cells[0].y}`; }
    await pg.keyboard.press('Enter');
    return `enter (${what.cells?.length ?? 0} cells)`;
  };
  /** 키만으로 첫 연습 대국 (시험대 둘 + 연습 판 — 부관 안내 포함)을 끝까지 또는 n턴까지 */
  const playTurns = async (turns) => {
    const log = { tutActs: [], moves: 0, hits: 0, endTurns: 0, movesThisTurn: 0, winner: null };
    let shots = 0;
    for (let it = 0; it < 260; it++) {
      const st = await look();
      if (st.winner === 0 && !st.tut) { log.winner = 0; break; }
      // 안내 위에 뜬 창 (되감기 확인 등)이 맨 위면 초점 단추를 Enter로
      if (st.top !== 'app' && st.top !== 'tut') {
        // 되감기 장면: 방향키로 「시간을 거스른다」에 초점 → Enter (첫 Enter는 첫 단추 「그만둔다」에 초점만 준다)
        // 되감기 장면은 글이 다 찍혀 단추가 나올 때까지 기다린다 (그 전에 누르면 장면을 누른 것 — 터치와 같다)
        if (st.top === 'revfx' && !(await pg.evaluate(() => !!document.querySelector('.revfx .row:not([hidden]) button')))) { await pg.waitForTimeout(400); continue; }
        if (st.top === 'revfx') {
          for (let k = 0; k < 3 && !(await pg.evaluate(() => document.activeElement?.matches('.revfx [data-yes], .revfx .rev-yes'))); k++) { await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(150); }
          if (await pg.evaluate(() => document.activeElement?.matches('.revfx [data-yes], .revfx .rev-yes'))) log.tutActs.push('rewind yes');
        }
        await pg.keyboard.press('Enter'); await pg.waitForTimeout(450); continue;
      }
      if (st.tut && st.act && !st.paused && st.frame) {
        log.tutActs.push(await tutAct(st.frame));
        await pg.waitForTimeout(700);
        if (shots < 4) await pg.screenshot({ path: `production/qa/evidence/${day}-kb-practice-tut${++shots}.png` });
        continue;
      }
      if (st.tut && !st.act) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(250); continue; }
      if (st.tut || (st.top !== 'app' && st.top !== 'tut')) { if (!st.tut) await pg.keyboard.press('Enter'); await pg.waitForTimeout(450); continue; }
      if (!st.ready) { await pg.waitForTimeout(400); continue; }
      if (log.endTurns >= turns) break;
      const m = await plan();
      if (m && (m.dmg > 0 || log.movesThisTurn < 2)) {
        await pg.keyboard.press(String(m.i + 1)); await pg.waitForTimeout(250);
        await toCell(m.piece); await pg.keyboard.press('Enter'); await pg.waitForTimeout(300);
        await toCell(m.to);
        if (log.moves === 0) await pg.screenshot({ path: `production/qa/evidence/${day}-kb-practice-aim.png` });
        await pg.keyboard.press('Enter');
        log.moves++; log.movesThisTurn = (log.movesThisTurn || 0) + 1; if (m.dmg) log.hits++;
        await pg.waitForTimeout(1400);
        continue;
      }
      await pg.keyboard.press('e'); await pg.waitForTimeout(500);
      if (await pg.evaluate(() => document.getElementById('btn-end')?.classList.contains('warn'))) { await pg.keyboard.press('e'); await pg.waitForTimeout(500); }
      log.endTurns++; log.movesThisTurn = 0;
      await pg.waitForTimeout(2500);
      await pg.screenshot({ path: `production/qa/evidence/${day}-kb-practice-turn${log.endTurns}.png` });
    }
    const end = await look();
    log.winner = end.winner; log.turn = end.turn;
    await pg.screenshot({ path: `production/qa/evidence/${day}-kb-practice-end.png` });
    return log;
  };
  // 첫 실행은 ?debug&opening — 흐름은 첫 실행과 같고(타이틀 · 프롤로그 · 연습 대국), 상태를 읽을 손잡이만 열린다 (조작은 키만)
  await pg.goto(BASE + '?debug&opening');
  await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.waitForTimeout(1000);
  await step('title', []);
  // 첫 실행: 「누르세요」 → 프롤로그 → 연습 대국 — Enter만으로 넘긴다 (대국 판이 맨 위가 두 번 연속이면 멈춤)
  let s, hits = 0;
  for (let i = 0; i < 40 && hits < 2; i++) {
    s = await step('', ['Enter'], 500);
    hits = s.top === 'app' && !s.between ? hits + 1 : 0;
  }
  await step('battle', []);
  const played = await playTurns(4);
  console.log('practice by keys:', JSON.stringify(played));
  // 두 번째 실행: 타이틀 → 메뉴 → 방향키 초점 → 안내서 창 → Esc로 닫기
  await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.waitForTimeout(1000);
  await step('title2', ['Enter'], 900);
  await step('menu', ['ArrowDown']);
  await step('menu-move', ['ArrowDown', 'ArrowDown']);
  await step('menu-right', ['ArrowRight']);
  await step('menu-enter', ['Enter'], 900);
  await step('menu-esc', ['Escape'], 900);
  // 세 번째: 연습이 아닌 1막 대국 (?debug로 바로) — 카드 1 장전(탭 한 번과 같다) → Esc 내려놓기 → E 턴 끝
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await pg.evaluate(() => window.sliceApi.startAt(1, 'battle'));
  await pg.waitForTimeout(1500);
  for (let i = 0; i < 6 && (await state()).top !== 'app'; i++) { await pg.keyboard.press('Enter'); await pg.waitForTimeout(600); }
  await step('b2', []);
  await step('b2-card1', ['1']);
  const armed = await pg.evaluate(() => !!document.querySelector('#hand .hc.armed'));
  await step('b2-esc', ['Escape']);
  const cleared = await pg.evaluate(() => !document.querySelector('#hand .hc.armed'));
  console.log('armed by key', armed, '· cleared by Esc', cleared);
  // 판 커서 (D-533): 첫 방향키는 커서를 보이기만(내 킹 자리), 다음부터 한 칸씩. Tab = 손패 ↔ 판
  await step('b2-cursor', ['ArrowUp']);
  console.log('cursor shown at', JSON.stringify(await pg.evaluate(() => window.sliceApi.cursor())));
  await step('b2-cursor-move', ['ArrowUp', 'ArrowLeft']);
  console.log('cursor moved to', JSON.stringify(await pg.evaluate(() => window.sliceApi.cursor())));
  await step('b2-tab-hand', ['Tab']);
  console.log('hand focus', (await state()).focus, '· cursor hidden', (await pg.evaluate(() => window.sliceApi.cursor())) === null);
  await step('b2-tab-board', ['Tab']);
  // 정보 창 (I = 길게 누르기) — 커서를 적 기물로 옮겨 연다 → Esc로 닫는다
  await toCell(await pg.evaluate(() => { const p = window.slice().s.pieces.find((q) => q.side === 1); return { x: p.x, y: p.y }; }));
  await step('b2-info', ['i'], 600);
  const peek = await pg.evaluate(() => !!document.querySelector('.k-peek:not(.pxout)'));
  await step('b2-info-esc', ['Escape'], 500);
  console.log('info opened by I', peek, '· closed by Esc', await pg.evaluate(() => !document.querySelector('.k-peek:not(.pxout)')));
  const t0 = await pg.evaluate(() => window.slice().turn);
  await step('b2-end', ['e'], 1200);
  await step('b2-end2', ['e'], 3500);
  console.log('turn', t0, '→', await pg.evaluate(() => window.slice().turn));
  await pg.waitForTimeout(3000);
  // 네 번째: 가짜 게임패드 (표준 배치) — 십자키로 초점 → A 누름(창 열림) → B 닫기
  await pg.evaluate(() => {
    const pad = { index: 0, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    window.__pad = pad;
    navigator.getGamepads = () => [pad];
    window.dispatchEvent(new Event('gamepadconnected'));
  });
  const pad = async (i) => {
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = true; }, i); await pg.waitForTimeout(120);
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = false; }, i); await pg.waitForTimeout(500);
  };
  console.log('pad installed', await pg.evaluate(() => navigator.getGamepads().length + ' ' + document.activeElement?.tagName + ' btns ' + document.querySelectorAll('#app button:not(:disabled)').length));
  const hold = async (i, ms) => {
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = true; }, i); await pg.waitForTimeout(ms);
    await pg.evaluate((n) => { window.__pad.buttons[n].pressed = false; }, i); await pg.waitForTimeout(500);
  };
  // 판 커서: 십자키 (첫 누름은 보이기만) → 적 기물 위에서 Y 길게 = 정보 창 → B 닫기 → LB = 손패 초점 → 십자키 · A → B
  await pad(12); await pad(12);
  const padCursor = await pg.evaluate(() => window.sliceApi.cursor());
  const foe = await pg.evaluate(() => { const p = window.slice().s.pieces.find((q) => q.side === 1); return { x: p.x, y: p.y }; });
  for (let i = 0; i < 16; i++) {
    const c = await pg.evaluate(() => window.sliceApi.cursor());
    if (c.x === foe.x && c.y === foe.y) break;
    await pad(c.x < foe.x ? 15 : c.x > foe.x ? 14 : c.y < foe.y ? 12 : 13);
  }
  await hold(3, 700);
  const padPeek = await pg.evaluate(() => !!document.querySelector('.k-peek:not(.pxout)'));
  await pg.screenshot({ path: `production/qa/evidence/${day}-kb-pad-y-hold.png` });
  await pad(1);
  await pad(4);
  // LB는 손패 ↔ 판 토글이다 — 앞 단계가 판 초점을 이미 풀었으면 한 번 더 눌러 손패로
  if (!(await pg.evaluate(() => !!document.activeElement?.closest('#hand')))) await pad(4);
  // 첫 카드가 못 내는 카드(.off)일 수 있다 — 십자키 아래로(손패는 왼쪽 세로 줄) 낼 수 있는 첫 카드까지 초점을 옮긴다
  const onPlayable = () => pg.evaluate(() => !!document.activeElement?.matches('#hand .hc:not(.off)'));
  const anyPlayable = await pg.evaluate(() => !!document.querySelector('#hand .hc:not(.off)'));
  for (let i = 0; i < 10 && anyPlayable && !(await onPlayable()); i++) await pad(13);
  const handFocus = (await state()).focus;
  if (!anyPlayable) console.log('pad: no playable card in hand — A check skipped');
  await pad(0);
  const padArmed = await pg.evaluate(() => !!document.querySelector('#hand .hc.armed'));
  await pg.screenshot({ path: `production/qa/evidence/${day}-kb-pad-a.png` });
  await pad(1);
  console.log('pad: cursor', JSON.stringify(padCursor), '· Y-hold info', padPeek, '· LB hand focus', handFocus, '· A armed', padArmed, '· B cleared', await pg.evaluate(() => !document.querySelector('#hand .hc.armed')));
  // 2×2 반장 판: 커서가 몸에 들어서면 몸 왼아래 칸에 붙고(테는 2×2), 한 번 더 누르면 몸을 건너 나간다
  await pg.evaluate(() => window.sliceApi.bossOf('plate', 1));
  await pg.waitForTimeout(2600);
  for (let i = 0; i < 6 && (await state()).top !== 'app'; i++) { const sk = await pg.$('.stagefx'); if (sk) await sk.click(); else await pg.keyboard.press('Enter'); await pg.waitForTimeout(700); }
  const core = await pg.evaluate(() => { const k = window.slice().s.pieces.find((p) => p.side === 1 && p.giant?.boss); return k && { x: k.x, y: k.y }; });
  if (core) {
    await toCell({ x: core.x - 1, y: core.y });
    await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(300);
    const on = await pg.evaluate(() => window.sliceApi.cursor());
    await pg.screenshot({ path: `production/qa/evidence/${day}-kb-boss-cursor.png` });
    await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(300);
    console.log('boss body', JSON.stringify(core), '· cursor on', JSON.stringify(on), '· next right', JSON.stringify(await pg.evaluate(() => window.sliceApi.cursor())));
  } else console.log('boss body: none (1칸 반장)');
  // 다섯째: 설정 창(PC 줄 견본) — 방향키 초점 → Esc로 닫기
  await pg.evaluate(() => window.sliceApi.settingsWin(true));
  await pg.waitForTimeout(700);
  await step('settings', ['ArrowDown', 'ArrowDown']);
  await step('settings-esc', ['Escape']);
  console.log('page errors', errors);
  await br.close();
})();
