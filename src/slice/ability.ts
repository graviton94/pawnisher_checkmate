import type { SlicePartId } from './parts';
import { lineHtml, pxWidth, splitTwo } from './desc';
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

/** 그림 카드 한 행에 12px로 드는 폭 (실측 99px) */
export const PART_ROW_PX = 97; // 실측 99px — 굵은 글자 반올림 여유 2px
/** 한 문장을 행 폭에 맞춰 낱말 단위로 나눈다 — 쉼표 뒤에서 먼저 끊는다 */
const wrapRows = (s: string, bold = false): string[] => {
  const fits = (t: string): boolean => pxWidth(t, bold) <= PART_ROW_PX;
  if (fits(s)) return [s];
  const comma = s.indexOf(', ');
  if (comma > 0) return [s.slice(0, comma + 1), ...wrapRows(s.slice(comma + 2), bold)];
  const two = splitTwo(s);
  return two.length > 1 && two.every(fits) ? two : s.split(' ').reduce<string[]>((rows, w) => {
    const last = rows.at(-1);
    if (last !== undefined && fits(`${last} ${w}`)) rows[rows.length - 1] = `${last} ${w}`; else rows.push(w);
    return rows;
  }, []);
};
/**
 * 좁은 그림 카드의 부품 줄 (D-470): 언제 한 문장(넘치면 두 행) → : 효과 한 문장(득실 둘이 넘치면 항목마다 한 행).
 * 많아야 네 행 — 글자를 줄여 맞추지 않는다(D-422).
 */
export const partRuleRows = (id: SlicePartId): { t: string; k: 'if' | 'fx' }[] => {
  const a = partSummaryText(id);
  const when = wrapRows(a.description).map((t) => ({ t, k: 'if' as const }));
  const arrow = a.effect.includes(' → ');
  const items = a.effect.split(arrow ? ' → ' : ' · ');
  // 효과 첫 행은 「: 」로 시작한다 — 그 폭까지 재서 나눈다
  const fx = (items.length > 1 && pxWidth(`: ${a.effect}`, true) > PART_ROW_PX ? items.map((t, i) => (i === 0 ? `: ${t}` : arrow ? `→ ${t}` : t)) : [`: ${a.effect}`])
    .flatMap((t) => wrapRows(t, true)).map((t) => ({ t, k: 'fx' as const }));
  return [...when, ...fx];
};
export const partCardRuleHtml = (id: SlicePartId): string => {
  const lines = partRuleRows(id).map((l) => lineHtml(l.t, l.k));
  while (lines.length < 3) lines.push('<span class="ln" aria-hidden="true"></span>');
  return `<span class="part-rule-lines" style="--rows:${lines.length}">${lines.join('')}</span>`;
};
