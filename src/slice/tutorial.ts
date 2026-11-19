/**
 * 부관 안내 (D-238, 사용자: 「첫 접속자용 NPC — 부관이 하나하나 설명하고 버튼 · 이동을 하이라이트하며 알려 주는 제도」).
 * 화면 위에 도트 디더 막을 깔고 짚을 곳만 구멍을 낸다(그 칸만 누를 수 있다). 부관의 말은 한 자씩 찍힌다.
 *   tap 걸음 = 화면 아무 데나 누르면 다음 · wait 걸음 = 구멍 안에서 그 행동을 하면 다음.
 * 게임 상태는 건드리지 않는다 — 짚고 기다리기만 한다 (UI 원칙 9).
 */
import { typeIn, typeReserve } from './fx3';
import { makeTalk } from './uikit';
import { fitSubWidth, placeSubAway, SUB_MIN_W } from './voice';

export interface TutStep {
  /** 부관의 말 (<em>낱말</em>은 한 번에 박힌다) */
  text: string;
  /** 짚을 곳: 요소 · 화면 사각형 · 없으면 화면 전체를 어둡게만 */
  target?: () => Element | DOMRect | null | undefined;
  /** 이 조건이 참이 되면 다음 (없으면 화면을 눌러 다음) */
  wait?: () => boolean;
  /** 구멍 둘레 여백 (px) */
  pad?: number;
  /** 보이기만 하는 구멍 (누를 수 없다) — 예: 과녁을 짚는 동안 고른 카드가 같이 흐려지지 않게 (테스터 피드백) */
  peek?: () => (Element | DOMRect | null | undefined)[];
  /** 이 걸음에 들어설 때 한 번 */
  enter?: () => void;
}

export interface TutOpts {
  /** 부관 이름 */
  name: string;
  /** 부관 얼굴 HTML (도트 기물 그림) */
  face: string;
  /** 건너뛰기 글 */
  skip: string;
  /** 건너뛰기를 한 번 누른 뒤 글 (두 번 눌러야 건너뛴다) */
  skipAgain?: string;
  /** 다음 표시 글 */
  next: string;
  /** 소리 (톡) */
  tick?: () => void;
  /** 참이면 막 · 꺾쇠 · 말풍선을 잠시 걷는다 (적 차례 · 연출 중 — 판이 흐려진 채 진행되지 않게, D-242) */
  pause?: () => boolean;
  /** 띠가 늘 비켜 설 칸 — 내 킹 (D-535) · 적 킹 · 고른 기물 (D-597) */
  keep?: () => (DOMRect | null)[];
  /** 전투 중 되도록 덮지 않을 곳 — 판 위 기물 · 적 킹 · 태엽 · 턴 · 속전 · 적의 수 계기 (D-597) */
  soft?: () => DOMRect[];
}

/** 전투 밖 화면에서 띠가 되도록 덮지 않을 것: 보이는 고를 카드 · 단추 · 지도 칸 (안내 자신은 뺀다) */
const screenSoft = (root: HTMLElement): DOMRect[] =>
  [...document.querySelectorAll<HTMLElement>('[data-slot], .slot-info, button, .mnd')]
    .filter((e) => !root.contains(e) && e.getClientRects().length)
    .map((e) => e.getBoundingClientRect())
    .filter((q) => q.width && q.height && q.bottom > 0 && q.top < innerHeight);

const rectOf = (t: Element | DOMRect | null | undefined): DOMRect | null => {
  if (!t) return null;
  if (t instanceof DOMRect) return t;
  const r = (t as Element).getBoundingClientRect();
  return r.width || r.height ? r : null;
};

/** 걸음들을 차례로 보인다. 끝까지 가면 true, 건너뛰면 false */
export const runTutorial = (steps: TutStep[], o: TutOpts): Promise<boolean> =>
  new Promise((resolve) => {
    const root = document.createElement('div');
    root.className = 'tut';
    root.innerHTML = `<div class="tut-dim"></div><div class="tut-frame" hidden></div><div class="tut-peeks"></div><div class="tut-catch"></div>`;
    // 말풍선 = 키트 .talk (패스 4 D-396): 종이 판 + 초상 액자 + 움푹 칸 — 이름 · 말 · ▼ · [건너뛴다]
    const talk = makeTalk({ face: o.face, name: o.name, paper: true, cls: 'tut-say ally' });
    talk.querySelector('.talk-body')!.insertAdjacentHTML('beforeend', `<span class="talk-foot"><b class="talk-next" hidden>${o.next}</b><button type="button" class="btn k-iron tut-skip">${o.skip}</button></span>`);
    root.appendChild(talk);
    document.body.appendChild(root);
    const dim = root.querySelector<HTMLElement>('.tut-dim')!;
    const frame = root.querySelector<HTMLElement>('.tut-frame')!;
    const peeks = root.querySelector<HTMLElement>('.tut-peeks')!;
    const catcher = root.querySelector<HTMLElement>('.tut-catch')!;
    const textEl = talk.querySelector<HTMLElement>('.line')!;
    const next = talk.querySelector<HTMLElement>('.talk-next')!;
    let i = -1;
    /** 이 걸음의 띠 폭 (다 찍힌 글로 맞춘 폭 — 찍히는 동안 바뀌지 않게) */
    let stepW = 0;
    let typing = false;
    let timer = 0;
    let alive = true;
    const finish = (done: boolean): void => {
      if (!alive) return;
      alive = false;
      window.clearInterval(timer);
      root.remove();
      resolve(done);
    };
    // 건너뛰기는 두 번 눌러야 (P-C D-502): 「화면 아무 데나 눌러 다음」 걸음에서 손가락이 띠 속 단추에 닿아 입문 전체가 날아가던 것.
    // 첫 탭 = 단추가 「한 번 더」로 바뀌고(armed) 2초 안에 다시 누르면 건너뛴다
    const skipBtn = root.querySelector<HTMLButtonElement>('.tut-skip')!;
    let armed = 0;
    skipBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (armed && performance.now() - armed < 2000) return finish(false);
      armed = performance.now();
      skipBtn.textContent = o.skipAgain ?? o.skip;
      skipBtn.classList.add('armed');
      window.setTimeout(() => { if (alive && performance.now() - armed >= 2000) { skipBtn.textContent = o.skip; skipBtn.classList.remove('armed'); armed = 0; } }, 2050);
    });
    /** 구멍 · 테 · 말풍선 자리를 지금 사각형에 맞춘다 */
    const place = (): void => {
      const s = steps[i];
      const r = rectOf(s?.target?.());
      const W = innerWidth;
      const H = innerHeight;
      const box = (q: DOMRect, p: number) => ({ x: Math.max(0, Math.round(q.left - p)), y: Math.max(0, Math.round(q.top - p)), w: Math.round(q.width + p * 2), h: Math.round(q.height + p * 2) });
      const extra = (s?.peek?.() ?? []).map(rectOf).filter((q): q is DOMRect => !!q).map((q) => box(q, 4));
      const holes = [...(r ? [box(r, s.pad ?? 6)] : []), ...extra];
      dim.style.clipPath = holes.length ? `path(evenodd, 'M0 0H${W}V${H}H0Z ${holes.map((q) => `M${q.x} ${q.y}h${q.w}v${q.h}h${-q.w}Z`).join(' ')}')` : '';
      if (!r) frame.hidden = true;
      else {
        const q = holes[0];
        Object.assign(frame.style, { left: `${q.x}px`, top: `${q.y}px`, width: `${q.w}px`, height: `${q.h}px` });
        frame.hidden = false;
      }
      // 보이기만 하는 구멍 위에는 투명 막 — 눌러도 게임으로 가지 않는다
      const key = extra.map((q) => `${q.x},${q.y},${q.w},${q.h}`).join('|');
      if (peeks.dataset.k !== key) {
        peeks.dataset.k = key;
        peeks.innerHTML = extra.map((q) => `<i style="left:${q.x}px;top:${q.y}px;width:${q.w}px;height:${q.h}px"></i>`).join('');
      }
      // 말풍선은 짚은 곳을 가리지 않게 (보고서 2-2 → D-535 → D-597): 어디서든 자막 띠 하나가 짚은 곳 · 지킬 칸을 비켜 선다
      const battle = document.body.classList.contains('lay-f') && !document.body.classList.contains('between') && !!document.getElementById('left')?.offsetWidth && document.getElementById('overlay')?.hidden !== false;
      // 건너뛰기 자리: 전투 중이면 화면 왼쪽 아래 모서리 하나(띠 높이를 한 줄 덜고, 띠가 어디에 서든 같은 자리 — 원칙 8), 그 밖은 말풍선 속
      // D-597: 전투 밖에서도 띠 밖으로 — 띠 속 단추가 한 줄 띠의 글을 덮었다(667). 고르기 화면의 왼쪽 아래 「건너뛴다」와 겹치지 않게 오른쪽 위 모서리
      if (skipBtn.parentElement !== root) root.appendChild(skipBtn);
      skipBtn.classList.toggle('corner', !battle);
      // D-666: 전투 중 왼쪽 아래 「건너뛴다」가 짚은 곳(덱 줄 단추 등)을 덮으면 그 걸음만 오른쪽 위 모서리로
      if (battle && holes.length) {
        const k = skipBtn.getBoundingClientRect();
        const hit = holes.some((q) => k.right > q.x && k.left < q.x + q.w && k.bottom > q.y && k.top < q.y + q.h);
        if (hit) skipBtn.classList.add('corner');
      }
      // D-597 (플레이 리뷰 P1-1): 전투 밖(영입 · 핵심 부품 · 지도)에서도 큰 종이 말풍선 대신 같은 자막 띠 —
      // 짚은 곳(구멍)은 지키고, 고를 카드 · 단추 · 지도 칸은 되도록 덜 덮는 자리에 선다. 카드 설명을 가린 채 고르게 하지 않는다
      talk.classList.add('on-sub');
      talk.classList.remove('top', 'bottom', 'on-rail');
      const grow = (q: DOMRect, p: number): DOMRect => new DOMRect(q.x - p, q.y - p, q.width + p * 2, q.height + p * 2);
      const mine = battle ? (o.keep?.() ?? []).filter((q): q is DOMRect => !!q) : [];
      const keep = [...holes.map((q) => grow(new DOMRect(q.x, q.y, q.w, q.h), 4)), ...mine, grow(skipBtn.getBoundingClientRect(), 4)];
      // 짚은 곳이 화면의 30%를 넘게 크면(카드 줄 전체 · 판 전체) 지킬 칸이 아니라 무른 곳 — 띠가 설 자리가 없어 가운데를 덮지 않게 위아래 끝으로
      const big = (q: DOMRect): boolean => q.width * q.height > W * H * 0.3;
      const hard = keep.filter((q) => !big(q));
      const soft = [...keep.filter(big), ...(battle ? o.soft?.() ?? [] : screenSoft(root))];
      // 첫 걸음처럼 띠 폭을 맞추기 전(stepW 0)에도 SUB_MIN_W까지는 넓힌다 — 좁은 판 열(667)에서 세 줄로 접혔다 (D-535 덧붙임)
      placeSubAway(talk, { focus: r ?? mine[0] ?? null, keep: hard, soft, w: stepW || undefined, minW: SUB_MIN_W });
    };
    const go = (): void => {
      i += 1;
      if (i >= steps.length) return finish(true);
      const s = steps[i];
      // 기다리는 걸음: 구멍 안만 누를 수 있다 (막은 구멍 밖을 막는다). 누르는 걸음: 어디를 눌러도 다음
      catcher.hidden = !!s.wait;
      root.classList.toggle('act', !!s.wait);
      s.enter?.();
      next.hidden = true;
      // 띠 높이는 다 찍힌 글로 먼저 잡는다 — 찍히는 동안 띠가 자라며 자리를 옮기지 않게 (D-535)
      textEl.style.minHeight = '';
      textEl.innerHTML = s.text.replace(/\n/g, '<br>');
      stepW = 0;
      place();
      stepW = fitSubWidth(talk, SUB_MIN_W);
      place();
      textEl.style.minHeight = `${Math.ceil(textEl.getBoundingClientRect().height)}px`;
      typing = true;
      o.tick?.();
      // 줄 바꿈(\n)은 줄마다 한 자씩 이어 찍는다 (D-242)
      const lines = s.text.split('\n');
      textEl.innerHTML = lines.map(() => '<span class="ln"></span>').join('<br>');
      const spans = [...textEl.querySelectorAll<HTMLElement>('.ln')];
      const live = () => alive && steps[i] === s;
      // 모든 줄 자리를 먼저 잡는다 (D-594): 찍는 동안 앞 줄이 밀리지 않게
      spans.forEach((sp, k) => typeReserve(sp, lines[k]));
      void lines.reduce((p, ln, k) => p.then(() => (live() ? typeIn(spans[k], ln, 18, undefined, live) : undefined)), Promise.resolve() as Promise<void>).then(() => {
        typing = false;
        if (alive && steps[i] === s && !s.wait) next.hidden = false;
      });
    };
    const onTap = (): void => {
      const s = steps[i];
      if (!s || s.wait) return;
      if (typing) {
        typing = false;
        textEl.innerHTML = s.text.replace(/\n/g, '<br>');
        next.hidden = false;
        return;
      }
      go();
    };
    // 어두운 곳이든 말풍선이든 누르면 다음 (건너뛰기 단추는 따로)
    catcher.addEventListener('click', onTap);
    talk.addEventListener('click', onTap);
    // 막 위를 누른 탭은 게임으로 가지 않는다
    dim.addEventListener('click', (e) => e.stopPropagation());
    timer = window.setInterval(() => {
      if (!alive) return;
      root.classList.toggle('paused', !!o.pause?.());
      place();
      const s = steps[i];
      if (s?.wait && s.wait()) go();
    }, 120);
    go();
  });
