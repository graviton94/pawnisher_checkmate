import './style.css';
import { BattleController } from './game/controller';
import { Hud } from './ui/hud';
import { BoardRenderer } from './view/BoardRenderer';

const hud = new Hud();
let controller: BattleController;

const renderer = new BoardRenderer(document.getElementById('board')!, {
  tap: (pos, touch) => controller.tap(pos, touch),
  hover: (pos) => controller.hover(pos),
  longPress: (pos, x, y) => {
    const p = controller.pieceInfo(pos);
    if (p) hud.showInfo(p, x, y);
  },
  longPressEnd: () => hud.hideInfo(),
});

controller = new BattleController(renderer, hud);
hud.bind(controller);
hud.showStart();

if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { pawnisher: BattleController }).pawnisher = controller;
}
