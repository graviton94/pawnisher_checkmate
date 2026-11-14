/**
 * 스토리보드 생성기 (D-448): 게임에 실제로 들어 있는 이야기 · 대사 데이터를 그대로 뽑아 리뷰용 문서 한 장으로 만든다.
 * 실행: `npx jiti tools/storyboard.ts` → docs/storyboard.md. 대사를 고친 뒤 다시 돌리면 문서가 따라온다 (손으로 옮겨 적지 않는다).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACT_CARD, BOSS_CARD, BOSS_SINS, BOSS_STORY, BOSS_TAUNTS, DEFEAT_CUTS, GILDED_STORY, PROLOGUE, STG_PROG, TESTIMONY, THRONE_TEXT, bossFallCut, lookBackCut, promotionCuts, shadowCut, trueEndingCuts, type Cut, type Line, type StoryBoss } from '../src/data/script';
import { companionScene, type CompanionActor } from '../src/data/companion-scenes';
import { CHAPTERS, STORY_LAW } from '../src/data/campaign';
import { CREW_VOICE } from '../src/data/crew-voice';
import { EVENT_TALK } from '../src/data/event-talk';
import { EVENT_OUTCOME } from '../src/data/event-outcome';
import { TUT } from '../src/data/tutorial';
import { COACH_LINES, GUIDE_PAGES, OPENING_TEXT } from '../src/data/opening';
import { BOSS_EPITHET, BOSS_PHASE_TEXT, HUD_TEXT, LIFE_TEXT } from '../src/data/hud';
import { CREDIT_TEXT } from '../src/data/credits';
import { SLICE_EVENTS } from '../src/slice/events';
import { TAUNTS } from '../src/slice/director';
import { DEATHS, NAMES, QUIRKS } from '../src/slice/crew';
import { ASCENSION } from '../src/slice/run';
import { BOSS_RULES } from '../src/slice/cards';

const out: string[] = [];
const p = (...ls: string[]): void => void out.push(...ls);
const clean = (t: string): string => t.replace(/<\/?em>/g, '').replace(/\|/g, '｜').replace(/\n/g, ' / ');
const KIND = { n: '서술', s: '대사', m: '독백' } as const;
/** 비트 연출 한 칸 (D-503): 숨(ms) · 카메라(초점 x·y, 확대 z) · 소리 큐 · 효과 */
const FX_KO = { shake: '흔들림', flash: '흰 번쩍', red: '붉은 경보', gold: '금빛' } as const;
const beat = (l: Line): string => [l.pause ? `숨 ${l.pause}` : '', l.shot ? `샷 ${Math.round(l.shot.x * 100)}·${Math.round(l.shot.y * 100)}${l.shot.z ? ` ×${l.shot.z}` : ''}` : '', l.sfx ? `소리 ${l.sfx}` : '', l.fx ? FX_KO[l.fx] : ''].filter(Boolean).join(' · ') || '—';
/** 줄 표: ID · 형식 · 화자 · 원문 · 연출(비트) */
const table = (prefix: string, lines: Line[]): void => {
  p('| ID | 형식 | 화자 | 원문 | 연출 |', '|---|---|---|---|---|');
  lines.forEach((l, i) => p(`| ${prefix}-${i + 1} | ${KIND[l.k]} | ${l.k === 's' ? l.who ?? '' : l.k === 'm' ? '주인공(속마음)' : '—'} | ${l.k === 's' ? `“${clean(l.t)}”` : l.k === 'm' ? `‘${clean(l.t)}’` : clean(l.t)} | ${beat(l)} |`));
  p('');
};
const TRANS_KO = { dither: '디더', iris: '조리개', melt: '쇳물', white: '백지', black: '암전', cut: '바로' } as const;
/** 컷 머리 연출 (D-503): 장 제목 카드 · 전환 · 첫 샷 · 끝 정적 · 맺음 카드 */
const cutHead = (c: Cut): string[] => [
  ...(c.title ? [`- **장 제목 카드**: ${c.title.kicker} / 「${c.title.title}」${c.title.sub ? ` / ${c.title.sub}` : ''}`] : []),
  `- **들어오는 전환**: ${TRANS_KO[c.trans ?? 'dither']}${c.shot ? ` · 첫 샷 ${Math.round(c.shot.x * 100)}·${Math.round(c.shot.y * 100)}${c.shot.z ? ` ×${c.shot.z}` : ''}` : ''}${c.coda ? ` · **끝 정적**(${c.coda === 'white' ? '백지' : '먹'} 위 한가운데 한 줄)` : ''}`,
  ...(c.end ? [`- **맺음 카드**: ${c.end.kicker} / 「${c.end.title}」${c.end.sub ? ` / ${clean(c.end.sub)}` : ''}`] : []),
];
/** 낱줄 표: ID · 상황 · 원문 */
const rows = (head: [string, string], items: [string, string, string][]): void => {
  p(`| ID | ${head[0]} | ${head[1]} |`, '|---|---|---|');
  items.forEach(([id, a, b]) => p(`| ${id} | ${clean(a)} | ${clean(b)} |`));
  p('');
};
const cutBlock = (id: string, title: string, c: Cut, picture: string, note = ''): void => {
  p(`#### ${id} · ${title}`, '', c.coda ? '- **그림**: 없음 — 끝 정적' : `- **그림**: \`${c.img}.png\` — ${picture}`, ...cutHead(c), ...(note ? [`- **메모**: ${note}`] : []), '');
  table(id, c.lines);
};

const BOSS_ORDER: StoryBoss[] = ['plate', 'inspect', 'spawn', 'magnet', 'thorns', 'alarm'];
const BOSS_RULE = (id: StoryBoss | 'gilded'): string => `${BOSS_RULES[id].lines.join(' · ')} — 안내: 「${BOSS_RULES[id].tell}」`;
const today = new Date().toISOString().slice(0, 10);

// ───────────────────────── 0. 머리 ─────────────────────────
p('# Pawnisher : Checkmate — 스토리보드 (리뷰용 전체 대본)', '',
  `> 생성일 ${today} · 게임 데이터에서 자동으로 뽑은 문서다 (\`npx jiti tools/storyboard.ts\`). 여기 적힌 글이 지금 게임에 실제로 나오는 글 전부다.`,
  '> 소설이 아니라 **게임용 스토리보드**다: 언제(트리거) · 어떤 그림 위에 · 누가 · 무슨 말을 · 어떤 어투로 하는지를 장면 순서대로 적었다.', '',
  '## 0. 이 문서 읽는 법 (리뷰어에게)', '',
  '- 모든 줄에 **ID**가 있다 (예: `PRO-04-3` = 프롤로그 4번 컷 셋째 줄). 고칠 때는 「ID → 고친 문장」으로 적어 주면 그대로 게임에 반영할 수 있다.',
  '- **형식**: 서술(화면 아래 자막, 3인칭 과거형) · 대사(이름표 + “ ”) · 독백(주인공 속마음, ‘ ’) · 시스템(규칙 안내, 합니다체).',
  '- **글 길이**: 컷신(프롤로그 · 동료 장면 · 반장 격파 · 도금왕 · 결말)은 **글자 수 제한이 없다** — 자막 띠(두 줄)가 긴 줄을 문장 단위로 나눠 차례로 보여 준다. 전투 중 말풍선 · 분대원 대사는 20자 안팎, 사건 서술은 두 문장, 사건 NPC 한마디는 대사 칸 두 줄(한글 약 34자) 안.',
  '- **정본**: 대사의 정본은 `docs/brief/master-bible.md`(마스터 바이블)다. 이 문서는 그 바이블이 실제 게임에 어떻게 들어갔는지 보여 준다.',
  '- **그림**은 장면마다 파일 이름과 무엇이 그려져 있는지를 적었다. 그림에 없는 내용은 대사만으로 전달돼야 한다.',
  '- 특히 봐 주었으면 하는 점은 맨 끝 **§12 검토 요청**에 모았다.', '');

// ───────────────────────── 1. 한 장 요약 ─────────────────────────
p('## 1. 한 장 요약', '',
  '**한 줄**: 킹이 빠진 체스 세트에 잘못 들어간 아홉 번째 폰이 종이 왕관을 쓰고, 흠집 난 동료들을 이끌고 공장을 빠져나가려 한다.', '',
  '**세계**: 태엽으로 움직이는 체스 기물을 찍어 내는 어두운 주물 공장. 공장은 흰 세트와 검은 세트를 맞붙여 **검수**하고, 세 공정을 다 이긴 세트만 **출하**된다. 진 세트는 상자째 **용광로**로 간다. 맨 위 통제실에는 폰을 킹으로 만들어 준다는 **금단의 승급대**가 있다는 소문이 돈다 — 그 대가는 동행 기물 전원을 녹이는 것이다. 사람은 나오지 않는다.', '',
  '**주제**: 「가치의 증명(승급)을 거부하고, 불완전한 모습 그대로 연대하는 용기」. 1~3승천의 폰은 「누군가를 구하려면 내가 더 높은 왕이 되어야 한다」는 세상의 논리를 믿어서 무너진다. 4승천의 폰은 자기 욕망을 인정하고 왕관을 부순다.', '',
  '**구조 — 본편 1~4승천** (한 승천 = 한 번의 출하 = 1막 · 2막 · 3막 · 종막). 승천마다 **새 아홉째 폰**이 주인공이다 — 기억을 잇는 것은 플레이어뿐이다.', '',
  '| 승천 | 주인공 | 맞서는 도금왕 | 끝 |', '|---|---|---|---|',
  ...CHAPTERS.map((c, i) => `| ${c.label} 「${c.name}」 | ${['1대 종이왕 (첫 아홉째 폰)', '2대 종이왕', '3대 종이왕', '4대 종이왕'][i]} | ${['원래의 도금왕', '1승천에서 왕이 된 1대', '2승천에서 왕이 된 2대', '3승천에서 왕이 된 3대'][i]} | ${c.theme} |`), '',
  '- 1~3승천은 **반드시 왕관을 쓴다** (단추는 「돌아본다」 「왕관을 쓴다」뿐). 쓰는 순간 용해 주조가 켜지고, 그는 왕관을 벗지 못한다(지연된 배신). 그 왕이 다음 승천의 도금왕이 되고, 그가 새긴 규정이 다음 승천을 더 어렵게 만든다.',
  '- 4승천에서만 **「왕관을 던진다」**가 열린다 — 왕관을 주조기 톱니에 던져 부수고 하얀 땅으로 걸어 나가면 진엔딩. 4승천에서도 왕관을 쓰면 왕이 된 결말.',
  '- 반장은 쓰러뜨려도 **녹이지 않고 살려 두고 지나간다(불살)**. 살려진 반장은 굴욕 속에서 저주 섞인 예언을 던진다.',
  '- 한 출하에서 지면 그 세트는 녹고, 다른 상자의 새 폰이 같은 승천을 다시 시작한다.', '',
  '**한 출하의 흐름 (대사가 나오는 자리)**:', '',
  '```text',
  '프롤로그(첫 출하만) / 그림자 컷(둘째 출하부터 — 재도전이면 SHD-A, 2~4승천 시작이면 SHD-B)',
  '→ 1막: 첫 대국(부관 튜토리얼) … 대국 · 사건 · 고물상 … 1막 반장(등장 → 전투 중 도발 → 격파 컷 + 속마음 STG-PROG-1)',
  '→ 동료 장면 CO-1 약속',
  '→ 2막 입구 카드 → … → 2막 반장(격파 컷 + STG-PROG-2) → 동료 장면 CO-2 전대의 흔적',
  '→ 3막 입구 카드(안쪽에서 잠긴 문) → … → 3막 반장(격파 컷 + STG-PROG-3) → 동료 장면 CO-3 안쪽에서 잠긴 문',
  '→ 종막 입구 카드 → 마지막 공방(정비공 한마디) → 도금왕(등장 → 1단계 → 2단계 컷 → 격파)',
  '→ 왕위 결정 화면 「금단의 승급대 앞에서」 → [왕이 된 결말 END-K] 또는 (4승천) [진엔딩 END-T] → 크레딧',
  '(어디서든 킹이 쓰러지면 → 패배 컷 END-F)',
  '```', '',
  '반장은 여섯 가운데 출하마다 셋이 막마다 하나씩 나온다. 그래서 반장 대사는 **어느 순서로 만나도** 말이 되어야 한다.', '');

// ───────────────────────── 2. 인물 · 어투 ─────────────────────────
p('## 2. 인물과 어투', '',
  '| 인물 | 누구 | 말투 (고정) | 예 |', '|---|---|---|---|',
  '| **종이왕** (아홉째 폰) | 주인공. 킹 자리에 잘못 들어간 폰. 왕관을 접기 전에는 「아홉째 폰」. 승천마다 다른 폰 | 짧은 반말. 대사 “ ” / 속마음 ‘ ’. 컷신에서는 내면의 고뇌와 비장함이 묻어나는 문어체/구어체 혼용. 속마음은 겉말과 어긋나도 된다 | “흠집 따위 지울 필요 없어.” / ‘아… 이것이 왕의 눈인가.’ |',
  '| **부관 박차** | 주조 흠집 난 흰 나이트. 1승천 프롤로그에서 대장으로 모시겠다 맹세하고, 게임 안내(튜토리얼)를 맡는다. 2승천의 폰은 그의 녹슨 태엽을 발견한다 | PRO-07까지는 무뚝뚝한 반말(–다), 그 뒤로는 군대식 존댓말(–입니다 / –하십시오) | “좋다, 지금부터 넌 내 대장이다.” / “빛나는 기물을 고르십시오.” |',
  '| **흰 퀸 · 흰 룩** | 같은 상자의 정품 기물. 처음엔 폰을 탓한다 | 퀸: 쏘아붙이는 반말 / 룩: 딱딱하고 실무적 | “너 때문에 우리까지 녹게 생겼어.” |',
  '| **분대원** | 싸우며 영입하는 동료. 이름은 상태를 묘사한 별칭(먼지투성이 · 구부러진 못…) | 기물마다 다르다 — 폰: 더듬는 존댓말(–요) / 나이트: 짧은 단정(–다) / 비숍: 하오체 · 기도문 / 룩: 군인 말투(본관 · 귀관 · 규정) / 퀸: 비꼬는 존댓말(흥) | “저, 저도… 따라갈게요!” |',
  '| **반장 여섯** | 막 끝의 보스. 분대를 모두 잃고 간수로 좌천된 「낙오된 정품 킹」. 자기 구역에서 불량 세트를 통과시키면 자신이 폐기된다. 저마다 한 가지 욕망(칠죄종)을 신념으로 삼는다 | 신념을 단정적으로. 살려진 뒤에는 굴욕에 찬 저주 섞인 예언 | “선두에 서려면 뒤처진 자의 손을 놓아야 한다.” |',
  '| **도금왕** | 통제실 왕좌의 주인. 속은 폰인데 겉만 금칠한 가짜 킹이라 공장 밖에 나가면 탄로 나 파쇄된다 — 그래서 출하문을 안쪽에서 잠갔다. 2승천부터는 지난 승천의 종이왕 | 옛 임금 말투(짐 · –노라 · –느니라 · 그대). 용해 주조의 비밀은 말하지 않는다 | “짐도 한때는 그대처럼 종이 왕관을 접어 썼었노라.” |',
  '| **검은 세트의 킹** | 보통 대국의 적 킹. 정품임을 뻐기는 귀공자 | 비아냥대는 반말. 「하.」 「정품」 | “하. 하자품은 용광로로.” |',
  '| **사건 NPC** | 길에서 만나는 떠돌이 기물 · 기계들 | 성격대로 하나씩(§10) | 땜장이 “불이 식는다. 쇠는 기다려 주지 않는다.” |',
  '| **외눈 정비공** | 종막 직전 공방의 정비공 | 툭 던지는 반말 | “출하구 문은 원래 밖으로 열리는 문이야.” |',
  '| **서술자** | 컷신 자막 | 3인칭 과거형, 옛이야기를 읽어 주는 결. 주인공은 「그」 | 그날부터 모두 그를 종이왕이라 불렀다. |',
  '| **시스템** | 규칙 · 경고 · 안내 | 합니다체, 한 줄에 사실 하나 | 킹이 쓰러졌습니다. 출하는 여기서 끝납니다. |', '',
  '**표기 규칙**: 대사 = 이름표 + 큰따옴표 “ ” · 속마음 = 작은따옴표 ‘ ’ · 「 」 = 이름 · 제목 · 새겨진 글(딱지 · 규정) 전용 · 단추 = 동사 하나(–다) · 느낌표는 치명적인 순간에만.', '',
  '**세계 용어**: 태엽(행동력) · 나사(돈) · 출하(한 번의 도전) · 승천(본편 이야기 단위 1~4) · 공정(막) · 검수(대국) · 검문(정예 대국) · 반장(막 보스) · 분대(우리 기물들) · 심장 톱니(목숨) · 원부(쓰러진 기물의 기록) · 금단의 승급대 · 금왕관 · 용해 주조 · 하자품 / 정품.', '');

// ───────────────────────── 3. 프롤로그 ─────────────────────────
const PRO_PIC = [
  '연기에 덮인 공장 전경. 기물 문장이 걸린 건물들, 다리 위에 작은 흰 폰 하나',
  '쇳물이 쏟아지는 주조 라인. 거푸집에서 검은 기물들이 줄줄이 굳어 나온다',
  '공장 집게가 흰 폰 하나를 집어 흰 세트 상자의 킹 자리에 내려놓는다. 붉은 경고등',
  '상자 위에 커다란 붉은 X. 붉은 조명 아래 줄지어 선 흰 세트',
  '상자 안. 작은 폰 하나를 룩 · 퀸 · 비숍 · 나이트가 내려다본다',
  '어둠 속, 종이 왕관을 눌러쓴 폰의 클로즈업',
  '종이 왕관의 폰과 흠집 난 흰 나이트가 나란히 섰다. 뒤로 흰 기물들의 실루엣',
  '저울과 왕좌가 빛나는 출하구 계단 앞. 종이왕의 뒷모습 양옆으로 검은 폰들이 줄지어 섰다',
];
const PRO_TITLE = ['공장', '용광로', '아홉 번째 폰', '딱지', '다툼', '종이 왕관', '부관 박차', '검은 세트와 왕좌'];
p('## 3. 프롤로그 — 첫 출하 시작 (8컷)', '',
  '- **트리거**: 게임을 처음 켜고 화면을 누르면 재생. 끝나면 로고 → 「화면을 눌러 출하」 → 첫 대국.',
  '- ★ 표시 컷만 이어 보는 **짧은 판**도 있다(다시 볼 때). ★ 컷만 읽어도 말이 통해야 한다.', '');
PROLOGUE.forEach((c, i) => cutBlock(`PRO-${String(i + 1).padStart(2, '0')}`, `${PRO_TITLE[i]}${c.key ? ' ★' : ''}`, c, PRO_PIC[i]));
p(`- 끝 화면 글: 「${OPENING_TEXT.tagline}」(표어) · 「${OPENING_TEXT.pressGo}」`, '');

p('### 3-1. 그림자 컷 — 둘째 출하부터 프롤로그 대신', '',
  '- **트리거**: 한 번이라도 출하를 끝낸 뒤 새 출하를 시작할 때. 주인공은 **새 폰**이다(앞 출하의 기억 없음). 같은 승천을 다시 하면 SHD-A, 2~4승천을 처음 시작하면 SHD-B.', '');
cutBlock('SHD-A', '같은 승천 재도전', shadowCut(0, undefined, true), '집게에 들린 흰 폰이 상자들이 흐르는 컨베이어 위에 있다. 높은 통로에서 금빛 왕의 실루엣이 내려다본다');
cutBlock('SHD-B', '2승천 시작', shadowCut(1, ASCENSION[STORY_LAW[0]].law), '`new-law` — 왕관 없는 새 폰이 커다란 황동 규정판(왕관 문양 · 새긴 줄)을 올려다본다. 위쪽 멀리 왕좌', '셋째 줄 「 」 = **앞 승천에서 왕이 된 종이왕이 새긴 규정**(§7-4). 마지막 속마음은 승천마다 다르다(아래).');
rows(['승천', '마지막 속마음'], [2, 3].map((a) => [`SHD-B-4-A${a + 1}`, `${a + 1}승천`, `‘${shadowCut(a, '규정').lines.at(-1)!.t}’`] as [string, string, string]));

// ───────────────────────── 4. 막 입구 · 동료 장면 ─────────────────────────
p('## 4. 막 사이 — 입구 카드와 동료 장면', '',
  '### 4-1. 막 입구 카드', '', '- **트리거**: 다음 막 지도에 들어설 때 막 이름과 함께 뜬다. 서술 한 줄 + 속마음 한 줄 고정.', '');
rows(['언제', '원문 (서술 / 속마음)'], ACT_CARD.map((t, i) => [`ACT-${i + 1}`, ['1막 (※ 지금은 화면에 안 나온다 — 프롤로그 · 그림자 컷 뒤 바로 첫 대국)', '2막에 들어설 때 (`act-2`)', '3막에 들어설 때 (`chained-door` 발주 중 — 그동안 `act-3`)', '종막에 들어설 때 (`act-4`)'][i], t] as [string, string, string]));

p('### 4-2. 동료 장면 (막을 넘긴 뒤 한 번씩)', '',
  '- **트리거**: 막 반장을 쓰러뜨리고 결산을 본 직후.',
  '- **말하는 동료**는 실제로 살아 있는 분대원 한 명이다(가능하면 폰, 1막에서 약속한 그 동료가 살아 있으면 계속 그 동료). 기물 종류마다 같은 뜻의 대사가 있다. 아래 표에는 폰 판을 싣고, 나머지는 변주 표로 붙인다.',
  '- CO-2는 **승천마다 다르다**: 2~4승천은 전대의 흔적 서술이 먼저 나오고, 마지막 속마음이 승천마다 바뀐다.',
  '- 살아남은 동료가 없으면 동료 대사 없이 서술 · 속마음만 나온다.',
  '- **그림**: CO-1 `companion-rest`(상자 칸막이 안, 잠든 동료들 곁에서 등불 아래 깨어 있는 종이왕) · CO-2 `companion-crossroad`(난간에서 출하 레일을 내려다보는 종이왕과 동료의 실루엣 — 2승천은 `old-spring`, 4승천은 `scarred-wall` 발주 중) · CO-3 `chained-door` 발주 중(그동안 `departure-dock`).', '');
const actor = (t: CompanionActor['t']): CompanionActor[] => [{ serial: 'x', name: `(${({ P: '폰', N: '나이트', B: '비숍', R: '룩', Q: '퀸', K: '킹' })[t]} 동료)`, t }];
const companion = (t: CompanionActor['t'], a: number, ch = 0) => companionScene(a, actor(t), undefined, ch).cuts[0].lines;
p('#### CO-1 · 1공정 뒤 — 약속', '');
table('CO-1', companion('P', 0));
rows(['동료 기물', '같은 자리의 대사 (CO-1-2)'], (['N', 'B', 'R', 'Q'] as const).map((t) => [`CO-1-${t}`, ({ N: '나이트', B: '비숍', R: '룩', Q: '퀸' })[t], `“${companion(t, 0).find((l) => l.k === 's' && l.who !== '종이왕')?.t ?? ''}”`] as [string, string, string]));
p('#### CO-2 · 2공정 뒤 — 전대의 흔적과 흔들리는 내면', '');
[0, 1, 2, 3].forEach((ch) => { p(`**${ch + 1}승천**`, ''); table(`CO-2-A${ch + 1}`, companion('P', 1, ch)); });
rows(['동료 기물', '같은 자리의 대사 (CO-2-2) ※ 바이블은 폰 판만 — 나머지는 개발 측이 말투만 옮긴 변주, 검토 필요'], (['N', 'B', 'R', 'Q'] as const).map((t) => [`CO-2-${t}`, ({ N: '나이트', B: '비숍', R: '룩', Q: '퀸' })[t], `“${companion(t, 1).find((l) => l.k === 's' && l.who !== '종이왕')?.t ?? ''}”`] as [string, string, string]));
p('#### CO-3 · 3공정 뒤 — 안쪽에서 잠긴 문 (ACT-3 회수)', '', '- ※ 바이블은 폰 판 하나 — 지금은 어느 기물이 말해도 같은 대사(폰의 존댓말)다.', '');
table('CO-3', companion('P', 2));
p('동료가 아무도 없을 때:', '');
[0, 1, 2].forEach((a) => table(`CO-${a + 1}-없음`, companionScene(a, []).cuts[0].lines));

// ───────────────────────── 5. 반장 ─────────────────────────
p('## 5. 반장 여섯 — 등장 · 전투 중 · 격파', '',
  '반장마다 **한 가지 욕망**으로 종이왕을 유혹한다. 종이왕은 말로는 거절하지만 속으로는 끌린다 — 이 끌림이 쌓여 종막의 왕위 결정으로 이어진다.', '',
  '반장 하나의 글이 쓰이는 자리 (아래 표의 「자리」 열):', '',
  '1. **등장 띠** — 반장 대국이 시작될 때 반장 그림 위에 서술 한 줄 + 반장 대사 한 줄.',
  '2. **전투 중 도발** — 상황마다 한 줄씩 말풍선(반장은 한 판에 셋까지, 확률로). 고유 규칙이 발동할 때 / 우리가 한 번에 둘 이상 처치했을 때 / 우리 분대원이 쓰러졌을 때 / 반장 HP가 30% 아래일 때. 「첫 만남」 줄은 데이터만 있고 **지금은 화면에 나오지 않는다**(※ 미사용).',
  `3. **2단계** — 반장은 두 번 쓰러뜨려야 한다(시스템: 「${BOSS_PHASE_TEXT.start}」). 다시 일어서는 순간 반장이 한 마디 한다(D-474 — 격노 띠 뒤 말풍선).`,
  '4. **격파 컷 (불살)** — 「반장 격파」 띠 뒤, 쓰러지는 그림 위에: 쓰러짐 · 살려 두고 지나감(서술 두 문장) → 살려진 반장의 저주 섞인 예언 → 종이왕의 대답 → 종이왕의 속마음(§5-7 STG-PROG — 몇 번째 반장인가 × 몇 승천인가).',
  '5. **도금왕의 들먹임** — 그 출하에서 **마지막으로 쓰러뜨린 반장**을 종막에서 도금왕이 한 줄로 들먹인다(§6-3).',
  '6. **왕이 된 뒤 닮아 감** — 왕이 된 결말에서 새 왕이 그 반장처럼 군다는 서술 한 줄(§7-3).', '');
/** 도발 상황 — meet(첫 만남)는 데이터만 있고 지금 화면에서 부르는 곳이 없다 */
const CUE: [keyof (typeof BOSS_TAUNTS)['plate'], string, string][] = [['sig', '고유 규칙 발동', '규칙'], ['cheese', '우리가 한 번에 둘 이상 처치', '연속처치'], ['gloat', '우리 분대원이 쓰러짐', '동료쓰러짐'], ['beg', '적 킹 HP 30% 아래', '위기'], ['meet', '첫 만남 ※ 미사용', '만남']];
BOSS_ORDER.forEach((id, k) => {
  const b = BOSS_STORY[id];
  const P = `BOS-${k + 1}`;
  p(`### ${P} · ${b.name} — ${BOSS_SINS[id]}`, '',
    `- **별칭**: ${BOSS_EPITHET[id]} · **전투 규칙**: ${BOSS_RULE(id)}`,
    `- **그림**: 등장 \`boss-${id === 'inspect' ? 'inspector' : id === 'spawn' ? 'assembly' : id}.png\` · 격파 \`boss-fall-${id}.png\``, '');
  rows(['자리', '원문'], [
    [`${P}-등장-1`, '등장 띠 · 서술', b.intro],
    [`${P}-등장-2`, `등장 띠 · ${b.name}`, `“${b.say}”`],
    ...CUE.flatMap(([cue, label, ko]) => BOSS_TAUNTS[id][cue].map((t, i) => [`${P}-도발-${ko}-${i + 1}`, `전투 중 · ${label}`, t] as [string, string, string])),
    [`${P}-2단계`, `2단계로 일어서며 · ${b.name}`, `“${b.phase2}”`],
    ...b.fall.split('\n').map((t, i) => [`${P}-격파-${i + 1}`, '격파 컷 · 서술', t] as [string, string, string]),
    [`${P}-격파-유혹`, `격파 컷 · ${b.name} (살려진 뒤의 예언)`, `“${b.temptation}”`],
    [`${P}-격파-대답`, '격파 컷 · 종이왕', `“${b.reply}”`],
    [`${P}-들먹임`, '종막 2단계 컷 · 도금왕', `“${b.mock}”`],
    [`${P}-닮음`, '왕이 된 결말 · 서술', b.mirror],
  ]);
});

p('### 5-7. STG-PROG · 반장 격파 직후 종이왕의 속마음', '', '- 격파 컷의 마지막 줄. 그 출하에서 몇 번째로 쓰러뜨린 반장인가 × 몇 승천인가로 고른다.', '');
rows(['조건', '속마음'], [
  ['STG-PROG-1', '1번째 반장 뒤 (공통)', `‘${STG_PROG.first}’`],
  ...STG_PROG.second.map((t, i) => [`STG-PROG-2-A${i + 1}`, `2번째 반장 뒤 · ${i + 1}승천`, `‘${t}’`] as [string, string, string]),
  ...STG_PROG.third.map((t, i) => [`STG-PROG-3-A${i + 1}`, `3번째 반장 뒤 · ${i + 1}승천`, `‘${t}’`] as [string, string, string]),
]);

// ───────────────────────── 6. 종막 ─────────────────────────
p('## 6. 종막 — 도금왕', '',
  `- **도금왕**: ${BOSS_SINS.gilded}. 별칭 「${BOSS_EPITHET.gilded}」. 전투 규칙: ${BOSS_RULE('gilded')}.`,
  '- 1승천의 도금왕은 원래 왕. 2~4승천의 도금왕은 **앞 승천에서 왕이 된 종이왕**이다. 도금왕은 용해 주조의 비밀을 스포일러하지 않고 비웃음만 남긴다.',
  '- **그림**: `boss-gilded.png`(1승천) · `boss-gilded-1~3.png`(2~4승천) · 격파 뒤 `gilded-fallen.png`.', '',
  '### 6-1. 마지막 공방 (종막 대국 직전)', '');
rows(['자리', '원문'], GILDED_STORY.forge.map((l, i) => [`GLD-공방-${i + 1}`, `공방 화면 토스트 · ${l.who}`, `“${l.t}”`] as [string, string, string]));
p('### 6-2. 등장 · 전투 중', '');
rows(['자리', '원문'], [
  ['GLD-등장-1', '등장 띠 · 서술 (1승천)', (BOSS_CARD.gilded[0] as Line).t],
  ['GLD-등장-2', '등장 띠 · 도금왕 (1승천)', `“${(BOSS_CARD.gilded[1] as Line).t}”`],
  ['GLD-등장-3', '등장 띠 · 서술 (2~4승천)', (BOSS_CARD['gilded+'][0] as Line).t],
  ['GLD-등장-4', '등장 띠 · 도금왕 (2~4승천)', `“${(BOSS_CARD['gilded+'][1] as Line).t}”`],
  ['GLD-지도', '지도에서 종막 노드를 누르면', '등장 띠와 같은 서술 · 대사'],
  ...CUE.flatMap(([cue, label, ko]) => BOSS_TAUNTS.gilded[cue].map((t, i) => [`GLD-도발-${ko}-${i + 1}`, `전투 중 · ${label}`, t] as [string, string, string])),
]);
p('### 6-3. 2단계 컷 (도금왕이 한 번 쓰러진 뒤 다시 일어서며)', '',
  '- 네 줄이 이어서 나온다. 셋째 줄은 **그 출하에서 마지막으로 쓰러뜨린 반장**에 따라 바뀐다(아래는 철갑 반장일 때. 나머지는 §5의 「들먹임」 줄).', '');
table('GLD-2단계', [...GILDED_STORY.phase2(0).split('\n'), BOSS_STORY.plate.mock, GILDED_STORY.phase2End].map((t) => ({ k: 's' as const, who: '도금왕', t })));

// ───────────────────────── 7. 왕위 결정 · 결말 ─────────────────────────
p('## 7. 왕위 결정과 결말', '',
  `### 7-1. 왕위 결정 화면 「${THRONE_TEXT.title}」`, '',
  '- **트리거**: 도금왕을 쓰러뜨린 직후. 왼쪽에 쓰러진 도금왕과 열린 거푸집 그림(`gilded-fallen.png`), 오른쪽에 도금왕의 말 → 종이왕의 속마음 → 단추 둘.',
  `- 1~3승천: 단추 **[${THRONE_TEXT.look}] [${THRONE_TEXT.crown}]**. 「${THRONE_TEXT.look}」는 동료를 한 번 돌아볼 뿐이고(아래 「돌아봄」 줄), 결국 「${THRONE_TEXT.crown}」를 눌러야 한다.`,
  `- 4승천: 단추 **[${THRONE_TEXT.crown}] [${THRONE_TEXT.throw}]** — 진짜 선택.`, '');
rows(['자리', '원문'], [
  ...TESTIMONY.flatMap((t, i) => [
    [`THR-${i + 1}-도금왕`, `${CHAPTERS[i].label} · 쓰러진 도금왕`, `“${t.say}”`],
    [`THR-${i + 1}-속마음`, `${CHAPTERS[i].label} · 종이왕(속마음)`, `‘${t.mono}’`],
  ] as [string, string, string][]),
  ['THR-안내-1', '1~3승천 · 단추 위 한 줄', THRONE_TEXT.prompt],
  ['THR-안내-2', '4승천 · 단추 위 한 줄', THRONE_TEXT.promptFinal],
  ['THR-돌아봄-1', `「${THRONE_TEXT.look}」 (동료가 살아 있을 때)`, THRONE_TEXT.lookAt('(동료 이름)이')],
  ['THR-돌아봄-2', `「${THRONE_TEXT.look}」 (약속한 동료가 쓰러졌을 때)`, THRONE_TEXT.lookLost('(동료 이름)')],
  ['THR-돌아봄-3', `「${THRONE_TEXT.look}」 (동료가 아무도 없을 때)`, THRONE_TEXT.lookNone],
]);
cutBlock('THR-돌아봄-컷', '「돌아본다」 짧은 컷 (D-503)', lookBackCut({ companionWithJosa: '박차가' }), '`promote-crew` — 계단 아래에서 위의 승급대를 올려다보는 흰 기물들(흠집 난 나이트 · 폰). 위 승급대에서 아래 동료들로 카메라가 내려온다', '컷이 글을 끝까지 읽힌 뒤 결정 화면으로 돌아온다. 돌아온 화면엔 위 THR-돌아봄 줄이 다 찍힌 채 남고 [돌아봤다]는 잠긴다.');
cutBlock('BOS-격파-예', '반장 격파 컷 비트 (철갑 반장 · 둘째 반장 · 2승천 예)', bossFallCut('plate', 'boss-fall-plate', 2, 1), '`boss-fall-plate` — 갈라져 떨어지는 철판 속 웅크린 작은 폰', '여섯 반장 모두 같은 비트: 넓게(흔들림) → 살려 두고 지나감 → 반장 가까이(명패 · 위협음) → 종이왕 → 속마음.');

p('### 7-2. 왕이 된 결말 END-K — 왕관을 쓴 직후의 깨달음과 지연된 배신 (1~3승천은 늘, 4승천은 「왕관을 쓴다」)', '',
  '- 4컷. 소리치는 동료는 부관 박차가 살아 있으면 박차, 아니면 약속한 동료 · 살아 있는 첫 동료. 동료가 아무도 없으면 동료 대사가 빠진다.',
  '- 셋째 컷 속마음은 승천마다 다르다(4승천에서 왕관을 쓰면 3승천 판). 넷째 컷 끝에 **이번에 새기는 규정**(§7-4)과 **마지막으로 쓰러뜨린 반장을 닮아 가는 한 줄**(§5 「닮음」)이 붙는다.', '');
const PR_PIC = ['`crown-dais` 발주 중 — 승급대 위에서 금왕관을 머리에 얹는 순간, 금빛 시야가 공장 전체로 열린다 (그동안 `promote-gild`: 어둠 속 받침대 위 금빛 왕의 몸)', '`casting-floor` 발주 중 — 통제실 바닥이 갈라져 쇳물과 쇠사슬이 동료들을 끌어내리고, 단상 위 금왕관의 폰이 내려다본다 (그동안 `gilded-fallen`)', '`gold-cast` 발주 중 — 황금 쇳물이 아래에서부터 폰을 감싸 킹으로 굳는다 (그동안 `promote-gild`)', '붉은 등 아래 커다란 규정판에 글을 새기는 금빛 왕. 발치에 버려진 종이 왕관'];
PR_PIC.push('`ending-a` — 금빛 왕이 커다란 규정판 앞에 섰다(빌림 — ED-05 대기)', '끝 정적');
const PR_TITLE = ['왕관을 쓰다', '용해 주조', '금빛으로 굳다', '문을 잠그다', '규정을 새기다', '다음 폰'];
promotionCuts(0, '', ASCENSION[STORY_LAW[0]].law, BOSS_STORY.plate.mirror, { alive: [{ name: '박차', t: 'N' }] }).forEach((c, i) => cutBlock(`END-K-${i + 1}`, PR_TITLE[i], c, PR_PIC[i], i === 2 ? '속마음은 1승천 판. 아래 변주.' : i === 3 ? '「 」 = 1승천에서 새기는 규정. 마지막 줄 = 철갑 반장일 때.' : ''));
p('**변주**', '');
rows(['자리', '원문'], [1, 2].map((ch) => [`END-K-3-2-A${ch + 1}`, `셋째 컷 속마음 · ${ch + 1}승천`, `‘${promotionCuts(ch, '', '', '')[2].lines.find((l) => l.k === 'm')!.t}’`] as [string, string, string]));

p('### 7-3. 진엔딩 END-T — 왕관 파괴와 백지로의 해방 (4승천 「왕관을 던진다」)', '', '- 4컷. 동료 대사는 END-K와 같은 규칙(박차 → 약속한 동료 → 첫 동료). 동료가 없으면 동료 대사가 빠진다.', '');
const TE_PIC = ['`gilded-fallen` — 쓰러진 도금왕(금박이 벗겨져 흰 폰이 드러남)과 쇳물빛이 새는 열린 거푸집, 왼쪽 아래에 종이왕', '`crown-gears` 발주 중 — 주조기 톱니 사이에 쐐기처럼 박혀 찌그러진 금왕관 (그동안 `gilded-fallen`)', '`white-land` 발주 중 — 뜯겨 열린 비상 출하문 너머 칸 없는 하얀 땅, 문턱의 작은 흰 기물들 (그동안 `departure-decision`: 출하구 문턱의 종이왕)', '같은 그림'];
TE_PIC.push('끝 정적');
const TE_TITLE = ['원했다, 그러니 끝낸다', '톱니에 박힌 왕관', '하얀 땅', '첫걸음', '첫 수'];
trueEndingCuts([], { alive: [{ name: '박차', t: 'N' }] }).forEach((c, i) => cutBlock(`END-T-${i + 1}`, TE_TITLE[i], c, TE_PIC[i], i === 4 ? '바이블의 END-T-크레딧 줄 — 백지 위 끝 정적.' : ''));
p(`- 크레딧 끝 한 줄: 「${CREDIT_TEXT.record}」`, '');

p('### 7-4. 새기는 규정 LAW-1~4', '', '- 왕이 된 폰이 검수대에 새기는 글. 다음 승천의 그림자 컷(SHD-B)에 그대로 나온다. 전투 난이도는 승천 번호를 따른다(규정 글은 이야기 · 실제 효과는 아래 「난이도」).', '');
rows(['언제', '새긴 글 「 」'], STORY_LAW.map((k, i) => [`LAW-${i + 1}`, `${i + 1}승천에서 왕관을 쓰면`, `「${ASCENSION[k].law}」`] as [string, string, string]));
p('**난이도 조항 전체** (본편 1~4승천 = 0~3번, 그 뒤는 선택 도전):', '');
rows(['이름', '새긴 글 → 실제 효과'], ASCENSION.map((a, i) => [`ASC-${i}`, `${a.name}${i < 4 ? ` (${i + 1}승천 전투)` : ` (도전 ${i - 3})`}`, `「${a.law}」 → ${a.desc}`] as [string, string, string]));

p('### 7-5. 패배 END-F', '', '- **트리거**: 우리 킹(종이왕)이 쓰러지고 되감기도 없을 때. 이 컷 뒤 결과 화면.', '');
const DF_PIC = ['붉은 쇳물이 흐르는 용광로 입구. 그 앞에 쓰러진 흰 폰과 구겨진 종이 왕관', '`prologue-01` 빌림 — 쇳물을 붓는 거푸집 줄과 검은 기물들 (ED-10 대기)', '끝 정적'];
DEFEAT_CUTS.forEach((c, i) => cutBlock(`END-F-${i + 1}`, ['굴러떨어진 왕관', '상자째 용광로로', '풀리는 태엽'][i], c, DF_PIC[i]));
rows(['자리', '원문'], [
  ['END-F-창-1', '패배 창 「하자 폐기」 · 시스템', '킹이 쓰러졌습니다. 출하는 여기서 끝납니다.'],
  ['END-F-창-2', '패배 창 · 속마음 (적 킹을 거의 잡았을 때)', '‘적 킹 HP (n). 한 수였어.’'],
]);

// ───────────────────────── 8. 전투 중 ─────────────────────────
p('## 8. 전투 중에 나오는 말', '', '### 8-1. 검은 세트의 킹 (보통 대국의 적 킹) — 도발', '', '- 정품임을 뻐기는 냉소적인 귀공자. 대국마다 많아야 한 줄.', '');
rows(['상황', '원문'], CUE.flatMap(([cue, label, ko]) => TAUNTS[cue].map((t, i) => [`KNG-${ko}-${i + 1}`, cue === 'sig' ? '반장 규칙 발동용 — 보통 적 킹은 ※ 미사용' : label, t] as [string, string, string])));

p('### 8-2. 분대원 — 합류할 때 · 쓰러질 때 (말풍선, 20자 안팎)', '');
const KO = { P: '폰 — 겁 많고 순박. 더듬는 존댓말(–요)', N: '나이트 — 말수 적은 고참. 짧은 단정(–다)', B: '비숍 — 늙은 사제. 하오체 · 기도문', R: '룩 — 고지식한 문지기 군인. 본관 · 귀관 · 규정', Q: '퀸 — 콧대 높은 귀부인. 비꼬는 존댓말, 「흥」' } as const;
(Object.keys(CREW_VOICE) as (keyof typeof CREW_VOICE)[]).forEach((t) => {
  p(`**${KO[t]}**`, '');
  rows(['언제', '원문'], [...CREW_VOICE[t].join.map((x, i) => [`CRW-${t}-합류-${i + 1}`, '합류', x] as [string, string, string]), ...CREW_VOICE[t].fall.map((x, i) => [`CRW-${t}-쓰러짐-${i + 1}`, '쓰러짐', x] as [string, string, string])]);
});
p('### 8-3. 쓰러짐 서술 (분대원이 폐기될 때 — 2인칭 서술 + 아래 대사)', '');
rows(['서술 (2인칭)', '아래 대사'], DEATHS.map((d, i) => [`DTH-${i + 1}`, d.narr, d.line] as [string, string, string]));
p('### 8-4. 심장 톱니 · 되감기 (목숨과 시간 되돌리기)', '');
rows(['자리', '원문'], [
  ['LIF-1', '분대원이 쓰러졌지만 심장 톱니로 버팀 · 서술', LIFE_TEXT.riteNarr],
  ['LIF-2', '같은 자리 · 시스템', LIFE_TEXT.riteSys],
  ['REW-1', '턴 되감기 · 서술', HUD_TEXT.rewindScene.narr],
  ['REW-2', '턴 되감기 · 단추', `${HUD_TEXT.rewindScene.yes} / ${HUD_TEXT.rewindScene.no}`],
  ['REW-3', '킹이 쓰러지는 순간(패배 직전) · 서술', HUD_TEXT.lossRewind.narr],
  ['REW-4', '같은 장면 · 종이왕', HUD_TEXT.lossRewind.line],
  ['REW-5', '같은 장면 · 시스템', HUD_TEXT.lossRewind.sys(1)],
  ['REW-6', '같은 장면 · 단추', `${HUD_TEXT.lossRewind.yes} / ${HUD_TEXT.lossRewind.no}`],
  ['REW-7', '되감은 뒤 · 서술 (2인칭)', HUD_TEXT.lossRewind.wake],
]);
p('### 8-5. 분대원 이름 · 기벽 (참고 — 이름이 곧 인물 묘사)', '',
  `- **이름 풀**: ${NAMES.join(' · ')}`,
  `- **기벽**: ${Object.values(QUIRKS).map((q) => `${q.name}(${q.desc})`).join(' · ')}`, '');

// ───────────────────────── 9. 부관 안내 ─────────────────────────
p('## 9. 부관 박차의 안내 (튜토리얼)', '', '- 화자 = 부관 박차. 대장(종이왕)에게 군대식 존댓말. 이름표가 붙은 말풍선이라 따옴표 없이 나온다.', '', '### 9-1. 첫 대국 — 판 아래 안내 띠 (따라 하기가 끝났거나 건너뛴 뒤, 첫 대국을 이길 때까지 상황에 따라 한 줄씩)', '');
const COACH_WHEN: Record<string, string> = { card: '1턴, 카드를 고르기 전', cardAgain: '3턴부터, 카드를 고르기 전', intent: '2턴, 카드를 고르기 전', piece: '카드를 고른 뒤', square: '기물을 고른 뒤', end: '낼 카드가 없을 때', chain: '1턴에 첫 처치를 한 뒤', graze: '내 기물이 붉은 칸 위에 있을 때' };
rows(['언제', '원문'], Object.entries(COACH_LINES).map(([k, v]) => [`COA-${k}`, COACH_WHEN[k] ?? k, v] as [string, string, string]));
const dump = (prefix: string, o: Record<string, unknown>): [string, string, string][] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[`${prefix}-${k}`, k, v] as [string, string, string]] : typeof v === 'function' ? [[`${prefix}-${k}`, k, String((v as (...a: string[]) => string)('(이름)', '(이름)'))] as [string, string, string]] : []));
p('### 9-2. 입문 시험대 셋 (D-502 — 프롤로그 직후 처음 한 번 · 부관이 판의 한 곳씩 짚는다 · 한 걸음 = 한 줄)', '');
rows(['단계(내부 이름)', '원문'], [...dump('TUT-시험대A', TUT.drillA as Record<string, unknown>), ...dump('TUT-시험대B', TUT.drillB as Record<string, unknown>), ...dump('TUT-시험대C', TUT.drillC as Record<string, unknown>)]);
p('### 9-3. 그 밖의 안내 (처음 한 번씩)', '');
rows(['언제', '원문'], [
  ...dump('TUT-지도', TUT.map as Record<string, unknown>).map(([id, , t]) => [id, '첫 지도', t] as [string, string, string]),
  ...dump('TUT-반장', TUT.boss as Record<string, unknown>).map(([id, k, t]) => [id, `반장 첫 만남 (${k})`, t] as [string, string, string]),
  ...(['recruit', 'promote', 'promoteTut', 'kit'] as const).filter((k) => typeof (TUT as Record<string, unknown>)[k] === 'string').map((k) => [`TUT-${k}`, ({ recruit: '첫 영입', promote: '첫 승격', promoteTut: '승격 설명', kit: '핵심 부품 고르기' })[k], (TUT as unknown as Record<string, string>)[k]] as [string, string, string]),
]);
p('### 9-4. 안내서 (도움말 책 — 시스템 어투 세 줄 + 팁 한 줄)', '');
rows(['쪽', '원문 (줄 / 줄 / 줄 — 팁)'], GUIDE_PAGES.map((g, i) => [`GDE-${i + 1}`, g.title, `${g.lines.join(' / ')}${g.tip ? ` — 팁: “${g.tip}”` : ''}`] as [string, string, string]));

// ───────────────────────── 10. 사건 ─────────────────────────
p('## 10. 사건 (길에서 만나는 장면)', '',
  `- 지도에서 「사건」 칸에 들어가면 그림 한 장 + 서술 + 선택지가 나온다. 모두 ${Object.keys(SLICE_EVENTS).length}종이며 본편 줄거리와 **독립된 짧은 장면**이다 (공장의 다른 주민들).`,
  '- 서술은 **2인칭 현재형**(「당신은…」) — 컷신(3인칭 과거형)과 일부러 다르다.',
  '- 한 사건의 글: ① 소개 서술(+NPC 첫마디) ② 선택지(이름 + 결과 요약) ③ 선택지를 눌렀을 때 NPC 반응 ④ 망설일 때 한마디 ⑤ 결과 장면(서술 + NPC 대사) ⑥ 거절했을 때 ⑦ 나가기 단추.', '');
Object.entries(SLICE_EVENTS).forEach(([id, e], k) => {
  const talk = EVENT_TALK[id];
  const oc = EVENT_OUTCOME[id] ?? {};
  const P = `EVT-${String(k + 1).padStart(2, '0')}`;
  p(`### ${P} · ${e.title}${talk ? ` — NPC: ${talk.npc}` : ''}`, '', `- **그림**: \`${id}.png\``, '');
  const items: [string, string, string][] = [[`${P}-소개`, '소개 서술', e.text]];
  if (talk?.hi) items.push([`${P}-첫마디`, 'NPC 첫마디', talk.hi]);
  e.choices.forEach((c, i) => {
    items.push([`${P}-선택${i + 1}`, `선택지 ${i + 1}`, `[${c.label}]${c.desc ? ` — ${c.desc}` : ''}${c.info ? ` (세부: ${c.info})` : ''}`]);
    if (talk?.react[i]) items.push([`${P}-반응${i + 1}`, `선택지 ${i + 1}번을 눌렀을 때 NPC`, talk.react[i]]);
    Object.entries(oc).filter(([key]) => key.startsWith(`${i}:`)).forEach(([key, o]) => items.push([`${P}-결과${i + 1}-${Number(key.split(':')[1]) + 1}`, `선택지 ${i + 1}의 결과 장면${Object.keys(oc).filter((x) => x.startsWith(`${i}:`)).length > 1 ? ` (${['좋은 쪽', '나쁜 쪽', '셋째'][Number(key.split(':')[1])] ?? ''})` : ''}`, `${o.scene}${o.line ? ` ${o.who ? `${o.who} ` : ''}${o.line}` : ''}`]));
  });
  talk?.idle.forEach((t, i) => items.push([`${P}-망설임${i + 1}`, '오래 망설일 때 NPC', t]));
  if (talk) {
    items.push([`${P}-승`, '미니게임 · 확률 성공 한마디', talk.win]);
    if (talk.lose) items.push([`${P}-패`, '실패 한마디', talk.lose]);
    items.push([`${P}-거절`, '거절했을 때 NPC', talk.bye], [`${P}-나가기`, '나가기 단추', `[${talk.exit}]`]);
    if (talk.tap) items.push([`${P}-손짓`, '미니게임 손짓 글', talk.tap]);
  }
  rows(['자리', '원문'], items);
});
p('- 거절 공통 결과: 「당신은 말없이 발걸음을 돌린다.」', '');

// ───────────────────────── 11. 그림 목록 ─────────────────────────
p('## 11. 장면 그림 목록', '',
  '| 장면 | 파일 | 상태 |', '|---|---|---|',
  '| 프롤로그 8컷 | `prologue-00` ~ `prologue-07` | 있음 |',
  '| 그림자 컷 | `prologue-shadow`(재도전) · `new-law`(2~4승천 시작) | 있음 |',
  '| 막 입구 | `act-2` · `chained-door`(3막) · `act-4` | 3막 **발주 중**(S-13) — 그동안 `act-3` |',
  '| 반장 등장 6 + 도금왕 4 | `boss-*` | 있음 |',
  '| 반장 격파 6 | `boss-fall-*` | 있음 |',
  '| 동료 장면 CO-1 · CO-2 · CO-3 | `companion-rest` · `companion-crossroad`(2승천 `old-spring` · 4승천 `scarred-wall`) · `chained-door` | CO-2 변주 · CO-3 **발주 중**(S-13 · S-14 · S-15) |',
  '| 왕위 결정 | `gilded-fallen` | 있음 |',
  '| 왕이 된 결말 4컷 | `crown-dais` · `casting-floor` · `gold-cast` · `promote-rule` | 앞 셋 **발주 중**(S-16 · S-17 · S-18) |',
  '| 진엔딩 4컷 | `gilded-fallen` · `crown-gears` · `white-land` | 뒤 둘 **발주 중**(S-19 · S-20) |',
  '| 패배 | `end-fail` | 있음 |',
  `| 사건 ${Object.keys(SLICE_EVENTS).length}종 | 사건마다 한 장 | 있음 |`, '',
  '발주 프롬프트 전문: `docs/asset-order-master.md` §0-B. 받기 전에는 괄호 안 대체 그림이 자동으로 쓰인다.', '');
p('### 11-1. 지금 화면에 나오지 않는 글 (데이터에만 있다 — 살릴지 지울지 판단 필요)', '');
rows(['무엇', '원문'], [
  ['UNU-1', '1막 입구 카드 (프롤로그가 대신한다)', ACT_CARD[0]],
  ['UNU-2', '도금왕의 마지막 말', `“${GILDED_STORY.last}” / 종이왕 ‘${GILDED_STORY.lastMono}’`],
  ['UNU-3', '왕관을 벗지 않는다 (옛 컷)', GILDED_STORY.crownOff],
  ['UNU-4', '반장 · 도금왕 · 적 킹의 「첫 만남」 도발', '§5 · §6 · §8의 ※ 미사용 줄'],
]);

// ───────────────────────── 12. 검토 요청 ─────────────────────────
p('## 12. 검토 요청 — 특히 봐 주었으면 하는 곳', '',
  '1. **긴 컷신 대사의 호흡**: 자막 띠가 문장 단위로 쪽을 넘긴다. 한 쪽에 한 문장씩 끊겨 읽혀도 리듬이 사는가.',
  '2. **개발 측이 채운 빈칸** — 바이블에 없어서 개발 측이 임시로 넣은 줄: CO-2-2의 나이트 · 비숍 · 룩 · 퀸 변주(바이블은 폰 판만), CO-3 동료 대사의 기물별 변주 없음, 4승천에서 왕관을 썼을 때의 END-K-3-2 속마음(지금은 3승천 판), 동료 없이 끝난 출하의 CO-1 서술.',
  '3. **사건 글 길이 조정**: 사건 창이 가장 작은 화면(667×375)에서 두 줄을 넘지 않게 바이블의 사건 줄 16개를 줄였다 — 개발 측 보고 목록을 확인하고 더 나은 줄이 있으면 고쳐 달라.',
  '4. **ACT-1**: 바이블의 1막 입구 카드는 지금 화면에 나오지 않는다(프롤로그 · 그림자 컷 뒤 바로 첫 대국). 넣을지.',
  '5. **※ 미사용 줄**: 반장 · 도금왕 · 적 킹의 「첫 만남」 도발, 도금왕의 마지막 말. 살릴지 지울지.',
  '6. **반장 격파 컷의 「검을 거두어 / 칼을 거둔 채」**: 기물은 팔이 없고 무기도 없다 — 세계관과 맞는 표현인지.',
  '',
  '수정본은 「ID → 고친 문장」 목록이나 바이블을 직접 고친 파일로 주면 된다.', '');

const file = resolve(__dirname, '../docs/storyboard.md');
writeFileSync(file, `${out.join('\n')}\n`);
console.log(`${file} — ${out.length}줄`);
