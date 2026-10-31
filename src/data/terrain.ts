/**
 * 지형 칸 (GDD 11장 A2 · 13장 4단계, D-097): 양 진영에 같게 작용한다. 이름은 공장 바닥의 물건 (docs/world.md).
 * 수치 🔧 — 밸런스 패스에서 맞춘다 (D-080).
 */
export type TerrainId = 'platform' | 'shelter' | 'magnet' | 'screws' | 'lit';

export interface TerrainDef {
  name: string;
  /** public/ui/icons 이름 */
  icon: string;
  color: string;
  desc: string;
}

export const TERRAIN: Record<TerrainId, TerrainDef> = {
  platform: { name: '발판', icon: 'anvil', color: '#F59E0B', desc: '여기서 치는 공격 피해 +30%.' },
  shelter: { name: '방호판', icon: 'shield', color: '#7DD3FC', desc: '위에 선 기물이 받는 피해 −20%.' },
  magnet: { name: '자석판', icon: 'claw', color: '#C4B5FD', desc: '내려앉은 기물은 다음 자기 턴에 못 움직인다. 한 번 붙잡으면 사라진다.' },
  screws: { name: '나사 더미', icon: 'screw', color: '#FACC15', desc: '내 기물이 내려앉으면 나사 +15. 적이 밟으면 흩어진다.' },
  lit: { name: '조명 칸', icon: 'eye', color: '#FDE68A', desc: '위에 선 기물이 받는 피해 +20%. 숨을 곳이 없다.' },
};

export const TERRAIN_FX = {
  platformMult: 1.3,
  shelterCut: 0.8,
  litMult: 1.2,
  screwsGold: 15,
} as const;

/** 일반·검문! 판에 까는 지형 쌍 수 (점대칭 한 쌍 = 2칸). Act 1 일반 대국은 맨바닥 */
export const terrainPairs = (act: number, kind: 'battle' | 'elite' | 'boss'): number => {
  if (kind === 'boss') return 0; // 반장 판은 전장 규칙이 정한다
  if (act === 1) return kind === 'elite' ? 1 : 0;
  return kind === 'elite' ? 2 : 1;
};

/** 나사 더미가 깔릴 확률 (Act 2부터, 대칭 아님) */
export const SCREWS_CHANCE = 0.5;

export type ArenaId = 'hooves' | 'lens' | 'wall' | 'final' | 'belt' | 'scrapyard' | 'checkpoint';

type Tile = { x: number; y: number };

export interface ArenaDef {
  /** 전장 규칙 이름 · 한 줄 (지도 반장 카드 · 대국 시작에 뜬다) */
  name: string;
  desc: string;
  /** 판 크기 → 지형 (양 진영에 같게, 점대칭) */
  terrain: (w: number, h: number) => (Tile & { kind: TerrainId })[];
  /** 처음부터 무너진 칸 (폐허) */
  ruins?: (w: number, h: number) => Tile[];
  /** 바닥 꺼짐 시작을 늦추는 대국 수 */
  collapseDelay?: number;
}

const mirror = <T extends Tile>(w: number, h: number, list: T[]): T[] => list.flatMap((t) => [t, { ...t, x: w - 1 - t.x, y: h - 1 - t.y }]);

/**
 * 반장 전장 규칙 (GDD 11장 A5, D-097): 양 진영에 같게 적용되고, 반장의 군단이 그 규칙에 맞게 짜여 있어 유리할 뿐이다.
 */
export const ARENAS: Record<ArenaId, ArenaDef> = {
  // 나이트 반장: 판 양옆 끝줄이 발판 — L자로 뛰어든 기병이 옆에서 세게 친다
  hooves: {
    name: '발굽 자국',
    desc: '양옆 끝줄이 발판. 거기서 치면 +30%.',
    terrain: (w, h) => Array.from({ length: h - 4 }, (_, i) => [{ x: 0, y: 2 + i, kind: 'platform' as const }, { x: w - 1, y: 2 + i, kind: 'platform' as const }]).flat(),
  },
  // 비숍 반장: 두 긴 대각선 가운데가 조명 칸 — 사선 위에 서면 더 아프다
  lens: {
    name: '렌즈 조명',
    desc: '두 긴 대각선이 조명 칸. 거기 선 기물은 피해 +20%.',
    terrain: (w, h) => {
      const out: (Tile & { kind: TerrainId })[] = [];
      for (let y = 2; y <= h - 3; y++) {
        for (const x of [y, w - 1 - y]) if (x >= 0 && x < w && !out.some((t) => t.x === x && t.y === y)) out.push({ x, y, kind: 'lit' });
      }
      return out;
    },
  },
  // 룩 반장: 가운데 가로줄에 폐허 — 막힌 성벽을 돌아가거나 뚫어야 한다. 바닥 꺼짐도 늦다
  wall: {
    name: '성벽',
    desc: '가운데에 무너진 성벽 4칸. 바닥 꺼짐이 3대국 늦다.',
    terrain: () => [],
    ruins: (w, h) => mirror(w, h, [{ x: 1, y: Math.floor(h / 2) - 1 }, { x: 2, y: Math.floor(h / 2) - 1 }]),
    collapseDelay: 3,
  },
  // 폰 반장 (D-106): 가운데 두 줄에 방호판 — 물량 행렬이 그 뒤에 숨는다
  belt: {
    name: '방호 라인',
    desc: '가운데 두 줄 방호판 6칸(−20%). 물량이 그 뒤에 숨는다.',
    terrain: (w, h) => mirror(w, h, [1, 3, 5].filter((x) => x < w).map((x) => ({ x, y: Math.floor(h / 2) - 1, kind: 'shelter' as const }))),
  },
  // 이형 반장: 고철장 — 발판 두 쌍 · 자석판 한 쌍
  scrapyard: {
    name: '고철장',
    desc: '발판 두 쌍(+30%), 자석판 한 쌍(붙잡히면 한 턴 쉰다).',
    terrain: (w, h) => [
      ...mirror(w, h, [{ x: 1, y: 2, kind: 'platform' as const }, { x: w - 3, y: 3, kind: 'platform' as const }]),
      ...mirror(w, h, [{ x: Math.floor(w / 2), y: Math.floor(h / 2) - 1, kind: 'magnet' as const }]),
    ],
  },
  // 검문 반장: 검문선 — 가운데 가로로 자석판 두 쌍
  checkpoint: {
    name: '검문선',
    desc: '가운데에 자석판 두 쌍. 넘어오면 한 턴 붙잡힌다.',
    terrain: (w, h) => mirror(w, h, [2, w - 3].map((x) => ({ x, y: Math.floor(h / 2) - 1, kind: 'magnet' as const }))),
  },
  // 도금왕: 네 귀퉁이 방호판 + 한가운데 조명 칸 — 숨을 곳과 드러나는 곳
  final: {
    name: '최종 검수대',
    desc: '귀퉁이 넷은 방호판(−20%), 한가운데 넷은 조명 칸(+20%).',
    terrain: (w, h) => [
      ...mirror(w, h, [{ x: 2, y: 2, kind: 'shelter' as const }, { x: w - 3, y: 2, kind: 'shelter' as const }]),
      ...mirror(w, h, [{ x: w / 2 - 1, y: h / 2 - 1, kind: 'lit' as const }, { x: w / 2, y: h / 2 - 1, kind: 'lit' as const }]),
    ],
  },
};
