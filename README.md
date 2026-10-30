# Pawnisher : Checkmate

체스 행마 기반 순차 공격 퍼즐 택틱스 × 로그라이크 등반 게임.

- **처음이라면**: `CLAUDE.md`(작업 규칙) → `docs/HANDOFF.md`(현재 진행 상황·다음 할 일)
- `docs/ideation/` — 초기 아이디에이션 문서 (정본 아님)
- `docs/DECISIONS.md` — Q&A로 확정된 결정 로그 (구현 기준)
- `docs/gdd/` — 정본 기획서 (확정된 장만 구현 기준)

## 개발

```bash
npm install
npm run dev        # 브라우저 개발 서버
npm test           # 단위 테스트
npm run sim -- sim/run.sim.ts   # 자동 등반 시뮬레이션 (SIM_GAMES=100)
```

## 빌드

- **웹**: `npm run build` → `dist/`
- **안드로이드 (M7)**: `npm run android:apk` (안드로이드 SDK·JDK 21 필요) → `android/app/build/outputs/apk/debug/`
  - SDK가 없으면 GitHub Actions의 **Build** 워크플로를 수동 실행(Actions → Build → Run workflow)하면 APK가 아티팩트로 나온다.
  - 출시용 서명(AAB)은 키스토어를 만든 뒤 `android/app/build.gradle`에 signingConfig를 추가한다.
- **PC (M9)**: `npm run pc:dist` → `release/` (Windows NSIS · macOS DMG · Linux AppImage). CI에서도 같이 만든다.
  - 스팀: `npm i steamworks.js` 후 `STEAM_APP_ID`를 설정하면 업적이 켜진다 (`ACT1_CLEAR`~`ACT3_CLEAR`, `ASCENSION_n_CLEAR`).
    스팀 업로드(SteamPipe)·앱 ID 발급은 스팀웍스 계정이 있어야 한다.
