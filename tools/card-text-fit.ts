/**
 * 카드 줄 규격 전수 측정 (D-511 → D-515 — 모든 카드 성격 × 모든 글 줄).
 * 규격표 = `src/slice/card-spec.ts` CARD_SPEC (성격마다 줄 종류별 최대 행 · 글꼴 · 실측 폭). 회귀 테스트 = `tests/card-spec.test.ts`.
 * 넘침 = 줄이 행 폭을 넘음 · 줄 종류의 최대 행 수를 넘음 · 두루마리 위/아래 칸 합계를 넘음.
 * 사용: npx jiti tools/card-text-fit.ts [--list]
 */
import { allCardTexts, CARD_SPEC, FONT_LABEL, specOver, type CardNature, type LineKind } from '../src/slice/card-spec';

const KIND: Record<LineKind, string> = { name: '이름', tag: '태그', say: '묘사', trait: '특성 이름', if: '조건', fx: '효과' };
const all = allCardTexts();
console.log('| 성격 | 수 | 넘침 | 줄 규격 (최대 행 · 글꼴 · 폭) |\n|---|---|---|---|');
let over = 0;
for (const n of Object.keys(CARD_SPEC) as CardNature[]) {
  const sp = CARD_SPEC[n];
  const its = all.filter((c) => c.nature === n);
  const bad = its.filter((c) => specOver(c).length).length;
  over += bad;
  const spec = (Object.entries(sp.lines) as [LineKind, { max: number; font: keyof typeof FONT_LABEL }][]).map(([k, v]) => `${KIND[k]} ${v.max} · ${FONT_LABEL[v.font]} · ${k === 'name' ? sp.px.name : k === 'tag' ? sp.px.tag : sp.px.row}px`).join(' / ');
  console.log(`| ${sp.label} | ${its.length} | ${bad} | ${spec} — 위 칸 ${sp.top} · 아래 칸 ${sp.bottom} |`);
}
console.log(`| 합 | ${all.length} | ${over} | |`);
if (process.argv.includes('--list')) for (const c of all) { const bad = specOver(c); if (bad.length) console.log(`${CARD_SPEC[c.nature].label} ${c.id}: ${bad.join(' / ')}`); }
