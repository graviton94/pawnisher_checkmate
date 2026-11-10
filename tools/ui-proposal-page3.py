"""
버튼 · 판 3차 시안 페이지 (D-292 3차): E2 = E + 체스판 띠 · 십자 나사 · 폰 각인 · 증기 구멍 · 황동 테 램프.
  python3 -I tools/draw-chrome4.py && python3 -I tools/ui-proposal-page3.py <out.html>
누르면 단추 안의 것(글자 · 램프 · 각인)이 모두 2도트 내려앉고, 큰 단추는 화살 끝에서 증기 3장.
"""
import base64
import os
import runpy
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P3 = os.path.join(ROOT, 'build-res', 'ui-proposals3')
P2 = runpy.run_path(os.path.join(ROOT, 'tools', 'ui-proposal-page2.py'))


def u(name, d=P3):
    return 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(d, name), 'rb').read()).decode() + ')'


def css():
    o = []
    for t in ('brass', 'iron', 'crimson', 'teal'):
        o.append(f'.v-E2 .bt.{t}{{border-width:20px 12px 18px;border-image:{u(f"E2-{t}.png")} 13 9 13 9 fill / 26px 18px 26px 18px repeat}}')
        o.append(f'.v-E2 .bt.{t}:active,.v-E2 .bt.{t}.down{{border-image-source:{u(f"E2-{t}-down.png")}}}')
        o.append(f'.v-E2 .bt.big.{t}::after{{background-image:{u(f"E2-tip-{t}.png")}}}.v-E2 .bt.big.{t}:active::after{{background-image:{u(f"E2-tip-{t}-down.png")}}}')
    o.append(f'.v-E2 .bt.big::before{{background-image:{u("stamp.png")}}}')
    o.append(f'.v-E2 .lamp{{background-image:{u("lamp-off.png")}}}.v-E2 .lamp.on{{background-image:{u("lamp-on.png")}}}')
    o.append(f'.v-E2 .puff{{background-image:{u("puff.png")}}}')
    o.append(f'.v-E2 .pnl{{border-style:solid;border-width:22px;border-image:{u("panel.png")} 12 fill / 24px repeat}}')
    o.append(f'.v-E2 .hang{{border-style:solid;border-width:12px 18px 10px;border-image:{u("hang.png")} 7 10 6 10 fill / 14px 20px 12px 20px stretch}}')
    return '\n'.join(o)


EXTRA = """
.v-E2 .bt{height:auto;min-height:60px}
.v-E2 .bt:active>*:not(.puff),.v-E2 .bt.down>*:not(.puff){transform:translateY(4px)}
.v-E2 .bt.big{height:64px;min-height:64px;margin-right:30px;border-right-width:0;border-image-width:26px 0 26px 18px;padding-left:26px}
.v-E2 .bt.big::after{content:'';position:absolute;right:-30px;top:50%;width:30px;height:64px;margin-top:-32px;background-size:30px 64px;image-rendering:pixelated;pointer-events:none}
.v-E2 .bt.big::before{content:'';position:absolute;left:12px;top:50%;width:20px;height:28px;margin-top:-14px;background-size:20px 28px;image-rendering:pixelated;pointer-events:none}
.v-E2 .bt.big:active::before{margin-top:-10px}
.v-E2 .lamp{width:20px;height:20px;background-size:20px 20px}
.v-E2 .puff{position:absolute;right:-44px;top:-4px;width:24px;height:24px;background-size:72px 24px;image-rendering:pixelated;visibility:hidden;pointer-events:none}
.v-E2 .bt.big:active .puff,.v-E2 .bt.big.fire .puff{visibility:visible;animation:puff 360ms steps(3) forwards}
@keyframes puff{from{background-position:0 0}to{background-position:-72px 0}}
@media(prefers-reduced-motion:reduce){.v-E2 .bt.big:active .puff{animation:none}}
.pnl{display:grid;gap:12px;position:relative;padding-top:24px;margin-top:20px}
.pnl .hang{position:absolute;top:-38px;left:18px;font:var(--t15);color:#2b1a06;padding:0 6px}
.pnl p{font:var(--t15)}
.reward{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.reward .bt{flex-direction:column;min-height:92px;white-space:normal;font:var(--t12)}
.reward .bt b{font:var(--t15)}
.cmp{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
"""


def stage():
    return '''<div class="stage v-E2">
  <div class="blk"><p class="lab">메인 메뉴</p>
    <div class="bt big brass" role="button" tabindex="0"><span>출하 시작</span><i class="puff"></i></div>
    <div class="bt teal" role="button" tabindex="0"><i class="lamp on"></i><span>오늘의 출하</span></div>
    <div class="row"><div class="bt iron" role="button" tabindex="0"><span>안내서</span></div><div class="bt iron" role="button" tabindex="0"><span>도감</span></div><div class="bt iron" role="button" tabindex="0"><span>프롤로그</span></div></div>
    <p class="lab">전투 레일</p>
    <div class="rail"><div class="bt iron" role="button" tabindex="0"><span>되감기</span></div><div class="bt big brass" role="button" tabindex="0"><span>턴 끝</span><i class="puff"></i></div></div>
  </div>
  <div class="blk" style="width:min(380px,100%)"><p class="lab">사건 창</p>
    <div class="pnl"><span class="hang">통행 문</span>
      <p>쇠창살 문 앞에 룩 둘이 버티고 있다.</p>
      <div class="bt iron choice" role="button" tabindex="0"><span>문을 부술까?<small>60%: 나사 +60 · 40%: 분대원 하나 HP −60%</small></span></div>
      <div class="bt brass choice" role="button" tabindex="0"><span>나사 40을 낸다<small>분대 전원 HP +20%</small></span></div>
      <div class="row"><div class="bt crimson" role="button" tabindex="0"><span>포기한다</span></div><div class="bt iron" role="button" tabindex="0" aria-disabled="true"><span>나사 부족</span></div></div>
    </div>
  </div>
  <div class="blk" style="width:min(380px,100%)"><p class="lab">보상 창</p>
    <div class="pnl"><span class="hang">부품 하나</span>
      <div class="reward"><div class="bt iron" role="button" tabindex="0"><b>죔쇠</b><span>묶인 적 ×1.5</span></div><div class="bt brass" role="button" tabindex="0"><b>옥새</b><span>킹 처치 카드 +2</span></div><div class="bt teal" role="button" tabindex="0"><b>초시계</b><span>첫 손패 +2</span></div></div>
      <div class="bt iron" role="button" tabindex="0"><span>지나간다</span></div>
    </div>
  </div>
</div>'''


def main(out):
    g = os.path.join(ROOT, 'node_modules', 'galmuri', 'dist')
    fonts = (f"@font-face{{font-family:Galmuri11;src:url({P2['b64file'](os.path.join(g, 'Galmuri11.woff2'), 'font/woff2')}) format('woff2')}}"
             f"@font-face{{font-family:Galmuri14;src:url({P2['b64file'](os.path.join(g, 'Galmuri14.woff2'), 'font/woff2')}) format('woff2')}}")
    e_old = P2['stage']('E')
    page = f'''<title>버튼 · 판 시안 E2</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{fonts}{P2['BASE']}{P2['css']()}{css()}{EXTRA}</style>
<div class="wrap">
  <header><h1>버튼 · 판 시안 E2 — 체스 공장의 레버 판</h1>
  <p class="dim">고른 E(쇠틀 · 끼운 판 · 화살 끝 · 경고 줄무늬)에 공장과 체스를 더했다. 모두 1도트 = 2px 실제 도트. 큰 단추를 눌러 보세요 — 단추 안의 것이 모두 내려앉고, 화살 끝 구멍에서 증기가 뿜어진다.</p></header>
  <section class="why">
    <div><b>체스판 띠</b><p class="dim">쇠틀 위에 흑백 체스판 무늬 띠 — 출하 판 · 컨베이어. 단추 · 창 모두 같은 띠.</p></div>
    <div><b>폰 각인 · 십자 나사</b><p class="dim">큰 단추 판에 찍힌 폰 도장(출하 각인), 귀퉁이는 십자 나사 머리.</p></div>
    <div><b>증기 · 램프</b><p class="dim">화살 끝 증기 구멍 — 누르면 증기 3장(계단 프레임). 램프는 황동 테 계기 램프로.</p></div>
  </section>
  <section class="var"><div class="head"><h2>E2</h2><p class="dim">메인 메뉴 · 전투 레일 · 사건 창 · 보상 창. 창은 위에 체스판 띠를 두른 쇠 함 + 사슬에 걸린 제목판.</p></div>{stage()}</section>
  <section class="var"><div class="head"><h2>비교 · 고른 E</h2><p class="dim">2차 시안의 E 그대로 (램프가 이제 눌림을 따라 내려간다).</p></div>{e_old}</section>
  <section class="pick"><h2>다음</h2><p>이대로 가면 메인 화면 · 전투 레일 · 사건 · 보상 · 고물상 · 지도 · 팝업의 단추와 사각형 테두리를 모두 E2로 바꾸고, 실제 화면을 다시 찍어 확인합니다. 덜고 싶은 것(예: 체스판 띠는 창에만, 증기는 「턴 끝」에만)이 있으면 말씀해 주세요.</p></section>
</div>'''
    page = page.replace('.v-E .bt:active>span,.v-E .bt.down>span{transform:translateY(4px)}', '.v-E .bt:active>*,.v-E .bt.down>*{transform:translateY(4px)}')
    open(out, 'w', encoding='utf-8').write(page)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main(sys.argv[1])
