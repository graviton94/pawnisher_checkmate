import type { CommandId } from '../slice/cards';
import type { SlicePartId } from '../slice/parts';

/** D-420: 같은 분대·판에서 운영 차이를 보는 검증용 재료. 획득 확률은 검증하지 않는다. */
export const BUILD_TRIAL = {
  mixed: { name: '혼성', question: '서로 다른 동료로 다음 수를 엽니다.', part: 'relayGear' },
  knight: { name: '나이트', question: '첫 처치를 다음 도약으로 잇습니다.', part: 'horseshoe' },
  rook: { name: '룩', question: '방열판을 지킬지 일격에 쓸지 고릅니다.', part: 'siegeLatch' },
} satisfies Record<string, { name: string; question: string; part: SlicePartId }>;
export type BuildTrialId = keyof typeof BUILD_TRIAL;
export type BuildTrialCase = 'ready' | 'missing' | 'blocked' | 'loss';
export const BUILD_TRIAL_DECK: CommandId[] = ['advance', 'leap', 'rookLine', 'scrapToss', 'plate', 'rebound', 'repair', 'kingStep', 'advance', 'leap', 'order'];
export const BUILD_TEXT = {
  preview: '공격 예측',
  previewHint: '갈 칸을 길게 누르면 피해와 소모를 봅니다.',
  relay: (n: number) => n ? `맞물린 톱니 · 태엽 +${n}` : '맞물린 톱니 · 태엽 상한',
  latch: (n: number) => `공성 걸쇠 · 방열판 −${n}`,
  detail: {
    relayGear: ['입장 시 서로 다른 유형의 분대원이 적에게 피해를 주면 태엽 +1.', '임시 폰·반사는 제외합니다. 턴에 한 번, 태엽 상한 5.'],
    siegeLatch: ['기본 비용 2 이상인 룩 이동 명령에 발동합니다.', '방열판 최대 12를 소모해 첫 대상의 공격에 더합니다.', '룩마다 턴에 한 번. 관통 뒷 대상·튐·충돌은 그대로입니다.'],
  },
};
