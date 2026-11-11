"""장면 원본을 재반입할 때도 보존할 변환값. 확인된 수동값만 등록한다."""

# D-349: 이야기 컷은 가로 약 300칸, 원본 도트 간격 5.9px로 맞췄다.
# credits-bg는 원본 재변환과 현재 PNG의 RGBA 전 픽셀 일치로 재확인했다(D-423).
MANUAL_PITCH = {'credits-bg': 5.9}


def options(name):
    """그림의 색은 유지하고, 수동값이 없는 장면은 기존 자동 격자 복원을 쓴다."""
    return {'colors': 0, 'pitch': MANUAL_PITCH.get(name)}
