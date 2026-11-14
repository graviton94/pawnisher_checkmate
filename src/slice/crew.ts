import type { PieceType } from '../engine';
import { Rng } from '../engine/rng';

/**
 * 분대원 정체성 (R2 애착, D-153 — 레퍼런스 6권: 이름 1 + 기벽 1 + 짧은 말 한 줄이면 인격이 생긴다).
 * 공장 세계관: 출하 시리얼 + 검수관이 붙인 이름(개명 가능) + 「하자 검수 사유」 = 기벽 (양날).
 */
export type QuirkId = 'overwound' | 'welded' | 'stubborn' | 'boiler' | 'heavy' | 'rusty' | 'spare' | 'glass';

export interface QuirkDef {
  name: string;
  /** 효과 한 줄 (짧게 — 카드 · 칩에 잘리지 않게) */
  desc: string;
  /** 공격 배율 */
  atk?: number;
  /** 최대 HP 배율 */
  hp?: number;
  /** 대국 시작 방열판 */
  shield?: number;
  /** 죽음의 생명 횟수 (기본 0 — D-217: 모두에게 주던 생명 1을 없앴다, 기벽 · 사건 · 부품으로만) */
  doors?: number;
}

/** 기벽 8종 (D-155: 8 → 4, 눈에 보이는 수치만 — 숨은 발동 조건은 뺐다 · D-275: 사용자 「12종은 복잡」 → 4종 더해 8, 저마다 수치 하나를 맞바꾼다) */
export const QUIRKS: Record<QuirkId, QuirkDef> = {
  overwound: { name: '과하게 감긴 태엽', desc: '공격 ×1.3 · HP −20%', atk: 1.3, hp: 0.8 },
  welded: { name: '납땜 흉갑', desc: '방열판 12 · 공격 −15%', shield: 12, atk: 0.85 },
  stubborn: { name: '고집 센 축', desc: '생명 2 · 공격 −15%', doors: 2, atk: 0.85 },
  boiler: { name: '새는 보일러', desc: '쓰러지면 둘레 폭발 20', doors: 0 },
  heavy: { name: '무거운 받침', desc: 'HP +30% · 공격 −20%', hp: 1.3, atk: 0.8 },
  rusty: { name: '녹슨 관절', desc: '방열판 20 · HP −20%', shield: 20, hp: 0.8 },
  spare: { name: '여분 톱니', desc: '생명 1 · HP −15%', doors: 1, hp: 0.85 },
  glass: { name: '유리 렌즈', desc: '공격 ×1.4 · HP −35%', atk: 1.4, hp: 0.65 },
};

/** 수치 (data — 근거 D-153) */
/** 흉터 풀이 (D-364): 흉터는 이력이 남긴 자국 — 효과는 없고 이야기만 */
export const SCAR_DESC: Record<string, string> = { '주조 흠집': '주조 흠집. 전투 효과 없음', '납땜 자국': '생명으로 쓰러짐을 버틴 적이 있다', '용접 흉터': '대국 셋을 넘게 싸워 살아남았다' };
/** pawnHp (D-466): 우리 분대원 폰만 HP ×이만큼 — 적 폰은 그대로. 보병 축이 폰 몸이 약해 한꺼번에 녹아내렸다 */
export const CREW = { pawnHp: 1.7, boilerBlast: 20, heirloomScrews: 50, scarAfterBattles: 3, nickAfterKills: 5 };

/** 이름 풀: 상태를 묘사하는 별칭 (다키스트 던전식, D-158 — 사용자 예시: 먼지투성이 · 구부러진 못 …) */
export const NAMES = ['먼지투성이', '구부러진 못', '이 나간 톱니', '벗겨진 페인트', '삐걱거리는 경첩', '괴팍한 흠집', '쇳소리 뭉치', '흠집투성이', '기울어진 축', '금 간 렌즈', '헐거운 나사', '그을린 장갑', '덜컹이는 바퀴', '찢긴 가죽끈', '굽은 지렛대', '새는 기름통', '휘어진 창살', '깨진 문자판', '눌어붙은 용접', '끊어진 태엽'];

/** 쓰러질 때 (D-158): 2인칭 서술 한 줄 + 아래 각주 대사 (사용자 예시) */
export const DEATHS: { narr: string; line: string }[] = [
  // D-451 (바이블 PART III-1): 2인칭 → 3인칭 과거형, 겹치던 서술(2 · 3)을 나눴다
  { narr: '태엽이 다 풀렸다. 눈이 천천히 감겨 왔다.', line: '“한 번만 더 기회가 있었더라면…”' },
  { narr: '용광로의 열기가 등 뒤까지 다가왔다.', line: '“역시 하자품이었군.”' },
  { narr: '쇳물 끓는 소리가 발밑까지 차올랐다.', line: '“정말 여기까지인가…”' },
  { narr: '축이 꺾였다.', line: '“정녕 제가 틀렸단 말입니까.”' },
  { narr: '집게가 그를 들어 올렸다.', line: '“아직… 움직일 수 있는데.”' },
  { narr: '톱니가 하나씩 멈췄다.', line: '“대장, 먼저 갑니다.”' },
];

/** 분대원 (대국 사이로 이어진다) */
export interface Crew {
  t: PieceType;
  hp?: number;
  /** 출하 시리얼 #P-203 */
  serial?: string;
  name?: string;
  quirk?: QuirkId;
  kills?: number;
  battles?: number;
  /** 승리한 대국에서 생존한 횟수. 옛 battles를 승리로 추정하지 않는다. */
  wins?: number;
  /** 직접 나눈 방열판이 실제 적 피해를 흡수한 양. */
  protectedDamage?: number;
  /** 누적 준 피해 (D-363) */
  dmg?: number;
  /** 생명으로 죽음을 넘긴 횟수 (D-363) */
  defied?: number;
  /** 흉터 · 상속 기록 (자동으로 붙는다) */
  scars?: string[];
  /** 업적 별명 (자동) */
  nick?: string;
  /** 이 분대원만 갖는 영구 생명 (D-217 — 사건 「떠돌이 땜장이」 등) */
  doors?: number;
  /** 심장 톱니 하나가 깨졌다 (D-219 목숨 둘) — 이 상태로 또 쓰러지면 폐기. 작업대 · 막이 바뀌면 고쳐진다 */
  cracked?: boolean;
  /** 단련 (D-459 사건): 이 분대원만의 영구 공격 + */
  temper?: number;
}

/** 폐기 원부 한 줄 (영구 기록) */
export interface LedgerEntry {
  serial: string;
  name: string;
  t: PieceType;
  quirk?: QuirkId;
  kills: number;
  battles: number;
  dmg?: number;
  wins?: number;
  protectedDamage?: number;
  defied?: number;
  nick?: string;
  cause: string;
  run: string;
}

/** 새 분대원: 시리얼 · 이름 · 기벽 (킹은 기벽 없이 「대장」) */
export const makeCrew = (t: PieceType, rng: Rng, taken: string[] = [], avoid: QuirkId[] = []): Crew => {
  const serial = `#${t}-${100 + rng.int(900)}`;
  if (t === 'K') return { t, serial, name: '대장', kills: 0, battles: 0, scars: [] };
  const free = NAMES.filter((n) => !taken.includes(n));
  const name = (free.length ? free : NAMES)[rng.int((free.length ? free : NAMES).length)];
  const all = Object.keys(QUIRKS) as QuirkId[];
  const ids = all.filter((q) => !avoid.includes(q)).length ? all.filter((q) => !avoid.includes(q)) : all;
  return { t, serial, name, quirk: ids[rng.int(ids.length)], kills: 0, battles: 0, scars: [] };
};

/** 화면에 부르는 이름: 별명이 있으면 「고철이 "폰 분쇄기"」 */
export const crewLabel = (c: Crew): string => `${c.name ?? '이름 없음'}${c.nick ? ` 「${c.nick}」` : ''}`;
