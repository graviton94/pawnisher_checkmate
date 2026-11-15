"""장면 원본을 재반입할 때도 보존할 변환값. 확인된 수동값만 등록한다."""

# D-349: 이야기 컷은 가로 약 300칸, 원본 도트 간격 5.9px로 맞췄다.
# credits-bg 옛 그림(E-06, 5.9px)은 D-516 ED-12 재발주본으로 바뀌었다 — 값은 아래 D-516 줄.
MANUAL_PITCH = {'epilogue-hands': 1870 / 300,
    # D-434: 수령본 1672×941 → 320×180. 전체를 한 번 샘플링하고 마지막 경계는 원본 끝.
    'throne-mold': 941 / 180, 'departure-dock': 941 / 180, 'shipping-interior': 941 / 180,
    # D-442: S-05~07 원본1672×941 → 전체320×180 격자, 색 수 축소 없음.
    'departure-decision': 941 / 180, 'shipping-company': 941 / 180, 'gilded-solitude': 941 / 180,
    # D-450: S-08~12 수령본(webp 1672×941 · S-12만 1671×941) → 320×180 균일 격자, 색 수 축소 없음.
    'companion-rest': 941 / 180, 'companion-crossroad': 941 / 180, 'returned-box': 941 / 180,
    'new-law': 941 / 180, 'gilded-fallen': 941 / 180,
    # D-451: S-13~S-20 (받으면 같은 320×180 균일 격자 — 원본 크기가 다르면 여기 값을 고친다)
    'chained-door': 941 / 180, 'old-spring': 941 / 180, 'scarred-wall': 941 / 180, 'crown-dais': 941 / 180,
    'casting-floor': 941 / 180, 'gold-cast': 941 / 180, 'crown-gears': 941 / 180, 'white-land': 941 / 180,
    # D-507: WG-01 판돈 무대 1672×941 → 320×180 균일 격자(발주 ×6이 아니라 생성기 약 5.23px)
    'wager-table': 941 / 180,
    # 2026-11-14 지도 바탕 MP-03~05 (1671~1672×941 → 320×180 균일, map_import.py · MAP_GRID)
    'map-a1': 941 / 180, 'map-a2': 941 / 180, 'map-a3': 941 / 180,
    # D-509: MP-06 종막 지도 1670×941 → 320×180 균일(map-a1~3과 같다)
    'map-a4': 941 / 180,
    # D-509: OP-01 · OP-02는 실측 6.72px(941/140 — 복원 오차가 135 · 145줄보다 낮은 국소 최소, 격자 점수도 6.70~6.72가 최고) → 249×140,
    # OP-04는 뚜렷한 다른 주기가 없어 장면 관례 941/180 → 320×180. 셋 다 생성기가 레터박스 검은 띠를 그려 넣어 OPENING_GRID trim으로 걷는다.
    'op-windup': 941 / 140, 'prologue-04': 941 / 140, 'prologue-07': 941 / 180,
    # D-510: 엔딩 ED-02 · 04 · 05는 복원 오차가 칸이 잘수록 고르게 줄 뿐 뚜렷한 국소 최소가 없어 장면 관례 941/180 → 320×180.
    # ED-03만 174줄(5.41px)이 이웃(172 · 176 · 180줄)보다 오차가 뚜렷이 낮다(4.49 / 4.81 · 4.55 · 4.65) → 309×174
    # D-514: ED-03 재발주본은 156줄(6.03px)이 이웃(154 · 158줄)보다 오차가 뚜렷이 낮다(4.52 / 5.13 · 4.72) → 277×156 (1차본은 174줄이었다).
    'end-k-sight': 941 / 180, 'end-k-reach': 941 / 156, 'end-k-gild': 941 / 180, 'law-plate': 941 / 180,
    # D-514: OP-03 · ED-06 · 07 · 08은 복원 오차가 칸이 잘수록 고르게 줄 뿐(130 → 190줄: OP-03 10.41 → 8.34 · ED-06 7.48 → 5.83 ·
    # ED-07 7.80 → 5.98 · ED-08 5.49 → 4.29) 뚜렷한 국소 최소가 없어 장면 관례 941/180 → 320×180. 넷 다 띠를 그려 넣지 않고 끝까지 채워 왔다.
    'op-legend': 941 / 180, 'end-t-throw': 941 / 180, 'end-t-silence': 941 / 180, 'end-t-step': 941 / 180,
    # D-516: ED-09 · 10 · 11 · CN-01은 복원 오차가 칸이 잘수록 고르게 줄 뿐(130 → 190줄: ED-09 4.75 → 3.77 · ED-10 5.96 → 4.72 ·
    # ED-11 4.30 → 3.76 · CN-01 7.95 → 6.20) 뚜렷한 국소 최소가 없어 장면 관례 941/180 → 320×180 (ED-09만 원본 1670폭 → 319×180).
    # ED-12만 178줄(5.29px)이 이웃(176 · 180줄)보다 오차가 뚜렷이 낮다(1.97 / 2.04 · 2.06 — 180줄은 오히려 국소 최대) → 316×178.
    'end-fail': 941 / 180, 'end-f-box': 941 / 180, 'end-f-unwind': 941 / 180, 'credits-bg': 941 / 178, 'crown-2-open': 941 / 180,
    # D-516 CN-02 ~ 04 (1670~1671×941~942): CN-02만 164줄(5.74px)이 이웃(162 · 166줄)보다 오차가 뚜렷이 낮다(7.07 / 7.36 · 7.23) → 291×164.
    # CN-03(130 → 190줄 6.55 → 5.20) · CN-04(8.12 → 6.43)는 고르게 줄 뿐 → 장면 관례 941/180 (CN-04는 1670×942 → 319×180).
    'crown-3-open': 941 / 164, 'crown-4-open': 941 / 180, 'crown-1-throne': 941 / 180}


def options(name):
    """그림의 색은 유지하고, 수동값이 없는 장면은 기존 자동 격자 복원을 쓴다."""
    opts = {'colors': 0, 'pitch': MANUAL_PITCH.get(name)}
    # S-01: 자동 검출 6.21px 확인. 균일한 300×135 격자로 원본 1870:841 비율을 보존한다.
    if name in ('epilogue-hands', 'throne-mold', 'departure-dock', 'shipping-interior',
                'departure-decision', 'shipping-company', 'gilded-solitude',
                'companion-rest', 'companion-crossroad', 'returned-box', 'new-law', 'gilded-fallen',
                'chained-door', 'old-spring', 'scarred-wall', 'crown-dais', 'casting-floor', 'gold-cast', 'crown-gears', 'white-land', 'wager-table',
                'map-a1', 'map-a2', 'map-a3', 'map-a4', 'op-windup', 'prologue-04', 'prologue-07',
                'end-k-sight', 'end-k-reach', 'end-k-gild', 'law-plate',
                'op-legend', 'end-t-throw', 'end-t-silence', 'end-t-step',
                'end-fail', 'end-f-box', 'end-f-unwind', 'credits-bg', 'crown-2-open',
                'crown-3-open', 'crown-4-open', 'crown-1-throne'):
        opts['uniform'] = True
    return opts


# 발주 기물 반입 (D-423 · 2026-11-14 P-01~05 · G-01~03): tools/pixel/piece_import.py가 읽는다.
# body = 실루엣(외곽선 포함 · 흰 테 제외)의 세로 칸 수. 원본 도트 간격은 약 15px(P-03 주기 14.8px 검출, 나머지도 실루엣 ~810px / 54 ≈ 15)
# → 원래 격자 그대로 54칸으로 복원한다(바탕 기물 47칸보다 7칸 크지만 이형이 가늘어 판 위에서 읽히려면 필요). 간격(px) = 원본 실루엣 높이 / body.
# outline = 실루엣 안쪽 먹선 두께, mirror = 좌우 대칭('shape' 실루엣만 · 'all' 먹선까지), dx = 가로 위치 보정.
# 실측 간격(px, 2026-11-14 반입): 대포 14.69 · 낙타 14.32 · 메뚜기 14.85 · 대주교 15.39(1차) → 13.86(재발주) · 총독 15.5 · 거대 폰 11.16 · 룩 11.14 · 퀸 11.19
PIECE_GRID = {
    'R:cannon': {'body': 54, 'outline': 2, 'mirror': 'all'},
    'N:camel': {'body': 54, 'outline': 2},
    'Q:hopper': {'body': 54, 'outline': 2, 'mirror': 'shape'},
    # 재발주본(D-507) build-res/order/P-04-source.png: 원본 간격 13.86px(1774/128 — 발주 8배가 아니라 생성기 격자) · 실루엣 727px → 52칸 그대로 복원.
    # 톱니 볏이 먹선으로 닫혀 와 판 크기에서도 비숍과 갈린다. (1차본 P-04-v1-source.png는 15.39px · 54칸이었다)
    'B:archbishop': {'body': 52, 'outline': 2},
    'R:chancellor': {'body': 54, 'outline': 2},
    # 거대 128칸: 높이 112~120(흰 테 포함) → 몸 108칸(원본 간격 11.2px ≈ 생성기 격자 그대로), 먹선 2 · 흰 테 4.
    # 대칭은 맞추지 않는다 — 찌그러진 폰 머리 · 녹아 붙은 퀸 뿔 · 부러진 룩 성가퀴가 발주한 「불량」이다
    'P:giant': {'body': 108, 'outline': 2},
    'R:giant': {'body': 108, 'outline': 2},
    'Q:giant': {'body': 108, 'outline': 2},
}


# 2026-11-14 §0-D UI 부품 시트 (ui_kit_import.py 셋째 인자 = 원본 가로 도트 수 → 칸 크기).
# 정수배로 깨끗한 시트는 칸 가운데를 그대로 읽고(차이 0%), 생성기 번짐이 있는 시트만 격자 찾기 · 최빈색.
UI_KIT_GRID = {
    'HB-01': {'native_w': 184, 'pitch': 4.0, 'exact': True},    # 736×384 = 184×96 ×4 (발주는 ×8이었다)
    'HB-02': {'native_w': 160, 'pitch': 8.0, 'exact': True},    # 1280×512
    'RF-01': {'native_w': 160, 'pitch': 8.0, 'exact': True},    # 1280×704
    'RF-03': {'native_w': 104, 'pitch': 8.0, 'exact': True},    # 832×320
    'RF-02-v1': {'frames': (8, 2), 'cell': 48, 'pitch': 4.85},  # 1차본 1971×798 — 옅은 칸 선으로 상자를 찾는다 · 진홍 번짐 지움
    # D-512 재발주본 2172×724: 발주 ×6(420×108)이 아니라 생성기 약 6.62px(자동 찾기 · 꺾쇠 2×2 리벳 실측) — 프레임 시트가 아니라 귀퉁이 조각 16칸 × 4줄
    # (줄 = 희귀 위 · 희귀 아래 · 금 위 · 금 아래, 칸 2n · 2n+1 = n번째 프레임의 왼 · 오른 귀퉁이)로 왔다 → ui_kit_import.corners_main
    #   격자 = 위상 맞춤(경계 세기 × cos) 최고점: 가로 6.62px · 시작 4.25, 세로 6.68px · 시작 1.5 → 328×108도트
    'RF-02': {'cols': 16, 'rows': 4, 'grid': (6.62, 4.25, 6.68, 1.5)},
    'RF-04-v1': {'native_w': 210.7, 'pitch': 8.28},             # 1차본 1774×887 — 비정수 격자 (게임 미반영, build-res/order/RF-04-v1-parts)
    # D-512 RF-04 재발주본 1774×887(발주 1600×800 ×8이 아님): 위상 맞춤 최고점 가로 10.6px · 시작 9.75, 세로 10.74px · 시작 5.0 → 167×82도트, 카드 한 장 약 50×78도트
    # (경계 동적 계획은 71줄로 줄였다 — 균일 격자). 56×84 캔버스로 맞추는 일은 cmd_frames.py
    'RF-04': {'grid': (10.6, 9.75, 10.74, 5.0)},
    # D-512 CI-01b 사선 액자 재발주본 2225×707(발주 1408×448 ×8이 아님): 가로 12.58px · 시작 12.25, 세로 12.42px · 시작 4.75
    'CI-01b': {'grid': (12.58, 12.25, 12.42, 4.75)},
}


# 반장 2단계 초상 CI-02~08 (D-505, tools/pixel/boss_p2_import.py가 읽는다).
# 발주 고정 24색. 반입은 이 24색 + 받은 그림 자신의 대표 24색(반장 테마 색 계단 확장, D-309 · 사용자 결정 D-505) 안으로 붙인다.
SPEC24 = ['#0B0B0E', '#17171E', '#24232B', '#33313B', '#56545E', '#8A8794', '#F1EDE4', '#BFB9AD', '#8E877A',
          '#201C1A', '#3A2D26', '#5C4030', '#80553A', '#A4774B', '#4A3414', '#8A6416', '#C89B3C', '#F5C542',
          '#7A1218', '#B63735', '#1F3544', '#3F5968', '#7E929B', '#38BFC7']
# pitch = 원본 도트 간격(px). 받은 원본은 모두 1254×1254 생성기 출력(발주 1320×1296 ×6이 아님).
# 실측 detect_pitch: 02 5.95 · 04 5.97 · 05 6.11 · 06 5.97 · 08 6.13 · 03은 반 간격 3.07을 잡아 6.14로 고정.
BOSS_P2 = {
    'CI-02': {'dst': 'boss-plate-p2', 'phase1': 'boss-plate', 'pitch': 5.95},
    'CI-03': {'dst': 'boss-inspector-p2', 'phase1': 'boss-inspector', 'pitch': 6.14},
    # 조립은 1단계 · 판 · 대사 색이 초록(slice.css --boss-a #7fd45a, 1단계 초상 색상 90~100도)인데 청록(180~200도)으로 왔다
    # → 검수(청록)와 겹친다. 청록 빛만 95도로 돌린다(쇠 · 먹은 채도가 낮아 그대로).
    'CI-04': {'dst': 'boss-assembly-p2', 'phase1': 'boss-assembly', 'pitch': 5.97,
              'recolor': {'from': (160, 225), 'to': 95, 'smin': 0.25}},
    # 자석의 파란 극은 그림에서 면적이 작아 대표 24색에 못 들고 청록으로 붙었다 → 1단계 초상의 파란 극 계단 셋을 더한다.
    'CI-05': {'dst': 'boss-magnet-p2', 'phase1': 'boss-magnet', 'pitch': 6.11, 'extra': ['#2F6FE0', '#7FB2FF', '#1F3C9E']},
    'CI-06': {'dst': 'boss-thorns-p2', 'phase1': 'boss-thorns', 'pitch': 5.97},
    'CI-08': {'dst': 'boss-gilded-p2', 'phase1': 'boss-gilded', 'pitch': 6.13},
    # 경보(D-507): 진홍 테마로 옴 · 1단계와 같은 룩형 탑 · 경광등 · 사슬 · 등불 — 두 축 점수 최고 6.24px(6.0은 경계 점수 최저) → 201칸 정사각
    'CI-07': {'dst': 'boss-alarm-p2', 'phase1': 'boss-alarm', 'pitch': 6.24},
}


# 대사 초상 시트 (D-423 · 2026-11-14 PT-04~07): tools/pixel/portrait_import.py가 읽는다.
# names = 시트 왼쪽부터 내보낼 public/ui/portraits/<이름>.png, pitch = 초상마다 원본 도트 간격(px, 실측 — snap.detect_pitch 후보를 눈으로 확인한 값).
# 생성기는 64칸을 달라 해도 초상마다 다른 크기로 그린다: PT-04 ≈ 6.04px(실루엣 약 55×75칸), PT-05~07 ≈ 9.5~10px(약 47×72칸).
# 64×64로 늘이지 않고 위 여백 1칸에 맞춰 자른다 — 아래 몸은 칸 밑변에 잘린다(발주 「바스트」 · D-386).
# drop = 그 초상에서 쓰지 않는 팔레트 색 — 검은 쇠 기물은 보라 끼 회색이 가까운 갈색(가죽 · 녹)으로 빠지지 않게 갈색 · 청색 쇠를 뺀다.
_BROWN = ['#201C1A', '#3A2D26', '#5C4030', '#80553A', '#A4774B', '#4A3414']
_COOL = ['#1F3544', '#3F5968', '#7E929B']
_IRON = _BROWN + _COOL + ['#8A6416', '#C89B3C', '#F5C542', '#38BFC7', '#BFB9AD', '#8E877A']
PORTRAIT_GRID = {
    'PT-04': {'names': ['paperking-calm', 'paperking-resolve', 'paperking-fear', 'paperking-pain', 'paperking-gilt'], 'pitch': [6.04] * 5,
              'drop': [_COOL] * 5},
    'PT-05': {'names': ['king-a1', 'king-a2', 'king-a3'], 'pitch': [9.6, 9.6, 9.6],
              'drop': [_IRON, _BROWN[:3] + _COOL + ['#F5C542', '#38BFC7', '#BFB9AD', '#8E877A'], _IRON]},  # 2공정 = 굳은 쇳물 · 녹(주황 갈색)만 허용
    'PT-06': {'names': ['king-check', 'foe-P', 'foe-N'], 'pitch': [9.72, 9.72, 9.72],
              'drop': [_BROWN + _COOL[:2] + ['#BFB9AD', '#8E877A'], _IRON, _IRON]},  # 검문 = 황동 렌즈 · 청록 알 허용
    'PT-07': {'names': ['foe-B', 'foe-R', 'foe-Q'], 'pitch': [10.1, 10.1, 10.1], 'drop': [_IRON] * 3},
}


# 지도 에셋 MP-01 ~ MP-05 (2026-11-14, tools/pixel/map_import.py가 읽는다).
# MP-01: 1774×887 생성기 출력 — 발주 200×100 ×8이 아니라 비정수 8.87px. 자동 찾기는 반 · 1.4배 간격을 잡아 발주 가로 200으로 고정.
#   board = 받은 판(roster-board.png)을 자르는 상자: 명패 · 9-slice 몸 · 다리, patch = 명패가 덮던 위 테 열(옆 열 무늬로 메움).
# MP-02: 1437×1095 — 아이콘 덩어리마다 정사각 칸(여백 2칸)에 놓고 32칸 균일 샘플(scenario_delivery_import와 같은 방식).
# 바탕: 1671~1672×941 → 320×180 균일 격자(941/180 = 5.23px, D-434 장면과 같다). 받은 장면과 발주서 막 이름이 달랐다 —
#   MP-03 = 쇳물 배관 · 국자(게임 1막 「주조 공정」), MP-04 = 컨베이어 · 검수 문(2막 「조립 공정」), MP-05 = 상자 · 출하문(3막 「검수 공정」 끝 출하구).
MAP_GRID = {
    'MP-01': {'native_w': 200, 'pitch': 8.87,
              'names': ['roster-board', 'roster-slot', 'roster-slot-hurt', 'roster-slot-down',
                        'roster-chip-teal', 'roster-chip-brass', 'roster-chip-crimson',
                        'roster-badge-life', 'roster-badge-gear', 'roster-badge-crack'],
              # 황동의 가장 어두운 갈색 단이 15색 중 진홍으로 붙었다 → 같은 재질의 어두운 단(황동 판 · 톱니 · 금 간 판 · 다리)
              'recolor': {k: {'#7A1218': '#8A6416', '#E5262F': '#C89B3C', '#FF7B7B': '#F5C542'}
                          for k in ('roster-board', 'roster-badge-gear', 'roster-badge-crack', 'roster-chip-brass')},
              # 판 86×72 → 명패(위 가운데) · 몸 9-slice(테 13 · 11) · 다리(쓰지 않음). flat = 9-slice 변 가운데를 리벳 없는 한 열/줄로 고르게
              # (변을 늘려도 리벳이 길쭉해지지 않게 — 모서리 황동 꺾쇠 · 리벳은 그대로)
              'board': {'plate': (19, 0, 67, 15), 'body': (0, 4, 86, 62), 'slice': (13, 11, 13, 11),
                        'flat_top': ((0, 10, 16), (10, 13, 30)), 'flat_bottom': 30, 'flat_side': 19},
              # 분대 칸 셋은 생성기 번짐으로 38 · 41 · 39칸 폭 — 같은 캔버스(가운데 · 아래 맞춤)에 놓아 상태가 바뀌어도 칸이 흔들리지 않게
              'same_canvas': ['roster-slot', 'roster-slot-hurt', 'roster-slot-down']},
    'MP-02': {'margin': 2, 'merge': 3, 'drop_pal': ('보라', '구리'), 'names': ['battle', 'check', 'boss', 'event', 'shop', 'forge', 'chest', 'rest', 'here']},
    'bg': {'MP-03': ('map-a1', '주조 공정'), 'MP-04': ('map-a2', '조립 공정'), 'MP-05': ('map-a3', '검수 공정 · 출하'),
           'MP-06': ('map-a4', '종막 · 통제실')},
}


# D-509 오프닝 OP-01 · 02 · 04 (tools/pixel/opening_import.py가 읽는다): 받은 이름 → 게임 장면 이름.
# 생성기가 레터박스(위아래 검은 띠)를 그림 안에 그려 넣었다 — 게임이 띠를 따로 얹으므로(film.css), 격자 복원 뒤
# 먹 칸(가장 밝은 값 ≤ trim_max)이 90% 넘는 띠 줄과, 그 바로 안쪽에서 먹이 trim_dark 넘게 걸친 경계 줄 하나를 위 · 아래에서 걷는다(자르기만 — 늘리지 않는다, D-386). 걷힌 줄 수는 반입 때 찍는다.
# 원본 띠 높이(px, 위/아래): OP-01 157/101 · OP-02 95/95 · OP-04 129/103.
OPENING_GRID = {
    # OP-01 재발주본(D-512 — 맨머리 폰 · 등 쪽 태엽) = OP-01-source.png. 1차본(왕관 폰, D-509)은 OP-01-v1-source.png로 보관
    'OP-01': {'name': 'op-windup', 'trim_max': 30, 'trim_dark': 0.25},
    'OP-02': {'name': 'prologue-04', 'trim_max': 30, 'trim_dark': 0.25},
    'OP-04': {'name': 'prologue-07', 'trim_max': 30, 'trim_dark': 0.25},
    # D-514 OP-03 금단의 승급대 소문: 띠 없이 끝까지 채워 왔다(같은 걷기 규칙 — 걷힌 줄 0)
    'OP-03': {'name': 'op-legend', 'trim_max': 30, 'trim_dark': 0.25},
}


# D-510 엔딩 ED-01 ~ 05 (tools/pixel/ending_import.py가 읽는다).
# ED-01 크롬 시트 1774×887: 발주 240×120 ×8이 아니라 생성기 8.06px(1774/220 — detect_pitch 5~12px 자유 찾기 최고점, 7.39px로 잡으면 왕관 넷이 27 · 26 · 28 · 27칸으로 흔들린다)
#   → native_w 220. 부품 = 받은 시트 줄 순서(자막 판 · 제목 카드 / 왕관 문장 넷 / 화자 표지 셋 — 발주 7번 「서술 마름모 · 독백 접힌 종이 · 대사 두 줄 홈」).
#   flat = 9-slice 변 가운데를 받은 판의 깨끗한 한 열 · 한 줄로 고르게(map_import split_board와 같은 다듬기 — 새 색 없음):
#   자막 판은 아래 변 먹 얼룩 점(19줄)을 · 제목 카드는 가운데 세로 칸막이(제목 글자가 가로지른다)를 걷는다. slice = (위, 오른, 아래, 왼) 도트.
# ED-02 ~ 05 장면: OP와 같이 생성기가 레터박스 검은 띠를 그려 넣었다 → opening_import.one(…, ENDING_GRID)로 걷는다.
ENDING_GRID = {
    'ED-01': {'native_w': 220,
              'names': ['subtitle-plate', 'title-card', 'crown-emblem-1', 'crown-emblem-2', 'crown-emblem-3', 'crown-emblem-4',
                        'speaker-narr', 'speaker-mono', 'speaker-line'],
              'flat': {'subtitle-plate': {'slice': (8, 9, 7, 8), 'col': 20, 'row': 11},
                       'title-card': {'slice': (9, 17, 9, 18), 'col': 30, 'row': None}}},
    'ED-02': {'name': 'end-k-sight', 'trim_max': 30, 'trim_dark': 0.25},
    # ED-03 재발주본(D-514 — 다문 말머리 · 보이는 쪽 몸에 박차 흠) = ED-03-source.png. 1차본(D-510 — 나이트 입 벌림)은 ED-03-v1-source.png로 보관
    'ED-03': {'name': 'end-k-reach', 'trim_max': 30, 'trim_dark': 0.25},
    'ED-04': {'name': 'end-k-gild', 'trim_max': 30, 'trim_dark': 0.25},
    'ED-05': {'name': 'law-plate', 'trim_max': 30, 'trim_dark': 0.25},
    # D-514 진엔딩 END-T 새 컷 셋 — 띠 없이 끝까지 채워 왔다
    'ED-06': {'name': 'end-t-throw', 'trim_max': 30, 'trim_dark': 0.25},
    'ED-07': {'name': 'end-t-silence', 'trim_max': 30, 'trim_dark': 0.25},
    'ED-08': {'name': 'end-t-step', 'trim_max': 30, 'trim_dark': 0.25},
    # D-516 패배 END-F 세 컷 · 크레딧 바탕 — 넷 다 띠 없이 끝까지 채워 왔다. ED-09 재발주본(옛 end-fail은 E-02-end-fail-source.png)
    'ED-09': {'name': 'end-fail', 'trim_max': 30, 'trim_dark': 0.25},
    'ED-10': {'name': 'end-f-box', 'trim_max': 30, 'trim_dark': 0.25},
    # ED-11 사용자 지시(2026-11-15): 나이트의 눈은 재발주하지 않고 지운다 — 격자 복원 뒤 erase 칸을 같은 말머리 면의 이웃 칸 색(from)으로 메운다(새 색 없음).
    #   box = (왼, 위, 오른, 아래) 도트(오른 · 아래 미포함), from = 메울 색을 읽는 이웃 칸 (x, y). 대조판 아래 줄에 전 | 후(×12)
    #   말머리 면은 #51484B ~ #594E51 한 단(같은 명암) — 눈 · 콧구멍 · 입 홈의 먹(#181516 · #1D1A1B · #231D1D)만 그 면 색으로. 테 빛 · 턱 외곽선은 그대로.
    'ED-11': {'name': 'end-f-unwind', 'trim_max': 30, 'trim_dark': 0.25, 'erase': [
        {'what': '나이트 눈', 'box': (137, 118, 139, 120), 'from': (136, 119)},
        {'what': '나이트 눈 아래 끝', 'box': (138, 120, 139, 121), 'from': (137, 120)},
        {'what': '나이트 콧구멍', 'box': (142, 129, 143, 130), 'from': (142, 130)},
        {'what': '나이트 입 홈', 'box': (140, 132, 141, 134), 'from': (141, 133)},
    ]},
    # ED-12 재발주본(옛 credits-bg는 E-06-credits-bg-source.png): 오른쪽 넓은 빈 어둠 = 크레딧 글 자리
    'ED-12': {'name': 'credits-bg', 'trim_max': 30, 'trim_dark': 0.25},
}


# D-516 왕관 시작 컷 CN-01 ~ 03 (tools/pixel/ending_import.py가 같은 균일 격자 · 띠 걷기로 읽는다).
# CN-01 사용자 결정: 종이왕을 일부러 뺐다 — 두꺼워진 흑 기물만 (LAW-1 「흑 기물의 쇠는 더 두껍게 붓는다」)
CROWN_GRID = {
    'CN-01': {'name': 'crown-2-open', 'trim_max': 30, 'trim_dark': 0.25},
    # CN-02 저울 둘 (LAW-2) · CN-03 꺼진 정비 라인 (LAW-3) · CN-04 새 도금왕의 왕좌 (첫째 왕관 끝 END-K-3-2-A1)
    'CN-02': {'name': 'crown-3-open', 'trim_max': 30, 'trim_dark': 0.25},
    'CN-03': {'name': 'crown-4-open', 'trim_max': 30, 'trim_dark': 0.25},
    'CN-04': {'name': 'crown-1-throne', 'trim_max': 30, 'trim_dark': 0.25},
}
