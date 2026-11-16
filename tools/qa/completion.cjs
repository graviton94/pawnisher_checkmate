// 출시 완주 점검 (2026-11-16, docs/reports/2026-11-16-completion-check.md): 실제 화면(915×412)으로 본편 넷째 왕관까지 이어서 ·
// 넷째 왕관 두 결말 · 도전 · 오늘의 도전 · 패배를 끝까지 넘기고, 장면 순서 · 기록(해금) · 메뉴 다음 왕관 · 오류를 본다.
// 대국만 판을 비워 이긴 것으로 끝낸다(흐름 점검) — 그 밖의 화면은 실제 단추를 누른다.
// 사용: 프리뷰 서버(npx vite preview --port 4173)를 띄운 뒤 node tools/qa/completion.cjs <출력 폴더> [사례,...]
//   사례: chain(첫째→넷째 던진다 → 도전 1) · crown4-throne · daily · defeat · challenge-top
const fs = require('fs');
const { chromium, W, setOut, open, meta, save, seedMeta, toMenu, click, clickText, startFromMenu, drive } = require('./drive.cjs');
const OUT = (process.argv[2] ?? 'production/qa/completion') + '/';
const ONLY = (process.argv[3] ?? '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
setOut(OUT);
const report = [];
const say = (s) => { report.push(s); console.log(s); };


/** 결말 화면까지 간 출하의 기록 · 메뉴 확인 */
const finishCheck = async (p, tag, r, expect) => {
  await p.screenshot({ path: `${OUT}${tag}-end.png` });
  const m = await meta(p), sv = await save(p);
  const ok = r.end && !sv && expect(m);
  say(`${tag}: ${r.end ? '메인 화면 단추까지' : `멈춤 ${r.stuck}`} · 대국 ${r.battles} · 저장 ${sv ? '남음!' : '지움'} · 기록 storyCleared=${m?.storyCleared} trueEnd=${m?.trueEnd} challengeOpen=${m?.challengeOpen} kings=${(m?.crownedKings ?? []).length} unlocked=${(m?.unlocked ?? []).length} daily=${Object.keys(m?.daily ?? {}).join(',')} · ${ok ? 'OK' : 'FAIL'}`);
  say(`  장면: ${r.tl.filter((x) => !/^map:/.test(x) || true).join(' → ')}`);
  if (p.errs.length) say(`  오류: ${p.errs.splice(0).join(' / ')}`);
  if (p.missing.size) say(`  없는 그림: ${[...p.missing].join(', ')}`);
  return ok;
};

const CASES = {
  // 본편 첫째 → 넷째(던진다) → 도전 1: 기록을 이어 받으며 메뉴에서만 시작
  chain: async (br) => {
    const p = await open(br);
    await seedMeta(p, {});
    for (let ch = 0; ch < 4; ch++) {
      await toMenu(p);
      const label = await startFromMenu(p, 'story');
      await p.screenshot({ path: `${OUT}crown${ch + 1}-start.png` });
      const r = await drive(p, { tag: `crown${ch + 1}`, choice: ch < 3 ? (ch === 0 ? 'look' : 'crown') : 'depart' });
      say(`crown${ch + 1} 메뉴 표기: ${label}`);
      await finishCheck(p, `crown${ch + 1}`, r, (m) => m.storyCleared === ch + 1 && (ch < 3 ? m.crownedKings.length === ch + 1 : m.trueEnd === true && m.challengeOpen === 4));
      await clickText(p, /메인 화면으로/); await W(2500);
    }
    await toMenu(p);
    const ch = await p.evaluate(() => ({ chal: !document.querySelector('[data-mode="challenge"]')?.disabled }));
    say(`도전 버튼 열림: ${ch.chal}`);
    await startFromMenu(p, 'challenge');
    const r = await drive(p, { tag: 'challenge1' });
    await finishCheck(p, 'challenge1', r, (m) => m.challengeOpen === 5 && m.challengeRecords?.[4]?.clears === 1);
    await p.context().close();
  },
  'crown4-throne': async (br) => {
    const p = await open(br);
    await seedMeta(p, { storyCleared: 3, crownedKings: [0, 1, 2].map((c) => ({ chapter: c, runId: `qa-${c}`, law: '규정', companions: [] })) });
    await toMenu(p); await startFromMenu(p, 'story');
    const r = await drive(p, { tag: 'crown4-throne', choice: 'crown' });
    await finishCheck(p, 'crown4-throne', r, (m) => m.storyCleared === 4 && m.trueEnd === false && m.challengeOpen === 4 && m.crownedKings.length === 4);
    await p.context().close();
  },
  'challenge-top': async (br) => {
    const p = await open(br);
    await seedMeta(p, { storyCleared: 4, trueEnd: true, challengeOpen: 13 });
    await toMenu(p); await click(p, '[data-mode="challenge"]'); await W(300);
    const r0 = await p.evaluate(() => document.querySelector('.op-menu [data-go] small')?.textContent);
    await startFromMenu(p, 'challenge');
    const r = await drive(p, { tag: 'challenge-top' });
    say(`challenge-top 메뉴 표기: ${r0}`);
    await finishCheck(p, 'challenge-top', r, (m) => m.challengeOpen === 13 && m.challengeRecords?.[13]?.clears === 1);
    await p.context().close();
  },
  daily: async (br) => {
    // 같은 날 · 같은 시드 = 같은 출하: 서로 다른 기록(원수 · 최근 사건)을 가진 두 사람이 같은 지도 · 같은 첫 보상
    const look = async (m) => {
      const p = await open(br);
      await seedMeta(p, m);
      await toMenu(p); await startFromMenu(p, 'daily');
      const r = await drive(p, { tag: 'daily-probe', stop: (st) => st.map });
      const sv = await save(p);
      const fp = sv && { seed: sv.seed, rng: sv.rng, deck: sv.deck.join(','), squad: sv.squad.map((u) => u.t + (u.name ?? '')).join(','), bag: (sv.eventBag ?? []).join(','), gold: sv.gold };
      await p.context().close();
      return { fp, tl: r.tl };
    };
    const a = await look({});
    const b = await look({ nemeses: [{ t: 'R', name: '녹슨 집행자', rank: 2, victims: ['먼지투성이'] }], evRecent: ['tinker', 'smith', 'gambler', 'apprentice', 'scout', 'napping'] });
    say(`daily 같은 날 두 기록: ${JSON.stringify(a.fp) === JSON.stringify(b.fp) ? '같은 출하' : `다름!\n  A ${JSON.stringify(a.fp)}\n  B ${JSON.stringify(b.fp)}`}`);
    const p = await open(br);
    await seedMeta(p, {});
    await toMenu(p); await startFromMenu(p, 'daily');
    const r = await drive(p, { tag: 'daily' });
    await finishCheck(p, 'daily', r, (m) => Object.keys(m.daily).length === 1 && m.storyCleared === 0);
    await p.context().close();
  },
  defeat: async (br) => {
    const p = await open(br);
    await seedMeta(p, {});
    await toMenu(p); await startFromMenu(p, 'story');
    const r = await drive(p, { tag: 'defeat', lose: true });
    await finishCheck(p, 'defeat', r, (m) => m.storyCleared === 0 && m.runs === 4);
    await p.context().close();
  },
};

(async () => {
  const br = await chromium.launch();
  for (const [k, fn] of Object.entries(CASES)) {
    if (ONLY.length && !ONLY.includes(k)) continue;
    const t0 = Date.now();
    try { await fn(br); } catch (e) { say(`${k}: 예외 ${e.message}`); }
    say(`(${k} ${Math.round((Date.now() - t0) / 1000)}초)`);
    fs.writeFileSync(OUT + 'report.txt', report.join('\n'));
  }
  await br.close();
})();
