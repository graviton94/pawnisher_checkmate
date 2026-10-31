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
