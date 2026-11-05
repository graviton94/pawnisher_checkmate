# 난이도 · 재미 레퍼런스 보고서 요약 (2026-11-05, 사용자 제공)

원본: `build-res/reference/reports/2026-11-05-difficulty-and-fun.pdf` (10쪽 — 13개 게임: Into the Breach · Slay the Spire · Balatro · Darkest Dungeon · Monster Train · Inscryption · Peglin · Shogun Showdown · Pawnbarian · Shotgun King · Gambonanza · Wildfrost · Backpack Hero).
보고서의 수치 중 [추정] 표시는 추정치, 「검증」 표시는 위키 · GDC · 스팀 통계 출처.

## 핵심 진단 (우리 봇 27% · 30% · 85%)
예고를 피해도 이득이 작은 세 이유: ① 피하면 그 턴 콤보를 포기한다(기회비용) ② 적 예고가 빈 땅을 쳐도 적이 손해를 안 본다(헛방 0) ③ 예고를 맞아도 콤보가 안 끊긴다(무시해도 27%가 깬다).

## 제안 10 → 우리 게임 반영 상태
| # | 제안 | 근거 게임 | 상태 |
| :-: | :-- | :-- | :-- |
| 1 | 회피 = 전진: 예고 칸에서 빠져나오며 치면 ×1.5 · 카드 +1 | Shogun Showdown · ItB | **반영 (D-229)** |
| 2 | 헛방 경직: 예고 공격이 빈 땅을 치면 그 적은 다음 차례 못 움직임 · 방열판 0 (반장 킹은 방열판만) | Shogun · DD2 | **반영 (D-229)** — 받는 피해 ×2 대신 방열판 0(엔진 피해 배율은 다음에) |
| 3 | 아군 오사: 적을 밀쳐 다른 적의 예고 칸에 세우면 적끼리 맞는다 | ItB · Shogun | 미반영 — 엔진 적 공격 판정 변경 필요, 다음 손질 |
| 4 | 기어 쇼크: 예고 공격을 맞은 기물은 다음 턴 공격 약화 | StS · Wildfrost | **반영 (D-229)** ×0.6 |
| 5 | 일반 적 1수 · 반장 2수 예고 | ItB · Wildfrost | 미반영 |
| 6 | 3번째 보상에서 빌드 축 확정(코어 부품 3택 1) | MT · Balatro · StS | 미반영 — 다음 후보 |
| 7 | 되감기 2단계: 기물 배치는 공짜 취소, 공격 뒤 되감기는 소모품 | ItB · MT | 일부 — 되감기는 이미 소모품(D-228) |
| 8 | 부활 부적 발동 시 아군 회복 + 적 1턴 기절 세트 | StS · Balatro · Inscryption | 미반영 — 지금은 대국을 처음부터 |
| 9 | 모바일 복귀 브리핑 · 20분 급행 모드 | StS 모바일 · ItB | 미반영 |
| 10 | 상점 가격 55% 규칙 · 남는 나사 싱크 | StS · Balatro · Peglin | 일부 — 탐욕의 저울(D-227) |
