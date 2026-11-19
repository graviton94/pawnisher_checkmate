# 영어 용어집 — 제안안 (D-654)

> 결정 11가(영어 출시 · 스팀 「곧 출시」 · 2027년 6월 넥스트 페스트 영어 데모)의 첫 단추. 한국어 정본은 `docs/world.md` §5 · `docs/voice.md` · 마스터 바이블.
> 이 표가 영어의 정본이 된다 — 코드의 영어 글(`src/data/lang/en-*.ts`)은 여기 낱말만 쓴다. **★ = 사용자가 고를 창작 결정** (지금 코드에는 제안안이 들어가 있다).

## 0. 결 (톤) — 영어로 옮길 때의 규칙

- **다키스트 던전 · 디아블로 레지스터**: 짧고 무거운 문장, 고어 한 방울(“the forsaken”, “bear”, “yield”), 농담 · 현대 구어 · 밈 없음. 다키스트 던전의 서술자처럼 단정형, 느낌표는 치명적인 순간에만.
- **갈래는 한국어 그대로 옮긴다** (`docs/voice.md`):
  ① 시스템 — 평서문 현재형, 한 줄 한 사실(“Your king will be hit.”) · ② 팁 — 명령형 권유(“Find the yellow targets first.”) · ③ 독백 — ‘ ’ 짧은 구어, 1인칭 생략(‘Not enough wind.’) · ④ 대사 — “ ” 화자별 말버릇 · ⑤ 묘사 — 판 위는 2인칭 현재(“The belt does not stop.”), 컷신은 3인칭 과거 · ⑥ 카드 — 비장한 한 문장 + (수치) · ⑦ 결과 — 명사구 · ⑧ 단추 — 동사 하나 명령형(Choose · Leave · Erase) · ⑨ 표지 — 대문자 없이 명사 + !(Blocked!).
- **화자 말버릇의 영어 짝**: 도금왕 = 왕의 고어(“We”, “thee/thou” 없이 “you shall”, “Kneel.”) · 철갑 반장 하게체 = 늙은 장인의 훈계조(“Thin things melt, lad.”) · 부관 박차 = 군대식(“Sir.”, “Select a piece.”) · 적 킹 = 냉소 귀족 · 분대원 = 짧고 거친 병사 말.
- **체스 낱말은 체스 그대로**: pawn · knight · bishop · rook · queen · king · check · checkmate · castling · fork · skewer · pin · promotion.
- **세계 낱말은 공장 · 주물 어휘**: foundry · furnace · cast · mould · line · stamp · ship · reject · scrap. 판타지 · SF 어휘(magic, mana, portal, laser)는 쓰지 않는다 — 한국어 규칙 그대로.
- **철자**: 영국식(colour, mould)으로 할지 미국식으로 할지 ★ 한 번 정한다. 제안: 미국식(스팀 주 시장) — 단, 지금 코드의 `Colour-aid`는 정하면 맞춘다.
- **크기**: 영어 글도 D-213 격자(12 · 15 · 24 · 30 · 36 · 45 · 60px)만 쓴다 — 넘치면 글자를 줄이지 않고 낱말을 줄인다(D-653).

## 1. 고정 이름 (작품 · 인물 · 장소)

| 한국어 | 영어 (제안) | 뜻 한 줄 | 결 · 메모 |
|---|---|---|---|
| Pawnisher : Checkmate | Pawnisher: Checkmate | 제목 | 그대로. 영어는 콜론 앞 띄어쓰기 없이 |
| 체크메이트 공장 | the Checkmate Foundry | 체스 기물을 찍는 주물 공장, 무대 | factory보다 foundry — 쇳물 · 주물 결 |
| 종이왕 ★ | the Paper King | 킹 자리에 잘못 들어간 아홉째 폰, 주인공 | 대안: Paper-Crown. “King”이 붙어 반어가 산다 |
| 아홉째 폰 | the Ninth Pawn | 주인공의 정체 | |
| 종이 왕관 | paper crown | 주인공이 접어 쓴 왕관 | |
| 도금왕 ★ | the Gilded King | 모든 킹을 찍어 낸 첫 킹, 최종 보스 | 대안: the Gilt King(가짜 금칠 뉘앙스가 더 세다) |
| 부관 박차 | Spur, the Adjutant | 주인공 곁 나이트 부관 | 이름은 뜻 번역(박차 = spur) |
| 용해 주조기 | the Melting Caster | 왕관을 쓰면 켜지는 주조기 | |
| 금단의 승급대 | the Forbidden Dais | 꼭대기 통제실의 승급 자리 | 스토어 문구는 “forbidden promotion dais” |
| 용광로 | the furnace | 진 세트가 녹는 곳 | |
| 출하구 | the shipping gate | 종막 무대 | |
| 검수 저울 | the Inspection Scales | 시험대 NPC | 판정만 말한다 |
| 녹슨 룩 | the Rusted Rook | 고물상 주인 | 값과 거래만 |
| 외눈 비숍 | the One-Eyed Bishop | 공방 주인 | 일만 |
| 떠돌이 정비 폰 | the Wandering Mechanic | 사건 NPC | |
| 동전 나이트 | the Coin Knight | 사건 NPC(도박) | |
| 견습 폰 | the Apprentice | 사건 NPC | |
| 다른 공장의 흑 비숍 | the Black Bishop of Another Foundry | 사건 NPC | |
| 외눈 정비공 | the One-Eyed Mechanic | 컷신 NPC | |

## 2. 기물 칭호 (`PIECE_LORE`)

| 기물 | 한국어 | 영어 (제안) | 메모 |
|---|---|---|---|
| 폰 | 작은 개척자. | The little pioneer. | |
| 나이트 | 뛰어넘고, 짓밟는 자. | He who leaps, and tramples. | 쉼표를 살린다 |
| 비숍 | 성스러운 빛의 심판자. | Judge of the holy light. | |
| 룩 | 살아 움직이는 요새. | A fortress that walks. | |
| 퀸 | 공장이 벼린 가장 무거운 칼날. | The heaviest blade the foundry ever forged. | |
| 킹 | 화려한 왕관, 잔혹한 무게. | A splendid crown. A cruel weight. | 두 마디로 끊는다 |

## 3. 분대원 별칭 (`src/slice/crew.ts` NAMES — 상태 묘사 이름)

이름은 **별명처럼 대문자 두 낱말 안**으로(“Bent Nail”). 영어 화면에서 이름 칸이 한글 다섯 자 폭이라 12자 안팎.

| 한국어 | 영어 | 한국어 | 영어 |
|---|---|---|---|
| 먼지투성이 | Dusty | 금 간 렌즈 | Cracked Lens |
| 구부러진 못 | Bent Nail | 헐거운 나사 | Loose Screw |
| 이 나간 톱니 | Chipped Cog | 그을린 장갑 | Scorched Glove |
| 벗겨진 페인트 | Peeling Paint | 덜컹이는 바퀴 | Rattlewheel |
| 삐걱거리는 경첩 | Creaky Hinge | 찢긴 가죽끈 | Torn Strap |
| 괴팍한 흠집 | Surly Scratch | 굽은 지렛대 | Crooked Lever |
| 쇳소리 뭉치 | Clank | 새는 기름통 | Leaky Can |
| 흠집투성이 | Scuffs | 휘어진 창살 | Warped Bar |
| 기울어진 축 | Tilted Axle | 깨진 문자판 | Broken Dial |
| 눌어붙은 용접 | Burnt Weld | 끊어진 태엽 | Snapped Spring |

## 4. 시스템 · 규칙 낱말 (화면에 가장 자주 나오는 것)

| 한국어 | 영어 (제안) | 뜻 한 줄 | 결 · 메모 |
|---|---|---|---|
| 태엽 ★ | **Wind** | 행동력(AP). 카드를 쓸 때 든다 | 대안: Spring · Clockwork(길다) · Tension. “Needs 2 wind” · “Wind 3/3”. 짧아서 HUD에 맞는다 — 지금 코드에 들어간 안 |
| 나사 | Screws | 화폐 | “Screws +40”. 대안 Bolts |
| 출하 ★ | **Shipment** | 한 판(런) — 세 공정을 지나 출하구까지 | 동사 “ship”. 대안: Run(게임 용어 그대로, 세계 결 약함) · Batch. 메인 메뉴 시작 단추는 “Start” |
| 정품 / 정품 출하 | genuine / shipped genuine | 출하 합격(완주) | |
| 하자품 ★ | **reject(s)** | 남이 우리를 깔보는 말(진 세트) | “Crawled up from the rejects, have you?” 대안: scrap, defectives |
| 불량품 ★ | **the defective** | 우리가 스스로를 부르는 되찾은 이름 | 진엔딩 “I’ll live as a scratched defective.” 하자품과 영어도 다른 낱말이어야 한다 |
| 폐기 처분 | scrapping / scrapped | 진 세트 · 분대원의 처리 | 킹 쓰러짐 창 명패 “Scrapped” |
| 대국 | match | 전투 한 판 | battle보다 체스 결 |
| 검문! | Checkpoint! | 정예 대국 노드 | |
| 반장 ★ | **Foreman** | 층의 보스(한때 정품 킹) | 대안: Overseer(더 위압적). “Ironplate Foreman” |
| 반장 대국 | foreman match | 보스전 | |
| 왕관 (첫째~넷째) | the First … Fourth Crown | 본편 이야기 단위(장) | 메뉴 “Choose a crown.” |
| 왕관 별칭 | Paper Crown · Rusted Spring · Golden Mercy · Hall of Mirrors | 끝내기 전의 왕관 이름 | 부제(결말)는 끝낸 뒤에만 |
| 왕관 부제 | Ignorance and the First Betrayal · The Pride That Swallowed Another’s Tragedy · The Holiest Exploitation · Seeing, and Release | 끝낸 왕관의 이름 | 스포일러 |
| 분대 | squad | 내 기물들 | 분대원 = squad member |
| 원부 | the Ledger | 쓰러진 분대원 기록 | “scrap ledger” |
| 원수 ★ | **Nemesis** | 내 분대원을 쓰러뜨린 적, 더 세져 돌아온다 | 섀도 오브 모르도르 연상 — 장르 사용자에게 바로 읽힌다. 대안: Grudge |
| 유품 | keepsake | 원수 처치 때 회수하는 나사 가치 | |
| 공정 ★ | **Line** (막) · **machine floor** (공정 판) | ① 막 = 주조 · 조립 · 검수 공정 ② 공정 판 = 판이 기계인 대국(컨베이어 · 프레스 · 자석 레일 · 용광로 · 금 간 바닥) | 막: Casting Line · Assembly Line · Inspection Line. 한국어는 한 낱말이 두 뜻 — 영어는 나눈다 |
| 막 / 종막 | Act / Final Act | 공정 셋 + 출하구 | |
| 부품 | Parts | 지속 효과 장비(렐릭) | 카드 성격 “Part” |
| 명령 카드 | command card | 기물을 움직이는 카드 | |
| 손질 ★ | **Upkeep** | 작업대에서 받는 정비 카드 묶음 | 하위: 정비 Tune-up · 수리 Repair · 다듬기 Hone · 카드 빼기 Scrap a card · 보강 Brace. 대안: Service · Maintenance |
| 작업대 | the Workbench | 손질 · 부품을 받는 노드 | |
| 고물상 | the Scrap Dealer | 상점 | |
| 공방 | the Workshop | 카드 강화 노드 | |
| 돌발 / 사건 | Incident | 이벤트 노드 | |
| 버팀 ★ | **Grit** | 쓰러질 피해를 HP 1로 넘기는 횟수(출하 자원) | “Grit +1”. 대안: Hold(길게 누르기와 겹침) · Last Stand(길다) · Endure |
| 심장 톱니 | Heart Cog | 분대원의 목숨 둘. 둘 다 깨지면 폐기 | 깨진 톱니 = cracked cog |
| 되감기 / 되감기 톱니 | Rewind / Rewind Cog | 이번 턴 처음으로 | 단추 “Rewind” |
| 방열판 ★ | **Heatshield** | 피해를 먼저 받는 보호막 | HUD는 “Shield”로 줄여도 된다. 대안: Plating · Ward |
| 속전 | Blitz | 빨리 이기면 받는 나사 계기 | |
| 열기 | Heat | 턴이 갈수록 오르는 피해 배율 | “Turn 3 · Heat 50%” |
| 연쇄 | Chain | 처치가 이어지면 쌓이는 보너스 | |
| 교착 압박 | Stalemate Pressure | 오래 끌면 적 킹이 녹는 규칙 | |
| 기절 | Stun | 헛친 적 · 받아친 반장의 상태 | |
| 받아치기 | Parry | 반장의 타격을 방열판으로 다 받기 | |
| 가시 반격 | Thorns | 치고 못 쓰러뜨리면 친 쪽이 다침 | |
| 회피 / 회피 반격 | Dodge / Dodge Strike | 예고 칸에서 빠지며 치기 | |
| 제자리치기 | Standing Strike | 폰이 움직이지 않고 대각선을 침 | |
| 승격 | Promotion | 판 위 폰 → 퀸 | 체스 그대로 |
| 승급 ★ | **Coronation** | 꼭대기 승급대에서 킹이 되는 것 | 승격과 영어도 갈라야 한다. 대안: Ascension(옛 「승천」과 겹침) |
| 이형 | Variant | 모양이 다른 기물 · 카드 | |
| 정예 | Elite | 접사 붙은 적 | |
| 거대 주물 | Colossus | 2×2 거대 기물 | “Colossal Rook” |
| 기벽 | Quirk | 분대원 성격(장단점) | 「너무 감긴 태엽」 Overwound · 「납땜 흉갑」 Soldered Cuirass … |
| 흉터 | Scar | 쓰러졌다 돌아온 흔적 | |
| 각인 | Engraving | 카드에 새기는 규칙 | |
| 부적 · 톱니 카드 | Charm · Cog card | 출하 자원 카드 | |
| 시작 세트 | Starting Set | 지휘관 대신 고르는 세트 | 보병 Infantry · 기병 Cavalry · 사제 Clergy · 성채 Citadel |
| 시험대 | the Proving Bench | 온보딩 | |
| 연습판 | Practice Board | 장비 골라 한 판 | |
| 도전 · 난이도 | Challenge · Difficulty 1–10 | 본편 뒤 별도 모드 | |
| 오늘의 도전 | Daily Challenge | 날짜 시드 | |
| 용어집 · 안내서 | Glossary · Guide | | |

## 5. 반장 (보스)

| 한국어 | 영어 (제안) | 별명(`BOSS_EPITHET`) 영어 |
|---|---|---|
| 철갑 반장 | the Ironplate Foreman | He who believed thickness was strength |
| 검수 반장 | the Inspector Foreman | An eye that measures itself by others’ flaws |
| 자석 반장 | the Magnet Foreman | A hand that never let go |
| 경보 반장 | the Alarm Foreman | A red lamp that cannot forgive the one ahead |
| 조립 반장 | the Assembly Foreman | A line that stamps and stamps and is never full |
| 출하 반장 | the Shipping Foreman | Thorns that strike back as hard as they are struck |
| 도금왕 | the Gilded King | Original sin, covered in gold |
| 나이트 · 비숍 · 룩 · 폰 반장 | Knight · Bishop · Rook · Pawn Foreman | |

## 6. 사용자가 고를 것 (★ 모음)

| # | 낱말 | 제안 | 대안 | 왜 결정이 필요한가 |
|---|---|---|---|---|
| 1 | 태엽 | Wind | Spring · Tension · Clockwork | 가장 자주 보는 낱말. HUD 폭 때문에 짧아야 한다 |
| 2 | 출하 | Shipment | Run · Batch | 게임의 한 판 이름 · 스토어 문구의 축 |
| 3 | 반장 | Foreman | Overseer · Warden | 보스 이름 전부에 붙는다 |
| 4 | 하자품 / 불량품 | reject / the defective | scrap / flawed | 진엔딩 마지막 문장이 이 낱말로 닫힌다 |
| 5 | 버팀 | Grit | Hold · Endure · Last Stand | 다키스트 던전 Death’s Door 결 |
| 6 | 방열판 | Heatshield | Plating · Ward | 세계(열 · 쇳물)와 보호막 사이 |
| 7 | 공정 | Line / machine floor | Stage · Process | 한 낱말 두 뜻을 영어는 나눈다 |
| 8 | 손질 | Upkeep | Service · Maintenance | 카드 성격 이름 |
| 9 | 승급 | Coronation | Ascension · Crowning | 승격(Promotion)과 갈라야 한다 |
| 10 | 원수 | Nemesis | Grudge | 장르 연상 vs 고유어 |
| 11 | 종이왕 · 도금왕 | Paper King · Gilded King | Paper-Crown · Gilt King | 주인공과 최종 보스 |
| 12 | 철자 | 미국식 | 영국식 | 한 번 정하면 전 글에 |
