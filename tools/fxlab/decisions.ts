/**
 * FX 랩에 보여 줄 그래픽 결정 목록. 사용자 피드백이 오면 여기만 고치고 `node tools/fxlab/build.cjs`로 다시 만든다.
 * status: done = 확정 · review = 보는 중 · pick = 골라 주세요 · wait = 에셋 대기
 */
import type { PieceType } from '../../src/engine/types';

export type Status = 'done' | 'review' | 'pick' | 'wait';

export const VERSION = { n: 50, date: '2026-10-31' };

export const PIECES: Record<PieceType, { name: string; status: Status; idea: string; beat: string; changed?: string }> = {
  P: {
    name: '폰',
    status: 'done',
    idea: '뒤로 당겨 웅크렸다가 앞으로 찌르듯 튀어 나가며, 칼끝이 지수형으로 빠르게 지나가는 초승달 칼날.',
    beat: '예비 0.19초 · 칼날 0.23초',
    changed: '예비 동작(뒤로 당김)과 지수형 칼끝 추가',
  },
  N: {
    name: '나이트',
    status: 'done',
    idea: '앞발을 들고 방전 불꽃을 빨아들인다(느리게→빠르게) → 내리찍기 → 11시 방향 칸부터 시계 방향으로 번개가 실제처럼 친다: 어둡고 가는 선도가 툭툭 내려오고 → 본줄기 전체가 하얗게 번쩍(칸도 번쩍) → 두 번 깜빡이고 꺼진다. 가지 번개 2갈래.',
    beat: '예비 0.23초 · 번개 간격 0.05초 · 번개 한 줄기 0.29초',
    changed: '완성된 번개 조각 → 선도·귀환 섬광·깜빡임으로 "치는" 번개',
  },
  B: {
    name: '비숍',
    status: 'done',
    idea: '떠오르며 빛을 모은다 — 처음엔 천천히, 끝으로 갈수록 빠르게 빨려 들고 몸이 떨린다 → 사거리 전체에 한 번에 9도트 굵기 → 지수형으로 가늘어지며 사그라든다.',
    beat: '응축 0.38초 · 사그라듦 0.24초',
    changed: '응축 시간을 늘리고 지수형 곡선으로',
  },
  R: { name: '룩', status: 'done', idea: '높이 들어 올려 멈칫 → 지수형으로 내리꽂고 크게 출렁 → 십자 방향으로 한 칸씩 폭발.', beat: '예비 0.31초 · 칸당 0.07초', changed: '들어 올림·멈칫·출렁임 추가' },
  Q: {
    name: '퀸',
    status: 'done',
    idea: 'C 회전 광선: 떠올라 톱니 고리가 점점 빨리 돌다가, 11시에서 등대처럼 광선 하나가 한 바퀴 휩쓴다 — 느리게 시작해 채찍처럼 빨라졌다 멈춘다. 지나가는 방향마다 끝에서 폭발. / D 톱날 부메랑: 톱날들을 돌려 띄웠다가 8방향으로 던진다(빠르게→느리게), 끝에서 잠깐 돌고 되돌아와(느리게→빠르게) 손에 잡힌다. 지나가는 칸마다 베인다. / A는 이전 안(비숍과 비슷해서 비교용).',
    beat: 'C 0.83초 · D 0.70초',
    changed: 'D 톱날 부메랑으로 확정 (게임에 적용)',
  },
  K: {
    name: '킹',
    status: 'done',
    idea: 'B 종소리 파동: 홀을 치켜들며 왕관 빛이 점점 밝아짐 → 내려치면 종소리 파동 두 겹 → 이웃 칸마다 "땡". / A 사각 충격파.',
    beat: '예비 0.26초 · 파동 0.24초',
    changed: 'B 종소리 파동으로 확정 (게임에 적용)',
  },
};

/**
 * 보는 중인 주제 (v49 정리): 위 탭에 기물 공격과 나란히. 고르면 무대 자리에 실제 게임 화면을 띄운다.
 * shots = tools/fxlab/screens/의 파일 이름 (index.tsv에 이름표). 확정되면 DECISIONS의 done으로 옮기고 화면은 지운다.
 */
export const TOPICS: { id: string; name: string; status: Status; rule: string; changed?: string; shots: string[] }[] = [
  {
    id: 'npc',
    name: '말하는 기물',
    status: 'review',
    rule: '기물 몸 + 큰 눈(흰자 · 검은 눈동자 · 눈꺼풀로 연기) + 소품 하나. 지금은 기물 도트에 코드로 눈 · 소품을 얹은 임시 초상화 — 검수 저울(접시마다 눈) · 녹슨 룩(가격표 · 녹) · 외눈 비숍(확대경) · 떠돌이 정비 폰(렌치) · 동전 나이트(외알 안경 · 동전) · 견습 폰(거꾸로 든 망치) · 다른 공장의 흑 비숍(도장) · 아홉째 폰(큰 종이 왕관). 가끔 깜빡인다. 그림이 오면 같은 자리에 바꿔 끼운다 (D-134)',
    changed: '새로 들어감',
    shots: ['53-npc-shop.jpg', '54-npc-coin-knight.jpg', '55-npc-scale.jpg', '56-npc-reward.jpg'],
  },
  {
    id: 'hitcam',
    name: '타격 카메라',
    status: 'review',
    rule: '맞힌 가장 먼 적 거리로: 1칸 = 10% 당겨 들어가며 그쪽으로 30% 끌림 · 2칸 = 4% · 3칸 이상 = 8% 물러나 판 전체. 처치 순간 3.5% 툭. 흔들림은 피해 / 대상 최대 HP 비례, 최대 2.6배 (D-115)',
    changed: '새로 들어감',
    shots: ['50-camera-far-out.jpg', '51-camera-near-in.jpg'],
  },
  {
    id: 'grades',
    name: '등급 연출',
    status: 'review',
    rule: '커먼 맨 패널 · 레어 청색 테 + 등장 때 번쩍 · 유니크 보라 테 + 빛 쓸기 + 뒤집히며 등장 + 숨 쉬는 빛 · 에픽 주황 테 + 테두리를 도는 빛 + 불티 + 맨 마지막에 내리꽂힘. 고르면 등급색 파편, 에픽은 가장자리 빛 + 「에픽!」 (D-113)',
    changed: '새로 들어감',
    shots: ['44-grades-enter.jpg', '45-grades-settled.jpg', '46-grades-epic.jpg', '47-grades-pick-epic.jpg', '49-shop-epic.jpg'],
  },
  {
    id: 'weak',
    name: '반장 약점',
    status: 'review',
    rule: '지도 반장 카드에 청색 과녁 「약점」 줄 (누르면 준비할 것). 반장 대국에서 약점 기물 오른쪽 아래 청색 과녁 딱지, 길게 누르면 이름·효과 (D-113)',
    changed: '새로 들어감',
    shots: ['48-boss-weakness.jpg', '52-weak-board.jpg'],
  },
  {
    id: 'motion',
    name: '조작 모션',
    status: 'review',
    rule: '누름 딸깍 + 눌림 · 화면 전환(옛 화면 위로 흐려짐, 새 화면 아래서 떠오름) · 카드 60ms 간격 등장 · 고른 카드 들림, 나머지 가라앉음 · 못 고르면 고개 젓기 · 모달 튀어나옴 · 토스트 내려옴 (D-109)',
    shots: ['39-motion-node-chosen.jpg', '41-motion-chosen.jpg', '43-motion-skip.jpg'],
  },
  {
    id: 'juice',
    name: '쾌감 · 아픔',
    status: 'review',
    rule: '금빛: 나사 숫자 굴러 오름 · 「+n」 · 큰 획득은 금빛 가장자리·파편 · 「걸작!」「이형!」 도장 · 처치 히트스톱 90ms. 붉음: 내 기물 피격은 피해 비율만큼 가장자리 · 손상·봉인·손실은 흔들림 + 떨어지는 파편 + 도장 (D-104)',
    shots: ['27-juice-loss.jpg', '28-juice-awaken.jpg', '29-juice-vignette.jpg'],
  },
  {
    id: 'codex',
    name: '메뉴 · 도감',
    status: 'review',
    rule: '압력은 ◀ 압력 n / 최고 ▶ 한 줄 · 도감은 기록 6칸 + 칸 목록 (못 본 것 ???) · 앱 아이콘은 타이틀에서만 (D-108 · D-110)',
    shots: ['35-menu-asc.jpg', '36-codex-top.jpg', '37-codex-bottom.jpg'],
  },
  {
    id: 'variant',
    name: '이형 문양',
    status: 'review',
    rule: '이형 기물 오른쪽 위 7×7 황동 문양 (컨베이어 ≫ · 쇠망치 T · 반사경 V · 방열 ≡ · 보일러 불꽃 · 용수철 Z · 조준경 십자 · 포탑 성가퀴 · 지휘 왕관). 길게 누르면 이름·강점·대가 (D-084 · D-106)',
    shots: ['32-boss-variant.jpg', '34-forge-vpick.jpg'],
  },
];

export const OPEN_QUESTIONS: string[] = [
  '지형 소품: 지금 그림은 불합격 — 방향(쓸지 말지, 어떤 모양)을 다시 정해 주세요',
  '이형 문양: 9종이 작은 칸에서 알아보기 쉬운지, 이형 기물 그림을 따로 줄지',
  '에픽 오라·불티가 과한지 / 모자란지 (등급 연출 탭)',
];

export const DECISIONS: { item: string; rule: string; status: Status }[] = [
  // 고를 것 · 대기 (보는 중인 것은 위 탭 TOPICS)
  { item: '지형 소품', rule: '불합격 (사용자: 디자인 자체가 별로) — 방향을 다시 정할 때까지 판에 올리지 않는다', status: 'pick' },
  { item: '이펙트 스프라이트', rule: '발주 시트 E가 오면 같은 박자에 그림만 갈아 끼운다', status: 'wait' },
  // 확정 (v49: 오래 게임에 들어가 있고 지적 없던 것은 확정으로 옮김 — 바꾸고 싶으면 말해 주세요)
  { item: '도트 격자', rule: '판 칸 20×20 도트, 기물 약 16도트 높이(칸의 0.82). 판·표식·이펙트 모두 같은 격자', status: 'done' },
  { item: '박자', rule: '예비 동작(느리게→빠르게) → 터짐(빠르게→느리게) → 여운. 공격 1회 최대 1초, 속도 옵션 없음', status: 'done' },
  { item: '이동', rule: '들기 → 지수형 이동 → 착지 출렁임 + 증기 먼지. 나이트는 높게 뛴다', status: 'done' },
  { item: '기물 공격', rule: '폰 초승달 칼날 · 나이트 번개 · 비숍 응축 광선 · 룩 십자 폭발 · 퀸 톱날 부메랑 · 킹 종소리 파동 (위 탭에서 재생)', status: 'done' },
  { item: '기물 그림', rule: '정본 = tools/pixel/pieces64.txt 64×64 격자, 흰 테두리 2칸, P·R·Q·K 좌우 대칭 (D-086·D-087·D-092)', status: 'done' },
  { item: '판 칸 · 표식', rule: '코드로 찍은 철판 칸 · 선택 모서리 · 이동 점 · 순번 배지 · 공격 범위 · 위협 · 균열 · 무너진 칸', status: 'done' },
  { item: 'UI 부품', rule: '9-slice 도트 버튼 4색 · 리벳 철판 패널 · 황동 이름판 · 명령 테이프 · 공개 픽토그램 아이콘', status: 'done' },
  { item: '태엽 (행동력)', rule: '큰 구멍 날개 둘 · 청록 축 · 한쪽 이 막대. 남음 / 씀 / 보너스', status: 'done' },
  { item: '적 의도', rule: '붉은 흐르는 화살표 + 순번 + 잃을 HP 몫 + 처치만 금색 숫자. 적을 누르면 모든 피해 숫자', status: 'done' },
  { item: '피해 숫자 · 처치', rule: '도트 숫자, 아래에서 위로 지워짐 · 처치는 검은 재가 발밑에 쌓였다 꺼짐 · 금색 숫자', status: 'done' },
  { item: 'HP 게이지', rule: '14×4 검정 테두리 + 2줄 (내 청록 · 적 진홍), 잃을 몫 금 + 반짝임', status: 'done' },
  { item: '과녁 · 요충지', rule: '내 과녁 톱니 철컥 · 요충지 점선 테두리 + 제비꼬리 깃발 + 점거 눈금', status: 'done' },
  { item: '공격 세기 · 흔들림', rule: '피해·처치가 클수록 뛰어올라 모았다 내려찍음 + 흔들림 · 진동 (D-064, 타격 카메라로 보강)', status: 'done' },
  { item: '진영 색', rule: '내 것 = 청록·흰, 적 = 진홍·검정, 금 = 처치, 황동 = UI 장치', status: 'done' },
  { item: '흰 킹 · 받침', rule: '원래 킹 그림 · 발밑 받침 없음', status: 'done' },
  { item: '타이틀 · 인트로', rule: '공장 배경 · 정품 폰 도장 → 붉은 사선 → 로고 (로고는 타이틀에서만 떠오름)', status: 'done' },
  { item: '전술 키워드 · 주문서', rule: '공격 순간 이름 배너 · 명령 테이프 미리보기 칩 · 기록 줄 아이콘 · 레일 주문서 한 줄 (D-094)', status: 'done' },
  { item: '개조 딱지 · 접사 딱지', rule: '색 딱지 + 어두운 도트 · 적 왼쪽 위 검은 딱지 + 접사 색 (D-095·D-096)', status: 'done' },
  { item: '지형 칸 · 반장 전장', rule: '칸 안쪽 색 테두리 + 흐린 아이콘, 기물 아래 · 렌즈 조명 · 성벽 (D-097)', status: 'done' },
  { item: '기록 줄', rule: '판 위 흔적 대신 오른쪽 레일에 하스스톤식 기록 줄', status: 'done' },
  { item: '화면 디자인', rule: '타이틀·메뉴·지도·보상·고물상·공방·뽑기·돌발·레일·일시 정지·결과 (D-085, 화면은 게임에서 직접)', status: 'done' },
];

export const CHANGELOG: { v: number; date: string; items: string[] }[] = [
  { v: 50, date: '2026-10-31', items: ['말하는 기물 임시 초상화 (큰 눈 + 소품) — 고물상 · 공방 · 돌발 · 보상 · 결과 · 시험대', '용어: 사람 없는 공장 (검수 저울 · 녹슨 룩 · 외눈 비숍), 최종 보스 도금왕'] },
  { v: 49, date: '2026-10-31', items: ['랩 정리: 보는 중인 주제를 위 탭으로 (기물 공격 옆) · 오래된 결정은 확정으로 접음 · 확정된 화면 스크린샷은 뺌 · 기록은 최근 3개만', '타격 카메라 · 등급 연출 · 반장 약점 탭 새로'] },
  { v: 48, date: '2026-10-30', items: ['같은 줄 높이 통일 · 반장 카드 세계관 · 인물별 대사'] },
  { v: 47, date: '2026-10-30', items: ['기물 외곽선 다듬기 · 느낌표/물음표 규칙'] },
];
