import { ASCENSIONS } from './ascension';
import { CARVES, CARVE_IDS } from './carves';
import { GRADE_NAME } from './grades';
import { PARTS, PART_IDS, PART_SLOTS } from './parts';
import { ACT_NAMES, BOSSES, DECK_MAX, FLOORS_PER_ACT, TOTAL_FLOORS, type BossId } from './run';
import { BOSS_TWIST, TWISTS } from './twists';

/**
 * 규칙서 (D-126, 규격 2.0): 메인 메뉴 · 도감 옆에서 책자처럼 넘겨 보는 규칙 설명. 목록은 각 data 파일에서 끌어온다.
 * 말투: 설명은 「~다」 평서문 (존댓말 없음). 2.0은 시스템이 적다 — 장도 적다.
 */
export interface RulePage {
  title: string;
  icon: string;
  /** 문단 (HTML 허용: <b> 강조 · <ul> 목록) */
  body: string[];
}

const list = (rows: string[]) => `<ul>${rows.map((r) => `<li>${r}</li>`).join('')}</ul>`;

export const RULEBOOK: RulePage[] = [
  {
    title: '출하',
    icon: 'flag',
    body: [
      `불량 판정을 받은 기물 몇 기로 공장을 거슬러 오른다. ${ACT_NAMES.join(' → ')} — 공정마다 ${FLOORS_PER_ACT}층, 모두 ${TOTAL_FLOORS}층.`,
      `공정 끝마다 <b>반장</b>, ${TOTAL_FLOORS}층에 <b>도금왕</b>. 도금왕을 쓰러뜨리면 출하가 끝난다.`,
      '대국에서 지면 출하가 끝난다. 쓰러진 기물은 다음 대국에 다시 선다. 잃는 것은 대국 하나다.',
      '지도에서 층마다 칸 하나를 고른다: 대국 · 검문! · 고물상 · 공방 · 돌발.',
    ],
  },
  {
    title: '대국',
    icon: 'sword',
    body: [
      '내 기물을 누르면 <b>점</b>(갈 칸)과 <b>붉은 과녁</b>(가서 칠 칸)이 보인다.',
      '<b>움직인 기물만 친다.</b> 공격은 내려앉은 자리에서 그 기물의 공격 모양으로 나간다.',
      '예약은 테이프에 쌓인다. <b>가동</b>을 누르면 순서대로 움직이고 친다. 되돌리기 · 초기화는 늘 같은 자리.',
      '적 킹을 쓰러뜨리면 이긴다. 내 킹이 쓰러지면 진다.',
    ],
  },
  {
    title: '태엽 · 순서',
    icon: 'windkey',
    body: [
      '<b>태엽</b> = 한 턴에 쓸 힘(기본 5). 기물마다 움직이는 데 드는 태엽이 다르다. 폰 1 · 나이트 · 비숍 2 · 룩 3 · 퀸 4.',
      '두 기 이상 예약하면 <b>#1 → #2</b> 순서. <b>앞 순번이 쓰러뜨릴 때마다 그 턴의 뒤 공격이 10%씩 세진다</b> (네 번까지). 순서가 곧 화력이다.',
      '앞 순번이 비켜 주면 뒤 기물의 사선이 열린다.',
    ],
  },
  {
    title: '체크 · 적의 수',
    icon: 'crown',
    body: [
      '<b>체크</b>: 킹은 한 턴에 한 번은 HP 1로 버틴다. 다음에 맞으면 끝난다. 내 킹도 적 킹도.',
      '<b>붉은 화살표</b> = 지금 가동하면 적이 둘 수. 깜빡이는 HP = 잃을 몫. 적을 누르면 다음 턴에 닿는 칸이 보인다.',
      '아무도 맞지 않는 라운드가 이어지면 <b>판이 무너진다</b>. 칸 위의 기물은 밀려나며 조금 다친다.',
    ],
  },
  {
    title: '군단',
    icon: 'crate',
    body: [
      `군단은 덱이다. 기물을 얻고 · 팔고 · 다듬는다. 최대 ${DECK_MAX}기.`,
      '일반 대국을 이기면 기물 둘과 각인 하나 중 하나를 고른다. 건너뛰면 나사.',
      '공방에서는 기물 하나를 한 단계 위로 다듬을 수 있다 (폰 → 나이트 · 비숍, 나이트 · 비숍 → 룩, 룩 → 퀸).',
    ],
  },
  {
    title: '각인',
    icon: 'star',
    body: [
      '기물 하나에 <b>각인 하나</b>. 판 위 기물 왼쪽 위 글자가 각인이다. 새로 새기면 있던 각인은 사라진다.',
      list(CARVE_IDS.map((id) => `<b>${CARVES[id].mark} ${CARVES[id].name}</b> — ${CARVES[id].desc}`)),
      '대국 보상 · 고물상 · 공방 · 돌발에서 얻는다.',
    ],
  },
  {
    title: '부품',
    icon: 'wrench',
    body: [
      `규칙을 비트는 부품. <b>${PART_SLOTS}칸</b>. 등급은 ${Object.values(GRADE_NAME).join(' · ')}.`,
      '검문! · 반장 · 고물상 · 돌발에서 얻는다. 칸이 차면 하나를 뜯어내야 한다.',
      list(PART_IDS.filter((id) => PARTS[id].grade === 'epic').map((id) => `<b>${PARTS[id].name}</b> (에픽) — ${PARTS[id].desc}`)),
    ],
  },
  {
    title: '검문! · 양날 한 쌍',
    icon: 'skull',
    body: [
      '<b>검문!</b> = 적 기물이 하나 더, 그중 하나는 <b>정예</b>(왕관 표식, HP 두 배). 적은 수치로만 세지고 숨은 규칙은 없다.',
      '검문! · 반장을 넘기면 <b>양날 한 쌍</b> 셋 중 하나: 부품 하나를 받는 대신, 출하 끝까지 적도 무언가를 받는다.',
    ],
  },
  {
    title: '반장',
    icon: 'crown',
    body: [
      '반장마다 <b>비틀기 하나</b>. 지도 오른쪽 반장 카드에 공정 시작부터 보이고, 누르면 무엇을 준비할지 알려 준다.',
      list([...(Object.keys(BOSSES) as BossId[]).map((id) => `<b>${BOSSES[id].name}</b> — ${TWISTS[BOSS_TWIST[id]].name}: ${TWISTS[BOSS_TWIST[id]].desc}`), `<b>도금왕</b> — ${TWISTS.gild.name}: ${TWISTS.gild.desc}`]),
    ],
  },
  {
    title: '압력',
    icon: 'flame',
    body: ['출하를 끝낼 때마다 다음 압력이 열린다. 효과는 쌓인다.', list(ASCENSIONS.slice(1).map((a, i) => `<b>${i + 1}</b> — ${a}`))],
  },
];
