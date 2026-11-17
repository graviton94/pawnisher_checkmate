// 배경 음악 실화면 점검 (D-545): 장면마다 곡 파일이 그때 받아지고(시작 화면에서는 받지 않는다) · 404 · 오류 없음 ·
// 장면 → 곡 배정 · 설정 크기 · 끔 · 백그라운드 멈춤. 헤드리스라 귀로 듣지는 못한다 — 네트워크 · 재생 노드 · 음량 노드 값을 센다.
// 사용: node tools/slice-observe.cjs music   (non-release 빌드 + vite preview. 결과 production/qa/evidence/<날짜>-slice-music-*.png)
module.exports = async (pg, shot) => {
  const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
  const wait = (ms = 500) => pg.waitForTimeout(ms);
  const bad = [];
  const errs = [];
  const reqs = [];
  pg.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  pg.on('pageerror', (e) => errs.push(e.message));
  pg.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400) bad.push(`${r.status()} ${u}`);
    if (u.includes('/audio/music/')) reqs.push({ f: u.split('/').pop(), t: Math.round(Date.now()) });
    if (u.includes('/audio/music/') && process.env.MUSIC_TRACE) console.log('  ↳', r.status(), u.split('/').pop());
  });
  await pg.addInitScript(() => {
    const w = window;
    w.__mu = { ctxs: [], plays: [], outs: [] };
    const AC = w.AudioContext;
    w.AudioContext = class extends AC {
      constructor(...a) { super(...a); w.__mu.ctxs.push(this); }
    };
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dst, ...r) {
      if (dst instanceof AudioDestinationNode && this instanceof GainNode && this.context.sampleRate === 32000) w.__mu.outs.push(this);
      return conn.call(this, dst, ...r);
    };
    const st = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      const d = this.buffer?.duration ?? 0;
      if (d > 60) w.__mu.plays.push({ dur: +d.toFixed(1), rate: +this.playbackRate.value.toFixed(3), loop: this.loop, t: Math.round(performance.now()) });
      return st.apply(this, a);
    };
  });
  // 1) 시작: 첫 누름 전에는 곡을 받지 않는다 · 부팅 시간
  const t0 = Date.now();
  await pg.goto(BASE);
  await pg.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  const t1 = Date.now();
  await pg.reload();
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  const boot = Date.now() - t1;
  await wait(1500);
  console.log(`BOOT ${boot} ms (첫 열기 ${t1 - t0} ms) · 첫 누름 전 곡 요청 ${reqs.length}`);
  const preTap = reqs.length;
  await pg.touchscreen.tap(450, 300);
  await wait(2500);
  const play = async () => pg.evaluate(() => window.__mu.plays.at(-1));
  const title = await play();
  console.log('TITLE 곡', JSON.stringify(title), '요청', reqs.map((r) => r.f).join(','));
  await shot('music-1-title');
  // 2) 장면 → 곡 (debug API)
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
  await wait(300);
  await pg.touchscreen.tap(450, 380);
  await wait(800);
  const stage = async (name, fn, ms = 2500) => {
    const n0 = reqs.length;
    const p0 = await pg.evaluate(() => window.__mu.plays.length);
    await pg.evaluate(fn);
    await wait(ms);
    const p = await pg.evaluate((k) => window.__mu.plays.slice(k), p0);
    const r = reqs.slice(n0).map((x) => x.f);
    console.log(`SCENE ${name.padEnd(8)} 새 재생 ${JSON.stringify(p)} 받음 [${r.join(',')}]`);
    return { p, r };
  };
  const out = {};
  out.map = await stage('map', () => window.sliceApi.map(2));
  out.map2 = await stage('map→map', () => window.sliceApi.map(2), 800);
  await shot('music-2-map');
  out.act1 = await stage('act1', () => { window.sliceApi.setAct(0); window.sliceApi.startAt(1, 'battle'); });
  await shot('music-3-act1');
  out.mapBack = await stage('map(왈츠 캐시)', () => window.sliceApi.map(2));
  out.act2 = await stage('act2', () => { window.sliceApi.setAct(1); window.sliceApi.startAt(2, 'battle'); });
  out.act3 = await stage('act3', () => { window.sliceApi.setAct(2); window.sliceApi.startAt(3, 'battle'); });
  // C1 톱니 칩 (D-548): 고물상 · 작업대 · 사건 = gear(105초), 검문 = gear-boss(96.4초), 지도는 왈츠로 돌아간다
  out.shop = await stage('shop', () => { window.sliceApi.gold(120); window.sliceApi.shop(); });
  await shot('music-3b-shop');
  out.forge = await stage('forge', () => window.sliceApi.forge(), 1200);
  await shot('music-3c-forge');
  out.event = await stage('event', () => window.sliceApi.event(window.sliceApi.eventIds[0]), 1200);
  await shot('music-3d-event');
  out.mapW = await stage('map(왈츠)', () => window.sliceApi.map(2));
  out.check = await stage('check', () => { window.sliceApi.setAct(0); window.sliceApi.startAt(1, 'check'); });
  await shot('music-3e-check');
  const dur = (o) => o.p.at(-1)?.dur;
  const c1 = [
    ['shop = gear', dur(out.shop) === 105 && (out.shop.r.includes('gear.ogg') || out.shop.r.includes('gear.m4a'))],
    ['forge · event = 이어 틀기(새 재생 · 요청 0)', !out.forge.p.length && !out.forge.r.length && !out.event.p.length && !out.event.r.length],
    ['map = 왈츠로', dur(out.mapW) === 96 && !out.mapW.r.some((f) => f.startsWith('gear'))],
    ['check = gear-boss', dur(out.check) === 96.4 && out.check.r.some((f) => f.startsWith('gear-boss'))],
  ];
  console.log('C1', c1.map(([k, ok]) => `${ok ? 'OK' : 'FAIL'} ${k}`).join(' · '));
  out.boss = await stage('boss', () => window.sliceApi.bossOf('plate', 1));
  await shot('music-4-boss');
  out.final = await stage('final', () => window.sliceApi.finalAt(0), 3000);
  await shot('music-5-final');
  out.ending = await stage('ending', () => window.sliceApi.endNow(true), 3000);
  await shot('music-6-ending');
  // 3) 설정: 음악 크기 · 끔 (D-530)
  const gains = async () => pg.evaluate(() => window.__mu.outs.map((g) => +g.gain.value.toFixed(3)));
  await pg.evaluate(() => window.sliceApi.settingsWin());
  await wait(500);
  const click = (sel) => pg.evaluate((s) => document.querySelector(s)?.click(), sel);
  const g0 = await gains();
  await click('[data-vol="music"] [data-down]'); await wait(400);
  const g1 = await gains();
  await click('[data-vol="music"] [data-mute]'); await wait(400);
  const g2 = await gains();
  const nMute = await pg.evaluate(() => window.__mu.plays.length);
  await pg.evaluate(() => window.sliceApi.map(2)); await wait(1200);
  const afterMute = await pg.evaluate((k) => window.__mu.plays.length - k, nMute);
  await shot('music-7-settings');
  await click('[data-vol="music"] [data-mute]'); await wait(1500);
  const unmuted = await pg.evaluate((k) => window.__mu.plays.slice(k), nMute);
  console.log('VOLUME music out (기본 → 한 칸 내림 → 끔)', JSON.stringify(g0), JSON.stringify(g1), JSON.stringify(g2), '끈 뒤 새 재생', afterMute, '다시 켬', JSON.stringify(unmuted));
  // 4) 백그라운드: 화면이 가려지면 소리 장치를 쉰다 (D-539 기본 켬)
  const vis = async (hidden) => pg.evaluate((h) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  const state = async () => pg.evaluate(() => window.__mu.ctxs.filter((c) => c.sampleRate === 32000).map((c) => c.state));
  const s0 = await state();
  await vis(true); await wait(500);
  const s1 = await state();
  await vis(false); await wait(500);
  const s2 = await state();
  console.log('BACKGROUND 음악 장치', JSON.stringify(s0), '→ 가림', JSON.stringify(s1), '→ 돌아옴', JSON.stringify(s2));
  const mem = await pg.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : -1));
  console.log('RESULT 첫 누름 전 요청', preTap, '· 곡 요청 합', reqs.length, '·', [...new Set(reqs.map((r) => r.f))].join(','), '· 4xx/5xx', bad.length ? bad.join(' | ') : '없음', '· 오류', errs.length ? errs.join(' | ') : '없음', '· JS 힙', mem, 'MB');
};
