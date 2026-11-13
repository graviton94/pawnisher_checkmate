/**
 * 막 사이 동료 장면 (바이블 CO-1~3, D-451). 실제 생존자 · 일련번호로 만든 약속. 폐기된 인물에게 현재 대사를 주지 않는다.
 * 1공정 뒤 = 약속(CO-1) → 2공정 뒤 = 전대의 흔적과 흔들리는 내면(CO-2, 승천마다 다르다) → 3공정 뒤 = 안쪽에서 잠긴 문(CO-3, ACT-3 회수).
 * chapter = 승천(0~3). 말투는 crew-voice.ts의 성격을 따른다.
 */
import type { Cut, Line } from './script';
import type { StoryPromise } from './campaign';
export interface CompanionActor { serial?: string; name: string; t: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' }
type T = CompanionActor['t'];
/** CO-1-2 · CO-1-4 변주: 꼭대기까지 가면 하고 싶은 일 (약속으로 저장된다) */
const WISH: Record<T, string> = {
  P: '대장… 정말 꼭대기 승급대까지 가면, 우리가 진짜 정품 세트가 돼서 다 같이 살 수 있을까요?',
  N: '꼭대기까지 살아남으면, 그땐 누구의 명령도 받지 않고 맑은 바람이나 쐬며 쉬고 싶다.',
  B: '그날이 온다면 이 늙고 삐걱거리는 몸도 차가운 쇠 바닥이 아닌 곳에서 편히 쉬고 싶소.',
  R: '출하 승인이 떨어지는 즉시, 본관은 기한 없는 휴가를 신청할 예정이다.',
  Q: '흥, 어쨌든 밖으로 나가기만 하면 돼요. 나가면 한 달 동안 아무도 날 깨우지 마요.',
  K: '꼭대기까지 가면, 그땐 쉬고 싶다.',
};
/** CO-2-2 동료의 말: 살아 나가면 제 마음대로 걷고 싶다 (폰 판은 바이블 CO-2-2-A1, 나머지는 성격대로 옮긴 변주) */
const OWN_WAY: Record<T, string> = {
  P: '대장, 만약 우리가 살아 나가면요… 전 이 좁은 칸을 벗어나서 제 마음대로 걸어보고 싶어요.',
  N: '살아 나가면, 정해진 칸 말고 내가 고른 길로 달려 보고 싶다.',
  B: '살아 나간다면, 이 늙은 몸도 사선 말고 제 마음 가는 길로 걸어 보고 싶소.',
  R: '살아 나가면, 본관은 직선 말고 귀관이 모르는 길로도 걸어 볼 생각이다.',
  Q: '흥, 살아 나가면요, 누가 정해 준 칸 말고 내 마음대로 걸을 거예요.',
  K: '살아 나가면, 내 마음대로 걸어 보고 싶다.',
};
/** CO-2-2 승천별 서술 (2~4승천에는 전대의 흔적이 먼저 보인다 — 1승천은 서술 없이 동료의 말부터) */
const TRACE = [
  '',
  '그들이 쉴 곳을 찾던 벽 구석에서, 주조 흠집이 패인 낡은 나이트의 태엽과 벽에 긁힌 글자가 발견되었다. 「대장이 꼭대기에 닿으면 우린 살 수 있다. 나는 대장을 믿는다.」',
  '가혹한 전투 끝에 팔다리가 부서진 동료의 태엽을 조여주며, 종이왕의 작은 손끝이 쉴 새 없이 떨렸다.',
  '통로 벽면마다 앞선 세 분대의 기물들이 버티며 남긴 손톱자국과 녹슨 이빨 자국이 지층처럼 쌓여 있었다.',
];
/** CO-2-4 승천별 속마음 */
const DOUBT = [
  '모두 살아 나가면 각자 원하는 곳으로 흩어지겠지. 함께 싸우던 이 밤도 결국 지나갈 뿐이다. …그런데 이상하다. 저들이 내 곁을 떠난다는 상상을 하자, 가슴 한구석이 서늘하게 식어가는 건.',
  '저 녹슨 태엽의 주인은 끝까지 대장을 믿었구나. 그 믿음을 팔아먹은 전대 왕은 얼마나 비겁했단 말인가. 나는 결코 저런 괴물이 되지 않아.',
  '내가 한 칸밖에 움직이지 못해서, 내 팔이 너무 짧아서 소중한 동료들이 이렇게 붉은 녹을 흘리며 부서진다. 하루빨리 그 누구도 베지 못할 완벽한 왕의 힘을 손에 넣어야만 해.',
  '이 벽을 긁고 올라간 이들도 처음엔 모두 누군가의 이름을 부르며 울었을 것이다. 그런데 어째서 그 간절함의 끝마다, 살아남은 것은 언제나 차가운 왕좌 위의 한 사람뿐이었을까.',
];
/** 승천별 그림 (받기 전엔 alt — docs/asset-order-master.md D-451) */
const CO2_ART = ['companion-crossroad', 'old-spring', 'companion-crossroad', 'scarred-wall'];
export const companionScene = (act: number, alive: CompanionActor[], promise?: StoryPromise, chapter = 0): { cuts: Cut[]; promise?: StoryPromise } => {
  const actor = (promise ? alive.find((u) => u.serial === promise.serial) : undefined) ?? alive.find((u) => u.t === 'P') ?? alive[0];
  const ch = Math.max(0, Math.min(3, chapter));
  let made = promise;
  const lines: Line[] = [];
  let img = 'credits-bg';
  let alt: string | undefined;
  if (act === 0) {
    lines.push({ k: 'n', t: '첫 번째 공정을 간신히 넘긴 밤, 기름 냄새가 진동하는 상자 구석에 지친 분대가 둘러앉았다.' });
    if (actor) {
      made = { serial: actor.serial ?? '', name: actor.name, wish: WISH[actor.t] };
      lines.push({ k: 's', who: actor.name, t: made.wish }, { k: 's', who: '종이왕', t: '두려워하지 마. 너희가 지쳐서 멈추는 일이 없도록, 우리가 저 문턱을 넘는 날까지 내 태엽이 먼저 닳는 한이 있어도 앞줄에서 망을 볼게.' });
      img = 'companion-rest';
    } else lines.push({ k: 'n', t: '하지만 그 곁에 둘러앉을 동료는 하나도 남아 있지 않았다.' });
  } else if (act === 1) {
    lines.push({ k: 'n', t: '두 번째 공정이 끝났다. 짙은 쇳내와 화약 연기가 가시고, 승강기 틈새로 서늘한 바람이 스며들었다.' });
    if (TRACE[ch]) lines.push({ k: 'n', t: TRACE[ch] });
    if (actor) lines.push({ k: 's', who: actor.name, t: OWN_WAY[actor.t] }, { k: 's', who: '종이왕', t: '그래. 바깥세상에 나가면, 그땐 나도 더 이상 너희에게 명령하지 않을게. 각자 가고 싶은 곳으로 가자.' });
    lines.push({ k: 'm', t: DOUBT[ch] });
    if (actor || TRACE[ch]) { img = CO2_ART[ch]; alt = 'companion-crossroad'; }
  } else {
    lines.push({ k: 'n', t: '3공정 문턱 앞에는, 끝내 승급하지 못한 채 부서진 옛 불량 세트들의 낡은 상자들이 산처럼 쌓여 있었다.' }, { k: 'n', t: '그리고 그 너머로, 출하구로 통하는 거대한 문이 바깥쪽이 아니라 안쪽에서 쇠사슬로 칭칭 감겨 잠겨 있는 모습이 보였다.' });
    if (actor) lines.push({ k: 's', who: actor.name, t: '대장… 저 문 좀 보세요. 진짜 킹이 된 도금왕은 왜 문을 열고 나가지 않은 걸까요? 왜 안에서 문을 걸어 잠근 거죠?' }, { k: 's', who: '종이왕', t: '겁쟁이라서 그렇겠지. 우리가 올라가서 저 사슬을 끊고 문을 열어젖히면 그만이야.' });
    lines.push({ k: 'm', t: '…정말 겁쟁이라서 못 나간 걸까. 아니면, 나갈 수 없는 이유가 그 왕좌 안에 숨어 있는 걸까.' });
    img = 'chained-door';
    alt = 'departure-dock';
  }
  // 전용 원화는 인물이 그림 안에 있으므로 기물을 겹치지 않는다. 동료가 없으면 동료가 그려진 그림 대신 옛 배경
  const scene = img !== 'credits-bg';
  return { promise: made, cuts: [{ img, alt, bg: ['#16141c', '#0b0b0e'], art: [], lines, ...(scene ? { pixelCover: true, cam: 'still' as const } : { standIn: true }) }] };
};
