# S-05·06·07 최종 원화 반입 — D-442

사용자가 제공한 ZIP의 PNG3개를 수령해 원본 보존·실제 격자 복원·실행 연결·화면 검수를 완료했다. 기존 게임 그림을 닮게 재생성한 결과가 아니라 수령 원본을 직접 변환한 파일이다. 작업 브랜치는 `content-art-audit-20261112`이며 main/APK는 변경하지 않았다.

## 반입과 연결

| 번호 | 원본 보존 | 실행용 그림 | 실제 사용 | 대사 위치 |
|---|---|---|---|---|
| S-05 | `S-05-departure-decision-source.png` | `departure-decision.png` | 진엔딩의 함께 출하·문턱 통과 | 상단 |
| S-06 | `S-06-shipping-company-source.png` | `shipping-company.png` | 진엔딩 운송 상자 | 하단 |
| S-07 | `S-07-gilded-solitude-source.png` | `gilded-solitude.png` | 왕위 선택 후 동료를 보내고 남는 장면 | 상단 |

원본은 `build-res/order/`, 실행용은 `public/scenes/`에 있다. 세 원본 모두1672×941 RGB PNG이며 ZIP에서 읽은 원본과 보존본 SHA256이 일치한다. 원래 파일명·해시·출력·변환값은 [수령 manifest](../../build-res/order/2026-11-12-cinematics-final.json)에 기록한다.

`tools/scene-import.py`를 각 원본에 실행했다. 수동 격자 `941/180 ≈ 5.2278px`, 균일 간격, 칸 중앙 우세 색 묶음의 대표색으로 전체320×180을 복원했다. 출력 알파는 전부255, 팔레트 축소는 `colors=0`으로 끈다. 원본의 종이·금속·천·디더링을 임의 재조립하거나 그림 전체에 새 색상표를 씌우지 않았다. 이 격자는 반입 규격이며 원본이 처음부터 정확한320×180 정수 확대였다는 주장이 아니다.

같은 원본과 `scene_recipe.py`로 재생성하여 실행용 파일과 RGBA 크기·전 픽셀을 비교했다. **3 match / 0 different / 0 error.** [픽셀 검증 JSON](2026-11-12-cinematics-final-pixels.json), [원본/반입 비교](2026-11-12-cinematics-final-source-compare.png).

```sh
python3 -I tools/scene-import.py <원본05> departure-decision S-05
python3 -I tools/scene-import.py <원본06> shipping-company S-06
python3 -I tools/scene-import.py <원본07> gilded-solitude S-07
python3 -I tools/qa/scene-pixel-audit.py --output-dir /tmp/d442-pixel-audit --scene departure-decision --scene shipping-company --scene gilded-solitude
```

완성 원화에 기물이 이미 있으므로 해당 컷의 대역 합성을 제거했다. 동료는 화면 밖에 존재할 수 있으며 현재 생존자의 대사·동료0명·약속한 동료 상실 분기는 보존한다. 그림에 동료 수나 유형을 새로 그리지 않는다. 부모·아이 S-01은 기존 그림 그대로다.

## 실제 화면에서 발견하고 고친 것

최초 모바일 검수에서 하단 대사 띠가 S-05의 받침/문턱과 S-07의 버린 왕관을 덮었다. 컷별 `caption` 위치를 추가해 이 두 컷만 기존 대사 띠와 건너뛰기 단추를 상단으로 옮겼다. S-06과 나머지 컷은 하단을 유지한다. 화면 폭899 이하에서는 단추를 상단 띠 바로 아래에 배치한다. 새 프레임·글자 축소·원본 변형으로 가리지 않았다.

실제 터치 테스트는 이미지의 핵심 영역과 대사/단추 사각형의 교차를 검사한다. 다음 컷으로 넘어가면 상단 배치가 해제되는 것도 S-06·부모/아이 장면에서 확인했다. 컷신은 기존 계단 마스크와 정지 카메라를 유지한다.

## 검수 결과

| 규격 | DPR | 실제 원화3종 | 생존 동료0/1/9명 | 글/터치 경계·핵심 가림 | 왕위 결정→크레딧 |
|---|---|---|---|---|---|
| 작은 모바일667×375 | 2.625 | PASS | PASS | PASS | PASS |
| 모바일915×412 | 2.625 | PASS | PASS | PASS | PASS |
| 태블릿1024×768 | 2 | PASS | PASS | PASS | PASS |
| PC1280×720 | 1 | PASS | PASS | PASS | PASS |

`tools/qa/cinematics.cjs`에서 화면이 요청한 PNG의 응답 바이트와 저장소 파일을 대조하고 native320×180·기기 픽셀 정수 배율·비율 보존·대역0개·핵심 영역 가림을 검사한다. 각 규격의 실제 스크린샷을 직접 열어 확인했다. 부모/아이 컷에도 고정 동료 대역이 없다. 콘솔 오류·페이지 오류0. 약속 동료가 죽은 경우 유령 대사를 하지 않는 조건은 기존 캠페인 테스트에서도 확인한다.

[네 규격 화면 비교](2026-11-12-cinematics-final-screens.png). 원본 스크린샷은 `production/qa/evidence/2026-11-12-slice-cinematics-*.png`, 정본 그림판용 대표 화면은 `tools/artguide/shots/cinematics-*.png`다. `tools/artguide/build.py` 목록도 갱신하고 로컬 HTML을 생성했다. 외부 아티팩트를 게시하지는 않았다.

```sh
npm run build
npm test
CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=small-mobile node tools/slice-observe.cjs cinematics
CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=mobile node tools/slice-observe.cjs cinematics
CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=tablet node tools/slice-observe.cjs cinematics
CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=pc node tools/slice-observe.cjs cinematics
CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=mobile node tools/slice-observe.cjs campaign
```

빌드 통과, **35파일/284테스트 통과**. 실제 캠페인 검수도 본편3장·별도 도전·약속/저장 복귀·빈 분대·이전 저장 복귀를 통과했다. UI/UX 판정은 **이번 변경 범위 APPROVED**. 네이티브 APK 성능과 실기기 터치 느낌, 전체 게임의 재미·승률은 이번 검사로 판정하지 않는다.

## 다음 작업 제안

1. **UI-34 상태표식의 실제 조건 연결.** 준비 중/발동 가능/소진 그림은 이미 있으나 표시 로직은 아직 없다. 표시할 부품과 실제 발동·소진 조건을 대응시켜 소유만으로 ‘준비’를 표시하지 않게 한다. 기존 효과/수치와 모순되는 안내를 만들지 않는 것이 완료 기준이다.
2. **테스터 리뷰를 바탕으로 빌드 공급과 선택을 검증.** 밸런스형·나이트 집중·룩 집중·변형 빌드의 차이, 핵심 부품을 모으는 경로, 완성 시너지의 체감, 고가치 보상의 획득 난이도와 대가를 먼저 본다. 재미 요소가 실제로 성립하는지 확인하기 전 승률 수치만 맞추지 않는다.
3. **남은 원본 정리와 통합 배포.** I-14 네 아이콘은 목록상 제작 완료·원본 반입 대기이며 이번 ZIP에는 없다. 추가 재발주하지 않는다. 테스터 기준 main/APK와 후속 변경을 구분해 통합 검수하고, main 병합/APK는 별도 요청에 따라 진행한다.

현재 추가 신규 그림 발주0건. 옛 원화 재작업 목록과 GitHub에 개별 업로드하라는 임시 안내는 완료 목록에서 제거했다.
