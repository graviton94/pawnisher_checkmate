#!/usr/bin/env python3
"""
게임 배경 음악 (D-545 — 사용자가 시안 A · B · D를 골랐다). 시안(`bgm_concepts.py`)의 주제를 90초 넘는 루프로 늘려 다시 쓴다.

    python3 -I tools/audio/bgm_game.py [출력=public/audio/music] [--wav 미리듣기 폴더]

곡 일곱 (장면 배정은 src/data/music.ts):
- waltz       B 태엽 오르골 왈츠 · 90 BPM 3/4 · 48마디 96초 — 타이틀 · 메뉴 · 지도(지도는 낮은 통과 거름으로 멀리)
- anvil       A 모루 행진 · 100 BPM · 40마디 96초 — 대국 1~3막 (2막 · 3막은 재생 속도로 반음 · 온음 위)
- anvil-boss  A 반장 변주 · 132 BPM · 52마디 94.5초 — 반장전 · 레이드
- crown-final D 긴장 변주 · 76 BPM · 32마디 101초 — 도금왕
- crown       D 녹슨 왕관 · 64 BPM · 24마디 90초 — 왕관 장면 · 결말 · 크레딧 · 출하 끝
- gear        C1 톱니 칩 · F단조 96 BPM · 42마디 105초 — 고물상 · 작업대(정비) · 사건 (D-548, 자체 칩 합성 · 사운드폰트 없음 · CC0)
- gear-boss   C1 반장 변주 · 112 BPM · 45마디 96.4초 — 검문 대국

음색은 FluidR3_GM(Frank Wen, MIT — docs/CREDITS.md · src/data/licenses.ts). 악보 .mid는 tools/audio/midi/game-*.mid.
루프: 악보를 세 바퀴 렌더해 가운데 한 바퀴만 파형 맞춤으로 자른다 (앞 바퀴 잔향이 들어 있어 끝 → 처음이 이어진다).
크기: 통합 −18 LUFS · 첨두 −1 dBFS · OGG Vorbis 96 kbps + M4A(AAC 80 kbps, iOS Safari 옛판 대비).
"""
import os
import subprocess
import sys

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bgm_concepts import SR, Song, chord, m, render_fluid  # noqa: E402

TARGET = -18.0
MIDI_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'midi')
QUAL = {'D': 'm', 'Bb': 'M', 'A': 'M', 'G': 'm', 'Eb': 'M', 'C': 'M', 'F': 'M', 'Gm': 'm', 'Dm': 'm', 'Cm': 'm'}


def low2(root):
    """근음 이름 → 튜바 음역(A2 이하)의 MIDI 번호."""
    r = m(root + '2')
    return r if r <= m('A2') else m(root + '1')


def line(s, name, prog, ch, at, notes, vel, shift=0, legato=0.98):
    """선율 한 줄: notes = [(음 이름, 박)]. 시작 박을 돌려준다."""
    for n, d in notes:
        if n != 'r':
            s.add(name, prog, ch, at, d * legato, m(n) + shift, vel)
        at += d
    return at


# ================================================================ A 모루 행진 (대국)
A_THEME = [('D4', 2), ('F4', 1), ('E4', 1), ('D4', 3), ('A3', 1), ('Bb3', 2), ('A3', 1), ('G3', 1), ('A3', 4),
           ('G3', 2), ('Bb3', 1), ('A3', 1), ('F3', 3), ('D3', 1), ('Eb3', 2), ('F3', 1), ('G3', 1), ('A3', 4)]
A_P1 = ['D', 'D', 'Bb', 'A', 'G', 'D', 'Eb', 'A']
# C 부분: 버금딸림 쪽으로 비켜 선다 (Gm · Dm · Eb · Bb …) — 현이 노래하고 북이 물러난다
A_P2 = [('G', 'm'), ('D', 'm'), ('Eb', 'M'), ('Bb', 'M'), ('G', 'm'), ('D', 'm'), ('Eb', 'M'), ('A', 'M')]
A_SONG = [[('G4', 3), ('A4', 1)], [('F4', 2), ('D4', 2)], [('Eb4', 1), ('F4', 1), ('G4', 1), ('Bb4', 1)], [('D5', 3), ('C5', 1)],
          [('Bb4', 2), ('A4', 1), ('G4', 1)], [('F4', 2), ('A4', 2)], [('G4', 2), ('Bb4', 1), ('G4', 1)], [('C#5', 2), ('A4', 2)]]


def anvil():
    s = Song(100, 4, 40)
    for bar in range(40):
        b0 = bar * 4
        sec = 'intro' if bar < 4 else 'A' if bar < 12 else 'B' if bar < 20 else 'C' if bar < 28 else 'D' if bar < 36 else 'out'
        if sec == 'C':
            root, q = A_P2[bar - 20]
        else:
            root = A_P1[bar % 8] if sec != 'out' else A_P1[4 + (bar - 36)]
            q = QUAL[root]
        r2 = low2(root)
        # 저음 금관 오스티나토 (망치질: 쿵 · 쿵쿵 · 5도 · 쿵). C 부분은 두 박 길게
        pat = [(0, 0.75, 0), (1, 0.5, 0), (1.5, 0.5, 0), (2.5, 0.5, 7), (3, 0.75, 0)]
        if sec == 'C':
            pat = [(0, 1.9, 0), (2, 1.4, 7), (3.5, 0.5, 0)]
        for at, d, iv in pat:
            s.add('tuba', 58, 0, b0 + at, d, r2 + iv, 100 if sec != 'C' else 80)
            if sec != 'intro':
                s.add('trombone', 57, 1, b0 + at, d, r2 + 12 + iv, 70 if sec != 'D' else 82)
        # 현 패드
        if sec != 'intro':
            for p in chord(m(root + '3'), q):
                s.add('strings', 48, 2, b0, 4, p, 55 if sec not in ('C', 'D') else 62)
        # 타악: 큰북 = 망치, 아고고 = 모루, 카우벨 = 작은 망치, 하이햇 = 증기
        kick = sec in ('A', 'B', 'D') or (sec == 'intro' and bar >= 2) or (sec == 'out' and bar < 39)
        if kick:
            s.add('drums', 0, 9, b0, 0.5, 36, 115)
            s.add('drums', 0, 9, b0 + 2.5, 0.5, 36, 100)
        s.add('drums', 0, 9, b0 + 1, 0.3, 67, 110 if sec != 'C' else 85)
        s.add('drums', 0, 9, b0 + 3, 0.3, 68, 115 if sec != 'C' else 90)
        if bar % 2 == 1:
            s.add('drums', 0, 9, b0 + 3.5, 0.3, 67, 80)
        hats = 8 if sec != 'C' else 4
        for k in range(hats):
            s.add('drums', 0, 9, b0 + k * (4 / hats), 0.2, 42, 40 + (15 if k % 2 == 0 else 0))
        if bar in (4, 12, 28):
            s.add('drums', 0, 9, b0, 1, 49, 100)
        if sec in ('B', 'D'):
            for k in (0, 2):
                s.add('taiko', 116, 3, b0 + k, 1, m('D3'), 100 if sec == 'B' else 110)
        if sec == 'D' and bar % 2 == 1:
            s.add('drums', 0, 9, b0 + 3, 0.3, 38, 90)
            s.add('drums', 0, 9, b0 + 3.5, 0.3, 38, 100)
        if bar == 35:  # D → 끝: 북 몰아치기
            for k in range(8):
                s.add('drums', 0, 9, b0 + 2 + k * 0.25, 0.2, 38, 70 + k * 6)
        # C 부분 노래 (현 선율 — 바이올린 합주)
        if sec == 'C':
            line(s, 'violins', 48, 4, b0, A_SONG[bar - 20], 84)
            if bar >= 24:
                line(s, 'oboe', 68, 6, b0 + 0.5, [(n, d) for n, d in A_SONG[bar - 20]][:2], 58, shift=-12)
    # 호른 주제 (B 부분), D 부분은 호른 + 트럼펫 옥타브 위
    line(s, 'horn', 60, 5, 48, A_THEME, 92)
    line(s, 'horn', 60, 5, 112, A_THEME, 98)
    line(s, 'trumpet', 56, 7, 112, A_THEME, 72, shift=12)
    # 끝 4마디: 호른이 주제 첫 구를 낮게 한 번 더 (돌아가는 다리)
    line(s, 'horn', 60, 5, 144, [('D4', 2), ('F4', 1), ('E4', 1), ('D4', 3), ('A3', 1), ('Bb3', 2), ('A3', 1), ('G3', 1), ('A3', 4)], 78)
    return s


A_PB = ['D', 'Eb', 'D', 'C', 'Bb', 'Eb', 'A', 'A']
A_BOSS_THEME = [('D5', 1), ('Eb5', 1), ('D5', 1), ('A4', 1), ('Bb4', 2), ('A4', 2), ('D5', 1), ('Eb5', 1), ('F5', 1), ('Eb5', 1), ('D5', 4)]
A_BOSS_P2 = [('G', 'm'), ('G', 'm'), ('Eb', 'M'), ('Eb', 'M'), ('C', 'm'), ('C', 'm'), ('A', 'M'), ('A', 'M')]
A_BOSS_SONG = [[('Bb4', 2), ('A4', 2)], [('G4', 4)], [('G4', 2), ('Bb4', 2)], [('Eb5', 4)],
               [('C5', 2), ('Eb5', 2)], [('G5', 4)], [('E5', 2), ('C#5', 2)], [('E5', 4)]]


def anvil_boss():
    s = Song(132, 4, 52)
    for bar in range(52):
        b0 = bar * 4
        sec = 'intro' if bar < 4 else 'A' if bar < 12 else 'T' if bar < 20 else 'B' if bar < 28 else 'T2' if bar < 36 else 'brk' if bar < 44 else 'F'
        if sec == 'B':
            root, q = A_BOSS_P2[bar - 20]
        else:
            root = A_PB[bar % 8] if sec != 'intro' else ['D', 'D', 'Eb', 'A'][bar]
            q = QUAL[root]
        r2 = low2(root)
        steps = [0, 0, 12, 0, 1, 0, 7, 0] if root in ('D',) else [0, 0, 12, 0, 0, 7, 0, 12]
        for x in range(8):
            if sec == 'intro' and x % 2:
                continue
            s.add('tuba', 58, 0, b0 + x * 0.5, 0.4, r2 + steps[x], 100)
            if sec not in ('intro', 'brk'):
                s.add('trombone', 57, 1, b0 + x * 0.5, 0.4, r2 + 12 + steps[x], 85)
        if sec not in ('intro', 'brk'):
            for p in chord(m(root + '3'), q):
                s.add('strings', 48 if sec != 'B' else 44, 2, b0, 4, p, 70)
        # 북
        if sec != 'intro' or bar >= 2:
            s.add('drums', 0, 9, b0, 0.5, 36, 115)
            s.add('drums', 0, 9, b0 + 2.5, 0.5, 36, 100)
        s.add('drums', 0, 9, b0 + 1, 0.3, 67, 110)
        s.add('drums', 0, 9, b0 + 3, 0.3, 68, 115)
        if sec not in ('intro',):
            s.add('drums', 0, 9, b0 + 1, 0.3, 38, 100)
            s.add('drums', 0, 9, b0 + 3, 0.3, 38, 110)
        for k in range(8):
            s.add('drums', 0, 9, b0 + k * 0.5, 0.2, 42, 40 + (15 if k % 2 == 0 else 0))
        for k in range(4):
            s.add('timp', 47, 3, b0 + k, 0.9, r2 + 12 if k % 2 == 0 else r2 + 19, 95 if sec != 'intro' else 80)
        if bar % 4 == 0 and sec not in ('intro', 'brk'):
            s.add('drums', 0, 9, b0, 1, 49, 110)
            for p in chord(m(root + '4'), q):
                s.add('brass', 61, 4, b0, 0.5, p, 110)
                s.add('brass', 61, 4, b0 + 0.75, 0.75, p, 105)
        if sec == 'F':  # 끝 부분: 마디마다 금관 찌르기
            for p in chord(m(root + '4'), q):
                s.add('brass', 61, 4, b0 + 2.5, 0.4, p, 100)
        if sec == 'brk' and bar >= 40:  # 다시 몰아치기: 작은북 16분 크레셴도
            for k in range(16):
                s.add('drums', 0, 9, b0 + k * 0.25, 0.2, 38, 50 + (bar - 40) * 15 + k * 2)
        if sec == 'B':
            line(s, 'trumpet', 56, 6, b0, A_BOSS_SONG[bar - 20], 92)
            s.add('choir', 52, 7, b0, 4, chord(m(root + '4'), q)[0], 62)
    # 반장 주제 (호른 낮게): T = 두 번, T2 = 트럼펫이 옥타브 위에서 같이
    for start in (48, 64):
        line(s, 'horn', 60, 5, start, A_BOSS_THEME, 100, shift=-12)
    for start in (112, 128):
        line(s, 'horn', 60, 5, start, A_BOSS_THEME, 104, shift=-12)
        line(s, 'trumpet', 56, 6, start, A_BOSS_THEME, 88)
    for start in (176, 192):
        line(s, 'horn', 60, 5, start, A_BOSS_THEME, 100, shift=-12)
    return s


# ================================================================ B 태엽 오르골 왈츠 (타이틀 · 지도)
B_BASS = ['A2', 'G#2', 'G2', 'F#2', 'F2', 'E2', 'D2', 'E2']
B_CHS = [('A3', 'm'), ('E3', 'M'), ('C3', 'M'), ('D3', 'M'), ('F3', 'M'), ('C3', 'M'), ('D3', 'm'), ('E3', 'M')]
B_MEL = [
    [('E5', 1.5), ('D5', 0.5), ('C5', 1)], [('B4', 2), ('E4', 1)], [('C5', 1), ('E5', 1), ('G5', 1)], [('F#5', 2), ('A4', 1)],
    [('A4', 1), ('C5', 1), ('F5', 1)], [('E5', 1.5), ('D5', 0.5), ('C5', 1)], [('D5', 1), ('F5', 1), ('A4', 1)], [('G#4', 3)],
]
B_MEL2 = [
    [('A5', 1.5), ('G5', 0.5), ('E5', 1)], [('D5', 1), ('B4', 1), ('G#4', 1)], [('E5', 2), ('C5', 1)], [('A4', 1), ('D5', 1), ('F#5', 1)],
    [('F5', 1.5), ('E5', 0.5), ('D5', 1)], [('C5', 1), ('B4', 1), ('C5', 1)], [('B4', 1), ('A4', 1), ('B4', 1)], [('E5', 1.5), ('G#4', 1.5)],
]
# 가운데 (나란한 장조 C): 태엽이 잠깐 풀린다 — 첼레스타가 선율, 오르골이 메아리
B_MID_BASS = ['C3', 'B2', 'A2', 'E2', 'F2', 'E2', 'D2', 'G2', 'C3', 'B2', 'A2', 'G2', 'F2', 'E2', 'D2', 'E2']
B_MID_CH = [('C3', 'M'), ('G3', 'M'), ('A3', 'm'), ('E3', 'm'), ('F3', 'M'), ('C3', 'M'), ('D3', 'm'), ('G3', 'M'),
            ('C3', 'M'), ('G3', 'M'), ('A3', 'm'), ('E3', 'm'), ('F3', 'M'), ('A3', 'm'), ('D3', 'm'), ('E3', 'M')]
B_MID_MEL = [
    [('G5', 2), ('E5', 1)], [('D5', 2), ('B4', 1)], [('C5', 1), ('E5', 1), ('A5', 1)], [('G5', 3)],
    [('A5', 1.5), ('G5', 0.5), ('F5', 1)], [('E5', 2), ('C5', 1)], [('D5', 1), ('E5', 1), ('F5', 1)], [('D5', 3)],
    [('E5', 2), ('G5', 1)], [('D5', 2), ('G4', 1)], [('A4', 1), ('C5', 1), ('E5', 1)], [('B4', 3)],
    [('A4', 1.5), ('C5', 0.5), ('F5', 1)], [('E5', 1), ('C5', 1), ('A4', 1)], [('F5', 1), ('D5', 1), ('B4', 1)], [('G#4', 3)],
]


def waltz():
    s = Song(90, 3, 48)
    for bar in range(48):
        b0 = bar * 3
        if bar < 24:
            k, mid = bar % 8, False
            bass, (root, q) = B_BASS[k], B_CHS[k]
            mel = (B_MEL if (bar // 8) % 2 == 0 else B_MEL2)[k]
        elif bar < 40:
            k, mid = bar - 24, True
            bass, (root, q) = B_MID_BASS[k], B_MID_CH[k]
            mel = B_MID_MEL[k]
        else:
            k, mid = bar % 8, False
            bass, (root, q) = B_BASS[k], B_CHS[k]
            mel = B_MEL[k]
        s.add('pizz', 45, 0, b0, 1, m(bass), 95 if not mid else 85)
        for beat in (1, 2):
            for p in chord(m(root), q)[1:] + [m(root) + 12]:
                s.add('pizz', 45, 0, b0 + beat, 0.6, p, 60 if not mid else 52)
        # 시계: 똑 · 딱 (가운데는 똑만)
        s.add('drums', 0, 9, b0, 0.2, 77, 70)
        if not mid:
            s.add('drums', 0, 9, b0 + 1, 0.2, 76, 45)
            s.add('drums', 0, 9, b0 + 2, 0.2, 76, 45)
        if mid:
            line(s, 'celesta', 8, 2, b0, mel, 92)
            # 오르골은 반 마디 늦게 한 옥타브 위에서 앞 음 둘만 메아리
            line(s, 'musicbox', 10, 1, b0 + 1.5, mel[:1], 55, shift=12)
            if k >= 8:
                s.add('cello', 42, 3, b0, 3, m(bass) + 12, 62)
        else:
            line(s, 'musicbox', 10, 1, b0, mel, 100, legato=1.0)
            if bar >= 8:
                at = b0 + 0.5
                for n, d in mel[:2]:
                    s.add('celesta', 8, 2, at, d * 0.9, m(n) + 12 - 7 if k % 2 else m(n) + 12 - 3, 50)
                    at += d
                s.add('cello', 42, 3, b0, 3, m(bass) + 12, 70)
            if bar >= 40:  # 돌아온 주제: 바이올린이 길게 받친다
                s.add('violin', 40, 4, b0, 3, chord(m(root), q)[1] + 12, 48)
    return s


# ================================================================ D 녹슨 왕관 (결말 · 도금왕)
D_PROG = [('C', 'm'), ('Ab', 'M'), ('F', 'm'), ('G', 'M'), ('Eb', 'M'), ('Ab', 'M'), ('D', 'dim'), ('G', 'M'),
          ('C', 'm'), ('F', 'm'), ('Ab', 'M'), ('G', 'M')]
D_MEL = [
    [('G4', 2), ('Eb4', 1), ('D4', 1)], [('C4', 3), ('Eb4', 1)], [('F4', 2), ('Ab4', 1), ('G4', 1)], [('G4', 4)],
    [('Bb4', 2), ('G4', 1), ('Eb4', 1)], [('C5', 3), ('Bb4', 0.5), ('Ab4', 0.5)], [('Ab4', 2), ('F4', 1), ('D4', 1)], [('B3', 2), ('D4', 2)],
    [('Eb4', 2), ('D4', 1), ('C4', 1)], [('Ab4', 2), ('G4', 1), ('F4', 1)], [('Eb4', 1), ('F4', 1), ('Ab4', 1), ('C5', 1)], [('B4', 4)],
]
# 가운데: 첼로 독주가 노래한다 (Ab · Eb · Bb · Cm | Fm · Db · G · G), 끝 넷은 피아노 주제가 높게 돌아온다
D_PROG2 = [('Ab', 'M'), ('Eb', 'M'), ('Bb', 'M'), ('C', 'm'), ('F', 'm'), ('Db', 'M'), ('G', 'M'), ('G', 'M'),
           ('C', 'm'), ('Ab', 'M'), ('F', 'm'), ('G', 'M')]
D_CELLO = [[('C4', 2), ('Eb4', 1), ('C4', 1)], [('Bb3', 3), ('G3', 1)], [('F3', 2), ('D4', 2)], [('Eb4', 3), ('D4', 0.5), ('C4', 0.5)],
           [('Ab3', 2), ('C4', 1), ('F4', 1)], [('F4', 2), ('Db4', 2)], [('D4', 2), ('B3', 1), ('G3', 1)], [('B3', 4)]]


def tones_of(root, q):
    r3 = m(root + '3') if m(root + '3') <= m('G3') else m(root + '2')
    if q == 'dim':
        return [r3, r3 + 3, r3 + 6, r3 + 10]
    return chord(r3, q)


def crown():
    s = Song(64, 4, 24)
    for bar in range(24):
        b0 = bar * 4
        root, q = (D_PROG if bar < 12 else D_PROG2)[bar % 12]
        tones = tones_of(root, q)
        arp = [tones[0] - 12, tones[2] - 12, tones[0], tones[1], tones[2], tones[1], tones[0], tones[2] - 12]
        if 12 <= bar < 20:  # 첼로가 노래하는 동안 피아노는 반으로 줄인다 (첫 박 · 셋째 박만)
            for k in (0, 2, 4, 6):
                s.add('pianoL', 0, 0, b0 + k * 0.5, 1.9, arp[k], 55)
        else:
            for k, p in enumerate(arp):
                s.add('pianoL', 0, 0, b0 + k * 0.5, 0.9, p, 62)
        if bar < 12:
            line(s, 'pianoR', 0, 1, b0, D_MEL[bar], 78, shift=12 if bar >= 8 else 0, legato=0.95)
        elif bar >= 20:
            line(s, 'pianoR', 0, 1, b0, D_MEL[bar - 20], 70, shift=12, legato=0.95)
        else:
            line(s, 'cellosolo', 42, 5, b0, D_CELLO[bar - 12], 92, legato=0.97)
        if 4 <= bar:
            vel = 50 if bar < 20 else 44
            for p in tones[:3]:
                s.add('strings', 48, 2, b0, 4, p + 12, vel)
            s.add('cello', 42, 3, b0, 4, tones[0] - 12 if tones[0] - 12 >= m('C2') else tones[0], 64)
        if 8 <= bar < 12:
            line(s, 'violin', 40, 4, b0 + 0.5, D_MEL[bar], 66, shift=15 if bar != 11 else 12, legato=0.95)
        if 16 <= bar < 20:  # 바이올린이 첼로를 6도 위에서 받친다
            line(s, 'violin', 40, 4, b0 + 1, D_CELLO[bar - 12][:2], 56, shift=9, legato=0.95)
    return s


D_FINAL_SONG = [[('G4', 4)], [('Ab4', 4)], [('G4', 2), ('Eb4', 2)], [('D4', 4)], [('F4', 2), ('Ab4', 2)], [('Ab4', 2), ('F4', 2)],
                [('Eb5', 4)], [('D5', 4)], [('C5', 2), ('G4', 2)], [('Db5', 4)], [('B4', 4)], [('G4', 4)]]
D_FINAL_P2 = [('C', 'm'), ('Db', 'M'), ('C', 'm'), ('G', 'M'), ('F', 'm'), ('Db', 'M'), ('Ab', 'M'), ('G', 'M'),
              ('C', 'm'), ('Db', 'M'), ('G', 'M'), ('G', 'M')]


def crown_final():
    s = Song(76, 4, 32)
    prog1 = D_PROG[:10] + [('Db', 'M'), ('G', 'M')]
    for bar in range(32):
        b0 = bar * 4
        sec = 'A' if bar < 12 else 'B' if bar < 24 else 'A2'
        root, q = (prog1[bar] if sec == 'A' else D_FINAL_P2[bar - 12] if sec == 'B' else prog1[bar - 24])
        tones = tones_of(root, q)
        for k in range(8):
            s.add('pianoL', 0, 0, b0 + k * 0.5, 0.45, tones[0] - 12 if k % 2 == 0 else tones[0] - 24, 80)
        if sec == 'A':
            line(s, 'pianoR', 0, 1, b0, D_MEL[bar], 78, legato=0.95)
        elif sec == 'A2':
            line(s, 'pianoR', 0, 1, b0, D_MEL[bar - 24], 84, legato=0.95)
            line(s, 'violin', 40, 6, b0, D_MEL[bar - 24], 70, shift=12, legato=0.95)
        else:
            line(s, 'brass', 61, 6, b0, D_FINAL_SONG[bar - 12], 92, legato=0.97)
            s.add('trombone', 57, 7, b0, 4, tones[0] - 12, 78)
        for p in tones[:3]:
            s.add('strings', 44, 2, b0, 4, p + 12, 72)
        s.add('cello', 42, 3, b0, 4, tones[0] - 12 if tones[0] - 12 >= m('C2') else tones[0], 68)
        s.add('choir', 52, 4, b0, 4, tones[0] + 12, 60 if sec != 'B' else 74)
        s.add('timp', 47, 5, b0, 1, tones[0] - 12, 85)
        if bar % 2 == 1:
            s.add('timp', 47, 5, b0 + 3, 0.5, tones[0] - 12, 70)
            s.add('timp', 47, 5, b0 + 3.5, 0.5, tones[0] - 12, 80)
        if sec == 'B' and bar % 4 == 3:  # 팀파니 굴림
            for k in range(8):
                s.add('timp', 47, 5, b0 + 2 + k * 0.25, 0.25, tones[0] - 12, 60 + k * 6)
        if sec == 'A2':
            s.add('taiko', 116, 8, b0, 1, m('C3'), 96)
            s.add('taiko', 116, 8, b0 + 2, 1, m('C3'), 84)
        if bar in (12, 24):
            s.add('drums', 0, 9, b0, 2, 49, 100)
    return s


# ================================================================ C1 톱니 칩 (D-548 — 고물상 · 작업대 · 사건, 검문)
# 칩 합성 그대로 (bgm_concepts.Chip: 4비트 음량 계단 펄스 · 계단 삼각 · 노이즈 북). 꼬리는 버퍼 처음으로 감아 이음매가 없다.
# 셋째 칸 강세는 곡 전체 16분 번호로 센다 — 마디 수 × 16이 3의 배수여야 끝 → 처음에서 강세가 끊기지 않는다 (42 · 45마디).
# 선율 음은 F4 기준 반음 (Ab4 = 3 · C5 = 7 · F5 = 12 · E5 = 11 = 이끎음).
GEAR_PROG = [('F', 'm'), ('F', 'm'), ('Db', 'M'), ('Db', 'M'), ('Bb', 'm'), ('Bb', 'm'), ('C', 'M'), ('C', 'M'),
             ('F', 'm'), ('F', 'm'), ('Db', 'M'), ('Eb', 'M'), ('Bb', 'm'), ('C', 'M'), ('F', 'm'), ('C', 'M'),
             ('Db', 'M'), ('C', 'M')]
GEAR_LEAD = [[(0, 3), (3, 1)], [(7, 4)], [(8, 2), (7, 1), (5, 1)], [(5, 4)], [(5, 2), (8, 2)], [(10, 3), (8, 1)], [(7, 4)], [(4, 2), (7, 2)],
             [(12, 3), (10, 1)], [(8, 2), (7, 2)], [(5, 2), (8, 1), (10, 1)], [(10, 3), (7, 1)], [(5, 2), (3, 1), (1, 1)], [(-1, 4)], [(0, 4)], [(4, 2), (7, 2)],
             [(5, 2), (8, 2)], [(7, 4)]]
# 본 루프 새 부분 B: 나란한 장조(Ab)로 비켜 서서 오르골 칩이 노래한다 (지도 왈츠와 이어지는 결)
GEAR_B_PROG = [('Ab', 'M'), ('Eb', 'M'), ('F', 'm'), ('Db', 'M'), ('Ab', 'M'), ('Eb', 'M'), ('Db', 'M'), ('C', 'M')]
GEAR_B_LEAD = [[(7, 2), (3, 2)], [(10, 3), (7, 1)], [(8, 2), (7, 1), (5, 1)], [(8, 4)],
               [(12, 2), (10, 1), (7, 1)], [(10, 2), (14, 2)], [(12, 2), (8, 1), (5, 1)], [(7, 3), (4, 1)]]
# 새 부분 C: 톱니가 갈린다 — Bb단조 · Gb으로 내려가 날카로운 펄스 선율 + 삼각 맞선율, 북이 두 배
GEAR_C_PROG = [('Bb', 'm'), ('Gb', 'M'), ('Db', 'M'), ('C', 'M'), ('Bb', 'm'), ('Gb', 'M'), ('Eb', 'M'), ('C', 'M')]
GEAR_C_LEAD = [[(5, 1), (8, 1), (12, 2)], [(13, 3), (12, 1)], [(8, 2), (12, 2)], [(11, 3), (7, 1)],
               [(17, 2), (15, 1), (13, 1)], [(13, 2), (8, 2)], [(10, 2), (14, 1), (10, 1)], [(7, 4)]]
# 반장(검문) 변주: 시안 진행 + 새 부분 둘
GEAR_BOSS_PROG = [('F', 'm'), ('Gb', 'M'), ('F', 'm'), ('E', 'dim'), ('Db', 'M'), ('Gb', 'M'), ('C', 'M'), ('C', 'M'),
                  ('F', 'm'), ('Gb', 'M'), ('Db', 'M'), ('C', 'M')]
GEAR_BOSS_B_PROG = [('Bb', 'm'), ('Bb', 'm'), ('Gb', 'M'), ('Gb', 'M'), ('E', 'dim'), ('E', 'dim'), ('C', 'M'), ('C', 'M')]
GEAR_BOSS_B_LEAD = [[(5, 4)], [(8, 2), (5, 2)], [(13, 4)], [(10, 2), (8, 2)], [(11, 4)], [(14, 2), (11, 2)], [(7, 4)], [(11, 2), (14, 2)]]
GEAR_BOSS_C_PROG = [('F', 'm'), ('Db', 'M'), ('Gb', 'M'), ('C', 'M'), ('F', 'm'), ('Db', 'M'), ('Gb', 'M'), ('C', 'M')]
GEAR_BOSS_C_LEAD = [[(12, 1), (15, 1), (19, 2)], [(20, 2), (19, 1), (15, 1)], [(17, 3), (13, 1)], [(11, 2), (14, 2)],
                    [(12, 2), (15, 2)], [(15, 2), (12, 2)], [(13, 2), (17, 2)], [(19, 3), (11, 1)]]


def gear_plan(boss):
    """마디마다 (부분, 화음, 선율 또는 None)."""
    P, L = GEAR_PROG, GEAR_LEAD
    if not boss:
        # 42마디 105초: 도입 4 · A 8(낮은 목소리) · A' 8(시안 선율) · B 8(Ab 오르골) · C 8(갈림) · 끝 6(시안 끝 → 처음 Fm으로)
        plan = [('intro', c, None) for c in [('F', 'm'), ('F', 'm'), ('Db', 'M'), ('C', 'M')]]
        plan += [('A', P[i], L[i]) for i in range(8)]
        plan += [("A'", P[i], L[i]) for i in range(8, 16)]
        plan += [('B', GEAR_B_PROG[i], GEAR_B_LEAD[i]) for i in range(8)]
        plan += [('C', GEAR_C_PROG[i], GEAR_C_LEAD[i]) for i in range(8)]
        plan += [('out', P[i], L[i]) for i in range(12, 18)]
        return plan
    # 반장 45마디 96.4초: 도입 4 · A 12(시안) · B 8(반박자 쉼) · C 8(몰아치기) · A2 12(겹 선율) · 돌림 1
    BP = GEAR_BOSS_PROG
    plan = [('intro', c, None) for c in [('F', 'm'), ('Gb', 'M'), ('F', 'm'), ('C', 'M')]]
    plan += [('A', BP[i], L[i]) for i in range(12)]
    plan += [('B', GEAR_BOSS_B_PROG[i], GEAR_BOSS_B_LEAD[i]) for i in range(8)]
    plan += [('C', GEAR_BOSS_C_PROG[i], GEAR_BOSS_C_LEAD[i]) for i in range(8)]
    plan += [('A2', BP[i], L[i]) for i in range(12)]
    plan += [('turn', ('C', 'M'), [(7, 2), (11, 1), (14, 1)])]
    return plan


def gear(boss=False):
    """C1 「톱니 칩」 게임 판: F단조 96 BPM(반장 112) · 셋째 칸 강세 16분 아르페지오 + 낮은 펄스 베이스."""
    from bgm_concepts import Chip, hz
    plan = gear_plan(boss)
    bpm = 112 if boss else 96
    beat = 60 / bpm
    assert len(plan) * 16 % 3 == 0, '강세 고리가 이음매에서 끊긴다'
    c = Chip(len(plan) * 4 * beat, 12 if boss else 11)
    base = m('F4')
    for bar, (sec, (root, q), lead) in enumerate(plan):
        b0 = bar * 4 * beat
        nxt = plan[(bar + 1) % len(plan)][0]
        r = m(root + '2') if m(root + '2') <= m('B2') else m(root + '1')
        tones = chord(r, q) if q != 'dim' else [r, r + 3, r + 6]
        half = sec == 'B'  # 쉬는 부분: 베이스 길게 · 북 줄임
        # 낮은 펄스 베이스: 본 8분(근음 · 근음 · 근음 · 옥타브), 반장 16분, B는 2분(근음 · 5도) · 반장 B는 4분
        step = 2.0 if half and not boss else 1.0 if half else 0.25 if boss else 0.5
        for k in range(int(4 / step)):
            p = tones[0] - 12 + (12 if (k % 4 == 3) else 0)
            if half and k % 2 == 1:
                p = tones[0] - 12 + 7
            c.put(c.pulse(hz(p + 12), beat * step * 0.8, 0.25, 0.16 if half else 0.22, rel=0.015), b0 + k * step * beat)
            c.put(c.tri(hz(p), beat * step * 0.85, 0.35), b0 + k * step * beat)
        # 톱니 아르페지오: 16분 · 셋째 칸 강세 (곡 전체 번호). B는 내려가는 톱니, 반장 C는 위로 도는 톱니
        arp = [0, 3, 1, 2, 3, 1, 2, 3] if boss else [0, 2, 3, 2, 1, 2, 3, 2]
        if sec == 'B':
            arp = [3, 2, 1, 2, 0, 2, 1, 2]
        elif boss and sec == 'C':
            arp = [0, 1, 2, 3, 1, 2, 3, 0]
        t4 = tones + [tones[0] + 12]
        soft = 0.6 if sec == 'intro' and bar < 2 else 0.75 if sec == 'B' else 1.0
        for k in range(16):
            acc = 0.13 if (bar * 16 + k) % 3 == 0 else 0.07
            c.put(c.pulse(hz(t4[arp[k % 8]] + 24), beat / 4 * 0.7, 0.125, acc * soft, rel=0.01), b0 + k * beat / 4, pan=-0.3)
        # 선율
        if lead:
            at = b0
            for deg, d in lead:
                if sec == 'A' and not boss:  # 첫 A: 한 옥타브 아래 낮은 목소리 (시안 앞 8마디는 선율이 없었다)
                    p = base + deg - 12
                    c.put(c.pulse(hz(p), d * beat * 0.92, 0.25, 0.09, vib=0.006, rel=0.06), at, pan=0.2)
                elif sec == 'B' and not boss:  # 오르골 칩 (지도 왈츠의 결)
                    p = base + deg + 12
                    c.put(c.chime(hz(p), d * beat * 0.95 + 0.25, 0.17), at, pan=0.15)
                    c.put(c.chime(hz(p), d * beat * 0.6 + 0.2, 0.05), at + beat * 0.75, pan=-0.4)
                elif sec == 'C' and not boss:  # 갈림: 날카로운 25% 펄스 + 6도 아래 삼각 맞선율
                    p = base + deg
                    c.put(c.pulse(hz(p), d * beat * 0.9, 0.25, 0.1, vib=0.01, rel=0.04), at, pan=0.2)
                    c.put(c.tri(hz(p - 21), d * beat * 0.9, 0.22), at, pan=-0.1)
                else:
                    p = base + deg + (12 if boss and sec in ('A', 'A2', 'turn') else 0)
                    c.put(c.pulse(hz(p), d * beat * 0.95, 0.5, 0.11, vib=0.008, rel=0.06), at, pan=0.2)
                    c.put(c.pulse(hz(p), d * beat * 0.6, 0.25, 0.035), at + beat * 0.5, pan=-0.4)  # 메아리
                    if sec in ('out', 'A2'):  # 돌아온 주제: 3도 아래 겹 (얕게)
                        c.put(c.pulse(hz(p - (4 if deg % 12 in (7, 0) else 3)), d * beat * 0.9, 0.125, 0.045, rel=0.05), at, pan=-0.25)
                at += d * beat
        # 북
        if sec == 'intro':
            if bar >= 2:
                c.put(c.kick(0.7), b0)
                if boss:
                    c.put(c.kick(0.55), b0 + 2 * beat)
        elif half:
            c.put(c.kick(0.75), b0)
            if boss:
                c.put(c.noise(0.22, 0.28, 0.07, 700), b0 + 2 * beat)  # 반박자 철판
        else:
            c.put(c.kick(0.85), b0)
            c.put(c.kick(0.7), b0 + 2.5 * beat)
            if boss:
                c.put(c.kick(0.6), b0 + 1.5 * beat)
            if sec == 'C':  # 갈림 · 몰아치기: 북 하나 더, 철판 2 · 4
                c.put(c.kick(0.6), b0 + (3 if boss else 1) * beat)
                c.put(c.noise(0.2, 0.3, 0.06, 700), b0 + 1 * beat)
                c.put(c.noise(0.2, 0.3, 0.06, 700), b0 + 3 * beat)
            else:
                c.put(c.noise(0.22, 0.32, 0.07, 700), b0 + 2 * beat)
        # 철사 하이햇: 8분 (반장 C · A2는 16분), B는 박마다
        hat_n = 4 if half else 16 if boss and sec in ('C', 'A2') else 8
        for k in range(hat_n):
            if sec == 'intro' and bar < 1 and k % 2:
                continue
            c.put(c.noise(0.035, 0.1 if k % 2 else 0.15, 0.01, 7000, short=True), b0 + k * 4 / hat_n * beat, pan=0.35)
        # 부분이 바뀌기 전 마지막 박: 철판 채움 (16분 넷, 커지며)
        if nxt != sec and sec != 'intro':
            for k in range(4):
                c.put(c.noise(0.08, 0.14 + k * 0.05, 0.03, 900), b0 + (3 + k / 4) * beat, pan=-0.1 + k * 0.1)
    return c.out


# ================================================================ 렌더 · 마감
def finish(x, base, keep):
    meter = pyln.Meter(SR)
    x = signal.sosfilt(signal.butter(2, 25, 'high', fs=SR, output='sos'), np.concatenate([x, x]), axis=0)[len(x):]
    x = x * 10 ** ((TARGET - meter.integrated_loudness(x)) / 20)
    pk = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max()
    ceil = 10 ** (-1 / 20)
    if pk > ceil:
        x = x * ceil / pk
    wav = os.path.join(keep, os.path.basename(base) + '.wav') if keep else base + '.wav'
    sf.write(wav, x.astype(np.float32), SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-b:a', '96k', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '80k', '-movflags', '+faststart', base + '.m4a'], check=True)
    if not keep:
        os.remove(wav)
    return meter.integrated_loudness(x), len(x) / SR


GAME = {'waltz': waltz, 'anvil': anvil, 'anvil-boss': anvil_boss, 'crown': crown, 'crown-final': crown_final,
        'gear': gear, 'gear-boss': lambda: gear(True)}


def main():
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] != '--wav']
    out = args[0] if args else 'public/audio/music'
    keep = sys.argv[sys.argv.index('--wav') + 1] if '--wav' in sys.argv else None
    only = [a for a in args[1:]] or list(GAME)
    os.makedirs(out, exist_ok=True)
    if keep:
        os.makedirs(keep, exist_ok=True)
    for name in only:
        s = GAME[name]()
        if isinstance(s, np.ndarray):  # 칩 합성 (C1): 악보 없이 바로 파형 — 이미 이음매 없는 한 바퀴
            x = s
        else:
            s.midi(reps=1, path=os.path.join(MIDI_DIR, f'game-{name}.mid'))
            x = render_fluid(s, None)
        print(name, '%.1f LUFS %.1fs' % finish(x, os.path.join(out, name), keep))


if __name__ == '__main__':
    main()
