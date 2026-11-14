import type { SlicePartId } from './parts';
import { lineHtml, pxWidth, wrapRows } from './desc';
import { partSummaryText, type AbilityText } from '../data/ability-text';

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** 명칭·설명·상세 효과. 복합 능력은 다음 장으로 넘겨도 항상 세 줄만 보인다. */
export const abilityHtml = (abilities: AbilityText[], index = 0): string => {
  if (!abilities.length) return '';
  const a = abilities[index], many = abilities.length > 1;
  const tag = many ? 'button' : 'div';
  return `<${tag} class="ability-block"${many ? ` type="button" data-peek-action data-ability-next data-ability-index="${index}" aria-label="다음 능력. ${escape(a.name)}, ${index + 1}/${abilities.length}"` : ''}><span class="ability-heading"><span class="ability-name">[${escape(a.name)}]</span>${many ? `<span class="ability-next">${index + 1}/${abilities.length} · 다음 ›</span>` : ''}</span><span class="ability-description">${escape(a.description)}</span><span class="ability-effect">: ${escape(a.effect)}</span></${tag}>`;
};

/** 다음 능력으로 바꿀 때 검사표 전체를 닫거나 다시 배치하지 않는다. */
export const bindAbilities = (host: HTMLElement, abilities: AbilityText[]): void => {
  if (host.dataset.abilitiesBound) return;
  host.dataset.abilitiesBound = '1';
  host.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-ability-next]');
    if (!button || !host.contains(button)) return;
    button.outerHTML = abilityHtml(abilities, (Number(button.dataset.abilityIndex) + 1) % abilities.length);
    host.querySelector<HTMLButtonElement>('[data-ability-next]')?.focus({ preventScroll: true });
  });
};

/** 그림 카드 한 행에 12px로 드는 폭 (실측 99px, 굵은 글자 반올림 여유 2px) */
export const PART_ROW_PX = 97;
/**
 * 좁은 그림 카드의 부품 줄 (D-470 → D-475 → D-488): 세 행 틀은 그대로 — 언제(길면 쉼표 뒤에서 두 행) · : 효과.
 * 글자를 줄이지 않는다(D-422): 효과가 한 행에 안 들면 「 · 」 사이에서 남는 행으로 접는다. 넷째 행은 없다 — 데이터 문구가 맞춘다(테스트).
 */
export const partRuleRows = (id: SlicePartId): { t: string; k: 'if' | 'fx' }[] => {
  const a = partSummaryText(id);
  const comma = a.description.indexOf(', ');
  const when = pxWidth(a.description) > PART_ROW_PX && comma > 0 ? [a.description.slice(0, comma + 1), a.description.slice(comma + 2)] : [a.description];
  return [...when.flatMap((t) => wrapRows(t, false)).map((t) => ({ t, k: 'if' as const })), ...wrapRows(`: ${a.effect}`, true).map((t) => ({ t, k: 'fx' as const }))];
};
export const partCardRuleHtml = (id: SlicePartId): string => {
  const lines = partRuleRows(id).map((l) => lineHtml(l.t, l.k));
  while (lines.length < 3) lines.push('<span class="ln" aria-hidden="true"></span>');
  return `<span class="part-rule-lines">${lines.join('')}</span>`;
};
