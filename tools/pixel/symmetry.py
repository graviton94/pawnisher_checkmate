"""
기물 좌우 대칭 다듬기 (D-092, 사용자: Q·K 십자가 일그러짐 · R 윗머리 세 칸 크기 · P 머리 좌우 대칭, 명암은 살린다).

pieces64.txt의 P·R·Q·K 블록을 제자리에서 고친다 (여러 번 돌려도 같다):
  ① 모양(빈칸 · 검정 외곽선 · 몸)을 한쪽 절반을 거울로 옮겨 좌우 대칭으로
  ② 몸 칸의 색(빛·그늘)은 원래 자리 색을 그대로 둔다 — 새로 몸이 된 칸만 거울 쪽 색을 빌린다
  ③ 거울로 옮기다 생긴 한 칸짜리 홈은 메운다 — 십자가 · 룩 윗머리는 원래 그림을 살리고 비뚤어진 칸만 맞춘다
     (R은 축을 반 칸 옮겨(65) 머리 셋 · 틈 둘이 모두 6칸 폭이 된다)
  ④ 흰 바깥 테두리 2칸을 다시 두른다

  python3 -I tools/pixel/symmetry.py && python3 -I tools/pixel/maker.py export
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PATH = os.path.join(HERE, 'pieces64.txt')
N = 64
OUTLINE = 2

# 유형 → (대칭축 ×2, 원본으로 쓸 절반 'L' 왼쪽 · 'R' 오른쪽)
AXIS = {'P': (64, 'L'), 'R': (65, 'L'), 'Q': (64, 'L'), 'K': (64, 'L')}


def struct(c):
    return 0 if c in '.O' else (1 if c == 'K' else 2)


def mirror(grid, axis2, src):
    out = [list(r) for r in grid]
    for j in range(N):
        for i in range(N):
            m = axis2 - i
            if not (0 <= m < N):
                continue
            # 원본 쪽 절반(축 포함)은 그대로, 반대쪽은 원본 칸의 모양을 따른다
            if (src == 'L' and 2 * i <= axis2) or (src == 'R' and 2 * i >= axis2):
                continue
            want = struct(grid[j][m])
            have = struct(grid[j][i])
            if want == have:
                continue
            if want == 0:
                out[j][i] = '.'
            elif want == 1:
                out[j][i] = 'K'
            else:
                out[j][i] = grid[j][m]
    return out


def fill_notches(grid):
    """거울로 옮기다 생긴 한 칸짜리 홈(양옆이 외곽선인 빈칸)을 외곽선으로 메운다"""
    for _ in range(2):
        for j in range(1, N - 1):
            for i in range(1, N - 1):
                if grid[j][i] in '.O':
                    k = sum(grid[j + dy][i + dx] not in '.O' for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                    if k >= 3:
                        grid[j][i] = 'K'


def border(grid):
    body = [[grid[j][i] not in '.O' for i in range(N)] for j in range(N)]
    for j in range(N):
        for i in range(N):
            if body[j][i]:
                continue
            near = any(0 <= j + dy < N and 0 <= i + dx < N and body[j + dy][i + dx]
                       for dy in range(-OUTLINE, OUTLINE + 1) for dx in range(-OUTLINE, OUTLINE + 1))
            grid[j][i] = 'O' if near else '.'
    return grid


def load():
    head, blocks, cur = [], [], None
    for raw in open(PATH, encoding='utf-8'):
        line = raw.rstrip('\n')
        if line.startswith('['):
            cur = [line, []]
            blocks.append(cur)
        elif cur is None:
            head.append(line)
        elif line.strip() and not line.startswith('#'):
            cur[1].append(line)
    return head, blocks


def save(head, blocks):
    lines = list(head)
    for name, rows in blocks:
        lines.append(name)
        lines.extend(rows)
        lines.append('')
    open(PATH, 'w', encoding='utf-8').write('\n'.join(lines))


def main():
    head, blocks = load()
    for b in blocks:
        t = b[0].strip()[1:-1].split()[0]
        if t not in AXIS:
            continue
        axis2, src = AXIS[t]
        g = mirror(b[1], axis2, src)
        fill_notches(g)
        b[1] = [''.join(r) for r in border(g)]
    save(head, blocks)
    print('tools/pixel/pieces64.txt — P·R·Q·K 좌우 대칭')


if __name__ == '__main__':
    main()
