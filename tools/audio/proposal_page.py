#!/usr/bin/env python3
"""
사운드 시안 페이지 (D-540): 배경 음악 시안 넷 + 새 효과음을 한 장의 HTML(아티팩트)로 묶는다. 모든 소리는 base64로 안에 넣는다.

    python3 -I tools/audio/proposal_page.py <출력.html> <bgm ogg 폴더> <bgm m4a 폴더> [sfx 폴더=public/audio/sfx]
"""
import base64
import html
import json
import os
import sys

OUT, BGM, BGM_M4A = sys.argv[1], sys.argv[2], sys.argv[3]
SFX = sys.argv[4] if len(sys.argv) > 4 else 'public/audio/sfx'

CONCEPTS = [
    {'id': 'A-anvil', 'name': 'A 모루 행진', 'mood': '쇠를 두드리는 박자로 전진합니다. 공장이 아직 살아 있다는 소리입니다.',
     'where': '지도 · 일반 대국 (1~3막) · 반장전은 반장 변주',
     'inst': '튜바 · 트롬본 저음 오스티나토, 아고고(모루) · 큰북(망치) · 하이햇(증기), 9마디부터 호른 주제 · 타이코',
     'tempo': '본 100 BPM · 48초 / 반장 132 BPM · 22초 (팀파니 · 금관 찌르기 · 프리지아 반음)'},
    {'id': 'B-waltz', 'name': 'B 태엽 오르골 왈츠', 'mood': '감기다 만 태엽이 혼자 도는 왈츠입니다. 쓸쓸하고 작습니다.',
     'where': '타이틀 · 막 쉼터 · 사건 · 고물상 · 반장전은 긴장 변주',
     'inst': '오르골 선율, 피치카토 쿵-짝-짝, 시계 우드블록, 둘째 바퀴부터 첼로 · 첼레스타',
     'tempo': '본 90 BPM 3/4 · 48초 / 긴장 112 BPM · 26초 (트레몰로 현 · 팀파니 · 오르골 한 옥타브 아래)'},
    {'id': 'C-chip', 'name': 'C 검은 칩', 'mood': '도트 그림과 같은 결의 어두운 칩튠입니다. 지금 게임 음악을 넓힌 방향입니다.',
     'where': '대국 전반 (지금 칩튠 자리를 그대로 이어받음) · 반장 변주',
     'inst': '펄스 25% 리드 + 메아리, 펄스 12.5% 16분 아르페지오, 4비트 삼각 베이스, 잡음 북',
     'tempo': '본 140 BPM · 41초 / 반장 160 BPM · 24초 (F–E 반음 진행 · 빽빽한 아르페지오)'},
    {'id': 'D-crown', 'name': 'D 녹슨 왕관', 'mood': '왕관이 녹스는 소리입니다. 느린 실내악으로 이야기의 무게를 받칩니다.',
     'where': '왕관 장면 · 결말 · 크레딧 · 종이왕 독백 (긴장 변주는 도금왕 · 왕관 파괴)',
     'inst': '피아노 펼친 화음 + 선율, 5마디부터 현 합주 · 첼로, 9마디부터 바이올린 독주',
     'tempo': '본 64 BPM · 45초 / 긴장 76 BPM · 38초 (트레몰로 현 · 합창 · 팀파니 · 나폴리 화음)'},
]

SFX_GROUPS = [
    ('손 · 창', [('tap', '단추'), ('tick', '계기 한 칸'), ('lift', '기물 · 카드 집기'), ('land', '쇠판에 놓기'), ('submit', '레버 (턴 끝)'),
                ('open', '창 열기'), ('close', '창 닫기'), ('deny', '안 됨 (태엽 부족)')]),
    ('명령서', [('card', '카드 뽑기'), ('cast', '즉시 명령'), ('burn', '카드가 불탄다')]),
    ('대국', [('hit', '가벼운 타격'), ('crit', '무거운 일격'), ('kinghit', '내 킹 피격'), ('hurt', '내 기물 쓰러짐'), ('kill', '처치 (주철 깨짐)'),
             ('check', '체크 종'), ('parry', '받아치기 · 가시 반격'), ('stun', '경직 · 헛방'), ('push', '밀림 (바닥 꺼짐)'), ('threat', '경고'), ('wind', '태엽 감김')]),
    ('나사 · 보상', [('coin', '나사 얻음'), ('spend', '나사 씀'), ('buy', '고물상에서 산다'), ('loss', '나사 잃음'), ('rare', '귀한 보상'), ('jackpot', '큰 보상'),
                  ('stamp', '도장 압인'), ('awaken', '깨어남 · 승격')]),
    ('길 · 장면', [('step', '지도 한 칸'), ('slot', '사건 칸 멈춤'), ('boss', '반장 등장'), ('phase', '반장 2단계'), ('win', '승리'), ('lose', '패배')]),
]


def b64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('ascii')


audio = {}
for c in CONCEPTS:
    for v in ('main', 'boss'):
        k = f'{c["id"]}-{v}'
        audio[k] = {'ogg': b64(os.path.join(BGM, k + '.ogg')), 'm4a': b64(os.path.join(BGM_M4A, k + '.m4a'))}
sfx_files = {}
for _, items in SFX_GROUPS:
    for k, _ in items:
        names = sorted(f[:-4] for f in os.listdir(SFX) if f.endswith('.ogg') and (f[:-4] == k or (f[:-5] == k and f[-5].isdigit())))
        sfx_files[k] = names
        for n in names:
            audio['sfx-' + n] = {'ogg': b64(os.path.join(SFX, n + '.ogg')), 'm4a': b64(os.path.join(SFX, n + '.m4a'))}

E = html.escape


def concept_html(c):
    return f'''<article class="cc" data-id="{c['id']}">
  <header><h3>{E(c['name'])}</h3><p class="mood">{E(c['mood'])}</p></header>
  <dl>
    <dt>쓰는 곳</dt><dd>{E(c['where'])}</dd>
    <dt>악기</dt><dd>{E(c['inst'])}</dd>
    <dt>빠르기 · 길이</dt><dd>{E(c['tempo'])}</dd>
  </dl>
  <div class="pl" data-k="{c['id']}-main"><button type="button" class="play" aria-pressed="false">본 루프 듣기</button><button type="button" class="seam">이음매 듣기</button><span class="bar" aria-hidden="true"><i></i></span><span class="t">0:00</span></div>
  <div class="pl" data-k="{c['id']}-boss"><button type="button" class="play" aria-pressed="false">반장 · 긴장 변주</button><button type="button" class="seam">이음매 듣기</button><span class="bar" aria-hidden="true"><i></i></span><span class="t">0:00</span></div>
</article>'''


def sfx_html():
    out = []
    for g, items in SFX_GROUPS:
        btns = ''.join(f'<button type="button" class="sx" data-s="{k}" data-n="{len(sfx_files[k])}">{E(label)}<small>{k}{" · 변형 " + str(len(sfx_files[k])) if len(sfx_files[k]) > 1 else ""}</small></button>' for k, label in items)
        out.append(f'<section class="sg"><h3>{E(g)}</h3><div class="sxs">{btns}</div></section>')
    return ''.join(out)


page = f'''<title>파우니셔 사운드 시안</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root {{
  color-scheme: dark;
  --bg: #121014; --panel: #1c191e; --panel2: #262128; --line: #3a3138; --ink: #ece4d2; --dim: #b4a99a;
  --brass: #d4ab52; --brass-d: #8a6a2a; --molten: #e8783c; --crimson: #e5262f; --steam: #6fd3c8;
}}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; background: var(--bg); color: var(--ink); overflow-x: hidden; }}
body {{ font: 15px/1.6 "Galmuri11", "Noto Sans KR", system-ui, sans-serif; padding: 24px max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px)); }}
main {{ max-width: 920px; margin: 0 auto; }}
h1 {{ font-size: 24px; margin: 0 0 4px; color: var(--brass); letter-spacing: .02em; }}
h2 {{ font-size: 18px; margin: 36px 0 12px; color: var(--brass); border-bottom: 2px solid var(--brass-d); padding-bottom: 6px; }}
h3 {{ font-size: 16px; margin: 0; }}
p {{ margin: 6px 0; }}
.lead {{ color: var(--dim); }}
.box {{ background: var(--panel); border: 2px solid var(--line); box-shadow: 3px 3px 0 #000; padding: 14px 16px; }}
.decide {{ border-color: var(--molten); }}
.decide h2 {{ margin-top: 0; border: 0; color: var(--molten); }}
.decide ol {{ margin: 6px 0 0; padding-left: 20px; }}
.decide li {{ margin: 4px 0; }}
.ccs {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 14px; }}
.cc {{ background: var(--panel); border: 2px solid var(--line); box-shadow: 3px 3px 0 #000; padding: 14px; min-width: 0; }}
.cc h3 {{ color: var(--brass); font-size: 18px; }}
.mood {{ color: var(--ink); }}
dl {{ display: grid; grid-template-columns: 6.5em 1fr; gap: 4px 10px; margin: 10px 0; font-size: 13px; }}
dt {{ color: var(--dim); }} dd {{ margin: 0; min-width: 0; }}
.pl {{ display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }}
.bar {{ flex: 1 1 120px; height: 10px; background: #000; border: 2px solid var(--line); position: relative; min-width: 80px; }}
.bar i {{ position: absolute; inset: 0 auto 0 0; width: 0; background: var(--molten); }}
.t {{ font-variant-numeric: tabular-nums; color: var(--dim); font-size: 13px; min-width: 3.2em; text-align: right; }}
button {{ font: inherit; color: var(--ink); background: var(--panel2); border: 2px solid var(--brass-d); box-shadow: 2px 2px 0 #000; padding: 8px 12px; min-height: 44px; cursor: pointer; }}
button:hover {{ border-color: var(--brass); }}
button:active {{ transform: translate(2px, 2px); box-shadow: none; }}
button:focus-visible {{ outline: 3px solid var(--steam); outline-offset: 2px; }}
button[aria-pressed="true"] {{ background: var(--brass); color: #1a1408; border-color: var(--brass); }}
.seam {{ border-color: var(--line); color: var(--dim); }}
.sg {{ margin-top: 14px; }}
.sg h3 {{ color: var(--dim); font-size: 14px; margin-bottom: 8px; }}
.sxs {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }}
.sx {{ text-align: left; display: flex; flex-direction: column; gap: 2px; }}
.sx small {{ color: var(--dim); font-size: 12px; }}
.sx.on {{ border-color: var(--molten); }}
.src {{ font-size: 13px; color: var(--dim); }}
.src b {{ color: var(--ink); }}
.warn {{ color: var(--molten); font-size: 13px; }}
code {{ font-size: 13px; color: var(--steam); word-break: break-all; }}
@media (prefers-reduced-motion: reduce) {{ button:active {{ transform: none; }} }}
</style>
<main>
  <h1>파우니셔 사운드 시안</h1>
  <p class="lead">주물 공방 — 쇠 · 황동 · 쇳물 · 종이 · 녹. 배경 음악 방향 넷과 새 효과음을 들어 보고 고릅니다. 모든 소리는 이 페이지 안에 들어 있고, 누를 때만 납니다.</p>
  <p class="warn" id="fmt" hidden></p>

  <section class="box decide" style="margin-top:20px">
    <h2>결정할 것</h2>
    <ol>
      <li><b>배경 음악 방향 하나</b>를 고릅니다 (A · B · C · D). 또는 <b>장면마다 섞기</b> — 예: 타이틀 · 쉼터 = B, 지도 · 대국 = A 또는 C, 결말 · 크레딧 = D.</li>
      <li>반장전은 <b>그 방향의 반장 변주</b>로 갈지, 다른 방향의 변주를 빌릴지 고릅니다.</li>
      <li>효과음은 이미 게임에 들어갔습니다. 너무 크거나 맞지 않는 소리가 있으면 이름(회색 글자)을 알려 주세요 — 크기 · 결을 고칩니다.</li>
    </ol>
  </section>

  <h2>배경 음악 시안</h2>
  <p class="lead">모두 루프입니다. 「이음매 듣기」는 끝 4초에서 처음 4초로 넘어가는 자리를 들려 줍니다 — 끊김이 없어야 합니다. 아직 게임에는 넣지 않았습니다.</p>
  <div class="ccs">{''.join(concept_html(c) for c in CONCEPTS)}</div>

  <h2>효과음 (게임에 들어간 판)</h2>
  <p class="lead">예전의 삑 소리 대신 쇠 · 황동 · 종이 · 증기 소리입니다. 자주 나는 소리는 변형 둘 · 셋을 번갈아 냅니다 (누를 때마다 바뀝니다).</p>
  {sfx_html()}

  <h2>출처 · 라이선스</h2>
  <div class="box src">
    <p><b>효과음 전부</b> — 자체 합성 (모드 합성 · 래칫 · 증기 · 종이 잡음, <code>tools/audio/sfx_synth.py</code>). CC0 1.0으로 공개합니다. 외부 소리 묶음(kenney.nl · OpenGameArt · Freesound)은 작업 환경의 네트워크 정책으로 받지 못해 같은 방향으로 직접 만들었습니다.</p>
    <p><b>배경 음악 A · B · D</b> — 자체 작곡(MIDI, <code>tools/audio/bgm_concepts.py</code>), 음색은 FluidR3_GM 사운드폰트(Frank Wen, MIT)로 렌더했습니다.</p>
    <p><b>배경 음악 C</b> — 자체 작곡 · 자체 칩 합성 (numpy 펄스 · 삼각 · 잡음).</p>
    <p>크기: 효과음 −16 LUFS 근처 · 배경 음악 −18 LUFS, 첨두 −1 dBFS.</p>
  </div>
</main>
<script>
const AUDIO = {json.dumps(audio)};
const SFXN = {json.dumps(sfx_files)};
let ac = null, fmt = null;
const ctx = () => {{
  if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}};
const cache = new Map();
const bytes = (b) => {{ const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }};
const dec = (a, ab) => new Promise((ok, no) => a.decodeAudioData(ab, ok, no));
async function buffer(k) {{
  if (cache.has(k)) return cache.get(k);
  const a = ctx();
  const order = fmt ? [fmt] : ['ogg', 'm4a'];
  for (const f of order) {{
    try {{ const b = await dec(a, bytes(AUDIO[k][f])); fmt = f; cache.set(k, b); return b; }}
    catch (e) {{ if (f === 'ogg') {{ const w = document.getElementById('fmt'); w.hidden = false; w.textContent = '이 브라우저는 OGG를 풀지 못해 AAC 판으로 들려 줍니다.'; }} }}
  }}
  throw new Error('decode');
}}
// 배경 음악: 한 번에 하나만
let cur = null;
const fmtT = (s) => `${{Math.floor(s / 60)}}:${{String(Math.floor(s % 60)).padStart(2, '0')}}`;
function stopCur() {{
  if (!cur) return;
  try {{ cur.src.stop(); }} catch (e) {{}}
  cur.el.querySelector('.play').setAttribute('aria-pressed', 'false');
  cur.el.querySelector('.bar i').style.width = '0';
  cancelAnimationFrame(cur.raf); clearTimeout(cur.to); cur = null;
}}
async function playLoop(el, seam) {{
  const was = cur && cur.el === el && !cur.seam && !seam;
  stopCur();
  if (was) return;
  const k = el.dataset.k;
  const b = await buffer(k);
  const a = ctx();
  const src = a.createBufferSource(); src.buffer = b; src.loop = true;
  const g = a.createGain(); g.gain.value = 0.9; src.connect(g).connect(a.destination);
  const off = seam ? Math.max(0, b.duration - 4) : 0;
  const t0 = a.currentTime - off;
  src.start(0, off);
  cur = {{ el, src, seam }};
  if (!seam) el.querySelector('.play').setAttribute('aria-pressed', 'true');
  else cur.to = setTimeout(stopCur, 8000);
  const bar = el.querySelector('.bar i'), t = el.querySelector('.t');
  const tick = () => {{ const p = ((a.currentTime - t0) % b.duration); bar.style.width = (p / b.duration * 100).toFixed(1) + '%'; t.textContent = fmtT(p); cur && (cur.raf = requestAnimationFrame(tick)); }};
  tick();
}}
document.querySelectorAll('.pl').forEach((el) => {{
  el.querySelector('.play').addEventListener('click', () => playLoop(el, false));
  el.querySelector('.seam').addEventListener('click', () => playLoop(el, true));
}});
// 효과음: 누를 때마다 변형을 번갈아
const turn = {{}};
document.querySelectorAll('.sx').forEach((btn) => btn.addEventListener('click', async () => {{
  const k = btn.dataset.s, names = SFXN[k];
  const i = (turn[k] = ((turn[k] ?? -1) + 1) % names.length);
  const b = await buffer('sfx-' + names[i]);
  const a = ctx(); const s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start();
  btn.classList.add('on'); setTimeout(() => btn.classList.remove('on'), 200);
}}));
</script>
'''
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(page)
print(OUT, round(os.path.getsize(OUT) / 1024 / 1024, 2), 'MB')
