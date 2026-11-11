/** 실제 생존자·일련번호로 만든 약속. 폐기된 인물에게 현재 대사를 주지 않는다. */
import type { Cut, Line } from './script';
import type { StoryPromise } from './campaign';
export interface CompanionActor { serial?: string; name: string; t: 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' }
export const companionScene = (act: number, alive: CompanionActor[], promise?: StoryPromise): { cuts: Cut[]; promise?: StoryPromise } => {
  const actor = (promise ? alive.find((u) => u.serial === promise.serial) : undefined) ?? alive.find((u) => u.t === 'P') ?? alive[0];
  let made = promise;
  const lines: Line[] = [];
  if (act === 0) {
    if (actor) {
      const wish = ({ P: '나가면 푹 자고 싶어요.', N: '밖에선 명령 없이 쉬고 싶다.', B: '이 몸도 편히 쉬고 싶구려.', R: '출하 후에는 휴가를 쓰겠다.', Q: '나가면 아무도 날 깨우지 마요.', K: '잠들고 싶다.' })[actor.t];
      made = { serial: actor.serial ?? '', name: actor.name, wish };
      lines.push({ k: 's', who: actor.name, t: made.wish }, { k: 's', who: '종이왕', t: '그동안 내가 망볼게.' });
    } else lines.push({ k: 'n', t: '대답할 동료가 남아 있지 않았다.' });
  } else if (act === 1) {
    if (actor) lines.push({ k: 's', who: actor.name, t: '밖에선 내 갈 곳을 내가 정할 거야.' }, { k: 'm', t: '명령하지 않으면 흩어질 수도 있구나.' });
    else lines.push({ k: 'n', t: '빈 자리마다 남겨진 이름이 있었다.' });
  } else {
    lines.push({ k: 'n', t: '반품된 상자에 새 도장이 찍혀 있었다.' }, { k: 'n', t: '「작동 정상. 외관 불량」' }, { k: 'm', t: '이겨도, 나가도, 또 판정받는구나.' });
  }
  return { promise: made, cuts: [{ img: 'credits-bg', bg: ['#16141c', '#0b0b0e'], art: alive.map((u, i) => ({ t: u.t, side: 0, x: 18 + i * 8, y: 56, h: 22 })), standIn: true, lines }] };
};
