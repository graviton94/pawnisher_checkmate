// 실제 데이터 모듈로 콘텐츠·공급 경로를 재집계한다. 전투 승률/재미 측정과 구분한다.
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const cards = await server.ssrLoadModule('/src/slice/cards.ts');
  const parts = await server.ssrLoadModule('/src/slice/parts.ts');
  const unlock = await server.ssrLoadModule('/src/data/unlocks.ts');
  const baseCards = Object.entries(cards.COMMANDS).filter(([id]) => !/[+~]$/.test(id));
  const report = {
    counts: { baseCards: baseCards.length, rewardCards: cards.REWARD_COMMANDS.length, parts: Object.keys(parts.SLICE_PARTS).length, kits: cards.KITS.length },
    kits: cards.KITS.map((k) => ({ ...k, grade: parts.PART_GRADE[k.part] ?? 'common' })),
    parts: Object.entries(parts.SLICE_PARTS).map(([id, p]) => ({ id, ...p, grade: parts.PART_GRADE[id] ?? 'common', needs: parts.PART_NEEDS[id] ?? '', starter: unlock.STARTER_PARTS.includes(id), kit: cards.KITS.some((k) => k.part === id) })),
    cards: baseCards.map(([id, c]) => ({ id, ...c, grade: cards.gradeOf(id), starter: unlock.STARTER_CARDS.includes(id), reward: cards.REWARD_COMMANDS.includes(id) })),
  };
  await writeFile(process.argv[2] || '/tmp/pawnisher-build-audit.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
} finally { await server.close(); }
