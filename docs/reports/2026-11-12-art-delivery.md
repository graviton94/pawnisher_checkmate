# I-15·S-02~04·UI-34 수령·반입 — D-434

`Downloads (2).zip` 안의 PNG6개를 확보했다. 이번 수령분은 아이템4종·장면3종·상태표식3종이다. 후속 브랜치 `content-art-audit-20261112`에서 작업하고 main 및 테스터 APK는 고정한다.

## 원본과 실제 픽셀화

원본은 `build-res/order/`에 바이트 그대로 보관했다. [수령 기록](../../build-res/order/2026-11-12-delivery.json)에 원래 파일명, ZIP/원본/결과 SHA256, 결과 크기·알파를 남겼다. 압축 안의 원본과 보관된6개 파일의 바이트 일치를 확인했다.

| 수령 원본 | 보관 이름 | 결과 |
|---|---|---|
| 랜턴·가죽 서적·메달 시트 2172×724 | I-15ABC-source.png | 마지막 숨·피의 장부·백전 훈장 각각32×32, 작은 칸용16×16 |
| 금이 간 인식표 1254×1254 | I-15D-source.png | 죽음 넘긴 표식32×32, 작은 칸용16×16 |
| 톱니·닫힌 고리·걸쇠 시트 2172×724 | UI-34-source.png | 준비 중/가능/소진 각각16×16 |
| 열린 왕 거푸집 1672×941 | S-02-throne-mold-source.png | throne-mold 320×180 |
| 공장 출하장 1672×941 | S-03-departure-dock-source.png | departure-dock 320×180 |
| 운송 상자 안 1672×941 | S-04-shipping-interior-source.png | shipping-interior 320×180 |

시트는 완성 물건의 칸만 분리했다. 아이템 내부의 고리·철사·핀·불씨를 떼거나 합성하지 않았다. 바깥 투명 여백만 걷고, 전체 물건의 비율을 유지한 정사각 여백을 붙여 한 번 샘플링한다. 특히 UI-34의 원판은 원본 칸 가운데 약2/3만 차지하므로, 빈 칸까지 곧바로16픽셀로 줄여 내부 모양을 무너뜨리지 않도록 했다. 알파는0/255이며 투명 픽셀의 RGB도0으로 정리했다. 팔레트 강제 교체·추가 외곽선·장식 재구성은 없다.

[칸별 변환값](../../build-res/order/I-15-UI-34-import.json)과 [원본/결과 비교판](../../build-res/order/I-15-UI-34-check.png)을 보관했다. 장면은 받은 전체 그림을320×180 정본 격자로 샘플링하며 수동 간격 `941/180`과 균일 격자를 `tools/pixel/scene_recipe.py`에 기록했다. ‘자동 검출로 원본이 정확히320도트였음을 입증했다’는 뜻은 아니다. 생성된 확대 원본을 게임의 고정 격자로 실제 변환한 것이다. CSS `pixelated`만 바꾼 작업이 아니다.

재반입 후 공개 출력14개의 RGBA 해시가 모두 동일했다. 같은 보관 원본을 입력했을 때 자기 자신에게 다시 복사하려던 장면 도구도 보완했다.

```sh
python3 -I tools/pixel/scenario_delivery_import.py
python3 -I tools/scene-import.py build-res/order/S-02-throne-mold-source.png throne-mold S-02
python3 -I tools/scene-import.py build-res/order/S-03-departure-dock-source.png departure-dock S-03
python3 -I tools/scene-import.py build-res/order/S-04-shipping-interior-source.png shipping-interior S-04
```

## 게임 연결

- 아이템4종은 `SLICE_PARTS`에서 각각의 전용 아이콘을 쓴다. 다른 부품과의 공유 아이콘은8쌍→4쌍으로 줄었다. 남은4쌍은 이전 I-14 원본 대기분이다. 기능·희귀도·확률은 변경하지 않았다.
- 왕위 선택과 진엔딩의 ‘빈 몸’은 `throne-mold`, 왕이 남은 뒤 동료 출발/함께 출하는 `departure-dock`, 운송 중 동료/원부는 `shipping-interior`를 쓴다. 기존의 실내 크레딧 상자를 운송 배경으로 재사용하지 않는다.
- 장면 재생기는 새 배경 위에 실제 생존 기물을 투명 레이어로 겹친다. 배경을 쓰려고 현재 분대를 지우거나, 그림에 고정된 동료를 부활시키지 않는다. 기존 대역 그림의 검은 바탕은 새 배경을 가리지 않는다.
- 배우의 발 위치는 새 배경의 바닥에 맞춘다. 인원별 간격과 화면 폭에 따른 크기 상한으로 최대10명도 서로 겹치지 않게 한다. 부모·아이 S-01에는 추가 배우를 겹치지 않는다.
- UI-34는 `public/ui/part-state/`에 반입했다. **게임의 조건 상태 표시에는 아직 연결하지 않았다.** 초기 발주부터 표시 로직을 동반하는 후속 후보였으므로, 현재 소유 여부만으로 ‘발동 가능/소진’을 만들어 보여 주지 않는다. 이미지 재발주는 필요 없다.

발주서는 [현재 현황](../asset-order-master.md)만 남기고, 완료된7건과 상태표식 프롬프트는 [보관본](../asset-order-history.md)으로 옮겼다. 새 제작 요청0건이다. 이전 I-14의 원본4개는 이번 ZIP에 포함되지 않아 기존 대기 상태를 유지한다.

## 검수

| 대표 화면 | DPR | 실행 결과 |
|---|---:|---|
| 작은 모바일667×375 | 2.625 | PASS |
| 모바일915×412 | 2.625 | PASS |
| 태블릿1024×768 | 2 | PASS |
| PC1280×720 | 1 | PASS |

네 규격 모두 실제 카드에 렌더링된 아이콘4개의 PNG 바이트가 새 결과와 일치했다. 왕위 선택과 진엔딩의 장면3개도 실제 표시된 파일 바이트·320×180 크기를 대조했다. 장면은 정수 기기 픽셀 확대·비율 보존, 대사/단추는 화면·글 경계를 확인했다. 기본4명과 최대10명에서 모든 배우가 표시되고 서로 겹치거나 화면 밖으로 나가지 않았다. 출하와 운송의 배경이 배우 레이어에 가려지지 않고, 집 장면의 추가 배우는0명이다. 페이지 오류0.

- 전체35파일284개 테스트와 웹 빌드 통과.
- 본편3장, 약속/이어하기, 실제 출하, 해금, 도전 분리, 동료0명, 옛 저장 복귀의 기존 캠페인 실행 검사 통과.
- 콘텐츠/리소스 감사127개 참조 누락0, 공급 누락0, 공유 아이콘4쌍. [기계 판독 결과](2026-11-12-art-delivery-audit.json).
- 재반입 공개 출력14개 RGBA 해시 동일. 원본6개 보관 바이트 일치.
- 그래픽 정본용 실제 화면과 로컬 HTML 갱신. 공개 아티팩트·APK는 발행하지 않음.

재현: `CHROMIUM_PATH=/usr/bin/chromium OBSERVE_PRESET=mobile node tools/slice-observe.cjs asset-delivery` (`small-mobile / tablet / pc`도 가능). `tools/qa/asset-delivery.cjs`가 바이트 대조·기본/최대 분대·장면/글 경계를 함께 확인한다.

[아이템 카드](../../tools/artguide/shots/delivery-items.png) · [왕위 결정](../../tools/artguide/shots/delivery-choice.png) · [출하](../../tools/artguide/shots/delivery-departure.png) · [운송](../../tools/artguide/shots/delivery-shipping.png) · [태블릿10명](../../tools/artguide/shots/delivery-full-company-1024x768.png).

UI/UX 판정은 **APPROVED — 이번 원화 연결·배우 합성·대사 영역 범위**다. 실기기 프레임률·전체 접근성·모든 편성의 실제 플레이 재미는 **NOT ASSESSED**다. UI-34의 표시 상태는 아직 로직/게임 검수 대상이 아니다.


후속 판정(D-435): 사용자가 배경+아이콘 합성의 연출 완성도를 지적했다. 위 PASS는 원본 반입·연결·글/이미지 경계·분대 데이터 보존에 대한 기록이다. **출하·운송·배신의 최종 미학적 완성도는 NEEDS REVISION**으로 분리하고 [전용 일러스트3장](../asset-order-story-cinematics.md)을 준비한다. 현재 그림은 임시 연출이며, 전용 그림을 수령하면 해당 컷에서 전투 기물 합성을 제거한다.
