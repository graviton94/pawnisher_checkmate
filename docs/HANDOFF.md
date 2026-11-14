# 인수인계 — 현재 진행 상황 (2026-11-14)

새 세션은 먼저 `CLAUDE.md`(작업 규칙 · 사용자 결정)를 읽고, 그다음 이 문서를 읽는다. 결정의 전체 이력은 `docs/DECISIONS.md`(마지막 D-487).

## 1. 한눈에

- **본편 = 리뉴얼판** `index.html` → `src/slice/` (분대 · 명령 덱 · 3막 출하 · 본편 첫째~넷째 왕관 · 도전 · 오늘의 도전 · 저장). 2.0은 `legacy.html`.
- **버전**: 1.2.0 베타. 베타 테스터 배포본: `v1.2.0-test.20261114.2`(사이드로드 서명 APK · Windows exe). AAB는 `build.yml` 실행 산출물.
- **품질**: `npm test` 355개 통과 · 타입체크 깨끗 · 자동 크롤(도전 6단계 · 본편 넷째 왕관) 오류 0.
- **최근 큰 줄기 (D-481~D-487, 사용자 결정)**: 「판마다 다른 싸움」 — 기획 정본 `docs/gdd/21_variety.md`.
  1. 이형 기물 5종(대포 · 낙타 · 메뚜기 · 대주교 · 총독) — 적으로 먼저 나오고 그 왕관을 깨면 영입 해금 (D-482, `src/data/forms.ts`, 엔진 `rules.ts` 이형 분기)
  2. 적 편성 행동 특성 넷(수리공 · 복수의 맹세 · 방진 · 증원 대기열) + 편성에 맞춘 이형 배치 (D-483, `FOE_MARKS` in `src/slice/cards.ts`)
  3. 거대 주물 2×2(거대 폰 · 룩 · 퀸) — 네 부위 HP 따로, 묶음째 걷고 예고 칸 내리찍기 (D-484, `src/data/giants.ts` · `src/slice/giant.ts`)
  4. 시작 세트 — 기본 셋(표준 · 기마 · 보병) + 왕관 해금 셋(잡종 · 고철 · 무작위 배치) (D-485, `src/data/start-sets.ts`)
  5. 공정 판 — 컨베이어 · 프레스 · 자석 레일 · 용광로 · 금 간 바닥, 반장 기믹과 짝부터, 왕관이 오를수록 자주 (D-486, `src/data/process.ts` · `src/slice/process.ts`)
  6. 곡선 점검 — 반장 판 거대 주물을 넷째 왕관으로 (D-487)
- **기각**: 체크메이트 처형(적 킹을 가두면 즉사)은 사용자가 기각했다.

## 2. 지금 기다리는 것 (사용자 담당)

- **그림**: 이형 5종(흰 · 검 64×64, P-01~05) · 거대 주물 3종(검 128×128, G-01~03) — 발주서 `docs/asset-order-master.md` §0-C. 받으면 `tools/pixel/pieces64.txt`에 `[R:cannon 0]` · `[R:giant 1]` 같은 블록으로 넣고 `python3 -I tools/pixel/maker.py export`. 그 전까지 이형 = 바탕 기물 + 황동 글자 딱지(`BoardRenderer.makePiece`), 거대 = 바탕 기물 두 배를 네 조각으로 자르기(`GIANT_FILL`).
- 공정 판 칸 표시는 기존 판 도트를 빌려 쓰는 중(variant-conveyor · radiator · hammer · crack · chip-magnet). 전용 그림이 필요하면 발주서부터.
- 사용자 플레이 테스트 · 베타 피드백.

## 3. 다음에 할 일 (제안 순서)

1. **그림 반입** — 사용자가 P-01~05 · G-01~03을 주면 D-423 절차(격자 복원 · 픽셀화 · 팔레트 확인 · 게임 연결)로 넣고 딱지 · 자르기 임시본을 걷어낸다.
2. **밸런스 맞춤** — 보통 봇 120출하 왕관 1 · 3 · 4 = 33 · 16 · 6% (묶음 전 34 · 28 · 15%). 셋째 · 넷째 왕관이 꺾였다. 공정 판 · 검문 거대 주물을 꺼도 그대로라 이형 · 편성 특성 몫으로 본다. 높은 왕관은 두뇌(search) 봇 목표 띠(`/balance-check`)로 재고 맞춘다. 세트별: `npm run climb -- --set <id>`.
3. **긴 대국 확인** — 봇이 40턴 상한까지 끄는 대국이 약 0.4%(묶음 전과 같은 비율, 봇 쪽 교착). 크롤에서 넷째 왕관 2막 반장전 31턴 1건. 화면에서 재현해 원인(봇 교착 vs 판 규칙)을 가린다.
4. 그래픽 정본 아티팩트 · 스토리보드 갱신은 사용자가 말할 때만.

## 4. 실행 · 검증

```bash
npm install
npm test                                   # 단위 테스트
npm run build && npx vite preview --port 4173 --strictPort   # 화면 확인 (?debug → window.sliceApi)
npm run climb -- --styles greedy --asc 0,1,2,3 --n 80 --jobs 8 [--set cavalry]   # 퀵 등반 곡선
node tools/qa/crawl.cjs <출력 폴더> <story|challenge|daily> <단계> <시드>          # 자동 플레이 오류 크롤
```

- 화면 증거: 915×412 · DPR 2.625, `production/qa/evidence/`(gitignore). 이번 묶음 = `d483`~`d486`.
- 디버그 API(`?debug`): `sliceApi.begin(seed, level, mode)` · `startAt(act, kind)` · `bossOf(rule, act)` · `setPick()` · `peekAt(pos)` · `botMove()`. 시작 세트 고르기는 메타에 `runs ≥ 1` · `tut`에 `battle`이 있어야 뜬다.

## 5. 빌드 · 배포 (사용자가 요청할 때만, D-080)

- `.github/workflows/build.yml` workflow_dispatch: 입력 `pc` · `release_tag` · `make_key` · `replace_key` · `aab`. 서명 비밀은 GitHub Secrets `SIDELOAD_PASSPHRASE` · `ANDROID_UPLOAD_PASSPHRASE`(값은 절대 출력 · 커밋 금지), 키는 `android/keystore/*.jks.gpg` (D-479, `android/keystore/README.md`).
- 작은 수정마다 APK를 굽지 않는다(사용자 지시) — 묶어서, 요청받을 때만.

## 6. 코드 지도 (리뉴얼판)

| 경로 | 내용 |
| :-- | :-- |
| `src/engine/` | 결정론적 엔진 — `rules.ts` 행마 · 공격(이형 · 거대 부위 포함), `plan.ts` `simulate()` |
| `src/slice/battle.ts` | 대국 상태 · 내 차례 · 적 차례(`enemyPhase` — 편성 특성 · 거대 주물 · 공정 판이 모두 여기서, 미리보기 = 실행) |
| `src/slice/run.ts` | 지도 · 대국 정의 `battleFor`(편성 · 이형 · 거대 · 공정 배치, 지도 rng를 건드리지 않게 판 모양 해시) |
| `src/slice/main.ts` | 화면 흐름 전부(출하 시작 · 시작 세트 고르기 · 지도 · 보상 · 대국) |
| `src/slice/giant.ts` · `process.ts` | 거대 주물 · 공정 판 |
| `src/data/` | 수치 · 문구(forms · giants · process · start-sets · ability-text · hud) |
| `src/view/BoardRenderer.ts` | Phaser 판 — 이형 · 거대 발주 그림(`artKey`, D-489) · 거대 조각 · 공정 칸 · 내리찍기 효과 |
| `src/sim/runbot.ts` · `tools/climb.mjs` | 등반 봇 · 퀵 등반 |
| `tools/qa/` | 자동 크롤 · 화면 검사 도구 (D-477) |
