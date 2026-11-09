"""
카드 템플릿(cardart.py)에 실제 카드 내용을 얹은 미리보기 HTML (D-367).
사용: python3 -I tools/pixel/card_preview.py <out.html>
"""
import base64
import os
import sys

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')


def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, p), 'rb').read()).decode()


def font(p):
    return 'data:font/woff2;base64,' + base64.b64encode(open(os.path.join(ROOT, p), 'rb').read()).decode()


S = 2  # 1도트 = 2px
OX, OY, CW, CH = 8, 8, 112, 158


def at(x, y, w=None, h=None):
    st = f'left:{(x + OX) * S}px;top:{(y + OY) * S}px;'
    if w is not None:
        st += f'width:{w * S}px;'
    if h is not None:
        st += f'height:{h * S}px;'
    return st


AXBG = {'inf': ('#2f4a35', '#3d5f44', '보병'), 'cav': ('#4a3324', '#5e4230', '기병'), 'chain': ('#352a4a', '#45375e', '연쇄'), 'king': ('#4a3d1a', '#5e4e22', '킹'), 'push': ('#3a3a42', '#4a4a54', '밀치기'), 'tactic': ('#22404a', '#2c525e', '전술')}


def art_bg(ax):
    a, b, _ = AXBG[ax]
    return f'background:{a};background-image:linear-gradient(45deg,{b} 25%,transparent 25%,transparent 75%,{b} 75%),linear-gradient(45deg,{b} 25%,transparent 25%,transparent 75%,{b} 75%);background-size:4px 4px;background-position:0 0,2px 2px;'


def cmd(g, ax, cost, name, art, who, say, fx, cond=''):
    return f'''<div class="card"><div class="art" style="{at(12, 12, 73, 49)}{art_bg(ax)}"><img src="{b64(art)}" style="width:84px;height:84px;margin:0"></div>
<img class="tpl" src="{b64(f'public/ui/cards/cmd-{g}.png')}">
<b class="cost" style="{at(-5, -6, 17, 17)}">{cost}</b>
<b class="name g-{g}" style="{at(4, 57, 89, 11)}">{name}</b>
<span class="type" style="{at(30, 70, 37, 7)}">{who} · {AXBG[ax][2]}</span>
<div class="scroll" style="{at(16, 80, 65, 51)}"><p class="say">{say}</p>{f'<p class="cond">({cond})</p>' if cond else ''}<p class="fx">{fx}</p></div></div>'''


def part(g, name, icon, say, fx, cond=''):
    return f'''<div class="card"><div class="art mid" style="{at(12, 12, 73, 49)}background:#141319"><img src="{b64(icon)}" style="width:64px;height:64px;margin:0"></div>
<img class="tpl" src="{b64(f'public/ui/cards/part-{g}.png')}">
<b class="name g-{g}" style="{at(4, 57, 89, 11)}">{name}</b>
<span class="type" style="{at(30, 70, 37, 7)}">부품</span>
<div class="scroll" style="{at(16, 80, 65, 51)}"><p class="say">{say}</p>{f'<p class="cond">({cond})</p>' if cond else ''}<p class="fx">{fx}</p></div></div>'''


def crew(g, name, serial, face, atk, hp, lives, kills, dmg, defied, q):
    hearts = ''.join(f'<img class="heart" src="{b64("public/ui/icons16/life@16.png")}">' for _ in range(lives))
    return f'''<div class="card"><div class="art" style="{at(12, 12, 73, 52)}background:#e8e0cc"><img src="{b64(face)}" style="width:84px;height:84px;margin:0"></div>
<img class="tpl" src="{b64(f'public/ui/cards/crew-{g}.png')}">
<b class="name g-{g}" style="{at(4, 57, 89, 11)}">{name}</b>
<b class="badge" style="{at(-8, 42, 21, 17)}">{atk}</b><b class="badge" style="{at(83, 42, 21, 17)}">{hp}</b>
<span class="lives" style="{at(15, 46, 40, 9)}">{hearts}</span>
<div class="scroll crew" style="{at(16, 80, 65, 51)}"><small>{serial}</small><div class="st"><span><i>처치</i>{kills}</span><span><i>피해</i>{dmg}</span><span><i>넘김</i>{defied}</span></div><p class="qn">{q[0]}</p><p class="cond">{q[1]}</p></div></div>'''


def main(out):
    cards_cmd = cmd('common', 'inf', 0, '총진격', 'public/ui/hud/crew-P.png', '폰', '폰 전원이 한 칸 나아가 친다.', '폰 전원 기본 공격') + cmd('rare', 'cav', 1, '기습', 'public/ui/hud/crew-N.png', '나이트', '어둠 속에서 덮친다.', '피해 ×1.5', '처치하면 카드 1장') + cmd('gold', 'chain', 2, '대성당의 빛', 'public/ui/hud/crew-B.png', '비숍', '사선 끝까지 빛이 꿰뚫는다.', '사선 위 모든 적 +10', '처치마다 연쇄 +1')
    cards_part = part('common', '도화선', 'public/ui/icons16/fuse.png', '불씨가 줄을 타고 달린다.', '연쇄 +1', '한 턴에 셋을 쓰러뜨리면') + part('rare', '피의 장부', 'public/ui/icons16/gameRecord.png', '흘린 피는 빠짐없이 적힌다.', '공격 +1', '누적 피해 60마다') + part('gold', '짓누르는 왕관', 'public/ui/icons16/crown.png', '왕관의 무게가 곧 주먹의 무게.', '킹의 공격 ×2')
    cards_crew = crew('common', '먼지투성이', '#P-203 · 폰', 'public/ui/hud/crew-P.png', 9, 22, 1, 4, 120, 0, ('겁쟁이', '적이 곁에 오면 한 칸 물러선다')) + crew('rare', '굽은 지렛대', '#N-681 · 나이트', 'public/ui/hud/crew-N.png', 16, 36, 2, 9, 360, 2, ('납땜 흉갑', '방열판 12 · 공격 −15%')) + crew('gold', '콧대 높은 귀부인', '#Q-104 · 퀸', 'public/ui/hud/crew-Q.png', 24, 48, 0, 15, 820, 1, ('오만', '처치하면 태엽 +1'))
    back = f'<div class="card"><img class="tpl" src="{b64("public/ui/cards/back.png")}"></div>'
    css = f'''
@font-face{{font-family:G11;src:url({font('dist/assets/Galmuri11.woff2')})}}@font-face{{font-family:G11B;src:url({font('dist/assets/Galmuri11-Bold.woff2')})}}@font-face{{font-family:G14;src:url({font('dist/assets/Galmuri14.woff2')})}}
body{{background:#1a1622;color:#ece6d8;font:12px G11,sans-serif;padding:24px max(16px,env(safe-area-inset-left,0px));margin:0}}
h1{{font:24px G11B;color:#ffd64a;margin:0 0 4px}} h2{{font:15px G14;color:#c9c1ad;margin:18px 0 8px}} p.lead{{font:15px G14;color:#9a917c;margin:0}}
.row{{display:flex;flex-wrap:wrap;gap:20px}}
.card{{position:relative;width:{CW * S}px;height:{CH * S}px;flex:none;image-rendering:pixelated}}
.card .tpl{{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}}
.card>*:not(.tpl){{position:absolute}}
.art{{display:grid;place-items:end center;overflow:hidden}} .art.mid{{place-items:center}} .art img{{image-rendering:pixelated;margin-bottom:6px}}
.cost{{display:grid;place-items:center;font:700 24px G11B;color:#fff1c0;text-shadow:2px 2px 0 #000;z-index:2}}
.name{{display:grid;place-items:center;font:700 12px G11B;color:#f4f1ea;text-shadow:1px 1px 0 #000;z-index:2;white-space:nowrap}}
.name.g-gold{{color:#fff1c0}}
.type{{display:grid;place-items:center;font:12px G11;color:#c9c1ad;z-index:2}}
.scroll{{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:3px;text-align:center;color:#2a2620;z-index:2}}
.scroll p{{margin:0;line-height:1.3;word-break:keep-all;text-wrap:balance}} .scroll .say{{font:12px G11;color:#3a342a}} .scroll .cond{{font:12px G11;color:#6e6452}}
.scroll .fx{{font:700 12px G11B;color:#ffd64a;background:#3a2c10;padding:1px 6px;box-shadow:0 0 0 2px #000}}
.scroll.crew small{{font:12px G11;color:#6e6452}} .st{{display:flex;gap:8px;font:700 12px G11B;color:#2a2620}} .st i{{font:12px G11;font-style:normal;color:#6e6452;margin-right:2px}}
.qn{{font:700 12px G11B;color:#1f6b70}}
.badge{{display:grid;place-items:center;font:700 15px G11B;color:#fff;text-shadow:2px 2px 0 #000;z-index:3}}
.lives{{display:flex;gap:3px;z-index:3}} .heart{{width:16px;height:16px;image-rendering:pixelated}}
'''
    page = f'''<title>카드 2차 시안</title><style>{css}</style>
<h1>카드 디자인 2차 — 아치 창 · 이름 리본 · 두루마리</h1>
<p class="lead">레퍼런스(하스스톤 · 슬더스 · 픽셀 카드)의 문법: 큰 아치 그림 창, 틀 밖으로 나가는 이름 리본(등급 색 — 강철 · 청록 · 진홍), 말린 두루마리 설명, 톱니 비용 메달, 톱니 모서리 장식, 아래 보석.</p>
<h2>명령 카드 — 일반 · 희귀 · 황금</h2><div class="row">{cards_cmd}</div>
<h2>부품 — 팔각 원판</h2><div class="row">{cards_part}</div>
<h2>분대원 — 초상 · 공격 마름모 · HP 방패 · 생명 하트 · 기록</h2><div class="row">{cards_crew}{back}</div>'''
    open(out, 'w').write(page)


if __name__ == '__main__':
    main(sys.argv[1])
