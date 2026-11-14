import { describe, expect, it } from 'vitest';
import { baseScale, frameAt, zoomScale } from '../src/slice/film';
import { BOSS_STORY, DEFEAT_CUTS, PROLOGUE, SPEAKER_FACE, bossFallCut, gildedPhase2Cut, lookBackCut, promotionCuts, shadowCut, trueEndingCuts, type Cut, type Line, type StoryBoss } from '../src/data/script';
import { companionScene } from '../src/data/companion-scenes';
import { EVENT_OUTCOME } from '../src/data/event-outcome';
import { ASCENSION } from '../src/slice/run';
import { cutPages, speakerSide } from '../src/slice/uikit';

/**
 * 영화 문법 (D-504, 후기 #31 · #22): 카메라는 기기 픽셀 정수 배율만 쓰고 그림 밖을 비추지 않는다 ·
 * 모든 컷의 샷이 그림 안 · 대사 화자는 명패 편이 정해져 있다 · 서술 · 대사 · 독백의 표기가 섞이지 않는다.
 */
const crew = { alive: [{ name: '삐걱거리는 경첩', t: 'P' as const }, { name: '박차', t: 'N' as const }], promised: { name: '삐걱거리는 경첩', alive: true }, melted: ['구부러진 못'] };
const allCuts = (): [string, Cut][] => {
  const out: [string, Cut][] = PROLOGUE.map((c) => [`프롤로그 ${c.img}`, c]);
  for (let a = 0; a < 4; a++) {
    out.push([`그림자 ${a}`, shadowCut(a, ASCENSION[a].law)], [`재도전 ${a}`, shadowCut(a, undefined, true)]);
    promotionCuts(a, '', ASCENSION[a].law, BOSS_STORY.plate.mirror, crew).forEach((c) => out.push([`왕 ${a} ${c.img || c.coda}`, c]));
    out.push([`도금왕 2단계 ${a}`, gildedPhase2Cut('boss-gilded', a, 'plate')]);
    for (let act = 0; act < 3; act++) companionScene(act, crew.alive, undefined, a).cuts.forEach((c) => out.push([`동료 ${a}-${act}`, c]));
  }
  trueEndingCuts([], crew).forEach((c) => out.push([`진엔딩 ${c.img || c.coda}`, c]));
  DEFEAT_CUTS.forEach((c) => out.push([`패배 ${c.img || c.coda}`, c]));
  (Object.keys(BOSS_STORY) as StoryBoss[]).forEach((r) => out.push([`격파 ${r}`, bossFallCut(r, `boss-fall-${r}`, 2, 1)]));
  out.push(['돌아봄', lookBackCut({ companionWithJosa: '박차가' })], ['돌아봄 빈칸', lookBackCut({})]);
  return out;
};

describe('카메라 계단 (D-504)', () => {
  it('확대는 기기 픽셀 정수 배율만 · 칸을 늘 덮는다', () => {
    for (const [bw, bh, r] of [[915, 293, 2.625], [667, 252, 2], [1280, 560, 1]] as const) {
      const n0 = baseScale(320, 180, bw, bh, r);
      expect(Number.isInteger(n0)).toBe(true);
      for (let z = 0; z <= 3; z++) {
        const n = zoomScale(n0, z);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(n0 + z);
        for (const [fx, fy] of [[0, 0], [0.5, 0.5], [1, 1], [0.86, 0.8]]) {
          const f = frameAt(320, 180, bw, bh, n, fx, fy, r);
          expect(f.x).toBeLessThanOrEqual(0);
          expect(f.y).toBeLessThanOrEqual(0);
          expect(f.x + f.w).toBeGreaterThanOrEqual(bw - 1 / r);
          expect(f.y + f.h).toBeGreaterThanOrEqual(bh - 1 / r);
          // 위치는 기기 픽셀 격자 위
          expect(Math.abs(f.x * r - Math.round(f.x * r))).toBeLessThan(1e-6);
        }
      }
    }
  });
});

describe('컷 비트 · 화자 (D-504 · #22)', () => {
  it('모든 샷 초점이 그림 안 · 확대 0~3', () => {
    for (const [where, c] of allCuts()) {
      for (const s of [c.shot, ...c.lines.map((l) => l.shot)].filter(Boolean)) {
        expect.soft(s!.x, where).toBeGreaterThanOrEqual(0);
        expect.soft(s!.x, where).toBeLessThanOrEqual(1);
        expect.soft(s!.y, where).toBeGreaterThanOrEqual(0);
        expect.soft(s!.y, where).toBeLessThanOrEqual(1);
        expect.soft(s!.z ?? 0, where).toBeLessThanOrEqual(3);
      }
    }
  });
  it('서술 · 대사 · 독백이 섞이지 않는다 — 서술에 큰따옴표 대사 없음, 대사엔 화자, 같은 화자 이름은 이어지는 쪽에서 다시 안 붙음', () => {
    const lines: [string, Line][] = allCuts().flatMap(([w, c]) => c.lines.map((l) => [w, l] as [string, Line]));
    for (const [w, l] of lines) {
      if (l.k === 'n') expect.soft(/[“”]/.test(l.t), `${w}: 서술 안 대사 — ${l.t}`).toBe(false);
      if (l.k === 's') expect.soft(!!l.who, `${w}: 화자 없는 대사 — ${l.t}`).toBe(true);
      // 따옴표는 표시가 붙인다 — 데이터에 겹쳐 적지 않는다
      expect.soft(/^[“‘]|[”’]$/.test(l.t), `${w}: 따옴표 겹침 — ${l.t}`).toBe(false);
    }
    for (const [w, c] of allCuts()) {
      const pages = cutPages(c.lines);
      pages.forEach((p, i) => { if (i && p[0].k === 's' && pages[i - 1][0].k === 's' && pages[i - 1][0].who === p[0].who) expect.soft(p[0].cont, w).toBe(true); });
    }
  });
  it('이야기 화자는 명패 편이 맞다 — 도금왕 황동 · 반장 · 주조기 적 · 정비공 NPC · 나머지 우리 편, 고정 화자는 얼굴이 있다', () => {
    expect(speakerSide('용해 주조기')).toBe('foe');
    expect(speakerSide('외눈 정비공')).toBe('npc');
    expect(speakerSide('철갑 반장')).toBe('foe');
    expect(speakerSide('박차')).toBe('ally');
    for (const who of ['종이왕', '아홉째 폰', '박차', '흰 퀸', '흰 룩', '도금왕', ...Object.values(BOSS_STORY).map((b) => b.name)]) expect(SPEAKER_FACE[who], who).toBeTruthy();
  });
  it('결말은 장 제목 카드로 열고 맺음 카드로 닫는다 · 끝 정적 한 줄', () => {
    for (let a = 0; a < 3; a++) {
      const k = promotionCuts(a, '', ASCENSION[a].law, '', crew);
      expect(k[0].title?.kicker).toContain('결말');
      expect(k.at(-1)?.coda).toBe('black');
      expect(k.at(-1)?.end?.title).toBe('왕위 계승');
    }
    const t = trueEndingCuts([], crew);
    expect(t[0].title).toBeTruthy();
    expect(t.at(-1)?.coda).toBe('white');
    expect(t.at(-1)?.end?.title).toBe('왕관 파괴');
    expect(DEFEAT_CUTS.at(-1)?.end?.title).toBe('킹이 쓰러졌습니다');
    expect(PROLOGUE[0].title?.kicker).toBe('프롤로그');
  });
  it('사건 결과 대사는 따옴표 · 서술은 두 문장 안 (D-360 유지)', () => {
    for (const [id, outs] of Object.entries(EVENT_OUTCOME))
      for (const [key, o] of Object.entries(outs)) if (o.line) expect.soft(/^[“‘[]/.test(o.line), `${id} ${key}`).toBe(true);
  });
});
