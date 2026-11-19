// P-B 장면 묶음 (tools/qa/pb.cjs) — 판 위 글 갈래 · 판돈 · 반장 2단계 · 태엽 원천
module.exports = {
  /** D-506 초상: 적 킹(2공정) · 적 기물 · 검문 적 킹 바크 · 비대화 사건(종이왕 표정) · NPC 사건(사건 그림 자르기) · 컷신 종이왕 명패 */
  async portraits({ pg, A, wait, shot }) {
    await A(() => { window.sliceApi.setAct(1); window.sliceApi.startAt(2, 'battle'); });
    await wait(1600);
    await A(() => window.sliceApi.taunt('start'));
    await wait(900);
    await shot('king');
    await wait(2600);
    await A(() => window.sliceApi.foeBark('gloat', 'N'));
    await A(() => window.sliceApi.foeBark('gloat'));
    await wait(900);
    await shot('piece');
    await A(() => { window.sliceApi.setAct(0); window.sliceApi.startAt(1, 'check'); });
    await wait(1600);
    await A(() => window.sliceApi.taunt('start'));
    await wait(900);
    await shot('check');
    await A(() => window.sliceApi.event('crownAltar'));
    await wait(5200);
    await shot('event-king');
    await A(() => window.sliceApi.event('tinker'));
    await wait(5200);
    await shot('event-npc');
    await A(() => { window.sliceApi.fallCut('plate'); });
    for (let i = 0; i < 40; i++) {
      await wait(700);
      const got = await A(() => !!document.querySelector('.cut-who .cw-face img[src*="paperking"]'));
      if (got) { await wait(900); await shot('cut'); break; }
      await pg.mouse.click(200, 150);
    }
  },
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
  /** 반장 2단계 초상 CI-02~06 · 08 (D-505): 반장 대국을 열고 그 반장의 2단계 돌입 컷 — 띠 그림 = boss-<이름>-p2 */
  async p2all({ A, wait, shot }) {
    for (const [rule, act] of [['plate', 1], ['inspect', 1], ['spawn', 2], ['magnet', 2], ['thorns', 3], ['alarm', 3], ['gilded', 3]]) {
      if (rule === 'gilded') await A(() => window.sliceApi.finalAt(13));
      else await A(([r, a]) => window.sliceApi.bossOf(r, a), [rule, act]);
      await wait(1800);
      await A((r) => { window.__p2 = window.sliceApi.p2Rise(r); }, rule);
      await wait(640);
      await shot(rule);
      await wait(1800);
    }
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
