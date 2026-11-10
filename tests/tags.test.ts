import { describe, expect, it } from 'vitest';
import { COMMANDS, type CommandId } from '../src/slice/cards';
import { SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { cardTags, partTags, EFFECT_NAMES, STYLE_NAMES, WHO_NAMES } from '../src/slice/tags';

describe('세 칸 태그 (D-325)', () => {
  it('모든 카드 · 부품이 누가 · 어떤 · 효과 세 칸을 갖는다', () => {
    const rows: string[] = [];
    for (const id of Object.keys(COMMANDS) as CommandId[]) {
      const t = cardTags(id);
      expect(WHO_NAMES[t.who] && STYLE_NAMES[t.style] && EFFECT_NAMES[t.effect]).toBeTruthy();
      rows.push(`C ${COMMANDS[id].name} | ${WHO_NAMES[t.who]} ${STYLE_NAMES[t.style]} ${t.effect === 'rule' ? t.word : EFFECT_NAMES[t.effect]}`);
    }
    for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) {
      const t = partTags(id);
      expect(WHO_NAMES[t.who] && STYLE_NAMES[t.style] && EFFECT_NAMES[t.effect]).toBeTruthy();
      rows.push(`P ${SLICE_PARTS[id].name} | ${WHO_NAMES[t.who]} ${STYLE_NAMES[t.style]} ${t.effect === 'rule' ? t.word : EFFECT_NAMES[t.effect]} — ${SLICE_PARTS[id].desc}`);
    }
    if ((globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.TAGS_DUMP) console.log(rows.join('\n'));
  });
});
