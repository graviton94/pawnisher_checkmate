# 2026-11-09e 에셋 비율 · 팝업 전수 점검

> 새 규칙 (사용자 결정 D-386): 받은 그림을 칸에 맞추려고 **늘리거나 찌그러뜨리지 않는다**. 크기가 다르면 원본 비율을 지키고 일부를 자른다(`object-fit` · `background-size: cover` + 초점 위치). 도트는 `image-rendering: pixelated`로 선명하게.
> 이 문서는 **점검만** 했다 (src/ 수정 없음). 고칠 것은 아래 「고칠 목록」.

## 요약

- **실측 왜곡(가로세로 배율 차 2% 넘음): 0곳.** 52개 장면 · 측정 3,286건 · 서로 다른 그림 배치 211종(+ 9-slice 51종)을 실제 화면(915×412)에서 쟀다. 받은 장면 그림(사건 · 컷신 · 크레딧 · 배경 · 보스 초상)은 모두 `cover` 또는 정수배라 비율은 지켜지고 있다.
- **코드상 왜곡 1건 (실제로 보이는 것):** 진홍 단추 크롬 `btn-crimson.png` 아래 변의 **노랑·검정 경고 줄무늬**가 9-slice `stretch`로 가로로 늘어난다 (적 턴 배너 · 패배 KO 띠 · 보스 규칙 판 · 진홍 단추 · 적 이름판 · 지도 보스 노드). 줄무늬 6칸이 단추 폭만큼, 턴 배너에서는 24칸이 593px까지 늘어난다(약 25배).
- **조건부 위험 4건:** 카드 틀의 옛 `aspect-ratio: 112 / 158`(지금은 card-layout.css가 덮어서 괜찮음) · 분대 카드 얼굴 `img` 100%×100%(object-fit 없음) · 사건 연출 캔버스 `.ev-fx` 100%×100% · 베벨 무늬가 있는 9-slice 변(plate · tape · price-tag · pipe).
- **연출 중 순간 찌그러짐(squash & stretch)** 은 박스 맞춤이 아니라 D-180 타격감 연출이라 왜곡 수에 넣지 않았다. 규칙을 연출에도 적용할지는 사용자 판단 (아래 1-D).
- **선명도(정수배 아님):** 왜곡은 아니지만 도트가 고르지 않게 보이는 배율이 많다 — 카드 틀 1.5배, 카드 아이콘 1.25배, 지도 메달 0.84 · 1.12배, 장면 배경 3.2배 등 (1-C).
- **팝업 · 창 · 말풍선 종류: 39가지** (공용 창 `#overlay` 한 틀에 들어가는 변형 25가지 포함). 아래 Part 2.

## 방법

1. 정적: `src/slice/*.ts` · `src/view/*.ts`의 `<img>` · 인라인 `url()` · CSS `url()` / `border-image` / `mask` · Phaser `setDisplaySize` · `setScale` · `drawImage`를 모두 찾았다.
2. 원본 크기: `python3 -I` + PIL로 `public/scenes` · `public/ui/**` · `public/pieces` · `src/assets/ui/**` 전부를 읽었다.
3. 실측: 프리뷰(localhost:4173) + Playwright, 915×412. 장면마다 모든 `<img>` · `<canvas>` · 배경/마스크 그림(::before/::after 포함)에 대해 원본 비율과 그려진 칸 비율, `object-fit` · `background-size` · `image-rendering`을 비교. 변형(transform) 때문에 생기는 허상(회전된 타이틀 폰)은 레이아웃 크기로 다시 재서 걸렀다.
4. 9-slice 원본은 변 줄(stretch되는 줄)이 한 색으로 고른지 PIL로 확인했다.

스크린샷: `production/qa/evidence/2026-11-09-audit-*.png` (53장, gitignore 대상).

---

## Part 1 — 그림 배치 비율 점검

판정: ✅ 비율 유지 · ⚠️ 조건부/작은 왜곡 · ❌ 왜곡 · 🎞 연출 중 순간 변형

### 1-A. 받은 장면 · 초상 그림 (사용자 발주 에셋)

| 위치 (file:line) | 에셋 | 원본 | 그려진 칸 (915×412) | 왜곡? | 제안 |
|---|---|---|---|---|---|
| main.ts:1742 · slice.css:415 `.ev-scene > img` | `scenes/<사건>.png` (gambler 239×179, tinker 248×186 …) | 약 4:3 | 339×249 `cover` | ✅ (1.4배, 비정수) | 유지. 원본이 거의 4:3이라 잘림 거의 없음 |
| opening.ts:95 · slice.css:811 `.pl-img` | 프롤로그 · 엔딩 · 승급 컷 (prologue-00 287×144, ending-peel 534×267 …) | 약 2:1 | 988×445 (`inset:-4%`) `cover` | ✅ | 유지 |
| opening.ts:95 · slice.css:2348 `.pl-img.pl-portrait` | 보스 초상(boss-gilded 256×245) · 보스 쓰러짐 컷(boss-fall-plate 281×136) | 1:1 / 2:1 | 915×412 `contain` | ✅ 비율 유지, 다만 **레터박스** | D-313로 일부러 `contain`. 새 규칙 문구(「잘라 쓴다」)와 다르므로 `cover` + `object-position: 50% 15%`(얼굴 · 왕관 쪽)로 바꿀지 사용자 판단 |
| credits.ts:23 · slice.css:2666 `.cr-bg` | `scenes/credits-bg.png` 293×146 | 2:1 | 915×412 `cover` | ✅ | 유지 |
| main.ts:3619 · slice.css:2187 `.promo-art img` | `scenes/boss-gilded*.png` 256×245 | ≈1:1 | 168×168 `cover` (가운데) | ✅ | 정사각에 가까워 잘림 ~4%. 왕관이 위에 있으니 `object-position: 50% 0` 권장 |
| main.ts:2239 · slice.css:1031 `.enc-portrait` | 보스 초상 | ≈1:1 | min(46vh,300) 정사각 `cover`, 위치 72% 40% | ✅ (정적 확인) | 유지 |
| main.ts:696 · slice.css:1138 `.portrait .pt-art` | 보스 초상 (레일) | ≈1:1 | 칸 가득 `cover`, 70% 40% | ✅ (정적 확인) | 유지 |
| main.ts:1660 · slice.css:1028 `.mapfx::before` | `scenes/act-N.png` (act-1 273×141) | ≈1.94:1 | 915×412 `cover` | ✅ (3.35배) | 유지 |
| main.ts:2172 · slice.css:1634 `.stagefx.has-bg::before` | `scenes/<bg>.png` | | 전체 `cover` | ✅ | 유지 |
| main.ts:2184 · slice.css:3002 `.en-bay` | `scenes/act-N.png` | 1.94:1 | 300×176 `cover`, 위치 center 60% | ✅ | 유지 |
| main.ts:2268 · slice.css:1015 `body.placebg::before` | bg-event 283×150 · bg-forge 371×186 · end-clear 547×275 · end-fail 288×149 | ≈1.9:1 | 915×412 `cover` | ✅ | 유지 |
| slice.css:1023 `body[data-place="bg-shop"]::before` | bg-shop 259×136 | 1.9:1 | `114% auto` (4.03배) | ✅ (한 축 auto라 비율 유지) | 유지 |
| main.ts:3873 · slice.css:779 `.op-bg` (타이틀 배경) | prologue-00 287×144 | 2:1 | 915×412 `cover` | ✅ | 유지 |
| opening.ts:149 · slice.css:1066 `.gd-media.shot img` | `guide/*.png` (824² 등) | 1:1 | 칸 `cover` | ✅ | 유지 |
| bossintro.ts:79-86 `.bf-port canvas` | 보스 초상 → 디더 캔버스 | 원본 | 정수배 k(2배: 211×206→422×412) | ✅ | 유지 (가장 모범적) |
| bossintro.ts:93-110 (초상 없을 때) | `pieces/l-K1` → 72×72 캔버스 | 1:1 | 정수배 | ✅ | 유지 |

### 1-B. UI 그림 · 기물 · 아이콘 (img · 배경 · 마스크 · 캔버스)

| 위치 (file:line) | 에셋 | 원본 | 그려진 칸 | 왜곡? | 제안 |
|---|---|---|---|---|---|
| ui/sprites.ts:5 `pieceImg()` (width=height 속성) | `pieces/l-*.png` 216² · `s-*.png` 144² | 1:1 | 18~64 정사각, `contain` | ✅ | 유지 |
| index.html:20-21 `.boot-logo` | `ui/title-logo.png` 177×149 | | 354×298 / 266×224 (1.503배) | ✅ 비율 / 비정수 | 낮은 화면에서 2배(354) 또는 1배로 |
| index.html:23 · slice.css:1645 `.boot-gear` · 타이틀 톱니 | `ui/hud/gears-spin.png` 704×30 | 시트 | `1408px 60px` (2배) | ✅ | 유지 |
| opening.ts:34 · slice.css:533 `.tfx-em img` | `ui/title-pawn.png` · `title-slash.png` 205×124 | | 205×124 | ✅ (1배) | 유지 |
| uifx.ts:335 · slice.css:560 `.tfx-word` 마스크 | `ui/title-logo.png` | | `177px 149px` | ✅ | 유지 |
| main.ts:195 · slice.css:2673 `.crew-face` (분대원 말) | `ui/hud/crew-*.png` 56² | 1:1 | 56×56 | ✅ | 유지 |
| main.ts:542 · slice.css:2741 `.cf-face` | crew-* 56² | 1:1 | 55×55 (`aspect-ratio:1`) | ✅ | 60%→ 56px 고정이면 1배 |
| main.ts:580 · slice.css:2793 `.cf.crew-card .er-pc img` | crew-* 56² | 1:1 | 68×68 (`width/height:100%`, object-fit 없음) | ⚠️ 지금은 정사각 칸이라 OK | 칸 비율이 바뀌면 바로 찌그러짐 → `object-fit: contain` 가드 추가 |
| evstage.ts:337 · slice.css:2052 `.er-pc img` | crew-* · 기물 | 1:1 | 72×72 | ✅ | `object-fit: contain` 가드 권장 |
| evstage.ts:471 · slice.css:2066 `.er-cut` | 같은 그림 | 1:1 | `72px 72px` | ✅ | 유지 |
| main.ts:839 · slice.css:2272 `.cl-face img` | `ui/hud/adjutant.png` 56² | | 56×56 | ✅ | 유지 |
| main.ts:218 · slice.css:1742 `.taunt-face.tf-boss` | `ui/hud/avatar-*.png` 60² | | `60px 60px` | ✅ | 유지 |
| slice.css:1743 `.taunt-face img` | `pieces/s-K1` 144² | | 40×40 | ✅ | 유지 |
| credits.ts:19 · slice.css:2243 `.cr-crown` | `ui/hud/paper-crown.png` 9×7 | | 28×auto | ✅ (3.1배 비정수) | 27px(3배)로 |
| main.ts:483 `.costgear img` | `ui/board/badge-c*.png` 11² | | 20×20 | ✅ (1.82배) | 22px(2배)로 |
| main.ts:42 `iconArt()` · `.ico` · `.ico16` | `ui/icons16/*.png` 32² · 16² | 1:1 | 16 · 28 · 32 · 40 `contain` | ✅ (28=0.875배, 40=1.25배) | 32 또는 16의 배수로 |
| slice.css:2725 + card-layout.css:3 `.cf.cf.cf` 카드 틀 | `src/assets/ui/cards/*.png` 112×168 | 2:3 | 168×252 `100% 100%` | ⚠️ 지금은 비율 일치 | slice.css:2725의 옛 `aspect-ratio: 112 / 158`이 남아 있다. card-layout.css(`.cf×4`)가 덮어서 괜찮지만, 그 규칙이 빠지면 **6% 세로 찌그러짐**. 2725를 `112 / 168`로 고치거나 `background-size: cover` |
| slice.css:2784 `.cf-win` 마스크 | `cards/mask-*.png` 73×40 | 1.825 | 110×60 (1.833) | ✅ (0.5%) | 유지 |
| card-layout.css:8 `.cf-gem` | `kit/gem-*.png` 9² | | 12×12 (1.33배) | ✅ / 비정수 | 9 또는 18px |
| slice.css:512-516 `.mnd` 지도 메달 · 톱니 | 코드 스프라이트 57² · 75² | 1:1 | 48 · 56 · 64 / 72 `100% 100%` | ✅ / 비정수 (0.84 · 1.12배) | 메달을 칸 크기 정수배로 다시 찍기 |
| slice.css:1395-1457 태엽 소켓 · 열쇠 · 관 · 용암 · 눈금 | kit/socket 32² · key-spin 160×32 · tube 30×14 · lava 14×10 · tick 7×10 · manifold 4×8 · cap 4×14 | | 1배 또는 2배 | ✅ | 유지 |
| slice.css:1524-1526 빛살 | `kit/rays-*.png` 112² | | 560² · 896² · 784² (5 · 8 · 7배) | ✅ | 유지 |
| slice.css:1814-1821 부활 FX | revive-cog 14×7 · beam 192×2 · burst 384×48 | | 3배 · 2배 · 3배 | ✅ | 유지 |
| slice.css:459 · fx3.ts:353 `.screw` · `.fx3-coin` | `kit/screw.png` 32² | | 18×18 (0.56배) | ✅ / 비정수 | 16px 권장 |
| slice.css:1049 `.scr` | `kit/screw16.png` 16² | | 16×16 | ✅ | 유지 |
| slice.css:1501 `.twk` | `kit/twinkle.png` 28×7 | | `56px 14px` | ✅ | 유지 |
| BoardRenderer.ts:442 · 494 · 516 · 527 · 658 · 710 · 1047 · 1311 · 1314 (Phaser) | `ui/board/*.png` (20² · 11² · 7² · 16² · 15² · 21²) · 기물 글리프 캔버스 | 전부 1:1 | `setDisplaySize(s, s)` 정사각 | ✅ | 유지 |
| BoardRenderer.ts:1334 글리프 캔버스 `drawImage(src,…, s, s)` | 기물 | 1:1 | 정사각 | ✅ | 유지 |
| main `#board canvas` | Phaser 165×138 → 495×414 | | 3배 | ✅ | 유지 |
| bossintro.ts:64 · pxfx.ts:327 `FxCanvas` | | | 인라인 w×dot | ✅ | 유지 |
| evstage.ts:51-55 · slice.css:1959 `.ev-fx` (사건 연출 캔버스) | 캔버스 floor(칸/3) | | CSS `width/height: 100%` | ⚠️ 칸이 3의 배수가 아니면 가로·세로 배율이 달라짐(≤1%) + 그 위에 1배로 그린 분대원 얼굴이 비정수로 늘어남 | 캔버스에 `style.width = w*3px`, `height = h*3px` (FxCanvas처럼) |
| pxkit.ts:110 `.px-verdict` | 캔버스 | | 인라인 W×dot | ✅ | 유지 |

### 1-C. 9-slice 틀 (border-image)

9-slice는 변을 늘리는 것이 원래 방식이라, **변 줄이 한 색일 때만** 왜곡이 없다. PIL로 변 줄을 확인한 결과:

| 위치 (file:line) | 에셋 | 변 줄 | 왜곡? | 제안 |
|---|---|---|---|---|
| style.css:77-78 `.btn.crimson` · style.css:166 `.rail-head .plate.enemy` · style.css:360/369 `.node.boss` · slice.css:2099 `.tb4.foe .band`(적 턴 배너) · slice.css:2112 `.boss-rules` · slice.css:2359 `.ko3.lose .koband`(패배 KO 띠) | `chrome/btn-crimson.png` 24² (아래 변 20~21줄 = 노랑·검정 경고 줄무늬) | **아래 변 무늬 있음** | ❌ 줄무늬가 가로로 늘어남. 턴 배너(`9 0` 슬라이스)는 24칸 줄무늬 전체가 593px로 약 25배 | 아래 변만 `border-image-repeat: stretch round`(가로는 반복)로 바꾸거나, 줄무늬를 border-image가 아닌 반복 배경(`repeat-x`, 정수배) 한 줄로 분리 |
| slice.css:2093 · 2141 · 2379 · style.css:107 | `chrome/plate.png` 16² | 왼/오른 변에 베벨 빛 점 2칸 | ⚠️ 세로로 늘어남 (높이 30~40px에서 빛 점이 길쭉) | 베벨 점이 모서리 조각 안에 들어가게 slice를 6으로, 또는 `round` |
| slice.css:2077 · 2140 · 3020 · style.css:174/205 | `chrome/tape.png` 12² | 왼 변 그림자 1칸 | ⚠️ 작음 | 같음 |
| slice.css:1555 · 1557 | `kit/price-tag.png` 12² | 왼 변 구멍 2칸 | ⚠️ 작음 | 같음 |
| slice.css:1436 `.boiler` | `kit/pipe.png` 6² | 좌우 변 2색 | ⚠️ 작음 (높이 20px) | 같음 |
| 그 밖 (btn-brass/iron/cyan · inset · panel · panel-e · gauge · mag-* · mag-body · badge-* · tag-* · frame-rare/gold · card-common/rare/gold · scroll-*) | | 한 색 (또는 `round`) | ✅ | 유지 |

### 1-D. 연출 중 순간 변형 (squash & stretch — 왜곡 수에 넣지 않음)

D-180 · D-193 타격감 문법(예비 동작 → 터짐 → 출렁임)으로 일부러 0.1~0.5초 찌그러뜨리는 곳. 박스 맞춤과는 다르지만 「그림 비율을 깨지 않는다」를 연출에도 적용할지는 **사용자 판단 필요**.

| 위치 | 무엇이 | 변형 |
|---|---|---|
| BoardRenderer.ts:631 | 판 위 기물 착지 | `setScale(sx*1.25, sy*0.72)` |
| BoardRenderer.ts:888 | 피격 기물 | `root.setScale(p.sx, p.sy)` |
| BoardRenderer.ts:1476 | 돌진 잔상 | `setDisplaySize(size*stretch, size/stretch)` |
| slice.css:537 `tfxdrop` | 타이틀 폰 그림 낙하 | `scale(0.85, 1.35)` |
| slice.css:581 `m3in` · 731 `encdrop` | 창 · 보스 초상 낙하 | `scale(0.92,1.12)` · `scale(0.9,1.25)` |
| slice.css:1495-1497 · 2443 `cast3` · 1616 `enplate` · 3019 `enchip` · 464 `.btn.down` | 카드 · 이름판 · 단추 | `scale(1.15,0.85)` 등 |
| fx3.ts:201 | 버리는 카드 | `scale(0.4,0.5)` |

---

## Part 2 — 팝업 · 창 · 말풍선 전수 (39가지)

크기는 915×412 실측(x, y, 폭×높이) 또는 CSS 값. 스크린샷 경로 앞부분 `production/qa/evidence/2026-11-09-audit-` 생략.

### 2-A. 공용 창 `#overlay > #overlay-panel` (25 변형)

틀: index.html:54, `openOverlay()` main.ts:2378 → `modalIn`(fx3.ts:81, `m3in` 낙하) · 바닥 디더(slice.css:2089) · 판 크롬 `panel-e.png` 9-slice(style.css:246). 폭은 두 가지 — **좁은 창 640px**(x 138) · **넓은 창 888px**(x 13~14, 카드 가로 줄 `railify`).

| # | 이름 | 코드 | 여는 때 | 고유 클래스 | 크기 | 스크린샷 |
|---|---|---|---|---|---|---|
| 1 | 고물상(상점) | main.ts:1996 | 지도 상점 노드 | `.shop-head` `.shop-scrollbox` `.cslot` `.cinfo` | 888×368 | shop.png |
| 2 | 보강 | main.ts:2062 | 작업대 「보강」 | `.part-cards` | 넓은 창 (미캡처) | — |
| 3 | 작업대 / 최종 정비 | main.ts:2087 | 작업대 노드 · 최종전 앞 | `.part-cards .part-card.opt` | 888×328 | forge.png · finalforge.png |
| 4 | 카드 고르기 (다듬기 · 저울 등) | main.ts:2128 | 작업대 · 사건 | `.reward-cards` | 넓은 창 (미캡처) | — |
| 5 | 사건 | main.ts:1742 | 지도 사건 노드 | `.ev-wrap.ev-stage` `.ev-scene` `.ev-choice` | 878×391 (안쪽 854×371) | event-gambler.png · event-tinker.png |
| 6 | 사선 (마지막 한 수) | main.ts:1330 | 킹 위기 | `.stand` | 640×243 | stand.png |
| 7 | 원수 | main.ts:1366 | 원수 적 등장 | `.stand.nemesis` | 좁은 창 (원수 없어 미캡처) | meet.png(창 없음) |
| 8 | 판돈 | main.ts:1386 | 전투 시작 내기 | `.stand` `.terms` | 640×266 | bet.png |
| 9 | 하자 폐기 (킹 쓰러짐) | main.ts:2618 | 패배 · 부활 | `.stamp-big.bad` | 640×218 | reward.png |
| 10 | 보상 | main.ts:2759 | 전투 승리 | `.reward-cards` 등 | 넓은 창 (미캡처) | — |
| 11 | 덱 보기 / 덱에서 빼기 | main.ts:2839 | 레일 「덱」 단추 · 작업대 | `.reward-cards.deck-rail` | 888×380 | deckview.png |
| 12 | 분대 | main.ts:2944 | 레일 「분대」 단추 | `.reward-cards` `.cf.crew-card` | 888×380 | crew.png |
| 13 | 도감 | main.ts:2954 | 분대 창 안 | `.ledger` | 640×239 | ledger.png |
| 14 | 영입 | main.ts:2976 | 보상 · 사건 | `.part-cards` `.crew-card` | 888×395 | recruit.png |
| 15 | 핵심 부품 | main.ts:3026 | 출하 시작 | `.part-cards` | 888×396 | kit.png |
| 16 | 부품 칸 가득 | main.ts:3071 | 부품을 더 받을 때 | `.pass-tag.bad` | 좁은 창 (미캡처) | — |
| 17 | 부품 고르기 | main.ts:3104 | 보상 · 상자 | `.part-cards` | 888×352 | partpick.png |
| 18 | 버그 신고 | main.ts:3140 | 도움말 탭 | `.pt-card` `textarea.pt-text` | (미캡처) | — |
| 19 | 기록 내보내기 | main.ts:3164 | 타이틀 메뉴 · 결과 | `.pt-card` | (미캡처) | — |
| 20 | 설문 | main.ts:3192 | 출하 결과 | `.pt-card` `.pt-q` | (미캡처) | — |
| 21 | 도움말 (안내 / 사전) | main.ts:3239-3253 · opening.ts:166 `guide()` | 판 오른쪽 위 톱니 `?` | `.gd2` `.gd-card` / `.helpcard` `.hp-body` `.gd-x` | 안내 860×396 · 사전 640×369 | help-guide.png · help-dict.png |
| 22 | 근간 시험장 시작 / 결과 | main.ts:3498 · 3510 | `?lab` | | 좁은 창 | lab.png(토스트만) |
| 23 | 승급 | main.ts:3619 | 출하 완료 뒤 | `.promo` `.promo-art` | 640×230 (안쪽 588×186) | endflow.png |
| 24 | 출하 결과 (완료 / 중단) | main.ts:3686 | 출하 끝 | `.pass-tag` | 640×239 | clear.png |
| 24b | 새 출하 확인 | main.ts:3930 | 타이틀 「새 출하」(저장 있을 때) | `.row` | 좁은 창 (미캡처) | — |

### 2-B. 확인 · 미리보기 · 정보 창

| # | 이름 | 코드 | 여는 때 | 클래스 · 틀 | 크기 | 스크린샷 |
|---|---|---|---|---|---|---|
| 25 | 조합 확인 (핵심 부품) | main.ts:3041 | 핵심 부품 카드 탭 | `.kit-confirm` 전체 디더 + `.kc-panel`(panel.png 9-slice, slice.css:2428-2429) + `.kc-cards` | 전체 915×412, 판 ≈ 600×190 | kit-confirm.png |
| 26 | 고르기 확인 (상점 · 보상 등) | main.ts:2293-2316 `choose()` | 카드 탭 | `.kit-confirm.pick-confirm` (+ 옛 `.confirm-bar` 2307, slice.css:293) | 전체, 판 ≈ 300×190 | shop-confirm.png |
| 27 | 카드 미리보기 | main.ts:426 `showPeek()` | 손패 카드 길게 누름 | `.peek` (큰 카드 1장) | 168×252 | peek.png |
| 28 | 기물 정보 | main.ts:294 (`#info`, index.html:52) | 판 위 기물 길게 누름 | `.info` / `.ci-host` (분대원은 카드) slice.css:943 | 미캡처 (마우스 길게 누름이 Phaser에 안 닿음) | — |
| 29 | 카드 정보판 | main.ts:2423 `slotCard()` | 창 안 카드 밑 | `.cinfo` `.ci-row` | 148×24~59 | shop.png · kit.png |
| 30 | 보스 규칙 판 | index.html:43 `#boss` | 보스전 레일 | `.boss-rules` (btn-crimson 9-slice, slice.css:2112) | 178×40 | boss-battle.png |

### 2-C. 토스트 · 말풍선 · 판 위 팝

| # | 이름 | 코드 | 여는 때 | 클래스 · 틀 | 크기 | 스크린샷 |
|---|---|---|---|---|---|---|
| 31 | 토스트 | main.ts:334 · fx3.ts:123/128 (`#toast`, index.html:53) | 안내 · 경고 한 줄 | `.toast.t3in` slice.css:233 | 위 가운데, 325~482×29~44 | finalforge.png · lab.png |
| 32 | 부관 코치 한 줄 | main.ts:820 `coach()` | 첫 판(입문) 조작 안내 | `.coach-line` (panel.png 9-slice, slice.css:2163) + `.cl-face` | 290×89 (판 아래) | first-launch-2.png |
| 33 | 튜토리얼 말풍선 + 조명 | tutorial.ts:47 `runTutorial()` | 첫 전투 · 지도 · 영입 등 | `.tut` `.tut-dim` `.tut-frame` `.tut-talk`(panel.png) | 전체 + 말풍선 (미캡처) | — |
| 34 | 도발 · 분대원 말 | main.ts:201 `taunt()` · main.ts:188 `crewSay()` | 전투 시작 · 처치 · 보스 대사 | `.taunt.tq3` (`.crew-say`) panel.png 9-slice slice.css:2109 | 351×84 (위 가운데) | crewsay.png |
| 35 | 판 위 팝 (막기 · 연쇄 · 부품 발동 · 피해 숫자) | main.ts:1006 `.block-pop` · 1030 `.chainpop` · 3351 `.part-pop` · view/popup.ts:33/86 (Phaser 도트 글씨) | 막기 · 연쇄 처치 · 부품 발동 · 피해 | 각자 | 글자 크기 (24 · 45px) | 미캡처 (순간) |

### 2-D. 전체 화면 장면 · 배너 (팝업 성격)

| # | 이름 | 코드 | 여는 때 | 클래스 | 크기 | 스크린샷 |
|---|---|---|---|---|---|---|
| 36 | 턴 배너 · KO 배너 · 판정 도장 | fx3.ts:154 `turnBanner` (`.tb4`) · fx3.ts:211 `koBanner` (`.ko3`) · pxkit.ts:99 `verdict` (`.px-verdict` 캔버스) · fx3.ts:232 `stampFx` | 턴 바뀜 · 전투 끝 · 판정 | `.tb4 .band`(btn-brass / btn-crimson 9-slice) | 띠 593×50 · KO 전체 | turnbanner-foe.png (내 차례 띠) |
| 37 | 되감기 장면 | main.ts:2530 `rewindScene()` | 킹 쓰러짐 · 되감기 단추 | `.revfx` (전체 디더, `.rev-gear`) | 915×412 | 미캡처 |
| 38 | 컷신 · 장면 전환 | opening.ts:41 `playCuts` (`.prologue`) · credits.ts:13 (`.credits`) · finale.ts:20 (`.finale`) · bossintro.ts:51 (`.bossfx`) · main.ts:2170 (`.stagefx.entry2` 전투 진입) · main.ts:3865 (`.opening` 타이틀 + `.op-menu` 320×240) · evstage.ts:489 (`.ev-ov` 사건 결과) · main.ts:2881-2910 (`.crackfx` `.deathfx`) · main.ts:3399 (`.tapefx`) · main.ts:3414 (`.transfx`) · uifx.ts:264 (`.shutterfx`) | 프롤로그 · 엔딩 · 크레딧 · 보스 등장 · 전투 진입 · 타이틀 · 사건 결과 · 쓰러짐 · 되감기 · 부활 · 셔터 | 각자 | 915×412 | prologue.png · trueend.png · enda.png · promocut.png · shadow.png · defeat.png · phase2.png · fallcut.png · credits.png · bossintro-plate.png · bossintro-magnet.png · final.png · intro-battle.png · title.png · title-menu.png |

창 틀(크롬)은 네 갈래로 나뉜다: ① `panel-e.png` 공용 창(2-A) ② `panel.png` 말풍선 · 확인 판(25 · 26 · 32 · 33 · 34) ③ 단색 + `box-shadow` 테두리(`.info` · `.foeplan` · `.stand` 안쪽 · `.toast`) ④ 전체 화면 디더/장면(2-D). ③은 design-system 「부품 조합」 밖이라 고칠 목록 후보.

---

## 고칠 목록 (우선순위)

1. ❌ **btn-crimson 경고 줄무늬 늘어남** — 6곳 (style.css:77-78 · 166 · 360 · 369, slice.css:2099 · 2112 · 2359). 아래 변을 `round` 반복 또는 줄무늬를 따로 반복 배경으로.
2. ⚠️ slice.css:2725 옛 `aspect-ratio: 112 / 158` → `112 / 168` (card-layout.css가 빠지면 카드 틀 6% 찌그러짐).
3. ⚠️ `object-fit` 가드: slice.css:2793(`.crew-card .er-pc img`) · 2052(`.er-pc img`)에 `object-fit: contain`.
4. ⚠️ evstage.ts:51-55 `.ev-fx` 캔버스를 인라인 정수배 크기로 (FxCanvas와 같게).
5. ⚠️ plate · tape · price-tag · pipe 9-slice 변 베벨 점 — slice 값 조정 또는 `round`.
6. 판단 필요: `.pl-portrait` `contain`(레터박스, D-313) → `cover`+초점? · 연출 squash & stretch에 규칙 적용 여부.
7. 선명도: 비정수 배율(카드 틀 1.5 · 아이콘 1.25/0.875 · 지도 메달 · gem 1.33 · 비용 배지 1.82 · 나사 0.56 · 종이 왕관 3.1 · 부팅 로고 1.5)을 정수배로.

## 확인하지 못한 것 (NOT ASSESSED)

- 기물 정보 `#info`(Phaser 길게 누름이 자동 조작에서 안 잡힘), 되감기 장면, 튜토리얼 말풍선, 보상 창, 보강 · 카드 고르기 · 부품 칸 가득 · 버그 신고 · 내보내기 · 설문 · 새 출하 확인 창, 원수 창, 적 턴 배너(진홍), 판 위 팝 — 코드로만 점검.
- 측정은 DPR 1. 비율 판정은 DPR과 무관하지만, 비정수 배율의 도트 뭉개짐은 실기(DPR 2.625)에서 다르게 보일 수 있다.
- 프리뷰 빌드는 작업 트리의 커밋 안 된 main.ts 변경 이전 빌드일 수 있다.
