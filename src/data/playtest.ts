/**
 * APK 플레이테스트 설문 (D-234, 보고서 3 템플릿 3-A — 정량 8 + 서술 2, 2~3분).
 * 출하가 끝난 화면에서 「설문」으로 열고 답은 기록(telemetry 'survey')에 함께 남아 「기록 보내기」 한 번으로 넘어온다.
 * 합격 기준 · 해석은 docs/playtest/plan.md.
 */
export type SurveyQ =
  | { id: string; kind: 'scale'; q: string; lo: string; hi: string; zero?: string }
  | { id: string; kind: 'one' | 'many'; q: string; opts: string[] }
  | { id: string; kind: 'text'; q: string };

export const SURVEY: SurveyQ[] = [
  { id: 'Q1', kind: 'scale', q: '기물들이 순서대로 맞물려 연쇄로 칠 때의 손맛은?', lo: '매우 지루함', hi: '매우 짜릿함' },
  { id: 'Q2', kind: 'scale', q: '붉은 예고를 피해 빠지며 치기 · 적을 헛치게 만드는 재미는?', lo: '전혀 재미없음', hi: '매우 재미있음', zero: '한 번도 못 해 봄' },
  { id: 'Q3', kind: 'scale', q: '1막(첫 반장까지)의 전반적인 난이도는?', lo: '너무 쉬워 지루함', hi: '너무 어려워 막막함' },
  { id: 'Q4', kind: 'scale', q: '기물을 잃거나 출하가 끝났을 때, 그 원인은?', lo: '피할 수 없는 운 · 억까', hi: '내 실수 — 납득됨' },
  { id: 'Q5', kind: 'scale', q: '적의 예고와 내 기물의 결과(이동 · 피해)를 한눈에 예측하기 쉬웠나요?', lo: '매우 헷갈림', hi: '설명 없이 한눈에' },
  { id: 'Q6', kind: 'many', q: '뜻이 한눈에 안 들어오거나 헷갈렸던 말을 모두 고르세요.', opts: ['태엽', '연쇄', '+ · × 표지', '방열판', '생명', '심장 톱니', '부적', '승격', '보충병', '부품 띠', '기벽', '회피 반격', '기절', '기어 쇼크', '헷갈린 말 없음'] },
  { id: 'Q7', kind: 'one', q: '위기에서 되감기나 여벌 심장 톱니를 어떻게 썼나요?', opts: ['결정적 순간에 잘 썼다', '아끼다가 못 쓰고 졌다', '어떻게 쓰는지 몰랐다', '쓸 만큼 위험한 순간이 없었다'] },
  { id: 'Q8', kind: 'one', q: '오늘 테스트 뒤 「한 판 더」 하고 싶은 마음은?', opts: ['당장 한 판 더 — 이 빌드가 닫히면 아쉽다', '시간 나면 해 볼 것 같다', '별로 다시 하고 싶지 않다'] },
  { id: 'Q9', kind: 'text', q: '가장 짜릿했던 순간 한 줄 (기물 조합 · 역전 장면 등)' },
  { id: 'Q10', kind: 'text', q: '가장 답답했거나 끄고 싶었던 순간과 그 이유 한 줄' },
];

export const PLAYTEST_TEXT = {
  survey: '설문 (2분)',
  surveyTitle: '설문',
  surveyNote: '답은 이 기기의 기록에만 남습니다. 「기록 보내기」로 함께 전해 주십시오.',
  surveyDone: '설문을 남겼습니다. 고맙습니다.',
  export: '기록 보내기',
  exportTitle: '시험판 기록',
  exportNote: '복사해서 담당자에게 붙여 보내 주십시오. 파일로 저장해도 됩니다.',
  exportCount: (n: number) => `기록 ${n}건`,
  /** 단추 = 동사 하나 ≤ 6자 (voice ⑧, D-391) */
  copy: '복사한다',
  save: '저장한다',
  clear: '지운다',
  copied: '복사했습니다. 메신저 · 메일에 붙여 넣으십시오.',
  copyFail: '복사가 막혔습니다. 아래 글을 길게 눌러 모두 선택해 복사하십시오.',
  cleared: '기록을 지웠습니다.',
  bug: '제보',
  bugTitle: '제보',
  bugNote: '지금 판 상태(시드 · 덱 · 기물 · 최근 기록)가 함께 담깁니다. 무엇이 이상했는지 한 줄 적어 주십시오.',
  bugHint: '예: 비숍이 과녁을 쳤는데 피해가 안 들어갔다',
  bugSaved: '제보를 기록에 남겼습니다. 「기록 보내기」로 함께 전해 주십시오.',
  send: '남긴다',
  close: '닫는다',
  prev: '돌아간다',
  next: '넘긴다',
  done: '마친다',
};
