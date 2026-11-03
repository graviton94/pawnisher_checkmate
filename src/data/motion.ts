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
/** enemyTempo · enemyOverlap (D-216 5): 적 차례 박자 ×1.25 · 다가오기만 하는 적은 이만큼(ms) 뒤에 다음 적이 겹쳐 출발 */
export const PACE = { fx: 0.8, hitGap: 320, enemyLead: 260, tempoPerKill: 0.05, tempoKillsMax: 4, enemyBannerHold: 520, turnHold: 320, afterMine: 120, enemyTempo: 1.25, enemyOverlap: 160 } as const;
