/**
 * 해금 (D-284, 사용자: 「해금 요소는 아이템 및 카드 해금」): 처음엔 원래 풀(카드 43 · 부품 29)만 열려 있고,
 * 확장한 것(카드 43 · 부품 21 + 2차 20)은 출하를 끝낼 때마다 아래 순서대로 몇 개씩 열린다.
 * 몇 개 = 기본 2 + 도달한 막 − 1 + 완주 2 (최대 6). 오늘의 출하 · 시험장은 전부 열린 채로.
 */
export const STARTER_CARDS: string[] = [
  'pierceDiag', 'crossLeap', 'charge', 'plate', 'repair', 'reload', 'kingBlow', 'splashDiag', 'smash', 'rebound', 'hoofKick', 'march', 'draft', 'wrath', 'royalGuard', 'spark', 'finisher', 'cavCharge', 'kingGuard', 'doubleLeap', 'gambit', 'shove', 'shieldBash', 'ram', 'pawnStorm', 'knightRaid', 'bishopRay', 'rookCharge', 'kingDecree', 'overload', 'quickFix', 'tempo', 'bulwark', 'bladeRain', 'vent', 'burst', 'recall', 'rookPierce', 'scrapToss', 'phalanx', 'pawnExecute', 'bishopChain', 'kingCharge',
];
export const STARTER_PARTS: string[] = [
  // 기록 유물 (D-363) — 처음부터: 분대원을 아끼게 만드는 축
  'lastBreath', 'ledger', 'veteran', 'deathMark',
  'rookBolt', 'bishopLens', 'pawnPike', 'oath', 'horseshoe', 'magnet', 'assembly', 'drum', 'crown', 'throne', 'coil', 'echo', 'hammer', 'spare', 'tape', 'lance', 'spurs', 'barracks', 'banner', 'scepter', 'gilded', 'fuse', 'conductor', 'anvilPlate', 'chainShot', 'bloodPact', 'brittle', 'greed', 'whetstone',
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
/** 다음에 열릴 것들 */
export const nextUnlocks = (have: string[], n: number): string[] => UNLOCK_ORDER.filter((id) => !have.includes(id)).slice(0, n);
