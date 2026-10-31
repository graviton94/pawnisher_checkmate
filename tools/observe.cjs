// 실제 화면 관찰 도구 (/run-and-observe): 모바일 가로(915×412, DPR 2.625) 터치 기기로 게임을 열고
// 시나리오대로 탭해 스크린샷을 production/qa/evidence/에 남긴다. 미리 `npm run build`와 `npx vite preview --port 4173`.
// 사용: node tools/observe.cjs <시나리오> [--pc]   시나리오: menu | start | battle | battle-full | reward | shop | all
const { chromium } = require('playwright');
const path = require('node:path');
const fs = require('node:fs');

const OUT = path.join(__dirname, '..', 'production', 'qa', 'evidence');
const URL = process.env.OBSERVE_URL || 'http://localhost:4173/?debug&nointro';
const stamp = new Date().toISOString().slice(0, 10);

const runFixture = (stage) => ({
  version: 1, seed: 5, rng: 5, floor: 3, map: Array.from({ length: 36 }, () => [{ kind: 'battle' }, { kind: 'shop' }]), path: [],
  gold: 120, deck: ['K', 'N', 'N', 'P', 'P', 'B'], loadout: { enchants: { E01: 1, E13: 2 }, cards: ['A01', 'C03'], forge: { N: 1 }, variants: {} },
  wins: 2, crackGauge: 1, bosses: ['knight', 'rook'], ascension: 0, stage,
});

/** 저장된 출하를 심고 타이틀 → 이어서 출하 */
const loadRun = async (page, stage, extra = {}) => {
  await page.evaluate((run) => { localStorage.clear(); localStorage.setItem('pawnisher.run.v1', JSON.stringify(run)); }, { ...runFixture(stage), ...extra });
  await page.reload(); await page.waitForTimeout(600);
  await page.tap('[data-title]'); await page.waitForTimeout(300);
  await page.tap('[data-continue]'); await page.waitForTimeout(500);
};

const scenarios = {
  async menu(page) {
    await page.evaluate(() => localStorage.clear());
    await page.reload(); await page.waitForTimeout(600);
    await page.tap('[data-title]'); await page.waitForTimeout(400);
    return ['menu'];
  },
  // 타이틀 · 인트로 (D-085): 인트로 중간(도장 · 붉은 사선) · 끝난 타이틀
  async title(page) {
    await page.goto(URL.replace('&nointro', '')); await page.waitForTimeout(2400);
    await page.screenshot({ path: path.join(OUT, `${stamp}-intro-mid.png`) });
    await page.waitForTimeout(2140);
    await page.screenshot({ path: path.join(OUT, `${stamp}-intro-slash.png`) });
    await page.waitForTimeout(1600);
    return ['title'];
  },
  // 볼륨 3 (D-108): 압력 ◀ ▶ · 도감 · 새 시작 세트
  async codex(page) {
    const meta = { version: 1, runs: 23, clears: 2, bestFloor: 36, ascension: 7, elites: 16, puzzles: 5, bossKills: ['pawn', 'knight', 'final'],
      seen: { enchants: ['E01', 'E02', 'E05', 'E13', 'E17', 'E26', 'E31'], variants: ['hammer', 'scope'], events: ['smith', 'gambler', 'jam', 'auction'] } };
    await page.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.meta.v1', JSON.stringify(m)); }, meta);
    await page.reload(); await page.waitForTimeout(600);
    await page.tap('[data-title]'); await page.waitForTimeout(400);
    await page.tap('[data-asc="1"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `${stamp}-menu-asc.png`) });
    await page.tap('[data-codex]'); await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${stamp}-codex-top.png`) });
    await page.tap('.cx.unknown'); await page.waitForTimeout(200);
    await page.evaluate(() => { const c = document.querySelector('.codex'); c.scrollTop = c.scrollHeight; }); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${stamp}-codex-bottom.png`) });
    await page.tap('[data-menu]'); await page.waitForTimeout(300);
    // 지휘 세트가 나오는 시드를 찾을 때까지 새 출하를 연다
    for (let i = 0; i < 12; i++) {
      await page.tap('[data-new]'); await page.waitForTimeout(250);
      if (await page.locator('.offer b', { hasText: '지휘' }).count()) break;
      await page.tap('[data-menu]'); await page.waitForTimeout(200);
    }
    return ['start-sets'];
  },
  async start(page) {
    await scenarios.menu(page);
    await page.tap('[data-new]'); await page.waitForTimeout(400);
    return ['start-deck'];
  },
  // 시드 (D-100): 지어낸 코드는 거절, 받은 코드는 그 출하로
  async seed(page) {
    await scenarios.start(page);
    const code = await page.locator('.seed b').first().textContent();
    await page.fill('#seed-input', 'ABCDE-12345'); await page.tap('[data-seed]'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${stamp}-seed-bad.png`) });
    await page.tap('[data-menu]'); await page.waitForTimeout(300);
    await page.tap('[data-new]'); await page.waitForTimeout(300);
    await page.fill('#seed-input', code.toLowerCase()); await page.tap('[data-seed]'); await page.waitForTimeout(400);
    const now = await page.locator('.seed b').first().textContent();
    console.log(`seed ${code} → ${now} ${code === now ? 'OK' : 'MISMATCH'}`);
    return ['seed-ok'];
  },
  async battle(page) {
    await scenarios.start(page);
    await page.tap('[data-deck="0"]'); await page.waitForTimeout(300);
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1000);
    return ['battle-6x6'];
  },
  async 'battle-full'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.pawnisher.autoPlan());
    await page.waitForTimeout(300);
    return ['battle-8x8-planned'];
  },
  // 판 그래픽 (D-071): 기물을 골랐을 때 — 선택 모서리 · 갈 수 있는 칸 방울 · 치는 칸 과녁
  async 'battle-select'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const c = window.pawnisher;
      const s = c.model().virtual;
      const p = s.pieces.find((q) => q.side === 0 && q.type === 'N') ?? s.pieces.find((q) => q.side === 0);
      c.tap({ x: p.x, y: p.y }, true);
    });
    await page.waitForTimeout(400);
    return ['battle-select'];
  },
  // 적 의도 (D-081): 아무것도 안 눌렀을 때 = 붉은 화살표 + 잃을 HP + 처치만 금색 숫자 / 적을 누르면 모든 피해 숫자
  async 'battle-intent'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-intent.png`) });
    await page.evaluate(() => {
      const c = window.pawnisher;
      const s = c.model().virtual;
      const p = s.pieces.find((q) => q.side === 1 && q.type === 'Q') ?? s.pieces.find((q) => q.side === 1);
      c.tap({ x: p.x, y: p.y }, true);
    });
    await page.waitForTimeout(400);
    return ['battle-intent-inspect'];
  },
  // 이형 거푸집 (D-084): 양 진영에 이형 4종 — 오른쪽 위 황동 문양 + 길게 누르기 설명
  async 'battle-variant'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(800);
    await page.evaluate(() => {
      const c = window.pawnisher;
      const variants = { P: 'conveyor', N: 'hammer', B: 'mirror', R: 'radiator' };
      const lo = { enchants: {}, cards: [], forge: {}, variants };
      const s = c.state;
      c.start({ width: s.width, height: s.height, decks: [s.pieces.filter((p) => p.side === 0).map((p) => p.type), s.pieces.filter((p) => p.side === 1).map((p) => p.type)], weights: null }, 1, null, [lo, lo]);
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-variant.png`) });
    // 적 쇠망치 나이트 길게 누르기 → 설명
    const box = await page.locator('#board canvas').boundingBox();
    const s = await page.evaluate(() => { const st = window.pawnisher.state; const n = st.pieces.find((p) => p.side === 1 && p.type === 'N'); return { w: st.width, h: st.height, x: n.x, y: n.y }; });
    const cell = Math.min(box.width / s.w, box.height / s.h);
    void cell;
    await page.evaluate((pos) => window.pawnisher.tap(pos, true), { x: s.x, y: s.y });
    await page.waitForTimeout(300);
    return ['battle-variant-tap'];
  },
  // 전술 키워드 · 주문서 (D-094): 나이트 포크를 예약 → 명령 테이프 칩 · 레일 주문서 줄 → 가동 중 판 위 배너 → 기록 줄 칩
  async 'battle-tactic'(page) {
    await page.goto(URL + '&fxslow'); await page.waitForTimeout(500);
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const c = window.pawnisher;
      const s = c.state;
      const foes = s.pieces.filter((p) => p.side === 1 && p.type === 'P');
      Object.assign(foes[0], { x: 0, y: 3, hp: 400, maxHp: 400 });
      Object.assign(foes[1], { x: 4, y: 3, hp: 400, maxHp: 400 });
      window.runUi.hud.setOrder({ id: 'fork2', deck: s.pieces.filter((p) => p.side === 0).map((p) => p.type) });
      c.setup?.(s);
      const n = s.pieces.find((p) => p.side === 0 && p.type === 'N' && p.x === 1);
      c.tap({ x: n.x, y: n.y }, true);
      c.tap({ x: 2, y: 2 }, true);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-tactic-plan.png`) });
    await page.evaluate(() => { void window.pawnisher.submit(); });
    const shots = [];
    await page.waitForTimeout(3000);
    for (const at of [3400, 3800, 4200, 4600, 5000, 5400]) {
      await page.waitForTimeout(400);
      const file = `battle-tactic-${at}`;
      await page.screenshot({ path: path.join(OUT, `${stamp}-${file}.png`) });
      shots.push(file);
    }
    await page.waitForFunction(() => window.pawnisher.phase === 'plan', null, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-tactic-log.png`) });
    await page.goto(URL); await page.waitForTimeout(300);
    return [];
  },
  // 공격 재생 중간 (4배 느리게): 이동 · 공격 이펙트 · 피해 숫자 · 재가 되는 처치
  async 'battle-attack'(page) {
    await page.goto(URL + '&fxslow'); await page.waitForTimeout(500);
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(() => { window.pawnisher.autoPlan(); void window.pawnisher.submit(); });
    const shots = [];
    for (const at of [1500, 3000, 4500]) {
      await page.waitForTimeout(1500);
      const file = `battle-attack-${at}`;
      await page.screenshot({ path: path.join(OUT, `${stamp}-${file}.png`) });
      shots.push(file);
    }
    await page.goto(URL); await page.waitForTimeout(300);
    return [];
  },
  // 기록 줄 (D-073): 내 턴 + 적 턴이 끝난 뒤 오른쪽 레일
  async 'battle-log'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    for (let i = 0; i < 3; i++) await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.waitForTimeout(400);
    return ['battle-log'];
  },
  // 턴 합계 (D-073): 내 실행이 끝나는 순간 판 가운데 큰 숫자 — 여러 번 찍어 잡는다
  async 'battle-summary'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    await page.evaluate(async () => { window.pawnisher.autoPlan(); await window.pawnisher.submit(); });
    await page.evaluate(() => { window.pawnisher.autoPlan(); void window.pawnisher.submit(); });
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${stamp}-battle-summary-${String(i).padStart(2, '0')}.png`) });
    }
    return [];
  },
  // 일시 정지 · 시운전 (D-085)
  async pause(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${stamp}-trial.png`) });
    await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(800);
    await page.tap('#btn-pause'); await page.waitForTimeout(300);
    return ['pause'];
  },
  // 출하 화면들 (D-085): 저장된 출하를 심고 → 타이틀 → 이어서 출하
  async reward(page) {
    await loadRun(page, { at: 'reward', title: '3층 통과', lines: ['나사 +34', '빠른 승리 (6/8턴) 나사 +10', '주문서 완수 · 나사 +20'], choices: [{ type: 'piece', options: ['N', 'R', 'P'] }, { type: 'enchant', options: ['E17', 'E18', 'E19'] }] });
    await page.screenshot({ path: path.join(OUT, `${stamp}-reward-piece.png`) });
    await page.tap('[data-pick="N"]'); await page.waitForTimeout(400);
    return ['reward-enchant'];
  },
  async map(page) {
    await loadRun(page, { at: 'map' }, { floor: 4, path: [0, 1, 0], map: Array.from({ length: 36 }, (_, i) => (i % 4 === 0 ? [{ kind: 'battle' }, { kind: 'elite' }, { kind: 'event', event: 'gambler' }] : i % 4 === 1 ? [{ kind: 'battle' }, { kind: 'shop' }] : i % 4 === 2 ? [{ kind: 'forge' }, { kind: 'battle' }, { kind: 'altar' }] : [{ kind: 'battle' }, { kind: 'event', event: 'smith' }])).map((f, i) => ((i + 1) % 12 === 0 ? [{ kind: 'boss' }] : f)) });
    return ['map'];
  },
  // 출하 대국 시작: 레일에 주문서 한 줄 (D-094)
  async 'battle-run'(page) {
    await loadRun(page, { at: 'map' });
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1200);
    return ['battle-run'];
  },
  // 검문! 정예 (D-096): 접사 딱지(왼쪽 위) + 길게 누르면 접사 설명
  async 'battle-elite'(page) {
    await loadRun(page, { at: 'map' }, { floor: 8, path: [0, 0, 0, 0, 0, 0, 0], map: Array.from({ length: 36 }, () => [{ kind: 'elite' }]) });
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-elite.png`) });
    await page.evaluate(() => {
      const c = window.pawnisher;
      const p = c.state.pieces.find((q) => q.affix);
      if (p) c.tap({ x: p.x, y: p.y }, true);
    });
    const pos = await page.evaluate(() => { const p = window.pawnisher.state.pieces.find((q) => q.affix); return p ? { x: p.x, y: p.y, w: window.pawnisher.state.width, h: window.pawnisher.state.height } : null; });
    if (pos) {
      const box = await page.locator('#board canvas').boundingBox();
      const cell = Math.min(box.width / pos.w, box.height / pos.h);
      const ox = box.x + (box.width - cell * pos.w) / 2;
      const oy = box.y + (box.height - cell * pos.h) / 2;
      const cx = ox + (pos.x + 0.5) * cell;
      const cy = oy + (pos.h - 1 - pos.y + 0.5) * cell;
      await page.evaluate(({ cx, cy }) => { const p = window.pawnisher.state.pieces.find((q) => q.affix); window.runUi.hud.showInfo(p, cx, cy); }, { cx, cy });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${stamp}-battle-elite-info.png`) });
    }
    return [];
  },
  // 반장 전장 규칙 (D-097): 비숍 반장 렌즈 조명 · 룩 반장 성벽
  async 'battle-boss'(page) {
    for (const boss of ['bishop', 'rook']) {
      await loadRun(page, { at: 'map' }, { floor: 12, bosses: [boss, 'knight'], path: Array(11).fill(0), map: Array.from({ length: 36 }, () => [{ kind: 'boss' }]) });
      await page.tap('[data-node="0"]'); await page.waitForTimeout(2200);
      await page.screenshot({ path: path.join(OUT, `${stamp}-battle-boss-${boss}.png`) });
    }
    return [];
  },
  // 지형 (D-097): 2막 검문! 판
  async 'battle-terrain'(page) {
    await loadRun(page, { at: 'map' }, { floor: 15, path: Array(14).fill(0), map: Array.from({ length: 36 }, () => [{ kind: 'elite' }]) });
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1400);
    return ['battle-terrain'];
  },
  // 묘수풀이 (D-097): 고정 판 · 레일 목표 줄 → 해법대로 가동
  async 'battle-puzzle'(page) {
    await loadRun(page, { at: 'puzzle', id: 0 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, `${stamp}-battle-puzzle.png`) });
    await page.tap('#btn-submit'); await page.waitForTimeout(2500);
    return ['battle-puzzle-fail'];
  },
  // 영입 (D-096): 검문! 보상 — 쓰러뜨린 적 기물 하나, 이형이면 거푸집도
  async 'reward-recruit'(page) {
    await loadRun(page, { at: 'reward', title: '검문 통과!', lines: ['나사 +60'], choices: [{ type: 'recruit', options: ['N', 'B', 'R'], variants: { N: 'hammer' } }] });
    return ['reward-recruit'];
  },
  async shop(page) {
    await loadRun(page, { at: 'map' });
    await page.tap('[data-node="1"]'); await page.waitForTimeout(400);
    return ['shop'];
  },
  async forge(page) {
    await loadRun(page, { at: 'forge' }, { gold: 300, loadout: { enchants: { E01: 1 }, cards: ['A01'], forge: { N: 3, P: 1 }, variants: {} } });
    return ['forge'];
  },
  async altar(page) {
    await loadRun(page, { at: 'altar' });
    await page.screenshot({ path: path.join(OUT, `${stamp}-altar.png`) });
    await page.tap('[data-gamble]'); await page.waitForTimeout(400);
    return ['altar-result'];
  },
  async event(page) {
    await loadRun(page, { at: 'event', id: 'gambler' });
    return ['event'];
  },
  // 결함 (D-101): 끼인 컨베이어(셋 다 대가) · 손상 수리 공방 · 봉인 대국
  async defect(page) {
    await loadRun(page, { at: 'event', id: 'jam' }, { sealed: 2, loadout: { enchants: {}, cards: [], forge: { N: 1 }, variants: {}, damage: { N: 2 } } });
    await page.screenshot({ path: path.join(OUT, `${stamp}-defect-event.png`) });
    await loadRun(page, { at: 'forge' }, { gold: 200, loadout: { enchants: {}, cards: [], forge: { N: 1 }, variants: {}, damage: { N: 2, P: 1 } } });
    await page.screenshot({ path: path.join(OUT, `${stamp}-defect-forge.png`) });
    await loadRun(page, { at: 'map' }, { sealed: 2 });
    await page.tap('[data-node="0"]'); await page.waitForTimeout(3600);
    return ['defect-sealed'];
  },
  // 진형 (D-102): 군단 보기에서 고르기 → 대국에 그대로
  async formation(page) {
    await loadRun(page, { at: 'map' }, { deck: ['K', 'Q', 'R', 'B', 'N', 'P', 'P', 'P', 'P'], loadout: { enchants: {}, cards: [], forge: {}, variants: {}, formation: 'lanes' } });
    await page.tap('[data-army]'); await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `${stamp}-formation-pick.png`) });
    await page.tap('[data-close]'); await page.waitForTimeout(200);
    await page.tap('[data-node="0"]'); await page.waitForTimeout(1500);
    return ['formation-battle'];
  },
  // 쾌감 · 아픔 (D-104): 연출이 한창일 때를 찍는다
  async juice(page) {
    await loadRun(page, { at: 'event', id: 'jam' });
    await page.tap('[data-ev="2"]'); await page.waitForTimeout(220);
    await page.screenshot({ path: path.join(OUT, `${stamp}-juice-loss.png`) });
    await loadRun(page, { at: 'map' }, { floor: 14, gold: 400, path: Array(13).fill(0), loadout: { enchants: { E01: 2 }, cards: [], forge: {}, variants: {} }, map: Array.from({ length: 36 }, () => [{ kind: 'shop' }]) });
    await page.tap('[data-node="0"]'); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${stamp}-juice-shop.png`) });
    await page.tap('[data-polish="0"]'); await page.waitForTimeout(260);
    await page.screenshot({ path: path.join(OUT, `${stamp}-juice-awaken.png`) });
    await loadRun(page, { at: 'event', id: 'gambler' }, { gold: 200, rng: 7 });
    await page.tap('[data-ev="0"]'); await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(OUT, `${stamp}-juice-gamble.png`) });
    return [];
  },
  async 'juice-battle'(page) {
    await scenarios.menu(page);
    await page.tap('[data-test]'); await page.tap('[data-sc="full"]'); await page.tap('[data-go]'); await page.waitForTimeout(1000);
    for (let t = 0; t < 10; t++) {
      await page.evaluate(() => { window.pawnisher.autoPlan(); void window.pawnisher.submit(); });
      for (let k = 0; k < 60; k++) {
        await page.waitForTimeout(100);
        const red = await page.evaluate(() => !!document.querySelector('.juice-vignette.bad'));
        if (red) { await page.waitForTimeout(110); await page.screenshot({ path: path.join(OUT, `${stamp}-juice-hurt.png`) }); return []; }
      }
      await page.waitForFunction(() => window.pawnisher.phase === 'plan', null, { timeout: 20000 });
    }
    return [];
  },
  // 볼륨 1 (D-105): 새 돌발 · 새 개조 보상
  async volume(page) {
    for (const id of ['dipping', 'auction', 'napping']) {
      await loadRun(page, { at: 'event', id });
      await page.screenshot({ path: path.join(OUT, `${stamp}-event-${id}.png`) });
    }
    await loadRun(page, { at: 'reward', title: '4층 통과', lines: ['나사 +37'], choices: [{ type: 'enchant', options: ['E22', 'E31', 'E41'] }] });
    return ['reward-volume'];
  },
  // 볼륨 2 (D-106): 새 반장 셋 · 공방 이형 고르기
  async boss2(page) {
    for (const boss of ['pawn', 'variant', 'affix']) {
      await loadRun(page, { at: 'map' }, { floor: 12, bosses: [boss, 'knight'], path: Array(11).fill(0), map: Array.from({ length: 36 }, () => [{ kind: 'boss' }]) });
      if (boss === 'pawn') await page.screenshot({ path: path.join(OUT, `${stamp}-boss2-map.png`) });
      await page.tap('[data-node="0"]'); await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(OUT, `${stamp}-boss2-${boss}.png`) });
    }
    await loadRun(page, { at: 'forge' }, { gold: 300, loadout: { enchants: {}, cards: [], forge: { N: 3 }, variants: {} } });
    await page.tap('[data-vpick="N"]'); await page.waitForTimeout(300);
    return ['forge-vpick'];
  },
  // 도면 (D-107): 지도 검문! 도면 · 도면 보상 · 공방 도면 없음 · 군단 창
  async blueprint(page) {
    const bps = ['spring', 'turret', 'boiler', 'scope', 'command', 'hammer'];
    await loadRun(page, { at: 'map' }, { floor: 4, path: [0, 0, 0], blueprints: ['hammer'], map: Array.from({ length: 36 }, (_, i) => (i % 2 ? [{ kind: 'battle' }, { kind: 'elite', blueprint: bps[i % 6] }] : [{ kind: 'elite', blueprint: bps[(i + 1) % 6] }, { kind: 'shop' }, { kind: 'battle' }])) });
    await page.screenshot({ path: path.join(OUT, `${stamp}-bp-map.png`) });
    await loadRun(page, { at: 'reward', title: '검문 통과!', lines: ['나사 +60'], choices: [{ type: 'blueprint', options: ['spring', 'scope'] }] });
    await page.screenshot({ path: path.join(OUT, `${stamp}-bp-reward.png`) });
    await loadRun(page, { at: 'forge' }, { gold: 300, blueprints: ['hammer'], loadout: { enchants: {}, cards: [], forge: { N: 3, P: 3 }, variants: {} } });
    await page.screenshot({ path: path.join(OUT, `${stamp}-bp-forge.png`) });
    await page.tap('[data-army]'); await page.waitForTimeout(300);
    return ['bp-army'];
  },
  async over(page) {
    await scenarios.menu(page);
    await page.evaluate((run) => { window.runUi.run = run; window.runUi.show(); }, { ...runFixture({ at: 'over', won: false }), floor: 9 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `${stamp}-over-lose.png`) });
    await page.evaluate((run) => { window.runUi.run = run; window.runUi.show(); }, { ...runFixture({ at: 'over', won: true }), floor: 36 });
    await page.waitForTimeout(600);
    return ['over-win'];
  },
};

(async () => {
  const name = process.argv[2] || 'all';
  const pc = process.argv.includes('--pc');
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(pc ? { viewport: { width: 1600, height: 900 } } : { viewport: { width: 915, height: 412 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL); await page.waitForTimeout(500);
  const list = name === 'all' ? Object.keys(scenarios) : [name];
  for (const s of list) {
    if (!scenarios[s]) { console.log(`NOT ASSESSED — 없는 시나리오: ${s}`); continue; }
    const shots = await scenarios[s](page);
    for (const shot of shots) {
      const file = path.join(OUT, `${stamp}-${shot}${pc ? '-pc' : ''}.png`);
      await page.screenshot({ path: file });
      console.log(`saved ${path.relative(process.cwd(), file)}`);
    }
  }
  console.log(errors.length ? `ERRORS ${JSON.stringify(errors)}` : 'no page errors');
  await browser.close();
})();
