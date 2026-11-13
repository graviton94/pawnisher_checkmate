import { simulateRun, type RunBuild, type RunStyle } from '../src/sim/runbot';
import type { CommandId } from '../src/slice/cards';
import type { SlicePartId } from '../src/slice/parts';

/** 실험실 아이템 힘 측정 작업자 (D-456): 같은 시드로 아이템을 쥐여 준 출하 vs 안 준 출하 — tools/simlab-items.mjs가 부른다 */
const style = (process.env.SL_STYLE ?? 'greedy') as RunStyle;
const asc = Number(process.env.SL_ASC ?? 2), n = Number(process.env.SL_N ?? 40), off = Number(process.env.SL_OFF ?? 0), temp = Number(process.env.SL_TEMP ?? 0);
const items = (process.env.SL_ITEMS ?? '').split(',').filter(Boolean);
const build = (process.env.SL_BUILD ?? 'neutral') as RunBuild;
for (const item of items) {
  const [kind, id] = item.split(':');
  for (let i = 0; i < n; i++) {
    const seed = 52000 + (off + i) * 7919;
    const r = simulateRun(seed, { asc, style, temp, build, ...(kind === 'part' ? { forceParts: [id as SlicePartId] } : kind === 'card' ? { forceCards: [id as CommandId] } : {}) });
    const won = r.log.filter((l) => l.won).length;
    process.stdout.write(`SL ${JSON.stringify([item, seed, r.cleared ? 1 : 0, won, r.act])}\n`);
  }
}
