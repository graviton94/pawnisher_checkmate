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
UPDATED = '2026-11-05'


def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode()


def img(name, alt, cls='shot'):
    p = os.path.join(SHOTS, name)
    mime = 'image/png' if name.endswith('.png') else 'image/jpeg'
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
    ('출하 흐름', [('title.jpg', '타이틀 — 공장 배경 · 정품 폰 도장 · 붉은 사선 · 로고'), ('map1.jpg', '1막 지도 — 막 표지 A-01 깔림 · 이어진 노드만 빛남'),
                 ('map2.jpg', '2막 지도 — A-02'), ('map3.jpg', '3막 지도 — A-03'), ('actintro.jpg', '막 전환 — 막 표지 위 서술 한 줄')]),
    ('대국', [('battle.jpg', '대국 — 왼쪽 탄창(카드) · 가운데 판 · 오른쪽 속전 보일러 · 직전 공격 · 기록'),
             ('armed.jpg', '탄창 한 발 장전 — 한 번 누르면 펼쳐져 설명이 나온다'),
             ('cracked.jpg', '심장 톱니가 깨진 분대원 — 외곽선은 그대로, 속 칠만 어둡게 (D-219)'),
             ('crackrite.jpg', '처음 쓰러질 때 — 큰 톱니가 흔들리다 깨진다 (폐기 의식 대신)')]),
    ('대국 밖', [('reward.jpg', '보상 — 등급 틀(일반 철 · 희귀 청강 · 황금 황동) + 정비 라인 배경 BG-04'),
               ('shop.jpg', '고물상 — 황동 가격표 도트 · BG-01'), ('forge.jpg', '작업대 — 외눈 정비공 BG-02'),
               ('event.jpg', '사건 — 왼쪽 장면 그림 · 오른쪽 서술 · 공장 뒷길 BG-03'), ('crew.jpg', '분대 보기 — 심장 톱니 두 칸'),
               ('endclear.jpg', '출하 완료 — E-01 (분대 실루엣이 창 위로 보이게)'), ('endfail.jpg', '출하 중단 — E-02')]),
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

REVIEW = []


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
    return f"""<title>Pawnisher 그래픽 정본</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{css}</style>
<div class="wrap">
<header>
  <span class="tag">PAWNISHER : CHECKMATE · {UPDATED} 게임 화면 기준</span>
  <h1>그래픽 정본</h1>
  <p class="dim">FX 랩과 타격감 연구소를 하나로 합쳤다. 지금 게임에 들어가 있는 것만 담았다. 화면은 모두 실제 게임(모바일 가로 915×412)에서 찍었다.</p>
</header>

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

{f'<section><h2>검토 중 <small>정해 주면 게임에 넣는다</small></h2><div class="shots">{review}</div></section>' if review else ''}

<section><h2>만드는 법</h2><div class="tools">{tools}</div></section>
</div>
"""


if __name__ == '__main__':
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'artguide.html')
    with open(out, 'w', encoding='utf-8') as f:
        f.write(page())
    print(out, f'{os.path.getsize(out) / 1024:.0f} KB')
