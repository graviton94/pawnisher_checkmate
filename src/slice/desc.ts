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

/** 세 칸 HTML — 묘사(2줄까지) · (조건) · 성능(셀) */
export const descHtml = (text: string, flavor?: string): string => {
  const d = splitDesc(text, flavor);
  // D-370: 괄호 없이 — 묘사 → (점선) 조건 + 효과 한 문장. 효과는 굵게, 숫자만 붉은 먹
  const nb = (t: string) => t.replace(/(한|두|세|\d) (칸|장|번)/g, '$1\u00a0$2');
  // 효과 항목(「 · 」로 나뉜 것)은 한 덩어리씩 — 줄은 항목 사이에서 먼저 바뀐다 (D-373)
  const fx = d.fx ? `<b class="dl-fx">${nb(d.fx).split(' · ').map((x) => `<span class="fxi">${x.replace(/([+×−]?\d+(?:\.\d+)?%?)/g, '<em>$1</em>')}</span>`).join('<span class="sep">·</span>')}</b>` : '';
  const tail = d.cond || fx ? `<span class="dl dl-fxb">${d.cond ? `<span class="dl-if">${nb(d.cond)}</span> ` : ''}${fx}</span>` : '';
  return `${d.say ? `<span class="dl dl-say">${nb(d.say)}</span>` : ''}${tail}`;
};

/** 글 폭 어림 (갈무리: 한글 1칸, 영숫자 · 기호 0.6, 빈칸 0.35) — 테스트가 줄 넘침을 잡는다 */
export const textWidth = (s: string): number =>
  [...s.replace(/<[^>]+>/g, '')].reduce((a, ch) => a + (/[가-힣]/.test(ch) ? 1 : ch === ' ' ? 0.35 : /[×−—·→「」]/.test(ch) ? 0.9 : 0.6), 0);

/** 줄 한도 (레일 카드 196px 기준 — 묘사 15px 두 줄, 기능 · 조건 12px 한 줄) */
export const DESC_LIMIT = { say: 17.5, fx: 14, cond: 14, tail: 26 }; // D-375: 두루마리 한 줄 ≈ 한글 8.5자 — 묘사 2줄 · 조건 + 효과 3줄 (화면 실측: tools 없이 sliceApi.allFaces 줄 수)
