import { COACH, type CoachKey } from '../data/coach';

/**
 * 첫 출하 안내 말풍선 (D-116): 판 아래쪽에 서술 한 줄 + 「안다」 · 「안내 끄기」.
 * 한 번 본 것은 다시 나오지 않는다 (기기에 저장). 게임 상태는 건드리지 않는다.
 */
const KEY = 'pawnisher.coach.v1';
interface CoachSave {
  off: boolean;
  seen: CoachKey[];
}
const load = (): CoachSave => {
  try {
    return { off: false, seen: [], ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CoachSave>) };
  } catch {
    return { off: false, seen: [] };
  }
};
const save = (c: CoachSave) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* 무시 */
  }
};

export const coachOn = (): boolean => !load().off;
export const setCoach = (on: boolean): void => save({ ...load(), off: !on });
/** 안내를 처음부터 다시 */
export const resetCoach = (): void => save({ off: false, seen: [] });

let current: CoachKey | null = null;

/** 그 안내를 아직 안 봤으면 띄운다. 이미 다른 안내가 떠 있으면 기다린다 (다음 호출 때) */
export const coach = (key: CoachKey): void => {
  const c = load();
  if (c.off || c.seen.includes(key) || current) return;
  current = key;
  let el = document.getElementById('coach');
  if (!el) {
    el = document.createElement('div');
    el.id = 'coach';
    el.className = 'coach';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.innerHTML = `<p>${COACH[key]}</p><div class="coach-row"><button type="button" class="btn" data-coach-ok>안다</button><button type="button" class="btn ghost" data-coach-off>안내 끄기</button></div>`;
  // 대국 중에는 오른쪽 레일 가운데에 (판을 가리지 않게), 출하 화면에서는 아래 가운데
  el.classList.toggle('side', !!document.getElementById('scene')?.hidden);
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  const close = (off: boolean) => {
    const s = load();
    save({ off: s.off || off, seen: [...new Set([...s.seen, key])] });
    el!.hidden = true;
    current = null;
  };
  el.querySelector('[data-coach-ok]')!.addEventListener('click', () => close(false));
  el.querySelector('[data-coach-off]')!.addEventListener('click', () => close(true));
};

/** 시험대 서술 (D-116): 정해진 줄들을 차례로 (안내 끄기와 상관없이). 다 넘기면 done */
export const coachLines = (lines: string[], done?: () => void): void => {
  if (!lines.length) return done?.();
  let el = document.getElementById('coach');
  if (!el) {
    el = document.createElement('div');
    el.id = 'coach';
    el.className = 'coach';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  current = 'start';
  el.classList.toggle('side', !!document.getElementById('scene')?.hidden);
  el.innerHTML = `<p>${lines[0]}</p><div class="coach-row"><span class="dim">${lines.length > 1 ? `${lines.length - 1}줄 더` : ''}</span><button type="button" class="btn" data-coach-ok>안다</button></div>`;
  el.hidden = false;
  el.classList.remove('in');
  void el.offsetWidth;
  el.classList.add('in');
  el.querySelector('[data-coach-ok]')!.addEventListener('click', () => {
    el!.hidden = true;
    current = null;
    coachLines(lines.slice(1), done);
  });
};
