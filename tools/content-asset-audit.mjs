// D-432: 실행 모듈·공급 경로·원본/공유 아이콘 감사. 파일 존재는 미술 품질 판정이 아니다.
import { createServer } from 'vite';
import ts from 'typescript';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };
const root = process.cwd(), seen = new Set(), queue = ['src/slice/main.ts'];
while (queue.length) {
  const file = queue.shift(); if (seen.has(file)) continue; seen.add(file);
  const source = await readFile(file, 'utf8');
  for (const imp of ts.preProcessFile(source, true, true).importedFiles) {
    if (!imp.fileName.startsWith('.')) continue;
    const base = path.resolve(path.dirname(file), imp.fileName);
    const resolved = (await Promise.all([base, base + '.ts', base + '/index.ts'].map(async (p) => await exists(p) && p.endsWith('.ts') ? p : null))).find(Boolean);
    if (resolved) queue.push(path.relative(root, resolved));
  }
}
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const cards = await server.ssrLoadModule('/src/slice/cards.ts');
  const parts = await server.ssrLoadModule('/src/slice/parts.ts');
  const unlock = await server.ssrLoadModule('/src/data/unlocks.ts');
  const script = await server.ssrLoadModule('/src/data/script.ts');
  const base = Object.entries(cards.COMMANDS).filter(([id]) => !/[+~]$/.test(id));
  const ids = Object.keys(parts.SLICE_PARTS), all = new Set([...base.map(([id]) => id), ...ids]);
  const missing = [], assets = [];
  const inspect = async (file, consumer) => { const present = await exists(file); assets.push({ file, consumer, present }); if (!present) missing.push({ file, consumer }); };
  const byIcon = {};
  for (const [id, def] of Object.entries(parts.SLICE_PARTS)) { (byIcon[def.icon] ??= []).push(id); await inspect(`public/ui/icons16/${def.icon}.png`, `part:${id}`); }
  for (const [id, c] of base) if (c.who === 'any') await inspect(`public/ui/icons16/c.${id}.png`, `card:${id}`);
  for (const type of ['P','N','B','R','Q','K']) await inspect(`public/ui/hud/crew-${type}.png`, `crew:${type}`);
  const cuts = [...script.PROLOGUE, script.ENDING_A, script.DEFEAT, script.CROWN_OFF,
    ...script.trueEndingCuts([], { alive: [], fallen: [] }), ...[0,1,2].flatMap((a) => script.promotionCuts(a, '먼지투성이', '', ''))];
  for (const img of new Set(cuts.map((c) => c.img))) await inspect(`public/scenes/${img}.png`, 'story-cut');
  const unlocked = new Set([...unlock.STARTER_CARDS, ...unlock.STARTER_PARTS, ...unlock.UNLOCK_ORDER]);
  const basic = new Set(cards.START_DECK.map(cards.baseOf));
  const incompleteSupply = cards.REWARD_COMMANDS.filter((id) => !unlocked.has(id) && !basic.has(id));
  const invalidUnlocks = [...unlocked].filter((id) => !all.has(id));
  const runtime = (await Promise.all([...seen].filter((p) => p.startsWith('src/slice/') && !p.endsWith('/parts.ts') && !p.endsWith('/cards.ts')).map((p) => readFile(p, 'utf8')))).join('\n');
  const noRuntimeLiteral = ids.filter((id) => !new RegExp(`['"]${id}['"]`).test(runtime));
  const report = {
    baseline: '2d020418', entry: 'src/slice/main.ts', reachableModules: [...seen].sort(),
    counts: { cards: base.length, rewardCards: cards.REWARD_COMMANDS.length, parts: ids.length, referencedAssets: assets.length },
    missingAssets: missing, incompleteSupply, invalidUnlocks,
    unreachableParts: ids.filter((id) => !unlocked.has(id) && !cards.KITS.some((k) => k.part === id)),
    noRuntimeLiteral,
    sharedIcons: Object.entries(byIcon).filter(([, list]) => list.length > 1).map(([icon, consumers]) => ({ icon, consumers })),
    legacyStoryImported: seen.has('src/data/story.ts'), assets,
    limitations: '공급/리소스/정적 참조 감사. 효과의 정확성과 모든 상태의 가독성은 실행 검사와 구분한다.',
  };
  await writeFile(process.argv[2] || '/tmp/pawnisher-content-asset-audit.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ...report.counts, missing: missing.length, incompleteSupply, invalidUnlocks, unreachableParts: report.unreachableParts, sharedIcons: report.sharedIcons.length, legacyStoryImported: report.legacyStoryImported }));
} finally { await server.close(); }
