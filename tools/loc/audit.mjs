#!/usr/bin/env node
/**
 * 현지화 재고 조사 (D-650): 사용자에게 보이는 한글 문자열을 세어 docs/loc/inventory.md를 다시 쓴다.
 *  - TypeScript 스캐너로 문자열 · 템플릿 조각만 센다 (주석은 빠진다).
 *  - console.* · throw new Error 인자는 개발자용이라 뺀다.
 *  - 「하드코딩」 = src/data/ 밖(본편 src/slice · src/view · src/engine … · index.html)에 있는 한글 문자열.
 *  - 「데이터」 = src/data/ 안 — 번역 분량 추정용 (영역별).
 *  - 옛 2.0(src/run · src/ui · src/game · src/main.ts · legacy.html)은 번역하지 않으므로 따로 센다.
 * 단어 = 띄어쓰기 단위(어절). 영어 단어 수는 어절 × 1.4 안팎으로 잡는다(경험치).
 * 쓰는 법: node tools/loc/audit.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const HANGUL = /[가-힣]/;

/** 파일 → 영역 (UI · 카드 · 부품 · 사건 · 이야기 · 안내 · 용어집 · 기타) */
const DATA_AREA = {
  'text.ts': 'UI', 'hud.ts': 'UI', 'settings.ts': 'UI', 'display.ts': 'UI', 'grades.ts': 'UI',
  'unlocks.ts': 'UI', 'playtest.ts': 'UI', 'credits.ts': 'UI', 'legal.ts': 'UI', 'licenses.ts': 'UI', 'josa.ts': 'UI',
  'ascension.ts': 'UI', 'campaign.ts': 'UI', 'run.ts': 'UI', 'start-sets.ts': 'UI', 'version.ts': 'UI', 'locale.ts': 'UI', 'ui-strings.ts': 'UI', 'chrome.ts': 'UI', 'volume.ts': 'UI', 'menu.ts': 'UI',
  'card-text.ts': 'cards', 'ability-text.ts': 'cards', 'carves.ts': 'cards', 'forms.ts': 'cards', 'pieces.ts': 'cards',
  'battle.ts': 'cards', 'build-supply.ts': 'cards', 'build-trial.ts': 'cards', 'card-frames.ts': 'cards', 'giants.ts': 'cards', 'process.ts': 'cards',
  'parts.ts': 'parts',
  'event-talk.ts': 'events', 'event-outcome.ts': 'events', 'npcs.ts': 'events', 'twists.ts': 'events',
  'story.ts': 'story', 'script.ts': 'story', 'opening.ts': 'story', 'companion-scenes.ts': 'story', 'crew-voice.ts': 'story',
  'battle-voice.ts': 'story', 'vn.ts': 'story', 'portraits.ts': 'story',
  'rulebook.ts': 'guide', 'tutorial.ts': 'guide', 'onboarding.ts': 'guide', 'coach.ts': 'guide',
  'terms.ts': 'glossary',
};
/** src/data 밖 파일 → 영역 (하드코딩 표) */
const CODE_AREA = (rel) => {
  const b = path.basename(rel);
  if (/^(cards|card-|cardfx|ability|desc|effect-text|tags|costsnap|handfit|build-)/.test(b)) return 'cards';
  if (/^(parts|part-state)/.test(b)) return 'parts';
  if (/^(events|evstage)/.test(b)) return 'events';
  if (/^(opening|film|vn|darkcut|bossintro|credits|voice|actclear|promotion|director)/.test(b)) return 'story';
  if (/^(tutorial|loadtip|warmup|once)/.test(b)) return 'guide';
  return 'UI';
};
const AREAS = ['UI', 'cards', 'parts', 'events', 'story', 'guide', 'glossary', 'other'];
const AREA_KO = { UI: 'UI(메뉴 · HUD · 설정 · 창)', cards: '카드 · 기물 · 능력', parts: '부품', events: '사건', story: '이야기 · 컷신 · 대사', guide: '안내 · 시험대 · 규칙서', glossary: '용어집', other: '기타' };

const words = (s) => s.split(/\s+/).filter((w) => HANGUL.test(w)).length;

/** 한 파일의 한글 문자열 목록 [{line, text}] */
function scanTs(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const out = [];
  const devCall = (n) => {
    for (let p = n.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))) return true;
      if (ts.isNewExpression(p) && /Error$/.test(p.expression.getText(sf))) return true;
      if (ts.isImportDeclaration(p)) return true;
    }
    return false;
  };
  const visit = (n) => {
    let text = null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) text = n.text;
    else if (ts.isTemplateExpression(n)) text = [n.head.text, ...n.templateSpans.map((s) => '{}' + s.literal.text)].join('');
    if (text !== null && HANGUL.test(text) && !devCall(n)) {
      out.push({ line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: text.replace(/<[^>]+>/g, ' ') });
      if (ts.isTemplateExpression(n)) {
        // 템플릿 안쪽 식에 든 문자열도 따로 센다
        n.templateSpans.forEach((s) => visit(s.expression));
        return;
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
/** HTML 본문 글자(태그 · 주석 · 스크립트 밖)와 속성(alt · aria-label · title) */
function scanHtml(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const out = [];
  const lines = src.split('\n');
  lines.forEach((l, i) => {
    for (const m of l.matchAll(/>([^<]*[가-힣][^<]*)</g)) out.push({ line: i + 1, text: m[1].trim() });
    for (const m of l.matchAll(/(?:aria-label|alt|title|content|placeholder)="([^"]*[가-힣][^"]*)"/g)) out.push({ line: i + 1, text: m[1] });
  });
  return out;
}
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : /\.ts$/.test(d.name) && !/\.test\.ts$/.test(d.name) ? [p] : [];
});

const LEGACY = (rel) => /^src\/(run|ui|game)\//.test(rel) || rel === 'src/main.ts' || rel === 'legacy.html';
const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'index.html'), path.join(ROOT, 'legacy.html')];
const hard = {}, data = {}, legacy = { n: 0, w: 0 }, perFile = [];
for (const a of AREAS) { hard[a] = { n: 0, w: 0 }; data[a] = { n: 0, w: 0 }; }
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/');
  if (/^src\/sim\//.test(rel)) continue; // 시뮬레이터 보고 글 — 화면에 안 나온다
  const hits = f.endsWith('.html') ? scanHtml(f) : scanTs(f);
  if (!hits.length) continue;
  const w = hits.reduce((s, h) => s + words(h.text), 0);
  if (LEGACY(rel)) { legacy.n += hits.length; legacy.w += w; continue; }
  const isData = rel.startsWith('src/data/');
  const area = isData ? (DATA_AREA[path.basename(rel)] ?? 'other') : CODE_AREA(rel);
  const bucket = isData ? data : hard;
  bucket[area].n += hits.length; bucket[area].w += w;
  perFile.push({ rel, area, isData, n: hits.length, w, sample: hits.slice(0, 3).map((h) => h.text.slice(0, 40)) });
}
// 문서 쪽 대사 (스토리보드는 게임 데이터에서 뽑은 것이라 겹친다 — 참고로만)
const sum = (b) => AREAS.reduce((s, a) => ({ n: s.n + b[a].n, w: s.w + b[a].w }), { n: 0, w: 0 });
const H = sum(hard), D = sum(data);

const table = (b, tot) => ['| 영역 | 문자열 | 어절 | 영어 단어 추정(×1.4) |', '|---|---:|---:|---:|',
  ...AREAS.filter((a) => b[a].n).map((a) => `| ${AREA_KO[a]} | ${b[a].n} | ${b[a].w} | ${Math.round(b[a].w * 1.4)} |`),
  `| **합계** | **${tot.n}** | **${tot.w}** | **${Math.round(tot.w * 1.4)}** |`].join('\n');
const fileRows = (isData) => perFile.filter((p) => p.isData === isData).sort((a, b) => b.n - a.n)
  .map((p) => `| \`${p.rel}\` | ${AREA_KO[p.area]} | ${p.n} | ${p.w} | ${p.sample.map((s) => s.replace(/\|/g, '/').replace(/\s+/g, ' ')).join(' · ')} |`).join('\n');

const md = `# 현지화 재고 (D-650)

> 자동 생성: \`node tools/loc/audit.mjs --write\` — 손으로 고치지 않는다. 날짜: ${new Date().toISOString().slice(0, 10)}

세는 법: TypeScript 스캐너로 **한글이 든 문자열 · 템플릿 조각**만 센다(주석 · \`console.*\` · \`Error\` 인자 제외). 템플릿 하나는 문자열 하나.
「어절」= 띄어쓰기 단위. 영어 단어는 어절 × 1.4로 어림한다(조사가 붙은 한국어 어절 하나가 영어 1~2단어).
옛 2.0(\`legacy.html\` → \`src/run\` · \`src/ui\` · \`src/game\`)은 번역하지 않는다 — 맨 아래에 따로.

## 1. 하드코딩 — src/data/ 밖에 있는 한글 (옮길 대상)

${table(hard, H)}

## 2. 데이터 — src/data/ 안 (번역 분량)

${table(data, D)}

**본편 전체 = ${H.n + D.n} 문자열 · ${H.w + D.w} 어절 ≈ 영어 ${Math.round((H.w + D.w) * 1.4).toLocaleString('en-US')} 단어.**
(대본 \`docs/storyboard.md\`는 위 데이터에서 뽑은 것이라 따로 세지 않는다. 스토어 · 법률 문서는 별도.)

옛 2.0 (번역 안 함): ${legacy.n} 문자열 · ${legacy.w} 어절.

## 3. 파일별 — 하드코딩

| 파일 | 영역 | 문자열 | 어절 | 예 |
|---|---|---:|---:|---|
${fileRows(false)}

## 4. 파일별 — 데이터

| 파일 | 영역 | 문자열 | 어절 | 예 |
|---|---|---:|---:|---|
${fileRows(true)}
`;
if (process.argv.includes('--write')) {
  fs.mkdirSync(path.join(ROOT, 'docs/loc'), { recursive: true });
  // 손으로 쓴 머리말(「옮긴 것」 등)이 있으면 그 뒤에 붙인다
  const out = path.join(ROOT, 'docs/loc/inventory.md');
  const keep = fs.existsSync(out) ? fs.readFileSync(out, 'utf8').split('<!-- audit -->')[1] ?? '' : '';
  fs.writeFileSync(out, md + '\n<!-- audit -->' + keep);
}
console.log(`hard-coded ${H.n} strings / ${H.w} words · data ${D.n} / ${D.w} · legacy ${legacy.n} / ${legacy.w}`);
for (const a of AREAS) console.log(a.padEnd(9), 'hard', String(hard[a].n).padStart(5), String(hard[a].w).padStart(6), ' data', String(data[a].n).padStart(5), String(data[a].w).padStart(6));
