/**
 * 언어 층 (D-651 — 결정 11가: 영어 출시 · 스팀 「곧 출시」 · 2027년 6월 넥스트 페스트 영어 데모).
 *
 * - 한국어가 원문이다. 영어 표에 없는 글은 한국어로 떨어진다 (빈 칸 = 아직 번역 안 함).
 * - 언어는 부팅 때 한 번 정한다: 주소 `?lang=en|ko` → 저장된 값(`pawnisher.lang`) → 'ko'.
 *   바꾸면 다시 읽는다 — 화면마다 글을 다시 그릴 필요가 없고, 한국어일 때 동작은 예전과 똑같다.
 * - 영어가 준비되기 전까지 설정의 「언어」 줄은 `?lang=` · `?debug` · 저장된 값이 있을 때만 보인다 (`langSwitchShown`).
 *
 * 쓰는 법 둘:
 *  ① 구조 있는 글 표(함수 포함): `export const X = localize(X_KO, X_EN)` — 영어 표는 같은 모양의 일부만 채운다.
 *  ② 평평한 열쇠 글: `t('hud.turnEnd')` · `t('hud.turn', { n: 3 })` — 표는 `src/data/ui-strings.ts`.
 */
export type Lang = 'ko' | 'en';
export const LANGS: readonly Lang[] = ['ko', 'en'];
/** 저장 열쇠 (설정 · 진행 저장과 따로 — 진행 초기화가 지우지 않는다) */
export const LANG_KEY = 'pawnisher.lang';
/** 언어 이름 (각 언어로 적는다 — 고르는 사람이 읽을 수 있게) */
export const LANG_NAME: Record<Lang, string> = { ko: '한국어', en: 'English' };

const isLang = (v: unknown): v is Lang => v === 'ko' || v === 'en';
const query = (): URLSearchParams | null => (typeof location !== 'undefined' ? new URLSearchParams(location.search) : null);
const stored = (): string | null => {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null;
  } catch {
    return null;
  }
};

/** 부팅 때 언어를 정한다 (주소 → 저장 → 한국어) */
export const readLang = (): Lang => {
  const q = query()?.get('lang');
  if (isLang(q)) return q;
  const s = stored();
  return isLang(s) ? s : 'ko';
};

/** 지금 언어 (부팅 때 한 번 정해진다) */
export const LANG: Lang = readLang();

/** 언어를 저장한다 (다시 읽어야 바뀐다 — 부른 쪽이 location.reload) */
export const saveLang = (l: Lang): void => {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* 저장 못 하면 이번 주소의 ?lang만 따른다 */
  }
};

/** 언어 고르기 줄을 보일까 (영어가 준비되기 전엔 숨긴다 — ?lang · ?debug · 이미 고른 사람만) */
export const langSwitchShown = (): boolean => {
  const q = query();
  return (!!q && (q.has('lang') || q.has('debug'))) || isLang(stored());
};

/** 영어 표의 모양: 원문과 같은 열쇠, 글은 아무 문자열(원문의 글자 타입을 넓힌다), 모두 생략 가능 */
export type Loc<T> = T extends string
  ? string
  : T extends (...a: infer A) => infer R
    ? (...a: A) => Loc<R>
    : T extends readonly (infer E)[]
      ? readonly Loc<E>[]
      : T extends object
        ? { readonly [K in keyof T]?: Loc<T[K]> }
        : T;

const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
/** 원문 위에 번역을 겹친다 (없는 칸은 원문 그대로) */
export const overlay = <T>(ko: T, en: Loc<T> | undefined): T => {
  if (en === undefined || en === null) return ko;
  if (plain(ko) && plain(en)) {
    const out: Record<string, unknown> = { ...ko };
    for (const k of Object.keys(en)) out[k] = overlay(ko[k], (en as Record<string, unknown>)[k] as never);
    return out as T;
  }
  return en as unknown as T;
};

/**
 * 글 표 하나를 지금 언어로 (한국어면 원문 그대로 — 같은 객체를 돌려준다).
 * 타입은 원문 그대로 둔다(as const 글자 타입) — 영어일 때 실제 글은 다르지만 글자 타입에 기대는 코드는 없다.
 */
export const localize = <T>(ko: T, en: Loc<T>, lang: Lang = LANG): T => (lang === 'ko' ? ko : overlay(ko, en));

/** 평평한 열쇠 표: 열쇠 → 한국어 원문 (+ 언어별 번역) */
export type StringTable = Readonly<Record<string, string>>;
let tables: Record<Lang, StringTable> = { ko: {}, en: {} };
/** 표를 단다 (ui-strings.ts가 부른다 — 시험에서 바꿔 끼울 수 있게) */
export const registerStrings = (t: Partial<Record<Lang, StringTable>>): void => {
  tables = { ko: { ...tables.ko, ...t.ko }, en: { ...tables.en, ...t.en } };
};

/**
 * 열쇠 글 찾기: 지금 언어 → 한국어 → 열쇠 그대로(빠진 글을 화면에서 바로 알아보게).
 * `{name}` 자리는 vars로 채운다.
 */
export const t = (key: string, vars?: Readonly<Record<string, string | number>>, lang: Lang = LANG): string => {
  const raw = tables[lang][key] ?? tables.ko[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : raw;
};

/** 영어 번역이 빠진 열쇠 (재고 · 시험용) */
export const missingKeys = (lang: Lang): string[] => Object.keys(tables.ko).filter((k) => !(k in tables[lang]));
