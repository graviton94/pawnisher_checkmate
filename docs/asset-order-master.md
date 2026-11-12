# 현재 아트 발주서 — 제작할 것만 여기서 확인

2026-11-12 · D-435 · 후속 브랜치 `content-art-audit-20261112`. **D-434 발주 이미지는 전부 수령. D-435 전용 서사 일러스트3장을 다음 발주로 준비했다.** 완료된 프롬프트는 [보관본](asset-order-history.md#delivery-20261112-completed)에 옮겼다. main과 테스트 APK는 갱신하지 않는다.

## 0. 다음 제작 — 전용 서사 일러스트3장 (D-435)

현재 배경+전투 아이콘 합성은 임시다. 인물과 배경을 같은 원근·광원으로 그린 완성 컷으로 바꾼다. **각 프롬프트는 [전용 발주서](asset-order-story-cinematics.md)에 있으며 첨부 없이 그대로 전달할 수 있다.**

| 순서 | 번호 | 그림 | 프롬프트 |
|---|---|---|---|
| 1 | S-05 | 문턱을 넘는 폰 — 함께 출하 | [복사할 명세](asset-order-story-cinematics.md#scene-threshold) |
| 2 | S-06 | 상자 안의 종이왕 — 운송 | [복사할 명세](asset-order-story-cinematics.md#scene-shipping) |
| 3 | S-07 | 왕만 남은 출하구 — 배신 결말 | [복사할 명세](asset-order-story-cinematics.md#scene-solitude) |

그림의 주인공과 상황을 완성하고 동료 전원을 고정해서 그리지 않는다. 현재 생존자 이름과 대사 분기는 유지한다. 전용 원화 수령 뒤 해당 컷의 `showActors`를 끄므로, 완성 그림 위에 전투 기물 아이콘을 다시 얹지 않는다. 받은 배경3종과 아이템4종의 동일 이미지 재제작 요청은 아니다.

## 1. 이번 수령·연결 현황

| 번호 | 수령한 그림 | 상태·연결 |
|---|---|---|
| I-15A | 마지막 숨 — 열린 연소실 | 반입 완료. `SLICE_PARTS.lastBreath.icon` → `public/ui/icons16/lastBreath.png` |
| I-15B | 피의 장부 — 닫힌 가죽 장부 | 반입 완료. `SLICE_PARTS.ledger.icon` → `public/ui/icons16/ledger.png` |
| I-15C | 백전 훈장 — 닳은 훈장 | 반입 완료. `SLICE_PARTS.veteran.icon` → `public/ui/icons16/veteran.png` |
| I-15D | 죽음 넘긴 자의 표식 — 철사로 이은 인식표 | 반입 완료. `SLICE_PARTS.deathMark.icon` → `public/ui/icons16/deathMark.png` |
| S-02 | 비어 있는 왕의 거푸집 | 반입 완료. 왕위 결정과 진엔딩 첫 컷 → `public/scenes/throne-mold.png` |
| S-03 | 공장 출하구 | 반입 완료. 왕이 남은 뒤 동료 출발·함께 출하 → `public/scenes/departure-dock.png` |
| S-04 | 운송 상자 안 | 반입 완료. 운송 중 동료·원부 장면 → `public/scenes/shipping-interior.png` |
| UI-34 | 준비 중 / 가능 / 소진 3종 | **이미지 반입 완료. 표시 로직 대기.** `public/ui/part-state/{waiting,ready,spent}.png`. 실제 판정 없이 상태를 추정해 표시하지 않는다 |

아이템4종은 다른 부품과 공유하던 임시 그림에서 분리했다. 장면에는 고정 기물 인원이 없고, 출하/운송에서는 현재 생존 분대만 게임이 표시한다. 부모·아이 S-01 장면에는 추가 기물 대역을 겹치지 않는다.

## 2. 추가 제작하지 않는 기존 항목

| 번호 | 상태 |
|---|---|
| I-14A 맞물린 톱니 / I-14B 공성 걸쇠 / I-14C 맞댄 철판 / I-14D 분대 인장 | **이전 사용자 제작 완료·원본 반입 대기.** 이번 ZIP에는 해당 네 원본이 없다. 재제작 요청 아님. 현재 기능과 임시 아이콘은 유지 |
| UI-31 기물 검사판 / UI-32 능력치 네 칸 / UI-33 장부 | 기존 반입 완료. 재발주 없음 |
| S-01 부모·아이 손 | 기존 반입 완료. 에필로그 세 컷에서 사용 |

I-14 당시 제작 명세는 [보관본](asset-order-history.md#build-prototype-assets)에 있다. 현재 임시 아이콘 `forkGear / anvilPlate / shieldWall / royalSeal`의 네 쌍은 해당 원본 반입 전까지 유지한다.

<a id="build-prototype-assets"></a>
<a id="ui-polish-orders"></a>
<a id="1위--ui-31--기물-검사판-외곽--우선-제작"></a>
<a id="2위--ui-32--능력치-계기-칸--ui-31-다음"></a>
<a id="3위--ui-33--결과-장부-종이판--선택-제작-p2"></a>
<a id="s01-epilogue-hands"></a>

## 3. 원본·반입 정본

- 수령한 PNG6개는 `build-res/order/I-15ABC-source.png`, `I-15D-source.png`, `UI-34-source.png`, `S-02-throne-mold-source.png`, `S-03-departure-dock-source.png`, `S-04-shipping-interior-source.png`에 바이트 그대로 보관한다.
- 원본 이름·SHA256·출력 크기/알파: `build-res/order/2026-11-12-delivery.json`. 아이콘의 칸 분리·바깥 투명 여백·단일 샘플링 값: `I-15-UI-34-import.json`.
- 아이템·상태표식 재현: `python3 -I tools/pixel/scenario_delivery_import.py`. 시트의 완성 물건 칸만 분리한다. 내부 상징·핀·철사를 따로 떼거나 재조립하지 않는다. 원본 색을 유지하고 외곽선을 추가하지 않는다.
- 장면 재현: `tools/scene-import.py`, 수동 격자 정본 `tools/pixel/scene_recipe.py`. 받은 1672×941 전체를 320×180 격자로 한 번 샘플링한다. CSS `pixelated`만으로 반입했다고 하지 않는다.
- 부품 문법·6→7→8→8칸·96px 교체판은 기존 카드/선택지/철 단추를 유지한다. 새 프레임 발주가 필요 없다.

검수: 667×375 / 915×412 / 1024×768 / 1280×720. 이번 원본의 구체적인 반입·연결 기록은 [D-434 보고](reports/2026-11-12-art-delivery.md)를 따른다.
