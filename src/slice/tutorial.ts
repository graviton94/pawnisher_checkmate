/**
 * 부관 안내 (D-238, 사용자: 「첫 접속자용 NPC — 부관이 하나하나 설명하고 버튼 · 이동을 하이라이트하며 알려 주는 제도」).
 * 화면 위에 도트 디더 막을 깔고 짚을 곳만 구멍을 낸다(그 칸만 누를 수 있다). 부관의 말은 한 자씩 찍힌다.
 *   tap 걸음 = 화면 아무 데나 누르면 다음 · wait 걸음 = 구멍 안에서 그 행동을 하면 다음.
 * 게임 상태는 건드리지 않는다 — 짚고 기다리기만 한다 (UI 원칙 9).
 */
import { typeIn } from './fx3';
import { makeTalk, talkAt } from './uikit';

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
  /** 다음 표시 글 */
  next: string;
  /** 소리 (톡) */
  tick?: () => void;
  /** 참이면 막 · 꺾쇠 · 말풍선을 잠시 걷는다 (적 차례 · 연출 중 — 판이 흐려진 채 진행되지 않게, D-242) */
  pause?: () => boolean;
}

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
    root.querySelector('.tut-skip')!.addEventListener('click', (e) => (e.stopPropagation(), finish(false)));
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
      // 말풍선은 짚은 곳을 가리지 않게 (보고서 2-2): 전투 화면이면 짚은 곳 반대쪽 레일 위(판을 가리지 않는다),
      // 그 밖(지도 · 고르기)은 짚은 곳이 아래쪽이면 위에, 아니면 아래에
      const battle = document.body.classList.contains('lay-f') && !document.body.classList.contains('between') && !!document.getElementById('left')?.offsetWidth && document.getElementById('overlay')?.hidden !== false;
      if (battle) {
        const side = r && r.left + r.width / 2 < W / 2 ? 'right' : 'left';
        if (talk.dataset.side !== side) talkAt(talk, side);
        talk.dataset.side = side;
        talk.classList.remove('top', 'bottom');
      } else {
        delete talk.dataset.side;
        talk.classList.remove('on-rail');
        talk.style.left = talk.style.width = '';
        const low = r ? r.top + r.height / 2 > H * 0.5 : false;
        talk.style.top = low ? '' : 'auto';
        talk.classList.toggle('top', low);
        talk.classList.toggle('bottom', !low);
      }
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
      place();
      typing = true;
      o.tick?.();
      // 줄 바꿈(\n)은 줄마다 한 자씩 이어 찍는다 (D-242)
      const lines = s.text.split('\n');
      textEl.innerHTML = lines.map(() => '<span class="ln"></span>').join('<br>');
      const spans = [...textEl.querySelectorAll<HTMLElement>('.ln')];
      const live = () => alive && steps[i] === s;
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
