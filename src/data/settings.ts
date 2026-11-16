import type { MotionPref } from '../prefs/motion';

/**
 * 본편 설정 창 (D-530, 출시 점검 1번): 수치 · 열쇠 · 글. 말투는 docs/voice.md (① 시스템 합니다체 · ⑧ 단추 동사 하나).
 */
export interface Settings {
  v: 1;
  /** 효과음 크기 0~VOL_STEPS */
  sfx: number;
  sfxMute: boolean;
  /** 음악 크기 0~VOL_STEPS */
  music: number;
  musicMute: boolean;
  /** 움직임 줄이기: 기기 설정 따름 · 끔 · 켬 */
  motion: MotionPref;
}

/** 출하 저장(pawnisher.slice.*)과 다른 열쇠 — 진행 초기화가 설정을 지우지 않는다 */
export const SETTINGS_KEY = 'pawnisher.settings';
/** 크기 칸 수 (칸 하나 = 10%) */
export const VOL_STEPS = 10;
/** 기본값: 크기 7칸 = 예전 고정 음량(효과음 0.5 · 음악 0.11)과 같은 소리. 위로 3칸 여유 */
export const SETTINGS_DEFAULT: Settings = { v: 1, sfx: 7, sfxMute: false, music: 7, musicMute: false, motion: 'os' };
/** 진행 초기화가 지우는 열쇠: 이 앞머리로 시작하는 것 전부 + 아래 목록 (출하 저장 · 기록 · 도감 · 백업 사본 포함) */
export const PROGRESS_PREFIX = 'pawnisher.slice.';
export const PROGRESS_KEYS: readonly string[] = [
  ...['pawnisher.slice.save', 'pawnisher.slice.meta'].flatMap((k) => [k, `${k}.bak`, `${k}.corrupt`]),
  'pawnisher.slice.ledger', 'pawnisher.telemetry', 'pc-loadtips',
];

export const SETTINGS_TEXT = {
  title: '설정',
  tabSound: '소리',
  tabScreen: '화면',
  tabCredits: '제작',
  sfx: '효과음',
  music: '음악',
  motion: '움직임 줄이기',
  motionOpts: { os: '기기 설정', off: '끔', on: '켬' } as Record<MotionPref, string>,
  /** 켜고 끄기 단추 — 누르면 할 일 (⑧ 동사 하나) */
  mute: '끈다',
  unmute: '켠다',
  down: '−',
  up: '+',
  downAria: (name: string) => `${name} 줄이기`,
  upAria: (name: string) => `${name} 키우기`,
  levelAria: (name: string, n: number, muted: boolean) => `${name} 크기 ${n} / ${VOL_STEPS}${muted ? ' · 꺼짐' : ''}`,
  fullscreen: '전체 화면',
  fullscreenBtn: '바꾼다',
  quit: '게임 끝내기',
  quitBtn: '끝낸다',
  reset: '진행 초기화',
  resetBtn: '지운다',
  close: '닫는다',
  version: (v: string) => `v${v}`,
  /** 진행 초기화 두 단계 (되돌릴 수 없음 — 진홍 단추) */
  reset1: { title: '진행 초기화', body: '출하 저장 · 왕관 · 해금 · 도감 기록을 모두 지웁니다.', note: '설정은 남습니다.', back: '그만둔다', go: '지운다' },
  reset2: { title: '마지막 확인', body: '되돌릴 수 없습니다. 정말 지웁니까?', back: '그만둔다', go: '다 지운다' },
  /** 만든 사람 · 라이선스 쪽 */
  licTitle: '쓴 것과 라이선스',
  licFull: '전문',
  licRead: '라이선스 전문',
  licPrev: '이전',
  licNext: '다음',
  licBack: '돌아간다',
} as const;
