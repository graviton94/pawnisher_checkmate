// 효과음 실화면 점검 (D-540): 주물 공방 소리 파일이 실제로 받아지고(404 없음) · 사건마다 울리고 · 설정 크기가 주 음량에 걸리는지.
// 헤드리스라 귀로 듣지는 못한다 — AudioBufferSourceNode.start · 주 음량 노드 값 · 네트워크 응답을 센다.
// 사용: node tools/slice-observe.cjs sfx   (결과 production/qa/evidence/<날짜>-slice-sfx-*.png · 콘솔에 표)
module.exports = async (pg, shot) => {
  const BASE = process.env.OBSERVE_URL || 'http://localhost:4173/';
  const wait = (ms = 500) => pg.waitForTimeout(ms);
  const bad = [];
  const got = new Set();
  pg.on('response', (r) => {
    const u = r.url();
    if (!u.includes('/audio/sfx/')) return;
    if (r.status() >= 400) bad.push(`${r.status()} ${u}`);
    else got.add(u.split('/').pop());
  });
  // 재생 기록: 소리 이름(버퍼 길이로 역추적) · 주 음량
  await pg.addInitScript(() => {
    const w = window;
    w.__sfx = { plays: [], ctx: null, masters: [] };
    const AC = w.AudioContext;
    w.AudioContext = class extends AC {
      constructor(...a) { super(...a); w.__sfx.ctx = this; }
    };
    const dec = AC.prototype.decodeAudioData;
    AC.prototype.decodeAudioData = function (ab, ok, no) {
      return dec.call(this, ab, ok, no);
    };
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dst, ...r) {
      if (dst instanceof AudioDestinationNode && this instanceof GainNode) w.__sfx.masters.push(this);
      return conn.call(this, dst, ...r);
    };
    const st = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...a) {
      w.__sfx.plays.push({ dur: Math.round((this.buffer?.duration ?? 0) * 1000), rate: +this.playbackRate.value.toFixed(3), t: Math.round(performance.now()) });
      return st.apply(this, a);
    };
  });
  await pg.goto(BASE + '?debug');
  await pg.waitForSelector('#boot', { state: 'detached' });
  await wait(300);
  // 첫 누름 = 소리 장치 깨움 + 파일 미리 받기
  await pg.touchscreen.tap(450, 200);
  await wait(1500);
  const stage = async (name, fn, ms = 1200) => {
    const n0 = await pg.evaluate(() => window.__sfx.plays.length);
    await pg.evaluate(fn);
    await wait(ms);
    const p = await pg.evaluate((k) => window.__sfx.plays.slice(k), n0);
    console.log(`SFX ${name.padEnd(10)} ${p.length}회`, p.map((x) => `${x.dur}ms@${x.rate}`).join(' '));
    return p.length;
  };
  const counts = {};
  counts.map = await stage('map', () => window.sliceApi.map(2));
  await shot('sfx-1-map');
  counts.battle = await stage('battle', () => window.sliceApi.startAt(1, 'battle'), 2500);
  for (let i = 0; i < 6; i++) counts[`move${i}`] = await stage(`move${i}`, () => window.sliceApi.botMove('greedy'), 2600);
  await shot('sfx-2-battle');
  counts.shop = await stage('shop', () => { window.sliceApi.gold(200); window.sliceApi.shop(); });
  counts.apFx = await stage('apFx', () => { window.sliceApi.startAt(1, 'battle'); setTimeout(() => window.sliceApi.apFx(), 1500); }, 3000);
  counts.boss = await stage('bossIntro', () => window.sliceApi.bossIntroOf('plate', 1), 2500);
  await shot('sfx-3-boss');
  // 설정: 효과음 크기를 내리면 주 음량이 따라 내려가고, 끄면 0 (D-530)
  await pg.evaluate(() => window.sliceApi.settingsWin());
  await wait(500);
  const vol = async () => pg.evaluate(() => window.__sfx.masters.map((g) => +g.gain.value.toFixed(3)));
  const v0 = await vol();
  const click = (sel) => pg.evaluate((s) => document.querySelector(s)?.click(), sel);
  await click('[data-vol="sfx"] [data-down]'); await wait(300);
  const v1 = await vol();
  await click('[data-vol="sfx"] [data-mute]'); await wait(300);
  const v2 = await vol();
  const nMute = await pg.evaluate(() => window.__sfx.plays.length);
  await pg.evaluate(() => window.sliceApi.map(2)); await wait(600);
  const nAfter = await pg.evaluate(() => window.__sfx.plays.length);
  await click('[data-vol="sfx"] [data-mute]');
  console.log('VOLUME master gains (기본 → 한 칸 내림 → 끔)', JSON.stringify(v0), JSON.stringify(v1), JSON.stringify(v2), '끈 뒤 재생', nAfter - nMute);
  const state = await pg.evaluate(() => window.__sfx.ctx?.state);
  console.log('CTX state', state, '받은 파일', got.size, '오류', bad.length ? bad.join(', ') : '없음');
  await shot('sfx-4-settings');
};
