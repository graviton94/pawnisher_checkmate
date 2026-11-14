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
  /** 반장 2단계 예고 · 돌입 프레임 (#21) */
  async boss({ A, wait, shot }) {
    await A(() => window.sliceApi.startAt(1, 'boss'));
    await wait(1800);
    await A(() => window.sliceApi.p2Warn());
    await wait(500);
    await shot('p2-warn');
    await wait(2400);
    await A(() => { window.__p2 = window.sliceApi.p2Rise('plate'); });
    for (const [n, ms] of [['p2-f1', 120], ['p2-f2', 260], ['p2-f3', 320], ['p2-f4', 700]]) { await wait(ms); await shot(n); }
    await wait(1000);
    await shot('p2-line');
  },
  /** 판돈 (#12): 창 → 거는 순간 → 대국 중 칩 → 깨짐 → 적중 / 실패 */
  async wager({ pg, A, wait, shot }) {
    await A(() => window.sliceApi.startAt(1, 'battle'));
    await wait(1500);
    await A(() => window.sliceApi.bet());
    await wait(900);
    await shot('wager-win');
    const yes = await pg.$('[data-yes]');
    const r = await yes.boundingBox();
    await pg.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2);
    await wait(200);
    await shot('wager-drop');
    await wait(1200);
    await shot('wager-chip');
    await A(() => window.sliceApi.betEnd(true));
    await wait(250);
    await shot('wager-hit');
    await wait(1600);
    await A(() => { window.sliceApi.betSet('unhit'); window.sliceApi.betBreak(); });
    await wait(300);
    await shot('wager-broken');
    await wait(2000);
    await A(() => window.sliceApi.betEnd(false));
    await wait(400);
    await shot('wager-lose');
  },
  /** 태엽 원천 (#29): 처치 칸 · 부품 칸에서 「+1」이 계기로 */
  async apfx({ A, wait, shot }) {
    await A(() => window.sliceApi.parts(['relayGear', 'horseshoe']));
    await A(() => window.sliceApi.startAt(1, 'battle'));
    await wait(1600);
    await A(() => window.sliceApi.apFx());
    await wait(90);
    await shot('ap-f1');
    await wait(220);
    await shot('ap-f2');
    await wait(300);
    await shot('ap-f3');
  },
  /** 줄인 움직임: 바크 · 2단계 컷인이 정지 컷으로 */
  async calm({ pg, A, wait, shot }) {
    await pg.emulateMedia({ reducedMotion: 'reduce' });
    await A(() => window.sliceApi.startAt(1, 'boss'));
    await wait(1800);
    await A(() => window.sliceApi.taunt('cheese'));
    await wait(150);
    await shot('calm-bark');
    await A(() => { window.__p2 = window.sliceApi.p2Rise('plate'); });
    await wait(150);
    await shot('calm-p2');
  },
  /** 말 없는 사건 (#16) */
  async event({ A, wait, shot }) {
    await A(() => { window.sliceApi.gold(80); window.sliceApi.event('safe'); });
    await wait(4200);
    await shot('event-ponder');
  },
};
