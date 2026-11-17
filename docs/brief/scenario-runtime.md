# 현재 게임의 이야기와 진행 정본 (D-451)

2026-11-13. 사용자가 가져온 **마스터 바이블** [`master-bible.md`](master-bible.md)이 이야기 · 대사 · 말투의 정본이다. 이 문서는 바이블이 게임 진행에 어떻게 연결됐는지만 적는다. D-425의 「본편 3장 + 아이 · 부모 에필로그」는 대체되었다.

## 구조

- **본편 = 첫째~넷째 왕관.** 한 왕관 = 한 번의 출하(1막 · 2막 · 3막 · 종막). 왕관마다 **새 아홉째 폰**이 주인공이고, 기억을 잇는 것은 플레이어뿐이다.
- 전투 난이도는 기존 인덱스 0~3을 그대로 쓴다(수치 조정 없음). 넷째 왕관을 마치면 선택 도전(인덱스 4~13, 10단계)이 열린다. `src/data/campaign.ts` (`STORY_COUNT = 4`, `CHALLENGE_START = 4`).
- **첫째~셋째 왕관**: 왕위 결정 화면의 단추는 [돌아본다] [왕관을 쓴다]뿐 — 반드시 왕관을 쓰고 왕이 된 결말(END-K: 용해 주조와 지연된 배신)을 본다. 그 왕이 다음 왕관의 도금왕이 되고, 그가 새긴 규정(LAW)이 다음 왕관의 그림자 컷에 나온다.
- **넷째 왕관**: [왕관을 쓴다] [왕관을 던진다]. 던지면 진엔딩(END-T: 왕관을 주조기 톱니에 던져 부수고 하얀 땅으로 걸어 나감). 써도 넷째 왕관 완주로 기록되고, 다시 도전해 진엔딩을 볼 수 있다.
- 반장 여섯은 **불살 패배** — 쓰러뜨린 반장을 녹이지 않고 지나간다. 격파 컷 끝의 종이왕 속마음(STG-PROG)은 그 출하에서 몇 번째 반장인가 × 몇째 왕관인가로 고른다.

## 실행 연결

| 장면 | 바이블 ID | 코드 |
|---|---|---|
| 프롤로그 · 그림자 컷 | PRO · SHD-A(같은 왕관 재도전) · SHD-B(둘째~넷째 왕관 시작) | `script.ts` `PROLOGUE`(9컷 — PRO-01의 2 · 3줄은 OP-01 `op-windup` 컷, D-509 · D-512 · PRO-04의 3 · 4줄은 OP-03 `op-legend` 컷, D-514) + `PROLOGUE_FIELD`(PRO-08 — 처음 출하는 시험대 뒤 첫 실전 대국 직전 `main.onboarding`, 그 밖에는 프롤로그 끝, D-536) · `shadowCuts(ch, law, retry)`(SHD-B 2~3줄은 `law-plate`, D-510 · 4줄 속마음은 왕관 시작 그림 `crown-2-open` · `crown-3-open` · `crown-4-open`(CN-01~03), D-516 — 글 · 줄 ID는 `shadowCut`) — 재도전 판정은 `storyAttempts` |
| 막 입구 카드 | ACT-2~4 (ACT-1은 화면에 안 나온다) | `ACT_CARD` · `main.ts actCard` — 그림 `act-2`(AC-02) · `act-3`(ACT-3은 쇠사슬 소리만 — 문은 CO-3 `chained-door`에서 처음, D-536) · `act-4`(AC-03), `act-1`(AC-01)은 대신 그림, D-519 |
| 동료 장면 | CO-1~3 (CO-2는 왕관별) | `companion-scenes.ts` |
| 반장 등장 · 격파 | BOS · STG-PROG | `BOSS_STORY` · `BOSS_CARD` · `stageProg` · `main.ts bossFallCut` |
| 도금왕 | GLD | `GILDED_STORY` · `gildedCard(chapter)`(등장 띠 — 둘째~넷째 왕관은 지난 왕의 몰락 독백을 되받는 왕관별 첫 말, D-536) |
| 왕위 결정 | THR | `testimony(chapter, prev)`(THR-2는 앞 왕관에서 녹은 동료 이름, D-536) · `THRONE_TEXT` · `promotion.ts` |
| 결말 · 패배 | END-K · END-T · END-F · LAW | `promotionCuts`(END-K 7컷 — 바이블 컷을 ED-02~05 그림으로 나눔, D-510 · 3-2 속마음은 왕관별 왕좌 그림 CN-04 `crown-1-throne` · CN-05 `crown-2-throne` · CN-06 `crown-3-throne`에, D-516 · D-519) · `trueEndingCuts`(END-T 6컷 — 바이블 컷을 ED-06~08 그림으로 나눔, D-514) · `DEFEAT_CUTS`(END-F 3컷 = ED-09 `end-fail` · ED-10 `end-f-box` · ED-11 `end-f-unwind` → 맺음 카드, D-516) · `STORY_LAW` · 그림자 컷 재생 `shadowCuts`(SHD-B 2~3줄 = `law-plate` · 4줄 = 왕관 시작 그림) |
| 전투 · 튜토리얼 · 사건 | PART III · IV | `crew.ts DEATHS` · `hud.ts` · `tutorial.ts` · `events.ts` · `event-talk.ts` · `event-outcome.ts` |

- 컷신은 글자 수 제한이 없다. 자막 띠(두 줄)는 그대로 두고 `uikit.cutPages`가 긴 줄을 문장 단위로 나눠 쪽을 넘긴다.
- 결말에서 소리치는 동료는 부관 박차가 살아 있으면 박차, 아니면 약속한 동료 · 살아 있는 첫 동료. 죽은 동료는 말하지 않는다. 박차가 아니면 제 기물 말투로 같은 뜻을 말한다(`script.ts CRY`, D-536 — 박차는 첫째 왕관에만 있어 진엔딩은 늘 기물 말투).
- 앞 왕관의 이름 (D-536): 출하 기록 `crownedKings[].companions`(왕관을 쓴 결말에서 녹은 동료) → 둘째 왕관 CO-2-A2-2 벽 글씨 서명 · THR-2 태엽 이름(`main.pastCompanions`) · 진엔딩 문틀(END-T-3-2b, `StoryCompany.past`).
- 왕관 부제 (D-536): 「무지와 첫 배신」 같은 부제는 결말을 말해 버린다 — 끝낸 왕관(왕관 선택 · 메뉴의 다시 하기 · 결말 직후 결과)에만 보이고, 그 밖(메뉴 · 이어하기 · 지도 · 그림자 컷 · 왕위 결정)은 별칭(`CHAPTERS[].alias` — 종이 왕관 · 녹슨 태엽 · 금빛 자비 · 거울 복도, `campaign.chapterTitle`).
- 사건 창은 가장 작은 화면(667×375)의 두 줄 예산이 있어 바이블의 사건 줄 일부를 짧게 줄였다(D-451 목록).
- 리뷰용 전체 대본은 `docs/storyboard.md`(`npx jiti tools/storyboard.ts`).

## 그림

새 결말 · 3막 장면 S-13~S-20을 발주했다(`docs/asset-order-master.md` §0-B). 받기 전에는 컷의 `alt` 그림이 자동으로 쓰인다. 옛 진엔딩의 운송 상자 · 아이 · 부모 그림(`shipping-company` · `epilogue-hands`)과 반품 상자(`returned-box`)는 지금 이야기에서 쓰지 않는다(파일은 보존).
