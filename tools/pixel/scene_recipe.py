"""장면 원본을 재반입할 때도 보존할 변환값. 확인된 수동값만 등록한다."""

# D-349: 이야기 컷은 가로 약 300칸, 원본 도트 간격 5.9px로 맞췄다.
# credits-bg는 원본 재변환과 현재 PNG의 RGBA 전 픽셀 일치로 재확인했다(D-423).
MANUAL_PITCH = {'credits-bg': 5.9, 'epilogue-hands': 1870 / 300,
    # D-434: 수령본 1672×941 → 320×180. 전체를 한 번 샘플링하고 마지막 경계는 원본 끝.
    'throne-mold': 941 / 180, 'departure-dock': 941 / 180, 'shipping-interior': 941 / 180,
    # D-442: S-05~07 원본1672×941 → 전체320×180 격자, 색 수 축소 없음.
    'departure-decision': 941 / 180, 'shipping-company': 941 / 180, 'gilded-solitude': 941 / 180,
    # D-450: S-08~12 수령본(webp 1672×941 · S-12만 1671×941) → 320×180 균일 격자, 색 수 축소 없음.
    'companion-rest': 941 / 180, 'companion-crossroad': 941 / 180, 'returned-box': 941 / 180,
    'new-law': 941 / 180, 'gilded-fallen': 941 / 180,
    # D-451: S-13~S-20 (받으면 같은 320×180 균일 격자 — 원본 크기가 다르면 여기 값을 고친다)
    'chained-door': 941 / 180, 'old-spring': 941 / 180, 'scarred-wall': 941 / 180, 'crown-dais': 941 / 180,
    'casting-floor': 941 / 180, 'gold-cast': 941 / 180, 'crown-gears': 941 / 180, 'white-land': 941 / 180}


def options(name):
    """그림의 색은 유지하고, 수동값이 없는 장면은 기존 자동 격자 복원을 쓴다."""
    opts = {'colors': 0, 'pitch': MANUAL_PITCH.get(name)}
    # S-01: 자동 검출 6.21px 확인. 균일한 300×135 격자로 원본 1870:841 비율을 보존한다.
    if name in ('epilogue-hands', 'throne-mold', 'departure-dock', 'shipping-interior',
                'departure-decision', 'shipping-company', 'gilded-solitude',
                'companion-rest', 'companion-crossroad', 'returned-box', 'new-law', 'gilded-fallen',
                'chained-door', 'old-spring', 'scarred-wall', 'crown-dais', 'casting-floor', 'gold-cast', 'crown-gears', 'white-land'):
        opts['uniform'] = True
    return opts


# 발주 기물 반입 (D-423 · 2026-11-14 P-01~05 · G-01~03): tools/pixel/piece_import.py가 읽는다.
# body = 실루엣(외곽선 포함 · 흰 테 제외)의 세로 칸 수. 원본 도트 간격은 약 15px(P-03 주기 14.8px 검출, 나머지도 실루엣 ~810px / 54 ≈ 15)
# → 원래 격자 그대로 54칸으로 복원한다(바탕 기물 47칸보다 7칸 크지만 이형이 가늘어 판 위에서 읽히려면 필요). 간격(px) = 원본 실루엣 높이 / body.
# outline = 실루엣 안쪽 먹선 두께, mirror = 좌우 대칭('shape' 실루엣만 · 'all' 먹선까지), dx = 가로 위치 보정.
# 실측 간격(px, 2026-11-14 반입): 대포 14.69 · 낙타 14.32 · 메뚜기 14.85 · 대주교 15.39 · 총독 15.5 · 거대 폰 11.16 · 룩 11.14 · 퀸 11.19
PIECE_GRID = {
    'R:cannon': {'body': 54, 'outline': 2, 'mirror': 'all'},
    'N:camel': {'body': 54, 'outline': 2},
    'Q:hopper': {'body': 54, 'outline': 2, 'mirror': 'shape'},
    'B:archbishop': {'body': 54, 'outline': 2},  # 1차 원본 build-res/order/P-04-v1-source.png로 반입 — 재발주(갈기가 흐리고 판 위에서 비숍과 구분 안 됨)
    'R:chancellor': {'body': 54, 'outline': 2},
    # 거대 128칸: 높이 112~120(흰 테 포함) → 몸 108칸(원본 간격 11.2px ≈ 생성기 격자 그대로), 먹선 2 · 흰 테 4.
    # 대칭은 맞추지 않는다 — 찌그러진 폰 머리 · 녹아 붙은 퀸 뿔 · 부러진 룩 성가퀴가 발주한 「불량」이다
    'P:giant': {'body': 108, 'outline': 2},
    'R:giant': {'body': 108, 'outline': 2},
    'Q:giant': {'body': 108, 'outline': 2},
}
