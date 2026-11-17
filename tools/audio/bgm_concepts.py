#!/usr/bin/env python3
"""
배경 음악 시안 (D-540 · D-545 — 방향 고르기 전용. 사용자가 고른 A · B · D의 게임 판은 bgm_game.py).

    python3 -I tools/audio/bgm_concepts.py [출력=build-res/audio/bgm-concepts] [--m4a 폴더]

곡마다 본 루프(40~60초) + 반장/긴장 변주. 악보 .mid는 tools/audio/midi/, 소리 .ogg(96 kbps)는 출력 폴더에.
--m4a를 주면 AAC 판도 그 폴더에 (사운드 시안 페이지의 Safari 대비 — 저장소에는 넣지 않는다).
- A 모루 행진: 저음 금관 오스티나토 + 모루 · 망치 타악 (FluidR3_GM, MIT)
- B 태엽 오르골 왈츠: 오르골 · 첼레스타 · 피치카토 · 시계 소리 (FluidR3_GM)
- C 재시안 (D-545 — 첫 C 「검은 칩」은 사용자가 뺐다. D-548: C1을 골라 게임 판은 bgm_game.py의 gear · gear-boss, C2는 뺐다):
  C1 톱니 칩(F단조 96 BPM · 3 대 4로 맞물리는 16분 아르페지오 + 낮은 펄스 베이스) · C2 시계탑 칩(7/8 · 시계 똑딱 + 오르골 칩 선율)
- D 녹슨 왕관: 실내악 현 + 피아노 (FluidR3_GM)

이음매 없는 루프: 악보를 세 번 이어 렌더하고 가운데 한 바퀴만 정확히 자른다 (앞 바퀴의 잔향이 들어 있어 끝 → 처음이 매끄럽다).
칩튠은 꼬리를 앞으로 감아 더한다.
"""
import os
import subprocess
import sys
import tempfile

import mido
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

SR = 44100
SF2 = '/usr/share/sounds/sf2/FluidR3_GM.sf2'
TARGET = -18.0  # 배경 음악은 효과음(−16)보다 조금 작게
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def m(name):
    """'D3' · 'Bb2' · 'F#4' → MIDI 번호."""
    k = NOTE[name[0]]
    i = 1
    while i < len(name) and name[i] in '#b':
        k += 1 if name[i] == '#' else -1
        i += 1
    return k + 12 * (int(name[i:]) + 1)


class Song:
    """박 단위 악보. tracks[이름] = (악기 번호, 채널, [(시작 박, 길이 박, 음, 세기)])."""

    def __init__(self, bpm, beats, bars):
        self.bpm, self.beats, self.bars = bpm, beats, bars
        self.tracks = {}

    @property
    def length_beats(self):
        return self.beats * self.bars

    @property
    def seconds(self):
        return self.length_beats * 60 / self.bpm

    def tr(self, name, program, ch):
        if name not in self.tracks:
            self.tracks[name] = (program, ch, [])
        return self.tracks[name][2]

    def add(self, name, program, ch, at, dur, pitch, vel=90):
        self.tr(name, program, ch).append((at, dur, pitch, vel))

    def midi(self, reps=1, path=None):
        tpb = 480
        mf = mido.MidiFile(ticks_per_beat=tpb, type=1)
        meta = mido.MidiTrack()
        meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(self.bpm), time=0))
        meta.append(mido.MetaMessage('time_signature', numerator=self.beats, denominator=4, time=0))
        mf.tracks.append(meta)
        for name, (prog, ch, notes) in self.tracks.items():
            t = mido.MidiTrack()
            t.append(mido.MetaMessage('track_name', name=name, time=0))
            if ch != 9:
                t.append(mido.Message('program_change', program=prog, channel=ch, time=0))
            t.append(mido.Message('control_change', control=91, value=70, channel=ch, time=0))  # 잔향
            ev = []
            for r in range(reps):
                off = r * self.length_beats
                for at, dur, p, v in notes:
                    ev.append((round((at + off) * tpb), 1, p, v))
                    ev.append((round((at + off + dur) * tpb) - 1, 0, p, 0))
            ev.sort(key=lambda e: (e[0], e[1]))
            now = 0
            for tick, on, p, v in ev:
                t.append(mido.Message('note_on' if on else 'note_off', note=p, velocity=v, channel=ch, time=max(0, tick - now)))
                now = max(now, tick)
            mf.tracks.append(t)
        if path:
            mf.save(path)
        return mf


def chord(root, kind='m'):
    third = 3 if kind in ('m', 'dim') else 4
    fifth = 6 if kind == 'dim' else 7
    return [root, root + third, root + fifth]


# ---------------------------------------------------------------- A 모루 행진
def concept_a(boss=False):
    bpm = 132 if boss else 100
    bars = 12 if boss else 20
    s = Song(bpm, 4, bars)
    # i i VI V | iv i bII V  (D 단조 · 프리지아 bII)
    prog = ['D', 'D', 'Bb', 'A', 'G', 'D', 'Eb', 'A'] if not boss else ['D', 'Eb', 'D', 'C', 'Bb', 'Eb', 'A', 'A']
    qual = {'D': 'm', 'Bb': 'M', 'A': 'M', 'G': 'm', 'Eb': 'M', 'C': 'M'}
    for bar in range(bars):
        root = prog[bar % len(prog)]
        r2 = m(root + '2') if m(root + '2') <= m('A2') else m(root + '1')
        b0 = bar * 4
        # 저음 금관 오스티나토 (망치질 리듬: 쿵 · 쿵쿵 · 쉼 · 쿵)
        pat = [(0, 0.75, 0), (1, 0.5, 0), (1.5, 0.5, 0), (2.5, 0.5, 7 if qual[root] else 7), (3, 0.75, 0)]
        if boss:
            pat = [(x * 0.5, 0.4, [0, 0, 12, 0, 1, 0, 7, 0][x]) for x in range(8)]
        for at, d, iv in pat:
            s.add('tuba', 58, 0, b0 + at, d, r2 + iv, 100)
            s.add('trombone', 57, 1, b0 + at, d, r2 + 12 + iv, 70 if not boss else 85)
        # 현 패드 (두 마디 지나서)
        if bar >= 2:
            for p in chord(m(root + '3'), qual[root]):
                s.add('strings', 48, 2, b0, 4, p, 55 if not boss else 70)
        # 타악: 큰북 = 망치, 아고고 = 모루, 카우벨 = 작은 망치, 하이햇 = 증기
        if not (bars - 2 <= bar and not boss):
            s.add('drums', 0, 9, b0, 0.5, 36, 115)
            s.add('drums', 0, 9, b0 + 2.5, 0.5, 36, 100)
        s.add('drums', 0, 9, b0 + 1, 0.3, 67, 110)
        s.add('drums', 0, 9, b0 + 3, 0.3, 68, 115)
        if bar % 2 == 1:
            s.add('drums', 0, 9, b0 + 3.5, 0.3, 67, 80)
        for k in range(8):
            s.add('drums', 0, 9, b0 + k * 0.5, 0.2, 42, 40 + (15 if k % 2 == 0 else 0))
        if boss:
            s.add('drums', 0, 9, b0 + 1, 0.3, 38, 100)
            s.add('drums', 0, 9, b0 + 3, 0.3, 38, 110)
            for k in range(4):
                s.add('timp', 47, 3, b0 + k, 0.9, r2 + 12 if k % 2 == 0 else r2 + 19, 95)
            if bar % 4 == 0:
                s.add('drums', 0, 9, b0, 1, 49, 110)
                for p in chord(m(root + '4'), qual[root]):
                    s.add('brass', 61, 4, b0, 0.5, p, 110)
                    s.add('brass', 61, 4, b0 + 0.75, 0.75, p, 105)
        else:
            if bar in (8, 16):
                s.add('drums', 0, 9, b0, 1, 49, 95)
            if 8 <= bar < 16:
                for k in (0, 2):
                    s.add('taiko', 116, 3, b0 + k, 1, m('D3'), 100)
    # 호른 주제 (본 루프 9~16마디)
    if not boss:
        theme = [('D4', 2), ('F4', 1), ('E4', 1), ('D4', 3), ('A3', 1), ('Bb3', 2), ('A3', 1), ('G3', 1), ('A3', 4),
                 ('G3', 2), ('Bb3', 1), ('A3', 1), ('F3', 3), ('D3', 1), ('Eb3', 2), ('F3', 1), ('G3', 1), ('A3', 4)]
        at = 32
        for n, d in theme:
            s.add('horn', 60, 5, at, d * 0.98, m(n) + 12 * 0, 92)
            at += d
    else:
        theme = [('D5', 1), ('Eb5', 1), ('D5', 1), ('A4', 1), ('Bb4', 2), ('A4', 2), ('D5', 1), ('Eb5', 1), ('F5', 1), ('Eb5', 1), ('D5', 4)]
        for start in (16, 32):
            at = start
            for n, d in theme:
                s.add('horn', 60, 5, at, d * 0.98, m(n) - 12, 100)
                at += d
    return s


# ---------------------------------------------------------------- B 태엽 오르골 왈츠
def concept_b(boss=False):
    bpm = 112 if boss else 90
    bars = 16 if boss else 24
    s = Song(bpm, 3, bars)
    # 내려가는 베이스 (애가): Am | E/G# | C/G | D/F# | F | C/E | Dm | E
    bass = ['A2', 'G#2', 'G2', 'F#2', 'F2', 'E2', 'D2', 'E2']
    chs = [('A3', 'm'), ('E3', 'M'), ('C3', 'M'), ('D3', 'M'), ('F3', 'M'), ('C3', 'M'), ('D3', 'm'), ('E3', 'M')]
    mel = [  # 마디마다 (음, 박) — 3박
        [('E5', 1.5), ('D5', 0.5), ('C5', 1)], [('B4', 2), ('E4', 1)], [('C5', 1), ('E5', 1), ('G5', 1)], [('F#5', 2), ('A4', 1)],
        [('A4', 1), ('C5', 1), ('F5', 1)], [('E5', 1.5), ('D5', 0.5), ('C5', 1)], [('D5', 1), ('F5', 1), ('A4', 1)], [('G#4', 3)],
    ]
    mel2 = [
        [('A5', 1.5), ('G5', 0.5), ('E5', 1)], [('D5', 1), ('B4', 1), ('G#4', 1)], [('E5', 2), ('C5', 1)], [('A4', 1), ('D5', 1), ('F#5', 1)],
        [('F5', 1.5), ('E5', 0.5), ('D5', 1)], [('C5', 1), ('B4', 1), ('C5', 1)], [('B4', 1), ('A4', 1), ('B4', 1)], [('E5', 1.5), ('G#4', 1.5)],
    ]
    for bar in range(bars):
        k = bar % 8
        b0 = bar * 3
        sec = bar // 8
        s.add('pizz', 45, 0, b0, 1, m(bass[k]), 95)
        root, q = chs[k]
        for beat in (1, 2):
            for p in chord(m(root) + 0, q)[1:] + [m(root) + 12]:
                s.add('pizz', 45, 0, b0 + beat, 0.6, p, 60)
        # 시계: 똑 · 딱
        s.add('drums', 0, 9, b0, 0.2, 77, 70)
        s.add('drums', 0, 9, b0 + 1, 0.2, 76, 45)
        s.add('drums', 0, 9, b0 + 2, 0.2, 76, 45)
        line = mel if (sec % 2 == 0) else mel2
        at = b0
        for n, d in line[k]:
            p = m(n) - (12 if boss else 0)
            if boss and n.startswith('E') and k in (0, 5):
                p -= 0  # 그대로
            s.add('musicbox', 10, 1, at, d, p, 100 if not boss else 92)
            at += d
        if sec >= 1 and not boss:
            # 첼레스타 대선율 (한 옥타브 위, 반 박 늦게)
            at = b0 + 0.5
            for n, d in line[k][:2]:
                s.add('celesta', 8, 2, at, d * 0.9, m(n) + 12 - 7 if k % 2 else m(n) + 12 - 3, 55)
                at += d
        if sec >= 1 or boss:
            s.add('cello', 42, 3, b0, 3, m(bass[k]) + 12, 70 if not boss else 85)
        if boss:
            for p in chord(m(root), q):
                s.add('trem', 44, 4, b0, 3, p + 12, 70)
            s.add('timp', 47, 5, b0, 1, m(bass[k]), 90)
            if k == 7:
                s.add('drums', 0, 9, b0 + 2, 1, 49, 80)
    return s


# ---------------------------------------------------------------- D 녹슨 왕관
def concept_d(boss=False):
    bpm = 76 if boss else 64
    bars = 12
    s = Song(bpm, 4, bars)
    prog = [('C', 'm'), ('Ab', 'M'), ('F', 'm'), ('G', 'M'), ('Eb', 'M'), ('Ab', 'M'), ('D', 'dim'), ('G', 'M'),
            ('C', 'm'), ('F', 'm'), ('Db' if boss else 'Ab', 'M'), ('G', 'M')]
    melody = [
        [('G4', 2), ('Eb4', 1), ('D4', 1)], [('C4', 3), ('Eb4', 1)], [('F4', 2), ('Ab4', 1), ('G4', 1)], [('G4', 4)],
        [('Bb4', 2), ('G4', 1), ('Eb4', 1)], [('C5', 3), ('Bb4', 0.5), ('Ab4', 0.5)], [('Ab4', 2), ('F4', 1), ('D4', 1)], [('B3', 2), ('D4', 2)],
        [('Eb4', 2), ('D4', 1), ('C4', 1)], [('Ab4', 2), ('G4', 1), ('F4', 1)], [('Eb4', 1), ('F4', 1), ('Ab4', 1), ('C5', 1)], [('B4', 4)],
    ]
    for bar, (root, q) in enumerate(prog):
        b0 = bar * 4
        r3 = m(root + '3') if m(root + '3') <= m('G3') else m(root + '2')
        tones = chord(r3, q)
        if q == 'dim':
            tones = [r3, r3 + 3, r3 + 6, r3 + 10]
        # 피아노 왼손: 펼친 화음 8분
        arp = [tones[0] - 12, tones[2] - 12 + 0, tones[0], tones[1], tones[2], tones[1], tones[0], tones[2] - 12]
        if boss:
            for k in range(8):
                s.add('pianoL', 0, 0, b0 + k * 0.5, 0.45, tones[0] - 12 if k % 2 == 0 else tones[0] - 24, 80)
        else:
            for k, p in enumerate(arp):
                s.add('pianoL', 0, 0, b0 + k * 0.5, 0.9, p, 62)
        # 오른손 선율
        at = b0
        for n, d in melody[bar]:
            s.add('pianoR', 0, 1, at, d * 0.95, m(n) + (12 if bar >= 8 and not boss else 0), 78)
            at += d
        # 현: 5마디부터 (반장/긴장 변주는 처음부터 트레몰로)
        if bar >= 4 or boss:
            prog_ins, vel = (44, 72) if boss else (48, 50)
            for p in tones[:3]:
                s.add('strings', prog_ins, 2, b0, 4, p + 12, vel)
            s.add('cello', 42, 3, b0, 4, tones[0] - 12 if tones[0] - 12 >= m('C2') else tones[0], 68)
        if bar >= 8 and not boss:
            # 바이올린 독주가 선율을 3도 위에서 받는다
            at = b0 + 0.5
            for n, d in melody[bar]:
                s.add('violin', 40, 4, at, d * 0.95, m(n) + 15 if bar != 11 else m(n) + 12, 66)
                at += d
        if boss:
            s.add('choir', 52, 4, b0, 4, tones[0] + 12, 60)
            s.add('timp', 47, 5, b0, 1, tones[0] - 12, 85)
            if bar % 2 == 1:
                s.add('timp', 47, 5, b0 + 3, 0.5, tones[0] - 12, 70)
                s.add('timp', 47, 5, b0 + 3.5, 0.5, tones[0] - 12, 80)
    return s


# ---------------------------------------------------------------- C 재시안 (D-545 — 첫 C 「검은 칩」은 사용자가 뺐다)
class Chip:
    """칩 소리 버퍼: 꼬리는 처음으로 감는다 (이음매 없는 루프). 시간은 초."""

    def __init__(self, seconds, seed):
        self.L = int(round(seconds * SR))
        self.out = np.zeros((self.L, 2))
        self.rng = np.random.default_rng(seed)

    def put(self, sig, at, pan=0.0):
        i = int(round(at * SR)) % self.L
        idx = (np.arange(len(sig)) + i) % self.L
        np.add.at(self.out[:, 0], idx, sig * (1 - pan) * 0.5)
        np.add.at(self.out[:, 1], idx, sig * (1 + pan) * 0.5)

    @staticmethod
    def pulse(f, dur, duty, vol, vib=0.0, rel=0.03, decay=None):
        n = int(dur * SR)
        t = np.arange(n) / SR
        ph = np.cumsum(f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) / 0.2, 0, 1))) / SR
        w = np.where((ph % 1) < duty, 1.0, -1.0)
        e = np.minimum(1, t / 0.003) * np.clip((dur - t) / rel, 0, 1)
        e = e * (np.exp(-t / decay) if decay else 0.8 + 0.2 * np.exp(-t / 0.08))
        e = np.round(e * 15) / 15  # 4비트 음량 계단
        return w * e * vol

    @staticmethod
    def tri(f, dur, vol, rel=0.02):
        n = int(dur * SR)
        t = np.arange(n) / SR
        ph = (f * t + 0.25) % 1
        w = np.round((4 * np.abs(ph - 0.5) - 1) * 8) / 8
        return w * np.clip((dur - t) / rel, 0, 1) * vol

    def noise(self, dur, vol, tau, hp=1000, short=False):
        n = int(dur * SR)
        if short:
            src = np.resize(self.rng.integers(0, 2, 93) * 2 - 1.0, n)
        else:
            src = self.rng.integers(0, 2, n // 8 + 1).repeat(8)[:n] * 2 - 1.0
        e = np.exp(-np.arange(n) / SR / tau) * np.minimum(1, np.arange(n) / (0.001 * SR))
        return signal.sosfilt(signal.butter(1, hp, 'high', fs=SR, output='sos'), src) * e * vol

    @staticmethod
    def kick(vol, low=48, tau=0.09):
        n = int(0.22 * SR)
        t = np.arange(n) / SR
        f = low + 120 * np.exp(-t / 0.02)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / tau) * vol

    @staticmethod
    def chime(f, dur, vol):
        """오르골 칩: 사각 12.5%(밝은 몸) + 한 옥타브 위 사인(쇠 빗살), 빠르게 꺼진다."""
        n = int(dur * SR)
        t = np.arange(n) / SR
        ph = f * t
        w = np.where((ph % 1) < 0.125, 1.0, -1.0) * 0.55 + np.sin(2 * np.pi * 2 * ph) * 0.45 + np.sin(2 * np.pi * 3.01 * ph) * 0.12
        e = np.minimum(1, t / 0.002) * np.exp(-t / 0.22) * np.clip((dur - t) / 0.02, 0, 1)
        return w * np.round(e * 15) / 15 * vol


hz = lambda p: 440 * 2 ** ((p - 69) / 12)  # noqa: E731


def c1_concept(boss=False):
    """C1 「톱니 칩」: 단조 칩튠 — 톱니처럼 맞물리는 16분 아르페지오(3박 강세가 4박 위를 돈다) + 낮은 펄스 베이스, 느리고 무겁게."""
    bpm = 112 if boss else 96
    bars = 12 if boss else 18
    beat = 60 / bpm
    c = Chip(bars * 4 * beat, 11)
    if boss:
        prog = [('F', 'm'), ('Gb', 'M'), ('F', 'm'), ('E', 'dim'), ('Db', 'M'), ('Gb', 'M'), ('C', 'M'), ('C', 'M')] + \
               [('F', 'm'), ('Gb', 'M'), ('Db', 'M'), ('C', 'M')]
    else:
        prog = [('F', 'm'), ('F', 'm'), ('Db', 'M'), ('Db', 'M'), ('Bb', 'm'), ('Bb', 'm'), ('C', 'M'), ('C', 'M'),
                ('F', 'm'), ('F', 'm'), ('Db', 'M'), ('Eb', 'M'), ('Bb', 'm'), ('C', 'M'), ('F', 'm'), ('C', 'M'),
                ('Db', 'M'), ('C', 'M')]
    # 선율 (마디마다 [(F단조 기준 반음, 박)]) — 9마디부터 · 반장은 처음부터 한 옥타브 위
    lead = [[(0, 3), (3, 1)], [(7, 4)], [(8, 2), (7, 1), (5, 1)], [(5, 4)], [(5, 2), (8, 2)], [(10, 3), (8, 1)], [(7, 4)], [(4, 2), (7, 2)],
            [(12, 3), (10, 1)], [(8, 2), (7, 2)], [(5, 2), (8, 1), (10, 1)], [(10, 3), (7, 1)], [(5, 2), (3, 1), (1, 1)], [(-1, 4)], [(0, 4)], [(4, 2), (7, 2)],
            [(5, 2), (8, 2)], [(7, 4)]]
    base = m('F4')
    for bar, (root, q) in enumerate(prog):
        b0 = bar * 4 * beat
        r = m(root + '2') if m(root + '2') <= m('B2') else m(root + '1')
        tones = chord(r, q) if q != 'dim' else [r, r + 3, r + 6]
        # 낮은 펄스 베이스: 8분 쿵쿵 (근음 · 근음 · 근음 · 옥타브), 반장은 16분
        step = 0.25 if boss else 0.5
        for k in range(int(4 / step)):
            p = tones[0] - 12 + (12 if (k % 4 == 3) else 0)
            c.put(c.pulse(hz(p + 12), beat * step * 0.8, 0.25, 0.22, rel=0.015), b0 + k * step * beat)
            c.put(c.tri(hz(p), beat * step * 0.85, 0.35), b0 + k * step * beat)
        # 톱니 아르페지오: 16분, 셋째 칸마다 강세 (3 대 4로 맞물린다)
        arp = [0, 2, 3, 2, 1, 2, 3, 2] if not boss else [0, 3, 1, 2, 3, 1, 2, 3]
        t4 = tones + [tones[0] + 12]
        for k in range(16):
            gidx = bar * 16 + k
            acc = 0.13 if gidx % 3 == 0 else 0.07
            c.put(c.pulse(hz(t4[arp[k % 8]] + 24), beat / 4 * 0.7, 0.125, acc, rel=0.01), b0 + k * beat / 4, pan=-0.3)
        # 선율
        if bar >= 8 or boss:
            at = b0
            for deg, d in lead[bar % len(lead)]:
                p = base + deg + (12 if boss else 0) - (12 if not boss and bar < 8 else 0)
                c.put(c.pulse(hz(p), d * beat * 0.95, 0.5, 0.11, vib=0.008, rel=0.06), at, pan=0.2)
                c.put(c.pulse(hz(p), d * beat * 0.6, 0.25, 0.035), at + beat * 0.5, pan=-0.4)  # 메아리
                at += d * beat
        # 북: 무거운 반박자 (1 · 3& 쿵, 3 철판 치기)
        c.put(c.kick(0.85), b0)
        c.put(c.kick(0.7), b0 + 2.5 * beat)
        if boss:
            c.put(c.kick(0.6), b0 + 1.5 * beat)
        c.put(c.noise(0.22, 0.32, 0.07, 700), b0 + 2 * beat)
        for k in range(8):
            c.put(c.noise(0.035, 0.1 if k % 2 else 0.15, 0.01, 7000, short=True), b0 + k * beat / 2, pan=0.35)
    return c.out


def c2_concept(boss=False):
    """C2 「시계탑 칩」: 7/8(2+2+3) 칩 — 똑딱이는 시계 타악 + 오르골 칩 선율 + 삼각 베이스."""
    eighth = 60 / (240 if boss else 200)
    bars = 14 if boss else 22
    bar_len = 7 * eighth
    c = Chip(bars * bar_len, 23)
    groups = [0, 2, 4]  # 2+2+3
    if boss:
        prog = [('E', 'm'), ('F', 'M'), ('E', 'm'), ('D#', 'dim'), ('C', 'M'), ('F', 'M'), ('B', 'M')] * 2
    else:
        prog = [('E', 'm'), ('C', 'M'), ('A', 'm'), ('B', 'M'), ('E', 'm'), ('G', 'M'), ('C', 'M'), ('B', 'M'),
                ('A', 'm'), ('E', 'm'), ('F#', 'dim'), ('B', 'M'), ('C', 'M'), ('G', 'M'), ('A', 'm'), ('B', 'M'),
                ('E', 'm'), ('C', 'M'), ('A', 'm'), ('B', 'M'), ('C', 'M'), ('B', 'M')]
    # 선율: 마디마다 8분 칸(0~6)에 놓는 음 [(칸, E단조 기준 반음, 길이 칸)]
    tune = [[(0, 7, 2), (2, 12, 2), (4, 11, 1), (5, 7, 2)], [(0, 4, 2), (2, 7, 2), (4, 12, 3)], [(0, 9, 2), (2, 12, 1), (3, 9, 1), (4, 5, 3)],
            [(0, 6, 2), (2, 3, 2), (4, -1, 3)], [(0, 7, 2), (2, 12, 2), (4, 14, 1), (5, 15, 2)], [(0, 14, 2), (2, 11, 2), (4, 7, 3)],
            [(0, 12, 2), (2, 11, 1), (3, 9, 1), (4, 7, 3)], [(0, 6, 4), (4, 3, 3)]]
    base = m('E5')
    for bar, (root, q) in enumerate(prog):
        b0 = bar * bar_len
        r = m(root + '2') if m(root + '2') <= m('B2') else m(root + '1')
        tones = chord(r, q) if q != 'dim' else [r, r + 3, r + 6]
        # 시계: 여덟 칸 모두 똑 · 딱 (높낮이 번갈아), 묶음 첫 칸은 낮은 쇠 쿵
        for k in range(7):
            tick_pitch = 9000 if k % 2 == 0 else 5200
            c.put(c.noise(0.02, 0.16 if k in groups else 0.09, 0.004, tick_pitch, short=True), b0 + k * eighth, pan=0.4 if k % 2 else -0.2)
        for g in groups:
            c.put(c.kick(0.75 if g == 0 else 0.5, low=55, tau=0.06), b0 + g * eighth)
        if boss:
            c.put(c.noise(0.15, 0.3, 0.05, 900), b0 + 4 * eighth)
            c.put(c.noise(0.1, 0.2, 0.04, 900), b0 + 6 * eighth)
        # 삼각 베이스: 근음 · 5도 · 근음(셋 칸)
        for g, iv, ln in ((0, 0, 2), (2, 7, 2), (4, 12 if boss else 0, 3)):
            c.put(c.tri(hz(tones[0] + iv), ln * eighth * 0.9, 0.5), b0 + g * eighth)
        # 펄스 화음 깔개: 8분마다 화음 음 하나씩 (작게)
        t3 = tones + [tones[0] + 12]
        for k in range(7):
            c.put(c.pulse(hz(t3[(k + bar) % 4] + 24), eighth * 0.8, 0.25, 0.04, rel=0.02), b0 + k * eighth, pan=-0.35)
        # 오르골 칩 선율 (둘째 묶음부터 · 반장은 처음부터)
        if bar >= 4 or boss:
            for slot, deg, ln in tune[bar % 8]:
                p = base + deg - (12 if boss else 0) + (12 if (not boss and 12 <= bar < 16) else 0)
                c.put(c.chime(hz(p), ln * eighth + 0.25, 0.2), b0 + slot * eighth, pan=0.15)
                if boss:
                    c.put(c.pulse(hz(p - 12), ln * eighth * 0.9, 0.5, 0.06, rel=0.03), b0 + slot * eighth, pan=-0.1)
    return c.out


CHIPS = {'C1-gear': c1_concept, 'C2-clock': c2_concept}

# ---------------------------------------------------------------- 렌더 · 마감
def render_fluid(song, wav):
    with tempfile.TemporaryDirectory() as tmp:
        mid = os.path.join(tmp, 'x.mid')
        song.midi(reps=3, path=mid)
        raw = os.path.join(tmp, 'raw.wav')
        subprocess.run(['fluidsynth', '-ni', '-g', '0.6', '-r', str(SR), '-F', raw, SF2, mid], check=True, capture_output=True)
        x, sr = sf.read(raw)
    L = int(round(song.seconds * SR))
    # fluidsynth는 사건을 64샘플 블록에 맞춰 내므로, 둘째 · 셋째 바퀴의 실제 시작을 파형 맞춤으로 찾는다
    mono = x.mean(1)

    a = L
    win = mono[a: a + 8192]
    best, off = -1e9, 0
    for d in range(-128, 129):
        b = mono[2 * L + d: 2 * L + d + 8192]
        if len(b) < len(win):
            continue
        c = float(np.dot(win, b))
        if c > best:
            best, off = c, d
    seg = x[L:2 * L + off]
    return seg


M4A = sys.argv[sys.argv.index('--m4a') + 1] if '--m4a' in sys.argv else None
MIDI_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'midi')


def finish(x, path_base, keep_wav=None):
    meter = pyln.Meter(SR)
    lufs = meter.integrated_loudness(x)
    x = x * 10 ** ((TARGET - lufs) / 20)
    pk = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max()
    ceil = 10 ** (-1 / 20)
    if pk > ceil:
        x = x * ceil / pk
    wav = (keep_wav or path_base) + '.wav'
    sf.write(wav, x.astype(np.float32), SR, subtype='PCM_16')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libvorbis', '-b:a', '96k', path_base + '.ogg'], check=True)
    if M4A:
        os.makedirs(M4A, exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'aac', '-b:a', '96k', os.path.join(M4A, os.path.basename(path_base) + '.m4a')], check=True)
    if not keep_wav:
        os.remove(wav)
    return meter.integrated_loudness(x), len(x) / SR


def main():
    args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] != '--m4a']
    out = args[0] if args else 'build-res/audio/bgm-concepts'
    os.makedirs(out, exist_ok=True)
    os.makedirs(MIDI_DIR, exist_ok=True)
    # --chips: C 재시안만 다시 찍는다 (A · B · D 시안은 그대로 — 게임 판은 bgm_game.py)
    jobs = [] if '--chips' in sys.argv else [('A-anvil', concept_a), ('B-waltz', concept_b), ('D-crown', concept_d)]
    for name, fn in jobs:
        for boss in (False, True):
            s = fn(boss)
            tag = f'{name}-{"boss" if boss else "main"}'
            s.midi(reps=1, path=os.path.join(MIDI_DIR, tag + '.mid'))
            x = render_fluid(s, None)
            print(tag, '%.1f LUFS %.1fs' % finish(x, os.path.join(out, tag)))
    for (name, fn), boss in [(j, b) for j in CHIPS.items() for b in (False, True)]:
        x = fn(boss)
        tag = f'{name}-{"boss" if boss else "main"}'
        # 저역 정리: 두 바퀴를 이어 거르고 뒤 바퀴만 (필터 시작 상태가 이음매에 남지 않게)
        x = signal.sosfilt(signal.butter(2, 25, 'high', fs=SR, output='sos'), np.concatenate([x, x]), axis=0)[len(x):]
        print(tag, '%.1f LUFS %.1fs' % finish(x, os.path.join(out, tag)))


if __name__ == '__main__':
    main()
