#!/usr/bin/env python3
"""
시험판 기록(텔레메트리 내보내기) 읽기 — PDF에서 뽑아 줄이 끊긴 JSON도 읽는다.

사용: python3 -I tools/playtest-log.py docs/reports/2026-11-14-playtest-log.txt
출력: 앞화면 시간(백그라운드 뺀 실제 플레이) · 대국 표(턴 · 잃은 HP · 잃은 기물 · 되감기 · 예고/맞음/회피/회피 반격 · 앞화면 분) ·
      고르기(draft_choice) 제시 vs 고름 · 같은 제시가 연달아 나온 곳(중복 고르기 의심).
"""
import collections
import json
import sys


def load(path):
    """줄바꿈 · 쪽 넘김(\\x0c)을 걷어 내고 JSON 덩어리를 차례로 읽는다."""
    s = open(path, encoding='utf-8').read().replace('\n', '').replace('\x0c', '')
    dec, i, out = json.JSONDecoder(), 0, []
    while i < len(s):
        while i < len(s) and s[i].isspace():
            i += 1
        if i >= len(s):
            break
        o, i = dec.raw_decode(s, i)
        out.append(o)
    return out


def fg_spans(ev):
    """앞화면 구간: session_exit ~ 다음 session_resume/app_open 사이를 뺀다."""
    spans, fg, start = [], True, ev[0]['t']
    for e in ev:
        if e['e'] == 'session_exit' and fg:
            spans.append((start, e['t']))
            fg = False
        elif e['e'] in ('session_resume', 'app_open') and not fg:
            fg, start = True, e['t']
    if fg:
        spans.append((start, ev[-1]['t']))
    return spans


def main(path):
    for o in load(path):
        ev = o['events']
        spans = fg_spans(ev)
        fg = lambda a, b: sum(max(0, min(b, y) - max(a, x)) for x, y in spans) / 60000
        print(f"# 기록 {o.get('session')} · 사건 {len(ev)} · 벽시계 {(ev[-1]['t'] - ev[0]['t']) / 60000:.1f}분 · 앞화면 {fg(ev[0]['t'], ev[-1]['t']):.1f}분")
        print('|막|칸|적|승|턴|잃은 HP|잃은 기물|되감기|예고|맞음|순수 회피|회피 반격|앞화면 분|')
        print('|-|-|-|-|-|-|-|-|-|-|-|-|-|')
        bs = r = None
        for e in ev:
            if e['e'] == 'battle_start':
                bs = e
            elif e['e'] == 'battle_result':
                r = e
            elif e['e'] == 'telegraph_resolution' and r and bs:
                print(f"|{r['act']}|{r['node_idx']}|{r['enemy_id'].replace(' ', '')}|{'O' if r['win'] else 'X'}|{r['turns']}|{r['hp_lost']}|{r['pieces_lost']}|{r['rewinds_used']}|"
                      f"{e['telegraph_count']}|{e['hit_count']}|{e['pure_evade_count']}|{e['counter_hit_count']}|{fg(bs['t'], r['t']):.1f}|")
        off, pick = collections.Counter(), collections.Counter()
        prev = None
        for e in ev:
            if e['e'] != 'draft_choice':
                continue
            for i in e['offered_ids']:
                off[i] += 1
            if e['picked_id']:
                pick[e['picked_id']] += 1
            if prev and prev['offered_ids'] == e['offered_ids'] and prev['kind'] == e['kind']:
                print(f"! 같은 제시가 연달아: {e['kind']} {e['offered_ids']} (막 {prev['act']} → {e['act']}, {(e['t'] - prev['t']) / 1000:.0f}초 뒤)")
            prev = e
        print('제시 많은 순 (제시 / 고름):', ', '.join(f'{k} {v}/{pick[k]}' for k, v in off.most_common(12)))
        for e in ev:
            if e['e'] == 'survey':
                print('설문:', json.dumps(e['answers'], ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
