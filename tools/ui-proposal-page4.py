"""
버튼 · 판 4차 시안 페이지 (D-292 4차): E 그대로 + 기물 정본 상반신 음각을 판 오른쪽에.
  python3 -I tools/draw-chrome3.py && python3 -I tools/draw-engrave.py && python3 -I tools/ui-proposal-page4.py <out.html>
"""
import base64
import os
import runpy
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P4 = os.path.join(ROOT, 'build-res', 'ui-proposals4')
P2 = runpy.run_path(os.path.join(ROOT, 'tools', 'ui-proposal-page2.py'))


def u(name):
    return 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(P4, name), 'rb').read()).decode() + ')'


def css():
    o = []
    for tone in ('brass', 'iron', 'crimson', 'teal'):
        for t in 'PNBRQK':
            o.append(f'.eng.{tone}-{t}{{background-image:{u(f"eng-{tone}-{t}.png")}}}')
    P2d = os.path.join(ROOT, 'build-res', 'ui-proposals2')
    for tone in ('brass', 'iron', 'crimson', 'teal'):
        img = 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(P2d, f'E-tip32-{tone}.png'), 'rb').read()).decode() + ')'
        imd = 'url(data:image/png;base64,' + base64.b64encode(open(os.path.join(P2d, f'E-tip32-{tone}-down.png'), 'rb').read()).decode() + ')'
        o.append(f'.v-E .bt.big.{tone}::after{{background-image:{img}}}.v-E .bt.big.{tone}:active::after{{background-image:{imd}}}')
    return '\n'.join(o)


EXTRA = """
.bt .engw{position:absolute;inset:-4px -6px -2px -6px;overflow:hidden;pointer-events:none;z-index:0}
.bt .eng{position:absolute;right:6px;top:0;width:144px;height:120px;background-repeat:no-repeat;background-size:144px auto;image-rendering:pixelated}
.bt>span{position:relative;z-index:1}
.v-E .bt.big{height:64px;min-height:64px;margin-right:32px;justify-content:flex-start;padding-left:14px}
.v-E .bt.big::after{right:-32px;width:32px;height:64px;margin-top:-32px;background-size:32px 64px}
.bt.has-eng{justify-content:flex-start;padding-left:8px}
.bt .eng{right:2px}
.v-E .bt:active>*,.v-E .bt.down>*{transform:translateY(4px)}
.cmp{display:grid;gap:18px}
"""


def btn(cls, label, tone=None, piece=None, small=None):
    eng = f'<i class="engw"><i class="eng {tone}-{piece}"></i></i>' if piece else ''
    sm = f'<small>{small}</small>' if small else ''
    return f'<div class="bt {cls}{' has-eng' if piece else ''}" role="button" tabindex="0">{eng}<span>{label}{sm}</span></div>'


def stage(with_eng):
    e = (lambda tone, p: (tone, p)) if with_eng else (lambda tone, p: (None, None))
    return f'''<div class="stage v-E">
  <div class="blk"><p class="lab">메인 메뉴</p>
    {btn('big brass', '출하 시작', *e('brass', 'P'))}
    {btn('teal', '<i class="lamp on"></i> 오늘의 출하', *e('teal', 'N'))}
    <div class="row">{btn('iron', '안내서')}{btn('iron', '도감')}{btn('iron', '프롤로그')}</div>
    <p class="lab">전투 레일</p>
    <div class="rail">{btn('iron', '되감기')}{btn('big brass', '턴 끝', *e('brass', 'K'))}</div>
  </div>
  <div class="blk" style="width:min(380px,100%)"><p class="lab">사건 창</p>
    <div class="pop p1"><span class="hang">통행 문</span>
      <p>쇠창살 문 앞에 룩 둘이 버티고 있다.</p>
      {btn('iron choice', '문을 부술까?', *e('iron', 'R'), small='60%: 나사 +60 · 40%: 분대원 하나 HP −60%')}
      {btn('brass choice', '나사 40을 낸다', *e('brass', 'B'), small='분대 전원 HP +20%')}
      <div class="row">{btn('crimson', '포기한다', *e('crimson', 'Q'))}{btn('iron', '지나간다')}</div>
    </div>
  </div>
</div>'''


def main(out):
    g = os.path.join(ROOT, 'node_modules', 'galmuri', 'dist')
    fonts = (f"@font-face{{font-family:Galmuri11;src:url({P2['b64file'](os.path.join(g, 'Galmuri11.woff2'), 'font/woff2')}) format('woff2')}}"
             f"@font-face{{font-family:Galmuri14;src:url({P2['b64file'](os.path.join(g, 'Galmuri14.woff2'), 'font/woff2')}) format('woff2')}}")
    page = f'''<title>버튼 · 판 시안 E + 음각</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>{fonts}{P2['BASE']}{P2['css']()}{css()}{EXTRA}</style>
<div class="wrap">
  <header><h1>버튼 시안 E + 기물 음각</h1>
  <p class="dim">고른 E를 그대로 두고, 기물 정본 도트(pieces64 → 게임 기물 그림)의 실루엣을 확대해 상반신만 판 오른쪽에 음각했다 — 새로 그린 그림 없음. 파인 자리의 위 · 왼 벽은 그늘, 아래 · 오른 턱은 빛(빛은 왼위에서). 단추마다 뜻에 맞는 기물: 출하 시작 = 폰(주인공), 턴 끝 = 킹, 오늘의 출하 = 나이트, 선택지 = 룩 · 비숍, 위험 = 퀸.</p></header>
  <section class="var"><div class="head"><h2>E + 음각</h2></div>{stage(True)}</section>
  <section class="var"><div class="head"><h2>비교 · E 그대로</h2></div>{stage(False)}</section>
  <section class="pick"><h2>다음</h2><p>이대로면 E 단추 · 판을 게임 전체(메인 · 전투 · 사건 · 보상 · 고물상 · 지도 · 팝업)에 넣고, 큰 단추 · 선택지에 기물 음각을 붙여 실제 화면을 다시 찍어 확인합니다. 단추별 기물 짝이나 음각 진하기를 바꾸고 싶으면 말씀해 주세요.</p></section>
</div>'''
    open(out, 'w', encoding='utf-8').write(page)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main(sys.argv[1])
