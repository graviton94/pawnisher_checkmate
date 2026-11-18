# 카드 앞면 레퍼런스 해부 — 도트 덱빌더 14 + 비도트 기준 2 (D-576)

> 사장님 (2026-11-18): 「디자인 자체가 밋밋하다 … 다른 픽셀아트 컨셉 덱빌딩 카드게임들 참고 좀 해봐라.」 1차 시안 A ~ D(D-574) 반려 → 앞면만 다시.
> 출처: 링크만 둔다(다른 게임 화면을 옮기지 않음). 작업 망에서 위키 본문(wiki.gg 등)이 열리지 않아 웹 검색 요약 + 실제 화면 기억으로 적었다 — 「기억 — 링크로 확인」은 확인이 필요한 칸. 시안 쪽: 「카드 앞면 시안」 아티팩트(2차 E · F · G).

## 배운 것 다섯 줄

1. **그림이 주인공** — Balatro 앞면 85%가 그림, Monster Train은 몸 폭. 1차 시안은 그림 창이 작고 뒤가 단색이라 밋밋했다 → 창 속에 장면 겹(벽돌 · 기둥 · 원근 판 바닥 · 화구 · 체스판 칸)을 넣고 투명한 곳으로 축 색 디더가 비치게.
2. **테는 겹으로** — 바깥 먹 → 빛 · 그늘 → 홈 → 안 판 → 움푹한 글 칸(Slay the Spire · Darkest Dungeon). 1차는 한두 겹.
3. **이름은 테를 깨고 나온다** — StS 리본 · 비용 구슬, Monster Train 그림 위 이름 판. 카드 줄에서 실루엣이 먼저 읽힌다.
4. **등급은 색 + 모양** — Dicey Dungeons는 색만이라 팬이 기호 모드를 만들었다. 등급 = 재질 색 + 개수(징 · 등불 1 · 2 · 3), UI 원칙 4.
5. **물건이어야 한다** — Shogun Showdown 패 두께 · Balatro 단단한 그림자 · Card Shark 소품 카드 = 「작업대 위의 물건」(D-259).

## 한 장 표

| 게임 | 비율 · 그림 몫 | 테 · 겹 | 등급 · 종류 | 글 · 이름 · 비용 | 깊이 · 움직임 |
|---|---|---|---|---|---|
| **Balatro**<br>[Steam](https://store.steampowered.com/app/2379780/Balatro/) · [스프라이트 71×95 관측](https://steamcommunity.com/app/2379780/discussions/0/575995078023067463) | 조커 71×95 도트(2배 자산 142×190, 둘레 1도트 여백) · 3:4에 가깝다. 그림이 앞면의 85% 이상 — 카드 위에 글이 없다 | 얇은 크림 테 + 1도트 짙은 외곽 + 둥근 귀. 겹은 적고 그림 자체가 꽉 찬 한 장 | 등급은 카드 밖 풀이 창의 색 알약(일반 파랑 · 흔치 않음 초록 · 희귀 빨강 · 전설 보라). 에디션(박 · 홀로 · 다색 · 음화)은 카드 전체에 덮는 셰이더 빛 | 이름 · 효과 · 값은 올리면 뜨는 풀이 창(둥근 판 + 등급 알약). 비용은 상점 값표로 카드 위에 걸림 | 오른아래 단단한 그림자 · 마우스 따라 기울임 · 고를 때 출렁이며 들림 · 박 빛 띠가 늘 흐름 |
| **Cobalt Core**<br>[Steam](https://store.steampowered.com/app/2179850/Cobalt_Core/) · [위키 카드](https://cobaltcore.wiki.gg/wiki/Cards) | 세로 카드, 위 40% 안팎이 그림 창, 아래가 아이콘 줄(공격 · 방패 · 이동을 그림 기호로) | 짙은 몸 + 승무원 색 얇은 테 · 이름 띠. 겹은 2 ~ 3단으로 단정 | 종류 = 승무원(캐릭터) 색 · 강화 A/B는 같은 카드의 다른 판. 소진 · 임시 같은 성질은 아래 작은 아이콘 딱지 | 비용은 왼쪽 위 원. 규칙 글보다 아이콘 + 숫자 — 작은 크기에서도 한눈에 읽힌다 | 손패 부채꼴 · 고르면 위로 들림 · 낼 수 없으면 어둡게 |
| **Loop Hero**<br>[Steam](https://store.steampowered.com/app/1282730/Loop_Hero/) · [PC Gamer 디자인 상](https://www.pcgamer.com/best-design-2021-loop-hero/) | 작은 세로 카드 = 거의 타일 그림 한 장. 글은 올리면 뜨는 풀이 창 | 어두운 테 한 겹 + 그림. 장식보다 팔레트 절제 | 종류(길 · 길가 · 지형 · 특수)를 테 색과 그림 모양으로 | 이름 · 효과는 카드 밖 풀이 | 아주 적은 팔레트 + 규칙 디더(리뷰: 「ordered dithering」) · 타일이 살짝 겹쳐 깊이 |
| **Slice & Dice**<br>[Steam](https://store.steampowered.com/app/1775490/Slice__Dice) · [리뷰](https://turnbasedlovers.com/review/slice-and-dice-review/) | 카드 대신 주사위 면 — 면 하나가 아이콘 + 숫자 핍 | 굵은 먹 외곽 · 평평한 색 · 면마다 같은 틀 | 물건 등급 = 단계 숫자 + 색. 핍(점) 개수로 세기 | 숫자는 아이콘 귀퉁이 작은 도트 숫자 | 굴림 · 착지 출렁 |
| **Shogun Showdown**<br>[Steam](https://store.steampowered.com/app/2084000/Shogun_Showdown/) · [리뷰(마작 패)](https://www.analogstickgaming.com/game-reviews/2024/10/7/shogun-showdown) | 공격 「패」 = 마작 패 같은 작은 세로 판, 앞면 아이콘 하나 | 상아 앞면 + 아래로 보이는 두께 층(다른 색) + 먹 외곽 + 그림자 — 손에 잡히는 물건 | 강화는 패 위 작은 표시 · 아이콘 색 | 대기(쿨다운) 숫자를 패 귀퉁이에 | 쌓기 · 꺼낼 때 튀어 오름 |
| **Dicey Dungeons**<br>[Steam](https://store.steampowered.com/app/861540/Dicey_Dungeons/) · [미술 인터뷰](https://cliqist.com/2019/07/02/marlowe-dobbe-on-the-art-of-dicey-dungeons/) · [색약 기호 모드](https://matzie.itch.io/dicey-colorblind) | 장비 카드(도트 아님 · 평면 벡터) — 가운데 큰 주사위 칸이 주인공 | 굵은 외곽 · 평평한 몸 색 · 둥근 귀 | 효과 갈래 = 몸 색(불 빨강 · 약화 주황 · 감전 노랑 · 회복 초록 · 얼음 파랑). 색만으로는 부족해 팬이 기호 모드를 만들었다 | 이름 위 띠 · 규칙 글은 주사위 칸 아래 한두 줄 | 쓰면 접히며 사라짐 |
| **Inscryption (2막 도트)**<br>[Steam](https://store.steampowered.com/app/1092790/Inscryption/) · [2막 GBC 문법](https://inscryption.fandom.com/wiki/Sigils) | 2막은 GBC풍 도트 카드 — 초상 칸 + 아래 귀퉁이 공 · 체 숫자 + 인장 아이콘 | 크림 종이 몸 + 먹 테 · 4 ~ 5색 팔레트 | 진영(서기관)마다 카드 몸 색 · 문양 | 이름은 위 띠, 숫자는 큰 도트 숫자 | 가볍게 흔들림 · 놓을 때 쿵 |
| **Card Quest**<br>[리뷰](https://www.keengamer.com/articles/reviews/card-quest-review/) | 도트 카드 · 위 그림 창 + 아래 효과 (기억 — 링크로 확인) | 두꺼운 테 + 종류 색 | 공격 · 방어 · 체력 갈래 색 | 비용(체력 · 기력) 귀퉁이 | — |
| **Dungeon Drafters**<br>[리뷰](https://turnbasedlovers.com/review/dungeon-drafter-a-pixel-perfect-tactical-roguelite-impressions/) · [크레딧](https://www.mobygames.com/game/202318/dungeon-drafters/) | 도트 카드 · 위 절반 삽화(카드 삽화 전담 작가) + 아래 효과 칸 | 단단한 테 · 효과 칸 움푹 | 원소 · 종류 색 (기억 — 링크로 확인) | 비용 귀퉁이 · 효과 아이콘 | 리뷰: 「도트는 좋고 효과(FX)는 적다」 |
| **Floppy Knights**<br>[보도 자료](https://www.rosecitygames.com/floppy-knights-press) | 손그림(도트 아님) · 유닛 카드 안에 이동 칸 격자를 그림으로 | 굵고 깨끗한 테 | 진영 색 | 이동 범위를 카드 위 작은 판으로 | — |
| **Astrea: Six-Sided Oracles**<br>[Steam](https://store.steampowered.com/app/1755830/Astrea_SixSided_Oracles/) · [리뷰](https://www.superjumpmagazine.com/astrea-six-sided-oracles-review/) | 주사위 면 = 작은 판, 정화 · 타락 두 갈래 | 손그림 2D · 면마다 같은 틀 | 정화(파랑) · 타락(보라) 색 + 기호 | 숫자 · 아이콘 | — |
| **Vault of the Void**<br>[Steam](https://store.steampowered.com/search/?term=Vault+of+the+Void) | 덱 20장 고정 덱빌더 · 카드 위 그림 · 아래 효과 (기억 — 링크로 확인) | 어두운 테 | 등급 = 테 색 | 비용 왼쪽 위 | — |
| **Luck be a Landlord**<br>[Steam](https://store.steampowered.com/app/1404850/Luck_be_a_Landlord/) · [보도 자료](https://www.trampolinetales.com/lbal/presskit) | 카드가 아닌 기호 타일 — 칸 하나에 기호 하나 | 테 없이 기호만 · 고를 때 판 안에 띄움 | 등급을 이름 글자 색으로 (기억 — 링크로 확인) | 설명은 풀이 창 | 돌림판 멈출 때 출렁 |
| **Card Shark**<br>[Steam](https://store.steampowered.com/search/?term=Card+Shark) | 도트 아님 · 손으로 그린 18세기 그림 속 실제 카드 소품 | 카드는 장면 속 물건(탁자 · 손) | — | — | 손 연기 · 카드가 실제로 움직임 |
| **Slay the Spire (비도트 기준)**<br>[Steam](https://store.steampowered.com/app/646570/Slay_the_Spire/) · [위키 카드](https://slay-the-spire.fandom.com/wiki/Cards) | 세로 카드 · 그림 창 약 45% · 아래 설명 | 캐릭터 색 몸 + 그림 창 테 + 이름 리본이 몸 밖으로 나온다 · 비용 구슬이 왼쪽 위 테를 깨고 걸침 | 등급 = 이름 리본 · 테 색(회색 · 파랑 · 금). 종류 = 그림 창 모양(공격 아래가 뾰족 · 스킬 네모 · 파워 둥근 창) | 종류 글자 작은 판(그림 아래) · 강화 이름 초록 + | 손패 부채꼴 · 올리면 커짐 · 낼 수 있으면 파란 테 빛 |
| **Monster Train (비도트 기준)**<br>[Steam](https://store.steampowered.com/app/1102190/Monster_Train/) · [MT2 카드 자료](https://bloxodes.com/wiki/monster-train-2/cards) | 그림 창이 몸 폭 가득 · 위 절반 이상 | 두꺼운 장식 테 · 아래 귀퉁이에 공 · 체 판 | 종류 = 테 모양(유닛 · 주문) · 씨족 = 문양 색 · 등급 = 테 장식 (기억 — 링크로 확인) | 이름 띠가 그림 아래를 가로지른다 | 고를 때 들림 · 빛 테 |

## 게임마다 가져올 것

- **Balatro** — 단단한 그림자 · 「고른 카드는 들리고 출렁」 · 등급 빛 띠를 틀 위에 따로 얹는 겹(우리는 계단 프레임으로) · 등급을 글자 알약으로도
- **Cobalt Core** — 짙은 몸 + 얇은 색 테(등급 색이 테에서 읽힘) · 아래 아이콘 딱지(우리 꼬리표 자리)
- **Loop Hero** — 그림 창 배경을 규칙 디더(2×2 · 4×4)로 깊이 있게 — 납작한 단색 금지
- **Slice & Dice** — 등급을 색 + 개수(징 1 · 2 · 3)로 — 색약에도 읽힌다(UI 원칙 4)
- **Shogun Showdown** — 카드에 두께(아래 3 ~ 5도트 층)를 보여 「작업대 위의 물건」으로 — 두께 층 색 = 등급 (G)
- **Dicey Dungeons** — 반면교사: 등급 · 갈래를 색만으로 두지 않는다 — 모양(징 개수 · 등불 수)을 같이
- **Inscryption (2막 도트)** — 초상 칸 뒤에 배경이 있는 「작은 장면」 · 팔레트 절제
- **Card Quest** — 두꺼운 테가 작은 화면에서 카드 덩어리를 세운다
- **Dungeon Drafters** — 삽화를 카드마다 다르게(장면) 두면 도트 카드도 고급스러워진다 — 우리는 창 배경 겹으로
- **Floppy Knights** — 체스 게임답게 카드 안에 「판」(체스 칸)을 넣는다 — G의 판 칸 창
- **Astrea: Six-Sided Oracles** — 좋음 · 나쁨 두 갈래를 재질로 — 우리 청록(내 편) · 녹(손해)
- **Vault of the Void** — 어두운 몸 + 등급 색 테 — 한 줄로는 약하다는 것도(색 테만으로는 등급이 늦게 읽힌다)
- **Luck be a Landlord** — 반면교사: 틀이 없으면 수집 맛이 약하다 — 우리는 틀이 물건이어야 한다
- **Card Shark** — 카드는 장면 속 물건 — 「작업대 위의 물건」(D-259)과 같다
- **Slay the Spire (비도트 기준)** — 몸 밖으로 나온 이름 리본 · 비용이 테를 깨고 걸침 · 리본 색 = 등급 (E)
- **Monster Train (비도트 기준)** — 그림을 몸 폭까지 키우고 이름 판을 그림 위에 「건다」 (F)

## 2차 시안에 쓴 곳 (D-576)

- **E 훈장 명판** — StS 몸 밖 이름 리본 · 비용이 테를 깨고 걸침 + Balatro 단단한 그림자 · 빛 띠 + Darkest Dungeon 철 테 + Loop Hero 규칙 디더 배경.
- **F 용광로 액자 (추천)** — Monster Train 몸 폭 그림 · 그림 위 이름 판 + Cobalt Core 짙은 몸 · 얇은 색 테 + Inscryption 초상 칸 속 작은 장면 + Dungeon Drafters 카드마다 장면.
- **G 주철 패** — Shogun Showdown 패 두께 + Balatro 한 덩어리 몸 · 그림자 + Floppy Knights 카드 안의 판 + Slice & Dice 핍 개수.
- 공통으로 버린 것: Balatro 셰이더(부드러운 빛 번짐 — D-216 금지) → 계단 프레임 사선 띠로. Loop Hero · LBAL처럼 카드 위 글을 없애는 것 → 우리는 카드 글 예산(D-511 · D-515)이 정본이라 글 칸은 그대로.
