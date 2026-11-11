/** D-425: 본편 세 장과 선택 도전은 다른 진행이다. 장은 새로운 폰의 이야기, asc는 전투 규칙이다. */
export const CAMPAIGN_VERSION = 1;
export const STORY_COUNT = 3;
/** 기존 전투 곡선 0/1/2를 본편에, 3~13을 도전에 사용한다. 수치를 새로 조정하지 않는다. */
export const CHALLENGE_START = 3;
export type RunMode = 'story' | 'challenge' | 'daily';
export type StoryChapter = 0 | 1 | 2;
export type EndingKind = 'throne' | 'depart' | 'challenge' | 'daily';
export const CHAPTERS = [
  { name: '약속', label: '서막', theme: '함께 나가겠다는 약속을 한 폰이 왕의 자리에 남는다.' },
  { name: '왕의 자리', label: '둘째 장', theme: '새 폰은 선대 왕의 검수를 넘고도 같은 자리를 택한다.' },
  { name: '함께 나가는 길', label: '셋째 장', theme: '또 다른 폰이 거푸집과 출하 사이에서 고른다.' },
] as const;
export const chapterLabel = (chapter: number): string => `${CHAPTERS[Math.max(0, Math.min(2, chapter))].label} · ${CHAPTERS[Math.max(0, Math.min(2, chapter))].name}`;
export const runLabel = (mode: RunMode, asc: number, chapter = 0): string => mode === 'story' ? chapterLabel(chapter) : mode === 'daily' ? '오늘의 도전' : `도전 난이도 ${Math.max(1, asc - CHALLENGE_START + 1)}`;
export const endingLabel = (ending: EndingKind): string => ({ throne: '왕위 계승', depart: '함께 출하', challenge: '도전 완료', daily: '오늘의 도전 완료' })[ending];
export interface CrownRecord { chapter: number; runId: string; law: string; companions: string[] }
export interface StoryPromise { serial: string; name: string; wish: string }
/** 원부의 출하 ID. 같은 분에 재시도해도 지난 분대의 폐기 기록이 섞이지 않는다. */
export const runIdentity = (mode: RunMode, level: number, seed: number, at = new Date()): string => `${at.toISOString().slice(0, 23).replace('T', ' ')} ${mode === 'story' ? `본편${level + 1}` : mode === 'daily' ? '오늘' : `도전${Math.max(1, level - CHALLENGE_START + 1)}`} #${seed.toString(16)}`;
