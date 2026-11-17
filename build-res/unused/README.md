# 안 쓰는 그림 (앱에 싣지 않는다 — D-541)

게임이 부르지 않는 그림을 `public/` · `src/assets/`에서 여기로 `git mv`했다. 경로는 원래 자리 그대로다 (`build-res/unused/<원래 경로>`).
여기 있는 파일은 웹 빌드(`dist/`) · 안드로이드 APK · PC 묶음에 들어가지 않는다. 기록(git 이력)은 그대로 남아 있다.

## 되살리는 법

1. `git mv build-res/unused/<원래 경로> <원래 경로>` — 예: `git mv build-res/unused/public/scenes/ending-peel.png public/scenes/ending-peel.png`
2. 코드에서 그 그림을 부른다. `public/`의 그림은 `npm run build`가 `src/data/preload-list.ts`에 저절로 올린다.
3. 도구가 찍는 그림이면 도구도 고친다 — 아니면 다시 찍을 때 또 여기로 온다:
   - `pieces/m-*` · `l-boss-*` · `l-giant*` · `l-<이형>1` → `tools/pixel/maker.py` (`MINI_FILES` · export의 `l-` 조건)
   - `ui/props/ic-*` (24도트) → `tools/pixel/sheet-slice.py` (32가 아닌 크기는 여기로 찍는다)
   - `ui/board/target*` → `tools/draw-board.py` · `ui/frames/*` · `ui/hud/pip` → `tools/draw-assets.py`
4. 이 표에서 그 줄을 지운다.

## 확인한 방법

- 출시 빌드 묶음(JS · CSS · HTML, 미리 부르기 목록을 비운 판)에서 이름 · 줄기를 찾고, 문자열로 짓는 경로(`scenes/${…}.png` · `act-${…}` · `boss-fall-${…}` · `pieces/${l|s}-${…}` · `ui/board/${…}` · `ic32-${…}` 등)의 값을 데이터에서 따졌다.
- 미리 부르기를 끈 빌드로 전수 화면 점검(`tools/qa/sweep.cjs 915`)과 완주 점검(`tools/qa/completion.cjs`)을 돌려 요청된 그림을 모았다 — 여기 있는 파일은 한 번도 요청되지 않았다. (이름을 쪼개 짓는 `boss-gilded-1~3`은 이 단계에서 잡혀 `public/`에 남겼다.)
- `tools/` · `docs/`에서만 이름을 적는 것은 「앱이 쓴다」로 치지 않았다.

## 남겨 둔 것 (안 실리지만 옮기지 않음)

- `src/assets/ui/` 안의 작은 부품 몇 개(`chrome/tip32-*` · `kit/price-tag*` · `chrome/v2/roster-*` 등)는 코드가 부르지 않지만, 4 KB 미만이라 묶음 목록(`preload-bundled`)에 오르지 않고 아무도 import하지 않아 빌드에 실리지 않는다. 다른 작업이 곧 쓸 수 있어 그대로 둔다.
- `public/ui/hud/key-*.png`: 게임은 부르지 않지만 `tools/draw-hud.py` · `tools/pixel/icon_sheets.py`가 원본으로 읽는다 (각 0.4 KB).
- `public/icon-192.png` · `icon-512.png` · `logo.png` · `slice.html`: 앱 아이콘 · 2.0(legacy) 타이틀 · 옛 주소 이동 — 다른 작업이 쓸 수 있어 그대로 둔다.

## 목록 — 101개 · 2852.7 KB

| 파일 (원래 경로) | 크기 | 안 쓰는 까닭 |
|---|---|---|
| `public/pieces/l-archbishop1.png` | 1.5 KB | 검은(적) 이형 큰 그림. 분대 얼굴은 흰 이형 `l-<이형>0`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-alarm-p2-1.png` | 6.0 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-alarm1.png` | 5.1 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-gilded-p2-1.png` | 8.0 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-gilded1.png` | 5.4 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-inspect-p2-1.png` | 5.7 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-inspect1.png` | 5.1 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-magnet-p2-1.png` | 5.8 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-magnet1.png` | 4.8 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-plate-p2-1.png` | 6.7 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-plate1.png` | 5.2 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-spawn-p2-1.png` | 6.0 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-spawn1.png` | 5.5 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-thorns-p2-1.png` | 6.0 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-boss-thorns1.png` | 5.0 KB | 2×2 반장 큰 그림 (216칸). 판은 `s-boss-*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-camel1.png` | 1.6 KB | 검은(적) 이형 큰 그림. 분대 얼굴은 흰 이형 `l-<이형>0`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-cannon1.png` | 1.5 KB | 검은(적) 이형 큰 그림. 분대 얼굴은 흰 이형 `l-<이형>0`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-chancellor1.png` | 1.5 KB | 검은(적) 이형 큰 그림. 분대 얼굴은 흰 이형 `l-<이형>0`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-giantP1.png` | 3.1 KB | 거대 주물 큰 그림. 판 · 정보 창은 `s-giant*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-giantQ1.png` | 2.9 KB | 거대 주물 큰 그림. 판 · 정보 창은 `s-giant*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-giantR1.png` | 3.0 KB | 거대 주물 큰 그림. 판 · 정보 창은 `s-giant*`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/l-hopper1.png` | 1.4 KB | 검은(적) 이형 큰 그림. 분대 얼굴은 흰 이형 `l-<이형>0`만 부른다. maker.py export가 더는 찍지 않는다. |
| `public/pieces/m-B0.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-B1.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-K0.png` | 0.3 KB | 작은 도트판 (25px). D-547부터 앱 아이콘도 이 파일 대신 `tools/app_icon.py`가 `maker.mini()`로 크기마다 K0 작은 판을 찍는다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-K1.png` | 0.3 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-N0.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-N1.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-P1.png` | 0.3 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-Q0.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-Q1.png` | 0.4 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-R0.png` | 0.3 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/pieces/m-R1.png` | 0.3 KB | 작은 도트판 (25px). 2.0(legacy) 배경이 `m-P0`만 쓴다. maker.py `MINI_FILES`에서 다시 켤 수 있다. |
| `public/scenes/act-0.png` | 516.5 KB | 옛 0막 표지. 막 표지는 `act-${Math.min(4, 막+1)}`이라 act-1~4만 부른다. |
| `public/scenes/boss-gilded-4.png` | 136.9 KB | 옛 도금왕 겹 단계 4번째. 게임(`main.ts gildedArt`)은 `boss-gilded`(첫째 왕관) · `-1`~`-3`(둘째~넷째 왕관 · 도전 승급별)만 부른다 — 왕관은 넷뿐이라 `-4`는 자리가 없다. |
| `public/scenes/ending-1.png` | 81.8 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-3.png` | 60.4 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-5.png` | 103.2 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-6.png` | 69.6 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-7.png` | 42.8 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-crew.png` | 95.3 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/ending-peel.png` | 118.8 KB | 옛 13단 엔딩 그림. 지금 결말은 `end-k-*` · `end-t-*` · `end-f-*` · `ending-a` (D-451 마스터 바이블). |
| `public/scenes/entry-battle.png` | 234.5 KB | 옛 출하 입구 장면. 코드가 부르지 않는다 (코드 리뷰 5 — 워밍업에서도 빼 두었던 것). |
| `public/scenes/entry-check.png` | 269.7 KB | 옛 출하 입구 장면. 코드가 부르지 않는다 (코드 리뷰 5 — 워밍업에서도 빼 두었던 것). |
| `public/scenes/epilogue-hands.png` | 54.2 KB | 옛 컷신 그림 (S06 출하 · S07 도금왕 · 에필로그). 지금 프롤로그 · 결말 필름이 부르지 않는다 (이름을 적던 옛 QA 도구 cinematics · campaign-flow는 지웠다 — D-543). |
| `public/scenes/gilded-solitude.png` | 91.0 KB | 옛 컷신 그림 (S06 출하 · S07 도금왕 · 에필로그). 지금 프롤로그 · 결말 필름이 부르지 않는다 (이름을 적던 옛 QA 도구 cinematics · campaign-flow는 지웠다 — D-543). |
| `public/scenes/promote-alarm.png` | 96.8 KB | 옛 승급 컷 시안. 지금 승급 컷은 `promote-crew` · `promote-gild` · `promote-rule`. |
| `public/scenes/promote-betray.png` | 79.2 KB | 옛 승급 컷 시안. 지금 승급 컷은 `promote-crew` · `promote-gild` · `promote-rule`. |
| `public/scenes/promote-dark.png` | 51.3 KB | 옛 승급 컷 시안. 지금 승급 컷은 `promote-crew` · `promote-gild` · `promote-rule`. |
| `public/scenes/returned-box.png` | 104.5 KB | 옛 컷신 그림 (S06 출하 · S07 도금왕 · 에필로그). 지금 프롤로그 · 결말 필름이 부르지 않는다 (이름을 적던 옛 QA 도구 cinematics · campaign-flow는 지웠다 — D-543). |
| `public/scenes/shipping-company.png` | 72.3 KB | 옛 컷신 그림 (S06 출하 · S07 도금왕 · 에필로그). 지금 프롤로그 · 결말 필름이 부르지 않는다 (이름을 적던 옛 QA 도구 cinematics · campaign-flow는 지웠다 — D-543). |
| `public/scenes/shipping-interior.png` | 73.0 KB | 옛 컷신 그림 (S06 출하 · S07 도금왕 · 에필로그). 지금 프롤로그 · 결말 필름이 부르지 않는다 (이름을 적던 옛 QA 도구 cinematics · campaign-flow는 지웠다 — D-543). |
| `public/scenes/throne-mold.png` | 95.0 KB | 옛 승급 화면 그림. 지금 승급은 `promote*.png`. |
| `public/ui/board/target-kill.png` | 0.2 KB | 옛 과녁 표식. 판은 `target-enemy` · `kill`을 쓴다. draw-board.py는 이 폴더로 찍는다. |
| `public/ui/board/target.png` | 0.2 KB | 옛 과녁 표식. 판은 `target-enemy` · `kill`을 쓴다. draw-board.py는 이 폴더로 찍는다. |
| `public/ui/frames/button-pressed.png` | 0.1 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/frames/button.png` | 0.2 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/frames/card-iron.png` | 0.2 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/frames/card-paper.png` | 0.2 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/frames/panel.png` | 0.2 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/frames/slot.png` | 0.1 KB | draw-assets.py의 옛 9-slice 프레임. 지금 UI 크롬은 `src/assets/ui/chrome/`. 도구는 이제 이 폴더로 찍는다. |
| `public/ui/hud/gears-spin.png` | 4.0 KB | 옛 사본. CSS는 묶음 안 `src/assets/ui/kit/gears-spin.png`(tools/pixel/gears_anim.py)를 쓴다. |
| `public/ui/hud/pip.png` | 0.1 KB | 옛 점령 눈금. 부르는 곳이 없다. draw-assets.py는 이 폴더로 찍는다. |
| `public/ui/marks/badge-enemy.png` | 5.0 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/badge.png` | 5.3 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/base-ally.png` | 3.2 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/base-enemy.png` | 4.5 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/move-dot.png` | 0.5 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/select.png` | 4.3 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/target-kill.png` | 5.9 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/marks/target.png` | 4.7 KB | A1 발주 판 표식 (2026-10-30). 지금 판 표식은 `ui/board/` (tools/draw-board.py)가 대신한다. |
| `public/ui/props/ic-bolt.png` | 0.5 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-chain-broken.png` | 0.5 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-coin-back.png` | 0.8 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-coin-edge.png` | 0.5 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-coin-front.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-coin-tilt.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-crown-gold.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-crown-paper.png` | 0.5 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-gear-broken.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-gear-gold.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-gear.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-key.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-lens.png` | 0.9 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-medal-knight.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-medal-pawn.png` | 0.8 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-reject.png` | 0.5 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-rust.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-screw-broken.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-seal-corner.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-seal-slot.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-spring.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-stove.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-tower.png` | 0.6 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/ic-valve.png` | 0.7 KB | ICON-01 기호 24도트판. 사건 무대는 32도트 `ic32-*`만 부른다. tools/pixel/sheet-slice.py는 32가 아닌 크기를 이 폴더로 찍는다. |
| `public/ui/props/lift.png` | 0.5 KB | 2.0 판 지형 소품 5종 (제미나이, D-056 · D-057). 지금 판은 공정 판 칸(`ui/board/proc-sheet*`)을 쓰고, 소품 경로는 `flip-*` · `coin-*` · `chest-*` · `ic32-*`만 짓는다 (2.0도 부르지 않는다). |
| `public/ui/props/scrap.png` | 0.3 KB | 2.0 판 지형 소품 5종 (제미나이, D-056 · D-057). 지금 판은 공정 판 칸(`ui/board/proc-sheet*`)을 쓰고, 소품 경로는 `flip-*` · `coin-*` · `chest-*` · `ic32-*`만 짓는다 (2.0도 부르지 않는다). |
| `public/ui/props/screwbox.png` | 0.3 KB | 2.0 판 지형 소품 5종 (제미나이, D-056 · D-057). 지금 판은 공정 판 칸(`ui/board/proc-sheet*`)을 쓰고, 소품 경로는 `flip-*` · `coin-*` · `chest-*` · `ic32-*`만 짓는다 (2.0도 부르지 않는다). |
| `public/ui/props/shield.png` | 0.4 KB | 2.0 판 지형 소품 5종 (제미나이, D-056 · D-057). 지금 판은 공정 판 칸(`ui/board/proc-sheet*`)을 쓰고, 소품 경로는 `flip-*` · `coin-*` · `chest-*` · `ic32-*`만 짓는다 (2.0도 부르지 않는다). |
| `public/ui/props/trap.png` | 0.2 KB | 2.0 판 지형 소품 5종 (제미나이, D-056 · D-057). 지금 판은 공정 판 칸(`ui/board/proc-sheet*`)을 쓰고, 소품 경로는 `flip-*` · `coin-*` · `chest-*` · `ic32-*`만 짓는다 (2.0도 부르지 않는다). |
| `src/assets/ui/ap-empty.png` | 87.2 KB | 옛 AP 게이지 그림. 지금 태엽은 `ui/icons16/hud.key.*`. 4 KB가 넘어 `preload-bundled`로 묶음에 실리고 있었다. |
| `src/assets/ui/ap-full.png` | 162.3 KB | 옛 AP 게이지 그림. 지금 태엽은 `ui/icons16/hud.key.*`. 4 KB가 넘어 `preload-bundled`로 묶음에 실리고 있었다. |
