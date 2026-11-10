# Piskel 기물 정본 (2026-11-05)

지금 게임에 쓰는 기물 13장을 한 장씩 꺼내 둔 폴더다. 출처는 `tools/pixel/pieces64.txt`이고, `python3 -I tools/pixel/piskel.py export`로 만든다.

## 들어 있는 것
- `P-white.png` ~ `K-black.png`: 6종 × 흰/검은 진영, 모두 12장
- `K_classic-white.png`: 옛 흰 킹 (보관용 이형)
- 모두 **64×64, 1칸 = 1px, 배경 투명**이다. 흰 바깥 테 2칸과 검은 외곽선까지 그림 안에 들어 있다.
- `pawnisher-white.gpl` · `pawnisher-black.gpl`: Piskel 팔레트 (진영별 색)
- `sheet.png`: 전부를 4배로 모아 본 그림

## Piskel에서 그리는 법
1. **Import** → 이 폴더의 PNG를 연다. 캔버스는 64×64 그대로 둔다.
2. 팔레트: **Palettes → Import** → `pawnisher-white.gpl` (검은 기물은 `pawnisher-black.gpl`).
3. 바닥선을 지킨다. 받침 맨 아래 흰 테가 y = 60 ~ 61줄에 있다. 여기가 판 위에서 칸 바닥에 맞는 기준이다.
4. 흰 바깥 테 2칸 · 검은 외곽선은 직접 그린다. 도구가 자동으로 두르지 않는다.

## 돌려줄 때
- **Export → PNG, 배율 1 (64×64)**. 파일 이름은 받은 그대로 둔다 (예: `N-white.png`). 새 이형은 `K_<이름>-white.png`로 짓는다.
- 이 폴더에 덮어써서 올리거나, 채팅에 PNG를 붙여 주면 된다. `.piskel` 원본도 같이 주면 함께 보관한다.
- 팔레트에 없는 새 색을 쓰려면 미리 말해 준다. 말 없이 쓰면 가져올 때 가장 가까운 팔레트 색으로 바뀐다 (가져오기가 무엇을 바꿨는지 알려 준다).

## 받은 뒤 (개발 측이 한다)
`python3 -I tools/pixel/piskel.py import` → `pieces64.txt` 갱신 → `python3 -I tools/pixel/maker.py export` → 게임 그림(`public/pieces/`)을 다시 찍는다.
