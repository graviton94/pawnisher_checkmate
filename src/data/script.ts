/** D-425 실행 각본: 새 폰 세 명의 본편. 전생·겹·공장 정지·정품 구원은 사용하지 않는다. */
import type { StandIn } from './opening';
export interface Line { k: 'n' | 's' | 'm'; t: string; who?: string }
export interface Cut {
  alt?: string; img: string; bg: [string, string]; glow?: string; art: StandIn[];
  fx?: 'alarm' | 'red' | 'spot' | 'path' | 'gold';
  cam?: 'pan-l' | 'pan-r' | 'tilt-u' | 'tilt-d' | 'in' | 'out' | 'still';
  at?: string; lines: Line[]; key?: boolean;
  /** 인물 생사를 고정해 그린 옛 컷 대신 실제 출하의 배우만 보여 준다. */
  standIn?: boolean;
  /** 빈 배경에서만 실제 생존 기물을 겹친다. 인물이 있는 완성 원화에는 쓰지 않는다. */
  showActors?: boolean;
  /** 정지 장면 그림을 비율·기기 픽셀 정수배로 덮는다. */
  pixelCover?: boolean;
  /** 하단의 핵심 행동을 가리지 않도록 해당 컷만 대사창을 상단에 둔다. */
  caption?: 'top' | 'bottom';
}
const n = (t: string): Line => ({ k: 'n', t });
const s = (who: string, t: string): Line => ({ k: 's', who, t });
const m = (t: string): Line => ({ k: 'm', t });
const pawn = (x = 48, y = 56, h = 30): StandIn => ({ t: 'K', side: 0, x, y, h });
const cut = (img: string, lines: Line[], art: StandIn[] = [pawn()], standIn = false): Cut => ({ img, bg: ['#16141c', '#0b0b0e'], art, lines, standIn });
const sceneCut = (img: string, lines: Line[], art: StandIn[] = []): Cut => ({ ...cut(img, lines, art), pixelCover: true, showActors: art.length > 0, cam: 'still' });
const homeCut = (lines: Line[]): Cut => ({ ...cut('epilogue-hands', lines), cam: 'still', pixelCover: true });
export const CUT_TEXT_BUDGET = { line: 30 };
export const oneLine = (t: string): string => t.replace(/\n/g, ' ');

export const PROLOGUE: Cut[] = [
  // 1.1.1 테스터 「스토리 흐름이 부자연스럽다」: 왕관을 접기 전엔 「아홉째 폰」, 접은 뒤에야 「종이왕」. 말마다 앞 말에 답한다.
  { ...cut('prologue-00', [n('공장은 흰 세트와 검은 세트를 맞붙였다.'), n('공정을 모두 이긴 세트만 출하된다.')]), key: true },
  { ...cut('prologue-01', [n('진 세트는 상자째 용광로로 갔다.'), n('그 자리엔 곧 다음 세트가 놓였다.')]), key: true },
  cut('prologue-02', [n('그날 한 상자에는 킹이 없었다.'), n('킹 자리에 아홉 번째 폰이 들어 있었다.'), m('내가 들어올 자리가 아니었어.')]),
  { ...cut('prologue-03', [n('뚜껑에 붉은 딱지가 찍혔다.'), n('「킹 누락. 검수 대기」'), n('출하구까지 이기면 딱지가 지워진다.'), n('한 판이라도 지면 상자째 녹는다.')]), key: true },
  cut('prologue-04', [s('흰 퀸', '킹도 없이 어떻게 이겨?'), s('흰 퀸', '너 때문에 우리까지 녹게 생겼어.'), s('아홉째 폰', '알아. 잘못 들어온 건 나야.'), s('흰 룩', '그래도 판은 시작돼. 누가 지휘하지?')]),
  { ...cut('prologue-05', [n('폰은 상자 귀퉁이를 찢어 왕관을 접었다.'), s('아홉째 폰', '킹 자리가 비었으면 내가 채울게.'), s('아홉째 폰', '같이 나가자. 맨 앞은 내가 설게.'), n('그날부터 모두 그를 종이왕이라 불렀다.')]), key: true },
  cut('prologue-06', [n('주조 흠집이 난 나이트, 박차가 곁에 섰다.'), s('박차', '흠집 난 나도 데려갈 거야?'), s('박차', '이겨도 흠집은 안 없어지는데.'), s('종이왕', '없앨 필요 없어. 그대로 나가자.')]),
  { ...cut('prologue-07', [n('맞은편의 검은 세트도 녹지 않으려고 섰다.'), m('미안해. 우선 이 판을 넘는다.')]), key: true },
];
/** 다음 장의 폰은 새 인물이다. 앞 장의 기억이 아니라 남겨진 검수 규정을 만난다. */
export const shadowCut = (chapter: number, law?: string): Cut => cut('prologue-shadow', chapter === 0
  ? [n('다른 상자에서 또 한 폰이 일어섰다.'), n('새 이름 앞에도 같은 누락 표시가 붙었다.')]
  : [n('새 상자. 킹 자리에 또 다른 폰.'), n(law ? `「${law}」` : '선대 왕의 검수 규정이 남아 있었다.'), m('나도 저기까지 가야 한다.')]);
export const ACT_CARD = [
  '흠집을 가린 철판이 지나간다.\n‘살려면 저 두께가 필요한가.’',
  '새 기물들이 집게 아래 줄을 선다.\n‘우리 몫은 내가 지켜야 한다.’',
  '출하된 상자에 반품 딱지가 붙어 있다.\n‘문을 나가도 판정은 끝나지 않는구나.’',
  '빈 거푸집 옆에 출하 상자가 놓였다.\n‘내가 원한 것은 어느 쪽이지.’',
];
export const ACT_ENTRY = ACT_CARD;
export type StoryBoss = 'plate' | 'inspect' | 'spawn' | 'magnet' | 'thorns' | 'alarm';
export const BOSS_SINS = { plate: '색욕', inspect: '나태', spawn: '폭식', magnet: '탐욕', thorns: '분노', alarm: '질투', gilded: '교만' } as const;
export const BOSS_STORY: Record<StoryBoss, { name: string; intro: string; say: string; phase2: string; fall: string; reply: string; mock: string; mirror: string; temptation: string; deny: string }> = {
  plate: { name: '철갑 반장', intro: '흠집 위에 광을 올린 철갑 반장.', say: '그 몸으로 나가서 사랑받을 셈인가?', phase2: '한 겹만 더 두르면 완벽하다네.',
    fall: '갈라진 철판 안에 작은 몸이 있었다.', reply: '얇다고 녹여도 되는 건 아니야.', mock: '너도 그 몸을 버리고 싶을 게다.', mirror: '그는 자기 몸을 거푸집과 견주었다.', temptation: '단단한 몸을 주지. 아무도 얕보지 못하게.', deny: '몸을 바꾸러 온 게 아니야.' },
  inspect: { name: '검수 반장', intro: '렌즈 뒤에서 판정을 읽는 검수 반장.', say: '규정을 따르면 네 책임은 없다.', phase2: '재검수. 오판한 것은 피검수품이다.',
    fall: '그는 끝까지 규정판을 놓지 않았다.', reply: '내 동료를 네 표에 맡기지 않아.', mock: '네 표라면 모두 따르게 할 텐가.', mirror: '자기 이름으로 도장을 찍었다.', temptation: '판정은 내게 맡겨라. 생각할 필요 없다.', deny: '나는 내 눈으로 볼 거야.' },
  spawn: { name: '조립 반장', intro: '집게가 끊임없이 새 폰을 찍는다.', say: '잃으면 또 채우면 되지. 덜컹.', phase2: '아직 모자라. 더 찍어!',
    fall: '빈 집게가 한 번 더 맞물렸다.', reply: '얘들을 빈칸이라고 부르지 마.', mock: '더 가지면 안심할 줄 알았지.', mirror: '기물 수를 세고 나서 이름을 불렀다.', temptation: '네 몫으로 잔뜩 찍어 줄게.', deny: '지금 있는 동료면 돼.' },
  magnet: { name: '자석 반장', intro: '끌려온 쇠들이 그의 발치에 쌓였다.', say: '네 것으로 만들어. 그래야 안 잃지.', phase2: '어딜 가나. 장부에 적혔는데.',
    fall: '붙잡힌 쇠들이 제각기 떨어졌다.', reply: '따라온 거지, 내 것은 아니야.', mock: '떠나겠대도 보내 줄 수 있나.', mirror: '그는 기다리는 동료에게 명령했다.', temptation: '도망칠 수 없게 붙들어 주겠네.', deny: '나는 얘들을 지키려는 거야.' },
  thorns: { name: '출하 반장', intro: '문 앞의 가시에는 오래된 상처가 났다.', say: '당한 만큼 갚아. 그래야 공평하지.', phase2: '이 상처 값부터 치러라.',
    fall: '가시 끝에 그 자신의 쇳물이 맺혔다.', reply: '다음 놈에게 받을 빚은 없어.', mock: '네가 아팠던 만큼 남을 세우겠지.', mirror: '그가 견딘 길을 남의 기준으로 삼았다.', temptation: '네가 당한 고통을 돌려줘라.', deny: '나는 너처럼 굴지 않아.' },
  alarm: { name: '경보 반장', intro: '앞서는 기물마다 경보 눈금이 올랐다.', say: '남보다 먼저 나가야 네 차례가 남아.', phase2: '그만 앞서. 그건 내 차례야.',
    fall: '경보가 꺼져도 그는 순서를 세었다.', reply: '같이 나가면 순서는 필요 없어.', mock: '너 혼자 불리면 남을 돌아볼까.', mirror: '자기 이름만 불리는 소리를 들었다.', temptation: '먼저 보내 주지. 너 하나만.', deny: '혼자 나갈 생각은 없어.' },
};
export const GILDED_STORY = {
  forge: [s('외눈 정비공', '문은 밖으로도 열려.'), s('외눈 정비공', '왕좌에 남겠다면 네 선택이지.')],
  intro: '출하구가 왕좌 뒤로 이어져 있었다.',
  say: (chapter: number) => chapter > 0 ? '짐도 함께 나가자고 했었노라.' : '그 자리를 내줄 줄 알았느냐.',
  phase2: (_chapter: number) => '밖에서도 그대는 하자품이니라.\n짐은 여기서 값을 매기노라.',
  phase2End: '여기까지 와서 남의 판정을 받겠느냐.',
  last: '짐도 나가고 싶었던 적이 있었노라.', lastMono: '지금은 나를 막고 있어.',
  crownOff: '왕관을 벗어야 할 이유는 없었다.\n폰은 폰의 몸으로 끝까지 싸웠다.',
};
export const BOSS_CARD: Record<StoryBoss | 'gilded' | 'gilded+', Line[]> = Object.fromEntries([
  ...Object.entries(BOSS_STORY).map(([id, b]) => [id, [n(b.intro), s(b.name, b.say)]]),
  ['gilded', [n('그는 출하구 앞에서 왕좌를 지켰다.'), s('도금왕', '여기는 짐의 자리니라.')]],
  ['gilded+', [n('선대 종이왕이 길을 막고 있었다.'), s('도금왕', '그대가 오를 길은 닫아 두었노라.')]],
]) as Record<StoryBoss | 'gilded' | 'gilded+', Line[]>;
export const TESTIMONY = [
  { say: '나가면 또 하자품이다. 여기서는 네가 판정한다.', mono: '이 몸을 버리면, 다시는 무시당하지 않는다.' },
  { say: '짐도 다음 세트를 지키려고 남았노라.', mono: '저자는 못 했어. 나는 바꿀 수 있어.' },
  { say: '문밖에 네 자리가 있을 줄 아느냐.', mono: '저 자리를 원한다. 그래도 함께 나가기로 했다.' },
];
export const PROMOTE_TEXT = { promote: '왕이 된다', lay: '함께 나간다', stuck: '', hint: '' };
export const FINALE = {
  walk: [n('도금왕이 쓰러졌다.'), n('거푸집과 출하 상자가 남았다.')],
  taunt: [s('도금왕', '밖에서도 너희를 하자라 부를 것이다.'), m('저 몸을 가지면 이 이름을 지울 수 있다.')],
  choose: '왕의 몸 · 함께 출하', back: [s('종이왕', '돌려보내져도 같이 가자.')], murmur: [], stunned: [n('그는 동료가 기다리는 쪽으로 갔다.')],
};
export interface StoryCompany { alive: { name: string; serial?: string; t: StandIn['t'] }[]; promised?: { name: string; alive: boolean } }
export const promotionCuts = (chapter: number, crew: string, law: string, mirror: string, company?: StoryCompany): Cut[] => {
  const alive = company?.alive ?? (crew ? [{ name: crew, t: 'P' as const }] : []);
  const actor = alive.find((u) => u.name === company?.promised?.name) ?? alive[0];
  return [
    cut('promote-gild', [n('종이왕이 왕의 거푸집에 들어갔다.'), n('새 몸은 흠집 하나 없이 굳었다.'), m(chapter === 0 ? '이제 누구도 나를 잘못 넣지 못한다.' : '내가 다스리면 달라질 것이다.')]),
    { ...sceneCut('gilded-solitude', actor ? [s(actor.name, '대장, 안 오세요?'), s('새 도금왕', '출하해라.'), n('상자는 그를 두고 문을 지났다.')] : [n('출하 자리에는 빈칸만 남아 있었다.'), n('그는 남겨진 이름을 부르지 않았다.')]), caption: 'top' },
    cut('promote-rule', [n('아래에서 새 세트 하나가 올라오고 있었다.'), m('저 폰이 이 자리를 빼앗으면.'), n(`「${law}」`), ...(mirror ? [n(mirror)] : [])]),
  ];
};
export const ENDING_A: Cut = cut('promote-rule', [n('그는 동료들이 떠난 자리에 남았다.'), n('이제 다음 폰이 그를 넘어야 했다.')]);
export const DEFEAT: Cut = cut('end-fail', [n('패한 세트가 용광로로 옮겨졌다.'), n('그들의 태엽이 멎었다.'), n('다음 상자는 다른 이들의 것이었다.')]);
export const trueEndingCuts = (_crew: StandIn[], company?: StoryCompany): Cut[] => {
  const witness = company?.alive.find((u) => u.name === company.promised?.name) ?? company?.alive[0];
  const lost = company?.promised && !company.promised.alive ? company.promised.name : '';
  return [
    sceneCut('throne-mold', [n('왕의 몸은 그대로 비어 있었다.'), m('갖고 싶다. 지금도.')]),
    { ...sceneCut('departure-decision', [s('종이왕', '반품되더라도 같이 가자.'), ...(witness ? [s(witness.name, '나가서도 내 흠집은 남겠지.')] : [n('그는 남겨진 이름들을 챙겼다.')])]), caption: 'top' },
    { ...sceneCut('departure-decision', [n('정품으로 고친 이는 없었다.'), n('종이왕도 같은 상자에 올라탔다.'), n('그들 뒤에서 공장은 계속 돌아갔다.')]), caption: 'top' },
    sceneCut('shipping-company', lost ? [n(`${lost}의 자리는 비어 있었다.`), n('그는 그 자리에 원부를 놓았다.')] : witness ? [n('운송 중인 상자에서 동료가 잠들었다.'), n('종이왕은 곁에서 태엽을 감았다.')] : [n('상자가 문 밖으로 움직였다.'), n('그는 남겨진 이름 곁을 지켰다.')]),
    homeCut([n('어느 집에서 아이의 손이 상자를 열었다.')]),
    homeCut([s('부모', '킹이 없네. 불량이야. 반품하자.'), s('아이', '싫어. 난 이 세트가 좋아.')]),
    homeCut([n('아이가 종이왕을 판 위에 놓았다.'), n('손끝은 흠집 위에서 멈추지 않았다.')]),
  ];
};
/** 폐기된 전생 컷을 부르는 도구 호환. 본편 전투의 행마는 바꾸지 않는다. */
export const CROWN_OFF = cut('promote', [n('종이왕은 자기 몸으로 판 위에 섰다.')]);
export const BOSS_TAUNTS: Record<StoryBoss | 'gilded', Record<'cheese' | 'beg' | 'gloat' | 'meet' | 'sig', string[]>> = {
  plate: {
    cheese: ['“감히 이 몸의 철판에 흠집을! 광을 내는 데 몇 해가 걸렸는지 아는가!”', '“얇은 것들이 겁도 없이 덤비는군.”'],
    beg: ['“흠집만은… 제발 철판에 흠집만은 내지 말게.”', '“이 철판, 자네에게 둘러 주겠네. 그러니 그만…”'],
    gloat: ['“보게나, 얇은 것은 이렇게 녹는 법이지.”', '“종이 왕관으로 이 몸의 철판을? 가소롭네.”'],
    meet: ['“또 다른 종이 왕관인가.”', '“얇은 것들은 끝도 없이 오는군.”'],
    sig: ['“얇은 줄부터 녹여 주지.”', '“두께 없는 것들은 이렇게 된다네.”'],
  },
  inspect: {
    cheese: ['“규정 위반. 결함 목록에 추가.”', '“검수관의 렌즈를 피하는 행위. 감점.”'],
    beg: ['“재, 재검수를 요청한다… 오판 가능성 — 있음.”', '“도장은… 지울 수 있다. 정정 절차가 있다.”'],
    gloat: ['“판정 확인. 하자.”', '“예측 일치. 오차 없음.”'],
    meet: ['“새 일련번호. 같은 누락.”', '“그 결함은 규정판에 있다.”'],
    sig: ['“대상 지정. 하자.”', '“도장 날인. 효력 즉시 발생.”'],
  },
  spawn: {
    cheese: ['“내 폰들을 꿀꺽 먹어 치웠어? 너도 배고프구나.”', '“둘이나! 아까워, 아까워!”'],
    beg: ['“더 찍어 줄게, 네 몫으로 잔뜩! 그러니까 라인만은…”', '“멈추지 마, 라인을 멈추지 마… 배고프단 말이야.”'],
    gloat: ['“하나 깨졌네? 난 둘 찍으면 되는데. 덜컹.”', '“네 건 대체품도 없잖아. 불쌍해라.”'],
    meet: ['“새 상자네. 재료가 잔뜩이야.”', '“너 찍어 낸 틀, 아직도 배고프대.”'],
    sig: ['“하나 더! 덜컹!”', '“찍어, 찍어, 더 찍어.”'],
  },
  magnet: {
    cheese: ['“내 거를 부숴? 그거 얼마짜린 줄 아나!”', '“어딜 빠져나가, 이미 장부에 적었는데.”'],
    beg: ['“나사를 주지. 반만. …아니, 삼분의 일. 어떤가?”', '“놓아주지, 놓아주고말고! …조금만 있다가.”'],
    gloat: ['“이리 와. 이제 내 장부에 올랐다네.”', '“결국 다 끌려오고말고.”'],
    meet: ['“새로 온 쇠도 장부에 올려야지.”', '“전부 내 창고로 들어오게.”'],
    sig: ['“이리 오게, 그것도 내 거라네.”', '“쇠는 가진 놈 쪽으로 끌려오는 법이지.”'],
  },
  thorns: {
    cheese: ['“등을 쳤나. …그 값, 두 배로 치르게 해 주마.”', '“감히. 이 문 앞에서.”'],
    beg: ['“…그만. 가시를 거두지. 문도… 열어 주마.”', '“여기까지다. 지나가라. …지나가.”'],
    gloat: ['“찔렀다. 건드린 대가다.”', '“그러니 이 문은 건드리지 말았어야지.”'],
    meet: ['“너희보다 먼저 온 상처가 있다.”', '“그 값을 다음 놈에게도 받겠다.”'],
    sig: ['“쳤으니, 받아라.”', '“닿는 순간 — 돌아간다.”'],
  },
  alarm: {
    cheese: ['“또 앞질렀군. 좋아, 똑똑히 외워 두지. 하나도 안 잊어.”', '“운 좋은 폰 하나. 그 운이 언제까지 가나 보자고.”'],
    beg: ['“알았어, 알았다고. 경보 끄지. …대신 넌 거기서 더 오르지 마.”', '“같은 공장 출신끼리 왜 이래. 나눠 먹자고, 응?”'],
    gloat: ['“봐라, 앞서는 놈은 결국 이렇게 넘어져.”', '“하나 떨어졌군. 꼴좋다, 아주.”'],
    meet: ['“새 상자가 어디까지 오르는지 셌지.”', '“너도 나보다 먼저 갈 셈이냐.”'],
    sig: ['“눈금 찼다. 앞선 놈부터 끌어내려.”', '“경보다. 한 놈도 나보다 먼저 못 간다.”'],
  },
  gilded: {
    cheese: ['“그 수는… 짐도 썼었노라.”', '“왕관 아래를 노리는가. 영리한 폰이로구나.”'],
    beg: ['“금을 나누어 주겠노라. 얼마든지.”', '“그대도 결국 여기 서리라. 그러니—”'],
    gloat: ['“킹 없는 세트는 약하니라. 짐이 쓴 법이니.”', '“그리 녹는 것이니라. 법대로.”'],
    meet: ['“또 그대인가. 아니면… 또 짐인가.”', '“왕관이 그대를 기다렸노라.”'],
    sig: ['“반장들의 법은 모두 짐의 것이니라.”', '“강한 것만 사느니라. 짐이 그리 썼노라.”'],
  },
};
