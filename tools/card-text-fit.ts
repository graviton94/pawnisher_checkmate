/**
 * 카드 글 예산 전수 측정 (D-511 → D-515 → D-589 카드 글 문법 통일).
 * 모든 카드를 세 칸(묘사 · [능력명] 조건 · 효과)으로 읽어 작은 단(150px · 조건/효과 10px) · 큰 단(188px · 모든 줄 12px) 예산을 잰다.
 * 사용: npx jiti tools/card-text-fit.ts [--list] [--md]
 *   --list  넘친 카드와 이유
 *   --md    전수 표(마크다운, docs/reports 재고 표용)
 */
import { CARD_TEXT_PENDING } from '../src/data/card-text';
import { allCardTexts, cardKey, cardRows, CARD_SPEC, specOver, type CardNature } from '../src/slice/card-spec';

const all = allCardTexts();
const md = process.argv.includes('--md');
if (!md) {
  console.log('| 성격 | 수 | 작은 단 넘침 | 큰 단 넘침 | 행 폭 s · l (px) |\n|---|---|---|---|---|');
  let s = 0, l = 0;
  for (const n of Object.keys(CARD_SPEC) as CardNature[]) {
    const its = all.filter((c) => c.nature === n);
    const bs = its.filter((c) => specOver(c, 's').length).length, bl = its.filter((c) => specOver(c, 'l').length).length;
    s += bs; l += bl;
    console.log(`| ${CARD_SPEC[n].label} | ${its.length} | ${bs} | ${bl} | ${CARD_SPEC[n].px.row} · ${CARD_SPEC[n].px.rowL} |`);
  }
  console.log(`| 합 | ${all.length} | ${s} | ${l} | |`);
}
if (process.argv.includes('--list')) for (const c of all) for (const t of ['s', 'l'] as const) { const bad = specOver(c, t); if (bad.length) console.log(`${t} ${cardKey(c)}${CARD_TEXT_PENDING.includes(cardKey(c)) ? ' (승인 대기)' : ''}: ${bad.join(' / ')}`); }
if (md) {
  const cell = (s: string): string => s.replace(/\|/g, '\\|') || '—';
  console.log('| 성격 | id | 명판 | ① 묘사 | [능력명] | ② 조건 | ③ 효과 | 큰 단 행 (위 / 아래) | 예산 s · l |\n|---|---|---|---|---|---|---|---|---|');
  for (const c of all) {
    const r = cardRows(c, 'l');
    const ok = (t: 's' | 'l'): string => (specOver(c, t).length ? '넘침' : '○');
    console.log(`| ${CARD_SPEC[c.nature].label} | ${cell(c.id)} | ${cell(c.name)} | ${cell(c.slots.flavor)} | ${cell(c.slots.title)} | ${cell(c.slots.cond.join(' · '))} | ${cell(c.slots.effect.join(' · '))} | ${cell(r.top.join(' / '))} ‖ ${cell(r.bot.map((x) => x.t).join(' / '))} | ${ok('s')} · ${ok('l')} |`);
  }
}
