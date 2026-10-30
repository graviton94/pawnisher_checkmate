# 에셋 발주서 v2 — Gemini 나노바나나용

> v1(2026-10-30 오전)은 폐기. A1을 받아 넣어 보니 **도트 크기가 기물과 달라** 판이 엉망이 됐다 (D-041).
> v2의 핵심: **모든 판 위 그림을 기물과 같은 도트 크기로**, 그리고 **매 시트 1번 칸에 기준 폰을 같이 그리게** 해서 크기가 맞는지 바로 보이게 한다.

## 0. 쓰는 법

1. **매번 첨부 2장**: `build-res/pieces-small-source.png`(기물 도트) · `build-res/icon-source.png`(앱 아이콘).
2. **아래 회색 상자 하나 = 한 번 생성.** 통째로 복사해 붙여넣는다. 상자마다 공통 규칙이 다 들어 있다.
3. **1번 칸의 기준 폰을 먼저 본다.** 첨부한 흰 폰과 크기·도트 굵기가 같으면 합격, 다르면 같은 프롬프트로 다시 뽑는다. 기준 폰보다 도트가 가늘거나 굵은 시트는 쓰지 않는다.
4. 받은 그림은 `build-res/order/<시트ID>.png`로 넣어 주면 개발 측이 자른다 (`tools/slice-sheet.py` — 기준 폰으로 도트 크기를 재고, 마젠타·번짐·워터마크를 지운다).
5. 받은 시트는 **게임에 바로 넣지 않는다.** FX 랩에서 지금 화면과 나란히 보여 드리고, 판 위 그림(B1~B6)이 **다 모이면 한꺼번에** 바꾼다.

## 1. 도트 규격 (모든 판 위 그림의 기준)

| 항목 | 규격 |
| :--- | :--- |
| 기준 | 첨부한 기물 도트와 **같은 도트 크기** — 기물 하나가 약 16도트 높이 |
| 판 칸 1개 | **20 × 20 도트** |
| 테두리 | 기물처럼 **바깥 1도트 검정 + 그 바깥 1도트 흰색** (판 칸·덧칠 그림은 테두리 없음) |
| 색 | 아래 14색만. 그라데이션·반투명·흐림 없음 |
| 배경 | 마젠타 #FF00FF. **그림 전체의 아래 15%와 오른쪽 10%는 비워 둔다** (제미나이 워터마크 자리) |

### 팔레트 (14색)
`#0B0B0E` 검정 · `#16141C` 먹색 · `#2F2E36` 어두운 철 · `#56545E` 밝은 철 · `#8A8794` 회색 · `#C8C8C8` 밝은 회색 · `#F4F1EA` 백자 흰색 · `#8C6239` 어두운 황동 · `#C89B3C` 황동 · `#FACC15` 금색 · `#7A1218` 어두운 진홍 · `#E5262F` 진홍 · `#38BDF8` 청록 · `#BFEFFF` 증기 흰청록

### 우선순위
| 순서 | 시트 | 내용 | 이유 |
| :-: | :--- | :--- | :--- |
| 1 | **S0** | 크기 시험 | 도트 크기가 맞는지 먼저 확인 |
| 2 | **B1~B6** | 판 칸 · 발밑 · 과녁 · 화살표 · HP · 분출구 | 판 위 벡터 도형 전부 — 한꺼번에 바꾼다 |
| 3 | B7 · H · I | 지형 · 종이 왕관 킹 · 태엽 | 판 분위기 · 주인공 · AP |
| 4 | F · G | 아이콘 문양 · UI 프레임 | 판 밖 화면 |
| (보류) | E | 공격 이펙트 | 지금은 코드 도트 이펙트로 확정 (FX 랩). 필요해지면 발주 |

---

## S0. 크기 시험 (가장 먼저, 4칸)

```
Pixel art scale test for a steampunk chess-factory game. The attached image shows the chess piece sprites: copy their exact pixel size, outline style and palette.

GRID RULE: a board square is exactly 20x20 pixels; a chess piece is about 16 pixels tall, exactly like the attached pieces. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 4 equal cells in one row, lots of magenta space between cells, each item centered in its cell, all items drawn at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly, same size, same pixels.
Cell 2: one board square, 20x20 pixels, riveted pale iron plate (#56545E with #8A8794 rivets in the 4 corners), fills the square edge to edge, no outline.
Cell 3: one board square, 20x20 pixels, riveted dark iron plate (#2F2E36 with #56545E rivets), same design, no outline.
Cell 4: the white pawn from cell 1 standing on the square from cell 2, with a thin flat white-porcelain oval base ring (14x4 pixels) under its feet.
```

---

## B. 판 위 그림 (한 세트로 바꾼다)

### B1. 판 칸 6종

```
Pixel art board tiles for a steampunk chess-factory game. Copy the exact pixel size and style of the attached chess pieces.

GRID RULE: a board square is exactly 20x20 pixels; a chess piece is about 16 pixels tall, exactly like the attached pieces. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 7 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: light square 20x20 — pale riveted iron plate, rivet in each corner, fills edge to edge, no outline.
Cell 3: dark square 20x20 — dark riveted iron plate, same design, no outline.
Cell 4: fallen square 20x20 — the plate is gone: black pit with two dark gear teeth and a faint crimson glow at the bottom.
Cell 5: crack warning overlay 20x20 — only thin crimson hot cracks (#E5262F) on magenta, nothing else.
Cell 6: attack-range overlay 20x20 — a crimson riveted frame 1 pixel thick around the square edge with 4 small crimson corner bolts, center left magenta.
Cell 7: threat overlay 20x20 — diagonal crimson hatch lines every 4 pixels, center otherwise magenta.
```

### B2. 발밑·선택·이동 5종

```
Pixel art board markers for a steampunk chess-factory game. Copy the exact pixel size and style of the attached chess pieces.

GRID RULE: a board square is exactly 20x20 pixels; a chess piece is about 16 pixels tall, exactly like the attached pieces. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 6 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: ally base — a flat oval ring 14 pixels wide and 4 pixels tall, white porcelain (#F4F1EA) with a 1-pixel cyan (#38BDF8) lower edge, hollow center. Nothing above it.
Cell 3: enemy base — a flat diamond ring 14 pixels wide and 4 pixels tall, black iron (#16141C) with a 1-pixel crimson (#E5262F) lower edge, hollow center.
Cell 4: selection frame — four small brass L-shaped corner brackets (each 4x4 pixels) at the corners of a 20x20 square, empty center. Thin, must not cover a piece standing inside.
Cell 5: move marker — a tiny cyan steam dot, 4x4 pixels, with a 1-pixel white highlight.
Cell 6: planned-move marker — a thin cyan ring 8x8 pixels, hollow.
```

### B3. 과녁·순번·처치 5종

```
Pixel art board markers for a steampunk chess-factory game. Copy the exact pixel size and style of the attached chess pieces.

GRID RULE: a board square is exactly 20x20 pixels; a chess piece is about 16 pixels tall, exactly like the attached pieces. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 6 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: attack target — a crimson gear ring 12x12 pixels with 8 short teeth, 1 pixel thick, hollow center.
Cell 3: kill target — the same gear ring in gold (#FACC15) with a tiny 4x4 skull in the center.
Cell 4: order badge — a round brass gear token 9x9 pixels with a flat dark center plate 5x5 (#16141C) where a white number will be printed later. No number.
Cell 5: enemy order badge — the same token in black iron with a crimson rim, dark center plate. No number.
Cell 6: kill mark — a small crimson X made of two bolts, 6x6 pixels, with a black 1-pixel outline.
```

### B4. 화살표 조각 7종 (흰색만 — 색은 코드가 입힌다)

```
Pixel art arrow pieces for showing chess moves on a 20x20-pixel board square, steampunk chess-factory style (a line of tiny rivets).
Copy the exact pixel size of the attached chess pieces. Draw ONLY in #F4F1EA and #C8C8C8 — color is added later by code.

GRID RULE: every piece is drawn inside a 20x20-pixel square. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 8 equal cells in one row, lots of magenta space between cells; in each cell draw a faint 20x20 square guide in #8A8794 so the square edges are visible.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: straight segment — 2 pixels thick, horizontal, from the left edge to the right edge of the 20x20 square, rivets every 4 pixels.
Cell 3: diagonal segment — 2 pixels thick, from the bottom-left corner to the top-right corner.
Cell 4: corner — enters from the left edge, turns 90 degrees, exits the top edge (for knight moves).
Cell 5: arrow head pointing right — a 6x6 chevron touching the right edge.
Cell 6: arrow head pointing up-right diagonally.
Cell 7: start mark — a hollow 6x6 rivet ring in the center.
Cell 8: knight hop arc — a small arch from the left edge to the right edge.
```

### B5. HP 게이지·상태 8종 (흰·회색만)

```
Pixel art health gauge parts for chess pieces in a steampunk chess-factory game: a tiny pressure tube under each piece.
Copy the exact pixel size of the attached chess pieces. Draw ONLY in #F4F1EA #C8C8C8 #8A8794 #16141C — color is added later by code.

GRID RULE: the full gauge is 14 pixels wide and 3 pixels tall. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text, no numbers.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 9 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: gauge left cap — 2x3 pixels, dark (#16141C) with a light rivet pixel.
Cell 3: gauge middle — 1x3 pixels empty tube (dark), tileable.
Cell 4: gauge right cap — 2x3 pixels.
Cell 5: gauge fill — 1x1 pixel solid #F4F1EA (fits inside the tube), tileable.
Cell 6: shield strip — 1x1 pixel #C8C8C8 riveted plate strip that sits on top of the gauge, tileable.
Cell 7: check ring — a broken gear ring 18x18 pixels with a small steam puff from one gap.
Cell 8: wreck marker — a tiny pile of broken gears and a spring, 8x6 pixels.
Cell 9: damage tag — a small 7x5 tag with a pin hole, empty center (a number goes on it later).
```

### B6. 증기 분출구 (요충지) 4종

```
Pixel art steam vent that opens in a board square of a steampunk chess-factory game (a capture point).
Copy the exact pixel size and style of the attached chess pieces.

GRID RULE: a board square is exactly 20x20 pixels. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 5 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: vent closed — a round brass hatch (14x14) set into a dark iron 20x20 square, a tiny pressure gauge on its rim.
Cell 3: vent opening — the hatch split in two halves, a little steam leaking.
Cell 4: vent open — the hatch fully open, a column of steam (#BFEFFF and #F4F1EA) rising 10 pixels above the square.
Cell 5: hold counter pip — a tiny round gauge light 3x3 pixels in #C8C8C8 (color added by code).
```

### B7. 지형 소품 5종

```
Pixel art terrain props that stand on a board square of a steampunk chess-factory game. Copy the exact pixel size, outline style (1 black + 1 white outline) and palette of the attached chess pieces.

GRID RULE: a board square is exactly 20x20 pixels; props are at most 16 pixels tall. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 6 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: scrap heap — pipes, plates and a broken gear piled up.
Cell 3: lift platform — a raised brass platform on a short piston.
Cell 4: heat shield — an upright riveted iron plate with a small vent.
Cell 5: gear trap — an open toothed trap set into the floor, crimson teeth.
Cell 6: screw box — a small brass box with steel screws spilling out.
```

---

## H. 주인공 — 종이 왕관 킹 2종

```
Pixel art sprites for the hero of a steampunk chess-factory game: a white pawn that wears a paper crown cut out of a cardboard box and plays the king.
Copy the exact pixel size, outline style (1 black + 1 white outline) and palette of the attached chess pieces.

GRID RULE: the pawn is about 16 pixels tall exactly like the attached pawn; the crown adds about 5 pixels on top. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 3 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: the same white pawn wearing a paper crown: cardboard brown (#8C6239 / #C89B3C), rough zigzag top with 3 points, slightly too big and tilted to one side. The crown must make it clearly different from a normal pawn at a glance.
Cell 3: the paper crown alone (no pawn), same pixels as in cell 2.
```

## I. 태엽 (AP) 3종 — 지금의 날개 그림 대체

```
Pixel art action-point icons for a steampunk chess-factory game: a butterfly-shaped wind-up key (the key used to wind clockwork toys), side view, standing upright.
Copy the exact pixel size, outline style (1 black + 1 white outline) and palette of the attached chess pieces.

GRID RULE: each key is 12 pixels wide and 16 pixels tall. Every pixel is a crisp solid square block. No anti-aliasing, no blur, no gradients, no transparency, no text, no numbers.
PALETTE (use only these): #0B0B0E #16141C #2F2E36 #56545E #8A8794 #C8C8C8 #F4F1EA #8C6239 #C89B3C #FACC15 #7A1218 #E5262F #38BDF8 #BFEFFF.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 4 equal cells in one row, lots of magenta space between cells, each item centered, all at the same pixel size.

Cell 1: REFERENCE — copy the white pawn from the attached image exactly.
Cell 2: full — polished brass key (#C89B3C, #FACC15 highlights), one cyan glint pixel.
Cell 3: spent — the same key in dull iron (#56545E, #8A8794), no glint.
Cell 4: bonus — the brass key with a 1-pixel gold ring around it.
```

---

## F. 아이콘 문양 (판 밖 화면용) — 흰색 한 가지, 4장

> 판 위가 아니라 카드·개조·맵 노드에 쓰는 아이콘. 코드가 색·테두리를 입힌다. 아이콘끼리 **16 × 16 도트**로 통일.

### F1. 공격·수비 (8)

```
Pixel art icon sheet for a steampunk chess-factory game. Pure white single-color silhouettes.

GRID RULE: each icon is drawn on a 16x16 pixel grid with a 1-pixel empty margin. Every pixel is a crisp solid square block. Draw ONLY pure white #FFFFFF pixels. No outline, no shading, no second color, no anti-aliasing, no blur, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 8 equal cells in one row, lots of magenta space between cells, each icon centered, all at the same pixel size.

Icons: 1 sword blade, 2 arrow piercing through a ring, 3 forked double arrow, 4 shock wave arcs, 5 hot crack / flame, 6 shield, 7 stacked wall bricks, 8 chain link.
```

### F2. 생명·이동 (8)

```
Pixel art icon sheet for a steampunk chess-factory game. Pure white single-color silhouettes.

GRID RULE: each icon is drawn on a 16x16 pixel grid with a 1-pixel empty margin. Every pixel is a crisp solid square block. Draw ONLY pure white #FFFFFF pixels. No outline, no shading, no second color, no anti-aliasing, no blur, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 8 equal cells in one row, lots of magenta space between cells, each icon centered, all at the same pixel size.

Icons: 1 oil drop, 2 skull made of a gear, 3 horseshoe with a piston, 4 swirl portal door, 5 two curved swap arrows, 6 banner flag, 7 grabber claw, 8 wind-up key.
```

### F3. 장치·규칙 (8)

```
Pixel art icon sheet for a steampunk chess-factory game. Pure white single-color silhouettes.

GRID RULE: each icon is drawn on a 16x16 pixel grid with a 1-pixel empty margin. Every pixel is a crisp solid square block. Draw ONLY pure white #FFFFFF pixels. No outline, no shading, no second color, no anti-aliasing, no blur, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 8 equal cells in one row, lots of magenta space between cells, each icon centered, all at the same pixel size.

Icons: 1 pocket watch, 2 bell, 3 small paper crown, 4 four-point star, 5 eye with a lens rim, 6 balance scale, 7 target reticle, 8 punched paper card.
```

### F4. 맵 노드 (6)

```
Pixel art icon sheet for map nodes of a steampunk chess-factory game. Pure white single-color silhouettes.

GRID RULE: each icon is drawn on a 16x16 pixel grid with a 1-pixel empty margin. Every pixel is a crisp solid square block. Draw ONLY pure white #FFFFFF pixels. No outline, no shading, no second color, no anti-aliasing, no blur, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 6 equal cells in one row, lots of magenta space between cells, each icon centered, all at the same pixel size.

Icons: 1 hammer on anvil (workshop), 2 screw (shop / currency), 3 question mark bent like a pipe (event), 4 parts crate (storeroom), 5 wrench (repair station), 6 slot-machine lever (fortune machine).
```

## G. UI 프레임 6종 — 회색 4단계, 9-slice

```
Pixel art UI frames for a steampunk chess-factory game, used as 9-slice panels (corners stay fixed, edges stretch).

GRID RULE: each frame is 24x24 pixels with a 3-pixel border; square corners. Every pixel is a crisp solid square block. Use ONLY #1A1A1A #4A4A4A #8A8A8A #D0D0D0 (color is added later by code). No anti-aliasing, no blur, no gradients, no transparency, no text.
BACKGROUND: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta.
LAYOUT: 6 equal cells in one row, lots of magenta space between cells, each frame centered, all at the same pixel size; the frame center is flat #4A4A4A.

1 panel: riveted iron frame, a rivet in each corner.
2 button normal: thick plate with a 2-pixel hard drop shadow at the bottom.
3 button pressed: the same plate pushed down, no shadow.
4 iron card frame: 18x24, riveted border, 3 punched holes along the top.
5 paper card frame: 18x24, torn paper edge, 3 punched holes along the top.
6 empty slot: thin recessed socket border.
```

---

## E. 공격 이펙트 — 보류
지금은 코드로 그리는 도트 이펙트를 확정해 쓰고 있다 (FX 랩, `src/view/attackFx.ts`). 스프라이트가 필요해지면 B 시트와 같은 규칙(20×20 칸 · 14색 · 기준 폰)으로 다시 쓴다.

## 받은 뒤 개발 측이 하는 일
1. 1번 칸 기준 폰으로 도트 크기를 재고 첨부 폰과 같은지 확인 → 다르면 다시 요청.
2. 마젠타·번짐·워터마크 제거 → 원래 도트로 축소 (`tools/slice-sheet.py`).
3. B1~B6가 다 모이면 FX 랩에 **지금 화면 / 바뀐 화면**을 나란히 올려 확인받는다.
4. 확인되면 판 위 그림을 한꺼번에 교체하고, 코드 이펙트의 도트 크기도 같은 격자(칸당 20도트)로 맞춘다.
