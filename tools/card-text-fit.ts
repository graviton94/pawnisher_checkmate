/**
 * 카드 조건 · 효과 줄 전수 측정 (D-511 — D-475 「효과는 늘 한 행」 × D-422 「줄이거나 자르지 않는다」).
 * 카드 두루마리 한 행 폭(ROW_PX 99px · 분대원 카드 CREW_ROW_PX 95px, 화면 실측)에 조건 · 효과 줄이 한 행으로 드는지, 글꼴 두 벌로 잰다:
 *   전 = 갈무리11 12px(조건 보통 · 효과 굵게) · 후 = 갈무리9 10px(카드 글 맞춤, D-213 허용 범위).
 * 넘침 = 효과 줄이 다음 행으로 넘어감 · 조건이 허용 행(부품 언제 2행, 그 밖 1행)을 넘음 · 세 행 틀을 넘음.
 * 사용: npx jiti tools/card-text-fit.ts [--list]
 */
import { COMMANDS } from '../src/slice/cards';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { QUIRKS } from '../src/slice/crew';
import { FORMS } from '../src/data/forms';
import { SERVICE_CARDS } from '../src/data/hud';
import { START_SETS } from '../src/data/start-sets';
import { partSummaryText } from '../src/data/ability-text';
import { bottomLogical, CREW_ROW_PX, pxWidth, ROW_PX, splitDesc, type CardFont } from '../src/slice/desc';

type Row = { t: string; k: 'if' | 'fx' | 'say' };
interface Item { surface: string; id: string; rows: Row[]; whenRows?: number; maxRows?: number; px?: number }

/** 표면마다 논리 줄 (줄 하나 = 카드 위 한 행이어야 한다) */
const items: Item[] = [];
for (const [id, c] of Object.entries(COMMANDS)) {
  const d = splitDesc(c.desc || '');
  items.push({ surface: '명령 카드', id, rows: bottomLogical(d.cond, d.fx) });
}
for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) {
  const a = partSummaryText(id);
  items.push({ surface: '부품 카드', id, rows: [{ t: a.description, k: 'if' }, { t: `: ${a.effect}`, k: 'fx' }], whenRows: 2 });
}
for (const k of ['heal', 'repair', 'refine', 'remove', 'brace'] as const) {
  const d = splitDesc(SERVICE_CARDS[k].desc(k === 'repair' ? 50 : k === 'heal' ? 25 : 1));
  items.push({ surface: '손질 카드', id: k, rows: bottomLogical(d.cond, d.fx) });
}
for (const [id, q] of Object.entries(QUIRKS)) items.push({ surface: '분대원 기벽', id, rows: bottomLogical('', q.desc), maxRows: 2, px: CREW_ROW_PX }); // 이름 줄 아래 두 행
for (const [id, f] of Object.entries(FORMS)) items.push({ surface: '분대원 이형', id, rows: [{ t: f.move, k: 'if' }, { t: f.hit, k: 'fx' }], maxRows: 2, px: CREW_ROW_PX });
for (const [id, s] of Object.entries(START_SETS)) items.push({ surface: '시작 세트', id, rows: [{ t: s.rows[1], k: 'if' }, { t: s.rows[2], k: 'fx' }], maxRows: 2 });

/** 줄 글꼴: 묘사(say)는 늘 갈무리11 12px — 조건 · 효과만 바뀐다. 전 = 이 변경 전 글꼴(분대원 기벽 효과 · 이형 공격 · 세트 끝 줄은 묘사 줄 12px 보통이었다 — 굵게로 재면 조금 넓게 잡힌다) */
const fontOf = (k: Row['k'], era: 'before' | 'after'): CardFont => (k === 'say' ? 'g11' : era === 'after' ? 'g9' : k === 'fx' ? 'g11b' : 'g11');
/** 이 줄이 차지하는 행 수 (부품 언제는 쉼표 뒤에서 두 행까지 허용 — D-475) */
const rowsOf = (r: Row, era: 'before' | 'after', when = false, px = ROW_PX): number => {
  const w = pxWidth(r.t, fontOf(r.k, era));
  if (w <= px) return 1;
  if (when) { const c = r.t.indexOf(', '); if (c > 0 && pxWidth(r.t.slice(0, c + 1), fontOf(r.k, era)) <= px && pxWidth(r.t.slice(c + 2), fontOf(r.k, era)) <= px) return 2; }
  return Math.ceil(w / px) + 1;
};
const overOf = (it: Item, era: 'before' | 'after'): string[] => {
  const bad: string[] = [];
  let total = 0;
  it.rows.forEach((r, i) => {
    const n = rowsOf(r, era, it.whenRows !== undefined && i === 0, it.px);
    total += n;
    if (n > (it.whenRows !== undefined && i === 0 ? it.whenRows : 1)) bad.push(`${r.k} 「${r.t}」 ${pxWidth(r.t, fontOf(r.k, era))}px`);
  });
  if (total > (it.maxRows ?? 3)) bad.push(`${total}행`);
  return bad;
};

const list = process.argv.includes('--list');
const surfaces = [...new Set(items.map((i) => i.surface))];
console.log(`행 폭 ${ROW_PX}px(분대원 카드 ${CREW_ROW_PX}px) · 전 = 갈무리11 12px · 후 = 갈무리9 10px (조건 · 효과 줄)`);
console.log('| 표면 | 수 | 넘침(전) | 넘침(후) |\n|---|---|---|---|');
let tb = 0, ta = 0;
for (const s of surfaces) {
  const its = items.filter((i) => i.surface === s);
  const b = its.filter((i) => overOf(i, 'before').length).length, a = its.filter((i) => overOf(i, 'after').length).length;
  tb += b; ta += a;
  console.log(`| ${s} | ${its.length} | ${b} | ${a} |`);
}
console.log(`| 합 | ${items.length} | ${tb} | ${ta} |`);
if (list) for (const era of ['before', 'after'] as const) {
  console.log(`\n# 넘침 (${era === 'before' ? '전' : '후'})`);
  for (const it of items) { const bad = overOf(it, era); if (bad.length) console.log(`${it.surface} ${it.id}: ${bad.join(' / ')}`); }
}
