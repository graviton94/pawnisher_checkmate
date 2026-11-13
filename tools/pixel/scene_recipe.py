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
    'new-law': 941 / 180, 'gilded-fallen': 941 / 180}


def options(name):
    """그림의 색은 유지하고, 수동값이 없는 장면은 기존 자동 격자 복원을 쓴다."""
    opts = {'colors': 0, 'pitch': MANUAL_PITCH.get(name)}
    # S-01: 자동 검출 6.21px 확인. 균일한 300×135 격자로 원본 1870:841 비율을 보존한다.
    if name in ('epilogue-hands', 'throne-mold', 'departure-dock', 'shipping-interior',
                'departure-decision', 'shipping-company', 'gilded-solitude',
                'companion-rest', 'companion-crossroad', 'returned-box', 'new-law', 'gilded-fallen'):
        opts['uniform'] = True
    return opts
