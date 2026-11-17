import { BOSS_BODY, GIANTS, RAID, type GiantType, type RaidPattern } from './giants';
import { BOSS, BOSS_NUM, FOE_MARKS, FOE_TRAITS, TRAIT, type BossRule, type FoeMark, type FoeTrait } from '../slice/cards';
import { PART_NUM, SLICE_PARTS, type SlicePartId } from '../slice/parts';
import type { FormId, PieceType } from '../engine';
import { FORMS } from './forms';
import { TERM } from './terms';
import { josa } from './josa';

/** 능력 표시 계약: 명칭·조건/행동·상세 효과 세 줄. 수치는 전투 데이터에서 읽는다. */
export interface AbilityText { name: string; description: string; effect: string }

/** 반장의 모든 규칙을 한 능력씩 읽는다. 보조 철갑도 생략하지 않는다. */
export const bossAbilityText = (rule: BossRule, alarm = 0, damage = (n: number) => n): AbilityText[] => {
  const armor = { name: '철갑', description: `${BOSS.plateEvery}턴마다 방열판 재생`, effect: `방열판을 최소 ${BOSS.plate}까지 충전` };
  const spawn = { name: '조립', description: '1턴부터 홀수 턴, 반장 곁', effect: `폰 1기 생성 · 최대 ${BOSS_NUM.spawnMax}기` };
  const bomb = { name: '줄 폭격', description: `${BOSS.bombFirst}턴부터 ${BOSS.bombEvery}턴마다 예고`, effect: `예고한 줄 아군 피해 ${damage(BOSS.bombDamage)}` };
  const thorns = { name: TERM.thorns, description: '반장을 치고 못 쓰러뜨리면', effect: `친 기물 피해 ${damage(BOSS_NUM.thorns)}` };
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

/** 적 편성 특성 (D-483): 그 대국의 모든 적이 함께 지닌다 — [이름] / 언제 · 누가 / : 효과 */
export const markAbilityText = (m: FoeMark): AbilityText => ({ name: FOE_MARKS[m].name, description: FOE_MARKS[m].when, effect: FOE_MARKS[m].effect });

/** 거대 주물 (D-484): [이름] / 움직임 / : 내리찍기 + 부위 안내 두 장 */
export const giantAbilityText = (t: GiantType): AbilityText[] => [
  { name: GIANTS[t].name, description: GIANTS[t].move, effect: GIANTS[t].hit },
  { name: '네 부위', description: '칸마다 HP가 따로, 밀리지 않는다', effect: `부수면 카드 +${RAID.breakDraw} · 제 몫을 못 친다` },
  RAID_PARRY,
];

/** 레이드 (D-518): 패링 · 헛방 장 — 2×2 반장 · 거대 주물이 함께 쓴다 */
const RAID_PARRY: AbilityText = { name: TERM.parry, description: '내리찍기를 방열판으로 다 받아내면', effect: `${TERM.stun} — 한 턴 쉼 · 받는 피해 ×${RAID.parryWeak}` };
const RAID_WHIFF: AbilityText = { name: '헛방', description: '예고 칸에서 모두 빠지면', effect: RAID.whiffWeak > 1 ? `철갑 벗김 · 받는 피해 ×${RAID.whiffWeak}` : '철갑 벗김' };

/** 2×2 특별 보스 (D-513): [2×2 몸] / 걷기 / : 내리찍기 — 반장 규칙 장 앞에 */
/**
 * 레이드 반장 (D-518): rule이 있으면 [2×2 몸] 효과 줄 = 번갈아 쓰는 패턴, now = 이번 턴 패턴 장, stunned = 기절 중 장.
 */
export const bossBodyAbilityText = (rage = false, rule?: string, now?: RaidPattern, stunned = false): AbilityText[] => {
  const list = rule ? (rage ? RAID.rage : RAID.patterns)[rule] : undefined;
  return [
    { name: '2×2 몸', description: BOSS_BODY.move, effect: list ? `${list.map((q) => RAID.names[q]).join(' · ')} 번갈아` : rage ? BOSS_BODY.hitRage : BOSS_BODY.hit },
    ...(stunned ? [{ name: TERM.stun, description: '이번 턴 걷지도 치지도 못한다', effect: `받는 피해 ×${RAID.parryWeak}` }] : now ? [{ name: `이번 턴 · ${RAID.names[now]}`, description: '붉은 칸을 친다', effect: `${RAID.hits[now]} · 피해 ×${RAID.dmg[now]}` }] : []),
    RAID_PARRY,
    RAID_WHIFF,
    { name: '한 몸', description: '네 칸 어디를 쳐도 킹 하나', effect: '피해는 한 공격에 한 번 · 밀리지 않는다' },
  ];
};

/** 이형 기물 (D-481): [이름] / 움직임 / : 공격 — 처음 적으로 만날 때 이 장에서 규칙을 배운다 */
export const formAbilityText = (f: FormId): AbilityText => ({ name: FORMS[f].name, description: FORMS[f].move, effect: `${josa(FORMS[f].hit, '을')} 친다` });
/** 이형 헛방 (D-518): 적 이형만 — 헛치면 기절에 더해 약점 */
export const formWhiffText: AbilityText = { name: '규격 밖', description: '겨눈 공격이 빗나가면 기절', effect: `받는 피해 ×${RAID.formWeak}` };

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
