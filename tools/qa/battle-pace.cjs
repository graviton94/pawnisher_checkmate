// 전투 박자 측정 (D-620): 내 수 하나 · 적 수 하나 · 적 차례 전체가 실제로 몇 초 걸리나.
// 915×412 DPR 2.625(기본)에서 봇(sliceApi.botMove)이 실제 대국을 둔다 — 결정은 즉시, 걸리는 시간은 모두 연출 · 숨 고르기다.
//  · 내 수 = 카드를 낸 순간 → 손이 다시 풀릴 때(run이 끝남, busy=false)
//  · 적 차례 = 「턴 끝」 → 다음 손패가 깔릴 때(onEnd가 끝남)
//  · 적 수 하나 = 판 연출 기록(__pace)에서 적 기물 하나의 첫 사건 → 다음 적 기물의 첫 사건(마지막은 연출 끝)
// 미리 `npm run build` · `npx vite preview --port 4391 --strictPort`. 사용:
//   node tools/qa/battle-pace.cjs [--url http://localhost:4391/] [--tag before] [--out <폴더>] [--turns 6] [--w 915 --h 412 --dpr 2.625]
// 결과: <폴더>/<날짜>-battle-pace-<tag>.json + 표 한 장(stdout)
const { chromium } = require(process.env.PW_PATH || 'playwright');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--url', 'http://localhost:4391/');
const TAG = opt('--tag', 'after');
const OUT = opt('--out', 'production/qa/evidence');
const TURNS = Number(opt('--turns', 6));
const W = Number(opt('--w', 915)), H = Number(opt('--h', 412)), DPR = Number(opt('--dpr', 2.625));
/** 잴 대국: [막, 종류] — 1막 일반 · 1막 검문 · 2막 일반 · 반장 */
const FIGHTS = [[1, 'battle'], [1, 'check'], [2, 'battle'], [3, 'battle'], [1, 'boss']];
const META = { tut: ['battle', 'battle-a', 'map', 'recruit', 'kit', 'promote', 'first_shop', 'heat', 'event'], runs: 3, prologue: true, ascOpen: 5, storyCleared: 1, daily: {}, onboarded: true, termsNew: [] };

const stat = (xs) => {
  const a = [...xs].sort((p, q) => p - q);
  const at = (q) => (a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0);
  return { n: a.length, median: at(0.5), p90: at(0.9), max: a.length ? a[a.length - 1] : 0 };
};

(async () => {
  const br = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const pg = await br.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: W < 1024 });
  const errors = [];
  pg.on('pageerror', (e) => errors.push(String(e)));
  const url = `${BASE}?debug`;
  await pg.goto(url);
  await pg.evaluate((m) => { localStorage.clear(); localStorage.setItem('pawnisher.slice.meta', m); }, JSON.stringify(META));
  const mine = [], enemyTurns = [], enemyMoves = [], slow = [];
  for (const [act, kind] of FIGHTS) {
    await pg.goto(url);
    await pg.waitForSelector('#boot', { state: 'detached', timeout: 30000 });
    await pg.waitForFunction(() => window.sliceApi, null, { timeout: 10000 });
    await pg.evaluate(([a, k]) => { window.sliceApi.setAct(a - 1); window.sliceApi.startAt(a, k); }, [act, kind]);
    await pg.waitForTimeout(kind === 'boss' ? 4000 : 2500);
    let turn = 0;
    for (let guard = 0; guard < 60 && turn < TURNS; guard++) {
      const over = await pg.evaluate(() => window.slice().s.winner !== null || !document.querySelector('#btn-end') || document.body.classList.contains('between'));
      if (over) break;
      await pg.evaluate(() => (window.__pace = []));
      const t0 = Date.now();
      const r = await pg.evaluate(async () => {
        // 기물 없이 고르는 즉시 카드는 펼침 → 한 번 더 누름(사람과 같은 두 번)
        const a = window.sliceApi;
        const out = await a.botMove();
        return out;
      });
      const ms = Date.now() - t0;
      const log = await pg.evaluate(() => window.__pace || []);
      if (r === 'busy') { await pg.waitForTimeout(300); continue; }
      if (r === 'end') {
        turn++;
        enemyTurns.push(ms);
        // 적 기물마다: 그 기물의 첫 이동 · 공격 → 그 기물 것이 아닌 다음 사건(다음 적 · 턴 시작 특성 · 연출 끝)
        // 턴 시작 특성(수리 · 방진 띠 등 'mark' · 'heal')은 적 「수」가 아니라 따로 적 차례 전체에만 든다
        let cur = null;
        for (const [t, k, side, id] of log) {
          const own = (k === 'move' || k === 'attack') && side === 1;
          if (cur && !(own && id === cur.id)) { enemyMoves.push(t - cur.t); cur = null; }
          if (own && !cur) cur = { id, t };
        }
        continue;
      }
      if (log.some((x) => x[1] === 'play')) {
        mine.push(ms);
        // 느린 수는 무엇이 길었는지 남긴다 (사건 줄 · 처치 의식 · 대국 끝)
        if (ms > 1200) slow.push({ fight: `${act}${kind}`, card: r, ms, over: await pg.evaluate(() => window.slice().s.winner), log: log.map(([t, k, s2]) => `${k}${s2 >= 0 ? ':' + s2 : ''}@${t - log[0][0]}`).join(' ') });
      }
      else await pg.waitForTimeout(100);
    }
    console.error(`${act}막 ${kind}: 내 수 ${mine.length} · 적 차례 ${enemyTurns.length}`);
  }
  await br.close();
  const res = { tag: TAG, viewport: `${W}x${H}@${DPR}`, mine: stat(mine), enemyTurn: stat(enemyTurns), enemyMove: stat(enemyMoves), raw: { mine, enemyTurns, enemyMoves }, slow, errors };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${new Date().toISOString().slice(0, 10)}-battle-pace-${TAG}.json`), JSON.stringify(res, null, 1));
  const row = (k, s) => `| ${k} | ${s.n} | ${(s.median / 1000).toFixed(2)} | ${(s.p90 / 1000).toFixed(2)} | ${(s.max / 1000).toFixed(2)} |`;
  console.log(`전투 박자 (${TAG}, ${res.viewport}) — 초`);
  console.log('| 구간 | 표본 | 중앙 | 90% | 최대 |\n|---|---|---|---|---|');
  console.log(row('내 수 하나', res.mine));
  console.log(row('적 수 하나', res.enemyMove));
  console.log(row('적 차례 전체', res.enemyTurn));
  if (errors.length) console.log('오류:', errors.slice(0, 5).join(' / '));
})();
