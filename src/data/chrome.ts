import { josa } from './josa';
import { localize } from './locale';
import { CHROME_EN } from './lang/en-ui';

/**
 * 대국 화면 크롬 글 (D-652 — main.ts에 박혀 있던 HUD · 엿보기 · 손패 · 기록 글을 옮김. 한국어 글은 예전과 한 글자도 다르지 않다).
 * 말투 docs/voice.md — ③ 독백 ‘ ’ · ① 시스템 합니다체 · ⑧ 단추 동사 하나 · ⑨ 표지.
 * 기물 이름(`PIECE_NAMES_KO`)은 카드 영역이라 아직 한국어로 들어온다 — 영어 표는 이름을 그대로 끼운다.
 */
export const CHROME_KO = {
  /** 턴 명패 (턴 · 열기는 HUD_TEXT.turnHeat) */
  battleOver: '대국 끝',
  enemyTurn: '적 차례',
  moving: '움직이는 중',
  /** 손패가 빈 레일 (③ 독백) */
  handEmpty: '‘손패가 없어.’',
  /** 태엽 계기 꼬리표 */
  apLabel: '태엽',
  /** 이동 미리보기 엿보기 */
  peek: {
    ap: (a: number, b: number) => `태엽 ${a} → ${b}`,
    shield: (a: number, b: number) => `방열판 ${a} → ${b}`,
    hit: (name: string, dmg: number, hp: number) => `적 ${name} · 피해 ${dmg} · HP ${hp}`,
    noTarget: '공격 대상 없음',
    more: (n: number) => `그 밖에 ${n}기 피격`,
  },
  /** 기물 정보 엿보기 */
  unit: {
    foe: '적 기물',
    ally: '지원 기물',
    form: (piece: string) => ` · 이형(${piece} 카드)`,
    elite: ' · 정예',
    order: (n: number) => `${n}번째로 움직임`,
    wait: '대기',
    hp: '체력',
    hpPart: (part: string) => `체력 · ${part}`,
    shield: '방열판',
    atk: '공격력',
    def: '방어력',
  },
  /** 손패 카드가 꺼진 까닭 (한 줄) */
  cardOff: {
    needAp: (n: number) => `태엽 ${n} 필요`,
    march: '앞으로 갈 폰 없음',
    spend: '쌓인 연쇄 없음',
    draft: '킹 곁에 빈 칸 없음',
    gambit: '바칠 폰 없음',
    swap: '캐슬링할 룩 없음',
    move: '움직일 기물 없음',
    cantNow: '지금은 쓸 수 없음',
    tapAgain: '한 번 더 누르면 사용',
  },
  /** 카드를 눌렀는데 못 쓸 때 (③ 독백) */
  mono: {
    noAp: '‘태엽이 모자라.’',
    noMarch: '‘앞으로 갈 폰이 없어.’',
    cantNow: '‘지금은 쓸 수 없어.’',
    noPiece: '‘움직일 기물이 없어.’',
    noPieceOf: (piece: string) => `‘${josa(piece, '이')} 없거나, 갈 칸이 없어.’`,
    noCardFor: (piece: string) => `‘${josa(piece, '을')} 움직일 카드가 없어.’`,
  },
  /** 지난 기록 엿보기 머리 줄 */
  logTurn: (turn: number, foe: boolean) => `${turn}턴 · ${foe ? '적' : '나'}`,
  /** 킹이 쓰러졌다 (M 창) */
  kingDown: {
    title: '하자 폐기',
    spare: (charm: string, at: string) => `킹이 쓰러졌습니다. ${josa(charm, '을')} 깨면 ${at}부터 다시 둡니다. 분대의 상처는 그대로입니다.`,
    over: '킹이 쓰러졌습니다. 출하는 여기서 끝납니다.',
    quit: '끝낸다',
    again: '다시 둔다',
  },
  /** 원부 (쓰러진 분대원 기록) */
  ledger: {
    lead: '쓰러진 분대원의 기록입니다. 지워지지 않습니다.',
    count: (n: number) => `기록 ${n}`,
    row: (name: string, serial: string, kills: number, battles: number) => `${name} · ${serial} · 처치 ${kills} · 대국 ${battles}`,
    none: '‘아직 아무도 잃지 않았어.’',
    back: '돌아간다',
    close: '닫는다',
  },
};

export const CHROME_TEXT = localize(CHROME_KO, CHROME_EN);

/** 손패 카드가 꺼진 까닭 한 줄 (태엽 부족 → 카드 종류별 → 그 밖) — 예전 main.ts 두 곳의 같은 식을 하나로 */
export const cardOffWhy = (kind: string, cost: number, poor: boolean, ok: boolean): string => {
  const o = CHROME_TEXT.cardOff;
  if (poor) return o.needAp(cost);
  if (ok) return '';
  return kind === 'march' ? o.march : kind === 'spend' ? o.spend : kind === 'draft' ? o.draft : kind === 'gambit' ? o.gambit : kind === 'swap' ? o.swap : o.move;
};
