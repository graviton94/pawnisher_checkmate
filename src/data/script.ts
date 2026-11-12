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
  // D-447 (1.1.1 테스터 「요약이 심해 처음 보는 사람이 이해할 수 없다」): 세계 · 규칙 · 인물을 한 컷에 하나씩 풀어 쓴다.
  // 왕관을 접기 전엔 「아홉째 폰」, 접은 뒤에야 「종이왕」. 말마다 앞 말에 답한다. 박차는 여기서 부관이 된다.
  { ...cut('prologue-00', [n('여기는 체스 세트를 찍어 내는 공장이다.'), n('갓 굳은 기물은 태엽이 감기면 눈을 뜬다.'), n('공장은 흰 세트와 검은 세트를 맞붙인다.'), n('세 공정을 다 이긴 세트만 출하구를 나간다.')]), key: true },
  { ...cut('prologue-01', [n('진 세트는 상자째 용광로에 들어간다.'), n('녹은 쇠는 다음 세트의 기물이 된다.'), n('이름도, 싸운 기록도 남지 않는다.')]), key: true },
  cut('prologue-02', [n('그날, 한 흰 세트에 킹이 빠져 있었다.'), n('집게가 킹 자리에 넣은 것은 폰이었다.'), n('여덟 폰 곁에 하나 더. 아홉 번째 폰.'), m('내가 들어올 자리가 아니었어.')]),
  { ...cut('prologue-03', [n('검수기가 상자 뚜껑에 딱지를 찍었다.'), n('「킹 누락. 검수 대기」'), n('출하구까지 이기면 딱지가 지워진다.'), n('한 판이라도 지면, 상자째 녹는다.')]), key: true },
  cut('prologue-04', [s('흰 퀸', '킹도 없이 어떻게 이겨?'), s('흰 퀸', '너 때문에 우리까지 녹게 생겼어.'), s('아홉째 폰', '알아. 잘못 들어온 건 나야.'), s('흰 룩', '탓해도 판은 시작돼. 누가 지휘하지?'), n('아무도 대답하지 않았다.')]),
  { ...cut('prologue-05', [n('폰은 상자 귀퉁이를 찢어 왕관을 접었다.'), s('아홉째 폰', '킹 자리가 비었으면 내가 채울게.'), s('아홉째 폰', '맨 앞은 내가 설게. 같이 나가자.'), n('그날부터 모두 그를 종이왕이라 불렀다.')]), key: true },
  cut('prologue-06', [n('주조 흠집이 난 나이트가 곁에 섰다.'), s('박차', '박차다. 흠집 탓에 늘 뒷줄이었지.'), s('박차', '이겨도 흠집은 안 없어질 텐데?'), s('종이왕', '없앨 필요 없어. 이 몸 그대로 나가자.'), s('박차', '…좋다. 내가 네 부관이 되지.')]),
  { ...cut('prologue-07', [n('맞은편에 검은 세트가 줄지어 섰다.'), n('그들도 녹지 않으려고 싸우는 세트였다.'), n('출하구 위 왕좌에는 도금왕이 앉아 있다.'), m('미안해. 우선 이 판부터 넘는다.')]), key: true },
];
/** 다음 장의 폰은 새 인물이다. 앞 장의 기억이 아니라 남겨진 검수 규정을 만난다. */
export const shadowCut = (chapter: number, law?: string): Cut => cut('prologue-shadow', chapter === 0
  ? [n('앞선 상자는 용광로로 갔다.'), n('다른 상자에서 또 한 폰이 눈을 떴다.'), n('뚜껑에는 같은 딱지가 찍혀 있었다.'), m('이번엔 내가 끝까지 간다.')]
  : [n('새 상자. 킹 자리에 또 다른 폰이 있었다.'), n('검수대에 새 규정이 붙어 있었다.'), n(law ? `「${law}」` : '「선대 왕의 검수 규정」'), n('지난 출하에서 왕이 된 종이왕의 글이다.'), m('그 왕도 나처럼 시작했을까.')]);
export const ACT_CARD = [
  // [0]은 프롤로그가 대신한다. [1]~[3] = 2막 · 3막 · 종막에 들어설 때 (서술 한 줄 + 독백 한 줄)
  '첫 공정 판 위로 흰 세트가 올라선다.\n‘한 판도 지면 안 돼.’',
  '진 세트의 쇠로 새 기물이 찍혀 나온다.\n‘지면 우리도 저렇게 된다.’',
  '반품된 상자 하나가 거꾸로 실려 왔다.\n‘출하된 세트도… 돌아오는구나.’',
  '출하구 앞에 왕좌와 빈 거푸집이 있다.\n‘저기 들어가면 진짜 킹이 된다.’',
];
export const ACT_ENTRY = ACT_CARD;
export type StoryBoss = 'plate' | 'inspect' | 'spawn' | 'magnet' | 'thorns' | 'alarm';
export const BOSS_SINS = { plate: '색욕', inspect: '나태', spawn: '폭식', magnet: '탐욕', thorns: '분노', alarm: '질투', gilded: '교만' } as const;
/**
 * 반장 (D-447 다시 씀). 쓰이는 자리:
 * intro · say = 등장 띠 · 지도 서술 / phase2 = 2단계 / 격파 컷 = fall(서술) → temptation(반장의 마지막 유혹) → reply(종이왕의 대답) → deny(속마음 — 부정하면서도 끌린다)
 * mock = 도금왕이 이 반장을 들어 종이왕을 떠본다 / mirror = 왕이 된 결말에서 새 왕이 이 반장을 닮아 간다
 */
export const BOSS_STORY: Record<StoryBoss, { name: string; intro: string; say: string; phase2: string; fall: string; reply: string; mock: string; mirror: string; temptation: string; deny: string }> = {
  plate: { name: '철갑 반장', intro: '흠집마다 철판을 덧댄 반장이 섰다.', say: '그 얇은 몸으로 나가 사랑받을 셈인가?', phase2: '한 겹만 더 두르면 완벽해진다네.',
    fall: '두꺼운 철판이 갈라져 떨어졌다.\n안에는 흠집투성이 작은 폰이 있었다.', temptation: '내 철판을 주지. 아무도 얕보지 못하게.', reply: '흠집을 가린다고 다른 몸이 되진 않아.', deny: '…단단한 몸이 부럽긴 했어.',
    mock: '철갑 반장의 철판이 탐나지 않더냐?', mirror: '그는 철갑 반장처럼 몸에 광을 냈다.' },
  inspect: { name: '검수 반장', intro: '렌즈를 낀 검수 반장이 규정판을 폈다.', say: '규정대로 하면 네 탓은 하나도 없다.', phase2: '재검수. 오판한 쪽은 피검수품이다.',
    fall: '렌즈가 깨지자 그는 규정판을 더듬었다.\n스스로 판단해 본 적이 없었다.', temptation: '판정은 내게 맡겨라. 따르기만 해.', reply: '동료를 표 한 장에 맡길 순 없어.', deny: '…누가 대신 정해 주면 편하겠지.',
    mock: '검수 반장처럼 맡기면 편하지 않더냐?', mirror: '그는 검수 반장처럼 도장만 찍었다.' },
  spawn: { name: '조립 반장', intro: '조립 반장의 집게가 쉬지 않고 폰을 찍었다.', say: '잃으면 또 찍으면 되지. 덜컹.', phase2: '모자라. 더 찍어! 더!',
    fall: '집게가 멈추자 찍다 만 폰이 쏟아졌다.\n이름 붙은 기물은 하나도 없었다.', temptation: '네 몫으로 잔뜩 찍어 줄게. 잃어도 되게.', reply: '대신할 수 있는 동료는 없어.', deny: '…하나쯤 더 있으면 든든하겠지.',
    mock: '조립 반장처럼 또 채우면 그만이니라.', mirror: '그는 조립 반장처럼 빈자리만 채웠다.' },
  magnet: { name: '자석 반장', intro: '자석 반장 발치에 끌려온 쇠가 쌓였다.', say: '붙잡아 둬. 네 것이어야 안 잃는다.', phase2: '어딜 가나. 이미 장부에 적었는데.',
    fall: '자력이 꺼지자 붙들린 쇠가 흩어졌다.\n아무도 그에게 돌아가지 않았다.', temptation: '동료들을 네 곁에 붙들어 주지.', reply: '붙잡아 두면 그건 동료가 아니야.', deny: '…다들 떠나지 않으면 좋겠지만.',
    mock: '자석 반장처럼 붙들고 싶지 않더냐?', mirror: '그는 자석 반장처럼 기물을 붙들었다.' },
  thorns: { name: '출하 반장', intro: '출하문을 지키는 반장 몸에 가시가 돋았다.', say: '당한 만큼 갚아라. 그게 공평이다.', phase2: '이 상처 값부터 치르고 가라.',
    fall: '가시가 부러지자 오래된 상처가 보였다.\n그도 이 문 앞에서 당했던 기물이었다.', temptation: '네가 당한 만큼 다음 놈에게 돌려줘.', reply: '내 상처를 다음 폰에게 넘기진 않아.', deny: '…억울했던 건 사실이지만.',
    mock: '출하 반장처럼 갚고 싶지 않더냐?', mirror: '그는 출하 반장처럼 문에 가시를 걸었다.' },
  alarm: { name: '경보 반장', intro: '앞서는 기물을 보면 경보 반장이 울렸다.', say: '남보다 먼저 나가야 네 자리가 남는다.', phase2: '그만 앞서라. 거긴 내 차례다.',
    fall: '경보가 꺼져도 그는 순서를 세었다.\n자기 차례는 끝내 오지 않았다.', temptation: '너 하나만 먼저 내보내 주지.', reply: '혼자 나가면 그건 출하가 아니야.', deny: '…그래도 내가 먼저 불린다면.',
    mock: '경보 반장처럼 앞서고 싶지 않더냐?', mirror: '그는 경보 반장처럼 앞선 폰을 막았다.' },
};
/** 도금왕 (D-447): 출하구 앞 왕좌의 주인. 둘째 장부터는 지난 장에서 왕이 된 종이왕이다. */
export const GILDED_STORY = {
  forge: [s('외눈 정비공', '출하구 문은 밖으로도 열린다.'), s('외눈 정비공', '왕좌에 남을지는 네가 고르는 거다.')],
  intro: '출하구 앞 금빛 왕좌에 도금왕이 있었다.',
  say: (chapter: number) => chapter > 0 ? '짐도 함께 나가자고 했었노라.' : '이 문은 짐을 넘어야 열리느니라.',
  phase2: (_chapter: number) => '밖에 나가도 그대는 하자품이니라.\n여기 남으면 값을 매기는 쪽이 된다.',
  phase2End: '그래도 남의 판정을 받으러 가겠느냐?',
  last: '짐도 나가고 싶었던 적이 있었노라.', lastMono: '지금은 그가 나를 막고 있어.',
  crownOff: '왕관을 벗어야 할 이유는 없었다.\n폰은 폰의 몸으로 끝까지 싸웠다.',
};
export const BOSS_CARD: Record<StoryBoss | 'gilded' | 'gilded+', Line[]> = Object.fromEntries([
  ...Object.entries(BOSS_STORY).map(([id, b]) => [id, [n(b.intro), s(b.name, b.say)]]),
  ['gilded', [n('출하구 앞 왕좌에 도금왕이 앉아 있었다.'), s('도금왕', '이 문은 짐을 넘어야 열리느니라.')]],
  ['gilded+', [n('왕좌엔 지난 출하의 종이왕이 앉아 있었다.'), s('도금왕', '짐도 그대처럼 종이 왕관이었노라.')]],
]) as Record<StoryBoss | 'gilded' | 'gilded+', Line[]>;
/** 왕위 결정 화면 (promotion.ts): 쓰러진 도금왕의 말 + 종이왕의 속마음. 장마다 도금왕이 누구인지가 다르다. */
export const TESTIMONY = [
  { say: '저 거푸집에 들면 진짜 킹이 되느니라. 여기선 그대가 판정하는 쪽이다.', mono: '이 몸만 버리면, 다시는 잘못 들어왔다는 말을 안 듣겠지.' },
  { say: '짐도 동료를 지키려고 남았노라. 그대도 곧 알게 되리라.', mono: '저 왕은 못 했어. 하지만 나는 다르게 할 수 있어.' },
  { say: '반품 딱지를 보지 않았느냐. 문밖에 그대 자리는 없느니라.', mono: '저 자리가 탐나. 그래도… 같이 나가기로 약속했어.' },
];
export const PROMOTE_TEXT = { promote: '왕이 된다', lay: '함께 나간다', stuck: '', hint: '' };
export const FINALE = {
  walk: [n('도금왕이 쓰러졌다.'), n('왕의 거푸집과 출하 상자가 남았다.')],
  taunt: [s('도금왕', '밖에서도 너희를 하자라 부를 것이다.'), m('저 몸이면 그 이름을 지울 수 있어.')],
  choose: '왕의 몸 · 함께 출하', back: [s('종이왕', '돌려보내져도 같이 가자.')], murmur: [], stunned: [n('그는 동료가 기다리는 쪽으로 갔다.')],
};
export interface StoryCompany { alive: { name: string; serial?: string; t: StandIn['t'] }[]; promised?: { name: string; alive: boolean } }
/** 왕이 되어 남는 결말 (서막 · 둘째 장은 늘 이쪽, 셋째 장은 고른 경우) */
export const promotionCuts = (chapter: number, crew: string, law: string, mirror: string, company?: StoryCompany): Cut[] => {
  const alive = company?.alive ?? (crew ? [{ name: crew, t: 'P' as const }] : []);
  const actor = alive.find((u) => u.name === company?.promised?.name) ?? alive[0];
  return [
    cut('promote-gild', [n('종이왕은 왕의 거푸집으로 걸어 들어갔다.'), n('쇳물이 식자 흠집 없는 몸이 남았다.'), m(chapter === 0 ? '이제 아무도 날 잘못 넣었다고 못 해.' : '내가 다스리면, 이번엔 다를 거야.')]),
    { ...sceneCut('gilded-solitude', actor ? [s(actor.name, '대장, 같이 안 가요?'), s('새 도금왕', '…너희는 출하해라. 명령이다.'), n('상자는 그를 두고 출하구를 지났다.')] : [n('출하 상자에는 빈칸만 남아 있었다.'), n('그는 떠난 이름을 부르지 않았다.')]), caption: 'top' },
    cut('promote-rule', [n('얼마 뒤, 아래 공정에서 새 세트가 왔다.'), n('킹 자리에는 또 한 폰이 서 있었다.'), m('저 폰이 이 자리를 빼앗으러 온다.'), n('그는 검수대에 새 규정을 새겼다.'), n(`「${law}」`), ...(mirror ? [n(mirror)] : [])]),
  ];
};
export const ENDING_A: Cut = cut('promote-rule', [n('그는 동료가 떠난 왕좌에 홀로 남았다.'), n('이제 다음 폰이 그를 넘어야 했다.')]);
export const DEFEAT: Cut = cut('end-fail', [n('킹 자리가 무너지자 검수기가 울렸다.'), n('진 세트는 상자째 용광로로 옮겨졌다.'), n('기물들의 태엽이 하나씩 멎었다.')]);
/** 진엔딩 (셋째 장에서 함께 나간다를 고른 경우) — 첫 장의 약속(망볼게)이 운송 상자에서 지켜진다 */
export const trueEndingCuts = (_crew: StandIn[], company?: StoryCompany): Cut[] => {
  const witness = company?.alive.find((u) => u.name === company.promised?.name) ?? company?.alive[0];
  const lost = company?.promised && !company.promised.alive ? company.promised.name : '';
  return [
    sceneCut('throne-mold', [n('도금왕이 쓰러지자 거푸집이 열렸다.'), n('들어가면 진짜 킹의 몸이 된다.'), m('갖고 싶다. 지금도.')]),
    { ...sceneCut('departure-decision', [s('종이왕', '반품되더라도 같이 가자.'), ...(witness ? [s(witness.name, '흠집 난 채로요?'), s('종이왕', '응. 이 몸 그대로.')] : [n('그는 남겨진 이름들을 챙겼다.')])]), caption: 'top' },
    { ...sceneCut('departure-decision', [n('종이왕은 거푸집에 등을 돌렸다.'), n('정품으로 고쳐진 이는 아무도 없었다.'), n('그래도 모두 같은 상자에 올라탔다.'), n('그들 뒤에서 공장은 계속 돌아갔다.')]), caption: 'top' },
    sceneCut('shipping-company', lost ? [n(`${lost}의 자리는 비어 있었다.`), n('그는 그 자리에 원부를 놓아 두었다.')] : witness ? [n('운송 상자 안에서 동료들이 잠들었다.'), n('종이왕은 약속대로 곁에서 망을 봤다.')] : [n('상자가 문 밖으로 움직였다.'), n('그는 남겨진 이름 곁을 지켰다.')]),
    homeCut([n('며칠 뒤, 어느 집에서 상자가 열렸다.'), n('작은 손이 기물을 하나씩 꺼냈다.')]),
    homeCut([s('부모', '킹이 없네. 불량이야. 반품하자.'), s('아이', '싫어. 난 이 세트가 좋아.')]),
    homeCut([n('아이는 종이 왕관 쓴 폰을 판에 세웠다.'), n('손끝은 흠집 위에서도 멈추지 않았다.')]),
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
