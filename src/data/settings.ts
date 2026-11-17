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
  /** 전체 음량 0~VOL_STEPS (효과음 · 음악에 곱한다, D-538) */
  master: number;
  masterMute: boolean;
  /** 앱을 내리면(백그라운드) 소리를 끈다 — 기본 켬 */
  bgMute: boolean;
  /** 화면 흔들림: 끔 · 약하게(절반) · 보통 */
  shake: ShakePref;
  /** 번쩍임 줄이기: 흰 · 붉은 화면 섬광을 걷는다 (광과민) */
  lessFlash: boolean;
  /** 컷신 자동 넘김 — 글이 다 찍히고 잠시 뒤 다음 쪽으로 (기본 끔). 연출 속도가 아니라 누르기를 대신한다 (D-039 유지) */
  autoAdvance: boolean;
  /** PC 키 안내: 대국 단추 옆에 키 글자(E · R · Esc)를 보인다 */
  keyHints: boolean;
}

/** 화면 흔들림 단계 */
export type ShakePref = 'off' | 'weak' | 'normal';
/** 흔들림 배율 (끔 0 · 약하게 0.5 · 보통 1) */
export const SHAKE_MUL: Record<ShakePref, number> = { off: 0, weak: 0.5, normal: 1 };
/** 컷신 자동 넘김: 한 쪽 글이 다 찍힌 뒤 기다리는 시간 (ms) — 읽는 시간 */
export const AUTO_ADVANCE_MS = 2600;

/** 출하 저장(pawnisher.slice.*)과 다른 열쇠 — 진행 초기화가 설정을 지우지 않는다 */
export const SETTINGS_KEY = 'pawnisher.settings';
/** 크기 칸 수 (칸 하나 = 10%) */
export const VOL_STEPS = 10;
/** 기본값: 크기 7칸 = 예전 고정 음량(효과음 0.5 · 음악 0.11)과 같은 소리. 위로 3칸 여유 */
export const SETTINGS_DEFAULT: Settings = { v: 1, sfx: 7, sfxMute: false, music: 7, musicMute: false, motion: 'os', master: VOL_STEPS, masterMute: false, bgMute: true, shake: 'normal', lessFlash: false, autoAdvance: false, keyHints: false };
/** 진행 초기화가 지우는 열쇠: 이 앞머리로 시작하는 것 전부 + 아래 목록 (출하 저장 · 기록 · 도감 · 백업 사본 포함) */
export const PROGRESS_PREFIX = 'pawnisher.slice.';
export const PROGRESS_KEYS: readonly string[] = [
  ...['pawnisher.slice.save', 'pawnisher.slice.meta'].flatMap((k) => [k, `${k}.bak`, `${k}.corrupt`]),
  'pawnisher.slice.ledger', 'pawnisher.telemetry', 'pc-loadtips',
];

export const SETTINGS_TEXT = {
  title: '설정',
  /** 탭 여섯 (D-538) — 이름은 두~세 글자 */
  tabs: { sound: '소리', screen: '화면', access: '접근성', input: '조작', game: '게임', info: '정보' },
  master: '전체 음량',
  sfx: '효과음',
  music: '음악',
  bgMute: '앱을 내리면 소리 끄기',
  motion: '움직임 줄이기',
  motionOpts: { os: '기기 설정', off: '끔', on: '켬' } as Record<MotionPref, string>,
  shake: '화면 흔들림',
  shakeOpts: { off: '끔', weak: '약하게', normal: '보통' } as Record<ShakePref, string>,
  lessFlash: '번쩍임 줄이기',
  autoAdvance: '컷신 자동 넘김',
  /** 켬 · 끔 두 칸 */
  on: '켬',
  off: '끔',
  keyHints: 'PC 키 안내',
  keyMap: '키 · 패드 배치',
  keyMapBtn: '본다',
  keyMapTitle: '키 · 패드 배치',
  guide: '안내서 다시 보기',
  glossary: '용어집',
  openBtn: '연다',
  credits: '만든 사람 · 라이선스',
  privacy: '개인정보 처리방침',
  readBtn: '읽는다',
  feedback: '의견 보내기',
  copyBtn: '복사한다',
  copied: '주소를 복사했습니다.',
  copyFail: '복사하지 못했습니다. 주소를 직접 적어 주세요.',
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
  fullscreenNote: 'F11 · Alt+Enter',
  quit: '게임 끝내기',
  quitBtn: '끝낸다',
  reset: '진행 초기화',
  resetBtn: '지운다',
  close: '닫는다',
  prev: '이전',
  next: '다음',
  page: (a: number, n: number) => `${a} / ${n}`,
  version: (v: string) => `v${v}`,
  /** 진행 초기화 두 단계 (되돌릴 수 없음 — 진홍 단추) */
  reset1: { title: '진행 초기화', body: '출하 저장 · 왕관 · 해금 · 원부 기록을 모두 지웁니다.', note: '설정은 남습니다.', back: '그만둔다', go: '지운다' },
  reset2: { title: '마지막 확인', body: '되돌릴 수 없습니다. 정말 지웁니까?', back: '그만둔다', go: '다 지운다' },
  /** 만든 사람 · 라이선스 쪽 */
  licTitle: '쓴 것과 라이선스',
  licFull: '전문',
  licRead: '라이선스 전문',
  licPrev: '이전',
  licNext: '다음',
  licBack: '돌아간다',
} as const;

/** 키 · 패드 배치표 (설정 › 조작 › 「본다」) — 행동표 정본은 src/slice/keymap.ts. 줄 = [행동, 키보드, 패드] */
export const KEY_GUIDE: readonly (readonly [string, string, string])[] = [
  ['고른다 · 누른다', 'Enter · Space', 'A'],
  ['돌아간다 · 메뉴', 'Esc · Backspace', 'B · Start'],
  ['턴 끝', 'E', 'X'],
  ['선택 취소', 'Z · Ctrl+Z', 'Y'],
  ['되감기', 'R', '—'],
  ['카드 고르기', '1 ~ 9', '—'],
  ['초점 옮기기', '방향키', '십자키 · 왼쪽 스틱'],
  ['손패 ↔ 판', 'Tab', 'LB · RB'],
  ['칸 정보', 'I', 'Y 길게 · Back'],
  ['전체 화면 (PC)', 'F11 · Alt+Enter', '—'],
];
