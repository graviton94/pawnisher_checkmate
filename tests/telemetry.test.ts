import { describe, expect, it } from 'vitest';
import { TELEMETRY_KEY, TELEMETRY_MAX, telemetryAll, telemetryClear, telemetryStore, track } from '../src/slice/telemetry';
import { KEYWORDS } from '../src/data/hud';
import { SURVEY } from '../src/data/playtest';

const fake = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};

/** 시험판 기록 (D-234) */
describe('플레이테스트 기록', () => {
  it('사건이 이름 · 시각 · 세션과 함께 저장소에 쌓이고, 지우면 비워진다', () => {
    const st = fake();
    telemetryStore(st);
    track('battle_result', { act: 1, win: true });
    track('draft_choice', { picked_id: 'leap' });
    const all = telemetryAll();
    expect(all.map((e) => e.e)).toEqual(['battle_result', 'draft_choice']);
    expect(all[0].sid).toBeTruthy();
    expect(JSON.parse(st.m.get(TELEMETRY_KEY)!)).toHaveLength(2);
    telemetryClear();
    expect(telemetryAll()).toHaveLength(0);
  });
  it('상한을 넘으면 오래된 것부터 버린다 · 저장소가 없거나 깨져도 게임은 멈추지 않는다', () => {
    const st = fake();
    st.setItem(TELEMETRY_KEY, '{깨진');
    telemetryStore(st);
    track('x', { i: 0 });
    const first = telemetryAll()[0];
    expect(telemetryAll()).toHaveLength(1); // 깨진 저장소에서 복구
    // 4천 번 전체 JSON을 쓰는 성능 시험 대신 실제 상한 경계의 전/후를 검증한다.
    st.setItem(TELEMETRY_KEY, JSON.stringify(Array.from({ length: TELEMETRY_MAX }, (_, i) => ({ ...first, i }))));
    telemetryStore(st);
    for (let i = TELEMETRY_MAX; i < TELEMETRY_MAX + 5; i++) track('x', { i });
    const all = telemetryAll();
    expect(all).toHaveLength(TELEMETRY_MAX);
    expect(all[0].i).toBe(5);
    telemetryStore(null);
    expect(() => track('y')).not.toThrow();
  });
});

/** 용어 단계 공개 (D-233) · 설문 (D-234) 데이터 */
describe('용어 · 설문 데이터', () => {
  it('첫 판 초반 고유 용어는 태엽 · 연쇄 · 승격 (+ 화면에 늘 있는 속전 · 나사 · 지휘)만 열려 있다', () => {
    expect(KEYWORDS.filter(([, , g]) => g === 'base').map(([k]) => k)).toEqual(['태엽', '연쇄', '승격', '속전', '나사', '지휘']);
    // 지운 말: 합/곱 · 헛방 경직은 사전에도 없다 (색 표지 · 「기절」 평문으로)
    const names = KEYWORDS.map(([k]) => k).join();
    expect(names).not.toMatch(/합 \(|곱 \(|헛방|경직/);
  });
  it('설문은 10문항 — 척도 5 · 고르기 3 · 서술 2', () => {
    expect(SURVEY).toHaveLength(10);
    expect(SURVEY.filter((q) => q.kind === 'scale')).toHaveLength(5);
    expect(SURVEY.filter((q) => q.kind === 'one' || q.kind === 'many')).toHaveLength(3);
    expect(SURVEY.filter((q) => q.kind === 'text')).toHaveLength(2);
  });
});
