#!/usr/bin/env node
/**
 * 시험판 기록 집계 (D-234, 보고서 3 템플릿 3-B · 3-A).
 * 테스터가 「기록 보내기」로 넘긴 JSON 파일들을 모아 7대 지표 + 설문을 합격 / 위험선과 대 본다.
 * 사용: node tools/playtest-report.cjs build-res/playtest/*.json  (또는 폴더 하나)
 * 출력: 표준 출력에 마크다운 표 — docs/playtest/에 붙여 기록한다.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('사용: node tools/playtest-report.cjs <기록.json ...|폴더>');
  process.exit(1);
}
const files = args.flatMap((a) => (fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter((f) => f.endsWith('.json')).map((f) => path.join(a, f)) : [a]));
/** 테스터 한 명 = 파일 하나 (같은 사건이 여러 파일에 겹치면 시각 · 세션 · 이름으로 걸러 낸다) */
const testers = files.map((f) => {
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  return { file: path.basename(f), events: Array.isArray(j) ? j : j.events ?? [] };
});
const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');
const mean = (xs) => (xs.length ? Math.round((xs.reduce((a, x) => a + x, 0) / xs.length) * 100) / 100 : null);
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const all = testers.flatMap((t) => t.events.map((e) => ({ ...e, tester: t.file })));
const of = (name) => all.filter((e) => e.e === name);
const verdict = (ok, red) => (red ? '🔴 위험' : ok ? '🟢 합격' : '🟡 관찰');
const rows = [];
const row = (kpi, value, pass, redLine, v) => rows.push(`| ${kpi} | ${value} | ${pass} | ${redLine} | ${v} |`);

// ① 첫 10분: 1전투 진입 시간 · 첫 10분 완주율 (입문 승리 + 핵심 부품까지)
{
  const byTester = testers.map((t) => t.events.filter((e) => e.e === 'ftue_step'));
  const start = byTester.map((s) => s.find((e) => e.step_id === 'battle1_start')?.elapsed_sec).filter((x) => x !== undefined);
  const kit = byTester.filter((s) => s.some((e) => e.step_id === 'kit_pick')).length;
  const started = byTester.filter((s) => s.length).length;
  const med = median(start);
  const rate = started ? kit / started : 0;
  row('① 첫 10분: 1전투 진입(중앙값)', med === null ? '—' : `${med}초`, '≤ 30초', '> 120초', verdict(med !== null && med <= 30, med !== null && med > 120));
  row('① 첫 10분 완주율 (핵심 부품까지)', pct(kit, started), '≥ 80%', '< 65%', verdict(rate >= 0.8, started > 0 && rate < 0.65));
  // 입문 시험대 셋 (D-502): battle1_start = 시험대 A에 손댄 순간, first_real_battle = 지도의 첫 실전 대국
  const real = median(byTester.map((s) => s.find((e) => e.step_id === 'first_real_battle')?.elapsed_sec).filter((x) => x !== undefined));
  row('① 첫 실전 대국 진입(중앙값, 입문 시험대 셋 뒤)', real === null ? '—' : `${real}초`, '≤ 300초', '> 480초', verdict(real !== null && real <= 300, real !== null && real > 480));
}
// ② 막별 · 노드별 사망 분포 · 체력 손실
{
  const br = of('battle_result');
  const early = br.filter((e) => e.act === 1 && e.node_idx <= 3);
  const earlyDead = early.filter((e) => !e.win).length;
  const deaths = br.filter((e) => !e.win);
  const byAct = [1, 2, 3].map((a) => deaths.filter((e) => e.act === a).length);
  const r = early.length ? earlyDead / early.length : 0;
  row('② 1막 1~3노드 패배율', pct(earlyDead, early.length), '< 10%', '> 20%', verdict(early.length > 0 && r < 0.1, r > 0.2));
  row('② 막별 패배 수 (1 · 2 · 3막)', byAct.join(' · '), '25% · 45% · 30%', '한 일반 적 > 30%', '표 참고');
  const byEnemy = {};
  for (const e of br) {
    const k = e.enemy_id;
    byEnemy[k] ??= { n: 0, lost: 0, hp: [] };
    byEnemy[k].n += 1;
    if (!e.win) byEnemy[k].lost += 1;
    byEnemy[k].hp.push(e.hp_lost ?? 0);
  }
  rows.push('', '<details><summary>대국별 HP 손실 · 패배</summary>', '', '| 대국 | 판 수 | 패배 | 평균 HP 손실 |', '|---|---|---|---|');
  for (const [k, v] of Object.entries(byEnemy).sort((a, b) => mean(b[1].hp) - mean(a[1].hp))) rows.push(`| ${k} | ${v.n} | ${v.lost} | ${mean(v.hp)} |`);
  rows.push('', '</details>', '', '| 지표 | 값 | 합격 | 위험선 | 판정 |', '|---|---|---|---|---|');
}
// ③ 한 판 길이 · 강제 종료
{
  const ends = of('session_exit').filter((e) => e.exit_type === 'clear' || e.exit_type === 'gameover');
  const clears = ends.filter((e) => e.exit_type === 'clear').map((e) => e.run_time_min);
  const bg = of('session_exit').filter((e) => e.exit_type === 'background' && e.in_battle);
  const back = of('session_resume');
  const m = median(clears);
  row('③ 완주 시간 (중앙값, 분)', m ?? '—', '35~50분', '> 65분', verdict(m !== null && m >= 35 && m <= 50, m !== null && m > 65));
  row('③ 대국 중 앱 내림 · 미복귀', `${bg.length}회 · 복귀 ${back.length}`, '미복귀 < 15%', '한 구간 > 30%', '기록 참고');
}
// ④ 되감기 · 부활 부적 미사용 사망
{
  const go = of('gameover_inventory');
  const hoard = go.filter((e) => e.rewinds_left > 0).length;
  const ask = of('loss_rewind_prompt');
  const r = go.length ? hoard / go.length : 0;
  row('④ 되감기를 남긴 채 출하 끝', pct(hoard, go.length), '< 25%', '> 50%', verdict(go.length > 0 && r < 0.25, r > 0.5));
  row('④ 패배 직전 되감기 팝업 수락', pct(ask.filter((e) => e.taken).length, ask.length), '—', '—', '참고');
}
// ⑤ 카드 · 부품 선택률 · 스킵률
{
  const d = of('draft_choice');
  const cards = d.filter((e) => e.kind === 'card');
  const skip = cards.filter((e) => e.is_skipped).length;
  const offered = {};
  const picked = {};
  for (const e of d) {
    for (const id of e.offered_ids ?? []) offered[id] = (offered[id] ?? 0) + 1;
    if (e.picked_id) picked[e.picked_id] = (picked[e.picked_id] ?? 0) + 1;
  }
  const rates = Object.keys(offered).filter((id) => offered[id] >= 3).map((id) => [id, (picked[id] ?? 0) / offered[id], offered[id]]);
  const hot = rates.filter(([, r]) => r > 0.7);
  const cold = rates.filter(([, r]) => r < 0.05);
  const sr = cards.length ? skip / cards.length : 0;
  row('⑤ 카드 보상 스킵률', pct(skip, cards.length), '10~25%', '> 45%', verdict(sr >= 0.1 && sr <= 0.25, sr > 0.45));
  row('⑤ 픽률 > 70% (3회 이상 나온 것)', hot.map(([id, r]) => `${id} ${Math.round(r * 100)}%`).join(', ') || '없음', '15~50%', '> 70% 또는 < 5%', hot.length ? '🔴 위험' : '🟢 합격');
  row('⑤ 픽률 < 5%', cold.map(([id]) => id).join(', ') || '없음', '', '', cold.length ? '🟡 관찰' : '🟢 합격');
}
// ⑥ 예고 공격 피격률 · 회피 반격 발동
{
  const t = of('telegraph_resolution');
  const tel = t.reduce((a, e) => a + e.telegraph_count, 0);
  const hit = t.reduce((a, e) => a + e.hit_count, 0);
  const withCounter = t.filter((e) => e.counter_hit_count + e.pure_evade_count > 0).length;
  const hr = tel ? hit / tel : 0;
  const cr = t.length ? withCounter / t.length : 0;
  row('⑥ 예고 피격률 (맞은 기물 / 겨눈 예고)', pct(hit, tel), '≤ 35% (회피 70~85%)', '> 35%', verdict(tel > 0 && hr <= 0.35, hr > 0.35));
  row('⑥ 회피 반격 · 순수 회피가 나온 대국', pct(withCounter, t.length), '≥ 80%', '< 20%', verdict(cr >= 0.8, t.length > 0 && cr < 0.2));
  row('⑥ 대국당 회피 반격 (평균)', mean(t.map((e) => e.counter_hit_count)) ?? '—', '2~4회', '—', '참고');
}
// ⑦ 용어 툴팁 열람
{
  const tt = of('tooltip_inspect');
  const cards = tt.filter((e) => String(e.term_id).startsWith('card:'));
  const long = cards.filter((e) => e.dwell_ms > 5000).length;
  const count = {};
  for (const e of cards) count[e.term_id] = (count[e.term_id] ?? 0) + 1;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3);
  row('⑦ 카드 설명 5초 넘게 읽음', pct(long, cards.length), '1.5~3초', '> 5초', verdict(cards.length > 0 && long / cards.length < 0.2, cards.length > 0 && long / cards.length > 0.3));
  row('⑦ 가장 많이 펼친 카드 3', top.map(([k, n]) => `${k.slice(5)} ${n}`).join(', ') || '—', '', 'Q6과 겹치면 평문화', '참고');
  row('⑦ 사전 열람 (용어 탭)', `${tt.filter((e) => e.term_id === 'dict').length}회`, '', '', '참고');
}
// 설문 (Q1~Q10)
const sv = of('survey').map((e) => e.answers);
const surveyRows = [];
if (sv.length) {
  const num = (id) => sv.map((a) => a[id]).filter((x) => typeof x === 'number');
  const q = (id, label, pass, okFn) => {
    const xs = num(id).filter((x) => x > 0);
    const m = mean(xs);
    surveyRows.push(`| ${id} ${label} | ${m ?? '—'} (n=${xs.length}) | ${pass} | ${m === null ? '—' : okFn(m) ? '🟢' : '🔴'} |`);
  };
  q('Q1', '연쇄 손맛', '≥ 4.0', (m) => m >= 4);
  q('Q2', '예고 파훼 재미', '≥ 4.0', (m) => m >= 4);
  const zero = num('Q2').filter((x) => x === 0).length;
  surveyRows.push(`| Q2 「한 번도 못 해 봄」 | ${pct(zero, num('Q2').length)} | ≤ 10% | ${zero / Math.max(1, num('Q2').length) <= 0.1 ? '🟢' : '🔴'} |`);
  q('Q3', '1막 난이도', '3.0~3.5', (m) => m >= 3 && m <= 3.5);
  q('Q4', '공정성 (억까 여부)', '≥ 3.8', (m) => m >= 3.8);
  q('Q5', '예고 · 결과 이해도', '≥ 4.0', (m) => m >= 4);
  const words = {};
  for (const a of sv) for (const w of a.Q6 ?? []) words[w] = (words[w] ?? 0) + 1;
  const bad = Object.entries(words).filter(([w, n]) => w !== '헷갈린 말 없음' && n / sv.length >= 0.3);
  surveyRows.push(`| Q6 헷갈린 말 (30% 이상) | ${bad.map(([w, n]) => `${w} ${Math.round((n / sv.length) * 100)}%`).join(', ') || '없음'} | 없음 | ${bad.length ? '🔴 평문 · 아이콘으로' : '🟢'} |`);
  const q7 = sv.map((a) => a.Q7).filter(Boolean);
  const q7bad = q7.filter((x) => x.startsWith('아끼다가') || x.startsWith('어떻게')).length;
  surveyRows.push(`| Q7 되감기 아낌 + 몰랐음 | ${pct(q7bad, q7.length)} | ≤ 40% | ${q7bad / Math.max(1, q7.length) <= 0.4 ? '🟢' : '🔴 결정타 직전 팝업 강화'} |`);
  const q8 = sv.map((a) => a.Q8).filter(Boolean);
  const want = q8.filter((x) => x.startsWith('당장')).length;
  surveyRows.push(`| Q8 「당장 한 판 더」 (Sean Ellis) | ${pct(want, q8.length)} | ≥ 40% | ${want / Math.max(1, q8.length) >= 0.4 ? '🟢 핵심 재미 검증' : '🔴'} |`);
}

console.log(`# 시험판 기록 집계\n\n파일 ${files.length}개 · 사건 ${all.length}건 · 출하 ${of('run_start').length}판 · 설문 ${sv.length}건 · 버그 제보 ${of('bug_report').length}건\n`);
console.log('## 7대 지표 (보고서 3 템플릿 3-B)\n');
console.log('| 지표 | 값 | 합격 | 위험선 | 판정 |\n|---|---|---|---|---|');
console.log(rows.join('\n'));
if (surveyRows.length) {
  console.log('\n## 설문 (템플릿 3-A)\n');
  console.log('| 문항 | 값 | 합격 | 판정 |\n|---|---|---|---|');
  console.log(surveyRows.join('\n'));
  const lines = (id) => sv.map((a) => a[id]).filter((x) => typeof x === 'string' && x.trim());
  console.log('\n### Q9 가장 짜릿했던 순간\n');
  for (const l of lines('Q9')) console.log(`- ${l}`);
  console.log('\n### Q10 가장 답답했던 순간\n');
  for (const l of lines('Q10')) console.log(`- ${l}`);
}
const bugs = of('bug_report');
if (bugs.length) {
  console.log('\n## 버그 · 짜증 제보\n');
  for (const e of bugs) console.log(`- [${e.tester}] ${e.act}막 ${e.node_idx}노드 · ${e.state?.battle?.title ?? '판 밖'} ${e.state?.battle ? `${e.state.battle.turn}턴` : ''} — ${e.note || '(메모 없음)'} (시드 ${e.state?.seed})`);
}
