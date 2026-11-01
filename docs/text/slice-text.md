# 수직 조각 텍스트 · 효과 전수표

> 자동 생성 (2026-11-01) — `sim/text-export.sim.ts`. 고칠 곳은 이 문서에 표시해 주면 원본(데이터 파일)에 반영한다.

## 0. 서술 스타일 규칙 (CLAUDE.md · D-087 · D-093 · D-098 · D-129)

- 존댓말 안내 금지. 모두 짧고 차갑게. 정겨운 말투 · 농담 · 애칭 · 말꼬리(~잖아 · ~볼래 · ~해 볼까) 금지.
- **서술**: 줄 앞 「* 」, ~다 체, 담담한 두 박자 + 엉뚱한 작은 디테일 하나 (언더테일식). 예: “* 나사를 먹는 기계. 배가 고파 보인다.”
- **인물 대사**: 반말, 큰따옴표 “ ” (검수관 · 고물상 주인 · 공방 장인 · 분대원 마지막 말).
- **주인공 독백**: 작은따옴표 ‘ ’, 1인칭 짧게, 컷신 · 결정적 순간에만.
- **버튼**: 동사 하나. **느낌표**는 치명적인 순간에만(검문! · 체크! · 충돌! …), **물음표**는 무작위가 걸린 선택에만.

## 1. 명령 카드

시작 덱: 전진 · 전진 · 전진 · 사선 · 사선 · 왕의 걸음 · 지휘 · 지휘 · 시작 분대: 킹 · 폰 · 비숍

| id | 이름 | 태엽 | 기물 | 축 | 설명 (화면) | 실제 효과 |
| :-- | :-- | :-: | :-- | :-- | :-- | :-- |
| advance | 전진 | 1 | 폰 | — | 움직여 친다. | 시작/영입 전용 |
| leap | 도약 | 1 | 나이트 | — | 뛰어넘어 친다. | 시작/영입 전용 |
| diagonal | 사선 | 1 | 비숍 | — | 사선으로 가서 친다. | 시작/영입 전용 |
| kingStep | 왕의 걸음 | 1 | 킹 | — | 한 칸 가서 둘레를 친다. | 시작/영입 전용 |
| order | 지휘 | 2 | 아무나 | — | 아무 기물이 움직여 친다. | 시작/영입 전용 |
| pierceDiag | 관통 사선 | 1 | 비숍 | 연쇄 | 비숍 · 첫 적을 지나 한 기 더 맞힌다. | 각인 pierce · 보상 후보 |
| crossLeap | 십자 도약 | 2 | 나이트 | 기병 | 나이트 · 내려앉은 칸 상하좌우로 50% 튄다. | 각인 cross · 보상 후보 |
| charge | 돌격 | 1 | 폰 | 보병 | 폰 · 이번 공격 ×1.6. | 배율 ×1.6 · 보상 후보 |
| plate | 방열판 | 1 | 아무나 | — | 기물 하나에 방열판 15. 움직이지 않는다. | 종류 shield · 수치 15 · 보상 후보 |
| repair | 땜질 | 1 | 아무나 | — | 기물 하나의 HP 15를 되찾는다. | 종류 repair · 수치 15 · 보상 후보 |
| reload | 재장전 | 0 | 아무나 | — | 카드 두 장을 뽑는다. | 종류 draw · 수치 2 · 보상 후보 |
| kingBlow | 왕의 일격 | 2 | 킹 | 왕관 | 킹 · 이번 공격 ×2. | 배율 ×2 · 보상 후보 |
| splashDiag | 대각 튐 | 2 | 비숍 | 연쇄 | 비숍 · 내려앉은 칸 대각선으로 50% 튄다. | 각인 diag · 보상 후보 |
| smash | 강타 | 2 | 아무나 | 연쇄 | 아무 기물 · 이번 공격 ×1.5. | 배율 ×1.5 · 보상 후보 |
| rookLine | 직진 | 2 | 룩 | — | 곧게 가서 친다. | 시작/영입 전용 |
| rebound | 재도약 | 1 | 나이트 | 기병 | 나이트 · 이번 턴 처치했으면 태엽 0. | 이번 턴 처치한 기물이면 태엽 0 · 보상 후보 |
| hoofKick | 말발굽 | 1 | 나이트 | 기병 | 나이트 · 처치하면 카드 한 장. | 처치마다 1장 · 보상 후보 |
| march | 행진 | 1 | 폰 | 보병 | 폰 모두 한 칸 앞으로 가서 친다. | 종류 march · 보상 후보 |
| draft | 징집 | 1 | 아무나 | 보병 | 킹 옆에 폰 하나를 세운다. 이번 대국만. | 종류 draft · 보상 후보 |
| wrath | 분노한 왕 | 1 | 킹 | 왕관 | 킹 · 잃은 HP만큼 세진다 (최대 ×3). | 잃은 HP 비율만큼 최대 ×3 · 보상 후보 |
| royalGuard | 왕의 갑주 | 1 | 킹 | 왕관 | 킹에게 방열판 30. | 종류 shield · 수치 30 · 보상 후보 |
| spark | 불씨 | 0 | 아무나 | 연쇄 | 처치 없이 연쇄 +1. 카드 한 장. | 종류 spark · 보상 후보 |
| finisher | 마무리 | 2 | 아무나 | 연쇄 | 아무 기물 · 연쇄 하나마다 ×0.5 더. | 연쇄마다 ×0.5 더 · 보상 후보 |
| cavCharge | 기마 돌격 | 2 | 나이트 | 기병 · 보병 | 나이트 · 착지 둘레의 폰도 전진해 친다. | 둘레 폰 전진 · 보상 후보 |
| kingGuard | 근위대 | 2 | 킹 | 왕관 · 보병 | 킹 · 둘레의 폰도 전진해 친다. | 둘레 폰 전진 · 보상 후보 |
| doubleLeap | 연속 도약 | 1 | 나이트 | 기병 · 연쇄 | 나이트 · 처치하면 연쇄가 두 칸 오른다. | 처치당 연쇄 2칸 · 보상 후보 |
| shove | 밀어치기 | 2 | 아무나 | 밀치기 | 아무 기물 · 친 적을 한 칸 민다. 막히면 충돌. | 밀치기 (충돌 18) · 보상 후보 |
| shieldBash | 방패 밀치기 | 1 | 폰 | 밀치기 · 보병 | 폰 · 친 적을 민다. 막히면 충돌. | 밀치기 (충돌 18) · 보상 후보 |
| ram | 들이받기 | 1 | 나이트 | 밀치기 · 기병 | 나이트 · 친 적을 민다. 막히면 충돌. | 밀치기 (충돌 18) · 보상 후보 |
| gambit | 희생 수 | 0 | 폰 | 보병 · 연쇄 | 내 폰 하나를 부순다. 연쇄 +2, 한 장. | 종류 gambit · 보상 후보 |

## 2. 부품

| id | 이름 | 축 | 설명 (화면) | 수치 |
| :-- | :-- | :-- | :-- | :-- |
| horseshoe | 편자 | 기병 | 나이트가 처치하면 태엽 +1. |  |
| magnet | 자석 손 | 기병 | 처치할 때마다 카드 한 장. |  |
| assembly | 조립 라인 | 보병 | 내 턴 시작에 폰이 둘 이하면 킹 옆에 폰 하나. | 폰 2 이하 |
| drum | 행진 북 | 보병 | 폰 카드 태엽 −1. |  |
| crown | 무거운 왕관 | 왕관 | 킹의 공격 ×2. | ×2 |
| throne | 이동식 옥좌 | 왕관 | 킹 카드를 내면 킹 방열판 +10. | 방열판 10 |
| coil | 증폭 코일 | 연쇄 | 연쇄가 곱해진다: 처치마다 ×1.5. 상한 없음. | ×1.5/처치 |
| echo | 이중 톱니 | 연쇄 | 처치 하나가 연쇄를 두 칸 올린다. |  |
| hammer | 쇠망치 | 밀치기 | 충돌 피해 ×2. | ×2 |
| spare | 여분 태엽 | 공용 | 태엽 +1. 대신 손패 −1. |  |
| tape | 이중 테이프 | 공용 | 되감기 두 번. |  |

### 부품 상자 (1판 뒤, 부품 + 카드 둘)

- 증폭 코일 + 불씨 · 마무리
- 행진 북 + 행진 · 행진
- 조립 라인 + 희생 수 · 징집
- 무거운 왕관 + 분노한 왕 · 왕의 일격
- 편자 + 재도약 · 재도약 (분대에 나이트 필요)
- 이중 톱니 + 연속 도약 · 불씨 (분대에 나이트 필요)
- 자석 손 + 불씨 · 불씨
- 쇠망치 + 방패 밀치기 · 밀어치기

### 영입 (입문 뒤, 기물 + 카드)

- 나이트 — “뛰어넘어 친다.” + 도약 · 도약
- 폰 — “싸고 많다.” + 전진 · 돌격
- 비숍 — “사선 끝까지.” + 사선 · 관통 사선
- 룩 — “곧은 줄을 민다. 비싸다.” + 직진

## 3. 분대원 (애착)

| id | 기벽 | 설명 (화면) |
| :-- | :-- | :-- |
| overwound | 과감김 태엽 | 공격 ×1.3 · HP −20% |
| welded | 납땜 흉갑 | 방열판 12 · 공격 −15% |
| stubborn | 고집 센 축 | 문턱 2번 · 공격 −15% |
| boiler | 새는 보일러 | 쓰러지면 둘레 폭발 20 |

- 이름 풀 (20): 고철이 · 나사못 · 톱니 · 녹슨발 · 삐걱이 · 땜쟁이 · 굴대 · 쇠뭉치 · 반쪽 · 덜컹이 · 찌그렁 · 용수철 · 볼트 · 너트 · 쇳조각 · 기름통 · 헛바퀴 · 못난이 · 깡통 · 절름발 · 킹은 「대장」
- 마지막 말: “태엽이… 다 풀렸다.” / “여기까지.” / “나사 하나만… 남겨 둬.” / “먼저 간다.” / “불량이 맞았네.” / “멈춘다.” / “용광로는… 따뜻하겠지.” / “다음 출하에서.”
- 자동 흔적: 3대국 생존 「용접 흉터」 · 문턱을 넘고 생존 「납땜 자국」 · 5처치 「○○ 분쇄기」 · 반장 처치 「반장 사냥꾼」 · 이식 흔적 「○○의 태엽」
- 유품 태엽: 자동 나사 +50 · 새는 보일러 폭발 20

## 4. 수치

- 손패 5 · 태엽 3 · 적 태엽 3 · 연쇄 +25%/처치 (상한 4) · 나사 트랙 10칸 × 5
- 판 사이 회복 30% · 정비: 쓰러진 하나 HP 50% + 모두 25% · 넘친 피해 10마다 나사 1
- 반장: 철갑 20 (2턴마다) · 줄 폭격 −18 (2턴마다) · 밀치기 충돌 18

## 5. 화면 문구 (코드 속 한글 문자열 전부)

### src/slice/main.ts

- `38` '입문 — 시험대'
- `38` '* 카드 → 기물 → 붉은 과녁. 킹을 쓰러뜨리면 끝.'
- `39` '1판 — 연마 공정'
- `39` '* 붉은 칸이 다음에 맞을 자리다. 비키거나 먼저 친다.'
- `40` '2판 — 주조 공정'
- `40` '* 부품이 달렸다. 조합을 터뜨린다.'
- `41` '3판 — 검문!'
- `41` '* 룩이 섞였다. 이기면 부품 상자가 열린다.'
- `42` '4판 — 반장'
- `42` '* 반장이 철갑을 두른다. 몰아쳐야 뚫린다.'
- `73` ', 24)} ${crewLabel(c)}</b> <span class="dim">${c.serial}</span><br>HP ${p.hp} / ${p.maxHp}${p.shield ? ` · 방열판 ${p.shield}` : '
- `73` '} · 처치 ${(c.kills ?? 0) + Object.values(b.pk[p.id] ?? {}).reduce((a, n) => a + (n ?? 0), 0)}${c.quirk ? `<br><span class="quirk">${QUIRKS[c.quirk].name}</span> ${QUIRKS[c.quirk].desc}` : '
- `73` '<br>문턱 남음'
- `74` `<b>${pieceImg(p.type, p.side, 'small', 24)} ${p.side === 0 ? '<span class="ally">아군</span>' : '<span class="enemy">적</span>'} ${PIECE_NAMES_KO[p.type]}</b><br>HP ${p.hp} / ${p.maxHp}${p.shield ? `
- `134` ' : poor ? `<em>태엽 ${cost} 필요</em>` : !ok ? `<em>${c.kind === '
- `134` '앞으로 갈 폰 없음'
- `134` '움직일 기물 없음'
- `136` "태엽 ${cost}"
- `171` '대국 끝'
- `171` '적 차례'
- `171` '움직이는 중'
- `171` `${b.turn}턴 · 내 차례`
- `173` ').innerHTML = `<p class="hand-head"><button type="button" class="deck-btn" data-deck>덱 ${deck.length}</button><button type="button" class="deck-btn" data-crew>분대 ${squad.length}</button> 뽑을 ${b.draw.length} · 버림 ${b.discard.length}</p>${b.hand.map(cardHtml).join('
- `173` '<p class="empty">손패가 비었다. 턴을 끝낸다.</p>'
- `177` ').innerHTML = `<b>반장 규칙</b><span>철갑 ${BOSS.plate} · ${BOSS.plateEvery}턴마다 다시</span><span${b.bombRow !== null ? '
- `177` '}>줄 폭격 −${BOSS.bombDamage} · ${b.bombRow !== null ? '
- `177` `${BOSS.bombEvery}턴마다`
- `179` ').innerHTML = `<span class="lbl">나사</span>${Array.from({ length: SLICE.coins }, (_, i) => `<i class="coin${i < b.coins ? '
- `181` ').innerHTML = `◀◀ 되감기 <small>${b.rewinds}/${parts.includes('
- `196` `<span class="mult">×${chainMult(b.kills, parts).toFixed(2)}</span><b>연쇄 ${b.kills}</b><span class="dmg">이번 턴 −${turnDmg}</span>${b.overkill ? `
- `211` '충돌'
- `231` `<small>연쇄 ${kills}</small>×${chainMult(kills, parts).toFixed(2)}${kills >= 3 ? '!' : ''}`
- `251` `태엽이 모자라다. (${costOf(b, i)} 필요)`
- `251` '앞으로 갈 폰이 없다.'
- `251` '낼 수 없다.'
- `262` `태엽이 모자라다. (${c.cost} 필요)`
- `264` '움직일 기물이 없다.'
- `264` `${PIECE_NAMES_KO[c.who]}이(가) 없거나 갈 칸이 없다.`
- `297` `${PIECE_NAMES_KO[p.type]}을(를) 움직일 카드가 없다.`
- `306` `* 이번에 움직인다. 붉은 칸을 친다.`
- `306` '* 이번엔 움직이지 않는다.'
- `337` `* 편자가 울린다. 태엽 +${gain}.`
- `349` '‘거기는 맞는다. 그래도?’ — 한 번 더 누르면 끝낸다.'
- `366` '조립'
- `404` `<div class="stamp-big bad">불량 폐기</div><p>* 집게가 상자째 들어 올린다.</p><div class="row"><button class="btn brass" type="button" data-again>이 판 다시</button></div>`
- `417` `${BATTLES[stage].title} ${fall.turn}턴 · ${fall.by}`
- `424` `* ${heirs.map((c) => c.name).join(' · ')}의 태엽이 저울에 오른다. 나사 +${heirs.length * CREW.heirloomScrews}.`
- `434` `<h2><span class="pass-tag">통과</span> ${BATTLES[stage].title} — 나사 +${earned}</h2>`
- `437` `<div class="stamp-big good">검문 통과</div><h2>부품 상자 — 나사 +${earned}</h2><p>* 검수관의 상자가 열린다. 부품 하나를 단다. 규칙이 바뀐다.</p>`
- `439` `<div class="stamp-big good">통과</div><h2>수직 조각 끝</h2><p>* 남은 분대 ${squad.length}기 · 나사 ${gold} · 덱 ${deck.length}장.</p><p class="dim">손맛이 어땠는지 — 카드 · 붉은 칸 · 연쇄 · 되감기 — 한 줄씩 알려 주면 다음 조각에 반영한다.</p><div class="row"><button class="btn brass" type="button" data-restart>처음부터</button></div>`
- `463` ` + 넘친 피해 ${b.overkill} → ${overGold}`
- `472` ">* 쉬는 사이 기름칠 — 남은 분대 HP +${Math.round(REST.heal * 100)}%: ${squad.map((u) => `${u.name ?? PIECE_NAMES_KO[u.t]} ${u.hp}`).join(' · ')}${fallen.length ? ` · <span class="
- `476` `쓰러진 ${[...fallen].sort((a, c) => (COST_ORDER[c.t] ?? 0) - (COST_ORDER[a.t] ?? 0))[0].name}을(를) HP 50%로 되살리고 `
- `495` `* ${o.revived.name}이(가) 다시 선다. 원부의 줄이 지워진다.`
- `495` '* 분대가 기름을 먹는다.'
- `518` `<h2>덱 ${deck.length}장</h2>`
- `518` `<h2>카드 빼기 — 한 장</h2><p>* 고물상 주인이 집게를 내민다. “하나 빼. 가벼워진다.”</p>`
- `519` `${head}<div class="deck-grid${mode === 'remove' ? ' removing' : ''}">${cards}</div><div class="row">${mode === 'view' ? '<button class="btn brass" type="button" data-close-deck>닫기</button>' : '<button class="btn" type="button" data-cancel>그만두기</button>'}</div>`
- `531` `* ${COMMANDS[id].name} 한 장이 집게에 들려 나간다.`
- `568` `<div><span class="dim">${c.serial}</span><b>${crewLabel(c)}</b><i>${LAST_WORDS[((c.serial ?? '').charCodeAt(3) + (c.kills ?? 0) + f.turn) % LAST_WORDS.length]}</i><small>* ${f.by}에게 쓰러졌다. 유품 태엽이 떨어진다.</small></div>`
- `582` `<div class="crew-row">${pieceImg(u.t, 0, 'small', 26)}<div><b>${crewLabel(u)}</b> <span class="dim">${u.serial} · HP ${u.hp ?? crewMaxHp(u)}/${crewMaxHp(u)} · 처치 ${u.kills ?? 0}</span>${q ? `
- `582` ' ? `<button class="btn sm" type="button" data-rename="${k}">이름</button>` : '
- `584` " data-ledger>폐기 원부 ${readLedger().length}</button><button class="
- `591` `<form class="rename"><input maxlength="8" value="${squad[k].name ?? ''}" aria-label="새 이름"><button class="btn sm brass" type="submit">새기기</button></form>`
- `613` ` : ''}</b> <span class="dim">${r.serial}</span> · 처치 ${r.kills} · 대국 ${r.battles}<br><small>${r.cause} · ${r.run}</small></div>`
- `614` '<p class="dim">아직 비어 있다.</p>'
- `642` `* ${crews[Number(btn.dataset.rec)].name}이(가) 분대에 선다.`
- `695` ">붉은 칸</b> = 가서 치는 범위 · <b style="
- `731` '<span>◀◀ 되감기</span>'

### src/slice/battle.ts

- `337` '없는 카드'
- `339` '태엽이 모자라다.'
- `344` '기물과 칸을 고른다.'
- `346` '이 카드로 움직일 수 없는 기물이다.'
- `348` '갈 수 없는 칸이다.'
- `386` '앞으로 갈 폰이 없다.'
- `388` '앞으로 갈 폰이 없다.'
- `395` '징집 — 폰이 선다'
- `396` '킹 옆에 빈 칸이 없다.'
- `402` '부술 폰이 없다.'
- `412` '내 기물을 고른다.'
- `470` '충돌!'
- `470` '벽 충돌!'
- `507` `적 ${PIECE_LABEL[attacker.type]}`
- `519` '보일러 폭발!'
- `527` '킹'
- `527` '퀸'
- `527` '룩'
- `527` '비숍'
- `527` '나이트'
- `527` '폰'
- `555` '줄 폭격!'
- `570` '적'
- `581` '줄 폭격'
- `612` '조립 라인 — 폰이 나온다'
- `625` '되감기를 다 썼다.'
- `643` '납땜 자국'
- `643` '납땜 자국'
- `644` '용접 흉터'
- `644` '용접 흉터'
- `645` '반장 사냥꾼'
- `648` `${PIECE_LABEL[(top?.[0] as PieceType) ?? 'P']} 분쇄기`
- `658` '알 수 없음'

### slice.html

- `8` <title>Pawnisher — 수직 조각</title>
- `13` "부품 (칙령 트레이)"
- `16` <span id="turn-label" class="plate turn-label">1턴 · 내 차례</span>
- `17` "규칙"
- `19` "나사 트랙"
- `21` "남은 태엽"
- `24` "되감기 — 이번 턴 처음으로 (대국마다 한 번)"
- `25` <button id="btn-end" class="btn brass btn-go" type="button">턴 끝</button>
- `32` <div id="rotate" class="rotate"><p>화면을 가로로 돌린다</p></div>

### 판 위 연출 문구 (src/view/BoardRenderer.ts에서 수직 조각이 쓰는 것)

- 문턱! · 충돌! · 벽 충돌! · 줄 폭격! · 보일러 폭발! · 징집 — 폰이 선다 · 조립 라인 — 폰이 나온다 · 체크! · 연쇄 N ×배수
