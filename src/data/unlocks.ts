/**
 * 해금 (D-284, 사용자: 「해금 요소는 아이템 및 카드 해금」): 처음엔 원래 풀(카드 43 · 부품 29)만 열려 있고,
 * 확장한 것(카드 43 · 부품 21 + 2차 20)은 출하를 끝낼 때마다 아래 순서대로 몇 개씩 열린다.
 * 몇 개 = 기본 2 + 도달한 막 − 1 + 완주 2 (최대 6). 오늘의 출하 · 시험장은 전부 열린 채로. 왕관 · 도전 계단은 아래 CROWN_TIER · CHALLENGE_GRANTS (D-542).
 */
export const STARTER_CARDS: string[] = [
  'pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit', 'shove', 'shieldBash', 'ram', 'pawnStorm', 'knightRaid', 'bishopRay', 'rookCharge', 'kingDecree', 'overload', 'quickFix', 'tempo', 'bulwark', 'bladeRain', 'vent', 'burst', 'recall', 'rookPierce', 'scrapToss', 'phalanx', 'pawnExecute', 'bishopChain', 'kingCharge',
];
export const STARTER_PARTS: string[] = [
  'relayGear', 'siegeLatch', 'relaySeal', 'sharedPlate',
  // 기록 유물 (D-363) — 처음부터: 분대원을 아끼게 만드는 축
  'lastBreath', 'ledger', 'veteran', 'deathMark',
  // 기록 유물 2차 (D-384)
  'notches', 'aceBadge', 'heavyHand', 'scarPlate', 'cleanSheet', 'sergeant',
  'rookBolt', 'bishopLens', 'pawnPike', 'oath', 'horseshoe', 'magnet', 'assembly', 'drum', 'crown', 'throne', 'coil', 'echo', 'hammer', 'spare', 'tape', 'lance', 'spurs', 'barracks', 'banner', 'scepter', 'gilded', 'fuse', 'conductor', 'anvilPlate', 'chainShot', 'bloodPact', 'brittle', 'greed', 'whetstone',
  // 축 규칙 부품 (D-662, 결정 12가 — 출시 전 지배 전략 완화): 처음부터 — 연쇄 · 황금 말고 고를 길
  'leadSpur', 'pikeRow', 'shieldEdge', 'quench', 'ramRod', 'snareFork',
];
/** 열리는 순서 — 카드 둘마다 부품 하나 */
export const UNLOCK_ORDER: string[] = [
  'castle', 'regalGaze', 'vise', 'kingTax', 'crownSlam', 'forkGear', 'enPassant', 'anklePin', 'openGate', 'pawnFork', 'pawnShield', 'chainReel', 'lastRank', 'knightFork', 'gameRecord', 'hobble', 'skewer', 'gateHinge', 'bishopPin', 'bishopFork', 'queenCrown', 'consecrate', 'bishopStep', 'lightCloak', 'cathedral', 'rookSkewer', 'goldRank', 'rookPin', 'rookFork', 'thickWall', 'rookGuard', 'rookDiscover', 'rosary', 'siegeRam', 'rookTax', 'stirrup', 'queenStride', 'queenFork', 'thickCast', 'queenPin', 'queenWrath', 'scrapMagnet', 'queenSkewer', 'queenDecree', 'firstSpring', 'queenShield', 'queenSweep', 'lastAxle', 'stepAside', 'checkCall', 'toolbox', 'oilCan', 'forkAny', 'ventHole', 'fieldPlate', 'rookRally', 'afterheat', 'bishopChase', 'queenGuard', 'bossBane', 'heavyLance', 'bishopRally', 'lightMag', 'knightKing',
  // 부품 확장 2차 (D-287) — 처음 풀 밖, 카드를 다 연 뒤 이어서
  'mirror', 'pinNeedle', 'whistle', 'shieldWall', 'jumpSpring', 'saddle', 'royalSeal', 'queenFan', 'rampart', 'recoilSpring', 'mortar', 'tally', 'stainedGlass', 'flywheel', 'redLine', 'coolant', 'piggyGear', 'loupe', 'stopwatch', 'calipers',
];
export const UNLOCK = { base: 2, perAct: 1, clear: 2, max: 6 };
/** 이번 출하로 열 개수 */
export const unlockCount = (act: number, cleared: boolean): number => Math.min(UNLOCK.max, UNLOCK.base + UNLOCK.perAct * Math.max(0, act - 1) + (cleared ? UNLOCK.clear : 0));

/**
 * 해금 계단 (D-542, 난이도 패스 — 메타 속도): 예전엔 넷째 왕관을 깨면 92개가 한꺼번에 열렸다(약 6시간에 메타가 닫힘).
 * 이제 ① 본편 풀(STORY_POOL = 2차 부품을 뺀 순서)은 왕관마다 나눠 연다 — 출하마다 열리는 몇 개(unlockCount)는 다음 왕관의 몫(CROWN_TIER)까지만,
 * k번째 왕관을 깨면 앞 CROWN_TIER[k−1]개가 보장된다. ② 2차 부품 20개는 도전 단계마다 두 개씩(CHALLENGE_GRANTS — 깬 도전 이하 단계의 몫 전부).
 * 이형 기물 · 시작 세트는 그대로 왕관마다(save.ts recordRun).
 */
export const CHALLENGE_GRANTS: Record<number, string[]> = {
  4: ['mirror', 'pinNeedle'],
  5: ['whistle', 'shieldWall'],
  6: ['jumpSpring', 'saddle'],
  7: ['royalSeal', 'queenFan'],
  8: ['rampart', 'recoilSpring'],
  9: ['mortar', 'tally'],
  10: ['stainedGlass', 'flywheel'],
  11: ['redLine', 'coolant'],
  12: ['piggyGear', 'loupe'],
  13: ['stopwatch', 'calipers'],
};
const CHALLENGE_IDS = new Set(Object.values(CHALLENGE_GRANTS).flat());
/** 본편에서 열리는 몫 (해금 순서에서 도전 몫을 뺀 것) */
export const STORY_POOL: string[] = UNLOCK_ORDER.filter((id) => !CHALLENGE_IDS.has(id));
/** 왕관 k(1~4)를 깨면 본편 풀의 앞 몇 개까지 보장 · 그 왕관을 깨기 전에 출하로 열 수 있는 상한 */
export const CROWN_TIER: number[] = [16, 32, 48, STORY_POOL.length];
/** 깬 왕관 수 → 출하 해금이 넘지 못하는 본편 풀 상한 (4 = 전부) */
export const storyCap = (storyCleared: number): number => CROWN_TIER[Math.max(0, Math.min(CROWN_TIER.length - 1, storyCleared))];
/** 다음에 열릴 것들 (storyCleared = 깬 왕관 수 — 그 왕관 몫까지만, 생략하면 본편 풀 전부) */
export const nextUnlocks = (have: string[], n: number, storyCleared = CROWN_TIER.length): string[] =>
  STORY_POOL.slice(0, storyCap(storyCleared)).filter((id) => !have.includes(id)).slice(0, n);
/** 왕관 · 도전을 깬 것만으로 보장되는 해금 — cleared = 깬 왕관 수, challengeBest = 깬 가장 높은 도전 승급(없으면 −1) */
export const milestoneUnlocks = (cleared: number, challengeBest = -1): string[] => [
  ...STORY_POOL.slice(0, cleared > 0 ? CROWN_TIER[Math.min(CROWN_TIER.length, cleared) - 1] : 0),
  ...Object.entries(CHALLENGE_GRANTS).filter(([a]) => Number(a) <= challengeBest).flatMap(([, ids]) => ids),
];
