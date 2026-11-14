# 2026-11-14 확장 발주 — 사용 계획

발주서: [`docs/asset-order-master.md` §0-D](../asset-order-master.md) (73상자 · 낱장 214) · 발주 페이지: `python3 -I tools/order/order_page.py <scratchpad>/order.html`
근거: 사용자 플레이 후기 31건 [`docs/reports/2026-11-14-playtest-feedback.md`](../reports/2026-11-14-playtest-feedback.md) — 특히 1 · 5 · 6 · 7 · 8 · 9 · 12 · 16 · 21 · 22 · 23 · 24 · 26 · 27 · 31, 후기 25(「모든 에셋은 발주서로 — 전부 제공」), 추가 지시 (1).
규칙: D-386(Claude는 새 그림을 그리지 않는다 — 발주 · 다듬기만) · D-388(글로만 · 도트 강제) · D-423(반입은 개발 측이 도구를 실제로 돌리고 원본 · 결과 대조 근거를 남긴다) · D-216/D-259(도트 · 주물 공방 문법) · D-386(비율을 깨지 않는다 — 잘라 쓴다).

이 문서는 **문서만** 바꾼다. 아래 「받으면 바꿀 코드」는 그림이 도착한 뒤의 작업 목록이다.

## 1. 한눈에 — 집계

### 계열 × 우선 (낱장 그림 수)

| 계열 | 뜻 | P1 | P2 | P3 | 합 | 상자 |
|---|---|---|---|---|---|---|
| P | 이형 기물 (흰 · 검) | 10 | | | 10 | 5 |
| G | 거대 주물 | 3 | | | 3 | 3 |
| DL | 전장 대사 · 안내 크롬 | 9 | | | 9 | 2 |
| HB | 전투 HUD (턴 끝 · 속전) | 13 | | | 13 | 2 |
| RF | 등급 틀 · 반짝임 · 카드 틀 | 19 | | | 19 | 4 |
| CI | 반장 2단계 컷인 · 2단계 초상 | 10 | | | 10 | 8 |
| PT | 초상 (사건 NPC · 종이왕 표정 · 적 · 이형 분대) | 35 | 5 | | 40 | 8 |
| TI | 용어 아이콘 | 16 | | | 16 | 2 |
| WG | 판돈 | 6 | | | 6 | 2 |
| EF | 사건 결과 FX | 8 | | | 8 | 2 |
| MP | 지도 (현황판 · 노드 · 바탕) | 23 | | | 23 | 6 |
| OP | 오프닝 컷 | 4 | | | 4 | 4 |
| ED | 엔딩 · 패배 · 크레딧 · 영화 크롬 | 18 | | | 18 | 12 |
| CN | 왕관(장) 시작 · 끝 | | 6 | | 6 | 6 |
| AC | 막 입구 카드 | | 3 | | 3 | 3 |
| PB | 공정 판 칸 | | 13 | | 13 | 1 |
| LD | 로딩 · 안내서 | | 5 | | 5 | 2 |
| KC | 킹 카드 그림 | | | 8 | 8 | 1 |
| **합** | | **174** | **32** | **8** | **214** | **73** |

상자 기준: P1 59 · P2 13 · P3 1. 재발주(지금 그림이 있으나 다시 받는 것) 상자 13: RF-01~04 · MP-02 · OP-02 · OP-04 · ED-09 · ED-12 · AC-01~03 · TI-01(생명 · 심장 톱니 · 태엽 포함).

### 만드는 순서 (사용자에게 요청하는 순서)

| 주 | 배치(순위) | 이유 |
|---|---|---|
| 1 | 1 P-01~05 → 2 G-01~03 | 이미 기다리는 그림 · 사용자가 먼저 시작. 딱지 · 자르기 임시본을 걷는다 |
| 1 | 3 DL → 4 HB → 9 TI | 전투 화면 후기(6 · 7 · 8 · 22 · 27)의 코드 수정이 이 크롬 · 아이콘을 기다린다. 작은 시트라 빨리 끝난다 |
| 2 | 5 RF → 6 CI → 8 PT-05~07 | 레어리티(9) · 2단계(21) · 적 대사(6) — 「임팩트」 후기 묶음 |
| 2 | 7 PT-01~04 → 10 WG → 11 EF | 사건 · 판돈 화면(12 · 16 · 23) |
| 3 | 12 MP → 13 OP → 14 ED | 지도(24) · 오프닝(1) · 엔딩 영화화(31) — 장면 그림이 많아 오래 걸린다 |
| 4 | 15 CN → 16 AC → 17 PB → 18 LD → 19 PT-08 | 흐름 보강 (P2) |
| 뒤 | 20 KC | 킹 빌드 카드 기획(후기 26)을 정한 뒤 이름 · 그림을 맞춘다 |

## 2. 화면별 점검 — 지금 무엇을 쓰고 있나

표기: **OK** = 그대로 · **임시** = 코드 그림 · 빌린 그림 · **없음** = 자리가 비었음 · **재발주** = 있으나 후기 · 화풍 때문에 다시.

| 흐름 | 화면 · 요소 | 지금 쓰는 것 (코드) | 판정 | 발주 |
|---|---|---|---|---|
| 오프닝 | 타이틀 | `public/ui/title-*.png` · `logo.png` | OK | — |
| 오프닝 | 프롤로그 PRO-01~08 | `prologue-00~07` (옛 270~360폭) · `script.ts PROLOGUE` | 대부분 OK · PRO-05 · 08은 바이블 장면과 다름 · PRO-01-2 · 04-4 컷 없음 | OP-01~04 (후기 1) |
| 오프닝 | 그림자 컷 SHD-A/B | `prologue-shadow` · `new-law` | OK, 규정판 클로즈업 없음 | ED-05 공용 |
| 온보딩 | 안내서 · 로딩 | `public/guide/*.png` (캡처) · `warmup.ts` · `opening.ts` | 틀 없음 · 로딩에 안 씀 | LD-01~02 (후기 5) |
| 지도 | 바탕 | `showMap` → `placeBg(null)` | 없음 | MP-03~06 |
| 지도 | 노드 | `icons16/n.*` | 임시(옛 시트, 사건 = 편지 봉투 · 쉼터 · 현재 위치 없음) | MP-02 재발주 |
| 지도 | 분대 현황 | 없음 (분대 화면 따로) | 없음 | MP-01 (후기 24) |
| 막 | 막 입구 카드 | `act-1 · 2 · 4` (빈 방 배경) · ACT-3 = `chained-door` | 재발주 (바이블 장면이 안 보임) | AC-01~03 |
| 전투 | 기물 | `public/pieces/` (maker) | OK | — |
| 전투 | 이형 · 거대 | 발주 그림 `s-<이형><진영>.png` · `s-giant<유형>1.png` (`BoardRenderer.artKey`, D-489) — 딱지 · 두 배 자르기는 그림 없을 때 대비만 | 받음 (P-04 재발주 중 1차본) | P-04 재발주 |
| 전투 | 공정 판 칸 | `board/variant-conveyor · radiator · hammer` · `crack` · `chip-magnet` 빌림 | 임시 | PB-01 |
| 전투 | 적 대사 | `main.ts foeSay` — 반장 = `hud/avatar-*`, 보통 적 킹 = 기물 아이콘, 이름 띠 노랑 | 임시 · 위치 우측 · 형식 미통일 | DL-01~02 · PT-05~07 (후기 6 · 22) |
| 전투 | 우리 대사 · 합류 | `crewSay` → `hud/crew-*` · `adjutant` | 초상 OK · 띠 없음 | DL-01~02 |
| 전투 | 시스템 안내 (상단 띠) | `stateBand` toast/brass/crimson | 임시 (가시성 나쁨 — 후기 6) | DL-01 3번 |
| 전투 | 턴 끝 단추 | `#btn-end .btn k-brass` + 경고 깜빡임(버튼째 사라짐) | 재작업 필요 | HB-01 (후기 7) |
| 전투 | 속전 계기 | `#coins` · `kit/tube.png` | 숫자 테 밖 (후기 8) | HB-02 |
| 전투 | 태엽 · 생명 · 심장 톱니 | `hud.key.*` · `life.png`(하트+톱니) · `kit/revive-cog` | 생명 하트 ↔ 심장 톱니 혼동 (후기 27) | TI-01 재발주 |
| 전투 | 헷갈린 용어 | 설문 Q6 용어 대부분 아이콘 없음 | 없음 | TI-01~02 |
| 전투 | 판돈 | `maybeBet` 창 · 결과 HUD 없음 | 임시 (후기 12) | WG-01~02 |
| 반장 | 등장 | `bossintro.ts` · `boss-*.png` 초상 | OK | — |
| 반장 | 2단계 예고 · 돌입 | `BOSS_PHASE_TEXT` 띠 · 같은 초상 + `.p2` | 임시 (임팩트 없음 — 후기 21) | CI-01~08 |
| 반장 | 격파 컷 | `boss-fall-*` | OK | — |
| 사건 | 장면 35 | `public/scenes/<사건>.png` | OK | — |
| 사건 | 오른쪽 위 대사 칸 | `.ws-say` — 이름표 글자만, 초상 없음 · 비대화 사건은 빈칸 | 없음 (후기 16) | PT-01~04 · DL-02 NPC 이름표 |
| 사건 | 결과 연출 | `evstage.ts` 카드 · 기물 FX (코드 입자) | 재작업 (후기 23) | EF-01~02 |
| 보상 · 상점 | 등급 테 · 딱지 | `kit/frame-rare · gold` 16칸 파랑/노랑 + CSS `.gtag` | 재발주 (후기 9) | RF-01~03 |
| 보상 · 상점 | 카드 앞면 | `cards/*.png` (cardart.py) | 재발주 (D-367 틀 → D-386 발주) | RF-04 |
| 분대 | 이형 분대 초상 | 없음 (영입 시 기물 아이콘) | 없음 | PT-08 |
| 킹 빌드 | 킹 카드 | `icons16/c.*` 일부 · 킹 전용 그림 없음 | 기획 대기 (후기 26) | KC-01 |
| 종막 | 도금왕 · 왕위 결정 | `boss-gilded(-1~4)` · `throne-mold` · `gilded-fallen` | OK | CI-08 (2단계) |
| 결말 | END-K | `crown-dais` · `casting-floor` · `gold-cast` · `promote-rule`(옛) | 컷 부족 · 마지막 컷 옛 그림 | ED-02~05 · CN-04~06 |
| 결말 | END-T | `gilded-fallen` · `crown-gears` · `white-land` ×2 | 같은 그림 반복 · 결정적 순간(던짐) 없음 | ED-06~08 |
| 결말 | 패배 END-F | `end-fail` 한 장(옛 272×140) | 재발주 · 컷 부족 | ED-09~11 |
| 결말 | 크레딧 | `credits-bg` (옛 293×146) · `credits.ts` | 재발주 | ED-12 |
| 결말 | 자막 · 레터박스 · 제목 카드 | 코드 띠 (`uikit.cutPages`) | 없음 (영화 같지 않음 — 후기 31) | ED-01 · CI-01 3번 |
| 장 | 왕관 2~4 시작 | `prologue-shadow` · `new-law` 공용 | 장마다 같은 그림 | CN-01~03 |

## 3. 배치별 계획

각 배치: 풀리는 후기 → 받기 전(지금) → 받으면 바꿀 코드 → 반입 단계(D-423) → 검수 화면(915×412 · DPR 2.625, `production/qa/evidence/asset-<배치>/`).
반입 공통: 받은 원본을 바이트 그대로 `build-res/order/<번호>-source.png`(또는 .webp)로 보관 → 도구 실행 → 원본 · 결과 SHA256 · 크기 · 알파를 `build-res/order/2026-11-14-<배치>.json`에 기록 → 수동 격자값은 `tools/pixel/scene_recipe.py`. 원본이 도트가 아니면 격자 맞춤으로 되돌리고, **프롬프트부터 고친다**(D-388). 받으면 발주 페이지가 그 상자를 「받음」으로 숨긴다(`order_page.py`가 `<번호>-source.*`를 본다).

### 1 · 2위 — 이형 P-01~05 · 거대 G-01~03 (P1)
- 풀림: D-482 · D-484 임시본, 21장 「판마다 다른 싸움」 그림.
- 지금: `BoardRenderer.makePiece` 황동 글자 딱지 · `GIANT_FILL` 바탕 기물 두 배 네 조각.
- **D-489 반입 완료**: P-01 · 02 · 03 · 05 · G-01~03 받음, P-04는 재발주(1차본 반입해 씀). 도구 `tools/pixel/piece_import.py`, 격자값 `tools/pixel/scene_recipe.py PIECE_GRID`.
- 받으면: 64×64(거대 128×128) 격자를 `tools/pixel/pieces64.txt`에 `[R:cannon 0]` `[R:cannon 1]` · `[N:camel …]` · `[Q:hopper …]` · `[B:archbishop …]` · `[R:chancellor …]` · `[P|R|Q:giant 1]` 블록으로 옮김 → `python3 -I tools/pixel/maker.py export` → `public/pieces/`. 대칭이 필요한 것은 `tools/pixel/symmetry.py`. 코드가 파일이 있으면 새 그림을 쓰므로 딱지 · 자르기 분기를 지우고(파일 없을 때 대비 분기만 남김) 거대 네 부위는 이음매 64도트 선으로 자른다.
- 검수: 이형 적 등장 판(`sliceApi.startAt`), 거대 주물 판(넷째 왕관 반장) — 48dp 칸에서 바탕 기물과 구분되는지, 흰 테 3칸 · 외곽선 공용인지.

### 3위 — 전장 대사 크롬 DL-01~02 (P1)
- 풀림: 후기 6(적 · 우리 · 시스템 대사 위치 · 형식 통일), 22(적 · 우리 같은 노랑 이름).
- 받으면: `ui_kit_import.py <원본> DL-01 200`(새 번호를 받도록 이름표 목록 추가) → `src/assets/ui/chrome/v2/talk-{foe,ally,sys,sys-warn}.png` · `name-*` · `portrait-*`. `main.ts`의 `makeTalk` · `talkAt`을 세 자리로 정리 — 적 = 판 오른쪽 위, 우리 = 판 왼쪽 아래, 시스템 = 판 위 가운데(`stateBand` 대체), 이름표 재질로 진영 구분(색 + 모양, 원칙 4). 컷신 화자 이름표(`uikit` 장면 대사)도 같은 `name-*`를 쓴다.
- 검수: 보통 대국 도발 · 반장 도발 · 합류 대사 · 경고 띠 4장면, 판 2줄을 가리지 않는지.

### 4위 — 전투 HUD HB-01~02 (P1)
- 풀림: 후기 7(턴 끝 버튼째 깜빡임), 8(속전 숫자 테 밖).
- 받으면: `#btn-end`를 상태 이미지 5벌로 — 경고는 `.warn` 때 테 띠 3프레임만 steps로 돌린다(단추 자체는 그대로). 속전 `#coins`는 하우징 9-slice 안 진공관 홈 + 고정 숫자 창(글자 12px 갈무리11, 창 안 여백 2도트). `kit/tube.png` → `tube-{lit,dim,flick,dead}`.
- 검수: 턴 끝 경고(행동 남김) · 적 차례 잠김 · 속전 1~6칸 · 나사 두 자리 숫자.

### 5위 — 등급 틀 RF-01~04 (P1 · 재발주)
- 풀림: 후기 9(외곽선 효과 유치), 14(등급이 눈에 보이게).
- 지금: `slice.css` `.part-card.g-rare::after` 16칸 테 + `.gtag` CSS 색 딱지 + `.g-pop`.
- 받으면: `frame-{common,rare,gold}` 9-slice(6도트 경계)로 교체, `.gtag` → `rank-tag-*` 이미지, 등장 연출은 `glint-*` 8프레임 띠를 steps(8)로 1회 재생(금 = 모서리 꺾쇠 덜컹 예비 → 터짐). 카드 앞면 `cards/cmd-*` 교체 시 `tools/pixel/cardart.py`는 그림 창 · 글자 배치만 맡고 틀은 받은 그림(56×84 → ×2 = 112×168).
- 검수: 보상 3장(일반 · 희귀 · 금) · 상점 · 덱 보기 · 작업대.

### 6위 — 반장 2단계 CI-01~08 (P1)
- 풀림: 후기 21.
- 받으면: `CI-01` → `p2-band`(3프레임 흐름) · `cutin-frame` · `letterbox`. 예고(`BOSS_PHASE_TEXT`) = 경보 띠가 판 위를 가로지름 + 반장 대사(DL 적 띠). 돌입(`battle.ts` 사건 `phase2` · `bossIntro({phase2})` · `gildedPhase2`) = 레터박스 닫힘 → 사선 액자 안 `boss-*-p2` 초상 컷인 → 화면 흔들림 → 열림(≤1.2초, `prefers-reduced-motion`이면 정지 컷). `BOSS_ART`에 `-p2` 짝을 더하고 파일 없으면 1단계 초상. `boss_avatars.py`로 `avatar-*-p2` 60×60 머리 자르기.
- 반입: `scene-import.py <원본> boss-plate-p2 CI-02` 등(정사각 초상, 비율 유지).
- 검수: 6반장 + 도금왕 2단계 돌입, 예고 띠.

### 7 · 8위 — 초상 PT-01~07 (P1)
- 풀림: 후기 16(비대화 사건 오른쪽 위 빈칸 → 종이왕 독백 초상으로 고민 멘트 통합), 6(보통 적 킹 · 적 기물 대사 얼굴).
- 받으면: 64칸 시트를 칸마다 잘라 `public/ui/portraits/<이름>.png`(새 도구 `tools/pixel/portrait_import.py` — `crew_faces.py`와 같은 격자 맞춤 · 마젠타 제거, 64×64 유지). `src/data/npcs.ts`에 사건 id → 초상 파일 표를 두고 `eventScreen`의 `.ws-say`에 DL-02 NPC 액자 + 초상, 비대화 사건(물건 사건 14종)은 `paperking-*` 표정 + 독백. `foeSay`는 보통 대국에서 막별 `king-a1~3` · 검문 `king-check`, 적 기물 대사가 생기면 `foe-*`(대사 문구 보강은 후기 6 별도 작업).
- 검수: 대화 사건(동전 나이트) · 비대화 사건(녹슨 금고) · 보통 대국 도발 · 검문 판.

### 9위 — 용어 아이콘 TI-01~02 (P1)
- 풀림: 후기 27(생명 ↔ 태엽 구분), 설문 Q6.
- 받으면: `tools/pixel/icon_sheets.py`에 `TI-01` · `TI-02` 4×2 시트 정의를 더하고(지금 도구는 5×2 — 칸 수 인자 추가) `icon_sheet_import.py <원본> TI-01` → `tools/pixel/icons32_ext/` → `icons16.py`로 `public/ui/icons16/*` (+@16). `hud.ts` 사전(`['생명', …]` 줄 등)과 HUD · 분대 칸이 새 키를 쓰게. 생명 = 덧판, 심장 톱니 = 진홍 톱니 — 모양이 다르다.
- 검수: 도움말 사전 · 분대 칸 생명 표지 · 태엽 계기 · 부적 칸.

### 10위 — 판돈 WG-01~02 (P1)
- 풀림: 후기 12.
- 받으면: `maybeBet` 창을 `win-scene` 장면 창(`wager-table`)으로 — 두 내기 = 선택지 판. 전투 중 HUD 오른쪽 레일에 `bet-active` 도는 동전(조건 · 현재 성공 여부 한 줄). 결과 = 대국 끝 결과 창에서 `bet-win` / `bet-lose` 프레임 + 나사 낱말 팝(D-398 박자). 등장 빈도 · 난이도 판단은 밸런스 단계(추가 지시 2)에서.
- 검수: 판돈 걸기 → 대국 중 표지 → 성공 · 실패 결과 3장면.

### 11위 — 사건 결과 FX EF-01~02 (P1)
- 풀림: 후기 23(쇳물 담금질 결과가 허접).
- 받으면: 프레임 띠 8장을 `src/assets/ui/fx/ev-*.png`로(새 도구 `tools/pixel/fx_sheet_import.py`: 격자 맞춤 → 프레임 자르기 → 마젠타 투명). `evstage.ts` `CardFx` · `CrewFx`의 `fx` 종류마다 띠를 실제 카드 · 기물 그림 위에 steps(8)로(D-260 — 결과는 실제 그림 위 FX). 담금질 = dipping · coldForge, 쇳물 = pact · castMold, 녹 = rustBath, 수리 = fieldMedic · tinker, 강화 = 다듬기, 파괴 = 녹임, 나사 = 지갑, 상자 = 부품 얻음.
- 검수: dipping · rustBath · fieldMedic · 상자 사건 결과.

### 12위 — 지도 MP-01~06 (P1, MP-02 재발주)
- 풀림: 후기 24(분대 현황 · 보강 생명과 실제 데이터 일치감).
- 받으면: `showMap`에 분대 현황판(왼쪽 아래, 분대원마다 초상 + HP 막대 + 생명 · 심장 톱니 표지 — 전투와 같은 값을 읽는다) · `placeBg('map-a1~4')`(cover, 초점 오른쪽) · 노드 아이콘 교체(`n.rest` · `n.here` 새로).
- 검수: 1공정 지도 · 다친 분대 · 쓰러진 분대 · 종막 지도.

### 13위 — 오프닝 OP-01~04 (P1)
- 풀림: 후기 1 · 2(흐름 · 그림 교체; 문장 줄바꿈은 글 작업으로 따로).
- 받으면: `script.ts PROLOGUE`에 `op-windup`(PRO-01 뒤) · `op-legend`(PRO-04 뒤) 컷을 끼우고 PRO-01-2 · 04-4~5 줄을 그 컷으로 옮긴다. `prologue-04` · `prologue-07`은 같은 이름으로 교체(원본은 `build-res/order`에 이미 있으므로 덮지 않고 새 `OP-0N-source`로 보관).
- 반입: `scene-import.py <원본> op-windup OP-01` 등.
- 검수: 프롤로그 전체 넘김(★ 짧은 판 포함).

### 14위 — 엔딩 영화화 ED-01~12 (P1)
- 풀림: 후기 31(장면 · 영화 같은 연출 · 화자 구분).
- 받으면: `ED-01` 자막 판 · 제목 카드 · 왕관 문장 · 화자 표지 → `uikit.cutPages`/`playCuts`에 레터박스(CI-01) + 자막 판 + 화자 표지(서술 · 독백 · 대사 구분). 결말 시작에 장 제목 카드(「첫째 왕관」 + 문장). `promotionCuts`: crown-dais → **end-k-sight** → casting-floor → **end-k-reach** → gold-cast → **crown-N-throne**(CN) → **end-k-lock** → **law-plate**(`promote-rule` 대체). `trueEndingCuts`: gilded-fallen → **end-t-throw** → crown-gears → **end-t-silence** → white-land → **end-t-step** → 크레딧. `DEFEAT`: end-fail(재발주) → **end-f-box** → **end-f-unwind**. 「돌아본다」에서 글이 끊기는 문제는 코드 작업(장면 · 글 넘김 정리)으로 같이.
- 검수: 첫째 왕관 END-K · 넷째 왕관 END-T · 패배 · 크레딧 롤.

### 15 · 16위 — 왕관 시작 · 끝 CN-01~06 · 막 카드 AC-01~03 (P2)
- 받으면: `shadowCut(ch)`가 장마다 `crown-N-open`, `promotionCuts` 셋째 컷 뒤 `crown-N-throne`(장 0~2). `ACT_CARD`의 act-1 · 2 · 4 교체(같은 이름).
- 검수: 둘째 · 셋째 · 넷째 왕관 시작, 1 · 2 · 4막 입구.

### 17위 — 공정 판 칸 PB-01 (P2)
- 받으면: `fx_sheet_import.py`(칸 20×20, 4도트 간격)로 `public/ui/board/proc-*.png` → `tools/gen-preload.cjs` 재생성 → `BoardRenderer` 공정 칸이 빌린 `variant-*` 대신 `proc-*`(컨베이어 4프레임 · 프레스 예고/타격 · 자석 레일/기둥 · 용광로 식음/달음 · 금 1~3).
- 검수: 공정 판 다섯(`sliceApi` 공정 판 시드).

### 18위 — 로딩 · 안내서 LD-01~02 (P2)
- 받으면: `warmup.ts` 로딩 화면 = `loading-bench` 바탕 + 안내서 캡처 한 장(`public/guide/*`, `tools/guide-capture.cjs`로 갱신) + 팁 쪽지 + 톱니 8프레임. `opening.ts` 안내서 사이사이에도 같은 액자.
- 검수: 첫 실행 로딩 · 이어하기 로딩 · 안내서.

### 19위 — 이형 분대 초상 PT-08 (P2)
- 받으면: `crew_faces.py` 방식으로 56×56 `hud/crew-{form}.png`(지금 규격에 맞춰 축소 대신 64 → 56 가장자리 잘라내기, 비율 유지), `crewSay`가 이형이면 그 얼굴.

### 20위 — 킹 카드 KC-01 (P3)
- 후기 26 킹 빌드 기획(카드 이름 · 효과 · DECISIONS)을 먼저 정하고, 이름이 바뀌면 KC-01 프롬프트의 8줄을 고쳐 발주한다.

## 4. 받기 전에 할 수 있는 코드 정리 (그림 없이)

- 대사 세 자리 통일 · 턴 끝 경고를 테 띠로 · 속전 창 고정 · 2단계 레터박스 흐름은 지금 크롬(`chrome/v2`)을 빌려 먼저 짠다(D-386 「받기 전에는 이미 있는 에셋을 빌린다」). 그림이 오면 파일만 바꾼다.
- 파일이 있으면 새 그림, 없으면 대체 — `scene` 컷의 `alt` 방식(S-13~S-20과 같은 방식)을 새 컷 · 초상에도 쓴다.

## 5. 도구 메모

- `tools/order/order_page.py`: §0-D(`## N위 · [P*] …` + `## <번호> · …`)를 읽는다. 머리에 파일 이름이 없는 상자는 `build-res/order/<번호>-source.(png|webp)`가 있으면 「받음」. 옛 16위 카드 틀 건너뛰기는 머리에 「카드 앞뒷면」이 있을 때만.
- 새로 필요한 반입 도구(그림 도착 때 만든다): `portrait_import.py`(64 초상 시트) · `fx_sheet_import.py`(프레임 띠 · 판 칸) · `icon_sheets.py` 4×2 정의 · `ui_kit_import.py`의 새 번호 이름표.
