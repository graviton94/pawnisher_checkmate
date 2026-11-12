import type { SlicePartId } from './parts';
import { bottomLines, lineHtml } from './desc';
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

/** 좁은 그림 카드도 조건 → : 효과 순서. 묘사는 빼고 같은 세 행을 예약한다. */
export const partCardRuleHtml = (id: SlicePartId): string => {
  const a = partSummaryText(id);
  let firstEffect = true;
  // 공성의 조건 두 줄+긴 효과를 네 줄로 만들지 않는다. 조건을 한 줄로 모으고 변환을 두 줄로 읽는다.
  const rules = id === 'siegeLatch'
    ? [{ t: a.description.replace(' · 턴에 한 번', '·턴1회'), k: 'if' as const },
      { t: a.effect.split(' → ')[0], k: 'fx' as const }, { t: `→ ${a.effect.split(' → ')[1]}`, k: 'fx' as const }]
    : bottomLines(a.description, a.effect);
  const lines = rules.map((l) => {
    const text = l.k === 'fx' && firstEffect ? `: ${l.t}` : l.t;
    if (l.k === 'fx') firstEffect = false;
    return lineHtml(text, l.k);
  });
  while (lines.length < 3) lines.push('<span class="ln" aria-hidden="true"></span>');
  return `<span class="part-rule-lines">${lines.join('')}</span>`;
};
