/**
 * 막 사이 동료 장면 (D-447 다시 씀): 실제 생존자 · 일련번호로 만든 약속. 폐기된 인물에게 현재 대사를 주지 않는다.
 * 1막 뒤 = 쉬고 싶다는 소원과 「망볼게」 약속 → 2막 뒤 = 밖에서 자기 길을 정하겠다는 말 → 3막 뒤 = 3막 입구의 반품 상자를 떠올린다.
 * 진엔딩의 운송 상자에서 「약속대로 망을 봤다」로 닫힌다. 말투는 crew-voice.ts의 성격을 따른다.
 */
import type { Cut, Line } from './script';
import type { StoryPromise } from './campaign';
export interface CompanionActor { serial?: string; name: string; t: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' }
type T = CompanionActor['t'];
/** 1막 뒤 — 나가서 하고 싶은 일 (약속으로 저장된다) */
const WISH: Record<T, string> = { P: '나가면… 푹 자 보고 싶어요.', N: '밖에선 명령 없이 쉬고 싶다.', B: '이 늙은 몸도 편히 쉬고 싶소.', R: '출하 뒤에는 휴가를 쓰겠다.', Q: '나가면 아무도 날 깨우지 마요.', K: '잠들고 싶다.' };
/** 2막 뒤 — 밖에서는 자기 길을 정하겠다 */
const OWN_WAY: Record<T, string> = { P: '밖에선… 제 갈 길을 골라 볼래요.', N: '밖에선 내 길은 내가 정하겠다.', B: '밖에선 내 빛을 내가 고르겠소.', R: '밖에선 본관 규정은 본관이 쓴다.', Q: '밖에선 내 자리는 내가 정해요.', K: '밖에선 내 길을 고르겠다.' };
/** 3막 뒤 — 반품 상자를 보고 든 겁 */
const FEAR: Record<T, string> = { P: '우리도 나가면… 저렇게 돌아와요?', N: '나가도 돌려보내질 수 있다는 거군.', B: '문밖에서도 심판은 끝나지 않소?', R: '출하 뒤에도 검수가 있단 말인가.', Q: '흥. 나가도 불량 취급이라고요?', K: '나가도 돌아올 수 있는가.' };
export const companionScene = (act: number, alive: CompanionActor[], promise?: StoryPromise): { cuts: Cut[]; promise?: StoryPromise } => {
  const actor = (promise ? alive.find((u) => u.serial === promise.serial) : undefined) ?? alive.find((u) => u.t === 'P') ?? alive[0];
  let made = promise;
  const lines: Line[] = [];
  if (act === 0) {
    lines.push({ k: 'n', t: '첫 공정을 넘긴 밤, 분대가 상자에 모였다.' });
    if (actor) {
      made = { serial: actor.serial ?? '', name: actor.name, wish: WISH[actor.t] };
      lines.push({ k: 's', who: actor.name, t: made.wish }, { k: 's', who: '종이왕', t: '그럼 나가는 날까지 내가 망볼게.' }, { k: 's', who: '종이왕', t: '약속해. 같이 나가서 쉬자.' });
    } else lines.push({ k: 'n', t: '대답할 동료는 남아 있지 않았다.' });
  } else if (act === 1) {
    lines.push({ k: 'n', t: '두 번째 공정이 끝났다. 쇳내가 가셨다.' });
    if (actor) lines.push({ k: 's', who: actor.name, t: OWN_WAY[actor.t] }, { k: 's', who: '종이왕', t: '그래. 밖에선 내가 명령하지 않을게.' }, { k: 'm', t: '명령하지 않으면… 다들 떠날까.' });
    else lines.push({ k: 'n', t: '빈자리마다 쓰러진 이름이 남아 있었다.' });
  } else {
    lines.push({ k: 'n', t: '반품 상자의 딱지가 자꾸 떠올랐다.' }, { k: 'n', t: '「작동 정상. 외관 불량」' });
    if (actor) lines.push({ k: 's', who: actor.name, t: FEAR[actor.t] }, { k: 's', who: '종이왕', t: '돌아와도 괜찮아. 같이 있으면 돼.' }, { k: 'm', t: '정말 그럴까. 저 거푸집이라면….' });
    else lines.push({ k: 'm', t: '이겨도, 나가도, 또 판정받는구나.' });
  }
  // 전용 원화 (D-450 · S-08~10): 인물이 그림 안에 있으므로 기물을 겹치지 않는다. 동료가 없으면 그림(잠든 동료 · 곁의 동료)이 맞지 않아 옛 배경으로.
  const art = ['companion-rest', 'companion-crossroad', 'returned-box'][Math.min(2, act)];
  if (actor || act >= 2) return { promise: made, cuts: [{ img: art, bg: ['#16141c', '#0b0b0e'], art: [], lines, pixelCover: true, cam: 'still' }] };
  return { promise: made, cuts: [{ img: 'credits-bg', bg: ['#16141c', '#0b0b0e'], art: [], standIn: true, lines }] };
};
