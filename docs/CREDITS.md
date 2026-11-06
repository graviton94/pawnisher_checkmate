# 출처 표기 (게임 크레딧 화면에도 넣는다)

## 아이콘·픽토그램 (도트로 다시 그림 — `tools/pixelize-icons.cjs`)
- **game-icons.net** — Lorc, Delapouite 외 기여자. [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  쓴 아이콘: broadsword, arrowhead, flame, shield, brick-wall, death-skull, horseshoe, flying-flag, crown, scales, anvil, ancient-screw, wooden-crate, wrench, lever.
  변경: 16×16(해골 7) 도트로 줄이고 문턱값으로 잘라 흰색 실루엣으로 바꿈. (종이 왕관은 D-050부터 직접 찍은 도트)
- **Tabler Icons** — Paweł Kuna. [MIT](https://github.com/tabler/tabler-icons/blob/main/LICENSE).
  쓴 아이콘: arrows-split-2, ripple, link, droplet-filled, spiral, arrows-exchange, hand-grab, key-filled, clock-filled, bell-filled, star-filled, eye-filled, target, cards-filled, question-mark.

## 글꼴
- **갈무리 (Galmuri)** — Lee Minseo. SIL OFL 1.1.

## FX 기법 (D-249)
- 도트 FX 엔진 `src/view/pxfx.ts`는 pixelfx(https://github.com/patch-gg/pixelfx, MIT, © 2026 Patch · Hugo Duprez)와 Sprite Fusion의 pixel art VFX(https://www.spritefusion.com/pixel-art-vfx, MIT, © 2026 Hugo Duprez)의 기법(색 · 빛 두 버퍼, 베이어 디더 알파, 입자 종류와 움직임, 플레어 빛)을 참고해 우리 코드로 다시 짰다.
