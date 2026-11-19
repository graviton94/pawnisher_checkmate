/** 조작 반응 모션 시간 (ms, D-109). CSS의 같은 이름 변수와 맞춘다 (src/style.css `--m-*`). */
export const MOTION = {
  /** 고른 뒤 다음 화면까지 (고른 것 들림 + 나머지 사라짐) */
  choose: 280,
  /** 고물상에서 사기: 고른 것만 들리고 바로 다시 그린다 */
  buy: 160,
  /** 나머지가 하나씩 사라지는 간격 */
  dismissStagger: 40,
  /** 화면 전환: 옛 화면이 지워지는 시간 */
  sceneOut: 160,
  /** 모달 닫힘 */
  overlayOut: 140,
  /** 토스트가 지워지는 시간 */
  toastOut: 180,
} as const;

/** 알림 줄 (D-137): 자동 서술은 줄을 서서 하나씩. 보이는 시간 = base + 글자당 perChar (상한 max), 기다리는 줄은 queueMax까지 */
export const TOAST = { base: 1100, perChar: 45, max: 3200, queueMax: 3 };

/**
 * 전투 박자 (D-204, 사용자: "애니메이션들이 너무 빠르게 몰아친다 — 간격 · 속도 조정"). 한 곳에서 고친다.
 * fx = 판 위 연출 속도 배율(1보다 작으면 느리게) · hitGap = 공격 하나가 끝나고 다음 공격까지 · enemyLead = 적 공격 직전 숨 고르기 ·
 * tempoPerKill = 연쇄마다 빨라지는 정도(예전 0.15 — 몰아침의 주범) · enemyBannerHold = 「적 차례」 띠 뒤 첫 적 수까지 ·
 * turnHold = 적 차례가 끝나고 내 차례 띠까지 · afterMine = 내 카드 연출이 끝나고 손이 풀리기까지
 */
/** enemyTempo (D-216 5): 적 차례 박자 ×1.25 — 적은 늘 한 명씩 차례대로 (D-217) */
export const PACE = { fx: 0.8, hitGap: 320, enemyLead: 260, tempoPerKill: 0.05, tempoKillsMax: 4, enemyBannerHold: 520, turnHold: 320, afterMine: 120, enemyTempo: 1.25 } as const;

/**
 * 부드러움은 프레임 수와 곡선에서 (D-554 — D-216 · D-538을 고친다, 소유자 피드백 「전환이 뚝뚝 끊긴다」).
 * 움직임은 화면 프레임마다(60fps) 돌리되 위치를 기기 픽셀 정수로 맞추고(도트가 번지지 않는다), 나타남 · 사라짐은
 * 8×8 베이어 디더를 프레임마다 한 단씩(코드 64단 · CSS 키프레임 16단) 곡선으로 넘긴다. 투명도 보간 · 그라데이션은 여전히 금지.
 * 정지 동작(도장 · 톱니 똑딱 · 흔들림 · 깜빡임)만 일부러 프레임을 붙든다.
 */
export const SMOOTH = {
  /** 코드로 돌리는 디더 단계 수 (8×8 베이어 = 64 + 빈 칸 0) */
  levels: 64,
  /** CSS 키프레임 디더 단계 수 (--dq0 ~ --dq16, 8×8 베이어 4칸씩) */
  cssLevels: 16,
  /** 디더 퇴장 · 등장의 최소 시간 (ms) — 「다섯 계단 이하」 퇴장을 없앤다 */
  outMin: 300,
  inMin: 300,
  /** 미리 굽는 움직임 표본 간격 (ms) — 120Hz로 구워 어느 화면 주기에서도 프레임마다 새 정수 위치 */
  bakeStep: 1000 / 120,
  /** 일부러 정지 동작인 CSS 애니메이션 이름 (굽지 않는다 — 도장 · 톱니 · 흔들림 · 깜빡임 · 불똥 · 경보) */
  hold: /stamp|tick|shake|blink|alarm|nudge|^spk|snap|cog|flick|jit|glitch|sshake|erShake|plred|tape|bob|breath|idle|pulse|beat|throb|wiggle|hum|flash|fl$|ko|tfx|rays|dith|deny|nope|apb/i,
  /** 화면 전환 철문: 닫힘 · 머묾 · 열림 (ms) */
  shutter: { close: 340, hold: 110, open: 460 },
} as const;

/**
 * 컷신 카메라 · 전환 (D-554): 영화 판(film.ts)의 시간. 카메라는 프레임마다 정수 기기 픽셀, 배율은 정수만(바뀔 때는 디더 겹침).
 * drift = 한 줄이 서 있는 동안 천천히 미는 켄 번스(기기 픽셀/초 · 최대 시간) — 줄이 바뀌면 멈춘다(놀 때 다시 그리지 않는다, D-533).
 */
export const FILM_MOTION = {
  /** 카메라 이동 시간 = base + 거리(칸 폭 비율) × perSpan, 상한 max */
  cam: { base: 520, perSpan: 520, max: 980 },
  /** 전환 닫힘 · 열림 (ms) */
  wipe: { close: 380, open: 460 },
  /** 켄 번스: 기기 픽셀/초 · 최대 지속 (ms) */
  drift: { speed: 24, max: 7000 },
  /** 장 제목 카드 등장 · 퇴장 (ms) */
  title: { in: 420, out: 360 },
} as const;

/**
 * 한 움직임 시계 · 곡선 이름표 (D-595 — 사용자 실기기 피드백: 「화면 번쩍임 · 희귀 카드 빛 지나감의 프레임이 너무 구림. 더 빠르게, 부드럽게」).
 * 규칙: **움직임(위치 · 크기)은 화면 프레임마다**(rAF 또는 합성기에서 도는 120Hz 정수 구움 Web Animations) · 위치는 기기 픽셀 정수.
 * 계단(steps)은 **디더 무늬와 그림 줄(스프라이트)의 장 넘김에만** — 디더는 12단 이상, 장 넘김은 24fps 이상(장당 ≤ 42ms).
 * 작은 N의 steps로 위치를 옮기는 것은 금지(SMOOTH.hold의 일부러 정지 동작 — 도장 · 톱니 · 흔들림 — 만 예외).
 */
export const MOTION_CLOCK = {
  /** 장 넘김(스프라이트 줄) 한 장의 최대 길이 (ms) — 24fps */
  spriteFrameMax: 42,
  /** 디더 전환 · 퇴장의 최소 단계 수 */
  ditherMinLevels: 12,
  /** 곡선 이름표 (CSS cubic-bezier — 코드는 view/motion.ts ease와 같은 모양) */
  ease: { out: 'cubic-bezier(.22,1,.36,1)', in: 'cubic-bezier(.55,0,1,.45)', inOut: 'cubic-bezier(.65,0,.35,1)' },
} as const;

/**
 * 등급 빛 띠 (D-595 — D-585 CD-11의 8장 띠를 대신): 이어 붙인 띠 하나(tools/pixel/card_sweep.py)가 카드 쇠 테 가면 안을
 * passMs 동안 곡선(inOut)으로 한 번 쓸고, period마다 되풀이. 금은 띠가 지나간 뒤 볏 불꽃 6장을 sparkFrameMs씩.
 * 줄 안의 카드는 stagger만큼 어긋난다(셋마다 한 바퀴). 움직임은 120Hz로 구운 정수 기기 픽셀 Web Animations(합성기에서 돈다).
 */
export const CARD_SHEEN = { periodMs: 3600, passMs: 340, sparkFrameMs: 40, sparkFrames: 6, staggerMs: 1200, bakeHz: 120 } as const;

/**
 * 번쩍임 (D-595 — 화면 전체 흰/금 디더 막을 대신): 맞은 곳 둘레만 원형 디더(8×8 베이어, 칸 = 게임 도트)로 켰다가 frames 장(화면 프레임)에 걸쳐 꺼진다.
 * peak = 가운데 덮는 비율(0~1, 0.5 = 체커 — 눈부신 흰 장 없음) · radius = 화면 짧은 변 대비 반지름.
 * 번쩍임 줄이기 · 움직임 줄이기면 그리지 않는다.
 */
export const FLASH = { frames: 3, peak: 0.5, radius: 0.42, cardRadius: 0.75 } as const;
