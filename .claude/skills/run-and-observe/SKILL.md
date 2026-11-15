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
3. **본편(리뉴얼판, `index.html`)**: `node tools/slice-observe.cjs <title|continue|event:<id>|traits|boss3|map|shop|forge>` → `production/qa/evidence/<날짜>-slice-<장면>.png`.
   2.0(legacy, `legacy.html`): `node tools/observe.cjs <시나리오>` (PC 확인은 `--pc`). 결과 PNG: `production/qa/evidence/<날짜>-<장면>.png`
4. 스크린샷을 Read로 **직접 본다**. 확인할 것: 겹침·잘림, 글자 크기, 터치 대상 크기, 바뀐 기능이 실제로 보이는가.
5. 콘솔/페이지 에러가 하나라도 있으면 실패로 보고한다.
6. 새 화면을 만들었으면 `tools/slice-observe.cjs`(본편) 또는 `tools/observe.cjs`(legacy)에 시나리오를 추가한다 (만든 화면이 관찰 범위 밖에 남지 않게).

## 전수 점검 (sweep, D-510)

에셋을 다 받은 뒤 · 큰 화면 개편 뒤에는 화면을 하나씩 열지 말고 **`node tools/qa/sweep.cjs [915|667] [--calm]`** 한 번으로 모든 플레이어 화면을 순서대로 찍는다 — 타이틀 · 프롤로그 전 컷 · 입문 시험대 · 지도 1~4막 · 전투(HUD · 판 위 글 4갈래 · 이형 · 거대 주물 · 공정 판) · 반장(2단계 컷인 7종 · 격파 컷) · 보상 · 고물상 · 작업대 · 사건(결과 FX 8종) · 판돈 · 막 쉼터 · 엔딩 K/T/F · 크레딧 · 승급 · 도감 · 용어집 (`--list`로 묶음 · 화면 목록). 빌드가 없으면 빌드하고(`--build`로 강제), 미리보기 서버는 빈 포트에 직접 띄웠다 닫는다(`OBSERVE_URL`을 주면 그 서버). 시간 제한이 있으면 `--only map,battle,...`로 묶음별로 나눠 돌린다 — 같은 날 · 같은 규격의 결과는 `production/qa/evidence/sweep-<날짜>[-667][-calm]/sweep-report.md` 한 장으로 합쳐진다(화면 · 스크린샷 · 글자 점검 TXT 수 · 콘솔/HTTP 오류 · `docs/asset-order-master.md`에서 재발주/대기 중인 그림을 쓰는 화면). 보고서는 기록일 뿐 판정이 아니다 — 스크린샷을 직접 보고 4번 기준으로 판정한다. 새 화면을 만들면 `tools/qa/sweep.cjs`의 `GROUPS`에도 장면을 더한다(디버그 직행이 필요하면 `?debug` `sliceApi`에 컨트롤러 함수를 부르는 훅만 더한다).

보고 형식: 본 장면 목록 · 문제(있으면 스크린샷 경로와 함께) · 에러 유무. 보지 못한 장면은 "NOT ASSESSED — 이유".
