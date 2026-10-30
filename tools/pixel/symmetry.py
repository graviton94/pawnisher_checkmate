"""
기물 좌우 대칭 다듬기 (D-092, 사용자: Q·K 십자가 일그러짐 · R 윗머리 세 칸 크기 · P 머리 좌우 대칭, 명암은 살린다).

pieces64.txt의 P·R·Q·K 블록을 제자리에서 고친다 (여러 번 돌려도 같다):
  ① 모양(빈칸 · 검정 외곽선 · 몸)을 한쪽 절반을 거울로 옮겨 좌우 대칭으로
  ② 몸 칸의 색(빛·그늘)은 원래 자리 색을 그대로 둔다 — 새로 몸이 된 칸만 거울 쪽 색을 빌린다
  ③ Q·K 꼭대기 십자가는 정해 둔 모양으로 다시 그리고, R 윗머리 세 칸은 같은 폭으로
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


# 꼭대기 십자가: 유형 → (머리 띠가 시작하는 줄, 기둥 첫 줄, 팔 첫 줄, 팔 반폭). 기둥 3칸 · 팔 3줄, 검정 테 2칸.
# 원본 십자가는 자동 추출에서 뭉개져 있어서 (D-092) 머리 띠 위를 통째로 지우고 다시 그린다.
CROSS = {'Q': (17, 7, 9, 4), 'K': (19, 5, 8, 5)}
CROSS_FILL = {0: ('W', 'W', 'S'), 1: ('H', 'M', 'B')}  # (왼쪽 빛, 몸, 오른쪽 그늘) — 원래 기물처럼 왼쪽이 밝다


def cross(grid, t, side, axis2):
    """머리 띠 위를 지우고 반듯한 십자가를 다시 그린다"""
    band, top, arm, half = CROSS[t]
    c = axis2 // 2
    for j in range(band):
        grid[j] = ['.'] * N
    fill = {(j, i) for j in range(top, band) for i in range(c - 1, c + 2)}
    fill |= {(j, i) for j in range(arm, arm + 3) for i in range(c - half, c + half + 1)}
    for (j, i) in fill:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                jj, ii = j + dy, i + dx
                if (jj, ii) not in fill and jj < band:
                    grid[jj][ii] = 'K'
    lit, body, dark = CROSS_FILL[side]
    for (j, i) in fill:
        edge_l = (j, i - 1) not in fill
        edge_r = (j, i + 1) not in fill
        edge_b = (j + 1, i) not in fill and j < band - 1
        grid[j][i] = lit if edge_l and side == 1 else (dark if edge_r or edge_b else body)


# 룩 윗머리: (첫 줄, 끝 줄, 왼쪽 칸, 머리·틈 폭). 왼쪽 머리+틈(원본 색) 한 벌을 되풀이 → 머리 셋 · 틈 둘이 모두 같은 폭
CRENEL = {'R': (18, 21, 18, 6)}


def crenel(grid, t):
    first, last, left, w = CRENEL[t]
    src = [row[:] for row in grid]
    for j in range(first, last + 1):
        for k in range(w * 5):
            grid[j][left + k] = src[j][left + k % (w * 2)]


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
        if t in CRENEL:
            crenel(g, t)
        if t in CROSS:
            cross(g, t, int(b[0].strip()[1:-1].split()[1]), axis2)
        b[1] = [''.join(r) for r in border(g)]
    save(head, blocks)
    print('tools/pixel/pieces64.txt — P·R·Q·K 좌우 대칭')


if __name__ == '__main__':
    main()
