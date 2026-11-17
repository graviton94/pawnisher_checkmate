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
    'crown-3-open': 941 / 164, 'crown-4-open': 941 / 180, 'crown-1-throne': 941 / 180,
    # D-519 CN-05 · 06 · AC-01 ~ 03 (1671~1672×941): 130 → 190줄 복원 오차가 고르게 줄 뿐(CN-05 8.53 → 6.54 · CN-06 5.84 → 4.59 ·
    # AC-01 7.50 → 5.79 · AC-02 7.47 → 5.73 · AC-03 7.40 → 5.69), 한 줄 간격으로 훑어도 이웃보다 0.1~0.2 낮은 톱니만 고르게 흩어져
    # (AC-01 156 · 168 · 179줄, CN-05 169 · 178 · 186줄) 뚜렷한 국소 최소가 없다 → 장면 관례 941/180 → 320×180.
    'crown-2-throne': 941 / 180, 'crown-3-throne': 941 / 180, 'act-1': 941 / 180, 'act-2': 941 / 180, 'act-4': 941 / 180,
    # D-523 LD-02 로딩 바탕 1672×941: 격자 찾기는 6.36px(148줄)을 잡지만 복원 오차는 148줄이 이웃보다 오히려 높고(5.89 / 146 5.59 · 152 5.62)
    # 칸이 잘수록 고르게 줄 뿐(140 → 182줄 5.97 → 5.10) → 장면 관례 941/180 → 320×180.
    'loading-bench': 941 / 180}


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
                'crown-3-open', 'crown-4-open', 'crown-1-throne', 'crown-2-throne', 'crown-3-throne',
                'act-1', 'act-2', 'act-4'):
        opts['uniform'] = True
    return opts


# 발주 기물 반입 (D-423 · 2026-11-14 P-01~05 · G-01~03): tools/pixel/piece_import.py가 읽는다.
# body = 실루엣(외곽선 포함 · 흰 테 제외)의 세로 칸 수. 원본 도트 간격은 약 15px(P-03 주기 14.8px 검출, 나머지도 실루엣 ~810px / 54 ≈ 15)
# → 원래 격자 그대로 54칸으로 복원한다(바탕 기물 47칸보다 7칸 크지만 이형이 가늘어 판 위에서 읽히려면 필요). 간격(px) = 원본 실루엣 높이 / body.
# outline = 실루엣 안쪽 먹선 두께, mirror = 좌우 대칭('shape' 실루엣만 · 'all' 먹선까지), dx = 가로 위치 보정.
# 실측 간격(px, 2026-11-14 반입): 대포 14.69 · 낙타 14.32 · 메뚜기 14.85 · 대주교 15.39(1차) → 13.86(재발주) · 총독 15.5 · 거대 폰 11.16 · 룩 11.14 · 퀸 11.19
# D-528 (안 M 확정): 이형 먹선 3칸(보통 흑 기물 4칸 — 4칸이면 메뚜기 용수철 · 낙타 머리가 먹에 묻힌다, 받은 2칸은 판 위에서 도트가 잘아 보였다),
#   대포만 50칸(54칸이면 넓이가 룩의 111% → 96%) — 나머지는 이미 바탕 기물보다 작아 그대로. piece_import.build가 안 M 빛 · tone을 더한다.
PIECE_GRID = {
    'R:cannon': {'body': 50, 'outline': 3, 'mirror': 'all'},
    'N:camel': {'body': 54, 'outline': 3},
    'Q:hopper': {'body': 53, 'outline': 3, 'mirror': 'shape'},
    # 재발주본(D-507) build-res/order/P-04-source.png: 원본 간격 13.86px(1774/128 — 발주 8배가 아니라 생성기 격자) · 실루엣 727px → 52칸 그대로 복원.
    # 톱니 볏이 먹선으로 닫혀 와 판 크기에서도 비숍과 갈린다. (1차본 P-04-v1-source.png는 15.39px · 54칸이었다)
    'B:archbishop': {'body': 52, 'outline': 3},
    'R:chancellor': {'body': 54, 'outline': 3},
    # 거대 128칸: 높이 112~120(흰 테 포함) → 몸 108칸(원본 간격 11.2px ≈ 생성기 격자 그대로), 먹선 2 · 흰 테 4.
    # 대칭은 맞추지 않는다 — 찌그러진 폰 머리 · 녹아 붙은 퀸 뿔 · 부러진 룩 성가퀴가 발주한 「불량」이다
    'P:giant': {'body': 108, 'outline': 2},
    'R:giant': {'body': 108, 'outline': 2},
    'Q:giant': {'body': 108, 'outline': 2},
}

# 2×2 보스 GB-01~07 · b (D-513 → D-523 첫 반입 → D-524 기물 문법 맞춤, piece_import.py --boss).
# D-524: 몸은 72칸 캔버스 격자(일반 기물과 같은 캔버스)로 복원하고 칸마다 2×2로 펴 144칸 블록에 — 판 2×2에서 그림 한 장의 도트 수 = 일반 기물 한 장.
#   먹선 = 72칸 1칸(144칸 2칸) · 흰 테 = 144칸 3칸(일반 기물과 같은 두께), 1칸 잔무늬(리벳 · 낱점)는 clean_dots가 정리.
# body = 72칸 격자에서 몸 세로 칸 수(64 — 일반 기물 몸 47칸의 2배 넓이 판에 맞춘 키, 판 위 키는 D-523과 같다),
# bottom = 받침 바닥 아래 빈 줄(72칸 격자 3 = 일반 기물 흰 테 자리), theme = 테마 강조색 글자(maker.PAL64, 2~3단),
# ink = 원본에서 먹으로 읽을 밝기 상한, pitch_of = 격노가 1단계와 같은 간격을 쓰도록 1단계 원본 · 이름.
# 실측 (2026-11-16): 원본 모두 1254×1254 생성기 출력(생성기 도트 ≈ 12.6px). 실루엣 ≈ 1210px / 64 = 간격 ≈ 18.9px(원본 한 도트 ≈ 0.67칸).
#   GB-01 철갑 = 주황 셋(황동 빼고), GB-02 검수 = 렌즈 청록 빛 c · 하늘 C(반장 색 청강 몸 위에서도 렌즈가 갈리게) + 불합격 빨강 r(✕ 계기), GB-03 조립 = 초록 둘 + 황동(경고 줄무늬 기둥).
# 검수 ✕ 계기: 황동 테 → 쇠(H · B), 짙은 빨강 바탕 → Z — 빨강은 ✕ 한 단만 남겨 「불합격 표시」로 읽히게
INSPECT_ALIAS = {'#C89B3C': 'H', '#E0A030': 'H', '#8A6416': 'B', '#A06020': 'B', '#701010': 'Z', '#601010': 'Z'}
# D-526: 자석 — 짙은 보라 번개 테(#300048 안팎) · 마젠타 번짐(#C000C0)은 쇠 단 / 출하 — 마젠타 번짐은 쇠 단(채도만 높은 경계 칸)
MAGNET_ALIAS = {'#300048': 'D', '#C000C0': 'D', '#600060': 'D', '#C0A050': 'H', '#907040': 'B'}  # 황동 리벳 → 쇠
THORN_ALIAS = {'#C000C0': 'D', '#600060': 'D', '#300030': 'D'}
# D-527: 경보 — 황동 관 이음(#A86B46 · #D9A46B) → 쇠, 마젠타 번짐(#540C49) → 먹 쪽 / 도금왕 — 마젠타 번짐 → 어두운 금
ALARM_ALIAS = {'#A86B46': 'B', '#D9A46B': 'H', '#540C49': 'D', '#C000C0': 'D', '#600060': 'D'}
GILDED_ALIAS = {'#C000C0': 'n', '#600060': 'I', '#540C49': 'I'}
BOSS_GRID = {
    'K:boss-plate': {'body': 64, 'bottom': 3, 'theme': 'qop', 'ink': 12},
    'K:boss-plate-p2': {'body': 64, 'bottom': 3, 'theme': 'qop', 'ink': 12, 'pitch_of': 'GB-01-source.png', 'pitch_name': 'K:boss-plate'},
    'K:boss-inspect': {'body': 64, 'bottom': 3, 'theme': 'cCr', 'ink': 12, 'alias': INSPECT_ALIAS},
    'K:boss-inspect-p2': {'body': 64, 'bottom': 3, 'theme': 'cCr', 'ink': 12, 'alias': INSPECT_ALIAS, 'pitch_of': 'GB-02-source.png', 'pitch_name': 'K:boss-inspect'},
    'K:boss-spawn': {'body': 64, 'bottom': 3, 'theme': 'gjU', 'ink': 12},
    'K:boss-spawn-p2': {'body': 64, 'bottom': 3, 'theme': 'gjU', 'ink': 12, 'pitch_of': 'GB-03-source.png', 'pitch_name': 'K:boss-spawn'},
    # D-526 자석(GB-04 · 04b): 극 빨강 R · 파랑 b + 자기장 보라 x(판 위 반장 색이 보라라 가장 밝은 보라로 — 몸 빛 단과 갈리게).
    #   key strict = 보라 번개를 마젠타 바탕으로 걷지 않는다. 짙은 보라 번개 테 · 마젠타 번짐은 쇠로(alias).
    #   격노의 떠다니는 쇠 조각은 float칸 이상 덩어리면 남긴다.
    'K:boss-magnet': {'body': 64, 'bottom': 3, 'theme': 'Rbx', 'ink': 12, 'key': 'strict', 'alias': MAGNET_ALIAS},
    'K:boss-magnet-p2': {'body': 64, 'bottom': 3, 'theme': 'Rbx', 'ink': 12, 'key': 'strict', 'alias': MAGNET_ALIAS, 'float': 6, 'accent_edge': True,
                         'pitch_of': 'GB-04-source.png', 'pitch_name': 'K:boss-magnet'},
    # D-526 출하(GB-05 · 05b, 데이터 키 thorns — 발주서 「출하」): 1단계 가시 끝 은빛 e(무채색 밝기 200 이상) · 격노 진홍 X · R · f
    'K:boss-thorns': {'body': 64, 'bottom': 3, 'theme': 'e', 'ink': 12, 'bright': (225, 'e'), 'alias': THORN_ALIAS, 'accent_edge': True},
    'K:boss-thorns-p2': {'body': 64, 'bottom': 3, 'theme': 'XRf', 'ink': 12, 'alias': THORN_ALIAS, 'accent_edge': True,
                         'pitch_of': 'GB-05-source.png', 'pitch_name': 'K:boss-thorns'},
    # D-527 경보(GB-06 · 06b): 경광등 · 계기 칸 빨강 R · 짙은 X · 밝은 f, 격노는 쇳물 주황 o 더함(금 간 줄 · 불티).
    #   황동 관 이음 · 마젠타 번짐은 쇠 단(alias). 격노의 떠 있는 불티 · 경광등 조각은 float칸 이상이면 남긴다.
    'K:boss-alarm': {'body': 64, 'bottom': 3, 'theme': 'RXf', 'ink': 12, 'alias': ALARM_ALIAS, 'accent': 2.5, 'accent_edge': True},
    'K:boss-alarm-p2': {'body': 64, 'bottom': 3, 'theme': 'RXfo', 'ink': 12, 'alias': ALARM_ALIAS, 'accent': 2.5, 'float': 4, 'float_edge': True, 'accent_edge': True,
                        'pitch_of': 'GB-06-source.png', 'pitch_name': 'K:boss-alarm'},
    # D-527 도금왕(GB-07 · 07b): 몸 전체가 금 — 금 다섯 단 u U A n I(밝은 → 어두운)을 테마로(강조 가중 없이 1.0), 판 위 반장 색(boss-gilded)도 금.
    #   격노: 금박이 깨지며 흰 폰 몸(무채색 밝은 칸 → 흰 진영 W · E · S, pale) · 녹슨 태엽 열쇠 · 톱니(녹 q · J)가 드러난다.
    'K:boss-gilded': {'body': 64, 'bottom': 3, 'theme': 'uUAnI', 'ink': 12, 'accent': 1.0, 'alias': GILDED_ALIAS, 'accent_edge': True,
                      'patch': [(36, 15, 7, 7)]},  # 왕관 띠 오른쪽 구멍 — 판 크기에서 한 눈처럼 읽혀 같은 금으로 메움(얼굴 금지, 받은 그림 다듬기)
    'K:boss-gilded-p2': {'body': 64, 'bottom': 3, 'theme': 'uUAnIqJ', 'ink': 12, 'accent': 1.0, 'alias': GILDED_ALIAS, 'pale': (150, 'WES'),
                         'float': 6, 'float_edge': True, 'accent_edge': True, 'pitch_of': 'GB-07-source.png', 'pitch_name': 'K:boss-gilded'},
}


# 거대 주물 재발주본 G-01~03 (D-527, piece_import.py --giant → build_boss 방식 — 마젠타 바탕 · 통짜 · 금 균열 쇳물 흐름).
# 사용자 결정 2026-11-16: 피격 범위는 2×2 그대로, 그림은 반장 · 도금왕(2배)만큼 크지 않게 1.5배 → **1.7배**(D-528 — 1.5배는 너무 작다) · 받침 바닥은 기준선(D-525).
# → 캔버스 122칸(보통 기물 72칸 × 1.7 ≈ 122)을 판에서 122/72칸 폭으로 — 도트 한 칸 = 보통 기물 도트 한 칸(펴지 않음).
# body = 72칸 단위 몸 키(바탕 기물 몸 키 P 49 · R 46 · Q 53 — × 122/72 = 122칸에서 83 · 78 · 90), outline_px = 먹선 칸 3(보통 흑 기물 4칸으로 해 보니
#   원본 테두리 그늘과 겹쳐 6~7칸 먹 띠가 되고 퀸 왕관이 먹 덩어리 — 3칸),
# theme = 금 균열 · 쇳물 흐름 u · U · N · n(황동 넷 — 쇳물 빛 · 금 · 어두운 금 · 녹), 녹 얼룩(올리브)도 N · n으로(alias).
GIANT_ALIAS = {'#5A5020': 'n', '#706030': 'N', '#C000C0': 'D', '#600060': 'D'}
GIANT_GRID = {
    'P:giant': {'body': 49, 'bottom': 2, 'theme': 'uUNn', 'ink': 12, 'canvas': 122, 'res': 122, 'outline_px': 3, 'alias': GIANT_ALIAS, 'accent_edge': True},
    'R:giant': {'body': 46, 'bottom': 2, 'theme': 'uUNn', 'ink': 12, 'canvas': 122, 'res': 122, 'outline_px': 3, 'alias': GIANT_ALIAS, 'accent_edge': True},
    'Q:giant': {'body': 53, 'bottom': 2, 'theme': 'uUNn', 'ink': 12, 'canvas': 122, 'res': 122, 'outline_px': 3, 'alias': GIANT_ALIAS, 'accent_edge': True},
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
    # D-552 재검: 세로 스펙트럼 최고는 11.69(존재 1.29~1.35)지만 카드 한 장(1200~1760 × 20~860)의 세로 복원 오차는
    # 10.74가 6.92로 11.69(7.36)보다 낮고, 경계 줄 간격도 10 · 11 · 12가 섞인 평균 10.7이다. 11.69로 다시 뽑으니 카드가 71줄로
    # 줄고 금 명판 징이 끊긴 줄로 깨졌다(대조판 grid-fix-ui) → 10.74를 그대로 둔다(감사 보고의 「세로 11.69」 지적은 기각).
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
# D-552: grid = 축마다 실측(gridmeasure.measure 4~16px · `boss_p2_import.py --measure`) (간격, 시작[, 'dp']).
# 옛 값은 정사각 한 간격(CI-02 5.95 · 04 5.97 · 05 6.11 · 06 5.97 · 07 6.24)이라 1.5~3% 어긋나 한 줄 안에서 3~6칸씩 밀렸다.
# 'dp' = 세 토막 간격이 흔들려 반 칸 넘게 쌓이는 축 → 간격 고정 · 창마다 시작점 추적(gridmeasure.tracked_cuts). 존재 점수(어긋난 간격 오차 ÷ 제 간격 오차) 괄호.
# CI-05 y는 격자가 약하다(1.046) — x 실측 ±4% 안에서 다시 잰 값(from-other). CI-03 · CI-08은 재반입하지 않았다(옛 균일 격자를 같은 꼴로 적음).
BOSS_P2 = {
    'CI-02': {'dst': 'boss-plate-p2', 'phase1': 'boss-plate',
              'grid': {'x': (5.99, 2.62, 'dp'), 'y': (6.104, 3.05, 'dp')}},  # 존재 x 1.102 · y 1.157
    'CI-03': {'dst': 'boss-inspector-p2', 'phase1': 'boss-inspector', 'grid': {'x': (1254 / 204, 0), 'y': (1254 / 204, 0)}},
    # 조립은 1단계 · 판 · 대사 색이 초록(slice.css --boss-a #7fd45a, 1단계 초상 색상 90~100도)인데 청록(180~200도)으로 왔다
    # → 검수(청록)와 겹친다. 청록 빛만 95도로 돌린다(쇠 · 먹은 채도가 낮아 그대로).
    'CI-04': {'dst': 'boss-assembly-p2', 'phase1': 'boss-assembly',
              'grid': {'x': (6.14, 0.0, 'dp'), 'y': (5.991, 5.12, 'dp')},  # 존재 x 1.118 · y 1.067
              'recolor': {'from': (160, 225), 'to': 95, 'smin': 0.25}},
    # 자석의 파란 극은 그림에서 면적이 작아 대표 24색에 못 들고 청록으로 붙었다 → 1단계 초상의 파란 극 계단 셋을 더한다.
    'CI-05': {'dst': 'boss-magnet-p2', 'phase1': 'boss-magnet',
              'grid': {'x': (6.25, 4.43, 'dp'), 'y': (6.106, 1.14, 'dp')},  # 존재 x 1.080 · y 1.046(from-other)
              'extra': ['#2F6FE0', '#7FB2FF', '#1F3C9E']},
    'CI-06': {'dst': 'boss-thorns-p2', 'phase1': 'boss-thorns',
              'grid': {'x': (6.208, 5.95, 'dp'), 'y': (6.109, 5.73, 'dp')}},  # 존재 x 1.087 · y 1.058 (12.31의 절반)
    'CI-08': {'dst': 'boss-gilded-p2', 'phase1': 'boss-gilded', 'grid': {'x': (1254 / 205, 0), 'y': (1254 / 205, 0)}},
    # 경보(D-507): 진홍 테마로 옴 · 1단계와 같은 룩형 탑 · 경광등 · 사슬 · 등불
    'CI-07': {'dst': 'boss-alarm-p2', 'phase1': 'boss-alarm',
              'grid': {'x': (6.291, 5.11, 'dp'), 'y': (6.166, 0.26, 'dp')}},  # 존재 x 1.078 · y 1.076
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
    # D-519 CN-05 둘째 왕좌(곧게 앉은 금 킹 · 벽에 겹친 왕 그림자 둘) · CN-06 셋째 왕좌(빛을 뿜는 금 킹) — 띠 없이 끝까지 채워 왔다
    'CN-05': {'name': 'crown-2-throne', 'trim_max': 30, 'trim_dark': 0.25},
    'CN-06': {'name': 'crown-3-throne', 'trim_max': 30, 'trim_dark': 0.25},
}


# D-519 막 입구 카드 재발주본 AC-01 ~ 03 (tools/pixel/ending_import.py가 같은 균일 격자 · 띠 걷기로 읽는다) → public/scenes/act-<막>.png (main.ts actCard).
# 옛 그림 원본은 다른 이름으로 이미 보관돼 있다: act-1 = A-01-act-1-source.png · act-2 = A-02-act-2-source.png · act-4 = SC-02-act-4-source.png.
# AC-02 사용자 결정: 쇳물에 녹은 체스 기물 표현을 일부러 덜 했다 — 발주서 장면 줄에서 「관 속 녹다 만 흰 기물 조각」을 뺐다.
# D-523 로딩 · 안내서 LD-01 · LD-02 (tools/pixel/loading_import.py).
# LD-01 틀 시트 1695×928: 발주 220×120 ×8(1760×960)이 아니라 생성기 격자 — 격자 찾기 7~14px 최고점 10.14px · 가로 시작 3.3 · 세로 시작 4.56
#   (자유 찾기의 4.72px는 반 간격) → 167×91도트. 부품 크기도 발주와 다르게 왔다: 액자 65×41(발주 80×48) · 쪽지 90×23(96×24) ·
#   톱니 17~19×17(16×16) · 막대 65×14(48×8) · 채움 칸 8×8(4×4) — 늘리거나 줄이지 않고 받은 도트 그대로 쓴다(D-386).
# LD-02 장면은 레터박스 띠를 그리지 않았다 → 띠 걷기 끔(trim_max -1).
LOADING_GRID = {
    'LD-01': {'grid': (10.14, 3.3, 10.14, 4.56),
              # D-552: 진행 막대는 자기 상자에서 따로 잰 격자로 다시 뽑는다(gridmeasure, 8~12px) — 가로 9.70 · 시작 4.85(존재 1.58) /
              # 세로 9.839 · 시작 4.92(1.80). 시트 공통 10.14 정사각은 3~4% 굵어 65칸 동안 2칸 넘게 밀려 리벳이 2×1 덩어리로 깨졌다.
              # 시작은 상자 왼 · 위 기준. 결과 68×15(양 끝 마개 9칸) → index.html #boot .boot-bar 9-slice 5 9 2.
              'parts': {'load-bar': {'box': (34, 740, 702, 895), 'x': (9.70, 4.85), 'y': (9.839, 4.92)}}},
    'LD-02': {'name': 'loading-bench', 'trim_max': -1, 'trim_dark': 1},
}

# D-523 킹 카드 아이콘 KC-01 (tools/pixel/kc_import.py): 1731×909 — 발주 168×88 ×8(1344×704)이 아니라 생성기 격자.
#   격자 찾기 11~14px 최고점 13.2px · 시작 6.93 / 5.28 (자유 찾기의 6.58px는 반 간격) → 131×68도트, 아이콘 24~31칸(발주 32칸 안 2칸 여백과 맞다).
#   names = 발주서 KC-01 순서(왼쪽 위부터) → 카드: 왕의 한 걸음 = 왕의 걸음 · 왕명 · 친위 = 황금 흉갑 · 왕관의 무게 = 왕관 강타 ·
#   옥좌 반격 = 왕의 분노(상처 입은 만큼 되갚는다) · 왕의 숨 = 근위대 진군(둘레에 퍼지는 고리 — 곁의 폰) · 종이 왕관 = 왕의 돌진(D-498, 왕이 몸소) ·
#   체크 선언 = 왕의 시선(과녁 위 흑 킹 — 노려본 적의 발을 묶는다. 「체크 선언」 카드 checkCall은 이미 제 아이콘이 있다)
KC_GRID = {
    # D-552: 축마다 실측(gridmeasure, 마젠타 배경을 눌러 잼 · `kc_import.py --measure`) — x 13.203(존재 1.144) / y 12.47(1.121).
    # 옛 값 (13.2, 6.93, 13.2, 5.28)은 x는 맞았지만 y가 6% 굵어 68줄 동안 약 4칸 밀렸다(73줄이 맞다).
    'KC-01': {'grid': {'x': (13.203, 6.88, 'dp'), 'y': (12.47, 0.26, 'dp')}, 'colors': 28,
              'names': ['c.kingStep', 'c.kingDecree', 'c.royalGuard', 'c.crownSlam', 'c.wrath', 'c.kingGuard', 'c.kingCharge', 'c.regalGaze']},
}

ACT_GRID = {
    'AC-01': {'name': 'act-1', 'trim_max': 30, 'trim_dark': 0.25},
    'AC-02': {'name': 'act-2', 'trim_max': 30, 'trim_dark': 0.25},
    'AC-03': {'name': 'act-4', 'trim_max': 30, 'trim_dark': 0.25},
}


# D-521 PB-01 공정 판 칸 — 두 판본을 합친다 (tools/pixel/proc_tiles_import.py).
#  a안(build-res/order/PB-01-a-source.png): 1184×992 = 148×124 ×8 정수 격자 그대로(8×8 덩어리 비균일 0개), 칸 20×20 · 칸 사이 4도트, 왼위 (4,4)도트.
#     칸 짝 테: 밝은 칸 = 바깥 1도트 #80553A · 바닥 #5C4030 · 3째 줄 #80553A / 어두운 칸 = #3A2D26 · #2A2420 · 3째 줄 #3A2D26.
#  b안(PB-01-b-source.png): 1370×1148, 칸 223×194~198px로 정사각이 아니다(생성기 비정수). 칸 하나를 n칸으로 줄여 되살린 오차가
#     가로 36칸(6.19px)에서 이웃(34 · 38칸)보다 뚜렷이 낮다(컨베이어 8.69 / 9.48 · 10.31, 자석 기둥 11.73 / 14.28 · 13.82) → 원래 격자 ≈ 36×31도트.
#     칸 바깥 먹 테 trim px를 걷고, 비율을 지키려 가운데 정사각(세로 기준)만 잘라 무늬 자리 16×16(a안 테 2도트 안쪽)으로 다수결 축소한다.
PB01_GRID = {
    'a': {'origin': 4, 'scale': 8, 'cell': 20, 'gap': 4},
    'b': {'rows': [(24, 218), (241, 439), (462, 659), (683, 880), (903, 1101)],
          'cols': [(116, 339), (361, 584), (606, 828), (850, 1073)], 'trim': 12, 'pitch': 223 / 36},
    # 무늬 자리 (a안 칸 안쪽 2도트부터 16×16) · 가운데 차분한 자리 12×12 (기물이 서는 곳 — 발주서 칸 문법)
    'inner': (2, 16), 'calm': (4, 12),
    # 칸: (줄, 칸) · 어느 판 무늬 · 무늬 돌림(90° 단위, 시계 반대) — 자석 레일은 판에서 세로 기둥이므로 돌린다
    # soft = 대비 한 단 낮춤(컨베이어, D-532) · boost = 금 줄 한 단 올림(금 1단계, D-532) · iron = 갈색 없이 맞춤(b안 화살 홈이 프레임마다 갈색/쇠로 갈리던 것을 쇠로 고정) · calm=False = 가운데도 낮추지 않음(금 줄이 곧 정보)
    # use 'a' = 16칸으로 줄이면 b안 무늬가 뭉개지는 칸: 프레스 머리(둥근 머리 · 볼트가 흙덩이로) · 꺼진 구멍(먹 구멍이 짙은 갈색으로 묻힘)
    'tiles': {
        'conveyor0': {'rc': (0, 0), 'use': 'b', 'iron': True, 'soft': True}, 'conveyor1': {'rc': (0, 1), 'use': 'b', 'iron': True, 'soft': True},
        'conveyor2': {'rc': (0, 2), 'use': 'b', 'iron': True, 'soft': True}, 'conveyor3': {'rc': (0, 3), 'use': 'b', 'iron': True, 'soft': True},
        'press-warn': {'rc': (1, 0), 'use': 'b'}, 'press-hit': {'rc': (1, 1), 'use': 'a'}, 'press-dent': {'rc': (1, 2), 'use': 'b'},
        'magnet-rail': {'rc': (2, 0), 'use': 'b', 'rot': 1}, 'magnet-post': {'rc': (2, 1), 'use': 'b'},
        'furnace': {'rc': (3, 0), 'use': 'b'}, 'furnace-hot': {'rc': (3, 1), 'use': 'b'},
        'crack1': {'rc': (4, 0), 'use': 'b', 'calm': False, 'boost': True}, 'crack2': {'rc': (4, 1), 'use': 'b', 'calm': False}, 'crack3': {'rc': (4, 2), 'use': 'a'},
    },
}


# D-538 (리뷰 #6): 사건 그림 16장 재양자화 — R-01 재발주를 받기 전 임시. tools/pixel/event_requant.py가 읽는다.
# source = 받은 원본(build-res/order), size = 처음 반입의 복원 격자 칸 수(build-res/order/EV-grid/<이름>.png에 보존 — 초점 EVENT_FOCUS가 이 크기 기준),
# colors = 팔레트 상한(≤ 32 — D-388 「도트 강제」 위반인 생성기 그레인 · 그라데이션을 걷는다), despeckle = 외톨이 칸 정리 횟수
#   (밝기 차 40 이하 낱점만 — 조건 없이 걷어 보니 철망 · 사선 1도트 무늬가 끊겨 덩어리졌다. 남은 낱점은 R-01 재발주로 걷는다).
EVENT_REQUANT = {
    'scrapTrade': {'source': 'V-21-scrapTrade-source.png', 'size': (265, 189), 'colors': 32, 'despeckle': 3},
    'mirrorHall': {'source': 'V-37-mirrorHall-source.png', 'size': (237, 185), 'colors': 32, 'despeckle': 3},
    'coldForge': {'source': 'V-35-coldForge-source.png', 'size': (254, 198), 'colors': 32, 'despeckle': 3},
    'fieldMedic': {'source': 'V-34-fieldMedic-source.png', 'size': (262, 195), 'colors': 32, 'despeckle': 3},
    'bookCart': {'source': 'V-30-bookCart-source.png', 'size': (258, 189), 'colors': 32, 'despeckle': 3},
    'crownAltar': {'source': 'V-28-crownAltar-source.png', 'size': (265, 193), 'colors': 32, 'despeckle': 3},
    'copyPress': {'source': 'V-33-copyPress-source.png', 'size': (258, 192), 'colors': 32, 'despeckle': 3},
    'tollGate': {'source': 'V-36-tollGate-source.png', 'size': (246, 185), 'colors': 32, 'despeckle': 3},
    'echoWell': {'source': 'V-32-echoWell-source.png', 'size': (260, 197), 'colors': 32, 'despeckle': 3},
    'scrapHeap': {'source': 'V-23-scrapHeap-source.png', 'size': (256, 194), 'colors': 32, 'despeckle': 3},
    'rustBath': {'source': 'V-24-rustBath-source.png', 'size': (252, 191), 'colors': 32, 'despeckle': 3},
    'sleepingKing': {'source': 'V-31-sleepingKing-source.png', 'size': (257, 185), 'colors': 32, 'despeckle': 3},
    'cardSharp': {'source': 'V-26-cardSharp-source.png', 'size': (258, 199), 'colors': 32, 'despeckle': 3},
    'overtime': {'source': 'V-38-overtime-source.png', 'size': (255, 196), 'colors': 32, 'despeckle': 3},
    'castMold': {'source': 'V-27-castMold-source.png', 'size': (261, 197), 'colors': 32, 'despeckle': 3},
    'duelKnight': {'source': 'V-29-duelKnight-source.png', 'size': (248, 188), 'colors': 32, 'despeckle': 3},
}


# D-544 MM-01 꺼짐 단추 · 메뉴 단추 · 메뉴 아이콘 (tools/pixel/mm01_import.py): 받은 시트 1958×803(마젠타)은 발주 176×72 ×8(1408×576) 한 격자가 아니다 —
#   생성기가 줄마다 다른 크기로 그렸다(시트 전체 자기상관 첫 봉우리 11px · 두 축 위상 맞춤 10.2 ~ 12.2px로 갈린다). 부품 상자마다 경계 세기 위상 맞춤
#   (snap._score 두 축 합, 9 ~ 14px · 0.02 간격 — `mm01_import.py measure`)의 최고점을 쓴다: 꺼짐 단추 넷 10.16px(42×18도트 — 발주 32×20과 비가 달라
#   9-slice로 다시 짠다) · 메뉴 단추 12.24px(23×23) · 눌림 11.58px · 자물쇠 11.48px · 출하 상자 12.36 · 원부 12.24 · 스패너 12.34 · 문 12.36px.
#   값 = (간격, 가로 시작, 세로 시작) 원본 px.
MM01_GRID = {
    'parts': ['btn-iron-off', 'btn-brass-off', 'btn-crimson-off', 'btn-teal-off', 'btn-menu-up', 'btn-menu-down', 'btn-menu-off',
              'lock', 'menu.run', 'menu.ledger', 'menu.settings', 'menu.quit'],
    'grid': [(10.16, 52.38, 23.14), (10.16, 531.40, 23.14), (10.16, 1011.37, 23.14), (10.16, 1490.38, 23.14),
             (12.24, 418.73, 251.96), (11.58, 840.40, 255.26), (12.24, 1257.81, 251.96),
             (11.48, 196.32, 569.75), (12.36, 503.56, 579.71), (12.24, 850.43, 559.96), (12.34, 1195.25, 570.33), (12.36, 1523.74, 559.11)],
}

# D-544 R-02 앱 아이콘 전경 · 바탕 (tools/pixel/r02_icon_import.py): 둘 다 1254×1254 — 발주 32×32 ×32가 아니다.
#   전경: 두 축 경계 세기 최고점 18.72px(점수 9.44 — 18.5px 5.29 · 19.0px 4.39 · 발주 격자 39.19px 5.75) · 복원 오차도 국소 최소
#   (18.72px 10.34 / 18.5px 10.79 · 19.0px 11.66, 발주 32칸 21.06 — 32칸으로는 먹 외곽선 1칸 · 흰 테 1칸이 뭉개진다) → 67×67도트.
#   먹 외곽선 · 흰 테가 각 18 ~ 19px(1칸)로 잰 값과 맞다. 시작 = 위상 맞춤 (18.25, 3.74)에서 왼쪽 한 칸 앞(-0.47 — 왼쪽 자투리 칸이 검은 바탕).
#   바탕: 거의 단색이라 격자가 약하다(리벳 테 ~19px · 속 2×2 ~33px로 생성기가 고르지 않다) — 전경과 같은 18.72px 격자로 맞춘다(발주: 「전경과 같은 격자」),
#   시작 = 18.72px에서 바탕 위상 맞춤 (14.51, 12.64) 한 칸 앞.
R02_GRID = {
    'palette': ['#0B0B0E', '#16141C', '#24232B', '#33313B', '#56545E', '#8A8794', '#F1EDE4', '#BFB9AD', '#8E877A',
                '#4A3414', '#8A6416', '#C89B3C', '#F5C542', '#7A1218', '#B63735', '#38BFC7'],
    'fg': {'source': 'R-02-icon-fg-source.png', 'grid': (18.72, -0.47, 3.74), 'dots': 67},
    'bg': {'source': 'R-02-icon-bg-source.png', 'grid': (18.72, -4.21, -6.08), 'dots': 67},
}

# D-549 R-02c 앱 아이콘 B 「태엽 감긴 종이왕」 · 스토어 키아트 A 「그림자 왕」 (tools/pixel/r02c_icon_import.py): 둘 다 1254×1254 생성기 출력.
#   축마다 따로 잰다 — 경계 세기 위상 맞춤(snap._score, 8 ~ 45px · 0.02 간격) + 한 축 복원 오차(칸 가운데 열/줄로 채워 원본과 평균 차, 위상 p/16 간격).
#   B: 가로 20.20px(점수 6.03 · 복원 오차 3.49 — 20.0 3.85 · 20.5 3.85 · 절반 10.1은 오차만 고르게 줄 뿐 경계 점수가 못 미친다) ·
#      세로 20.60px(점수 8.79 · 오차 3.79 — 20.3 4.27 · 20.9 3.94 · 2배 41.14 점수 6.63). 가로 ≠ 세로(생성기가 칸을 조금 납작하게 그렸다).
#      시작 = 위상 (가로 17.67 → 앞 자투리 칸 -2.53부터 · 세로 6.18 — 앞 6px은 반 칸이 안 돼 버림, 끝 자투리도 반 칸 기준) → 62×61도트.
#   A: 가로 12.04px(점수 4.91 · 오차 12.05px 2.16 / 11.95 2.51 · 12.15 2.57) · 세로 12.00px(점수 4.03 · 오차 2.34 / 11.9 2.53 · 12.1 2.64),
#      시작 1.81 · 1.80 → 104×104도트. 어두운 면이 넓어 격자 신호가 B보다 약하다(점수 4 ~ 5) — 두 지표가 같은 자리를 가리킨다.
#   팔레트: 칸 가운데 최빈색 도트를 가중 k-평균(√칸 수 — 몇 칸뿐인 색도 살린다)으로 B 20색 · A 24색. 청록 보석 두 단 · 황동 · 진홍 계단을 지킨다.
#   B 바탕 층 = 어두운 바탕 + 진홍 두 단(바깥 · 안) — 종이왕에 가려진 후광 칸은 보이는 계단 경계에 맞춘 원으로 채운다.
R02C_GRID = {
    'B': {'source': 'R-02c-icon-B-source.png', 'grid': (20.20, 17.67, 20.60, 6.18),
          'palette': ['#0D090A', '#181420', '#362117', '#531920', '#831D26', '#71471B', '#A2692A', '#B77930', '#14ABB2', '#9D816C',
                      '#D27E50', '#FA852C', '#DA993E', '#BFA28C', '#FBBD52', '#E9AB7F', '#92DCDC', '#FAD38A', '#E4CDB6', '#FBF1DC'],
          'bg': '#181420', 'halo': ['#531920', '#831D26']},
    'A': {'source': 'R-02c-keyart-A-source.png', 'grid': (12.04, 1.81, 12.00, 1.80),
          'palette': ['#0A0A10', '#16121A', '#2F141A', '#23202A', '#6D131B', '#372F3B', '#80151B', '#4F373E', '#981B1A', '#703935',
                      '#5C464D', '#CA2227', '#9A4732', '#CE421D', '#E05E23', '#BC7238', '#8A7D74', '#EF802E', '#AD9C8C', '#FAB941',
                      '#C9B4A0', '#E7D6C4', '#F6EADD', '#FDFCFC']},
}

# D-550: R-02b 종이 왕관 문장(1254×1254, 사용자 단독 원본). 정사각 도트가 아니다 — 축마다 따로 실측.
# r02b_crown_import.py measure: 경계 히스토그램 + 축별 복원 오차(왕관 상자 measure_box 안). x/y = (칸 px, 위상 px, 칸 수).
R02B_GRID = {
    'source': 'R-02b-crown-source.png',
    'measure_box': (120, 300, 1110, 960),
    # x: 경계 집중도 19.60px R 0.552(18.60 0.324 · 18.72 0.214 · 39.2 0.209) · 복원 오차 19.58px 9.78(19.05 10.77 · 18.6 10.91) → 64칸
    # y: 경계 집중도 18.60px R 0.435(19.60 0.379 · 19.0 0.235) · 복원 오차 18.66px 9.51(19.6 10.53) → 68칸(마지막 칸은 바탕)
    'x': (19.58, -1.06, 64),
    'y': (18.66, -6.22, 68),
    # 팔레트 = 받은 그림 자신의 색 7개(복원 칸 최빈색을 묶은 중앙값): 바탕 · 먹 · 마분지 빛/중간/그늘/어둠 · 청록 장식.
    # 바탕만 받은 #15111B 대신 게임 쇠 바탕 #16141C(theme-color와 같게 — 차이 ΔRGB ≤ 3)
    'bg': '#16141C', 'ink': '#09090B', 'jewel': '#33B7C9',
    'ink_evidence': 0.1,  # 외곽선 끊긴 자리의 투명 칸을 먹으로 메우는 원본 근거(그 칸 안 먹 픽셀 비율 하한)
    'palette': ['#16141C', '#09090B', '#DFA45D', '#B57A3A', '#955E2A', '#794A21', '#33B7C9'],
}

# D-552: 분대원 얼굴 N-crew-* (crew_faces.py) — 축마다 실측한 도트 간격 · 시작(px), 5.5~9.5px 띠에서 마젠타 배경을 눌러 잼.
# 존재 점수(어긋난 간격 오차 ÷ 제 간격 오차) 괄호. 반입은 이 격자 2×2를 한 칸으로 묶는다(crew_faces.MERGE).
# 옛 판은 상자 ÷ 56으로 맞춘 13.6~14.9px 칸이라 실측 2배와 1~7% 어긋났다.
CREW_GRID = {
    'K': {'x': (7.333, 1.83), 'y': (6.967, 1.45)},   # 1.086 · 1.107
    'P': {'x': (8.34, 0.87), 'y': (8.836, 4.05)},    # 1.146 · 1.083
    'N': {'x': (6.733, 5.47), 'y': (7.21, 4.06)},    # 1.070 · 1.104
    'B': {'x': (7.253, 2.57), 'y': (7.177, 3.29)},   # 1.073 · 1.135
    'R': {'x': (7.083, 6.79), 'y': (7.95, 1.33)},    # 1.110 · 1.279
    'Q': {'x': (6.723, 3.36), 'y': (6.979, 6.11)},   # 1.102 · 1.073
}


# D-552: 받은 부품 아이콘 I-14A~D · I-15 (i14_import.py · scenario_delivery_import.py → 32×32).
# 받은 그림은 32칸보다 훨씬 잘게(약 110~150도트) 그렸다 — 몸을 32칸에 넣으려면 여러 도트를 한 칸으로 묶을 수밖에 없다.
# 옛 판은 「몸 상자 ÷ 28」로 칸을 맞춰(23~40px) 실측 도트와 아무 관계가 없었다 → 칸 경계가 도트 가운데를 지나 얼룩이 생겼다.
# 이제 칸 = 실측 도트 간격의 정수배(cell = k × 간격, 비율 그대로 두 축 같은 칸), 칸 경계는 실측 격자선 위(gridmeasure.fit_icon).
# x · y = (간격, 시작 — 원본 그림 좌표 px), 존재 점수 괄호. crop = 원본에서 아이콘 칸(None이면 전체).
ICON_GRID = {
    'relayGear':   {'src': 'I-14A', 'crop': None, 'x': (7.401, 92.09), 'y': (7.693, 155.6), 'cell': 5 * 7.401},    # 1.188 · 1.056 → 29×28칸
    # x 14.13 · y 16.72(1.086 · 1.141)가 서로 정수배가 아니다 — 세로 2배(33.43)가 28칸에 맞는다(가로 2.37배)
    'siegeLatch':  {'src': 'I-14B', 'crop': None, 'x': (14.131, 160.65), 'y': (16.717, 175.09), 'cell': 2 * 16.717},
    'sharedPlate': {'src': 'I-14C', 'crop': None, 'x': (18.511, 230.35), 'y': (19.241, 118.23), 'cell': 2 * 18.511},  # 1.284 · 1.192
    'relaySeal':   {'src': 'I-14D', 'crop': None, 'x': (6.464, 177.4), 'y': (6.459, 217.15), 'cell': 5 * 6.464},     # 1.161 · 1.051 → 28×26칸
    # 가로 7.87 · 세로 23.35(1.064 · 1.082) — 47.22 = 가로 6배 = 세로 2.02배
    'deathMark':   {'src': 'I-15D', 'crop': None, 'x': (7.87, 288.48), 'y': (23.348, 79.89), 'cell': 6 * 7.87},
    # I-15ABC 2172×724 = 세 칸(가로 724씩). A 가로 15.50/7.66(반 간격도 1.092) · 세로 15.91 → 3 × 7.658
    'lastBreath':  {'src': 'I-15ABC', 'crop': (0, 0, 724, 724), 'x': (7.658, 7.75), 'y': (15.908, 1.99), 'cell': 3 * 7.658},
    'ledger':      {'src': 'I-15ABC', 'crop': (724, 0, 1448, 724), 'x': (8.555, 729.88), 'y': (8.305, 0.43), 'cell': 3 * 8.555},  # 1.155 · 1.156
    'veteran':     {'src': 'I-15ABC', 'crop': (1448, 0, 2172, 724), 'x': (15.135, 1457.46), 'y': (12.514, 4.17), 'cell': 2 * 12.514},  # 1.222 · 1.153
}
