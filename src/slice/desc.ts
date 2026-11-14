/**
 * 카드 · 부품 · 선택지 설명 문단 (사용자 결정 D-333): 최대 네 줄, 줄마다 할 일이 하나.
 *  ① 묘사 — 비장한 한 문장, 자연스러운 줄바꿈으로 최대 2줄
 *  ② (조건) — 발동 조건 · 대가 · 덧말 1줄, 괄호 (사용자 D-335)
 *  ③ 성능 — 셀 배경 · 가장 강조, 1줄
 * D-370: 화면은 괄호 없이 묘사 → 점선 → 「조건 + 효과」 한 문장 (조건 보통 · 효과 굵게 · 숫자 붉게).
 * 데이터 문법: 카드 `묘사. (기능 — 조건)` · 부품 `flavor` + desc `기능 — 조건` (대가는 `— 대가: …`).
 */
export interface DescParts {
  say: string;
  fx: string;
  cond: string;
}

/** 글을 세 칸으로 나눈다. flavor가 있으면 text 전체가 기능(— 조건) */
export const splitDesc = (text: string, flavor?: string): DescParts => {
  const t = text.trim();
  if (flavor !== undefined) {
    const [fx, ...rest] = t.replace(/\.$/, '').split(' — ');
    return { say: flavor, fx: fx.trim(), cond: rest.join(' — ').trim() };
  }
  const m = t.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!m) return { say: t, fx: '', cond: '' };
  const [fx, ...rest] = m[2].split(' — ');
  return { say: m[1].trim(), fx: fx.trim(), cond: rest.join(' — ').trim() };
};

/** 두루마리 한 줄 폭 (D-377, 한글 칸 수 어림) — 넘는 줄은 화면이 글자를 줄인다 (줄바꿈 없음) */
export const LINE_W = 8.5;
const nb = (t: string): string => t.replace(/(한|두|세|\d) (칸|장|번)/g, '$1\u00a0$2');
const red = (t: string): string => t.replace(/([+×−]?\d+(?:\.\d+)?%?)/g, '<em>$1</em>');

/** 한 문장을 많아야 두 줄로: 한 줄에 들면 그대로, 아니면 두 줄 폭이 가장 고른 빈칸에서 나눈다 (쉼표 뒤를 먼저) */
export const splitTwo = (s: string): string[] => {
  const t = s.trim();
  if (textWidth(t) <= LINE_W) return [t];
  let best = -1, score = Infinity;
  for (let k = 0; k < t.length; k++) {
    if (t[k] !== ' ') continue;
    const a = t.slice(0, k), b = t.slice(k + 1);
    const sc = Math.max(textWidth(a), textWidth(b)) - (/[,.]$/.test(a) ? 1.5 : 0);
    if (sc < score) { score = sc; best = k; }
  }
  return best < 0 ? [t] : [t.slice(0, best), t.slice(best + 1)];
};

/** 12px 갈무리11 한 행 폭 (그림 카드 두루마리 실측 99px — D-470, 화면 검사: 99px 줄은 넘치지 않는다) */
export const ROW_PX = 99;
/**
 * 한 행에 들지 않는 줄을 여러 행으로 접는다 (D-422 · D-488 — 글자를 줄이거나 자르지 않는다).
 * 「 · 」 사이에서 먼저 나누고, 한 항목이 그래도 길면 띄어쓰기에서 — 두 행이면 폭이 고른 자리에서 나눠 꾸밈말이 줄 끝에 홀로 남지 않게 한다.
 */
export const wrapRows = (t: string, bold = false, px = ROW_PX): string[] => {
  const fits = (x: string): boolean => pxWidth(x, bold) <= px;
  if (fits(t)) return [t];
  const out: string[] = [];
  let curr = '';
  for (const item of t.split(' · ')) {
    const next = curr ? `${curr} · ${item}` : item;
    if (fits(next)) { curr = next; continue; }
    if (curr) out.push(curr);
    curr = '';
    if (fits(item)) { curr = item; continue; }
    // 한 항목이 한 행보다 길다 — 낱말 단위로. 두 행에 들면 두 행 폭이 가장 고른 자리(쉼표 뒤 먼저)에서 나눈다
    const words = item.split(' ');
    let best = -1, score = Infinity;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      if (!fits(a) || !fits(b)) continue;
      const sc = Math.max(pxWidth(a, bold), pxWidth(b, bold)) - (/,$/.test(a) ? 24 : 0);
      if (sc < score) { score = sc; best = k; }
    }
    if (best > 0) { out.push(words.slice(0, best).join(' ')); curr = words.slice(best).join(' '); continue; }
    let line = '';
    for (const w of words) {
      const n = line ? `${line} ${w}` : w;
      if (fits(n) || !line) line = n;
      else { out.push(line); line = w; }
    }
    curr = line;
  }
  if (curr) out.push(curr);
  return out;
};

/** 조건이 붙은 효과 한 줄을 「조건 / 효과」 두 줄로 (…하면 · …때 · …마다 · …에) */
export const condSplit = (s: string): string[] => {
  const m = s.match(/^(.+?(?:면|때|마다|시작에|끝에)) (.+)$/);
  return m && textWidth(s) > LINE_W ? [m[1], m[2]] : [s];
};

/** 아래 칸 줄 (D-377): 조건 1줄 + 효과 항목 1줄씩, 많아야 3줄 — 넘치는 항목은 마지막 줄에 「 · 」로 붙인다 */
export const bottomLines = (cond: string, fx: string): { t: string; k: 'if' | 'fx' }[] => {
  const out: { t: string; k: 'if' | 'fx' }[] = [];
  let items = fx ? fx.split(' · ') : [];
  if (!cond && items.length === 1) {
    const c = condSplit(items[0]);
    if (c.length === 2) { out.push({ t: c[0], k: 'if' }); items = [c[1]]; }
  }
  // 조건이 「…하면 · 턴에 한 번」처럼 둘이면 두 줄로 (효과 자리가 모자라면 효과를 한 줄로 합친다)
  const conds = cond ? cond.split(' · ') : [];
  if (conds.length + Math.min(items.length, 1) > 3) conds.splice(2, conds.length, conds.slice(2).join(' · '));
  conds.forEach((t) => out.push({ t, k: 'if' }));
  if (items.length && out.length >= 3) out.splice(2);
  const slots = 3 - out.length;
  if (items.length > slots) items = [...items.slice(0, slots - 1), items.slice(slots - 1).join(' · ')];
  items.forEach((t) => out.push({ t, k: 'fx' }));
  // 한 행에 들지 않는 줄은 글자를 줄이지 않고 행으로 접는다 (D-422 · D-488)
  return out.flatMap((l) => wrapRows(l.t, l.k === 'fx').map((t) => ({ t, k: l.k })));
};

/**
 * 카드 본문 (사용자 결정 D-377): 위 칸(2줄) · 점선 · 아래 칸(3줄). 점선은 글 길이와 상관없이 본문의 2:3 자리.
 * 한 칸만 있으면 점선 없이 본문 한가운데. 모든 줄은 한 줄 그대로(줄바꿈 없음) — 넘치면 그 줄 글자를 줄인다.
 */
export const bodyHtml = (top: string[], bottom: string[]): string => {
  const two = top.length > 0 && bottom.length > 0;
  return `<span class="db ${two ? 'two' : 'one'}">${top.length ? `<span class="db-top">${top.join('')}</span>` : ''}${bottom.length ? `<span class="db-bot">${bottom.join('')}</span>` : ''}</span>`;
};
export const lineHtml = (t: string, k: 'say' | 'if' | 'fx' | 'name' = 'say'): string =>
  `<span class="ln ln-${k}">${k === 'fx' ? `<b>${red(nb(t))}</b>` : nb(t)}</span>`;

/** 카드 · 부품 · 선택지 설명 — 위 칸 묘사 · 아래 칸 조건 / 효과 */
export const descHtml = (text: string, flavor?: string): string => {
  const d = splitDesc(text, flavor);
  return bodyHtml(d.say ? splitTwo(d.say).map((x) => lineHtml(x)) : [], bottomLines(d.cond, d.fx).map((l) => lineHtml(l.t, l.k)));
};

/** 글 폭 어림 (갈무리: 한글 1칸, 영숫자 · 기호 0.6, 빈칸 0.35) — 테스트가 줄 넘침을 잡는다 */
export const textWidth = (s: string): number =>
  [...s.replace(/<[^>]+>/g, '')].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 1 : ch === ' ' || ch === '\u00a0' ? 0.35 : /[×−—·→「」]/.test(ch) ? 0.9 : 0.6), 0);

/** 12px 갈무리11 실측 폭(px — D-470 화면 canvas 측정, 굵게는 효과 줄). 그림 카드 부품 행은 99px */
export const pxWidth = (s: string, bold = false): number =>
  [...s.replace(/<[^>]+>/g, '')].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 12 : ch === ' ' ? 5 : /[0-9]/.test(ch) ? (bold ? 5 : 6) : /[.,·:]/.test(ch) ? 5 : /[+×A-Za-z]/.test(ch) ? 9 : ch === '−' ? 8 : ch === '%' && !bold ? 10 : 12), 0);

/** 줄 한도 (레일 카드 196px 기준 — 묘사 15px 두 줄, 기능 · 조건 12px 한 줄) */
export const DESC_LIMIT = { say: 17.5, fx: 14, cond: 14, tail: 26 }; // D-375: 두루마리 한 줄 ≈ 한글 8.5자 — 묘사 2줄 · 조건 + 효과 3줄 (화면 실측: tools 없이 sliceApi.allFaces 줄 수)
