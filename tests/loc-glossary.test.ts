import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { localize } from '../src/data/locale';
import { MAP_TEXT, MAP_TEXT_KO, SCREEN_TEXT, SCREEN_TEXT_KO, SERVICE_CARDS, SERVICE_CARDS_KO } from '../src/data/hud';
import { EVENT_HINT, EVENT_HINT_KO, EVENT_UI, EVENT_UI_KO } from '../src/data/event-talk';
import { CHAPTERS, CHAPTERS_KO, runLabel } from '../src/data/campaign';
import { NODE_NAMES } from '../src/slice/run';
import { CHROME_EN, HUD_EN } from '../src/data/lang/en-ui';
import { CHAPTERS_EN, MAP_TEXT_EN, SCREEN_TEXT_EN, SERVICE_CARDS_EN } from '../src/data/lang/en-screens';
import { HUD_KO } from '../src/data/hud';

/**
 * 영어 용어집 확정안 (D-656 7가 → D-670, docs/loc/glossary.md §6): 열두 낱말 + 미국식 철자.
 * 영어 표(src/data/lang/en-*.ts)의 모든 글자(문자열 · 템플릿 조각)를 훑어 고르지 않은 대안 · 영국식 철자 · 오타를 막는다.
 */
const SOURCES = import.meta.glob<string>('../src/data/lang/en-*.ts', { query: '?raw', import: 'default', eager: true });
const files = Object.keys(SOURCES).map((p) => p.split('/').pop()!);

/** 파일 하나의 글자 조각 — 주석 · import 경로는 빼고 문자열 · 템플릿 조각만 */
const textsOf = (file: string): { text: string; line: number }[] => {
  const src = SOURCES[`../src/data/lang/${file}`];
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  const out: { text: string; line: number }[] = [];
  const at = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const walk = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push({ text: n.text, line: at(n) });
    else if (ts.isTemplateExpression(n)) {
      out.push({ text: [n.head.text, ...n.templateSpans.map((s) => '{} ' + s.literal.text)].join(''), line: at(n) });
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
};
/** 표의 열쇠(속성 이름)는 글이 아니다 — 'hud.endTurn' 같은 열쇠 문자열도 걸리지 않게 값만 남긴다 */
const isKey = (s: string): boolean => /^[a-z]+(\.[a-zA-Z0-9]+)+$/.test(s);

/** [금지 패턴, 까닭] — 열두 낱말의 고르지 않은 대안 · 오타 · 영국식 철자 */
const BANNED: [RegExp, string][] = [
  // 1 태엽 = Wind
  [/\bclockwork\b/i, '태엽 = Wind (Clockwork 아님)'],
  [/\btension\b/i, '태엽 = Wind (Tension 아님)'],
  [/\bAP\b/, '태엽 = Wind (AP 아님)'],
  // 2 출하 = Shipment
  [/\bruns?\b/i, '출하 = Shipment (Run 아님)'],
  [/\bbatch(es)?\b/i, '출하 = Shipment (Batch 아님)'],
  // 3 반장 = Foreman
  [/\bforman\b|\bformen\b/i, '반장 = Foreman (Forman 오타)'],
  [/\boverseers?\b/i, '반장 = Foreman (Overseer 아님)'],
  [/\bwardens?\b/i, '반장 = Foreman (Warden 아님)'],
  // 4 하자품 / 불량품 = reject / the defective
  [/\bflawed\b/i, '하자품 · 불량품 = reject / the defective (flawed 아님)'],
  // 5 버팀 = Grit
  [/\blast stand\b/i, '버팀 = Grit (Last Stand 아님)'],
  [/\bendure\b/i, '버팀 = Grit (Endure 아님)'],
  // 6 방열판 = Heatshield
  [/\bheat[\s-]shields?\b/i, '방열판 = Heatshield (한 낱말)'],
  [/\bplating\b/i, '방열판 = Heatshield (Plating 아님)'],
  [/\bwards?\b/i, '방열판 = Heatshield (Ward 아님)'],
  // 7 공정 = Line / machine floor
  [/\bstages?\b/i, '공정 = Line / machine floor (Stage 아님)'],
  [/\bprocess(es)?\b/i, '공정 = Line / machine floor (Process 아님)'],
  // 8 손질 = Upkeep
  [/\bmaintenance\b/i, '손질 = Upkeep (Maintenance 아님)'],
  [/\bservices?\b/i, '손질 = Upkeep (Service 아님)'],
  // 9 승급 = Coronation
  [/\bascension\b/i, '승급 = Coronation (Ascension 아님)'],
  [/\bcrowning\b/i, '승급 = Coronation (Crowning 아님)'],
  // 10 원수 = Nemesis
  [/\bgrudges?\b/i, '원수 = Nemesis (Grudge 아님)'],
  // 11 종이왕 · 도금왕 = Paper King · Gilded King
  [/\bgilt king\b/i, '도금왕 = Gilded King'],
  [/\bgolden king\b/i, '도금왕 = Gilded King'],
  [/\bpaper-crown\b/i, '종이왕 = Paper King'],
  // 12 미국식 철자
  [/colour|armour|mould|defence|\bgrey\b|centre|favour|honour|harbour|behaviour|\blicence\b|cancelled|travelled|catalogue|\bmetres?\b|theatre/i, '철자는 미국식 (D-670)'],
  [/\b(organis|realis|recognis|apologis|optimis|minimis|maximis|customis|standardis|prioritis|specialis|finalis|initialis|utilis)(e|ed|es|ing|ation)\b/i, '철자는 미국식 -ize (D-670)'],
];

describe('영어 용어집 확정안 (D-670)', () => {
  it('영어 표 파일이 있다', () => {
    expect(files).toEqual(expect.arrayContaining(['en-ui.ts', 'en-screens.ts']));
  });

  it('영어 표 글에 고르지 않은 대안 · 오타 · 영국식 철자가 없다', () => {
    const hits: string[] = [];
    for (const f of files)
      for (const { text, line } of textsOf(f)) {
        if (isKey(text)) continue;
        for (const [re, why] of BANNED) if (re.test(text)) hits.push(`${f}:${line} 「${text}」 — ${why}`);
      }
    expect(hits).toEqual([]);
  });

  it('금지 목록이 실제로 잡는다 (검사 자체 점검)', () => {
    const caught = (s: string) => BANNED.some(([re]) => re.test(s));
    for (const bad of ['Clockwork 3/3', 'Forman', 'The Overseer', 'Colour-aid', 'armour', 'Start a run', 'Ascension 2', 'Heat shield', 'Gilt King', 'organise'])
      expect(caught(bad), bad).toBe(true);
    for (const ok of ['Wind 3/3', 'the Ironplate Foreman', 'Foremen', 'Color-aid', 'armor', 'Start', 'Coronation', 'Heatshield', 'the Gilded King', 'Paper King', 'Grit +1', 'Upkeep', 'Nemesis', 'Casting Line', 'Rusted Spring'])
      expect(caught(ok), ok).toBe(false);
  });

  it('열두 낱말이 화면 자리에 그대로 들어가 있다', () => {
    expect(CHROME_EN.apLabel).toBe('Wind');
    expect(CHROME_EN.peek?.shield?.(1, 2)).toContain('Heatshield');
    expect(HUD_EN.bossRules).toBe('Foreman rules');
    expect(MAP_TEXT_EN.node?.boss).toBe('Foreman');
    expect(MAP_TEXT_EN.acts).toEqual(['Casting Line', 'Assembly Line', 'Inspection Line', 'Shipping Gate']);
    expect(MAP_TEXT_EN.roster?.brace?.(1, 2)).toBe('Grit 1/2');
    expect(SERVICE_CARDS_EN.kind).toBe('Upkeep');
    expect(SCREEN_TEXT_EN.forgeFinal).toBe('Final Upkeep');
    expect(CHAPTERS_EN.map((c) => c.alias)).toEqual(['Paper Crown', 'Rusted Spring', 'Golden Mercy', 'Hall of Mirrors']);
  });

  it('영어 표는 원문과 같은 모양으로 겹친다 (빠진 칸은 한국어)', () => {
    const en = localize(SCREEN_TEXT_KO, SCREEN_TEXT_EN, 'en');
    expect(en.shop).toBe('Scrap Dealer');
    expect(en.price(30)).toBe('Screws 30');
    expect(en.repairInfo(3, 10, 10)).toBe(SCREEN_TEXT_KO.repairInfo(3, 10, 10)); // 숫자만인 글은 원문 그대로
    const svc = localize(SERVICE_CARDS_KO, SERVICE_CARDS_EN, 'en');
    expect(svc.refine.icon).toBe(SERVICE_CARDS_KO.refine.icon); // 그림 열쇠는 원문에서
    expect(svc.refine.name).toBe('Hone');
    const map = localize(MAP_TEXT_KO, MAP_TEXT_EN, 'en');
    expect(map.actLabel(4)).toBe('Final Act');
    expect(map.roster.hp(3, 5)).toBe('HP 3/5');
    expect(localize(HUD_KO, HUD_EN, 'en').dictLeft(3)).toContain('3 terms');
  });

  it('한국어일 때는 둘째 묶음도 원문 그대로다 (한국어 화면은 바뀌지 않는다)', () => {
    expect(MAP_TEXT).toBe(MAP_TEXT_KO);
    expect(SCREEN_TEXT).toBe(SCREEN_TEXT_KO);
    expect(SERVICE_CARDS).toBe(SERVICE_CARDS_KO);
    expect(EVENT_HINT).toBe(EVENT_HINT_KO);
    expect(EVENT_UI).toBe(EVENT_UI_KO);
    expect(CHAPTERS).toEqual(CHAPTERS_KO);
    expect(NODE_NAMES.forge).toBe('작업대');
    expect(MAP_TEXT.actLabel(2)).toBe('2막');
    expect(MAP_TEXT.acts[0]).toBe('주조 공정');
    expect(runLabel('daily', 0)).toBe('오늘의 도전');
    expect(SCREEN_TEXT.revived('먼지투성이')).toBe('먼지투성이가 복귀했습니다.');
  });
});
