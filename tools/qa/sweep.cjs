// 전수 화면 점검 하네스 (D-510): 에셋을 다 받은 뒤 한 번에 — 모든 플레이어 화면을 순서대로 띄워 찍고,
// 찍을 때마다 글자 점검(text-audit) 줄 · 콘솔/페이지 오류 · 실패한 그림 요청을 모아 sweep-report.md 한 장으로 낸다.
// 옛 배치 점검(hud-rarity · imp-assets · mp-fx · op-map)과 ui-audit · pb-scenes · film-observe의 장면을 한데 모았다.
//
// 사용: node tools/qa/sweep.cjs [915|667] [--calm] [--only map,battle,...] [--build] [--list]
//   915 = 915×412 DPR 2.625(기본) · 667 = 667×375 DPR 2 · --calm = 줄인 움직임(prefers-reduced-motion)
//   --only 묶음 이름(쉼표) — 시간 제한이 있으면 묶음별로 나눠 돌린다. 같은 날 · 같은 규격의 결과는 한 보고서로 합쳐진다.
//   --build = 먼저 npm run build (dist가 없으면 자동). 미리보기 서버는 빈 포트에 직접 띄우고 끝나면 닫는다(OBSERVE_URL을 주면 그 서버를 쓴다).
//   --list = 묶음 · 화면 목록만 찍는다.
// 결과: production/qa/evidence/sweep-<날짜>[-667][-calm]/<묶음번호>-<순번>-<화면>.png + sweep-report.md
//   컷신은 쪽마다 재생기의 박자 표지(.prologue[data-beat=hold] — 전환 · 카메라 계단 · 글자 찍기가 다 끝남)를 기다렸다 찍고, 막 입구 카드는 글이 다 찍힌 뒤 찍는다.
//   아직 없는 기능의 자리 장면(예: 2×2 특별 보스 D-513)은 skip()으로 「건너뜀」이 되고 실패로 세지 않는다.
//   보고서의 「대기 에셋」 열은 docs/asset-order-master.md 머리의 상태(재발주 · 대기 · 새 발주)를 화면과 짝지은 것 — 아직 빌린/임시 그림을 쓰는 화면.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn, execSync } = require('child_process');
const textAudit = require('./text-audit.cjs');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const small = args.includes('667');
const calm = args.includes('--calm');
const onlyArg = args.find((a, i) => args[i - 1] === '--only') ?? (args.find((a) => a.startsWith('--only='))?.slice(7));
const ONLY = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter(Boolean) : null;
const [VW, VH, DPR] = small ? [667, 375, 2] : [915, 412, 2.625];
const day = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const OUT = path.join(ROOT, 'production/qa/evidence', `sweep-${day}${small ? '-667' : ''}${calm ? '-calm' : ''}`);
const PARTS = path.join(OUT, '.parts');
const W = (ms) => new Promise((r) => setTimeout(r, ms));
/** 점검 대상 저장(meta): 입문 · 안내를 마친 사람 — 용어 사전이 다 열리고 모든 왕관을 고를 수 있다 */
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true,
  terms: ['버팀', '심장 톱니', '부적', '보충병', '기벽', '회피 반격', '기어 쇼크', '기절', '방열판', '부품', '청록 합 표지', '주황 곱 표지'], termsNew: [] };

// ── 장면 ─────────────────────────────────────────────────────────────
// 묶음 = [이름, 설명, 장면들]. 장면 = { name, assets: 이 화면이 쓰는 발주 번호, url?: 쿼리, meta?: 저장 덮기, run(ctx) }
// ctx: pg · A(함수, 인자) = evaluate · W(ms) · shot(이름) · film(이름, 최대 장) · tap(선택자) · tapAt(x, y) · open() · skip(까닭) · actCard(이름)
const api = (f) => async ({ A }) => A(f);
/** 자리만 잡아 둔 장면이 아직 찍을 것이 없을 때 (실패가 아니다) */
class Skip extends Error {}
const GROUPS = [
  ['title', '타이틀 · 메뉴 · 안내서 · 로딩 쪽지', [
    { name: 'title-press', assets: ['LD-02'], url: '?debug&opening', run: async ({ W, shot }) => { await W(1600); await shot('title-press'); } },
    { name: 'title-menu', assets: [], url: '?debug&opening', run: async ({ W, shot, tapAt }) => { await W(1200); await tapAt(VW / 2, VH * 0.72); await W(1400); await shot('title-menu'); } },
    { name: 'guide', assets: ['LD-01'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.guideMenu()); await W(1200); await shot('guide'); } },
    { name: 'load-tip', assets: ['LD-01', 'LD-02'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(1500); await A(() => window.sliceApi.tipNow('act')); await W(700); await shot('load-tip'); } },
  ]],
  ['prologue', '프롤로그 전 컷 (OP 새 컷 · 자막 판 · 화자 표지)', [
    { name: 'prologue', assets: ['OP-01', 'OP-02', 'OP-03', 'OP-04', 'ED-01', 'PT-09'], run: async ({ A, film }) => { await A(() => { void window.sliceApi.pro(); }); await film('prologue', 90); } },
  ]],
  ['drill', '입문 시험대 A · B · C · 부관 안내 · 첫 판 코치', [
    { name: 'drill-a', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.drill(0)); await W(1800); await shot('drill-a'); } },
    { name: 'drill-b', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.drill(1)); await W(1800); await shot('drill-b'); } },
    { name: 'drill-c', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.drill(2)); await W(1800); await shot('drill-c'); } },
    { name: 'adjutant', assets: ['LD-01'], run: async ({ pg, A, W, shot }) => {
      await A(() => window.sliceApi.tutNow()); await W(2400); await shot('drill-guide');
      await pg.locator('.win [data-next]').last().tap().catch(() => {}); await W(3500); await shot('adjutant');
    } },
    { name: 'coach', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.start(0)); await W(4500); await A(() => window.sliceApi.coachNow()); await W(900); await shot('coach'); } },
  ]],
  ['map', '지도 1~4막 (분대 현황판 · 노드 아이콘 · 현재 위치 왕관 · 미리보기)', [
    { name: 'map-acts', assets: ['MP-01', 'MP-02', 'MP-03', 'MP-04', 'MP-05', 'MP-06', 'TI-01', 'TI-02'], run: async ({ A, W, shot }) => {
      await A(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[1].hp = 20; q[2].cracked = true; q[2].hp = 9; });
      for (const act of [0, 1, 2, 3]) { await A((i) => { const a = window.sliceApi; a.setAct(i); a.map(2); }, act); await W(1000); await shot(`map-a${act + 1}`); }
    } },
    { name: 'map-peek', assets: ['MP-01', 'MP-02'], run: async ({ pg, A, W, shot }) => {
      await A(() => { const a = window.sliceApi; a.richRun(); a.setAct(0); a.map(2); }); await W(1000);
      const slot = pg.locator('.map-roster .mr-slot').nth(2);
      if (VW > 760 && await slot.count()) { await slot.tap(); await W(600); await shot('map-roster-peek'); }
      const node = pg.locator('.mnd.now').first(); if (await node.count()) { await node.tap(); await W(700); await shot('map-node-peek'); }
    } },
  ]],
  ['battle', '전투 (손패 · 등급 틀 · 턴 끝 단추 · 속전 계기 · 판 위 글 4갈래 · 이형 · 거대 주물 · 공정 판 · 초상 바크)', [
    { name: 'hud', assets: ['HB-01', 'HB-02', 'RF-04', 'KC-01'], run: async ({ pg, A, W, shot }) => {
      await A(() => window.sliceApi.startAt(1, 'battle')); await W(1800); await shot('hud-normal');
      const card = pg.locator('#hand [data-card]').first(); if (await card.count()) { await card.tap(); await W(600); await shot('hand-pick'); }
      await A(() => { window.slice().coins = 1; window.sliceApi.redraw(); }); await W(400); await shot('speed-low');
    } },
    { name: 'end-warn', assets: ['HB-01'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(1600); await A(() => { window.sliceApi.doom(); void window.sliceApi.warnNow(); }); await W(500); await shot('end-warn'); } },
    { name: 'channels', assets: ['DL-01', 'DL-02', 'PT-05'], run: async (c) => require('./pb-scenes.cjs').channels({ ...c, wait: c.W }) },
    { name: 'portraits', assets: ['PT-04', 'PT-05', 'PT-06', 'PT-07'], run: async ({ A, W, shot }) => {
      await A(() => { window.sliceApi.setAct(1); window.sliceApi.startAt(2, 'battle'); }); await W(1600);
      await A(() => window.sliceApi.taunt('start')); await W(900); await shot('bark-king'); await W(2600);
      await A(() => window.sliceApi.foeBark('gloat')); await W(900); await shot('bark-piece');
      await A(() => { window.sliceApi.setAct(0); window.sliceApi.startAt(1, 'check'); }); await W(1600);
      await A(() => window.sliceApi.taunt('start')); await W(900); await shot('bark-check');
    } },
    { name: 'variants', assets: ['P-01', 'P-02', 'P-03', 'P-04', 'P-05'], run: async ({ A, W, shot }) => {
      await A(() => window.sliceApi.battleWith(2, 'check', { enemy: ['K', 'R', 'N', 'Q', 'B', 'R', 'P'], forms: ['cannon', 'camel', 'hopper', 'archbishop', 'chancellor'], giants: undefined, process: undefined })); await W(1800); await shot('variants');
      await A(() => { const s = window.slice().s; const p = s.pieces.find((q) => q.side === 1 && q.form); if (p) window.sliceApi.peekAt({ x: p.x, y: p.y }); }); await W(600); await shot('variant-info');
    } },
    { name: 'giants', assets: ['G-01', 'G-02', 'G-03'], run: async ({ A, W, shot }) => {
      for (const g of ['P', 'R', 'Q']) { await A((t) => window.sliceApi.battleWith(2, 'check', { giants: [t], forms: undefined, process: undefined }), g); await W(1800); await shot(`giant-${g}`); }
    } },
    { name: 'process', assets: ['PB-01'], run: async ({ A, W, shot }) => {
      for (const k of ['conveyor', 'press', 'magnet', 'furnace', 'crack']) { await A((p) => window.sliceApi.battleWith(2, 'battle', { process: p, giants: undefined, forms: undefined }), k); await W(1800); await shot(`process-${k}`); }
    } },
    { name: 'unit-info', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(1800); await A(() => { const q = window.slice().s.pieces.find((x) => x.side === 1 && x.type === 'K'); window.sliceApi.peekAt({ x: q.x, y: q.y }); }); await W(600); await shot('peek-king'); } },
    { name: 'log', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(1800); await A(() => window.sliceApi.botMove()); await W(2600); await A(() => window.sliceApi.logPeek()); await W(500); await shot('log'); } },
    { name: 'ap-fx', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.parts(['relayGear', 'horseshoe'])); await A(() => window.sliceApi.startAt(1, 'battle')); await W(1600); await A(() => window.sliceApi.apFx()); await W(300); await shot('ap-fx'); } },
    { name: 'death', assets: ['TI-02'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'battle')); await W(1500); await A(() => { void window.sliceApi.die(); }); await W(420); await shot('death-rite'); await W(2400); await shot('death-after'); } },
    { name: 'stand', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(1800); await A(() => { void window.sliceApi.stand(); }); await W(1500); await shot('last-stand'); } },
    { name: 'help', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(2, 'battle')); await W(1800); await A(() => window.sliceApi.help('now')); await W(900); await shot('help-now'); } },
  ]],
  ['boss', '반장 등장 · 규칙 · 2단계 예고 · 2단계 컷인 7종 · 2×2 특별 보스(자리) · 격파 컷', [
    { name: 'boss-intro', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => window.sliceApi.intro(2, 'boss'));
      await pg.locator('.bossfx').waitFor({ state: 'attached', timeout: 8000 }).catch(() => {});
      await W(1200); await shot('boss-intro'); await pg.locator('.bossfx').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); await W(500); await shot('boss-board');
    } },
    { name: 'boss-rules', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.bossOf('plate', 1)); await W(2500); await A(() => document.getElementById('boss')?.click()); await W(700); await shot('boss-rules'); } },
    { name: 'p2-warn', assets: ['CI-01'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.startAt(1, 'boss')); await W(1800); await A(() => window.sliceApi.p2Warn()); await W(500); await shot('p2-warn'); } },
    { name: 'p2-cutins', assets: ['CI-01', 'CI-02', 'CI-03', 'CI-04', 'CI-05', 'CI-06', 'CI-07', 'CI-08'], run: async ({ A, W, shot }) => {
      for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2], ['magnet', 2], ['thorns', 3], ['alarm', 3], ['gilded', 3]]) {
        if (rule === 'gilded') await A(() => window.sliceApi.finalAt(13)); else await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]);
        await W(1800); await A((r) => { window.__p2 = window.sliceApi.p2Rise(r); }, rule); await W(640); await shot(`p2-${rule}`); await W(1800);
      }
    } },
    // 2×2 특별 보스 (D-513 · D-516 구현 중): 반장 판에 왼아래 본체 킹이 거대 묶음(Piece.giant)으로 서면 찍는다 — 아직 1칸 킹이면 건너뛴다
    { name: 'boss-2x2', assets: ['GB-01', 'GB-02', 'GB-03', 'GB-04', 'GB-05', 'GB-06', 'GB-07'], run: async ({ A, W, shot, skip }) => {
      let n = 0;
      for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2], ['magnet', 2], ['thorns', 3], ['alarm', 3], ['gilded', 3]]) {
        if (rule === 'gilded') await A(() => window.sliceApi.finalAt(13)); else await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]);
        await W(1800);
        if (!(await A(() => window.slice().s.pieces.some((p) => p.side === 1 && p.type === 'K' && p.giant)))) continue;
        n += 1; await shot(`boss2x2-${rule}`);
      }
      if (!n) skip('2×2 특별 보스가 아직 판에 서지 않는다 (D-513 구현 전)');
    } },
    { name: 'boss-fall', assets: ['ED-01', 'PT-09'], run: async ({ A, W, film }) => { await A(() => { window.sliceApi.campaign(0); window.sliceApi.fallCut('plate'); }); await W(600); await film('boss-fall', 14); } },
  ]],
  ['reward', '보상 (등급 틀 · 반짝임) · 부품 · 영입 · 핵심 부품 · 슬롯 가득', [
    { name: 'reward', assets: ['RF-01', 'RF-02', 'RF-03', 'RF-04'], run: async ({ A, W, shot }) => {
      for (let seed = 1; seed < 60; seed++) { await A((k) => { window.sliceApi.seed(k); window.sliceApi.reward(); }, seed); await W(250); const g = await A(() => [...document.querySelectorAll('[data-grade]')].map((e) => e.dataset.grade).join(',')); if (/rare/.test(g) && /gold/.test(g)) break; }
      await W(500); await shot('reward-pop'); await W(1800); await shot('reward');
    } },
    { name: 'parts', assets: ['RF-01', 'RF-03'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.partPick()); await W(1600); await shot('part-pick'); } },
    { name: 'recruit', assets: ['PT-08'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.recruit()); await W(1600); await shot('recruit'); } },
    { name: 'kit', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.kit()); await W(1600); await shot('kit'); } },
    { name: 'full', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.full()); await W(1400); await shot('parts-full'); } },
  ]],
  ['shop', '고물상', [
    { name: 'shop', assets: ['RF-01', 'RF-03', 'RF-04'], run: async ({ pg, A, W, shot }) => {
      await A(() => { window.sliceApi.gold(400); window.sliceApi.shop(); }); await W(1800); await shot('shop');
      await A(() => window.sliceApi.gold(10)); await A(() => window.sliceApi.shop()); await W(1600); await pg.locator('[data-slot]').first().click({ force: true }).catch(() => {}); await W(400); await shot('shop-unaffordable');
    } },
  ]],
  ['forge', '작업대 (수리 · 손질 · 버팀 · 덱 덜기)', [
    { name: 'forge', assets: [], run: async ({ pg, A, W, shot }) => { await A(() => window.sliceApi.forge()); await W(1800); await shot('forge'); await pg.click('[data-slot="repair"]').catch(() => {}); await W(500); await shot('forge-repair'); } },
    { name: 'refine', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.refine()); await W(1400); await shot('refine'); } },
    { name: 'brace', assets: ['TI-02'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.brace()); await W(1400); await shot('brace'); } },
    { name: 'deck-remove', assets: ['RF-04'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.deckView('remove')); await W(1400); await shot('deck-remove'); } },
  ]],
  ['event', '사건 (NPC · 종이왕 · 말 없는 사건 · 정보 쪽 · 결과 · 결과 코드 FX 8종)', [
    { name: 'event-npc', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await W(4500); await shot('event-npc');
      await pg.click("[data-info='1']").catch(() => {}); await W(500); await shot('event-info');
    } },
    { name: 'event-result', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => { window.sliceApi.gold(200); window.sliceApi.event('tinker'); }); await W(3000);
      await pg.click(".choice[data-slot='0']").catch(() => {}); await W(500); await pg.click(".choice[data-slot='0']").catch(() => {}); await W(4500); await shot('event-result-fx'); await W(5000); await shot('event-result');
    } },
    { name: 'event-king', assets: ['PT-04'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.event('crownAltar')); await W(5200); await shot('event-king'); } },
    { name: 'event-ponder', assets: ['PT-04', 'TI-01', 'TI-02'], run: async ({ A, W, shot }) => { await A(() => { window.sliceApi.gold(80); window.sliceApi.event('safe'); }); await W(4200); await shot('event-ponder'); } },
    { name: 'result-fx', assets: [], run: async ({ pg, A, W, shot, open }) => {
      for (const k of ['molten', 'quench', 'rust', 'repair', 'upgrade', 'break', 'screws', 'crate']) {
        await open();
        await A((kk) => { const a = window.sliceApi; a.richRun(); window.__fxSlow = 6; a.resultFx(kk); }, k);
        await pg.waitForSelector('canvas.rfx', { timeout: 12000, state: 'attached' }).catch(() => null);
        await W(1350); await shot(`fx-${k}`);
      }
    } },
  ]],
  ['wager', '판돈 (창 · 칩 · 달성 · 깨짐 · 이김/짐)', [
    { name: 'wager', assets: ['WG-01'], run: async ({ pg, A, W, shot }) => {
      await A(() => window.sliceApi.startAt(1, 'battle')); await W(1500); await A(() => window.sliceApi.bet()); await W(1000); await shot('wager-window');
      const yes = pg.locator('[data-yes]').first(); if (await yes.count()) { await yes.tap(); await W(1300); await shot('wager-chip'); }
    } },
    { name: 'wager-win', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => { const a = window.sliceApi; a.richRun(); a.startAt(1, 'battle'); }); await W(1600); await A(() => window.sliceApi.betSet('kills')); await W(400);
      await A(() => window.sliceApi.betReach()); await W(300); await shot('chip-reach');
      await A(() => { window.__fxSlow = 6; void window.sliceApi.betEnd(true); }); await pg.waitForSelector('canvas.rfx', { timeout: 5000, state: 'attached' }).catch(() => null); await W(1350); await shot('wager-win');
    } },
    { name: 'wager-lose', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => { const a = window.sliceApi; a.richRun(); a.startAt(1, 'battle'); }); await W(1600); await A(() => window.sliceApi.betSet('unhit')); await W(300);
      await A(() => window.sliceApi.betBreak()); await W(250); await shot('chip-break');
      await A(() => { window.__fxSlow = 6; void window.sliceApi.betEnd(false); }); await pg.waitForSelector('canvas.rfx', { timeout: 5000, state: 'attached' }).catch(() => null); await W(1350); await shot('wager-lose');
    } },
  ]],
  ['act', '막 쉼터 (막 장부 · 막 입구 카드 · 그림자 컷)', [
    // 막 반장 뒤: 막 장부 → [다음으로] → (이야기 출하면 동료 장면 — 건너뜀) → 다음 막 입구 카드(2막 act-2 · 3막 chained-door · 종막 act-4)
    { name: 'act-clear', assets: ['AC-01', 'AC-02', 'AC-03'], run: async ({ A, W, shot, open, actCard }) => {
      for (const act of [0, 1, 2]) {
        if (act) await open();
        await A(() => window.sliceApi.startAt(1, 'boss')); await W(1500);
        await A((i) => { const a = window.sliceApi; a.richRun(); a.setAct(i); a.nextAct(); }, act); await W(4000);
        if (!act) await shot('act-ledger');
        await actCard(`act-card-a${act + 2}`);
      }
    } },
    { name: 'shadow', assets: ['CN-01', 'CN-02', 'CN-03', 'ED-05'], run: async ({ A, film }) => { await A(() => { void window.sliceApi.shadow(1); }); await film('shadow', 12); } },
  ]],
  ['ending', '엔딩 K(왕관 결말) · T(진엔딩) · F(패배) 전 컷 · 출하 끝 장부', [
    { name: 'end-k', assets: ['ED-01', 'ED-02', 'ED-03', 'ED-04', 'ED-05', 'CN-04', 'CN-05', 'CN-06', 'PT-09'], run: async ({ pg, A, W, shot, film }) => {
      await A(() => { void window.sliceApi.endFlow(0); });
      await pg.locator('.promotion').waitFor({ timeout: 10000 }); await W(1800);
      await pg.locator('.pm-dialogue').tap().catch(() => {}); await shot('k-throne');
      await pg.locator('[data-lay]').tap(); await film('k-look', 10); await W(400); await shot('k-throne-after');
      await pg.locator('[data-promote]').tap(); await film('k', 50);
      await pg.locator('.credits').waitFor({ timeout: 8000 }).catch(() => {}); await W(900); await shot('k-credits');
    } },
    { name: 'end-t', assets: ['ED-01', 'ED-06', 'ED-07', 'ED-08', 'PT-09'], run: async ({ A, film }) => { await A(() => { void window.sliceApi.trueEnd(); }); await film('t', 40); } },
    { name: 'end-f', assets: ['ED-01', 'ED-09', 'ED-10', 'ED-11', 'PT-09'], run: async ({ A, film }) => { await A(() => { void window.sliceApi.defeatCut(); }); await film('f', 16); } },
    { name: 'run-clear', assets: [], run: async ({ pg, A, W, shot }) => {
      await A(() => window.sliceApi.startAt(3, 'boss')); await W(1500); await A(() => { const a = window.sliceApi; a.richRun(); a.setAct(2); a.endNow(true); }); await W(1400); await shot('run-clear');
      await pg.click('[data-cr-next]').catch(() => {}); await W(400); await shot('run-clear-makers');
    } },
    { name: 'run-fail', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.end(false)); await W(2800); await shot('run-fail'); } },
  ]],
  ['credits', '크레딧', [
    { name: 'credits', assets: ['ED-12'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.credits()); await W(1500); await shot('credits-0'); await W(4500); await shot('credits-1'); } },
  ]],
  ['promote', '승급 화면', [
    { name: 'promote', assets: ['CN-04'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.promote(3)); await W(1600); await shot('promote'); } },
  ]],
  ['codex', '도감 · 분대 · 덱 · 원수 · 기록', [
    { name: 'ledger', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.ledger()); await W(1200); await shot('ledger'); } },
    { name: 'crew', assets: ['TI-01', 'TI-02', 'PT-08'], run: async ({ A, W, shot }) => { await A(() => { const a = window.sliceApi; a.richRun(); const q = a.squad(); q[1].quirk = 'stubborn'; q[1].doorsSpent = 1; q[2].cracked = true; a.crew(); }); await W(1200); await shot('crew'); } },
    { name: 'deck', assets: ['RF-04', 'KC-01'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.deckView('view')); await W(1400); await shot('deck'); } },
    { name: 'nemesis', assets: [], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.nemesisOf()); await W(1200); await shot('nemesis'); } },
  ]],
  ['glossary', '용어집', [
    { name: 'dict', assets: ['TI-01', 'TI-02'], run: async ({ A, W, shot }) => { await A(() => window.sliceApi.help('dict')); await W(1200); await shot('dict'); } },
  ]],
];

// ── 발주 상태 (docs/asset-order-master.md 머리) ───────────────────────────
/** 상자 번호 → 상태: done(받음) · reorder(받아 쓰며 재발주) · partial(일부 재발주) · wait(아직 — 빌린 그림) · cancel(취소) */
const orderStatus = () => {
  const src = fs.readFileSync(path.join(ROOT, 'docs/asset-order-master.md'), 'utf8').split('\n');
  const st = {};
  src.forEach((ln, i) => {
    const m = /^## ([A-Z]+-\d+)\s*·\s*(.*)$/.exec(ln);
    if (!m) return;
    const head = m[2], segs = head.split(' · '), last = segs[segs.length - 1];
    // 상자 본문 = 다음 「## 」 머리 앞까지 (프롬프트 코드 블록은 뺀다)
    let end = src.findIndex((l, j) => j > i && /^## /.test(l)); if (end < 0) end = src.length;
    const body = src.slice(i + 1, end).join('\n').replace(/```[\s\S]*?```/g, '');
    let s;
    if (/취소/.test(head)) s = 'cancel';
    else if (/재발주/.test(last) && !/받음 \(재발주본/.test(last)) s = 'reorder';
    else if (/받음|수령/.test(head)) s = 'done';
    else if (/받음 · 반입|수령 · 반입|반입 완료|^- \*\*받음/m.test(body)) s = /만 재발주\*\*|재발주\*\*/.test(body) ? 'partial' : 'done';
    else s = 'wait';
    st[m[1]] = s;
  });
  return st;
};
const STATUS_KO = { reorder: '재발주(받은 그림 임시)', partial: '일부 재발주', wait: '대기(빌린 그림)' };

// ── 서버 ─────────────────────────────────────────────────────────────
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
const ensureServer = async () => {
  if (process.env.OBSERVE_URL) return { base: process.env.OBSERVE_URL.replace(/\/?$/, '/'), stop: () => {} };
  if (args.includes('--build') || !fs.existsSync(path.join(ROOT, 'dist/index.html'))) execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  const port = await freePort();
  const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  const base = `http://localhost:${port}/`;
  for (let k = 0; k < 60; k++) { try { const r = await fetch(base); if (r.ok) break; } catch { /* 아직 */ } await W(500); }
  child.unref();
  return { base, stop: () => { try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch { /* 이미 닫힘 */ } } } };
};

// ── 보고서 ───────────────────────────────────────────────────────────
const writeReport = () => {
  const st = orderStatus();
  const parts = fs.existsSync(PARTS) ? fs.readdirSync(PARTS).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(PARTS, f), 'utf8'))) : [];
  parts.sort((a, b) => a.index - b.index);
  const rows = parts.flatMap((g) => g.scenes.map((s) => ({ g, s })));
  const pend = (ids) => ids.filter((id) => STATUS_KO[st[id]]).map((id) => `${id}(${st[id] === 'wait' ? '대기' : st[id] === 'reorder' ? '재발주' : '일부'})`);
  const shots = rows.reduce((n, r) => n + r.s.shots.length, 0);
  const txt = rows.reduce((n, r) => n + r.s.txt.length, 0);
  const errs = rows.reduce((n, r) => n + r.s.errors.length, 0);
  const fails = rows.filter((r) => r.s.fail);
  const L = [];
  L.push(`# 전수 화면 점검 ${day} · ${VW}×${VH} DPR ${DPR}${calm ? ' · 줄인 움직임' : ''}`, '');
  L.push(`명령: \`node tools/qa/sweep.cjs${small ? ' 667' : ''}${calm ? ' --calm' : ''}\` · 묶음 ${parts.length}/${GROUPS.length} · 화면 ${rows.length} · 스크린샷 ${shots} · TXT ${txt} · 오류 ${errs} · 못 찍은 화면 ${fails.length}`, '');
  const missing = GROUPS.filter(([n]) => !parts.some((g) => g.group === n)).map(([n]) => n);
  if (missing.length) L.push(`아직 돌리지 않은 묶음: ${missing.join(', ')} (\`--only ${missing.join(',')}\`)`, '');
  L.push('이 보고서는 하네스가 모은 기록이다 — 판정(겹침 · 잘림 · 화풍)은 스크린샷을 직접 보고 내린다.', '');
  L.push('| 묶음 | 화면 | 스크린샷 | TXT | 오류 | 대기 에셋 쓰는 화면 | 걸린 시간 |', '|---|---|---|---|---|---|---|');
  for (const { g, s } of rows) {
    const sh = s.shots.length ? (s.shots.length > 3 ? `${s.shots[0]} … ${s.shots[s.shots.length - 1]} (${s.shots.length}장)` : s.shots.join('<br>')) : '—';
    L.push(`| ${g.group} | ${s.name}${s.fail ? ' **실패**' : ''}${s.skip ? ' (건너뜀)' : ''} | ${sh} | ${s.txt.length} | ${s.errors.length} | ${pend(s.assets).join(' ') || '—'} | ${s.sec}s |`);
  }
  L.push('', '## 대기 · 재발주 에셋 → 화면', '');
  const byAsset = {};
  for (const { s } of rows) for (const id of s.assets) if (STATUS_KO[st[id]]) (byAsset[id] ??= []).push(s.name);
  for (const id of Object.keys(st).filter((k) => STATUS_KO[st[k]])) L.push(`- ${id} — ${STATUS_KO[st[id]]}: ${byAsset[id]?.join(' · ') || '(이 하네스가 찍는 화면 없음)'}`);
  const skips = rows.filter((r) => r.s.skip);
  if (skips.length) { L.push('', '## 건너뛴 자리 장면 (아직 없는 기능)', ''); for (const { g, s } of skips) L.push(`- ${g.group}/${s.name}: ${s.skip}`); }
  if (fails.length) { L.push('', '## 못 찍은 화면', ''); for (const { g, s } of fails) L.push(`- ${g.group}/${s.name}: ${s.fail}`); }
  L.push('', '## TXT · 오류 줄', '');
  for (const { g, s } of rows) {
    if (!s.txt.length && !s.errors.length) continue;
    L.push(`### ${g.group}/${s.name}`, '');
    for (const t of s.txt) L.push(`- TXT ${t}`);
    for (const e of s.errors) L.push(`- ERR ${e}`);
    L.push('');
  }
  fs.writeFileSync(path.join(OUT, 'sweep-report.md'), L.join('\n') + '\n');
  return { rows: rows.length, shots, txt, errs, fails: fails.length };
};

// ── 실행 ─────────────────────────────────────────────────────────────
(async () => {
  if (args.includes('--list')) { GROUPS.forEach(([n, d, sc], i) => console.log(`${String(i + 1).padStart(2, '0')} ${n} — ${d}: ${sc.map((s) => s.name).join(', ')}`)); return; }
  const bad = (ONLY ?? []).filter((n) => !GROUPS.some(([g]) => g === n));
  if (bad.length) { console.error(`모르는 묶음: ${bad.join(', ')} — --list로 확인`); process.exit(2); }
  fs.mkdirSync(PARTS, { recursive: true });
  const T0 = Date.now();
  const srv = await ensureServer();
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    for (const [gi, [group, desc, scenes]] of GROUPS.entries()) {
      if (ONLY && !ONLY.includes(group)) continue;
      const GG = String(gi + 1).padStart(2, '0');
      for (const f of fs.readdirSync(OUT)) if (f.startsWith(`${GG}-`) && f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
      let nn = 0;
      const res = { group, desc, index: gi, scenes: [] };
      for (const sc of scenes) {
        const t0 = Date.now();
        const ctx0 = await br.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, reducedMotion: calm ? 'reduce' : 'no-preference' });
        const pg = await ctx0.newPage();
        const rec = { name: sc.name, assets: sc.assets, shots: [], txt: [], errors: [], fail: null, skip: null, sec: 0 };
        pg.on('pageerror', (e) => rec.errors.push(`PAGEERROR ${e.message.slice(0, 200)}`));
        pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) rec.errors.push(`CONSOLE ${m.text().slice(0, 200)}`); });
        pg.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) rec.errors.push(`HTTP ${r.status()} ${r.url().replace(srv.base, '/')}`); });
        // 부른 함수가 약속(Promise)을 돌려줘도 기다리지 않는다 — 컷 · 쪽지처럼 사람이 넘길 때까지 안 끝나는 화면이 많다(기다림은 W로)
        const A = (f, a) => pg.evaluate(({ src, arg }) => { const r = (0, eval)(`(${src})`)(arg); return r && typeof r.then === 'function' ? null : r; }, { src: f.toString(), arg: a });
        const Wp = (ms) => pg.waitForTimeout(ms);
        /** buf = 미리 찍어 둔 화면(곧 사라지는 화면을 놓치지 않으려고) — 없으면 지금 찍는다 */
        const shot = async (n, buf) => {
          nn += 1;
          const file = `${GG}-${String(nn).padStart(2, '0')}-${n}.png`;
          if (buf) fs.writeFileSync(path.join(OUT, file), buf); else await pg.screenshot({ path: path.join(OUT, file) });
          rec.shots.push(file);
          for (const t of await textAudit(pg)) if (!rec.txt.includes(t)) rec.txt.push(t);
        };
        const tapAt = (x, y) => pg.touchscreen.tap(Math.round(x), Math.round(y));
        const tap = async (sel) => { const e = pg.locator(sel).first(); if (!(await e.count())) return false; await e.tap(); return true; };
        /** 컷신이 한 쪽에서 멈출 때까지 (박자 표지 hold · 서 있는 제목 카드 · 로고 뒤 「눌러 출하」 · 컷신 끝) — 표지가 없는 옛 빌드면 시간으로 */
        const settle = async () => {
          const ok = await pg.waitForFunction(() => {
            const el = document.querySelector('.prologue');
            return !el || el.dataset.beat === 'hold' || el.classList.contains('go-wait') || !!el.querySelector('.film-title:not(.out)');
          }, null, { timeout: 20000, polling: 100 }).then(() => true, () => false);
          if (!ok) { await Wp(calm ? 250 : 700); if (await pg.locator('.cut-sub.typing').count()) await Wp(1500); return; }
          // 제목 카드는 계단으로 차례로 선다 — 다 설 때까지 조금 더
          if (await pg.locator('.prologue .film-title:not(.out)').count()) await Wp(calm ? 200 : 800);
        };
        /** 컷신 하나를 끝까지 넘기며 쪽마다 한 장 (최대 max장): 쪽이 다 선 뒤(전환 · 카메라 · 글자 찍기 끝) 찍고 탭으로 넘긴다 */
        const film = async (name, max = 40) => {
          await pg.locator('.prologue').waitFor({ state: 'attached', timeout: 10000 });
          let k = 0;
          for (let it = 0; it < 160 && (await pg.locator('.prologue').count()); it++) {
            await settle();
            if (!(await pg.locator('.prologue').count())) break;
            if (k < max) { k += 1; await shot(`${name}-${String(k).padStart(2, '0')}`); }
            if (await pg.locator('.prologue.go-wait').count()) { await tapAt(VW / 2, VH * 0.35).catch(() => {}); break; }
            await pg.locator('.prologue').tap({ position: { x: Math.round(VW / 2), y: Math.round(VH * 0.35) }, timeout: 3000 }).catch(() => {});
            // 탭이 먹으면 표지가 hold를 떠난다 — 같은 쪽을 두 번 찍지 않게 잠깐 기다린다
            await pg.waitForFunction(() => { const el = document.querySelector('.prologue'); return !el || el.dataset.beat !== 'hold'; }, null, { timeout: 1500, polling: 50 }).catch(() => {});
          }
          await pg.locator('.prologue').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
        };
        /** 막 장부에서 [다음으로]를 눌러 막 입구 카드까지 가서, 카드 글이 다 찍힌 뒤 한 장 (사이 동료 장면은 건너뛴다) */
        const actCard = async (name) => {
          const t1 = Date.now() + 40000;
          let went = false;
          while (Date.now() < t1 && !(await pg.locator('.actcard').count())) {
            const sk = pg.locator('.prologue .cut-skip');
            if (await sk.count()) { await sk.first().click({ force: true }).catch(() => {}); await pg.locator('.prologue').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {}); }
            else if (!went && (await pg.locator('[data-go]').count())) { went = true; await pg.locator('[data-go]').last().click({ force: true }).catch(() => {}); }
            await Wp(150);
          }
          await pg.locator('.actcard.named').waitFor({ state: 'attached', timeout: 10000 });
          // 카드는 정해진 시간 뒤 저절로 닫힌다 — 무거운 기기(DPR 2.625)에선 글자 찍기가 늦어 끝나는 순간과 닫힘이 거의 겹친다.
          // 그래서 쪽 글이 멈출 때마다 미리 한 장 떠 두고, 다 찍히면 그 순간을, 먼저 닫히기 시작하면(철문 · 카드 사라짐) 마지막으로 떠 둔 장을 쓴다.
          let buf = null, last = '', still = 0, opened = false;
          for (const t2 = Date.now() + 20000; Date.now() < t2;) {
            const st = await pg.evaluate(() => { const c = document.querySelector('.actcard'); const s = c?.querySelector('.cut-sub'); return { gone: !c || !!document.querySelector('.ld-tip-wrap'), shut: !!document.querySelector('.shutterfx'), typing: !!s?.classList.contains('typing'), txt: s?.querySelector('.cut-lines')?.textContent ?? '' }; });
            if (process.env.SWEEP_DEBUG) console.log(JSON.stringify(st));
            // 철문은 카드를 열 때도 잠깐 있다 — 한 번 걷힌 뒤 다시 서면 닫히는 중
            if (st.gone || (opened && st.shut)) break;
            if (!st.shut) opened = true;
            if (!st.typing && st.txt.trim()) { buf = await pg.screenshot(); break; }
            still = st.txt && st.txt === last ? still + 1 : 0; last = st.txt;
            if (still === 2) buf = await pg.screenshot();
            await Wp(100);
          }
          if (process.env.SWEEP_DEBUG) console.log('actCard', name, buf ? 'buf' : 'none');
          if (!buf) throw new Error(`${name}: 막 입구 카드를 찍지 못했다`);
          await shot(name, buf);
        };
        const open = async () => {
          const url = srv.base + (sc.url ?? '?debug');
          await pg.goto(url);
          await pg.evaluate((m) => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, JSON.stringify({ ...META, ...(sc.meta ?? {}) }));
          await pg.goto(url);
          await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
          await pg.waitForFunction(() => window.sliceApi, null, { timeout: 10000 });
          await Wp(500);
        };
        const skip = (why) => { throw new Skip(why); };
        const ctx = { pg, A, W: Wp, shot, film, tap, tapAt, open, skip, actCard };
        try {
          await open();
          await Promise.race([sc.run(ctx), W(180000).then(() => { throw new Error('시간 초과 180초'); })]);
          if (!rec.shots.length) throw new Error('찍힌 장면 없음');
        } catch (e) {
          if (e instanceof Skip) rec.skip = e.message;
          else {
          rec.fail = e.message.split('\n')[0].slice(0, 200);
          try { await shot(`${sc.name}-FAIL`); } catch { /* 페이지가 닫혔다 */ }
          }
        }
        rec.sec = Math.round((Date.now() - t0) / 1000);
        res.scenes.push(rec);
        console.log(`${GG} ${group}/${sc.name}: ${rec.shots.length}장 · TXT ${rec.txt.length} · 오류 ${rec.errors.length}${rec.fail ? ` · 실패 ${rec.fail}` : ''}${rec.skip ? ` · 건너뜀 ${rec.skip}` : ''} · ${rec.sec}s`);
        await ctx0.close().catch(() => {});
      }
      fs.writeFileSync(path.join(PARTS, `${GG}-${group}.json`), JSON.stringify(res, null, 1));
    }
  } finally {
    await br.close();
    srv.stop();
  }
  const r = writeReport();
  console.log(`SWEEP ${path.relative(ROOT, OUT)} · 화면 ${r.rows} · 스크린샷 ${r.shots} · TXT ${r.txt} · 오류 ${r.errs} · 못 찍음 ${r.fails} · ${Math.round((Date.now() - T0) / 1000)}s`);
  console.log(`보고서: ${path.relative(ROOT, path.join(OUT, 'sweep-report.md'))}`);
  // 남은 핸들(미리보기 서버 · 브라우저 찌꺼기)이 프로세스를 붙잡지 않게 끝낸다
  process.exitCode = r.fails ? 1 : 0;
  setTimeout(() => process.exit(), 300);
})().catch((e) => { console.error(e); process.exit(2); });
