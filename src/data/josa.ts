/**
 * 한국어 조사 (페르소나 테스트 c1): 받침 유무로 「을/를 · 이/가 · 은/는 · 과/와」를 고른다.
 * 한글이 아닌 끝 글자(숫자 · 영문 · 기호)는 받침 없는 쪽으로 본다.
 */
const PAIRS = { 을: ['을', '를'], 이: ['이', '가'], 은: ['은', '는'], 과: ['과', '와'] } as const;

/** 받침이 있는가 (마지막 한글 음절 기준) */
export const hasBatchim = (word: string): boolean => {
  const ch = word.trim().replace(/[\s'"’”」』)\]]+$/, '').slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};

/** 낱말 + 알맞은 조사. josa('나사', '을') → '나사를' */
export const josa = (word: string | undefined, k: keyof typeof PAIRS): string => (word ?? '') + PAIRS[k][hasBatchim(word ?? '') ? 0 : 1];
