/**
 * 부관 안내 (D-238, 사용자: 「첫 접속자용 NPC — 부관이 하나하나 설명하고 버튼 · 이동을 하이라이트하며 알려 주는 제도」).
 * 화면 위에 도트 디더 막을 깔고 짚을 곳만 구멍을 낸다(그 칸만 누를 수 있다). 부관의 말은 한 자씩 찍힌다.
 *   tap 걸음 = 화면 아무 데나 누르면 다음 · wait 걸음 = 구멍 안에서 그 행동을 하면 다음.
 * 게임 상태는 건드리지 않는다 — 짚고 기다리기만 한다 (UI 원칙 9).
 */
import { typeIn } from './fx3';

export interface TutStep {
  /** 부관의 말 (<em>낱말</em>은 한 번에 박힌다) */
  text: string;
  /** 짚을 곳: 요소 · 화면 사각형 · 없으면 화면 전체를 어둡게만 */
  target?: () => Element | DOMRect | null | undefined;
  /** 이 조건이 참이 되면 다음 (없으면 화면을 눌러 다음) */
  wait?: () => boolean;
  /** 구멍 둘레 여백 (px) */
  pad?: number;
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
    root.innerHTML = `<div class="tut-dim"></div><div class="tut-frame" hidden></div><div class="tut-catch"></div>
      <div class="tut-talk"><i class="tut-face">${o.face}</i><div class="tut-body"><b class="tut-name">${o.name}</b><p class="tut-text"></p><small class="tut-next" hidden>${o.next}</small></div><button type="button" class="tut-skip">${o.skip}</button></div>`;
    document.body.appendChild(root);
    const dim = root.querySelector<HTMLElement>('.tut-dim')!;
    const frame = root.querySelector<HTMLElement>('.tut-frame')!;
    const catcher = root.querySelector<HTMLElement>('.tut-catch')!;
    const talk = root.querySelector<HTMLElement>('.tut-talk')!;
    const textEl = root.querySelector<HTMLElement>('.tut-text')!;
    const next = root.querySelector<HTMLElement>('.tut-next')!;
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
      if (!r) {
        dim.style.clipPath = '';
        frame.hidden = true;
      } else {
        const p = s.pad ?? 6;
        const x = Math.max(0, Math.round(r.left - p));
        const y = Math.max(0, Math.round(r.top - p));
        const w = Math.round(r.width + p * 2);
        const h = Math.round(r.height + p * 2);
        dim.style.clipPath = `path(evenodd, 'M0 0H${W}V${H}H0Z M${x} ${y}h${w}v${h}h${-w}Z')`;
        Object.assign(frame.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
        frame.hidden = false;
      }
      // 말풍선은 짚은 곳을 가리지 않게: 짚은 곳이 아래쪽이면 위에, 아니면 아래에
      const low = r ? r.top + r.height / 2 > H * 0.5 : false;
      talk.classList.toggle('top', low);
    };
    const go = (): void => {
      i += 1;
      if (i >= steps.length) return finish(true);
      const s = steps[i];
      // 기다리는 걸음: 구멍 안만 누를 수 있다 (막은 구멍 밖을 막는다). 누르는 걸음: 어디를 눌러도 다음
      catcher.hidden = !!s.wait;
      root.classList.toggle('act', !!s.wait);
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
