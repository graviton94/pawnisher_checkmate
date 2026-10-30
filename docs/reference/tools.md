# 개발 도구 레퍼런스

출처: [ellisonleao/magictools](https://github.com/ellisonleao/magictools) (MIT 목록) 중 우리 스택(웹·Phaser·도트·모바일)에 맞는 것만 골랐다.
UI/UX 기준: [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT, `.claude/skills/ui-ux-pro-max/`에 포함).
작업 방식·품질 게이트: [Donchitos/Claude-Code-Game-Studios](https://github.com/Donchitos/claude-code-game-studios) (MIT) — `CLAUDE.md`, `.claude/skills/{ux-review,balance-check,run-and-observe}`로 우리 스택에 맞춰 옮김.

## 도트 그래픽 (사용자 에셋 작업용)
- **Aseprite** / 무료 포크 **LibreSprite** — 도트·애니메이션 표준 도구
- **Piskel** — 브라우저 도트 편집기
- **Palette Extractor** — 기존 이미지에서 팔레트 추출 (아이콘 톤 유지용)
- **Sprite Sheet Builder** / **AnimGen** — 프레임을 스프라이트시트로 (Phaser용 JSON 출력)
- 아이콘 소스: **game-icons.net** (무료, CC BY), **Kenney Assets** (CC0)

## 사운드 (M6 연출용)
- **jfxr** (브라우저, Bfxr JS 포트) · **ChipTone** · **Bfxr** — 도트 톤에 맞는 효과음 생성

## 엔진·프레임워크
- **Phaser** (사용 중) — 2D HTML5 게임 프레임워크

## 우리 저장소의 도구
- `tools/observe.cjs` — 실제 화면 조작·스크린샷 (`/run-and-observe`)
- `sim/*.sim.ts` — AI 대전·자동 등반 시뮬레이션 (`/balance-check`)
- `.claude/skills/ui-ux-pro-max/scripts/search.py` — UI/UX 가이드 검색
