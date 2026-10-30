---
name: run-and-observe
description: "Pawnisher 실제 화면 확인: 빌드 → 프리뷰 서버 → 모바일 가로(915×412) 터치로 시나리오를 탭해 스크린샷 증거를 남긴다. 화면에 보이는 것을 바꿨을 때 반드시 사용."
argument-hint: "[menu|start|battle|battle-full|reward|shop|all] [--pc]"
user-invocable: true
---

# Run and Observe

"파싱·타입체크·자동 플레이는 실행 확인이 아니다" (Game Studios 원칙). 플레이어가 보는 것을 바꿨으면 실제로 열어서 본다.

1. `npm run build`
2. 프리뷰가 안 떠 있으면 `nohup npx vite preview --port 4173 >/dev/null 2>&1 &` (이미 떠 있으면 재사용 — 빌드 결과를 바로 반영한다)
3. `node tools/observe.cjs <시나리오>` (PC 확인은 `--pc`). 결과 PNG: `production/qa/evidence/<날짜>-<장면>.png`
4. 스크린샷을 Read로 **직접 본다**. 확인할 것: 겹침·잘림, 글자 크기, 터치 대상 크기, 바뀐 기능이 실제로 보이는가.
5. 콘솔/페이지 에러가 하나라도 있으면 실패로 보고한다.
6. 새 화면을 만들었으면 `tools/observe.cjs`에 시나리오를 추가한다 (만든 화면이 관찰 범위 밖에 남지 않게).

보고 형식: 본 장면 목록 · 문제(있으면 스크린샷 경로와 함께) · 에러 유무. 보지 못한 장면은 "NOT ASSESSED — 이유".
