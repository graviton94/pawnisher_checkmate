"""
버튼 · 판 2차 시안 페이지 (D-292 2차): D 톱니 마개 · E 레버 판 · F 명판 리본 — 메인 메뉴 · 창 · 전투 레일 모형.
  python3 -I tools/draw-chrome3.py && python3 -I tools/ui-proposal-page2.py <out.html> [지금 메뉴 캡처] [지금 전투 캡처] [지금 사건 캡처]
"""
import base64
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'build-res', 'ui-proposals2')


def u(name):
    return 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(P, name), 'rb').read()).decode() + ')'


def b64file(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()


TONES = ['brass', 'iron', 'crimson', 'teal']


def css():
    o = []
    for t in TONES:
        # D: 깎은 8각 (24×22, slice 8 8 10 8)
        o.append(f'.v-D .bt.{t}{{border-width:10px 10px 14px;border-image:{u(f"D-{t}.png")} 8 8 10 8 fill / 16px 16px 20px 16px stretch}}')
        o.append(f'.v-D .bt.{t}:active,.v-D .bt.{t}.down{{border-image-source:{u(f"D-{t}-down.png")}}}')
        o.append(f'.v-D .bt.big.{t}::before{{background-image:{u(f"D-gear-{t}.png")}}}.v-D .bt.big.{t}::after{{background-image:{u(f"D-bolt-{t}.png")}}}')
        # E: 쇠틀 + 판 (24×24, slice 9) — 큰 단추 오른끝 화살
        hz = '-hz' if t == 'crimson' else ''
        o.append(f'.v-E .bt.{t}{{border-width:12px 12px 14px;border-image:{u(f"E-{t}{hz}.png")} 9 fill / 18px stretch}}')
        o.append(f'.v-E .bt.{t}:active,.v-E .bt.{t}.down{{border-image-source:{u(f"E-{t}{hz}-down.png")}}}')
        o.append(f'.v-E .bt.big.{t}::after{{background-image:{u(f"E-tip-{t}.png")}}}.v-E .bt.big.{t}:active::after{{background-image:{u(f"E-tip-{t}-down.png")}}}')
        # F: 명판 (24×20, slice 7 8 8 8) — 큰 단추 리본 꼬리
        o.append(f'.v-F .bt.{t}{{border-width:10px 12px 12px;border-image:{u(f"F-{t}.png")} 7 8 8 8 fill / 14px 16px 16px 16px stretch}}')
        o.append(f'.v-F .bt.{t}:active,.v-F .bt.{t}.down{{border-image-source:{u(f"F-{t}-down.png")}}}')
        o.append(f'.v-F .bt.big.{t}::before{{background-image:{u(f"F-rib-{t}-l.png")}}}.v-F .bt.big.{t}::after{{background-image:{u(f"F-rib-{t}-r.png")}}}')
    o.append(f'.lamp{{background-image:{u("lamp-off.png")}}}.lamp.on{{background-image:{u("lamp-on.png")}}}')
    o.append(f'.p1{{border-style:solid;border-width:20px;border-image:{u("P1.png")} 12 fill / 24px stretch}}')
    o.append(f'.p2{{border-style:solid;border-width:18px;border-image:{u("P2.png")} 12 fill / 24px stretch}}')
    o.append(f'.hang{{border-style:solid;border-width:12px 18px 10px;border-image:{u("hang.png")} 7 10 6 10 fill / 14px 20px 12px 20px stretch}}')
    return '\n'.join(o)


BASE = """
:root{ /* 작업대 위 철판 — 게임 화면과 같은 어둠 */
  --bg:#0e0d12; --plate:#17161d; --edge:#2c2d38; --fg:#ece6da; --dim:#a8a4b2; --brass:#f4d27a; --ink:#0b0b0e;
  --t15:15px/1.5 Galmuri14,Galmuri11,sans-serif; --t12:12px/1.5 Galmuri11,sans-serif; --t24:24px/1.2 Galmuri11,sans-serif; color-scheme:dark }
body{background:var(--bg);color:var(--fg);font:var(--t15);margin:0;font-synthesis:none}
.wrap{max-width:1180px;margin:0 auto;padding-block:24px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:26px}
h1{font:var(--t24);color:var(--brass);margin:0}h2{font:var(--t24);margin:0}p{margin:0}
.dim{color:var(--dim);font:var(--t12)}
.why{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.why div{background:var(--plate);border:2px solid var(--edge);padding:10px 12px}
.why b{color:var(--brass);font:var(--t15)}
.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}
.shots img{width:100%;height:auto;border:2px solid var(--edge)}
.var{display:grid;gap:12px;border-top:2px solid var(--edge);padding-top:18px}
.var .head{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline}
.stage{display:flex;flex-wrap:wrap;gap:28px 40px;align-items:flex-start;background:#121118;border:2px solid var(--edge);padding:28px 36px;min-width:0}
.blk{display:grid;gap:12px;width:min(300px,100%);min-width:0}
.blk .lab{font:var(--t12);color:var(--dim)}
.bt{all:unset;box-sizing:border-box;position:relative;border-style:solid;image-rendering:pixelated;display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;cursor:pointer;font:var(--t15);text-align:center;-webkit-tap-highlight-color:transparent;user-select:none;white-space:nowrap}
.bt>span{display:block;padding:0 4px}
.bt small{display:block;font:var(--t12);opacity:.9}
.bt.big{min-height:64px;font:var(--t24)}
.bt.brass{color:#2b1a06;text-shadow:0 1px 0 #fff1c066}.bt.iron{color:#ece6da;text-shadow:0 2px 0 #0b0b0e}.bt.crimson{color:#fff1e8;text-shadow:0 2px 0 #2a0608}.bt.teal{color:#06222a}
.bt[aria-disabled=true]{filter:grayscale(1) brightness(.55);cursor:not-allowed}
.bt:focus-visible{outline:2px solid var(--brass);outline-offset:4px}
.bt.big::before,.bt.big::after{content:'';position:absolute;top:50%;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none}
.v-D .bt:active>span,.v-D .bt.down>span{transform:translateY(4px)}
.v-D .bt.big::before{left:-24px;width:28px;height:60px;margin-top:-32px;background-size:28px 60px;z-index:1}
.v-D .bt.big::after{right:-12px;width:16px;height:44px;margin-top:-24px;background-size:16px 44px}
.v-D .bt.big{margin:0 12px 0 22px}
.v-E .bt:active>span,.v-E .bt.down>span{transform:translateY(4px)}
.v-E .bt.big{height:48px;min-height:48px;margin-right:22px;border-right-width:0;border-image-width:18px 0 18px 18px}
.v-E .bt.big::after{right:-24px;width:24px;height:48px;margin-top:-24px;background-size:24px 48px}
.v-F .bt:active>span,.v-F .bt.down>span{transform:translateY(2px)}
.v-F .bt.big::before,.v-F .bt.big::after{width:24px;height:40px;margin-top:-18px;background-size:24px 40px;z-index:-1}
.v-F .bt.big::before{left:-18px}.v-F .bt.big::after{right:-18px}
.v-F .bt.big{margin:0 16px;isolation:isolate}
.lamp{display:inline-block;width:16px;height:16px;background-size:16px 16px;image-rendering:pixelated;flex:none}
.row{display:flex;gap:8px}.row>.bt{flex:1 1 0;min-width:0}
.rail{display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center}
.choice{justify-content:flex-start;text-align:left;white-space:normal}
.pop{display:grid;gap:12px;position:relative;padding-top:30px;margin-top:14px}
.pop .hang{position:absolute;top:-34px;left:18px;font:var(--t15);color:#2b1a06;padding:0 6px}
.pop p{font:var(--t15)}
.p2 p{color:#3a3328}
.pick{background:var(--plate);border:2px solid var(--brass);padding:14px 16px;display:grid;gap:6px}
"""

VARS = {
    'D': ('D · 톱니 마개', '깎은 8각 판 + 볼록한 금속 명암 · 왼위 광택 줄. 큰 단추는 왼쪽에 반 톱니 마개, 오른쪽에 볼트 마개가 판 밖으로 튀어나온다. 램프가 「누를 수 있음」을 알린다.', 'p1'),
    'E': ('E · 레버 판', '쇠틀 안에 끼운 판 · 위 리벳 줄. 큰 단추는 오른끝이 화살처럼 뾰족(나아간다). 위험 단추는 아래에 경고 줄무늬.', 'p1'),
    'F': ('F · 명판 리본', '이중 테를 새긴 명판. 큰 단추는 양끝에 리본 꼬리가 접혀 나온다. 창은 압정 박은 설계 도면 종이.', 'p2'),
}


def stage(v):
    panel = VARS[v][2]
    return f'''<div class="stage v-{v}">
  <div class="blk"><p class="lab">메인 메뉴</p>
    <div class="bt big brass" role="button" tabindex="0"><span>출하 시작</span></div>
    <div class="bt teal" role="button" tabindex="0"><i class="lamp on"></i><span>오늘의 출하</span></div>
    <div class="row"><div class="bt iron" role="button" tabindex="0"><span>안내서</span></div><div class="bt iron" role="button" tabindex="0"><span>도감</span></div><div class="bt iron" role="button" tabindex="0"><span>프롤로그</span></div></div>
    <p class="lab">전투 레일</p>
    <div class="rail"><div class="bt iron" role="button" tabindex="0"><span>되감기</span></div><div class="bt big brass" role="button" tabindex="0"><span>턴 끝</span></div></div>
  </div>
  <div class="blk" style="width:min(380px,100%)"><p class="lab">사건 창</p>
    <div class="pop {panel}"><span class="hang">통행 문</span>
      <p>쇠창살 문 앞에 룩 둘이 버티고 있다.</p>
      <div class="bt iron choice" role="button" tabindex="0"><span>문을 부술까?<small>60%: 나사 +60 · 40%: 분대원 하나 HP −60%</small></span></div>
      <div class="bt brass choice" role="button" tabindex="0"><span>나사 40을 낸다<small>분대 전원 HP +20%</small></span></div>
      <div class="row"><div class="bt crimson" role="button" tabindex="0"><span>포기한다</span></div><div class="bt iron" role="button" tabindex="0" aria-disabled="true"><span>나사 부족</span></div></div>
    </div>
  </div>
</div>'''


def main(out, *shots):
    g = os.path.join(ROOT, 'node_modules', 'galmuri', 'dist')
    fonts = (f"@font-face{{font-family:Galmuri11;src:url({b64file(os.path.join(g, 'Galmuri11.woff2'), 'font/woff2')}) format('woff2')}}"
             f"@font-face{{font-family:Galmuri14;src:url({b64file(os.path.join(g, 'Galmuri14.woff2'), 'font/woff2')}) format('woff2')}}")
    sh = ''.join(f'<img src="{b64file(s, "image/png")}" alt="지금 화면">' for s in shots if os.path.exists(s))
    vars_html = ''.join(f'<section class="var"><div class="head"><h2>{t}</h2><p class="dim">{d}</p></div>{stage(v)}</section>' for v, (t, d, _) in VARS.items())
    page = f'''<title>버튼 · 판 시안 2차</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{fonts}{BASE}{css()}</style>
<div class="wrap">
  <header><h1>버튼 · 판 시안 2차 — 단색 · 정사각형에서 벗어나기</h1>
  <p class="dim">1차(A · B · C)는 테두리만 바꿔서 여전히 단색 판이었다. 2차는 판에 볼륨을 주고, 사각형 밖으로 튀어나오는 마개 · 꼬리 · 화살 끝과 램프 · 경고 줄무늬를 더했다. 모두 1도트 = 2px 실제 도트이고 직접 누를 수 있다.</p></header>
  <section class="why">
    <div><b>① 볼륨</b><p class="dim">위 반짝 띠 → 밝은 띠 → 바탕 → 아래 그늘 띠 + 왼위 광택 줄. 넓은 큰 단추일수록 볼록한 금속 막대처럼 보인다.</p></div>
    <div><b>② 실루엣</b><p class="dim">깎은 모서리 · 톱니 마개 · 볼트 · 화살 끝 · 리본 꼬리 — 큰 단추는 사각형이 아니다.</p></div>
    <div><b>③ 장치</b><p class="dim">램프(켜짐 = 누를 수 있음) · 위험 단추 경고 줄무늬 · 창 위에 사슬로 걸린 제목판.</p></div>
  </section>
  <section class="shots">{sh}</section>
  {vars_html}
  <section class="pick"><h2>고르는 법</h2><p>D · E · F 중 하나(또는 섞어서 — 예: 「단추 D, 큰 단추만 E 화살, 창은 F 도면」)를 말씀해 주세요. 1차 A · B · C도 아직 후보입니다. 고르면 메인 화면 · 전투 레일 · 사건 · 보상 · 고물상 · 지도 · 팝업의 모든 단추와 사각형 테두리를 갈아 끼우고 다시 찍어 확인합니다.</p></section>
</div>'''
    open(out, 'w', encoding='utf-8').write(page)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main(*sys.argv[1:])
