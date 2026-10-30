# 에셋 발주서 — Gemini 나노바나나용

> 세계관: `docs/world.md` v2 (태엽 자동인형 체스) 기준. 무엇을 조합하고 무엇을 그리는지: `docs/art-assets.md`.
> 각 시트의 **회색 상자(코드 블록)를 통째로 복사해 붙여넣으면** 된다. 프롬프트는 영어가 결과가 안정적이라 영어로 썼다.

## 0. 쓰는 법 (먼저 읽기)

1. **첨부 이미지**: 모든 시트에 아래 2장을 같이 첨부한다 (스타일 맞추기용).
   - `build-res/pieces-small-source.png` (기물 도트)
   - `build-res/icon-source.png` (앱 아이콘 — 흑·백·붉은 톤)
2. **S0 스타일 시험 시트를 먼저** 뽑는다. ✅ 2026-10-30 통과 — 그 결과 그림을 이후 모든 시트에 세 번째로 첨부한다. 마음에 드는 결과 1장을 고르면, 이후 시트마다 그 결과도 **세 번째 첨부**로 넣는다 → 시트끼리 화풍이 맞는다.
3. **배경은 마젠타(#FF00FF)**, 그리고 **그림 아래 15%·오른쪽 10%는 비워 둔다** — 제미나이 워터마크(오른쪽 아래 별)가 그 자리에 찍힌다 (2026-10-30 A1에서 확인). 모든 프롬프트에 문구를 넣었다. 그래도 겹치면 잘라 내기 도구가 워터마크를 지운다. 나노바나나는 "투명 배경"을 요청하면 체크무늬를 그려 넣는 경우가 많다. 마젠타는 코드가 지운다.
4. **도트 크기**: 프롬프트마다 "32×32 도트를 8배 확대" 식으로 써 두었다. 결과가 흐리거나 칸이 어긋나면 같은 프롬프트로 다시 뽑는다 (보통 2~4번 안에 나온다).
5. **흰색·회색으로만** 그리라고 한 시트(화살표·게이지·이펙트·문양)는 코드가 진영 색(아군 청록/황동, 적 붉은색)을 입힌다. 색을 넣어 오면 그대로 못 쓴다.
6. 받은 그림은 `build-res/order/<시트ID>.png`로 넣어 주면 개발 측이 잘라서 연결한다: `python3 -I tools/slice-sheet.py <시트> <열> <행> <출력> <이름…> [--dot N]` (마젠타·분홍 번짐·워터마크 제거 → 원래 도트로 축소).
7. 한 장에 너무 많이 넣으면 망가진다. 시트당 4~8개로 나눠 두었다.

### 스타일 시험에서 나온 보정 (아래 프롬프트에 반영됨)
- 결과: 도트 간격이 고르다 (칸당 약 48도트) → 원래 해상도로 깨끗이 줄일 수 있다. 가장자리에 분홍빛 번짐이 약간(1% 미만) — 잘라 낼 때 지운다.
- **판 칸은 흰 바깥 테두리 없이** 칸 끝까지 꽉 채운다 (이어 붙이는 타일이라서). 흰 테두리는 기물·소품·아이콘에만.
- **발밑 받침에는 증기를 넣지 않는다** — 기물을 가린다. 증기는 이펙트 시트(E7)에서 따로.
- 가장자리 번짐 줄이기: 프롬프트마다 *"no pink or magenta tint on sprite edges"* 추가.

### 공통 규칙 (모든 프롬프트에 이미 들어 있음)
pixel art · hard square pixels · no anti-aliasing · no blur · no gradients · no text · no numbers · solid magenta #FF00FF background · evenly spaced grid · each sprite centered in its cell · gothic clockwork steampunk chess

---

## S0. 스타일 시험 (가장 먼저)

```
Pixel art style test sheet for a gothic clockwork steampunk chess game. Match the attached chess piece sprites exactly: chunky 16x16-style pixels, thick white outline around dark shapes, black/white/crimson palette with brass accents.
Layout: 4 columns x 1 row, each cell 256x256 px, each sprite drawn on a 32x32 pixel grid scaled up 8x so every pixel is a crisp square block.
Background: solid flat magenta #FF00FF everywhere outside the sprites. No checkerboard, no shadows on the background. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Cells, left to right:
1. A riveted dark iron floor tile, square, with a thin brass edge.
2. A small steel screw with a brass head, lying slightly tilted (the game's currency).
3. A white porcelain ring base that a chess piece stands on, seen slightly from above (flat ellipse), with a faint cyan steam glow.
4. A crimson targeting reticle made of a gear ring with four inward teeth.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no numbers, no pink or magenta tint on sprite edges.
```

---

## A. 보드 표식 (지금의 매끈한 벡터 도형 대체)

### A1. 발밑·선택·과녁 — 8개, 색 있음 ✅ 받음·게임 적용 (2026-10-30, `public/ui/marks/`)

```
Pixel art sprite sheet for a gothic clockwork steampunk chess game, matching the attached piece sprites and style reference.
Layout: 4 columns x 2 rows, each cell 256x256 px, each sprite on a 32x32 pixel grid scaled 8x (crisp square pixels).
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Row 1:
1. Ally base: flat elliptical ring under a chess piece, white porcelain with a thin cyan (#38BDF8) rim light, empty center. NO steam, nothing rising above the ring (it must not cover the piece).
2. Enemy base: flat diamond-shaped ring under a chess piece, black iron with a thin crimson (#E5262F) glow, empty center.
3. Selection frame: four brass corner brackets forming a square tile border, cyan glowing rivets on each corner, empty center.
4. Move marker: a small round cyan steam puff dot with a brass rivet center (small, about 8x8 pixels inside the 32x32 cell).
Row 2:
5. Attack target: crimson gear-ring reticle with four inward teeth, empty center.
6. Kill target: same reticle in gold (#FACC15) with a tiny skull-shaped gear in the center.
7. Order badge: round brass gear token with a flat empty center plate (a number will be printed on it later by code).
8. Enemy order badge: round black iron gear token with crimson rim and flat empty center plate.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no numbers, no pink or magenta tint on sprite edges.
```

### A2. 화살표 조각 — 7개, 흰색만

```
Pixel art tile pieces for drawing movement arrows on a chess board, gothic clockwork steampunk style (a line of small brass rivets / chain links).
Draw ONLY in white and light gray (#FFFFFF, #C8C8C8) — color will be added later by code.
Layout: 4 columns x 2 rows, each cell 256x256 px, each piece on a 16x16 pixel grid scaled 16x (crisp square pixels). Every piece must touch the cell edges exactly where it connects so pieces tile seamlessly.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Straight segment, horizontal, crossing the cell from left edge to right edge, 3 pixels thick.
2. Diagonal segment, from bottom-left corner to top-right corner, 3 pixels thick.
3. Corner segment: enters from the left edge, turns 90 degrees, exits through the top edge.
4. Arrow head pointing right (flat chevron, 3 pixels thick lines), tip touching the right edge.
5. Arrow head pointing up-right diagonally.
6. Start cap: a small hollow ring (where the move begins).
7. Knight hop: a small arc bump to show a jump, left edge to right edge.
8. Empty cell (leave magenta).
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### A3. 게이지·상태 — 8개, 흰색만

```
Pixel art UI parts for a health gauge under chess pieces, styled as a tiny brass pressure tube, gothic clockwork steampunk.
Draw ONLY in white, light gray and dark gray (#FFFFFF, #C8C8C8, #505050, #1A1A1A) — color will be added later by code.
Layout: 4 columns x 2 rows, each cell 256x256 px, each part on a 16x16 pixel grid scaled 16x.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Gauge left end cap (rounded tube end with a rivet), 4 pixels tall, touching the right cell edge.
2. Gauge middle section (empty glass tube), 4 pixels tall, touching left and right edges, tileable.
3. Gauge right end cap, touching the left cell edge.
4. Gauge fill block (solid, 2 pixels tall, fits inside the tube), tileable horizontally.
5. Shield plate: a thin riveted metal plate strip that sits on top of the gauge, tileable.
6. Check ring: a thick broken gear ring with steam venting from one gap, 16x16.
7. Damage chip background: small rounded tag with a pin, empty center (a number goes on it later).
8. Wreck marker: a small pile of broken gears and a spring, top-down, 16x16.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no numbers, no pink or magenta tint on sprite edges.
```

---

## D. 판·지형

### D1. 체스판 칸 — 6개, 색 있음

```
Pixel art floor tiles for a mechanical chess board inside a gothic clockwork tower, matching the attached style.
Layout: 3 columns x 2 rows, each cell 256x256 px, each tile on a 32x32 pixel grid scaled 8x, tile fills the whole cell edge to edge (seamless square tiles). NO white outline around tiles 1-3 and 5-6 — tiles must butt against each other seamlessly.
Background: solid flat magenta #FF00FF only between cells. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Light square: pale gray riveted metal plate (#56545E family), subtle plate seams, 4 corner rivets.
2. Dark square: charcoal riveted metal plate (#2F2E36 family), same design as 1.
3. Fallen square: the plate is gone, revealing dark gears and a faint crimson glow deep below.
4. Crack warning overlay: thin crimson hot cracks only, on magenta (to be drawn over a normal tile).
5. Steam vent (closed): a round brass hatch set into a plate, gauge needle, ready to burst.
6. Steam vent (open): the same hatch opened with white steam rising in pixel clouds.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### D2. 지형 소품 — 5개, 색 있음

```
Pixel art terrain props that sit on top of a chess board square, gothic clockwork steampunk, matching the attached style (white outline like the pieces).
Layout: 5 columns x 1 row, each cell 256x256 px, each prop on a 32x32 pixel grid scaled 8x, prop sits in the lower 2/3 of the cell.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Scrap heap: a pile of iron scrap, pipes and a broken gear (blocks movement).
2. Lift platform: a raised square brass platform on a piston.
3. Heat shield: an upright riveted iron plate barrier with a small vent.
4. Gear trap: an open toothed gear trap set into the floor, slightly crimson.
5. Screw box: a small brass box with steel screws spilling out.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

---

## E. 공격 이펙트 (기물별) — 흰색·회색만, 코드가 진영 색을 입힘

> 지금 게임에는 같은 동작을 코드 도트로 넣어 두었다 (`src/view/attackFx.ts`, 증거 `production/qa/evidence/2026-10-30-attack-fx-*.png`). 이 시트가 오면 같은 박자에 그림만 갈아 끼운다.
> 프레임 그림은 왼쪽 → 오른쪽 순서. 프레임마다 중심 위치가 같아야 한다.

### E1. 폰 — 칼 휘두르기 (6프레임)

```
Pixel art attack effect animation strip: a short sword slash arc swung forward by a small clockwork soldier (chess pawn).
Draw ONLY in white and light gray (#FFFFFF, #E0E0E0, #A0A0A0) — color is added later by code.
Layout: 6 columns x 1 row, each cell 256x256 px, each frame on a 32x32 pixel grid scaled 8x. The attacker stands at the bottom center of every cell; the slash sweeps across the TOP half of the cell from the upper-left diagonal to the upper-right diagonal.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Frames: 1 a thin spark at upper-left, 2 the crescent slash grows toward the top center, 3 full bright crescent from upper-left to upper-right (thickest), 4 the crescent thins with small sparks at both ends, 5 fading broken pixels of the arc, 6 a few last sparks.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E2. 나이트 — 피스톤 내려찍기 + 발굽 충격 (6프레임)

```
Pixel art attack effect animation strip: a clockwork horse (chess knight) stamps the ground with a piston hoof, sending a shock ring and a burst of steam.
Draw ONLY in white and light gray (#FFFFFF, #E0E0E0, #A0A0A0).
Layout: 6 columns x 1 row, each cell 256x256 px, each frame on a 32x32 pixel grid scaled 8x, impact point at the center of every cell.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Frames: 1 small dust puff, 2 a flat elliptical shock ring appears, 3 ring expands with four short spark spikes, 4 ring at full size breaking into dashes, 5 steam clouds drifting up, 6 last thin wisps.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E3. 나이트 — 착탄 별 (4프레임)

```
Pixel art impact star animation strip (where a knight's L-shaped strike lands).
Draw ONLY in white and light gray. Layout: 4 columns x 1 row, each cell 256x256 px, each frame on a 16x16 pixel grid scaled 16x, centered.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Frames: 1 single bright pixel cross, 2 eight-point star with long and short rays, 3 star larger with hollow center, 4 scattered fading dots.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E4. 비숍 — 렌즈 응축 → 광선 (응축 4 + 광선 조각 3)

```
Pixel art effect parts for a bishop that focuses light through a brass lens and fires a beam.
Draw ONLY in white and light gray (#FFFFFF, #E0E0E0, #A0A0A0).
Layout: 7 columns x 1 row, each cell 256x256 px, each part on a 16x16 pixel grid scaled 16x.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1-4. Charge animation, centered: 1 eight dots far apart on a circle, 2 dots spiral closer, 3 dots almost merged around a bright core, 4 a dense bright core with a short flare cross.
5. Beam segment, DIAGONAL from the bottom-left corner to the top-right corner of the cell: bright 2-pixel core with 1-pixel dim edges on both sides, must tile seamlessly corner to corner.
6. Beam segment, HORIZONTAL from left edge to right edge, same design, tileable.
7. Beam end flare: small burst where the beam hits, centered.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E5. 룩 — 쿵 내려찍기 + 십자 연쇄 폭발 (먼지 4 + 폭발 6)

```
Pixel art effect strips for a heavy clockwork tower (chess rook) that slams down and sends explosions running outward square by square.
Draw ONLY in white and light gray (#FFFFFF, #E0E0E0, #A0A0A0, #606060).
Layout: 10 columns x 1 row, each cell 192x192 px, each frame on a 32x32 pixel grid scaled 6x, centered.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1-4. Slam dust: 1 flat dust line at the bottom, 2 dust and small rocks bouncing up to both sides, 3 square shock outline, 4 settling dust.
5-10. One-square explosion: 5 tiny bright core, 6 solid round blast, 7 bigger blast with hollow ring and flying bolts, 8 ring breaking apart with gear bits, 9 smoke puffs, 10 fading smoke dots.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E6. 킹 — 홀(笏) 내려치기 충격파 (5프레임)

```
Pixel art attack effect animation strip: a clockwork king strikes the floor with a scepter and a square shockwave spreads to the eight surrounding squares.
Draw ONLY in white and light gray. Layout: 5 columns x 1 row, each cell 256x256 px, each frame on a 48x48 pixel grid scaled 5x (the king's square is the middle third of the cell).
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Frames: 1 small square ring around the center square, 2 ring grows with rivet sparks at corners, 3 ring reaches the cell edge (covers all 8 neighbors), 4 ring breaks into dashed pieces, 5 faint corner sparks.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

### E7. 공통 — 피격·처치·증기·열기 (4가지 × 4~6프레임)

```
Pixel art common effect strips for a clockwork chess game. Draw ONLY in white and light gray (#FFFFFF, #E0E0E0, #A0A0A0, #606060).
Layout: 6 columns x 4 rows, each cell 160x160 px, each frame on a 16x16 pixel grid scaled 10x, centered. Leave unused cells magenta.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Row 1 — Hit spark (4 frames): a white flash star, smaller star with sparks flying, scattered sparks, two last dots.
Row 2 — Shatter (6 frames): a small machine bursts into gears, springs and bolts flying outward and falling down.
Row 3 — Steam puff (5 frames): a round pixel cloud puffs out, grows, splits, thins and vanishes.
Row 4 — Heat haze (4 frames): wavy vertical heat lines rising and fading.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

---

## F. 문양 (아이콘 원본) — 흰색 단색 실루엣, 4장

> 코드가 이 문양으로 개조·천공 카드·특수 부품·맵 노드·수(키워드) 아이콘을 전부 조합한다 (`docs/art-assets.md` §3).

### F1. 공격·수비 (8)

```
Pixel art icon sheet: pure white single-color silhouettes, gothic clockwork steampunk chess theme.
Layout: 4 columns x 2 rows, each cell 256x256 px, each icon on a 16x16 pixel grid scaled 16x, 1-pixel empty margin inside the 16x16.
Draw ONLY pure white #FFFFFF pixels. No outline, no shading, no second color.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Icons: 1 sword blade, 2 piercing arrow passing through a ring, 3 forked double arrow (two heads), 4 shock wave arcs, 5 heat flame / hot crack, 6 shield, 7 stacked wall bricks, 8 chain link.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no text, no pink or magenta tint on sprite edges.
```

### F2. 생명·이동 (8)

```
Pixel art icon sheet: pure white single-color silhouettes, gothic clockwork steampunk chess theme.
Layout: 4 columns x 2 rows, each cell 256x256 px, each icon on a 16x16 pixel grid scaled 16x, 1-pixel margin.
Draw ONLY pure white #FFFFFF pixels. No outline, no shading.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Icons: 1 oil drop, 2 skull made of a gear, 3 horseshoe with a piston, 4 swirl portal door, 5 two curved swap arrows, 6 banner flag, 7 reaching hand / grabber claw, 8 wind-up key.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no text, no pink or magenta tint on sprite edges.
```

### F3. 장치·규칙 (8)

```
Pixel art icon sheet: pure white single-color silhouettes, gothic clockwork steampunk chess theme.
Layout: 4 columns x 2 rows, each cell 256x256 px, each icon on a 16x16 pixel grid scaled 16x, 1-pixel margin.
Draw ONLY pure white #FFFFFF pixels. No outline, no shading.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Icons: 1 pocket watch, 2 bell, 3 small crown, 4 four-point star, 5 eye with a lens rim, 6 balance scale, 7 target reticle, 8 punched paper card (rectangle with holes).
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no text, no pink or magenta tint on sprite edges.
```

### F4. 등정 (맵 노드) (6)

```
Pixel art icon sheet: pure white single-color silhouettes for map nodes, gothic clockwork steampunk.
Layout: 3 columns x 2 rows, each cell 256x256 px, each icon on a 16x16 pixel grid scaled 16x, 1-pixel margin.
Draw ONLY pure white #FFFFFF pixels. No outline, no shading.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
Icons: 1 hammer on anvil (workshop), 2 screw (shop / currency), 3 question mark made of a bent pipe (event), 4 parts crate (storeroom), 5 wrench (repair station), 6 slot-machine lever (fortune machine).
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no text, no pink or magenta tint on sprite edges.
```

---

## G. UI 프레임 — 회색 4단계, 9-slice

```
Pixel art UI frames for a gothic clockwork steampunk game, to be used as 9-slice panels (corners stay fixed, edges stretch).
Use ONLY these four grays: #1A1A1A, #4A4A4A, #8A8A8A, #D0D0D0 — color is added later by code. Square corners (no rounded corners).
Layout: 3 columns x 2 rows, each cell 320x320 px, each frame on a 40x40 pixel grid scaled 8x, the frame border fills the cell edges, center left flat #4A4A4A.
Background: solid flat magenta #FF00FF only between cells. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Panel: riveted iron frame, 4-pixel border, rivet in each corner.
2. Button (normal): thick riveted plate with a 3-pixel hard drop shadow at the bottom.
3. Button (pressed): same plate pushed down, no bottom shadow.
4. Card frame — iron card: tall rectangle 30x40 inside the cell, riveted metal border, punched holes along the top edge.
5. Card frame — paper card: same size, torn paper edge, punched holes along the top edge.
6. Slot frame: thin recessed socket border for an empty card slot.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

## H. 왕관·과급기 (2)

```
Pixel art overlays matching the attached chess piece sprites (thick white outline, same pixel size).
Layout: 2 columns x 1 row, each cell 256x256 px, each sprite on a 16x16 pixel grid scaled 16x.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. A paper crown cut out of a cardboard box (rough zigzag edges, a bit too big, slightly crooked, light brown cardboard with a printed box-line on it) that sits on a chess pawn's head, 16 wide x 8 tall, at the top of the cell. Also, in the same style as the attached pawn sprites: a white pawn wearing this paper crown (the player's king), full sprite.
2. A supercharger: a small brass boiler with a pressure gauge and a crimson valve, centered.
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no pink or magenta tint on sprite edges.
```

---

## I. 태엽 (AP) — 3개, 색 있음 (지금의 날개 그림 대체)

```
Pixel art UI icons for action points in a gothic clockwork steampunk chess game: a wind-up key (the butterfly-shaped key used to wind clockwork toys), seen from the side, standing upright. Match the attached piece sprites (thick white outline, same pixel density).
Layout: 3 columns x 1 row, each cell 256x256 px, each icon on a 24x24 pixel grid scaled 10x, centered.
Background: solid flat magenta #FF00FF. Leave the bottom 15% and the right 10% of the whole image completely empty magenta (no sprites there).
1. Full: polished brass wind-up key, bright gold highlights, a tiny cyan glint (#38BDF8) on the key's grip.
2. Spent: the same key in dull dark iron gray, no glow.
3. Bonus: the brass key with an extra glowing gold ring around it (extra action point from a reward).
Rules: pixel art, hard square pixels, no anti-aliasing, no blur, no gradients, no text, no numbers, no pink or magenta tint on sprite edges.
```

---

## 발주 순서 요약

| 순서 | 시트 | 개수 | 우선 이유 |
| :-: | :--- | :-: | :--- |
| 1 | S0 스타일 시험 | 4 | 화풍 고정 |
| 2 | A1 발밑·선택·과녁 · A2 화살표 · A3 게이지 | 23 | 매 판 계속 보이는 벡터 도형 교체 (사용자 피드백) |
| 3 | E1~E7 공격 이펙트 | ~60프레임 | 기물별 공격 연출 (코드 임시판 대체) |
| 4 | D1 판 · D2 지형 | 11 | 보드 분위기 |
| 5 | F1~F4 문양 · G 프레임 · H 왕관 · I 태엽 | 41 | 아이콘·UI 전체 |

- 받는 즉시 개발 측: 마젠타 제거 → 도트 크기 자동 검출 → 원래 도트 해상도로 축소 → `public/` 연결 → `/run-and-observe` 증거.
- 나중 발주 (후순위): 컷신 11컷·인물 초상 8장 (`docs/story.md` §6), Act 배경(장미창 시계).
