"""
아이콘 발주 페이지 (D-289): 시트마다 ① 첨부할 그림 ② 붙여 넣을 프롬프트를 나눠 보여 주는 HTML 한 장.
  python3 -I tools/pixel/icon_order_page.py <out.html>   → 「아이콘 발주서」 아티팩트에 올린다
"""
import base64
import html
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import icon_sheets as I  # noqa: E402


def b64(p):
    return 'data:image/png;base64,' + base64.b64encode(open(p, 'rb').read()).decode()


CSS = """
:root{
  /* 작업대 위 발주 전표: 검은 철판 바탕 · 황동 강조 · 종이 프롬프트 칸 */
  --bg:#14131a; --plate:#1f1e27; --edge:#41434f; --fg:#ece6da; --dim:#a8a4b2; --brass:#d9a838; --brass2:#f4d27a; --paper:#f1ede4; --ink:#0b0b0e; --teal:#5eead4;
  --display:'DotGothic16','Noto Sans KR',sans-serif; --body:'Noto Sans KR',system-ui,sans-serif; --mono:ui-monospace,'SFMono-Regular',Menlo,monospace;
  color-scheme:dark;
}
body{background:var(--bg);color:var(--fg);font:15px/1.6 var(--body);margin:0}
.wrap{max-width:1080px;margin:0 auto;padding-block:28px 64px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));display:grid;gap:28px}
h1{font:400 30px/1.2 var(--display);margin:0;color:var(--brass2);letter-spacing:.02em;text-wrap:balance}
.lead{margin:6px 0 0;color:var(--dim);max-width:68ch}
.how{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.how div{background:var(--plate);border:2px solid var(--edge);padding:12px 14px;min-width:0}
.how b{display:block;font:400 15px var(--display);color:var(--brass)}
.how p{margin:4px 0 0;color:var(--dim);font-size:14px}
code{font:13px var(--mono);background:var(--ink);color:var(--teal);padding:1px 5px;word-break:break-all}
nav{display:flex;flex-wrap:wrap;gap:8px}
nav a{font:400 14px var(--display);color:var(--fg);text-decoration:none;background:var(--plate);border:2px solid var(--edge);padding:6px 10px}
nav a:hover,nav a:focus-visible{border-color:var(--brass);outline:none}
section{background:var(--plate);border:2px solid var(--edge);box-shadow:4px 4px 0 var(--ink);display:grid;gap:16px;padding:18px;scroll-margin-top:16px}
.head{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}
.sid{font:400 24px var(--display);color:var(--brass2)}
.grp{font:400 15px var(--display)}
.cnt{color:var(--dim);font-size:13px}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:18px}
@media (max-width:820px){.cols{grid-template-columns:1fr}}
.step{display:grid;gap:8px;align-content:start;min-width:0}
.tag{display:flex;align-items:center;gap:8px;font:400 14px var(--display);color:var(--brass)}
.tag i{font-style:normal;display:inline-grid;place-items:center;width:22px;height:22px;background:var(--brass);color:var(--ink)}
.ref img{display:block;width:100%;height:auto;image-rendering:pixelated;border:2px solid var(--ink)}
.ref small{color:var(--dim);font-size:13px}
ol.items{margin:0;padding-left:20px;color:var(--dim);font-size:13px;columns:2;column-gap:18px}
@media (max-width:520px){ol.items{columns:1}}
ol.items b{color:var(--fg);font-weight:500}
.pbox{position:relative}
pre{margin:0;background:var(--paper);color:#1c1a16;font:12.5px/1.55 var(--mono);padding:14px;max-height:340px;overflow:auto;white-space:pre-wrap;word-break:keep-all;border:2px solid var(--ink)}
button.copy{font:400 14px var(--display);background:var(--brass);color:var(--ink);border:2px solid var(--ink);padding:8px 14px;cursor:pointer;box-shadow:2px 2px 0 var(--ink);justify-self:start}
button.copy:active{transform:translate(2px,2px);box-shadow:none}
button.copy:focus-visible{outline:2px solid var(--teal);outline-offset:2px}
button.copy.done{background:var(--teal)}
@media (prefers-reduced-motion:reduce){button.copy:active{transform:none}}
"""

JS = """
document.querySelectorAll('button.copy').forEach(function(b){b.addEventListener('click',function(){
  var pre=document.getElementById(b.dataset.for);var t=pre.textContent;
  var ok=function(){b.textContent='복사했습니다';b.classList.add('done');setTimeout(function(){b.textContent=b.dataset.label;b.classList.remove('done')},1600)};
  var sel=function(){var r=document.createRange();r.selectNodeContents(pre);var s=getSelection();s.removeAllRanges();s.addRange(r);b.textContent='선택했습니다 — 복사하세요'};
  try{navigator.clipboard.writeText(t).then(ok,sel)}catch(e){sel()}
})});
"""


def main(out):
    secs, nav = [], []
    for sid, (title, items) in I.SHEETS.items():
        img = os.path.join(ROOT, 'build-res', 'order', f'{sid}-now.png')
        li = ''.join(f'<li><b>{html.escape(n)}</b> — {html.escape(w)}</li>' for k, n, w in items)
        nav.append(f'<a href="#{sid}">{sid} {html.escape(title)}</a>')
        secs.append(f'''<section id="{sid}">
  <div class="head"><span class="sid">{sid}</span><span class="grp">{html.escape(title)}</span><span class="cnt">10장 · 받으면 <code>python3 -I tools/pixel/icon_sheet_import.py &lt;그림&gt; {sid}</code></span></div>
  <div class="cols">
    <div class="step ref"><div class="tag"><i>1</i>첨부할 그림 — 지금 게임 속 같은 10장</div>
      <img src="{b64(img)}" alt="{sid} 지금 아이콘 10장 (5×2, 마젠타 바탕)" width="1600" height="640">
      <small>길게 누르거나 오른쪽 클릭으로 이미지 저장 · 리포 파일 <code>build-res/order/{sid}-now.png</code></small>
      <ol class="items">{li}</ol>
    </div>
    <div class="step"><div class="tag"><i>2</i>붙여 넣을 프롬프트</div>
      <button class="copy" type="button" data-for="p-{sid}" data-label="프롬프트 복사">프롬프트 복사</button>
      <pre id="p-{sid}">{html.escape(I.prompt(sid))}</pre>
    </div>
  </div>
</section>''')
    page = f'''<title>아이콘 발주서</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Noto+Sans+KR:wght@400;500&display=swap">
<style>{CSS}</style>
<div class="wrap">
  <header><h1>아이콘 발주서 · 16칸 100장</h1>
    <p class="lead">Pawnisher : Checkmate의 모든 16칸 아이콘(부품 70 · 부적 3 · 지도 노드 7 · 서비스 4 · 즉시 카드 16)을 모양이 비슷한 것끼리 10장씩 묶었습니다. 시트마다 ① 그림을 첨부하고 ② 프롬프트를 붙여 넣으면 됩니다.</p></header>
  <div class="how">
    <div><b>1 · 새 채팅</b><p>시트 하나에 채팅 하나. 섞으면 격자가 흐트러집니다.</p></div>
    <div><b>2 · 그림 첨부</b><p>그 시트의 「지금 10장」 그림 — 화풍 · 칸 꼴 기준입니다.</p></div>
    <div><b>3 · 프롬프트 붙여 넣기</b><p>복사 단추로 통째로. 1600×640 · 5×2 · 마젠타 바탕으로 받습니다.</p></div>
    <div><b>4 · 받은 그림 넘기기</b><p>Claude가 <code>icon_sheet_import.py</code>로 16칸에 다시 찍어 게임에 넣습니다.</p></div>
  </div>
  <nav aria-label="시트">{''.join(nav)}</nav>
  {''.join(secs)}
</div>
<script>{JS}</script>
'''
    open(out, 'w', encoding='utf-8').write(page)
    print(out, os.path.getsize(out))


if __name__ == '__main__':
    main(sys.argv[1])
