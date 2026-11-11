# 현재 에셋 발주서

2026-11-11 · **현재 새 제작 요청은 0건입니다.** UI-31·32·33·S-01은 `261111.zip`으로 수령해 반입했습니다. 작은 상징·핀의 초기 변환 손상은 [원본 대조·보정 기록](reports/2026-11-11-symbol-recovery.md)에 정정했습니다. [초기 반입 기록](reports/2026-11-11-delivered-assets.md).

## 0. 지금 할 일

| 발주 | 용도 | 상태 |
|---|---|---|
| UI-31 기물 검사판 | 적 기물 정보창 외곽 | **반입 완료** |
| UI-32 능력치 계기 칸 | 체력·방열판·공격·방어 | **반입 완료** |
| UI-33 결과 장부 | 막 결과·출하 결과의 종이판 | **반입 완료** |
| S-01 에필로그 손 | 부모의 반품 제안과 아이의 환대 | **반입 완료** |

완료한 프롬프트는 [보관본](asset-order-history.md#2026-11-11-수령-완료--ui-3133--s-01)에 옮겼습니다. 과거 기록의 ‘제작 요청·미수령’을 현재 발주로 해석하지 마세요.

<a id="build-prototype-assets"></a>

### 제작 완료 · 원본 반입 대기

| 발주 | 그림 | 진행 |
|---|---|---|
| I-14A | 맞물린 톱니 | 사용자 제작 완료. 원본 파일 반입 대기 |
| I-14B | 공성 걸쇠 | 사용자 제작 완료. 원본 파일 반입 대기 |
| I-14C | 맞댄 철판 | 사용자 제작 완료. 원본 반입·V3 기능 연결 대기 |
| I-14D | 분대 인장 | 사용자 제작 완료. 원본 반입·V4 기능 연결 대기 |

위 네 장은 **재제작 요청이 아닙니다.** 이번 ZIP에는 포함되지 않았습니다. 당시 프롬프트는 [보관본의 I-14A~D](asset-order-history.md#build-prototype-assets)에 있습니다.

<a id="ui-polish-orders"></a>
<a id="1위--ui-31--기물-검사판-외곽--우선-제작"></a>
<a id="2위--ui-32--능력치-계기-칸--ui-31-다음"></a>
<a id="3위--ui-33--결과-장부-종이판--선택-제작-p2"></a>
<a id="s01-epilogue-hands"></a>

## 반입된 파일

원본은 `build-res/order/UI-31-source.png`, `UI-32-source.png`, `UI-33-source.png`, `S-01-epilogue-hands-source.png`에 그대로 보관합니다.
게임용 UI는 `src/assets/ui/chrome/v2/unit-inspect-panel.png`, `unit-stat-*.png`, `ledger-slip.png`, 에필로그는 `public/scenes/epilogue-hands.png`입니다.

### 반입 규칙

**개발 측이 직접 수행합니다.** 원본 보관 → 논리 격자 복원 → 팔레트·알파 검사 → 게임용 자르기 → 실제 화면 확인 순서입니다. UI-31~33 재생성은 `python3 -I tools/pixel/ui_delivery_import.py`, 장면 재생성은 `tools/scene-import.py`를 사용합니다. UI는 고정 모서리와 민 테를 나눠 늘리고, 장면은 비율과 색을 유지하며 정수 도트로 표시합니다. CSS의 `pixelated` 설정만으로 반입 완료라 하지 않습니다.
