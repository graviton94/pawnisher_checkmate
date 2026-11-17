# 출처 표기 — 스튜디오 페이지(https://graviton94.github.io/)에 적고, 게임 안에서는 설정 → 제작 쪽에 라이선스 전문과 함께 둔다 (D-530 — 크레딧 장면은 D-286대로 두 줄). 목록은 `src/data/licenses.ts`와 같이 고친다

## 아이콘·픽토그램 (도트로 다시 그림 — `tools/pixelize-icons.cjs`)
- **game-icons.net** — Lorc, Delapouite 외 기여자. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  쓴 아이콘: broadsword, arrowhead, flame, shield, brick-wall, death-skull, horseshoe, flying-flag, crown, scales, anvil, ancient-screw, wooden-crate, wrench, lever.
  변경: 16×16(해골 7) 도트로 줄이고 문턱값으로 잘라 흰색 실루엣으로 바꿈. (종이 왕관은 D-050부터 직접 찍은 도트)
- **Tabler Icons** — Paweł Kuna. [MIT](https://github.com/tabler/tabler-icons/blob/main/LICENSE).
  쓴 아이콘: arrows-split-2, ripple, link, droplet-filled, spiral, arrows-exchange, hand-grab, key-filled, clock-filled, bell-filled, star-filled, eye-filled, target, cards-filled, question-mark.

## 소리 (D-540 · D-545)
- **효과음 전부** (`public/audio/sfx/`, 36종 53파일) — 자체 합성. `tools/audio/sfx_synth.py`(numpy/scipy 모드 합성 · 래칫 · 증기 · 종이 잡음)로 찍었다. **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/)으로 공개한다. 외부 묶음(kenney.nl · OpenGameArt · Freesound)은 작업 환경 네트워크 정책(프록시 403)으로 받지 못해 쓰지 않았다.
- **배경 음악** (`public/audio/music/`, D-545) — 자체 작곡(`tools/audio/bgm_game.py`, 악보 `tools/audio/midi/game-*.mid`). 음색은 **FluidR3_GM** 사운드폰트로 렌더했다: Copyright © 2000–2002, 2008 Frank Wen, © 2008 Toby Smithe — **MIT License** (게임 안 고지 전문: 설정 → 만든 사람, `src/data/licenses.ts`). 렌더한 소리만 싣고 사운드폰트 파일은 싣지 않는다.
- **배경 음악 「톱니 칩」 C1** (`public/audio/music/gear.*` · `gear-boss.*`, D-548 — 고물상 · 작업대 · 사건 · 검문) — 자체 작곡 · 자체 칩 합성(`tools/audio/bgm_game.py`의 `gear`, 펄스 · 삼각 · 잡음 파형만, 사운드폰트 없음). **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/)으로 공개한다.
- **배경 음악 시안** (`build-res/audio/bgm-concepts/`, 게임에 넣지 않음) — 자체 작곡(`tools/audio/bgm_concepts.py`). A · B · D는 FluidR3_GM(위와 같음) 렌더, C1 · C2(D-545 재시안)는 자체 칩 합성 — C1은 D-548로 게임에 들어갔다(위).

## 글꼴
- **갈무리 (Galmuri)** — Lee Minseo. SIL OFL 1.1.

## FX 기법 (D-249)
- 도트 FX 엔진 `src/view/pxfx.ts`는 pixelfx(https://github.com/patch-gg/pixelfx, MIT, © 2026 Patch · Hugo Duprez)와 Sprite Fusion의 pixel art VFX(https://www.spritefusion.com/pixel-art-vfx, MIT, © 2026 Hugo Duprez)의 기법(색 · 빛 두 버퍼, 베이어 디더 알파, 입자 종류와 움직임, 플레어 빛)을 참고해 우리 코드로 다시 짰다.
