# 현재 게임의 이야기와 진행 정본 (D-451)

2026-11-13. 사용자가 가져온 **마스터 바이블** [`master-bible.md`](master-bible.md)이 이야기 · 대사 · 말투의 정본이다. 이 문서는 바이블이 게임 진행에 어떻게 연결됐는지만 적는다. D-425의 「본편 3장 + 아이 · 부모 에필로그」는 대체되었다.

## 구조

- **본편 = 1~4승천.** 한 승천 = 한 번의 출하(1막 · 2막 · 3막 · 종막). 승천마다 **새 아홉째 폰**이 주인공이고, 기억을 잇는 것은 플레이어뿐이다.
- 전투 난이도는 기존 인덱스 0~3을 그대로 쓴다(수치 조정 없음). 4승천을 마치면 선택 도전(인덱스 4~13, 10단계)이 열린다. `src/data/campaign.ts` (`STORY_COUNT = 4`, `CHALLENGE_START = 4`).
- **1~3승천**: 왕위 결정 화면의 단추는 [돌아본다] [왕관을 쓴다]뿐 — 반드시 왕관을 쓰고 왕이 된 결말(END-K: 용해 주조와 지연된 배신)을 본다. 그 왕이 다음 승천의 도금왕이 되고, 그가 새긴 규정(LAW)이 다음 승천의 그림자 컷에 나온다.
- **4승천**: [왕관을 쓴다] [왕관을 던진다]. 던지면 진엔딩(END-T: 왕관을 주조기 톱니에 던져 부수고 하얀 땅으로 걸어 나감). 써도 4승천 완주로 기록되고, 다시 도전해 진엔딩을 볼 수 있다.
- 반장 여섯은 **불살 패배** — 쓰러뜨린 반장을 녹이지 않고 지나간다. 격파 컷 끝의 종이왕 속마음(STG-PROG)은 그 출하에서 몇 번째 반장인가 × 몇 승천인가로 고른다.

## 실행 연결

| 장면 | 바이블 ID | 코드 |
|---|---|---|
| 프롤로그 · 그림자 컷 | PRO · SHD-A(같은 승천 재도전) · SHD-B(2~4승천 시작) | `script.ts` `PROLOGUE` · `shadowCut(ch, law, retry)` — 재도전 판정은 `storyAttempts` |
| 막 입구 카드 | ACT-2~4 (ACT-1은 화면에 안 나온다) | `ACT_CARD` |
| 동료 장면 | CO-1~3 (CO-2는 승천별) | `companion-scenes.ts` |
| 반장 등장 · 격파 | BOS · STG-PROG | `BOSS_STORY` · `BOSS_CARD` · `stageProg` · `main.ts bossFallCut` |
| 도금왕 | GLD | `GILDED_STORY` |
| 왕위 결정 | THR | `TESTIMONY` · `THRONE_TEXT` · `promotion.ts` |
| 결말 · 패배 | END-K · END-T · END-F · LAW | `promotionCuts` · `trueEndingCuts` · `DEFEAT` · `STORY_LAW` |
| 전투 · 튜토리얼 · 사건 | PART III · IV | `crew.ts DEATHS` · `hud.ts` · `tutorial.ts` · `events.ts` · `event-talk.ts` · `event-outcome.ts` |

- 컷신은 글자 수 제한이 없다. 자막 띠(두 줄)는 그대로 두고 `uikit.cutPages`가 긴 줄을 문장 단위로 나눠 쪽을 넘긴다.
- 결말에서 소리치는 동료는 부관 박차가 살아 있으면 박차, 아니면 약속한 동료 · 살아 있는 첫 동료. 죽은 동료는 말하지 않는다.
- 사건 창은 가장 작은 화면(667×375)의 두 줄 예산이 있어 바이블의 사건 줄 일부를 짧게 줄였다(D-451 목록).
- 리뷰용 전체 대본은 `docs/storyboard.md`(`npx jiti tools/storyboard.ts`).

## 그림

새 결말 · 3막 장면 S-13~S-20을 발주했다(`docs/asset-order-master.md` §0-B). 받기 전에는 컷의 `alt` 그림이 자동으로 쓰인다. 옛 진엔딩의 운송 상자 · 아이 · 부모 그림(`shipping-company` · `epilogue-hands`)과 반품 상자(`returned-box`)는 지금 이야기에서 쓰지 않는다(파일은 보존).
