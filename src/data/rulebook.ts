import { ASCENSIONS } from './ascension';
import { CONTRACTS } from './contracts';
import { GRADE_NAME } from './grades';
import { AFFIXES, WEAKS } from './legions';
import { LEGENDS, RESONANCES } from './legends';
import { LINES } from './lines';
import { ACT_NAMES, BOSSES, FLOORS_PER_ACT, TOTAL_FLOORS } from './run';
import { TACTICS } from './tactics';
import { TERRAIN } from './terrain';
import { FORMATIONS } from './formations';

/**
 * 규칙서 (D-126): 메인 메뉴 · 도감 옆에서 책자처럼 넘겨 보는 규칙 설명. 목록 데이터는 각 data 파일에서 그대로 끌어온다 (숫자가 바뀌면 같이 바뀐다).
 * 말투: 설명은 「~다」 평서문 (CLAUDE.md 11의 서술 줄과 같은 결, 존댓말 없음).
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
      `공정 끝마다 <b>반장</b>, ${TOTAL_FLOORS}층에 <b>도금왕</b>. 도금왕을 쓰러뜨리면 <b>정품 출하</b>.`,
      '대국에서 지면 출하가 끝난다. 쓰러진 기물은 다음 대국에 다시 선다 — 잃는 것은 대국 하나다.',
      '지도에서 층마다 칸 하나를 고른다: 대국 · 검문! · 고물상 · 공방 · 뽑기 기계 · 돌발 · 묘수.',
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
      '기물을 길게 누르면 HP · ATK · 개조 · 접사 · 약점이 보인다.',
    ],
  },
  {
    title: '태엽 · 순서',
    icon: 'windkey',
    body: [
      '<b>태엽</b> = 한 턴에 쓸 힘. 기물마다 움직이는 데 드는 태엽이 다르다 (폰이 가장 싸고 퀸이 가장 비싸다).',
      '두 기 이상 예약하면 <b>#1 → #2</b> 순서. 앞 순번이 쓰러뜨리면 그 턴의 다음 공격이 세진다.',
      '앞 순번이 비켜 주면 뒤 기물의 사선이 열린다 (사선 개척). 앞이 쓰러뜨려 비운 칸에 뒤가 내려앉으면 돌파.',
    ],
  },
  {
    title: '체크 · 적의 수',
    icon: 'crown',
    body: [
      '<b>체크</b>: 킹은 한 턴에 한 번은 HP 1로 버틴다. 다음에 맞으면 끝 — 내 킹도, 적 킹도.',
      '<b>붉은 화살표</b> = 적이 다음에 둘 수 (테이프 감청). 맞을 몫이 내 HP 게이지에서 깜빡인다.',
      '<b>폰 받아치기</b>: 대각선에 적이 있는 폰은 움직이지 않고 태엽 1로 친다 — 적 폰도 같다.',
    ],
  },
  {
    title: '전술 키워드',
    icon: 'fork',
    body: ['수 하나에 이름이 붙으면 그 위에 배너가 뜨고 기록 줄에 남는다. 키워드 연계 개조는 이 수에서 힘을 낸다.', list(Object.values(TACTICS).map((t) => `<b style="color:${t.color}">${t.name}</b> — ${t.desc}`))],
  },
  {
    title: '판의 압박',
    icon: 'bricks',
    body: [
      '피해 없는 라운드가 이어지면 <b>정체</b>가 쌓이고, 다 차면 판 가장자리부터 바닥이 꺼진다.',
      '<b>요충지</b>를 점거해 버티면 가호(ATK · DEF)를 받는다.',
      '기준 턴 안에 이기면 <b>빠른 승리</b> 나사가 붙는다.',
    ],
  },
  {
    title: '지형',
    icon: 'anvil',
    body: ['2공정부터 판 위에 칸 효과가 깔린다. 양 진영에 똑같이.', list(Object.values(TERRAIN).map((t) => `<b style="color:${t.color}">${t.name}</b> — ${t.desc}`))],
  },
  {
    title: '군단',
    icon: 'flag',
    body: [
      '<b>거푸집 개량</b>(공방): 그 유형이 모두 강해진다. +5 완성 거푸집은 대국 시작 방열판.',
      '<b>이형</b>: +3부터 가진 <b>도면</b>으로 기물을 다른 꼴로 붓는다 — 강점과 대가가 함께. 도면은 검문! · 반장 · 뽑기 · 고물상에서.',
      '<b>진형</b>(군단 보기): 대국 시작 배치.',
      list(Object.values(FORMATIONS).map((f) => `<b>${f.name}</b> — ${f.desc}`)),
      '<b>결함</b>: 돌발의 대가로 기물이 손상되거나 봉인된다. 공방에서 수리한다.',
    ],
  },
  {
    title: '라인',
    icon: 'swap',
    body: ['시작 세트마다 라인이 정해진다. 라인 특성 하나, 그리고 그 라인 기물을 미는 개조 · 에픽이 더 잘 나온다.', list(Object.values(LINES).map((l) => `<b>${l.name}</b> — ${l.trait}`))],
  },
  {
    title: '개조 · 등급',
    icon: 'wrench',
    body: [
      '<b>개조</b>는 6칸. 같은 개조를 다시 얻으면 단이 오른다 — 3단은 <b>★ 걸작</b>.',
      `등급: ${Object.values(GRADE_NAME).join(' · ')}. 3지선다는 칸마다 등급을 먼저 굴린다. 유니크가 안 나오면 다음 칸의 유니크 확률이 조금씩 오른다.`,
      '<b>공방 덜어내기</b>: 분해(나사 환급) · 재주조(같은 등급 다른 개조, 방문마다 한 번) · 카드 파쇄.',
      '<b>천공 카드</b>는 4칸. 철 카드는 냉각 · 대국당 횟수, 종이 카드는 한 번 쓰면 탄다.',
    ],
  },
  {
    title: '에픽 부품',
    icon: 'star',
    body: [
      '규칙을 통째로 바꾸는 한 장. 슬롯 2칸. 반장 상자 · 검문! · 고물상 맨 위 칸에서 드물게.',
      list(Object.values(LEGENDS).map((l) => `<b style="color:#ffb35c">${l.name}</b> (${l.concept}) — ${l.desc}`)),
      '<b>공명</b>: 정해진 두 에픽을 함께 가지면 한 줄이 더 붙는다.',
      list(RESONANCES.map((r) => `<b>${r.name}</b> (${LEGENDS[r.pair[0]].name} + ${LEGENDS[r.pair[1]].name}) — ${r.desc}`)),
    ],
  },
  {
    title: '계약',
    icon: 'scale',
    body: ['반장을 해체하면 계약서 두 장 중 하나에 서명하거나 건너뛴다. 이득과 대가가 함께 온다.', list(Object.values(CONTRACTS).map((c) => `<b>${c.name}</b> — ${c.gain} · <span class="bad">대가: ${c.cost}</span>`))],
  },
  {
    title: '검문! · 접사',
    icon: 'skull',
    body: ['검문!은 정예 군단. 지도에서 그 군단이 다는 이형(도면)이 미리 보인다. 이기면 도면 · 영입 · 카드.', list(Object.values(AFFIXES).map((a) => `<b style="color:${a.color}">${a.name}</b> — ${a.desc}`))],
  },
  {
    title: '반장 · 약점',
    icon: 'reticle',
    body: [
      '반장은 출하마다 여섯 중 둘. 지도 오른쪽 반장 카드에서 공정 시작부터 볼 수 있다 — 누르면 준비할 것.',
      list(Object.values(BOSSES).map((b) => `<b>${b.name}</b> — ${b.title}${b.weakness ? ` · <span style="color:#7dd3fc">약점: ${WEAKS[b.weakness.id].name}</span> (${WEAKS[b.weakness.id].desc})` : ''}`)),
      '도금왕은 약점이 없다.',
    ],
  },
  {
    title: '나사',
    icon: 'screw',
    body: [
      '대국을 이기면 나사. <b>보관 이자</b>: 이길 때 들고 있던 나사 50마다 +5 (최대 25) — 모을지, 쓸지.',
      '<b>주문서</b>: 대국마다 하나. 해내면 나사가 더 붙는다.',
      '고물상 값은 공정이 오를수록 비싸진다. 뽑기 기계는 나사를 먹고 운을 준다.',
    ],
  },
  {
    title: '압력',
    icon: 'flame',
    body: ['출하를 끝낼 때마다 보일러 압력이 한 단계 열린다. 빌드는 빼앗지 않고, 판만 거칠어진다.', list(ASCENSIONS.map((a, i) => `<b>압력 ${i}</b> — ${a}`))],
  },
];
