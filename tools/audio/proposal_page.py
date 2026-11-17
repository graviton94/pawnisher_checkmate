#!/usr/bin/env python3
"""
사운드 시안 페이지 (D-540 → D-545): 게임에 들어간 곡(A · B · D) · C 재시안(C1 · C2) · 짧게 다듬은 효과음(전 · 후 비교)을
한 장의 HTML(아티팩트)로 묶는다. 모든 소리는 base64로 안에 넣는다 (페이지 ≤ 15 MB).

    python3 -I tools/audio/proposal_page.py <출력.html> <효과음 이전판 폴더> [곡 폴더=public/audio/music] [시안 폴더=build-res/audio/bgm-concepts] [효과음 폴더=public/audio/sfx]

- 효과음 이전판 폴더: D-540 효과음 ogg/m4a (예: `git show <D-540 커밋>:public/audio/sfx/hit1.ogg`로 꺼낸 것).
- 곡은 페이지 무게를 줄이려고 미리듣기판으로 다시 굽는다: OGG 64 kbps(이음매가 정확하다) + AAC 48 kbps(Safari 대비). 게임 파일은 OGG 96 kbps.
"""
import base64
import html
import json
import os
import subprocess
import sys
import tempfile

OUT, BEFORE = sys.argv[1], sys.argv[2]
MUSIC = sys.argv[3] if len(sys.argv) > 3 else 'public/audio/music'
CONCEPT = sys.argv[4] if len(sys.argv) > 4 else 'build-res/audio/bgm-concepts'
SFX = sys.argv[5] if len(sys.argv) > 5 else 'public/audio/sfx'

GAME = [
    {'k': 'waltz', 'name': 'B 태엽 오르골 왈츠', 'len': '90 BPM 3/4 · 48마디 · 96초',
     'mood': '감기다 만 태엽이 혼자 도는 왈츠. 가운데 16마디는 나란한 장조로 잠깐 풀렸다가 처음 주제로 돌아옵니다.',
     'plays': [('타이틀 · 메뉴', {}), ('지도 · 쉼터 · 사건 · 고물상 (같은 곡을 벽 너머로)', {'lp': 1600, 'gain': 0.8})],
     'note': '타이틀에서 지도로 넘어갈 때는 곡을 다시 틀지 않고 거름만 바꿉니다.'},
    {'k': 'anvil', 'name': 'A 모루 행진', 'len': '100 BPM · 40마디 · 96초',
     'mood': '쇠를 두드리는 박자로 전진합니다. 도입 → 현 → 호른 주제 → 현이 노래하는 가운데 → 호른 · 트럼펫 주제 → 다리.',
     'plays': [('대국 1막', {}), ('대국 2막 (반음 위 · 6% 빠르게)', {'rate': 2 ** (1 / 12)}), ('대국 3막 (온음 위 · 12% 빠르게)', {'rate': 2 ** (2 / 12)})],
     'note': '막마다 같은 파일을 재생 속도로 올립니다 (용량 0 · 막이 오를수록 높고 빠르게).'},
    {'k': 'anvil-boss', 'name': 'A 반장 변주', 'len': '132 BPM · 52마디 · 94.5초',
     'mood': '팀파니와 금관 찌르기, 프리지아 반음. 가운데에 트럼펫 노래 · 합창, 북만 남는 쉼 뒤 작은북이 몰아칩니다.',
     'plays': [('반장전 · 레이드', {})], 'note': ''},
    {'k': 'crown-final', 'name': 'D 긴장 변주', 'len': '76 BPM · 32마디 · 101초',
     'mood': '트레몰로 현 · 합창 · 팀파니 위로 금관이 왕관 주제를 길게 부르고, 끝에서 피아노 · 바이올린 주제가 타이코와 돌아옵니다.',
     'plays': [('도금왕', {})], 'note': ''},
    {'k': 'crown', 'name': 'D 녹슨 왕관', 'len': '64 BPM · 24마디 · 90초',
     'mood': '피아노 주제 → 현 합주 → 첼로 독주가 노래하는 가운데 → 피아노 주제가 높게 돌아옵니다.',
     'plays': [('왕관 장면 · 결말 컷 · 크레딧 · 출하 끝 (패배 포함)', {})], 'note': ''},
]
CHIPS = [
    {'k': 'C1-gear', 'name': 'C1 톱니 칩', 'mood': 'F단조 96 BPM. 16분 펄스 아르페지오가 셋째 칸마다 강세를 받아 4박 위를 톱니처럼 돌고, 낮은 펄스 베이스가 무겁게 끕니다. 9마디부터 펄스 선율 + 메아리.',
     'boss': '반장 112 BPM — 16분 베이스 · 반음(F–Gb) 진행 · 선율 한 옥타브 위', 'len': '본 45초 / 반장 25.7초'},
    {'k': 'C2-clock', 'name': 'C2 시계탑 칩', 'mood': '7/8 박(2+2+3). 여덟 칸마다 시계가 똑 · 딱(높낮이 번갈아), 묶음 첫 칸에 낮은 쇠 쿵. 오르골 칩(사각 + 쇠 빗살 배음) 선율과 삼각 베이스.',
     'boss': '반장 — 8분 240 · F–E 반음 · 작은북 · 선율 아래 펄스 겹침', 'len': '본 46.2초 / 반장 24.5초'},
]
COMPARE = [('hit', '가벼운 타격'), ('crit', '무거운 일격'), ('kill', '처치'), ('check', '체크 종'), ('land', '쇠판에 놓기')]
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


def preview(src, tmp):
    """곡 미리듣기판: OGG 64k + AAC 48k (스테레오 그대로)."""
    base = os.path.join(tmp, os.path.basename(src)[:-4])
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'libvorbis', '-b:a', '64k', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'aac', '-b:a', '48k', base + '.m4a'], check=True)
    return {'ogg': b64(base + '.ogg'), 'm4a': b64(base + '.m4a')}


def sfx_names(d, k):
    return sorted(f[:-4] for f in os.listdir(d) if f.endswith('.ogg') and (f[:-4] == k or (f[:-5] == k and f[-5].isdigit())))


audio = {}
with tempfile.TemporaryDirectory() as tmp:
    for g in GAME:
        audio[g['k']] = preview(os.path.join(MUSIC, g['k'] + '.ogg'), tmp)
    for c in CHIPS:
        for v in ('main', 'boss'):
            audio[f'{c["k"]}-{v}'] = preview(os.path.join(CONCEPT, f'{c["k"]}-{v}.ogg'), tmp)
sfx_files = {}
for _, items in SFX_GROUPS:
    for k, _ in items:
        sfx_files[k] = sfx_names(SFX, k)
        for n in sfx_files[k]:
            audio['sfx-' + n] = {'ogg': b64(os.path.join(SFX, n + '.ogg')), 'm4a': b64(os.path.join(SFX, n + '.m4a'))}
before_files = {}
for k, _ in COMPARE:
    before_files[k] = sfx_names(BEFORE, k)
    for n in before_files[k]:
        audio['old-' + n] = {'ogg': b64(os.path.join(BEFORE, n + '.ogg')), 'm4a': b64(os.path.join(BEFORE, n + '.m4a'))}
TAILS = json.load(open(os.path.join(os.path.dirname(OUT), 'tails.json'))) if os.path.exists(os.path.join(os.path.dirname(OUT), 'tails.json')) else {}

E = html.escape


def player(key, label, opts=None, seam=True):
    o = json.dumps(opts or {})
    s = '<button type="button" class="seam">이음매 듣기</button>' if seam else ''
    return f'''<div class="pl" data-k="{key}" data-o='{E(o)}'><button type="button" class="play" aria-pressed="false">{E(label)}</button>{s}<span class="bar" aria-hidden="true"><i></i></span><span class="t">0:00</span></div>'''


def game_html(g):
    plays = ''.join(player(g['k'], label, o) for label, o in g['plays'])
    note = f'<p class="note">{E(g["note"])}</p>' if g['note'] else ''
    where = ' · '.join(E(label.split(' (')[0]) for label, _ in g['plays'])
    return f'''<article class="cc"><header><h3>{E(g['name'])}</h3><p class="where">{where}</p></header>
  <p class="mood">{E(g['mood'])}</p><p class="len">{E(g['len'])}</p>{note}{plays}</article>'''


def chip_html(c):
    return f'''<article class="cc"><header><h3>{E(c['name'])}</h3><p class="len">{E(c['len'])}</p></header>
  <p class="mood">{E(c['mood'])}</p><p class="note">{E(c['boss'])}</p>
  {player(c['k'] + '-main', '본 루프 듣기')}{player(c['k'] + '-boss', '반장 변주 듣기')}</article>'''


def ms(k, src):
    vals = [v[0] for n, v in TAILS.get(src, {}).items() if n == k or (n[:-1] == k and n[-1].isdigit())]
    return f'{round(max(vals) * 1000)} ms' if vals else ''


def compare_html():
    rows = []
    for k, label in COMPARE:
        rows.append(f'''<div class="cmp" data-s="{k}"><b>{E(label)}</b><small>{k}</small>
  <button type="button" class="ab" data-v="old">전 <span>{ms(k, 'before')}</span></button><button type="button" class="ab" data-v="new">후 <span>{ms(k, 'after')}</span></button></div>''')
    return ''.join(rows)


def sfx_html():
    out = []
    for g, items in SFX_GROUPS:
        btns = ''.join(f'<button type="button" class="sx" data-s="{k}">{E(label)}<small>{k}{" · 변형 " + str(len(sfx_files[k])) if len(sfx_files[k]) > 1 else ""}{" · " + ms(k, "after") if ms(k, "after") else ""}</small></button>' for k, label in items)
        out.append(f'<section class="sg"><h3>{E(g)}</h3><div class="sxs">{btns}</div></section>')
    return ''.join(out)


page = f'''<title>파우니셔 사운드 시안</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
:root {{
  color-scheme: dark;
  --bg: #121014; --panel: #1c191e; --panel2: #262128; --line: #3a3138; --ink: #ece4d2; --dim: #b4a99a;
  --brass: #d4ab52; --brass-d: #8a6a2a; --molten: #e8783c; --crimson: #e5262f; --steam: #6fd3c8; --ok: #8fc46a;
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
.ccs {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 400px), 1fr)); gap: 14px; }}
.cc {{ background: var(--panel); border: 2px solid var(--line); box-shadow: 3px 3px 0 #000; padding: 14px; min-width: 0; }}
.cc h3 {{ color: var(--brass); font-size: 18px; }}
.where {{ color: var(--steam); font-size: 13px; }}
.len {{ color: var(--dim); font-size: 13px; }}
.note {{ color: var(--dim); font-size: 13px; }}
.pl {{ display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; }}
.pl .play {{ flex: 1 1 100%; text-align: left; }}
.bar {{ flex: 1 1 120px; height: 10px; background: #000; border: 2px solid var(--line); position: relative; min-width: 80px; }}
.bar i {{ position: absolute; inset: 0 auto 0 0; width: 0; background: var(--molten); }}
.t {{ font-variant-numeric: tabular-nums; color: var(--dim); font-size: 13px; min-width: 3.2em; text-align: right; }}
button {{ font: inherit; color: var(--ink); background: var(--panel2); border: 2px solid var(--brass-d); box-shadow: 2px 2px 0 #000; padding: 8px 12px; min-height: 44px; cursor: pointer; }}
button:hover {{ border-color: var(--brass); }}
button:active {{ transform: translate(2px, 2px); box-shadow: none; }}
button:focus-visible {{ outline: 3px solid var(--steam); outline-offset: 2px; }}
button[aria-pressed="true"] {{ background: var(--brass); color: #1a1408; border-color: var(--brass); }}
.seam {{ border-color: var(--line); color: var(--dim); }}
.cmps {{ display: grid; gap: 8px; }}
.cmp {{ display: grid; grid-template-columns: 1fr auto auto; grid-template-rows: auto auto; gap: 2px 8px; align-items: center; background: var(--panel); border: 2px solid var(--line); padding: 8px 10px; }}
.cmp b {{ grid-column: 1; }} .cmp small {{ grid-column: 1; grid-row: 2; color: var(--dim); font-size: 12px; }}
.cmp .ab {{ grid-row: 1 / span 2; min-width: 96px; }}
.ab span {{ display: block; font-size: 12px; color: var(--dim); }}
.ab[data-v="new"] {{ border-color: var(--ok); }}
.ab.on {{ border-color: var(--molten); }}
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
  <p class="lead">고르신 A · B · D를 게임에 넣었습니다. C는 새로 둘을 썼고, 효과음은 울림을 짧게 줄였습니다. 모든 소리는 이 페이지 안에 있고 누를 때만 납니다.</p>
  <p class="warn" id="fmt" hidden></p>

  <h2>게임에 들어간 곡</h2>
  <p class="lead">모두 90초가 넘는 이음매 없는 루프입니다. 장면 단추는 게임과 같은 거름 · 속도로 들려 줍니다. 「이음매 듣기」는 끝 4초 → 처음 4초입니다. 곡이 바뀔 때 게임에서는 0.45초 겹쳐 넘깁니다.</p>
  <div class="ccs">{''.join(game_html(g) for g in GAME)}</div>

  <h2>C 재시안 (게임에 넣지 않음)</h2>
  <p class="lead">처음 C(검은 칩) 대신 결이 다른 둘입니다. 둘 다 본 루프 약 45초 + 짧은 반장 변주입니다.</p>
  <div class="ccs">{''.join(chip_html(c) for c in CHIPS)}</div>

  <h2>효과음 — 울림을 줄였습니다</h2>
  <p class="lead">홀 잔향을 걷고 쇠 배음이 빨리 꺼지게 했습니다. 손 · 창 · 카드 0.25초 안, 타격 · 처치 · 받아치기 0.35초 안, 큰 장면(반장 등장 · 2단계 · 승패)만 꼬리 0.6초 안. 숫자는 첨두에서 −60 dB까지 걸리는 시간입니다.</p>
  <div class="cmps">{compare_html()}</div>
  <h3 style="margin-top:20px;color:var(--dim);font-size:14px">전체 (게임에 들어간 판)</h3>
  {sfx_html()}

  <h2>출처 · 라이선스</h2>
  <div class="box src">
    <p><b>배경 음악 A · B · D</b> — 자체 작곡(MIDI, <code>tools/audio/bgm_game.py</code>), 음색은 FluidR3_GM 사운드폰트(© Frank Wen, MIT)로 렌더했습니다. 게임 파일은 OGG 96 kbps · −18 LUFS, 이 페이지는 무게를 줄인 미리듣기판(OGG 64 kbps)입니다.</p>
    <p><b>C1 · C2</b> — 자체 작곡 · 자체 칩 합성 (<code>tools/audio/bgm_concepts.py</code>).</p>
    <p><b>효과음 전부</b> — 자체 합성 (<code>tools/audio/sfx_synth.py</code>), CC0 1.0. −16 LUFS 근처 · 첨두 −1 dBFS.</p>
  </div>
</main>
<script>
const AUDIO = {json.dumps(audio)};
const SFXN = {json.dumps(sfx_files)};
const OLDN = {json.dumps(before_files)};
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
    catch (e) {{ if (f === 'ogg') {{ const w = document.getElementById('fmt'); w.hidden = false; w.textContent = '이 브라우저는 OGG를 풀지 못해 AAC 판으로 들려 줍니다 (이음매에 아주 짧은 틈이 들릴 수 있습니다).'; }} }}
  }}
  throw new Error('decode');
}}
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
  const o = JSON.parse(el.dataset.o || '{{}}');
  const b = await buffer(el.dataset.k);
  const a = ctx();
  const src = a.createBufferSource(); src.buffer = b; src.loop = true;
  const rate = o.rate || 1; src.playbackRate.value = rate;
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5; lp.frequency.value = o.lp || a.sampleRate / 2 - 100;
  const g = a.createGain(); g.gain.value = 0.9 * (o.gain || 1);
  src.connect(lp).connect(g).connect(a.destination);
  const off = seam ? Math.max(0, b.duration - 4 * rate) : 0;
  const t0 = a.currentTime - off / rate;
  src.start(0, off);
  cur = {{ el, src, seam }};
  if (!seam) el.querySelector('.play').setAttribute('aria-pressed', 'true');
  else cur.to = setTimeout(stopCur, 8000);
  const bar = el.querySelector('.bar i'), t = el.querySelector('.t');
  const dur = b.duration / rate;
  const tick = () => {{ const p = ((a.currentTime - t0) % dur); bar.style.width = (p / dur * 100).toFixed(1) + '%'; t.textContent = fmtT(p); cur && (cur.raf = requestAnimationFrame(tick)); }};
  tick();
}}
document.querySelectorAll('.pl').forEach((el) => {{
  el.querySelector('.play').addEventListener('click', () => playLoop(el, false));
  const s = el.querySelector('.seam'); if (s) s.addEventListener('click', () => playLoop(el, true));
}});
async function one(key, btn) {{
  const b = await buffer(key);
  const a = ctx(); const s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.start();
  btn.classList.add('on'); setTimeout(() => btn.classList.remove('on'), 200);
}}
const turn = {{}};
document.querySelectorAll('.sx').forEach((btn) => btn.addEventListener('click', () => {{
  const k = btn.dataset.s, names = SFXN[k];
  const i = (turn[k] = ((turn[k] ?? -1) + 1) % names.length);
  one('sfx-' + names[i], btn);
}}));
// 전 · 후: 같은 변형 번호로 들려 준다
const turnAB = {{}};
document.querySelectorAll('.cmp .ab').forEach((btn) => btn.addEventListener('click', () => {{
  const k = btn.closest('.cmp').dataset.s, old = btn.dataset.v === 'old';
  const names = old ? OLDN[k] : SFXN[k];
  const id = k + btn.dataset.v;
  const i = (turnAB[id] = ((turnAB[id] ?? -1) + 1) % names.length);
  one((old ? 'old-' : 'sfx-') + names[i], btn);
}}));
</script>
'''
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(page)
print(OUT, round(os.path.getsize(OUT) / 1024 / 1024, 2), 'MB')
