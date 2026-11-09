"""
그래픽 정본 합본 (2026-11-05, 사용자: "FX 랩이랑 타격감 연구소, 핵심만 지금 스크린샷 기준으로 싹 리뉴얼하면서 요약 합본 하나").
FX 랩(tools/fxlab) · 타격감 연구소(tools/impactlab) 두 아티팩트를 대신한다. 화면은 tools/artguide/shots/의 실제 게임 스크린샷(915×412).
사용: python3 -I tools/artguide/build.py <출력.html>   → 같은 아티팩트에 다시 올린다 (CLAUDE.md)
"""
import base64
import html
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SHOTS = os.path.join(HERE, 'shots')
UPDATED = '2026-11-06'


def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def img(name, alt, cls='shot'):
    p = os.path.join(SHOTS, name)
    mime = 'image/png' if name.endswith('.png') else 'image/webp' if name.endswith('.webp') else 'image/jpeg'
    return f'<img class="{cls}" src="data:{mime};base64,{b64(p)}" alt="{html.escape(alt)}" loading="lazy">'


def font(name):
    return b64(os.path.join(ROOT, 'node_modules', 'galmuri', 'dist', name))


# 원칙 (D-216 · D-213 · D-193 · D-180)
RULES = [
    ('도트만', '1도트 = 정수 px. 단색 칸 · 검은 바깥선 · 단단한 그림자. 코드로 찍은 PNG · 스프라이트만 쓴다.', 'D-216'),
    ('금지 셋', '단순 페이드(투명도 보간) · 그라데이션 · 선형 이동만 하는 슬라이드. 둥근 모서리 · 번짐도 없다.', 'D-216'),
    ('사라짐 · 나타남', '사라질 때는 도트 디더(체크무늬로 성겨짐), 나타날 때는 계단 프레임(steps).', 'D-193'),
    ('움직임 셋 박자', '예비 동작(모으기, 느리게→빠르게) → 터짐(빠르게→느리게) → 출렁임. 공격 한 번 1초 안.', 'D-180'),
    ('글씨', '갈무리 격자 배수만 — 12 · 24 · 36px 갈무리11(굵게 가능), 15 · 30 · 45 · 60px 갈무리14(보통만). 가짜 굵게 · 기울임 금지.', 'D-213'),
    ('예외', '사용자가 발주서로 받아 넣은 외부 도트 그림(장면 · 배경 · 초상)만 이 규칙 밖이다. 격자만 맞추고 색은 살린다.', 'D-216 · D-185'),
]

COLORS = [
    ('#38BDF8', '청록', '내 편 HP · 이동 점 · 내 표식'),
    ('#E5262F', '진홍', '적 HP · 적 예고 화살표 · 위험'),
    ('#FACC15', '금', '처치 · 처치 숫자 · 황금 등급'),
    ('#C89B3C', '황동', 'UI 장치 · 버튼 테 · 태엽'),
    ('#F08A3C', '쇳물 주황', '속전 보일러 · 용광로 · 불길'),
    ('#3F7FB8', '청강', '희귀 등급 테'),
    ('#F4F1EA', '백자', '흰 기물 · 바깥 흰 테'),
    ('#0B0B0E', '먹', '외곽선 · 바탕'),
]

# 타격감 박자 (D-179 · D-180 · D-184 — 실제 값은 src/data/fx.ts · motion.ts)
BEATS = [
    ('예비 동작', '0.19 ~ 0.4초', '뒤로 0.15칸 물러서며 몸을 낮춘다. 느리게 시작해 빨라진다.'),
    ('터짐', '한 박 (약 0.05초)', '지수 곡선으로 돌진해 꽂힌다. 앞선 모으기와의 대비가 손맛이다.'),
    ('정지 프레임', '타격 60 ~ 70ms · 처치 120 ~ 130ms', '맞는 순간 화면이 멎는다. 반장 마무리는 완전 정지 0.12초 + 총알 시간.'),
    ('출렁임', '0.3 ~ 0.6초', '찌그러짐과 반동(부피 유지), 감쇠 흔들림. 작은 타격에는 흔들림이 없다.'),
    ('남은 흔적', '0.5 ~ 1초', 'HP 흰 잔상, 바닥 재 · 파편이 도트 디더로 꺼진다. 숫자는 도트 숫자로 떠올라 계단으로 접힌다.'),
]

BOSS_FRAMES = [('boss-600.jpg', '0.6초 · 모으기와 조명'), ('boss-1000.jpg', '1.0초 · 꽂히는 순간'), ('boss-1350.jpg', '1.35초 · 정지 프레임 · 카메라 펀치'),
               ('boss-1700.jpg', '1.7초 · 기물이 조각으로 부서짐'), ('boss-2200.jpg', '2.2초 · 파편 · 불씨'), ('boss-2900.jpg', '2.9초 · 여운')]

SCREENS = [
    ('출하 흐름', [('title.jpg', '타이틀 — 공장 배경 · 정품 폰 도장 · 붉은 사선 · 로고'), ('menu-gears.jpg', '메뉴 — 오른쪽 아래 맞물려 도는 도트 톱니 (D-225)'), ('map1.jpg', '1막 지도 (D-397) — 불투명 바닥(막 표지 덮기 + 2×2 먹 디더) · 머리 줄 막 꼬리표 · 이름 24 · 지갑 + 꼬리표 · 갈 곳은 멈춘 황동 톱니 테 · 아래 움푹 칸에 안내 + 범례'), ('map-boss.jpg', '지도 노드 미리보기 (D-388 · D-397) — 고른 하나만 톱니가 돈다 · 아래 띠 = 아이콘 · 이름 24 · 꼬리표 ≤ 3(적 수 · 보상 · 특성) · 적 명단 · 황동 「진입」'),
                 ('map2.jpg', '2막 지도 — A-02'), ('map3.jpg', '3막 지도 — A-03'), ('actintro.jpg', '막 타이틀 카드 (D-388 · D-389 · D-397) — 위 막 그림 덮기 · 아래 먹 바닥에 막 꼬리표 · 이름 36 · 자막 띠 두 줄(서술 + 독백)')]),
    ('대국', [('battle.jpg', '대국 (2막 조립 판) — 왼쪽 손패 카드 · 오른쪽 계기 창 · 붉은 예고선 · HP 예측 숫자. 손패 이름 아래 「어떤 · 효과」 작은 표지, 기본 이동 카드는 표지 없음 (D-332)'),
             ('board-check.jpg', '2막 조립 판 · 검문 적 = 검붉은 쇠 속 칠 (D-224)'),
             ('board-boss.jpg', '3막 출하 판 · 반장 적 = 보라 속 칠 (D-224)'),
             ('armed.jpg', '탄창 한 발 장전 — 한 번 누르면 펼쳐져 설명이 나온다'),
             ('cracked.jpg', '심장 톱니가 깨진 분대원 — 외곽선은 그대로, 속 칠만 어둡게 (D-219)'),
             ('crackrite.jpg', '처음 쓰러질 때 — 큰 톱니가 흔들리다 깨진다 (폐기 의식 대신)')]),
    ('카드 (D-367 ~ D-379 정본)', [('card-frames.png', '카드 틀 정본 — 명령 · 부품 · 분대원 × 일반(무쇠 · 리벳) · 희귀(황동 · 톱니 모서리 · 구슬 테) · 황금(금 · 왕관 볏 · 붉은 보석 · 옆 띠), 뒷면은 앱 문장 음영. 글 자리는 cardart.py가 틀과 같은 숫자로 card-layout.css를 만든다'),
               ('card-kit.jpg', '본문 2 : 3 고정 칸 — 위 칸 묘사 2줄 · 점선(늘 2/5 자리) · 아래 칸 3줄(조건 / 효과 한 줄씩), 줄바꿈 없이 넘치면 그 줄만 10px. 화면별 정보는 카드 아래 철판 받침(함께 오는 카드)'),
               ('card-recruit.jpg', '분대원 카드 — 공격 마름모 · HP 원 · 생명 하트 2칸(빈 자리는 깨진 하트) · 종류 띠 HP 줄 · 위 칸 기록(처치 · 피해 · 쓰러짐) 또는 첫마디 · 아래 칸 특성 이름 / 효과'),
               ('card-deck.jpg', '덱 보기 — L 창 움푹 칸 안 카드 격자(안에서만 스크롤) · 장수는 카드 위 꼬리표 (D-394)'),
               ('card-longpress.jpg', '판 위 길게 누름 — 분대원 카드가 판 영역 안에'),
               ('card-handpeek.jpg', '전투 손패 — 작은 줄은 그대로, 길게 누름 · 마우스 올림 = 정본 카드 크게 보기'),
               ('card-event.jpg', '사건 결과 장면 — 사건 창 안을 그림(덮기) + 2×2 먹 디더가 덮고 실제 카드 · 분대원 카드에 FX · [넘긴다] (D-395)')]),
    ('대국 밖', [('reward.jpg', '보상 — 고르기 화면(.scr-pick): 명패 「전리품」 · 나사 꼬리표 · 카드 받침 줄(받침 51×69 정수배) · 받침 아래 덱 맞물림 · 정비는 머리 줄 청록 단추 · [건너뛴다 | 고른다] (D-394)'),
               ('shop.jpg', '고물상 — 장소 화면(바탕형): 카드 4 + 오른쪽 열 부품 · 서비스 선택지 · 가격 꼬리표 · 가운데 줄에 고른 물건 풀이 · [떠난다 | 산다], 넘김 없음 (D-394)'), ('forge.jpg', '작업대 — 장소 화면: 왼쪽 정비공 그림(정수배 덮기) · 오른쪽 선택지 판 넷 · [떠난다 | 고른다] (D-394)'),
               ('event.jpg', '사건 — L 창 .win-scene: 명패 · 나사 꼬리표(위 테) · 왼쪽 액자 그림(정수배 덮기 · 초점) + [떠난다 | 고른다] · 오른쪽 서술 두 줄 · 대사 칸 · 선택지 판 ≤ 2(정보 단추 → 풀이) (D-395)'), ('crew.jpg', '분대 — L 창 · 분대원 카드 한 줄 · [닫는다 | 도감] (D-394)'),
               ('endclear.jpg', '출하 완료 — 결과 장면(.scr-place): 왼쪽 UI-06 그림 40% · 수치 넷 · 분대 칩 · 새로 열림 꼬리표 (D-394)'), ('endfail.jpg', '하자 폐기 — 같은 결과 장면, UI-06 용광로 그림 (D-394)')]),
]

TOOLS = [
    ('기물 정본', 'tools/pixel/pieces64.txt (흑백 통일: unify.py · 주인공: paperking.py) → python3 -I tools/pixel/maker.py export (72칸 캔버스, public/pieces/를 손으로 고치지 않는다)'),
    ('Piskel 왕복', 'python3 -I tools/pixel/piskel.py export | import (build-res/piskel/)'),
    ('16칸 아이콘', 'tools/pixel/icons16.py export public/ui/icons16'),
    ('HUD 부품', 'python3 -I tools/draw-hud.py → src/assets/ui/kit/'),
    ('판 칸 · 소품', 'tools/draw-board.py · tools/draw-assets.py'),
    ('받은 장면 그림', 'python3 -I tools/scene-import.py <그림> <파일 이름> <번호> (격자만 맞추고 색은 살림)'),
    ('이 합본', 'python3 -I tools/artguide/build.py <출력.html> → 같은 아티팩트에 다시 올린다'),
]

# 검토 중 (움직이는 webp = 실제 게임 녹화, 915×412 · 끝나면 처음부터 다시)
REVIEW = [
    ('rewind-turn.webp', '턴 되감기 「◀◀ 역행」 (D-236) — 판이 잿빛으로 멈추고 톱니가 거꾸로 돈다 → 「시간의 태엽을 거꾸로 감는다」 → [시간을 거스른다] → 청록 테이프가 거꾸로 감기는 0.8초. 가볍고 빠르게'),
    ('rewind-death.webp', '죽음 되감기 「초월」 (D-236 · D-237) — 적 차례에 킹이 부서지는 순간 판이 잿빛으로 굳는다 → 같은 장면에서 쓰러진 서술(잿빛 글, 톱니 멈춤) → 「그때, 가슴속 톱니 하나가 거꾸로 맞물린다.」 톱니가 박히며 거꾸로 돈다 → “아직이다…!” → [운명을 거스른다] → 흰 정지 프레임 · 금빛 「초월」 → 작은 황동 톱니들이 소용돌이치며 킹 자리로 감겨 든다 → 도트 빛기둥(단면 8장)이 내리꽂히고 킹이 빛 속으로 떨어져 박힌다 → 톱니 고리 빛살 폭발 → 「태엽이 다시 감긴다. 당신은, 눈을 뜬다.」'),
]

# D-246 시안 (사용자 피드백 8 · 9 · 10 · 12 · 13, 2026-11-06) — tools/artguide/mock/d246.html을 12fps로 녹화. 정해 주면 게임에 넣는다
D246 = [
    ('9. 반장 등장 컷신 — 영화식 띠 → 초상화 → 이름', [
        ('d246-boss-plate.webp', '철갑 반장 — 위아래 검은 띠가 4계단으로 닫힘 → 반장 색 체크 한 장 번쩍 → 초상화가 오른쪽으로 물러섰다(예비) 3계단에 꽂히고 흔들림 → 「1막 반장」 · 이름이 색 갈림 두 장으로 내리꽂힘 → 칭호 · 규칙이 한 자씩. 불씨가 아래에서 오르고 아래 띠에 불혀. 끝에 띠가 닫혔다 열리며 대국으로'),
        ('d246-boss-spawn.webp', '조립 반장 — 같은 문법, 효과만 반장 것: 초록 훑는 줄(D-347 청록 → 초록)(4도트 계단) · 램프 불꽃 · 아래 띠 위로 컨베이어 폰이 흘러감'),
        ('d246-boss-thorns.webp', '출하 반장 — 등장 순간 붉은 가시 파편이 사방으로 튀었다 떨어지고, 가시 끝이 십자로 반짝'),
    ]),
    ('10. 반장 판 · 기물 — 초상화에서 뽑은 색', [
        ('d246-boss-boards.png', '반장 라운드 전용 판과 적 기물 속 칠 (외곽선 · 흰 테는 그대로 — D-221). 철갑 = 그을린 철판 + 쇳물 금 · 쇠녹 갈색 기물 / 조립 = 컨베이어 철판 + 초록 램프 · 초록 기물 (D-347) / 출하 = 닦은 쇠 + 붉은 리벳 · 검붉은 기물'),
    ]),
    ('10. 반장 기믹 연출 — 반장마다 다른 손맛', [
        ('d246-fx-plate.webp', '철갑 「불꽃 줄 폭격」 — 예고 줄이 150ms 계단으로 깜빡 → 판 한 장 어두워짐(예비) → 불기둥이 3계단으로 솟고 흔들림 → 맞은 기물 번쩍 · −12 → 불길은 디더로 꺼짐'),
        ('d246-fx-spawn.webp', '조립 「찍어 내기」 — 프레스가 천천히 들렸다(예비) 2계단에 쾅 → 먼지 조각이 좌우로 → 프레스가 올라가면 새 폰이 통통'),
        ('d246-fx-thorns.webp', '출하 「되받아침」 — 나이트가 몸을 낮췄다 덮침 · −18 → 반장 가시가 3계단으로 돋음 → 붉은 파편이 나이트로 감속하며 되돌아가 붉게 번쩍 · −6'),
    ]),
    ('12. 끝 판을 깬 뒤 — 크레딧 → 기록 사진', [
        ('d246-ending-credits.webp', '엔딩 크레딧 — E-01 그림을 2배로 깔고 체크 디더로 어둡게, 글줄은 83ms마다 2도트 계단으로 올라감. 이번 출하를 끝까지 함께한 분대 · 쓰러진 이들(이름 · 시리얼 · 쓰러진 곳)이 실제 기록에서 들어감 → 「그리고, 끝까지 감아 준 당신에게.」'),
        ('d246-ending-photo.webp', '출하 기록 사진 — 셔터 흰 한 장 → 액자가 들렸다 박힘 → 분대가 한 기씩 계단으로 → 붉은 「출하 완료」 도장이 쾅, 잉크가 튐 → 오른쪽에 기록이 한 줄씩. [사진 저장](PNG로 내려받기) · [다시 출하]'),
    ]),
]

# D-259 디자인 문법 정본 (docs/design-system.md 요약)
LAYERS = [
    ('장면', '3px', '받은 장면 그림 · 판 · 기물 · 사건 장치 · 소품', '도트 캔버스 + pxkit 재질. 받은 그림은 격자만 맞춘다'),
    ('장치', '2px', '패널 · 명패 · 단추 · 칸 · 테이프', 'UI 크롬 9-slice + 갈무리'),
    ('빛', '3px', '불꽃 · 불씨 · 연기 · 빛살 · 번쩍', 'pxfx 입자 · 빛만. 더하기 빛 · 연기 반투명은 이 층에서만'),
]
MATERIALS = [
    ('철', '구조 · 틀 · 중립', ['#14131a', '#1f1e27', '#2c2d38', '#41434f', '#5d606d', '#868a98', '#b9bdc8']),
    ('황동', '손댈 것 · 보상 · 이름', ['#2b1a06', '#5a3a0e', '#8a5a14', '#b98424', '#d9a838', '#f4d27a', '#fff1c0']),
    ('쇳물', '위험 · 힘 · 열', ['#3a0c06', '#7a1c08', '#c23a0c', '#ec6a1a', '#f8a03a', '#ffd27a', '#fff6d8']),
    ('종이', '글 · 기록 · 주인공', ['#3a3328', '#6e6452', '#a39a84', '#cfc6ae', '#e8e0cc', '#f4f1ea', '#ffffff']),
    ('녹', '쇠락 · 손해', ['#24110b', '#4a2112', '#74361a', '#9a4c22', '#c06a30', '#e0904a', '#f4b47a']),
    ('신호 청록 · 진홍', '내 편 · 합격 / 적 · 불량 — 등불의 빛으로만', ['#0e4650', '#2e969c', '#8ee8ea', '#5a0c12', '#c81e28', '#ff6b6b']),
]
LIGHT = ['1도트 먹 테', '위 가장자리 +2단 · 왼 가장자리 +1단 (빛은 왼쪽 위)', '몸 = 램프 가운데', '아래 · 오른 가장자리 −1단', '먹 그림자 1~3도트 (오른아래, 반투명 없음)',
         '부피 있는 물건은 3/4 시점: 위 면 + 앞 면 (box3)', '중간 톤은 같은 램프 이웃 단끼리 베이어 디더만', '유리 = 어두운 안 + 대각 반사 두 줄, 등불 = 둥근 유리 + 흰 반사 한 점']
PARTS = [
    ('철판 패널', '.panel9', '모든 창 · 팝업 · 안내창 · 사건 장면 테'), ('황동 명패', '.plate', '창 이름 — 패널 위 가장자리에 걸친다'),
    ('움푹 칸', '.inset', '목록 · 기록 · NPC 대사 · 사건 풀이'), ('단추', '.btn 철 · 황동 · 진홍 · 청록', '동사 하나. 사건 선택지 = 선택지 판 .choice (D-395)'),
    ('손짓 테이프', '.ev-tap', '「▼ 무엇을 한다」 — 종이 테이프'), ('결과 줄', 'evstage.ts .ev-res', '사건 결과 — 실제 카드 얼굴 · 기물 + HP 바에 FX, 말은 대사가 (D-260)'),
    ('재질 덩어리', 'block · box3 · rivet · lamp', '장면 속 물건은 모두 이것으로'), ('도트 글씨', 'pixelText()', '장면 속 글은 갈무리를 단색 도트로'),
]
AUDIT = [
    ('사건 15종', '고침', '전용 소품 · 기계 · 상자 · 명패 → 컷씬 + 대사 + 실제 카드 · 기물 FX (D-260)'),
    ('확률 사건 셋', '고침', '기계 · 상자 그림 → 동전 하나 · 사각 칸 셋만'),
    ('그림 없는 사건 7종', '고침', '검은 칸 + 편지 아이콘 → 공용 사건 배경 (장면 그림이 오면 교체)'),
    ('사건 창 선택지 · 대사 · 장면 테', '고침', '얇은 선 상자 → 철 단추 · 움푹 칸 · 철판 테'),
    ('대국 「적 차례」 띠', '다음', '먹 테 없는 납작한 붉은 띠 → 진홍 쇠 띠 + 계단 등장'),
    ('안내창 · 팝업 (심장 톱니 깨짐 등)', '다음', '얇은 선 상자 → 철판 패널 + 황동 명패 머리'),
    ('작업대 · 토스트 · 독백', '다음', '얇은 선 칸 → 단추 문법 · 종이 테이프 · 움푹 칸'),
]
# D-262 · D-263 UI 통일성 점검 뒤 화면 (915×412)
UI_AUDIT = [
    ('ui-enemyturn.jpg', '적 차례 띠 — 크롬 진홍 쇠 띠 + 단색 도트 속도선'),
    ('ui-map.jpg', '지도 미리보기 — 키트 꼬리표 · 움푹 칸 · 황동 「진입」 (D-397)'),
    ('cut-prologue.jpg', '컷신 크롬 하나 (D-397) — 그림이 화면을 채우고 아래 자막 띠(UI-08 띠 끝 장식) 줄 둘 · ▼는 띠 안 오른쪽 끝 · 「건너뛴다」 철 단추 아래 오른쪽'),
    ('cut-logo.jpg', '프롤로그 끝 로고 — 「화면을 눌러 출하」도 같은 띠'),
    ('cut-boss.jpg', '반장 등장 — 이름 36 · 칭호 24 · 규칙은 움푹 칸 · 서술 + 대사는 자막 띠 (D-397)'),
    ('cut-promo.jpg', '승급 컷 — 같은 띠, 줄마다 한글 30자 폭 안 (tests/cut-text)'),
    ('cut-finale.jpg', '최종장 판 위 연출 — 자막도 같은 띠'),
    ('cut-credits.jpg', '크레딧 — 철판 창 + 같은 띠 자리'),
    ('ui-forge.jpg', '작업대 — 명패 · 선택지 판 넷 (D-394)'),
    ('ui-bet.jpg', '판돈 — 명패 + 조건 · 보상 · 실패 시 한 줄씩'),
    ('ui-crew.jpg', '분대 — 명패, 이름 바꾸기 뺌'),
    ('ui-guide.jpg', '안내서 — 탭(안내서 · 용어 · 제보) · 그림 + 명패 + 이름표 행 + 요령 테이프'),
    ('ui-terms.jpg', '용어 — 낱장 칸 둘씩, 한 줄'),
    ('ui-event-result.jpg', '사건 결과 — 상황(문장마다 줄바꿈) + 대사(누가) + 결과 요약'),
    ('ui-shop.jpg', '고물상 — 명패 · 지갑 · 카드 줄 + 선택지 열 (D-394)'),
    ('ui-shop-poor.jpg', '나사 부족 — 누르기 전 회색 가격표, 누르면 독백 ‘나사가 모자라.’'),
    ('ui-kit.jpg', '핵심 부품 — 같은 틀 · 세 칸 표지 (누가 · 어떤 · 합/곱/효과) + 맞물리는 카드'),
    ('ui-part.jpg', '부품 하나 — 같은 틀'),
    ('ui-crew-say.jpg', '분대원 합류 말풍선 — 기물마다 말투 (D-324 · D-326 · D-331)'),
    ('ui-boss-fall.jpg', '반장 격파 컷 — 쓰러지는 서술 + 종이왕의 대꾸, 자막 띠 줄 단위 (D-332 · D-397)'),
    ('ui-gilded-mock.jpg', '도금왕 2단계 — 쓰러뜨린 반장에게 한 대꾸를 비웃어 되돌려 준다 (D-332 · D-397 띠)'),
]
# 사건 15종 — 실제 게임 녹화 (D-259, tools/artguide/events/record.cjs · record.py). 끝나면 처음부터
EVENTS = [
    ('ev-gambler-ok.webp', '동전 나이트 — 앞면', '컷씬 위로 동전만 — 세로축 12장 회전, 착지 순간 결과 면 · 금빛 별 → 부품을 고른다'),
    ('ev-gambler-ng.webp', '동전 나이트 — 뒷면', '뒷면 → 분대원 하나가 기물 + HP 바로 서서 전투처럼 HP가 반으로 줄어든다'),
    ('ev-brokenGacha-ok.webp', '고장 난 조립 판정기 — 맞물림', '칸 셋만 — 기호가 하나씩 떨어져 박히고, 앞 둘이 같으면 셋째 칸 테가 깜빡이며 애태운다 → 금 테 · 별. 대가(분대 HP −15%)는 기물 HP 바로'),
    ('ev-brokenGacha-ng.webp', '고장 난 조립 판정기 — 불량', '셋째 칸에 금 간 톱니 → 붉은 테 · 불꽃 · 연기 → 분대 HP가 두 번 깎인다'),
    ('ev-auction-ok.webp', '녹슨 봉인 상자 — 풀림', '칸 셋을 덮은 녹을 손가락으로 긁는다 → 금 톱니 셋 · 금 테 → 부품을 고른다'),
    ('ev-auction-ng.webp', '녹슨 봉인 상자 — 녹 독', '셋째 칸이 녹 덩어리 → 붉은 테 · 녹 가루 → 분대 HP −20%'),
    ('ev-apprentice-1.webp', '견습 폰 (성공)', '실제 카드 두 장이 떨렸다가 흰 번쩍 → 다듬은 카드로 바뀌며 초록 불꽃'),
    ('ev-apprentice-2.webp', '견습 폰 (실패)', '카드 두 장이 잿빛이 되고 금이 가며 쇳조각으로 흩어진다'),
    ('ev-counterweight.webp', '비뚤어진 저울추', '고른 카드는 다듬어지고, 다른 한 장은 잿빛 · 녹빛으로 3계단 변색'),
    ('ev-dipping-1.webp', '쇳물 담금질 (1)', '분대원이 흰 번쩍 → 한 단계 위 기물로 바뀌며 금빛 · 착지 출렁 / 또는 베기 선 → 두 쪽 → 잿빛'),
    ('ev-dipping-2.webp', '쇳물 담금질 (2)', '다른 시드의 결과'),
    ('ev-napping.webp', '조는 검수 저울', '폰 둘 → 나이트: 하나는 썰려 사라지고, 하나는 나이트로 진화'),
    ('ev-pact.webp', '쇳물 앞의 거래', '분대원 하나가 베기 선 → 두 쪽 → 잿빛 · 디더 퇴장 → 부품을 고른다'),
    ('ev-nightShift.webp', '야간 교대', '분대 기물들의 HP 바가 초록으로 계단 차오름'),
    ('ev-safe.webp', '녹슨 금고', '분대 HP가 전투처럼 깎인다 (나사는 대사 · 지갑 숫자로)'),
    ('ev-tinker.webp', '떠돌이 땜장이', '가장 오래 버틴 분대원이 금빛 · 「문턱 +1」'),
    ('ev-smith.webp', '떠돌이 정비 폰 (그림 없음 → 공용 배경)', '카드 두 장이 다듬어진다'),
    ('ev-scout.webp', '다른 공장의 흑 비숍', '분대원 하나를 넘긴다 → 썰림 · 잿빛'),
    ('ev-conveyor.webp', '거꾸로 도는 컨베이어 (그림 없음)', '나간 카드는 잿빛 · 조각, 들어온 카드는 디더 등장'),
    ('ev-swapDealer.webp', '부품 교환상 (그림 없음)', '폰이 둘 없으면 건넬 수 없다 — 이 녹화는 거절'),
]

# 받아야 할 그림 (D-246 · 사용자: 「에셋 필요한 건 차라리 달라고 해」)
ASK = [
    ('B-04~06 반장 컷신 가로 그림 3장', '지금 반장 그림(B-01~03)은 정사각에 가까워 영화 띠 안에서 머리 · 몸이 잘린다. 같은 반장을 가로 12:5(예: 480×200 도트)로 — 반장은 오른쪽 ⅔, 왼쪽 ⅓은 어두운 빈 바탕(이름 자리), 머리 위 여백 1할.'),
    ('V-09~15 사건 장면 7장', '그림이 없는 사건: 떠돌이 정비 폰(V-01 초안 있음) · 부품 교환상 · 고철 경매 · 쓰러진 뽑기 기계 · 녹슨 금고 · 비뚤어진 저울추(새) · 거꾸로 도는 컨베이어(새). 기존 V-02~08과 같은 크기 · 같은 공장 뒷길 톤.'),
    ('E-03 출하구 너머 (엔딩 마지막 장)', '크레딧 뒤, 기록 사진 앞에 한 장 — 출하구 밖으로 나선 분대의 뒷모습, 처음 보는 바깥 하늘. E-01과 같은 크기.'),
    ('코드로 찍는 것 (받을 필요 없음)', '동전 · 뽑기 기계 · 망치 · 도가니 · 상자 · 경매대 · 프레스 · 불기둥 · 가시 · 판 무늬 · 기물 반장 색 — 모두 이 시안처럼 코드로 찍는다 (art-assets.md §1 조합 → 문양 순서).'),
]


def page():
    css = f"""
@font-face {{ font-family: 'G11'; src: url(data:font/woff2;base64,{font('Galmuri11.woff2')}) format('woff2'); font-weight: 400; }}
@font-face {{ font-family: 'G11'; src: url(data:font/woff2;base64,{font('Galmuri11-Bold.woff2')}) format('woff2'); font-weight: 700; }}
@font-face {{ font-family: 'G14'; src: url(data:font/woff2;base64,{font('Galmuri14.woff2')}) format('woff2'); }}
/* 게임 화면과 같은 한 가지 어두운 세계 — 철판 패널 · 검은 테 · 단단한 그림자 · 황동 (D-216). 한 테마만 쓴다 */
:root {{ --bg: #0e0d12; --panel: #16141c; --inset: #0b0b0e; --line: #2f2e36; --fg: #e9e2d4; --dim: #a8a2b0; --brass: #c89b3c; --gold: #f4d27a; --cyan: #38bdf8; --red: #e5262f;
  --f-head: 'G11', ui-monospace, monospace; --f-body: 'G14', 'G11', ui-monospace, monospace; color-scheme: dark; }}
* {{ box-sizing: border-box; font-synthesis: none; }}
body {{ margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.6 var(--f-body); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-block: 24px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 40px; }}
header {{ display: grid; gap: 8px; border-bottom: 2px solid var(--line); padding-bottom: 20px; }}
h1 {{ font: 700 36px/1.2 var(--f-head); margin: 0; color: var(--gold); text-wrap: balance; }}
h2 {{ font: 700 24px/1.3 var(--f-head); margin: 0 0 12px; color: var(--gold); display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }}
h2 small, .tag {{ font: 700 12px var(--f-head); color: var(--brass); letter-spacing: .06em; }}
h3 {{ font: 700 24px/1.3 var(--f-head); margin: 8px 0; color: var(--fg); }}
p {{ margin: 0; max-width: 70ch; }}
.dim {{ color: var(--dim); }}
.grid {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); }}
.card {{ background: var(--panel); box-shadow: 0 0 0 2px #000, 4px 4px 0 2px #000; padding: 14px 16px; display: grid; gap: 6px; align-content: start; min-width: 0; }}
.card b {{ font: 700 24px/1.2 var(--f-head); color: var(--fg); }}
.sw {{ display: grid; grid-template-columns: 36px 1fr; gap: 10px; align-items: center; }}
.sw i {{ width: 36px; height: 36px; box-shadow: 0 0 0 2px #000; }}
.sw span b {{ font-size: 15px; font-family: var(--f-body); font-weight: 400; color: var(--fg); }}
table {{ border-collapse: collapse; width: 100%; min-width: 560px; }}
.tbl {{ overflow-x: auto; background: var(--panel); box-shadow: 0 0 0 2px #000, 4px 4px 0 2px #000; }}
th, td {{ text-align: left; padding: 10px 14px; border-bottom: 2px solid var(--line); vertical-align: top; }}
th {{ font: 700 12px var(--f-head); color: var(--brass); letter-spacing: .06em; }}
td:first-child {{ font: 700 15px var(--f-head); white-space: nowrap; color: var(--gold); }}
td.num {{ font-variant-numeric: tabular-nums; white-space: nowrap; }}
figure {{ margin: 0; background: var(--inset); box-shadow: 0 0 0 2px #000, 4px 4px 0 2px #000; display: grid; min-width: 0; }}
figure img {{ display: block; width: 100%; height: auto; }}
figcaption {{ padding: 8px 12px 10px; font-size: 15px; color: var(--dim); }}
.strip {{ display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); }}
.px {{ image-rendering: pixelated; background: #1b1a22; }}
.shots {{ display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); }}
code {{ font: 12px/1.5 var(--f-head); color: var(--cyan); word-break: break-all; }}
.tools {{ display: grid; gap: 8px; }}
.tools div {{ display: grid; grid-template-columns: minmax(120px, 180px) 1fr; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 2px solid var(--line); }}
.tools div span {{ font: 700 15px var(--f-head); color: var(--fg); }}
.ramp {{ display: grid; grid-template-columns: repeat(7, 1fr); gap: 0; margin-top: 4px; box-shadow: 0 0 0 2px #000; }}
.ramp i {{ height: 28px; }}
ol.light {{ margin: 0; padding-left: 22px; display: grid; gap: 4px; }}
.st {{ font: 700 12px var(--f-head); padding: 2px 8px; box-shadow: 0 0 0 2px #000; }}
.st.ok {{ background: #d9a838; color: #2b1a06; }} .st.next {{ background: #2c2d38; color: #ff6b6b; }}
.evt {{ font: 700 15px var(--f-head); color: var(--gold); }}
.motto {{ font: 400 30px/1.4 var(--f-body); color: var(--fg); text-wrap: balance; }}
@media (max-width: 520px) {{ .tools div {{ grid-template-columns: 1fr; gap: 2px; }} h1 {{ font-size: 24px; }} }}
"""
    rules = ''.join(f'<div class="card"><span class="tag">{t}</span><b>{h}</b><p>{d}</p></div>' for h, d, t in RULES)
    colors = ''.join(f'<div class="sw"><i style="background:{c}"></i><span><b>{n}</b> <span class="dim">{c}</span><br><span class="dim">{u}</span></span></div>' for c, n, u in COLORS)
    beats = ''.join(f'<tr><td>{a}</td><td class="num">{b}</td><td>{c}</td></tr>' for a, b, c in BEATS)
    frames = ''.join(f'<figure>{img(f, c)}<figcaption>{c}</figcaption></figure>' for f, c in BOSS_FRAMES)
    screens = ''.join(
        f'<h3>{title}</h3><div class="shots">' + ''.join(f'<figure>{img(f, c)}<figcaption>{c}</figcaption></figure>' for f, c in items) + '</div>'
        for title, items in SCREENS)
    review = ''.join(f'<figure>{img(f, c)}<figcaption>{c}</figcaption></figure>' for f, c in REVIEW)
    tools = ''.join(f'<div><span>{a}</span><code>{html.escape(b)}</code></div>' for a, b in TOOLS)
    d246 = ''.join(
        f'<h3>{title}</h3><div class="shots">' + ''.join(f'<figure>{img(f, c)}<figcaption>{c}</figcaption></figure>' for f, c in items) + '</div>'
        for title, items in D246)
    layers = ''.join(f'<tr><td>{a}</td><td class="num">{b}</td><td>{c}</td><td>{d}</td></tr>' for a, b, c, d in LAYERS)
    mats = ''.join(f'<div class="card"><b>{n}</b><p class="dim">{u}</p><div class="ramp">' + ''.join(f'<i style="background:{c}"></i>' for c in cs) + '</div></div>' for n, u, cs in MATERIALS)
    light = ''.join(f'<li>{x}</li>' for x in LIGHT)
    parts = ''.join(f'<tr><td>{a}</td><td><code>{html.escape(b)}</code></td><td>{c}</td></tr>' for a, b, c in PARTS)
    audit = ''.join(f'<tr><td>{a}</td><td class="num"><span class="st {"ok" if b == "고침" else "next"}">{b}</span></td><td>{c}</td></tr>' for a, b, c in AUDIT)
    # 녹화는 크기가 커서 아티팩트 보조 파일(ev/…)로 올린다 — 같은 이름으로 files에 넣어 publish
    events = ''.join(f'<figure><img class="shot" src="ev/{f}" alt="{html.escape(t)}" loading="lazy"><figcaption><b class="evt">{t}</b><br>{c}</figcaption></figure>' for f, t, c in EVENTS if os.path.exists(os.path.join(SHOTS, f)))
    uiaudit = ''.join(f'<figure>{img(f, c)}<figcaption>{c}</figcaption></figure>' for f, c in UI_AUDIT)
    ask = ''.join(f'<div class="card"><b>{a}</b><p>{b}</p></div>' for a, b in ASK)
    return f"""<title>Pawnisher 그래픽 정본</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{css}</style>
<div class="wrap">
<header>
  <span class="tag">PAWNISHER : CHECKMATE · {UPDATED} 게임 화면 기준</span>
  <h1>그래픽 정본</h1>
  <p class="dim">FX 랩과 타격감 연구소를 하나로 합쳤다. 지금 게임에 들어가 있는 것만 담았다. 화면은 모두 실제 게임(모바일 가로 915×412)에서 찍었다.</p>
</header>

<section><h2>디자인 문법 정본 — 주물 공방 문법 <small>D-259 · docs/design-system.md</small></h2>
<p class="motto">작업대 위의 물건만 있다.</p>
<p class="dim" style="margin:8px 0 16px">화면의 모든 것은 공장에 실제로 있을 법한 쇠 · 황동 · 나무 · 종이 물건이고, 같은 빛(왼쪽 위)을 받고, 같은 손(코드 부품)이 찍는다. 떠다니는 글자 · 납작한 색 상자 · 출처 없는 빛은 없다. 새 화면 · 효과 · 팝업은 아래 부품을 조합해서만 만든다.</p>
<h3>세 층 — 층마다 그리는 법이 하나</h3>
<div class="tbl"><table><thead><tr><th>층</th><th>도트</th><th>무엇</th><th>그리는 법</th></tr></thead><tbody>{layers}</tbody></table></div>
<h3>재질 — 뜻이 정해져 있다 (pxkit.M)</h3><div class="grid">{mats}</div>
<h3>빛 공식 — 모든 물건이 같은 빛을 받는다</h3><div class="card"><ol class="light">{light}</ol></div>
<h3>부품 — 이것만 조합한다</h3>
<div class="tbl"><table><thead><tr><th>부품</th><th>코드</th><th>규칙</th></tr></thead><tbody>{parts}</tbody></table></div>
<h3>고칠 목록 — 이 문법에 맞춘 것 / 다음 차례</h3>
<div class="tbl"><table><thead><tr><th>화면</th><th>상태</th><th>무엇을</th></tr></thead><tbody>{audit}</tbody></table></div>
</section>

<section><h2>UI 통일성 점검 뒤 <small>D-262 · D-263 · 역할 그룹 · 글자 전수 검사</small></h2><div class="shots">{uiaudit}</div></section>

<section><h2>사건 15종 — 단순화판 (D-260) <small>실제 게임 녹화 915×412 · 끝나면 처음부터</small></h2>
<p class="dim" style="margin-bottom:12px">흐름: 대화창 + 선택지 → 고르면 오버레이에서 연출(동전은 저절로, 칸은 하나씩 눌러 · 긁어 연다) → 결과 + [확인] → 대화창에서 NPC 마무리 대사 + 나가기. 컷씬(사건 그림) + 대사가 전부다. 사건 전용 소품 · 기계 · 상자는 뺐다. 확률은 동전 하나나 사각 칸 셋만, 결과는 실제 카드 얼굴 · 실제 기물 그림 + HP 바에 FX(강화 · 녹 · 파괴 / 진화 · 썰림 · HP 증감). 그림이 없는 사건은 공용 사건 배경.</p>
<div class="shots">{events}</div></section>

<section><h2>원칙 <small>D-216 · D-213 · D-193 · D-180</small></h2><div class="grid">{rules}</div></section>

<section><h2>색 — 역할로 쓴다 <small>색만으로 구분하지 않는다 (명도 + 아이콘)</small></h2><div class="card"><div class="grid">{colors}</div></div></section>

<section><h2>타격감 — 박자 <small>D-179 · D-180 · D-184 · D-191</small></h2>
<div class="tbl"><table><thead><tr><th>박자</th><th>길이</th><th>무엇을 하나</th></tr></thead><tbody>{beats}</tbody></table></div>
<p class="dim" style="margin-top:12px">대비가 전부다. 길게 모으고, 한 박에 터지고, 멎었다가, 천천히 가라앉는다. 연출 속도 옵션은 두지 않는다(D-039). 「움직임 줄이기」 설정이면 흔들림 · 긴 연출을 줄인다.</p>
</section>

<section><h2>타격감 — 반장 마무리 실제 프레임 <small>1막 철갑 반장 · 마지막 일격</small></h2><div class="strip">{frames}</div></section>

<section><h2>화면 정본</h2>{screens}</section>

<section><h2>도트 부품 <small>코드 · 도트 메이커가 찍는다</small></h2>
<div class="shots">
<figure>{img('pieces.png', '기물 12종', 'shot px')}<figcaption>기물 12종 — 흑백 통일(외곽선 · 흰 테 3칸 공용, 속 칠만 다름) · 빛은 왼쪽 위 3단계 · 킹 · 퀸 · 룩 · 폰 좌우 대칭. 흰 킹 자리 = 종이 왕관을 쓴 주인공 (72칸 캔버스)</figcaption></figure>
<figure>{img('hudkit.png', 'HUD 부품', 'shot px')}<figcaption>HUD 부품 (2026-11-05 리뉴얼) — 태엽 열쇠(보통 · 보너스 · 씀) · 열쇠 구멍 · 도움말 ? 톱니 · 되감기 · 탄 머리판 · 등급 보석 · 가격표 · 차례 배지(내 편 청록 · 태엽 비용 황동 · 적 진홍, 숫자는 모두 흰색) (×4)</figcaption></figure>
<figure>{img('icons.png', '16칸 아이콘', 'shot px')}<figcaption>16칸 아이콘 — 부품 · 지도 노드 · 카드 · 상점 · 심장 톱니. 빛은 왼위, 검은 외곽선 1칸</figcaption></figure>
</div></section>

<section><h2>D-246 시안 — 반장 · 엔딩 <small>정해 주면 게임에 넣는다 · 끝나면 처음부터 다시</small></h2>
<p class="dim" style="margin-bottom:12px">모두 도트 층(1도트 = 3px) 위에서 계단 프레임으로만 움직인다. 페이드 · 그라데이션 · 선형 슬라이드 없음 (D-216). 사라짐은 체크 디더, 움직임은 예비 동작 → 터짐 → 출렁임.</p>
{d246}
<h3>받아야 할 그림</h3><div class="grid">{ask}</div></section>

{f'<section><h2>검토 중 <small>정해 주면 게임에 넣는다</small></h2><div class="shots">{review}</div></section>' if review else ''}

<section><h2>만드는 법</h2><div class="tools">{tools}</div></section>
</div>
"""


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'artguide.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page())
    print(out, f'{os.path.getsize(out) / 1024:.0f} KB')
