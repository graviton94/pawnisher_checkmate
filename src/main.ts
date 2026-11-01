import { installPressFeedback } from './ui/motion';
import './fonts.css';
import './style.css';
import { BattleController } from './game/controller';
import { Hud } from './ui/hud';
import { RunUi } from './ui/runUi';
import { BoardRenderer } from './view/BoardRenderer';

const hud = new Hud();
installPressFeedback();
let controller: BattleController;

const renderer = new BoardRenderer(document.getElementById('board')!, {
  tap: (pos, touch) => controller.tap(pos, touch),
  hover: (pos) => controller.hover(pos),
  longPress: (pos, x, y) => {
    const p = controller.pieceInfo(pos);
    if (p) hud.showInfo(p, x, y);
  },
  longPressEnd: () => hud.hideInfo(),
}, (text) => hud.toast(text));

controller = new BattleController(renderer, hud);
hud.bind(controller);
const runUi = new RunUi(hud, controller);
hud.onMenu = () => runUi.showMenu();
// 앱을 열면 인트로 → 타이틀 (관찰 도구는 ?nointro로 바로 타이틀)
runUi.showTitle(!new URLSearchParams(location.search).has('nointro'));

if (new URLSearchParams(location.search).has('debug')) {
  (window as unknown as { pawnisher: BattleController; runUi: RunUi }).pawnisher = controller;
  (window as unknown as { runUi: RunUi }).runUi = runUi;
}
