import type { PieceType } from '../engine';
import { Rng } from '../engine/rng';

/**
 * 분대원 정체성 (R2 애착, D-153 — 레퍼런스 6권: 이름 1 + 기벽 1 + 짧은 말 한 줄이면 인격이 생긴다).
 * 공장 세계관: 출하 시리얼 + 검수관이 붙인 이름(개명 가능) + 「불량 검수 사유」 = 기벽 (양날).
 */
export type QuirkId = 'overwound' | 'welded' | 'lens' | 'boiler' | 'brake' | 'grudge' | 'stubborn' | 'screw';

export interface QuirkDef {
  name: string;
  /** 불량 검수 사유 (검수관 말투, 짧고 차갑게) */
  reason: string;
  /** 효과 한 줄 (장점 · 단점) */
  desc: string;
  /** 공격 배율 */
  atk?: number;
  /** 최대 HP 배율 */
  hp?: number;
  /** 대국 시작 방열판 */
  shield?: number;
  /** 죽음의 문턱 횟수 (기본 1) */
  doors?: number;
}

export const QUIRKS: Record<QuirkId, QuirkDef> = {
  overwound: { name: '과감김 태엽', reason: '태엽을 세 바퀴 더 감았다.', desc: '공격 ×1.3 · 최대 HP −20%', atk: 1.3, hp: 0.8 },
  welded: { name: '납땜된 흉갑', reason: '가슴판을 대충 땜질했다.', desc: '대국마다 방열판 12 · 공격 ×0.85', shield: 12, atk: 0.85 },
  lens: { name: '어긋난 유리 눈', reason: '초점이 반 칸 틀어졌다.', desc: '처치하면 카드 한 장 · 최대 HP −15%', hp: 0.85 },
  boiler: { name: '새는 보일러', reason: '증기가 샌다. 언제 터질지 모른다.', desc: '쓰러지면 둘레 적에게 20 · 문턱 없음', doors: 0 },
  brake: { name: '풀린 브레이크', reason: '멈추지 못한다.', desc: '처치하면 태엽 +1 (턴에 한 번) · 최대 HP −25%', hp: 0.75 },
  grudge: { name: '원한의 톱니', reason: '맞은 것을 기억한다.', desc: '맞으면 다음 공격 ×2 · 최대 HP −10%', hp: 0.9 },
  stubborn: { name: '고집 센 축', reason: '쓰러져도 다시 선다.', desc: '문턱 두 번 · 공격 ×0.85', doors: 2, atk: 0.85 },
  screw: { name: '덤 나사', reason: '나사 하나가 남았다.', desc: '이기면 나사 +10 · 최대 HP −10%', hp: 0.9 },
};

/** 수치 (data — 근거 D-153) */
export const CREW = { boilerBlast: 20, screwBonus: 10, heirloomScrews: 50, scarAfterBattles: 3, nickAfterKills: 5 };

/** 검수관이 붙이는 이름 풀 (공장 · 고물 말투) */
const NAMES = ['고철이', '나사못', '톱니', '녹슨발', '삐걱이', '땜쟁이', '굴대', '쇠뭉치', '반쪽', '덜컹이', '찌그렁', '용수철', '볼트', '너트', '쇳조각', '기름통', '헛바퀴', '못난이', '깡통', '절름발'];

/** 마지막 말 (작은 인물 대사 — 짧고 차갑게, 따옴표) */
export const LAST_WORDS = ['“태엽이… 다 풀렸다.”', '“여기까지.”', '“나사 하나만… 남겨 둬.”', '“먼저 간다.”', '“불량이 맞았네.”', '“멈춘다.”', '“용광로는… 따뜻하겠지.”', '“다음 출하에서.”'];

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
  /** 흉터 · 상속 기록 (자동으로 붙는다) */
  scars?: string[];
  /** 업적 별명 (자동) */
  nick?: string;
}

/** 폐기 원부 한 줄 (영구 기록) */
export interface LedgerEntry {
  serial: string;
  name: string;
  t: PieceType;
  quirk?: QuirkId;
  kills: number;
  battles: number;
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
