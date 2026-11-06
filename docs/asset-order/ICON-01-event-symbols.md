# 발주 ICON-01 — 사건 미니게임 기호 시트 한 장 (D-254)

> 쓰는 곳: 조립 판정기(옛 슬롯 — 세 칸에 기호가 떨어져 짝이 맞는지) · 녹슨 봉인판 긁기(옛 복권 — 녹 아래 각인 셋) · 동전 나이트 코인토스.
> 피하는 것(심의, D-254): 카지노 · 도박 기구의 기호 — 7 · BAR · 과일 · 카드 무늬 · 클로버 · 편자 · 달러 동전 · 종 · 다이아몬드 · 「잭팟」 글자. 전부 공장 · 체스 세계의 물건으로.

## 받는 형식
| 항목 | 값 |
|---|---|
| 한 장 | 가로 6칸 × 세로 4칸 = 24칸 격자, 칸마다 기호 하나 가운데 |
| 칸 크기 | 64×64 px (기호는 그 안 48×48 안쪽, 1도트 = 1px 원본 · 확대하지 말 것) |
| 바탕 | 순검정 #000000 한 색 (보내 준 참고 시트처럼) · 칸 사이 경계선 · 격자선 없음 |
| 문법 | 1px 어두운 테(#16141C) · 단계 색 3~4단(섞지 않음) · 빛은 왼쪽 위 · 반투명 · 그라데이션 · 흐림 · 글자 없음 |
| 색 | 우리 팔레트 중심: 황동 #C89B3C · 금 #FACC15 · 철 #56545E/#8A8794 · 백자 #F4F1EA · 진홍 #E5262F · 청록 #38BDF8 · 녹 갈색 |

## 24칸 (줄 순서대로)
1줄 — 짝 맞추기 기호 (보통 · 자주 나옴)
1. 황동 톱니 (이 8개, 가운데 구멍)
2. 은빛 볼트와 너트 (나란히)
3. 감긴 쇠 스프링
4. 태엽 열쇠 (나비 손잡이)
5. 쇠 렌즈 (둥근 테 안 청록 유리)
6. 작은 성벽 탑 (룩 꼭대기 모양)

2줄 — 짝 맞추기 기호 (희귀 · 좋음)
7. 금 톱니 (1번의 금빛 판, 반짝 하나)
8. 나이트 머리 각인 (황동 메달)
9. 폰 머리 각인 (황동 메달)
10. 종이 왕관 (접힌 종이, 끝이 셋)
11. 금 왕관 (도금, 붉은 보석 하나)
12. 청록 증기 밸브 (둥근 손잡이)

3줄 — 꽝 · 불량 (짝이 맞으면 나쁨)
13. 금 간 회색 톱니
14. 녹 덩어리 (갈색 혹, 부스러기 둘)
15. 붉은 「불량」 도장 자국 (글자 없이 X 무늬 사각 도장)
16. 끊어진 체인 (두 토막)
17. 부러진 나사
18. 연기 뿜는 작은 화로 (꽝 연출용)

4줄 — 동전 · 봉인판
19. 동전 앞면 — 나이트 머리 새김 (황동, 정면 원)
20. 동전 비스듬 — 테 두께가 보이는 타원 (오른쪽에 줄무늬 두께)
21. 동전 옆면 — 세로 막대, 가로 줄무늬
22. 동전 뒷면 — 톱니 새김 (조금 어두운 황동)
23. 녹슨 봉인판 빈 각인 칸 (네모 철판 안 움푹한 칸 — 긁기 전 녹이 덮일 자리, 녹은 화면이 그린다)
24. 봉인판 테두리 조각 (리벳 박힌 쇠 모서리 — 판을 이어 붙일 9조각 중 모서리 하나)

## 프롬프트 (그대로 붙여 넣기)
```
Pixel art sprite sheet, 6 columns x 4 rows grid of 24 game icons on a pure black (#000000) background,
each icon centered in its own 64x64 pixel cell, icon size about 48x48 pixels, no grid lines, no text, no letters, no numbers.
Crisp 1-pixel dark outline, flat hard-edged color steps (3-4 shades per material), light from the top-left, no gradients, no blur, no transparency, no anti-aliasing.
Theme: a dark steampunk chess-piece factory. Palette: brass, gold, steel grey, ivory white, crimson red, teal, rust brown.
Row 1 (common parts): brass gear with 8 teeth; silver bolt and nut; coiled iron spring; wind-up key with butterfly handle; iron-rimmed lens with teal glass; small castle-tower top (chess rook crown).
Row 2 (rare parts): golden gear with one sparkle; brass medal engraved with a chess knight head; brass medal engraved with a chess pawn head; folded paper crown with three points; gilded crown with one red jewel; teal steam valve wheel.
Row 3 (failures): cracked grey gear; lump of rust with two crumbs; red reject stamp mark (square with an X, no letters); broken chain in two pieces; snapped screw; tiny stove puffing smoke.
Row 4 (coin and seal plate): brass coin front with an engraved knight head; same coin tilted showing an oval face and striped rim thickness on the right; same coin seen edge-on as a vertical bar with horizontal stripes; coin back engraved with a gear, slightly darker brass; square rusty iron plate with an empty recessed slot; riveted iron corner piece of a frame.
No casino or gambling symbols: no sevens, no BAR, no fruit, no card suits, no clovers, no horseshoes, no dollar signs, no bells, no diamonds.
```

## 받은 뒤
- `build-res/order/ICON-01-event-symbols-source.png`로 두면 `tools/pixel/sheet-slice.py`(받으면 만든다)가 검은 바탕에서 칸마다 잘라 `public/ui/props/sym-*.png`로 낸다 (칸 자동 찾기 · 격자 정렬 · 마젠타 없이 검정 키).
