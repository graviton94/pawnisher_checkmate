import { it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { AXIS_NAMES, BOSS, COMMANDS, KITS, PUSH, RECRUITS, REWARD_COMMANDS, SLICE, START_DECK, START_SQUAD, type CommandId } from '../src/slice/cards';
import { PART_NUM, SLICE_PARTS, type SlicePartId } from '../src/slice/parts';
import { CREW, LAST_WORDS, NAMES, QUIRKS, type QuirkId } from '../src/slice/crew';
import { REST } from '../src/slice/battle';
import { PIECE_NAMES_KO } from '../src/data/pieces';

/** 수직 조각의 모든 이름 · 문구 · 효과를 한 문서로 (사용자 전수 점검용, D-157). `npx vitest run --config vitest.sim.config.ts sim/text-export.sim.ts` */
it('text export', () => {
  const L: string[] = [];
  /** 점검 아티팩트용 항목 (D-157) */
  const J: { id: string; group: string; name: string; text: string; fx?: string }[] = [];
  const who = (w: string) => (w === 'any' ? '아무나' : PIECE_NAMES_KO[w as keyof typeof PIECE_NAMES_KO]);
  L.push('# 수직 조각 텍스트 · 효과 전수표', '', `> 자동 생성 (${new Date().toISOString().slice(0, 10)}) — \`sim/text-export.sim.ts\`. 고칠 곳은 이 문서에 표시해 주면 원본(데이터 파일)에 반영한다.`, '');
  L.push('## 0. 서술 스타일 규칙 (CLAUDE.md · D-087 · D-093 · D-098 · D-129)', '');
  L.push('- 존댓말 안내 금지. 모두 짧고 차갑게. 정겨운 말투 · 농담 · 애칭 · 말꼬리(~잖아 · ~볼래 · ~해 볼까) 금지.');
  L.push('- **서술**: 줄 앞 「* 」, ~다 체, 담담한 두 박자 + 엉뚱한 작은 디테일 하나 (언더테일식). 예: “* 나사를 먹는 기계. 배가 고파 보인다.”');
  L.push('- **인물 대사**: 반말, 큰따옴표 “ ” (검수관 · 고물상 주인 · 공방 장인 · 분대원 마지막 말).');
  L.push('- **주인공 독백**: 작은따옴표 ‘ ’, 1인칭 짧게, 컷신 · 결정적 순간에만.');
  L.push('- **버튼**: 동사 하나. **느낌표**는 치명적인 순간에만(검문! · 체크! · 충돌! …), **물음표**는 무작위가 걸린 선택에만.', '');

  L.push('## 1. 명령 카드', '', `시작 덱: ${START_DECK.map((id) => COMMANDS[id].name).join(' · ')} · 시작 분대: ${START_SQUAD.map((t) => PIECE_NAMES_KO[t]).join(' · ')}`, '');
  L.push('| id | 이름 | 태엽 | 기물 | 축 | 설명 (화면) | 실제 효과 |', '| :-- | :-- | :-: | :-- | :-- | :-- | :-- |');
  for (const id of Object.keys(COMMANDS) as CommandId[]) {
    const c = COMMANDS[id];
    const fx = [c.kind !== 'move' ? `종류 ${c.kind}` : '', c.mult ? `배율 ×${c.mult}` : '', c.carve ? `각인 ${c.carve}` : '', c.amount ? `수치 ${c.amount}` : '', c.freeIfKiller ? '이번 턴 처치한 기물이면 태엽 0' : '', c.multPerKill ? `연쇄마다 ×${c.multPerKill} 더` : '', c.rage ? '잃은 HP 비율만큼 최대 ×3' : '', c.drawOnKill ? `처치마다 ${c.drawOnKill}장` : '', c.rally ? '둘레 폰 전진' : '', c.chainPerKill ? `처치당 연쇄 ${c.chainPerKill}칸` : '', c.push ? `밀치기 (충돌 ${PUSH.collide})` : '', REWARD_COMMANDS.includes(id) ? '보상 후보' : '시작/영입 전용'].filter(Boolean).join(' · ');
    J.push({ id: `card-${id}`, group: '명령 카드', name: `${c.name} · 태엽 ${c.cost} · ${who(c.who)}${c.axis ? ` · ${[c.axis, c.axis2].filter(Boolean).map((a) => AXIS_NAMES[a!]).join('·')}` : ''}`, text: c.desc, fx });
    L.push(`| ${id} | ${c.name} | ${c.cost} | ${who(c.who)} | ${[c.axis, c.axis2].filter(Boolean).map((a) => AXIS_NAMES[a!]).join(' · ') || '—'} | ${c.desc} | ${fx} |`);
  }
  L.push('', '## 2. 부품', '', '| id | 이름 | 축 | 설명 (화면) | 수치 |', '| :-- | :-- | :-- | :-- | :-- |');
  for (const id of Object.keys(SLICE_PARTS) as SlicePartId[]) {
    const d = SLICE_PARTS[id];
    J.push({ id: `part-${id}`, group: '부품', name: `${d.name} · ${d.axis ? AXIS_NAMES[d.axis] : '공용'}`, text: d.desc });
    L.push(`| ${id} | ${d.name} | ${d.axis ? AXIS_NAMES[d.axis] : '공용'} | ${d.desc} | ${id === 'coil' ? `×${PART_NUM.coilPerKill}/처치` : id === 'crown' ? `×${PART_NUM.crownMult}` : id === 'throne' ? `방열판 ${PART_NUM.throneShield}` : id === 'assembly' ? `폰 ${PART_NUM.assemblyBelow} 이하` : id === 'hammer' ? `×${PART_NUM.hammerMult}` : ''} |`);
  }
  L.push('', '### 부품 상자 (1판 뒤, 부품 + 카드 둘)', '');
  for (const k of KITS) J.push({ id: `kit-${k.part}`, group: '부품 상자', name: SLICE_PARTS[k.part].name, text: `+ ${k.cards.map((id) => COMMANDS[id].name).join(' · ')}`, fx: k.needs ? `분대에 ${PIECE_NAMES_KO[k.needs]} 필요` : undefined });
  for (const k of KITS) L.push(`- ${SLICE_PARTS[k.part].name} + ${k.cards.map((id) => COMMANDS[id].name).join(' · ')}${k.needs ? ` (분대에 ${PIECE_NAMES_KO[k.needs]} 필요)` : ''}`);
  L.push('', '### 영입 (입문 뒤, 기물 + 카드)', '');
  for (const r of RECRUITS) J.push({ id: `rec-${r.t}`, group: '영입', name: PIECE_NAMES_KO[r.t], text: r.line, fx: `+ ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}` });
  for (const r of RECRUITS) L.push(`- ${PIECE_NAMES_KO[r.t]} — “${r.line}” + ${r.cards.map((id) => COMMANDS[id].name).join(' · ')}`);
  L.push('', '## 3. 분대원 (애착)', '', '| id | 기벽 | 설명 (화면) |', '| :-- | :-- | :-- |');
  for (const id of Object.keys(QUIRKS) as QuirkId[]) J.push({ id: `quirk-${id}`, group: '기벽', name: QUIRKS[id].name, text: QUIRKS[id].desc });
  NAMES.forEach((n) => J.push({ id: `name-${n}`, group: '이름 풀', name: n, text: '분대원 이름' }));
  LAST_WORDS.forEach((w, k) => J.push({ id: `last-${k}`, group: '마지막 말', name: `#${k + 1}`, text: w }));
  for (const id of Object.keys(QUIRKS) as QuirkId[]) L.push(`| ${id} | ${QUIRKS[id].name} | ${QUIRKS[id].desc} |`);
  L.push('', `- 이름 풀 (${NAMES.length}): ${NAMES.join(' · ')} · 킹은 「대장」`);
  L.push(`- 마지막 말: ${LAST_WORDS.join(' / ')}`);
  L.push(`- 자동 흔적: 3대국 생존 「용접 흉터」 · 문턱을 넘고 생존 「납땜 자국」 · ${CREW.nickAfterKills}처치 「○○ 분쇄기」 · 반장 처치 「반장 사냥꾼」 · 이식 흔적 「○○의 태엽」`);
  L.push(`- 유품 태엽: 자동 나사 +${CREW.heirloomScrews} · 새는 보일러 폭발 ${CREW.boilerBlast}`);
  L.push('', '## 4. 수치', '');
  L.push(`- 손패 ${SLICE.hand} · 태엽 ${SLICE.ap} · 적 태엽 ${SLICE.enemyAp} · 연쇄 +${SLICE.chainPerKill * 100}%/처치 (상한 ${SLICE.chainCap}) · 나사 트랙 ${SLICE.coins}칸 × ${SLICE.coinValue}`);
  L.push(`- 판 사이 회복 ${REST.heal * 100}% · 정비: 쓰러진 하나 HP ${REST.reviveHp * 100}% + 모두 ${REST.overhaul * 100}% · 넘친 피해 10마다 나사 1`);
  L.push(`- 반장: 철갑 ${BOSS.plate} (${BOSS.plateEvery}턴마다) · 줄 폭격 −${BOSS.bombDamage} (${BOSS.bombEvery}턴마다) · 밀치기 충돌 ${PUSH.collide}`);
  // 화면 문구: 코드 속 한글 문자열 전부 (파일:줄)
  L.push('', '## 5. 화면 문구 (코드 속 한글 문자열 전부)', '');
  const seen = new Set<string>();
  for (const f of ['src/slice/main.ts', 'src/slice/battle.ts', 'slice.html']) {
    L.push(`### ${f}`, '');
    readFileSync(f, 'utf8').split('\n').forEach((line, n) => {
      if (/^\s*(\/\/|\*|\/\*\*)/.test(line)) return;
      const hits = line.match(/(['"`])(?:(?!\1).)*[가-힣](?:(?!\1).)*\1/g) ?? (f.endsWith('.html') && /[가-힣]/.test(line) ? [line.trim()] : []);
      for (const h of hits) {
        // 화면에 보이는 글만: 태그 · ${…} 식 · 따옴표를 걷어 낸다 (○ = 숫자 · 이름 자리)
        let t = h.slice(1, -1);
        for (let k = 0; k < 4; k++) t = t.replace(/\$\{[^{}]*\}/g, '○');
        t = t.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!/[가-힣]/.test(t) || seen.has(t)) continue;
        seen.add(t);
        L.push(`- \`${n + 1}\` ${t.replace(/\|/g, '\\|')}`);
        J.push({ id: `ui-${f.replace(/\W/g, '')}-${n + 1}-${J.length}`, group: '화면 문구', name: `${f.split('/').pop()}:${n + 1}`, text: t });
      }
    });
    L.push('');
  }
  L.push('### 판 위 연출 문구 (src/view/BoardRenderer.ts에서 수직 조각이 쓰는 것)', '', '- 문턱! · 충돌! · 벽 충돌! · 줄 폭격! · 보일러 폭발! · 징집 — 폰이 선다 · 조립 라인 — 폰이 나온다 · 체크! · 연쇄 N ×배수');
  for (const [k, v] of [['흔적', '3대국 생존 「용접 흉터」 · 문턱을 넘고 생존 「납땜 자국」 · 5처치 「○○ 분쇄기」 · 반장 처치 「반장 사냥꾼」'], ['판 위 연출', '문턱! · 충돌! · 벽 충돌! · 줄 폭격! · 보일러 폭발! · 징집 — 폰이 선다 · 조립 라인 — 폰이 나온다 · 체크! · 연쇄 N ×배수']]) J.push({ id: `misc-${k}`, group: '기타 문구', name: k, text: v });
  writeFileSync('docs/text/slice-text.md', L.join('\n') + '\n');
  writeFileSync('docs/text/slice-text.json', JSON.stringify(J, null, 1));
});
