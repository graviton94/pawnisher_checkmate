/** 효과는 부호가 아니라 플레이어의 득실로 색을 정한다. 선택지는 데이터에 의미를 명시한다. */
export type EffectTone = 'gain' | 'loss' | 'neutral';
export const effectChunks = (text: string): string[] => text.split(/ · | → /);
const escape = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const effectNumbers = (text: string): string => text.split(/([+−×]?\d+(?:\.\d+)?%?)/g).map((s, i) => i % 2 ? `<b class="effect-num">${s}</b>` : escape(s)).join('');

/** 상태 차이에서 만든 결과 문구용. 자유 서술과 확률 자체에는 득실 색을 부여하지 않는다. */
const resultTone = (s: string): EffectTone => {
  if (/다듬기|녹 벗기기|수리/.test(s)) return 'gain';
  if (/깨짐|깨졌다|부서짐|녹슨|녹슮|폐기|빠짐|몰수|감전|잃|사라짐/.test(s)) return 'loss';
  if (/[−-]\d/.test(s)) return 'loss';
  if (/\+\d|새 카드|합류|부품/.test(s)) return 'gain';
  return 'neutral';
};

export const effectHtml = (text: string, tones?: readonly EffectTone[]): string => {
  let i = 0;
  return text.split(/( · | → )/).map((s) => {
    if (s === ' · ' || s === ' → ') return `<i class="effect-sep">${s}</i>`;
    const tone = tones?.[i++] ?? resultTone(s);
    return `<span class="effect-${tone}">${effectNumbers(s)}</span>`;
  }).join('');
};
