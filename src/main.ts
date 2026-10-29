import './style.css';
import { BattleController } from './game/controller';
import { Hud } from './ui/hud';
import { STRONGHOLD } from './data/battle';
import { standingOf } from './engine';
import { BoardRenderer, GRADE } from './view/BoardRenderer';

const hud = new Hud();
let controller: BattleController;

const renderer = new BoardRenderer(document.getElementById('board')!, {
  tap: (pos, touch) => controller.tap(pos, touch),
  hover: (pos) => controller.hover(pos),
  longPress: (pos, x, y) => {
    const p = controller.pieceInfo(pos);
    if (p) {
      hud.showInfo(p, x, y);
      return;
    }
    const sh = controller.state?.stronghold;
    if (sh && sh.x === pos.x && sh.y === pos.y) {
      const st = standingOf(controller.state, 0);
      const terms = STRONGHOLD.terms[st];
      hud.showStrongholdInfo(
        `<b>${GRADE[st].name} 요충지</b><br>지금 형편 기준: 상대 턴 ${terms.hold}번 버티면 점령<br>위에 선 기물이 받는 피해 −${Math.round(terms.cover * 100)}%<br><span style="color:var(--muted)">밀릴수록 등급이 올라 더 쉽게 점령합니다</span>`,
        x,
        y,
      );
    }
  },
  longPressEnd: () => hud.hideInfo(),
}, (text) => hud.toast(text));

controller = new BattleController(renderer, hud);
hud.bind(controller);
hud.showStart();

if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { pawnisher: BattleController }).pawnisher = controller;
}
