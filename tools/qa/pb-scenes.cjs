// P-B 장면 묶음 (tools/qa/pb.cjs) — 판 위 글 갈래 · 판돈 · 반장 2단계 · 태엽 원천
module.exports = {
  /** 갈래 넷: 적 킹 바크 · 우리 바크 · 상태 띠 · 독백 · 자막 띠(합류) */
  async channels({ pg, A, wait, shot }) {
    await A(() => window.sliceApi.startAt(1, 'battle'));
    await wait(1600);
    await A(() => window.sliceApi.taunt('start'));
    await wait(1700);
    await shot('bark-foe');
    // 상태 띠 (시스템)
    await A(() => window.sliceApi.stateBand('이대로 끝내면 킹이 맞습니다', 'crimson'));
    await wait(500);
    await shot('notice');
    // 독백: 손패 카드를 누른 자리 곁
    const card = await pg.$('[data-card="0"]');
    if (card) {
      const r = await card.boundingBox();
      await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    }
    await A(() => window.sliceApi.monoNow('‘태엽이 모자라.’'));
    await wait(500);
    await shot('mono');
    // 우리 편 바크
    await A(() => window.sliceApi.allyBark());
    await wait(1500);
    await shot('bark-ally');
    // 자막 띠 (합류 · 이야기)
    await A(() => window.sliceApi.say('N'));
    await wait(1800);
    await shot('sub');
  },
  /** 부관 안내 (튜토리얼) — 판 아래 자막 띠 */
  async adjutant({ A, wait, shot }) {
    await A(() => window.sliceApi.startAt(1, 'battle'));
    await wait(1600);
    await A(() => window.sliceApi.tutNow());
    await wait(2200);
    await shot('adjutant');
  },
  /** 첫 판 코치 띠 */
  async coach({ A, wait, shot }) {
    await A(() => window.sliceApi.start(0));
    await wait(2500);
    await A(() => window.sliceApi.coachNow());
    await wait(900);
    await shot('coach');
  },
  /** 말 없는 사건 (#16) */
  async event({ A, wait, shot }) {
    await A(() => { window.sliceApi.gold(80); window.sliceApi.event('safe'); });
    await wait(4200);
    await shot('event-ponder');
  },
};
