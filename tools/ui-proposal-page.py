"""
버튼 · 판 시안 페이지 (D-292): 지금 vs A 리벳 명판 · B 주물 키캡 · C 쇠틀 모서리 — 누를 수 있는 실제 9-slice 단추로.
  python3 -I tools/draw-chrome2.py && python3 -I tools/ui-proposal-page.py <out.html> [지금 전투 캡처] [지금 사건 캡처]
"""
import base64
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'build-res', 'ui-proposals')
CUR = os.path.join(ROOT, 'src', 'assets', 'ui', 'chrome')


def b64(path, mime='image/png'):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()


TONES = ['brass', 'iron', 'crimson', 'teal']
CUR_NAME = {'brass': 'brass', 'iron': 'iron', 'crimson': 'crimson', 'teal': 'cyan'}
VARS = {
    'now': ('지금', '단색 판 · 위 빛 한 줄 · 아래 그늘 — 두께와 재질이 없다', None),
    'A': ('A · 리벳 명판', '두꺼운 금속 판 · 네 모서리 리벳 · 위 2단 빛 · 아래 3도트 옆면. 누르면 옆면이 1도트로 꺼진다', 4),
    'B': ('B · 주물 키캡', '모서리를 깎은 주물 단추 · 앞면에 새긴 홈 · 아래 4도트 옆면. 기계 건반처럼 깊게 눌린다', 6),
    'C': ('C · 쇠틀 모서리', '판 둘레에 다른 금속의 L자 쇠붙이 + 나사. 장식이 가장 많고 눌림은 얕다', 4),
}


def css():
    out = []
    for t in TONES:
        n = CUR_NAME[t]
        out.append(f'.v-now .bt.{t}{{border-width:8px;border-image:url({b64(os.path.join(CUR, f"btn-{n}.png"))}) 4 fill / 8px stretch}}')
        out.append(f'.v-now .bt.{t}:active,.v-now .bt.{t}.down{{border-image-source:url({b64(os.path.join(CUR, f"btn-{n}-down.png"))})}}')
        for v in 'ABC':
            out.append(f'.v-{v} .bt.{t}{{border-width:{"14px 12px 18px" if v == "B" else "10px 8px 14px"};border-image:url({b64(os.path.join(P, f"{v}-{t}.png"))}) 8 7 8 7 fill / 16px 14px 16px 14px stretch}}')
            out.append(f'.v-{v} .bt.{t}:active,.v-{v} .bt.{t}.down{{border-image-source:url({b64(os.path.join(P, f"{v}-{t}-down.png"))})}}')
    for v, (_, _, sink) in VARS.items():
        if sink:
            out.append(f'.v-{v} .bt:active>span,.v-{v} .bt.down>span{{transform:translateY({sink}px)}}')
    out.append(f'.pa{{border-style:solid;border-width:18px;border-image:url({b64(os.path.join(P, "panel-A.png"))}) 9 fill / 18px stretch}}')
    out.append(f'.pb{{border-style:solid;border-width:18px;border-image:url({b64(os.path.join(P, "panel-B.png"))}) 9 fill / 18px stretch}}')
    out.append(f'.pc{{border-style:solid;border-width:8px;border-image:url({b64(os.path.join(P, "panel-C.png"))}) 4 fill / 8px stretch}}')
    out.append(f'.plate{{border-style:solid;border-width:10px 12px 14px;border-image:url({b64(os.path.join(P, "plate.png"))}) 6 6 8 fill / 12px 12px 16px stretch}}')
    return '\n'.join(out)


def fonts():
    g = os.path.join(ROOT, 'node_modules', 'galmuri', 'dist')
    return (f"@font-face{{font-family:Galmuri11;src:url({b64(os.path.join(g, 'Galmuri11.woff2'), 'font/woff2')}) format('woff2')}}"
            f"@font-face{{font-family:Galmuri14;src:url({b64(os.path.join(g, 'Galmuri14.woff2'), 'font/woff2')}) format('woff2')}}")


BASE = """
:root{ /* 작업대 위 철판 · 황동 — 게임 화면과 같은 바탕 */
  --bg:#0e0d12; --plate:#17161d; --edge:#2c2d38; --fg:#ece6da; --dim:#a8a4b2; --brass:#f4d27a; --ink:#0b0b0e;
  --t15:15px/1.5 Galmuri14,Galmuri11,sans-serif; --t12:12px/1.5 Galmuri11,sans-serif; --t24:24px/1.25 Galmuri11,sans-serif;
  color-scheme:dark }
body{background:var(--bg);color:var(--fg);font:var(--t15);margin:0;font-synthesis:none}
.wrap{max-width:1120px;margin:0 auto;padding-block:24px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:28px}
h1{font:var(--t24);color:var(--brass);margin:0}
h2{font:var(--t24);margin:0 0 4px;color:var(--fg)}
p{margin:0}
.dim{color:var(--dim);font:var(--t12)}
.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.shots figure{margin:0;display:grid;gap:4px}
.shots img{width:100%;height:auto;border:2px solid var(--edge);image-rendering:pixelated}
.grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
@media(max-width:860px){.grid4{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:460px){.grid4{grid-template-columns:1fr}}
.col{background:var(--plate);border:2px solid var(--edge);padding:14px;display:grid;gap:12px;align-content:start;min-width:0}
.col h3{margin:0;font:var(--t15);color:var(--brass)}
.col .dim{min-height:3em}
.bt{all:unset;box-sizing:border-box;border-style:solid;border-width:16px 14px;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;min-height:56px;cursor:pointer;font:var(--t15);text-align:center;-webkit-tap-highlight-color:transparent;user-select:none}
.bt>span{display:block;padding:0 4px;word-break:keep-all}
.bt.big{min-height:64px;font:var(--t24)}
.bt.brass{color:#2b1a06}.bt.iron{color:#ece6da;text-shadow:0 2px 0 #0b0b0e}.bt.crimson{color:#fff1e8;text-shadow:0 2px 0 #2a0608}.bt.teal{color:#06222a}
.bt[aria-disabled=true]{filter:grayscale(1) brightness(.55);cursor:not-allowed}
.bt:focus-visible{outline:2px solid var(--brass);outline-offset:3px}
.bt small{display:block;font:var(--t12);opacity:.9}
.row{display:flex;gap:8px}.row>.bt{flex:1 1 0;min-width:0}
.mock{display:grid;gap:10px}
.mock .lab{font:var(--t12);color:var(--dim)}
.rail{display:grid;grid-template-columns:1fr 2fr;gap:8px}
.choice{justify-content:flex-start;text-align:left;min-height:64px}
.choice span{padding:0 6px}
.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px}
.pbox{display:grid;gap:10px;color:var(--fg)}
.pbox .ttl{justify-self:start;font:var(--t15);color:#2b1a06;padding:0 6px}
.pb .well{padding:4px}
.pc{color:var(--dim);font:var(--t12)}
.pick{background:var(--plate);border:2px solid var(--brass);padding:14px 16px;display:grid;gap:6px}
@media(prefers-reduced-motion:reduce){.bt>span{transition:none}}
"""


def tone_buttons():
    return f'''<div class="bt big brass" role="button" tabindex="0"><span>출하 시작</span></div>
<div class="bt iron" role="button" tabindex="0"><span>도감</span></div>
<div class="bt teal" role="button" tabindex="0"><span>오늘의 출하</span></div>
<div class="bt crimson" role="button" tabindex="0"><span>포기한다</span></div>
<div class="bt iron" role="button" tabindex="0" aria-disabled="true"><span>나사 40 필요</span></div>
<div class="row"><div class="bt iron down" role="button" tabindex="0"><span>눌린 모양</span></div><div class="bt brass down" role="button" tabindex="0"><span>눌림</span></div></div>'''


def mock(v):
    return f'''<div class="mock v-{v}">
  <p class="lab">메인 메뉴</p>
  <div class="bt big brass" role="button" tabindex="0"><span>출하 시작<small>승급 5 — 불어난 무리</small></span></div>
  <div class="bt teal" role="button" tabindex="0"><span>오늘의 출하</span></div>
  <div class="row"><div class="bt iron" role="button" tabindex="0"><span>안내서</span></div><div class="bt iron" role="button" tabindex="0"><span>도감</span></div><div class="bt iron" role="button" tabindex="0"><span>프롤로그</span></div></div>
  <p class="lab">전투 레일</p>
  <div class="rail"><div class="bt iron" role="button" tabindex="0"><span>되감기</span></div><div class="bt big brass" role="button" tabindex="0"><span>턴 끝</span></div></div>
  <p class="lab">사건 선택지</p>
  <div class="bt iron choice" role="button" tabindex="0"><span>문을 부술까?<small>60%: 나사 +60 · 40%: 분대원 하나 HP −60%</small></span></div>
  <div class="bt brass choice" role="button" tabindex="0"><span>나사 40을 낸다<small>분대 전원 HP +20%</small></span></div>
</div>'''


def main(out, shot_battle=None, shot_event=None):
    cols = ''.join(f'<div class="col v-{v}"><h3>{t}</h3><p class="dim">{d}</p>{tone_buttons()}</div>' for v, (t, d, _) in VARS.items())
    mocks = ''.join(f'<div class="col"><h3>{VARS[v][0]}</h3>{mock(v)}</div>' for v in VARS)
    shots = ''
    for pth, cap in ((shot_battle, '지금 · 전투 레일 (턴 끝 · 되감기 · 덱)'), (shot_event, '지금 · 사건 선택지')):
        if pth and os.path.exists(pth):
            shots += f'<figure><img src="{b64(pth)}" alt="{cap}"><figcaption class="dim">{cap}</figcaption></figure>'
    page = f'''<title>버튼 · 판 시안</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{fonts()}{BASE}{css()}</style>
<div class="wrap">
  <header><h1>버튼 · 판 시안 — 주물 공방 단추</h1>
  <p class="dim">지금 단추는 단색 판에 빛 한 줄이라 웹 단추처럼 납작하다. 세 갈래로 두께 · 재질 · 눌리는 맛을 넣었다. 모두 1도트 = 2px 실제 도트(9-slice)이고, 게임 글꼴(갈무리) 그대로다. <b>단추를 직접 눌러 보세요</b> — 눌린 그림으로 바뀐다.</p></header>
  <section class="shots">{shots}</section>
  <section><h2>네 가지 색 · 상태</h2><p class="dim">황동 = 주된 행동 · 쇠 = 보조 · 청록 = 특별 · 진홍 = 위험. 맨 아래 줄은 눌린 모양을 고정해 보여 준다.</p></section>
  <section class="grid4">{cols}</section>
  <section><h2>실제 자리에 놓으면</h2><p class="dim">메인 메뉴 · 전투 레일 · 사건 선택지를 같은 폭으로.</p></section>
  <section class="grid4">{mocks}</section>
  <section><h2>판 (사각형)</h2><p class="dim">창 · 레일 · 목록 칸. PA와 PB 중 하나를 창 바탕으로, PC는 목록 · 칸, 이름판은 창 제목.</p></section>
  <section class="panels">
    <div class="pa pbox"><span class="plate ttl">PA · 리벳 철판</span><p>쇠판 네 귀퉁이에 리벳, 안쪽에 판을 이은 홈. 지금 창보다 무겁고 단단하다.</p><div class="row v-A"><div class="bt iron" role="button" tabindex="0"><span>그만둔다</span></div><div class="bt brass" role="button" tabindex="0"><span>새로 시작한다</span></div></div></div>
    <div class="pb pbox"><span class="plate ttl">PB · 황동 테 + 우물</span><div class="well"><p>황동 테 안쪽이 움푹 꺼진 우물. 보상 · 고물상처럼 「귀한 것」을 담는 창.</p></div><div class="row v-B"><div class="bt iron" role="button" tabindex="0"><span>지나간다</span></div><div class="bt brass" role="button" tabindex="0"><span>고른다</span></div></div></div>
    <div class="pa pbox"><span class="plate ttl">PC · 움푹한 칸</span><div class="pc">직전 공격 · 아직 공격하지 않았습니다.</div><div class="pc">기록 · 첫 턴입니다.</div><div class="pc">덱 8 · 분대 3 · 버림 0</div></div>
  </section>
  <section class="pick"><h2>고르는 법</h2><p>단추는 A · B · C 중 하나, 창은 PA · PB 중 하나를 말씀해 주세요. 섞어도 됩니다 (예: 「단추 B, 창 PB, 위험 단추만 A」). 고르면 지금 단추 · 창 그림을 갈아 끼우고 모든 화면을 다시 찍어 확인합니다.</p></section>
</div>
<script>
document.querySelectorAll('.bt[role=button]').forEach(function(b){{b.addEventListener('keydown',function(e){{if(e.key===' '||e.key==='Enter'){{b.classList.add('down');setTimeout(function(){{b.classList.remove('down')}},140)}}}})}});
</script>
'''
    open(out, 'w', encoding='utf-8').write(page)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main(*sys.argv[1:])
