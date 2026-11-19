import { localize } from './locale';
import { CAMPAIGN_TEXT_EN, CHAPTERS_EN } from './lang/en-screens';
/** D-451 (마스터 바이블 docs/brief/master-bible.md): 본편은 넷 — 첫째 ~ 넷째 왕관(옛 1~4승천, D-476), 그 뒤 선택 도전. 왕관마다 새 아홉째 폰의 이야기, asc는 전투 규칙이다. */
export const CAMPAIGN_VERSION = 1;
export const STORY_COUNT = 4;
/** 기존 전투 곡선 0~3을 본편 첫째~넷째 왕관에, 4~13을 도전에 사용한다. 수치를 새로 조정하지 않는다. */
export const CHALLENGE_START = 4;
export type RunMode = 'story' | 'challenge' | 'daily';
export type StoryChapter = 0 | 1 | 2 | 3;
export type EndingKind = 'throne' | 'depart' | 'challenge' | 'daily';
export const CHAPTERS_KO = [
  { name: '무지와 첫 배신', alias: '종이 왕관', label: '첫째 왕관', theme: '세트를 구하겠다며 오른 첫 폰이, 왕관을 쓴 뒤 다시 약한 폰으로 돌아가기 싫어 동료를 녹인다.' },
  { name: '타인의 비극을 삼킨 오만', alias: '녹슨 태엽', label: '둘째 왕관', theme: '전대 왕을 비겁하다 비웃던 폰이, 같은 자리에서 같은 괴물이 된다.' },
  { name: '가장 거룩한 착취', alias: '금빛 자비', label: '셋째 왕관', theme: '누구보다 동료를 아끼던 폰이, 그 죄를 짊어지겠다며 동료의 쇳물로 금빛이 된다.' },
  { name: '직시와 해방', alias: '거울 복도', label: '넷째 왕관', theme: '자기 안의 욕망을 인정한 폰이, 왕관을 주조기에 던져 넣고 불량품 그대로 문밖으로 걸어 나간다.' },
] as const;
/** 지금 언어로 (D-671) — 이름 · 별칭 · 꼬리표만 영어가 있다(theme는 이야기 글 — 번역 착수 때) */
export const CHAPTERS = CHAPTERS_KO.map((c, i) => localize(c, CHAPTERS_EN[i] ?? {})) as unknown as typeof CHAPTERS_KO; // 배열은 칸마다 겹친다 (theme는 한국어로 남게)
/** 출하 이름표 · 결말 이름 (지도 리본 · 결과 화면) */
export const CAMPAIGN_TEXT_KO = {
  daily: '오늘의 도전',
  challenge: (n: number) => `도전 난이도 ${n}`,
  ending: { throne: '왕위 계승', depart: '왕관 파괴', challenge: '도전 완료', daily: '오늘의 도전 완료' } as Record<EndingKind, string>,
};
export const CAMPAIGN_TEXT = localize(CAMPAIGN_TEXT_KO, CAMPAIGN_TEXT_EN);
/** 왕관마다 새긴 규정 (바이블 LAW-1~4) — ASCENSION 표의 몇 번째 조항인가. 넷째 왕관에서 왕관을 쓰면 「최종 경비」 */
export const STORY_LAW = [0, 1, 2, 12] as const;
const chapterOf = (chapter: number) => CHAPTERS[Math.max(0, Math.min(STORY_COUNT - 1, chapter))];
/**
 * 왕관 부제 (D-536 — 출시 전 서사 리뷰 #1): name(「무지와 첫 배신」 …)은 그 왕관의 결말을 미리 말해 버린다.
 * 끝낸 왕관(reveal)만 name을 보이고, 아직 안 끝낸 왕관은 결말을 말하지 않는 별칭(alias)으로 부른다 — 메뉴 · 이어하기 · 지도 리본 · 결과 · 그림자 컷.
 */
export const chapterTitle = (chapter: number, reveal = false): string => (reveal ? chapterOf(chapter).name : chapterOf(chapter).alias);
export const chapterLabel = (chapter: number, reveal = false): string => `${chapterOf(chapter).label} · ${chapterTitle(chapter, reveal)}`;
export const runLabel = (mode: RunMode, asc: number, chapter = 0, reveal = false): string => mode === 'story' ? chapterLabel(chapter, reveal) : mode === 'daily' ? CAMPAIGN_TEXT.daily : CAMPAIGN_TEXT.challenge(Math.max(1, asc - CHALLENGE_START + 1));
export const endingLabel = (ending: EndingKind): string => CAMPAIGN_TEXT.ending[ending];
export interface CrownRecord { chapter: number; runId: string; law: string; companions: string[] }
export interface StoryPromise { serial: string; name: string; wish: string }
/** 원부의 출하 ID. 같은 분에 재시도해도 지난 분대의 폐기 기록이 섞이지 않는다. */
export const runIdentity = (mode: RunMode, level: number, seed: number, at = new Date()): string => `${at.toISOString().slice(0, 23).replace('T', ' ')} ${mode === 'story' ? `본편${level + 1}` : mode === 'daily' ? '오늘' : `도전${Math.max(1, level - CHALLENGE_START + 1)}`} #${seed.toString(16)}`;
