import { BOSS, BOSS_NUM, FOE_TRAITS, TRAIT, type BossRule, type FoeTrait } from '../slice/cards';
import { PART_NUM, SLICE_PARTS, type SlicePartId } from '../slice/parts';
import type { PieceType } from '../engine';

/** 능력 표시 계약: 명칭·조건/행동·상세 효과 세 줄. 수치는 전투 데이터에서 읽는다. */
export interface AbilityText { name: string; description: string; effect: string }

/** 반장의 모든 규칙을 한 능력씩 읽는다. 보조 철갑도 생략하지 않는다. */
export const bossAbilityText = (rule: BossRule, alarm = 0, damage = (n: number) => n): AbilityText[] => {
  const armor = { name: '철갑', description: `${BOSS.plateEvery}턴마다 방열판 재생`, effect: `방열판 최소 ${BOSS.plate}로 충전` };
  const spawn = { name: '조립', description: '1턴부터 홀수 턴, 반장 곁', effect: `폰 1기 생성 · 최대 ${BOSS_NUM.spawnMax}기` };
  const bomb = { name: '줄 폭격', description: `${BOSS.bombFirst}턴부터 ${BOSS.bombEvery}턴마다 예고`, effect: `예고한 줄 아군 피해 ${damage(BOSS.bombDamage)}` };
  const thorns = { name: '되받아침', description: '반장을 치고 못 쓰러뜨리면', effect: `친 기물 피해 ${damage(BOSS_NUM.thorns)}` };
  switch (rule) {
    case 'inspect': return [{ name: '검수', description: `${BOSS_NUM.stampEvery}턴마다 최강 동료에 도장`, effect: `해당 동료 공격 ×${BOSS_NUM.stampMult}` }, armor];
    case 'magnet': return [{ name: '자석', description: `${BOSS_NUM.magnetEvery}턴마다 당길 동료 예고`, effect: '반장 쪽으로 1칸 이동' }];
    case 'alarm': return [{ name: '경보', description: `적을 칠 때마다 +1 · ${alarm}/${BOSS_NUM.alarmFull}`, effect: `가득 차면 그 적 차례 공격 ×${BOSS_NUM.alarmMult}` }, armor];
    case 'plate': return [bomb, armor];
    case 'spawn': return [spawn];
    case 'thorns': return [thorns, armor];
    case 'gilded': return [spawn, bomb, thorns, armor];
  }
};

/** 일반 적의 복합 특성도 같은 세 줄 카드로 각각 보존한다. */
export const enemyAbilityText = (type: PieceType, traits: FoeTrait[], damage = (n: number) => n): AbilityText[] => {
  const out: AbilityText[] = [];
  if (type === 'P' && traits.includes('blastPawn')) out.push({ name: '자폭', description: '쓰러질 때 인접 아군을 공격', effect: `인접 아군 피해 ${damage(TRAIT.blast)}` });
  if (type === 'R' && traits.includes('rookPlate')) out.push({ name: '방패 룩', description: '대국 시작에 철판 장착', effect: `방열판 +${TRAIT.rookPlate}` });
  const key = type === 'N' ? 'knightShoe' : type === 'B' ? 'bishopLens' : type === 'P' ? 'pawnDrill' : type === 'Q' ? 'queenCrown' : null;
  if (key && traits.includes(key)) out.push({
    name: FOE_TRAITS[key].name,
    description: '대국 시작에 능력 강화',
    effect: key === 'knightShoe' ? `방열판 +${TRAIT.knightShoe}` : key === 'queenCrown' ? `최대 체력 ×${TRAIT.queenCrown}` : `공격 ×${TRAIT[key]}`,
  });
  return out;
};

/** 부품 상세도 같은 표시 계약을 사용한다. */
export const BUILD_PART_ABILITIES: Record<'relayGear' | 'siegeLatch' | 'relaySeal' | 'sharedPlate', AbilityText[]> = {
  relaySeal: [{ name: '분대 인장', description: '턴에 한 번, 세 번째 유형 공격 시', effect: `첫 직접 피해 ×${PART_NUM.relaySeal}` }],
  sharedPlate: [{ name: '맞댄 철판', description: '턴에 한 번, 고참 방열판 시', effect: `상하좌우 동료 1기 방열판 +${PART_NUM.sharedPlate}` }, { name: '보호 대상', description: '3승 고참 · 낮은 체력 비율 우선', effect: '킹 · 임시 폰 제외' }],
  relayGear: [{ name: '맞물린 톱니', description: '턴에 한 번, 두 유형 공격 시', effect: `태엽 +${PART_NUM.relayGear}` }, { name: '동료 판정', description: '입장 시 영구 분대 유형 기준', effect: '임시 폰·승격·반사 제외' }],
  siegeLatch: [{ name: '공성 걸쇠', description: '턴에 한 번, 룩 2태엽↑ 공격 시', effect: `방열판 ≤${PART_NUM.siegeLatch} → 첫 피해` }, { name: '소모 횟수', description: '룩마다 매턴 1회 소모', effect: '관통 뒷 대상·튐·충돌 제외' }],
};

/**
 * 부품 문법 (D-470, 사용자 결정): [이름] / 언제 한 줄 / : 효과 한 줄(득실 많아야 둘).
 * 데이터 desc = 「효과 — 언제」. 언제 = 「제한, 조건 시」 · 「…마다」 · 「…인 동안」 — 제한(턴에 한 번)이 앞, 조건이 뒤. 없으면 「장착 중」.
 * 비용은 조건으로 오인하지 않도록 효과에 둔다.
 */
export const PART_ALWAYS = '장착 중';
export const partSummaryText = (id: SlicePartId): AbilityText => {
  const d = SLICE_PARTS[id];
  const [effect, when = ''] = d.desc.split(' — ');
  return { name: d.name, description: when || PART_ALWAYS, effect };
};

/** 모든 부품 상세를 세 줄씩 읽는다. 복합 판정은 다음 장에 보존한다. */
export const partAbilityText = (id: SlicePartId): AbilityText[] =>
  id in BUILD_PART_ABILITIES ? BUILD_PART_ABILITIES[id as keyof typeof BUILD_PART_ABILITIES]
    : id === 'conductor' ? [{ ...partSummaryText(id), effect: `${partSummaryText(id).effect} · 기본 +4` }] : [partSummaryText(id)];
