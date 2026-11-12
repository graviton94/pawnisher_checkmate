# 현재 아트 발주서 — 제작할 것만 여기서 확인

2026-11-12 · D-436 · 후속 브랜치 `content-art-audit-20261112`. **D-434 반입 완료. 전용 서사 컷 R1 세 장도 수령했으며 구도 검토 중이다. S-05/S-07은 구도 재작업, S-06은 부분 수정한다.** 완료된 프롬프트는 [보관본](asset-order-history.md#delivery-20261112-completed)에 옮겼다. main과 테스트 APK는 갱신하지 않는다.

## 0. 현재 수정 발주 — 전용 서사 컷 R2 (D-436)

**인물 참고 파일도 함께 전달한다(D-437): [전체 PNG ZIP](art/reference/pawnisher-character-reference.zip) · [종이왕 PNG](art/reference/preview/paperking-864.png) · [한 장 비교표](art/reference/character-sheet.png) · [장면별 첨부 안내](art/reference/README.md).** 종이왕 K0가 정본이고, K1은 새 금빛 왕의 형태 참고만 한다. 설명문만 보내지 말고 해당 PNG를 프롬프트와 함께 첨부한다.

R1 세 장은 [구도 리뷰](reports/2026-11-12-cinematics-r1-review.md)에 근거를 남겼다. 아직 최종 원화로 승인하지 않고 실행용 그림은 유지한다. **[현재 R2 프롬프트](asset-order-story-cinematics.md)는 이전 R1의 전신/일률적 하단 여백 강제를 해제한다.**

| 순서 | 번호 | 이번 작업 | 프롬프트 |
|---|---|---|---|
| 1 | S-05 출하 | ‘문 앞 정물’→‘경계를 넘는 순간’. 흑백 구도3안 먼저 | [복사](asset-order-story-cinematics.md#scene-threshold) |
| 2 | S-07 금빛 왕 | ‘트로피 전시’→‘새 몸의 무게와 버린 왕관의 관계’. 흑백 구도3안 먼저 | [복사](asset-order-story-cinematics.md#scene-solitude) |
| 3 | S-06 운송 | 낮은 시점/천/사선 빛 유지. 좁은 빛·왕관 사각 장식 부분 수정 | [복사](asset-order-story-cinematics.md#scene-shipping) |

인물·배경은 같은 원근/광원으로 그린다. 구도 확정 뒤 대사 위치를 맞추며, 완성 그림 위에 전투 기물 아이콘을 다시 얹지 않는다. 동료의 인원/생존과 대사 분기는 유지한다. 수령한 R1 원본은 `build-res/order/cinematics-r1/`에 보관했다.

## 1. D-434 반입 완료분

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
