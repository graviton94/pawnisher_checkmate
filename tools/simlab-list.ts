import { REWARD_COMMANDS } from '../src/slice/cards';
import { SLICE_PARTS } from '../src/slice/parts';
/** 실험실 아이템 목록 (D-456): 보상으로 나오는 카드 · 부품 전부 */
process.stdout.write(JSON.stringify({ card: [...REWARD_COMMANDS], part: Object.keys(SLICE_PARTS) }));
