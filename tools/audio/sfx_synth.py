#!/usr/bin/env python3
"""
주물 공방 효과음 합성기 (D-540): 삑 소리(사각 · 삼각 파형) 대신 쇠 · 황동 · 종이 · 증기의 소리를 모드 합성으로 찍는다.

외부 CC0 묶음(kenney.nl · OpenGameArt · Freesound)은 이 작업 환경의 네트워크 정책(프록시 403)으로 받을 수 없어서,
같은 방향의 소리를 numpy/scipy로 직접 만든다. 결과물은 우리 것 — CC0 1.0으로 공개한다 (docs/CREDITS.md).

    python3 -I tools/audio/sfx_synth.py [출력 폴더=public/audio/sfx] [--wav 미리듣기 폴더]

- 모든 소리는 시드 고정 → 다시 돌려도 같은 파일.
- 크기 맞춤: K-가중 평균 제곱(소리 나는 구간만)으로 −16 LUFS 근처, 첨두는 −1 dBFS를 넘지 않는다.
- 출력: OGG Vorbis(기본) + M4A(AAC, iOS Safari 대비) 모노 44.1 kHz.
- 목록(이름 · 변형 수)은 src/data/sfx.ts의 SFX_BANK와 같아야 한다 — 맨 아래 BANK.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100
TARGET_LUFS = -16.0
PEAK_DB = -1.0


class Sig(np.ndarray):
    """1차원 소리: 길이가 다른 두 소리를 더하면 짧은 쪽 끝을 0으로 채운다 (겹쳐 놓기)."""

    def _pad(self, o):
        a = np.asarray(self).view(np.ndarray)
        if isinstance(o, np.ndarray) and o.ndim == 1 and a.ndim == 1 and len(o) != len(a):
            n = max(len(a), len(o))
            a = np.pad(a, (0, n - len(a)))
            o = np.pad(np.asarray(o), (0, n - len(o)))
        return a, o

    def __add__(self, o):
        a, o = self._pad(o)
        return np.add(a, o).view(Sig)

    __radd__ = __add__

    def __iadd__(self, o):
        return self.__add__(o)


def S(x):
    return np.asarray(x, dtype=np.float64).view(Sig)


# ---------------------------------------------------------------- 부품
def t_axis(dur):
    return S(np.arange(int(SR * dur)) / SR)


def env_exp(dur, tau, attack=0.001):
    t = t_axis(dur)
    a = np.clip(t / max(attack, 1e-5), 0, 1)
    return a * np.exp(-t / tau)


def modal(freqs, amps, taus, dur, rng, detune=0.0, phase=True):
    """비화성 배음 묶음 — 쇠 · 황동이 울리는 몸통. taus = 배음마다 꺼지는 시간(초)."""
    t = t_axis(dur)
    out = np.zeros_like(t)
    for f, a, tau in zip(freqs, amps, taus):
        f = f * (1 + detune * rng.uniform(-1, 1))
        if f >= SR / 2 - 200:
            continue
        ph = rng.uniform(0, 2 * np.pi) if phase else 0
        out += a * np.sin(2 * np.pi * f * t + ph) * np.exp(-t / tau)
    return out


def noise(dur, rng):
    return S(rng.uniform(-1, 1, int(SR * dur)))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR / 2 - 100)], btype='band', fs=SR, output='sos')
    return S(signal.sosfilt(sos, x))


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR / 2 - 100), btype='low', fs=SR, output='sos')
    return S(signal.sosfilt(sos, x))


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, btype='high', fs=SR, output='sos')
    return S(signal.sosfilt(sos, x))


def place(dst, src, at):
    i = int(at * SR)
    if i >= len(dst):
        return dst
    n = min(len(src), len(dst) - i)
    d = np.asarray(dst).view(np.ndarray)
    d[i:i + n] += np.asarray(src[:n])
    return dst


def buf(dur):
    return S(np.zeros(int(SR * dur)))


def strike(dur, rng, lo=1500, hi=9000, tau=0.004):
    """망치가 닿는 찰나의 잡음 (첫 2~5 ms)."""
    return bp(noise(dur, rng), lo, hi) * env_exp(dur, tau, 0.0002)


def thud(f0, f1, dur, tau, rng):
    """둔탁한 쿵 — 음높이가 떨어지는 낮은 사인 + 낮은 잡음."""
    t = t_axis(dur)
    f = f1 + (f0 - f1) * np.exp(-t / (tau * 0.4))
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * env_exp(dur, tau, 0.0015)
    grit = lp(noise(dur, rng), 600) * env_exp(dur, tau * 0.5, 0.0005) * 0.6
    return body + grit


def drive(x, k):
    return np.tanh(x * k) / np.tanh(k)


_IR = {}


def hall(x, wet=0.18, decay=0.35, tone=3500, seed=7):
    """주물 공방의 넓은 철벽 울림: 지수 감쇠 잡음 IR (짧은 전반사 + 꼬리)."""
    key = (decay, tone, seed)
    if key not in _IR:
        r = np.random.default_rng(seed)
        n = int(SR * decay * 3.5)
        ir = r.standard_normal(n) * np.exp(-np.arange(n) / SR / decay)
        ir = lp(ir, tone)
        for d, g in ((0.011, 0.5), (0.019, 0.35), (0.027, 0.3), (0.041, 0.2)):
            ir[int(d * SR)] += g * 3
        ir /= np.sqrt(np.sum(ir ** 2))
        _IR[key] = ir
    ir = _IR[key]
    x = np.array(x, dtype=np.float64)
    n = min(len(x), int(0.03 * SR))
    x[-n:] *= np.linspace(1, 0, n)  # 몸통 끝을 닫는다 (잘린 울림이 딸깍이지 않게)
    y = signal.fftconvolve(np.concatenate([x, np.zeros(len(ir))]), ir)[: len(x) + len(ir)]
    dry = np.concatenate([x, np.zeros(len(ir))])
    return S(dry) + S(wet * y)


# 쇠 막대(자유단) · 두꺼운 판 · 종의 배음비
BAR = [1, 2.756, 5.404, 8.933, 13.34]
PLATE = [1, 1.59, 2.14, 2.30, 2.65, 2.92, 3.16, 3.50, 4.15]
BELL = [0.5, 1, 1.183, 1.506, 2.0, 2.514, 2.662, 3.011, 4.166, 5.433]


def iron(f, dur, rng, tau=0.25, bright=1.0, ratios=PLATE, detune=0.004):
    amps = [1 / (1 + i * (1.2 / bright)) for i in range(len(ratios))]
    taus = [tau / (1 + i * 0.6) for i in range(len(ratios))]
    return modal([f * r for r in ratios], amps, taus, dur, rng, detune)


def tick(rng, f=3200, dur=0.03, tau=0.006):
    """톱니 한 칸 — 아주 짧은 황동 똑."""
    x = modal([f, f * 1.73, f * 2.41], [1, 0.6, 0.35], [tau, tau * 0.7, tau * 0.5], dur, rng, 0.03)
    return x + strike(dur, rng, 2500, 12000, 0.0015) * 0.7


def ratchet(rng, n, span, f=2600, accel=1.0, jitter=0.12, gain_curve=None):
    """래칫: 톱니 n칸이 span초 동안 (accel>1이면 점점 빨라진다)."""
    out = buf(span + 0.05)
    w = np.linspace(0, 1, n + 1)[:-1] ** accel * span
    for i, at in enumerate(w):
        g = 1.0 if gain_curve is None else gain_curve(i / max(1, n - 1))
        at = at + rng.uniform(-jitter, jitter) * span / n
        place(out, tick(rng, f * rng.uniform(0.92, 1.08)) * g, max(0, at))
    return out


def hiss(dur, rng, lo=2500, hi=9000, attack=0.02, tau=None):
    """증기 — 띠 잡음 + 부드러운 흔들림."""
    t = t_axis(dur)
    x = bp(noise(dur, rng), lo, hi, 2)
    wob = 1 + 0.25 * np.sin(2 * np.pi * rng.uniform(5, 9) * t) * rng.uniform(0.5, 1)
    if tau is None:
        e = np.clip(t / attack, 0, 1) * np.clip((dur - t) / (dur * 0.6), 0, 1) ** 1.5
    else:
        e = env_exp(dur, tau, attack)
    return x * wob * e


def paper(dur, rng, lo=1800, hi=7000, grains=40, tau=0.05):
    """종이 — 띠 잡음에 잔 바스락(낱알 진폭)."""
    t = t_axis(dur)
    base = bp(noise(dur, rng), lo, hi) * env_exp(dur, tau, 0.004) * 0.5
    g = np.zeros_like(t)
    for _ in range(grains):
        at = rng.uniform(0, dur * 0.8)
        ln = rng.uniform(0.002, 0.008)
        seg = bp(noise(ln, rng), lo * 1.2, hi) * np.hanning(int(ln * SR))
        place(g, seg * rng.uniform(0.3, 1) * np.exp(-at / (tau * 1.5)), at)
    return base + g


def crackle(dur, rng, n=60, lo=1500, hi=8000):
    """불꽃 — 드문드문 터지는 작은 딱."""
    out = buf(dur)
    for _ in range(n):
        at = rng.uniform(0, dur)
        c = bp(noise(0.004, rng), lo, hi) * np.exp(-np.arange(int(0.004 * SR)) / SR / 0.0008)
        place(out, c * rng.uniform(0.2, 1), at)
    return out


def shards(rng, n, span, lo=2200, hi=7500, tau=(0.02, 0.07), gain=1.0):
    """깨진 주철 파편: 짧은 고음 쇠 핑이 처음엔 빽빽하다가 흩어진다."""
    out = buf(span + 0.2)
    for i in range(n):
        at = span * (rng.uniform(0, 1) ** 2.2)
        f = rng.uniform(lo, hi)
        tt = rng.uniform(*tau)
        p = modal([f, f * rng.uniform(1.4, 1.9), f * rng.uniform(2.2, 2.9)], [1, 0.5, 0.3], [tt, tt * 0.6, tt * 0.4], tt * 5, rng)
        place(out, p * rng.uniform(0.3, 1) * gain * (1 - 0.6 * at / span), at)
    return out


# ---------------------------------------------------------------- 소리 목록
def s_tap(rng, v):
    f = [3600, 3350, 3850][v]
    x = tick(rng, f, 0.04, 0.005) * 0.9
    x += thud(400, 220, 0.03, 0.006, rng) * 0.25
    return hall(x, 0.06, 0.15)


def s_lift(rng, v):
    # 기물을 집는다: 쇠 몸이 판에서 떨어지는 짧은 팅 + 잔 긁힘
    f = [1180, 1320][v]
    x = iron(f, 0.35, rng, 0.06, 1.4, BAR) * 0.6
    x += bp(noise(0.08, rng), 2500, 8000) * env_exp(0.08, 0.02) * 0.25
    x = place(buf(0.35), x, 0)
    return hall(x, 0.12, 0.2)


def s_land(rng, v):
    # 쇠판 위에 기물이 놓인다: 낮은 쿵 + 짧은 철 울림
    f = [205, 190, 222][v]
    x = thud(260, 120, 0.25, 0.05, rng) * 0.9
    x += iron(f * 2.1, 0.25, rng, 0.05, 0.8) * 0.35
    x += strike(0.02, rng, 800, 5000, 0.003) * 0.5
    return hall(x, 0.15, 0.25)


def s_submit(rng, v):
    # 레버를 당긴다: 래칫 셋 → 무거운 걸쇠
    x = buf(0.6)
    place(x, ratchet(rng, 3, 0.09, 2100), 0)
    place(x, thud(180, 70, 0.3, 0.07, rng) * 1.1, 0.12)
    place(x, iron(420, 0.4, rng, 0.12, 0.9) * 0.45, 0.12)
    place(x, strike(0.02, rng, 1000, 6000) * 0.8, 0.12)
    return hall(x, 0.2, 0.35)


def s_threat(rng, v):
    # 경고: 증기 피식 + 낮은 쇠 두 번 (사이렌 아님)
    x = buf(0.7)
    place(x, hiss(0.35, rng, 1800, 7000, 0.01) * 0.5, 0)
    for i, at in enumerate((0.02, 0.2)):
        f = [96, 92][v] * (1 if i == 0 else 0.94)
        place(x, iron(f * 2, 0.5, rng, 0.18, 0.7) * 0.6 + thud(140, 60, 0.3, 0.06, rng) * 0.6, at)
    return hall(x, 0.25, 0.4)


def s_hit(rng, v):
    # 가벼운 타격: 쇠에 쇠
    f = [640, 700, 590][v]
    x = iron(f, 0.4, rng, 0.09, 1.3) * 0.7
    x += strike(0.03, rng, 1500, 10000, 0.004) * 1.0
    x += thud(300, 140, 0.1, 0.02, rng) * 0.5
    return hall(drive(x, 1.6), 0.14, 0.25)


def s_crit(rng, v):
    # 무거운 일격: 모루 — 길게 우는 배음 + 깊은 쿵
    f = [430, 470][v]
    x = iron(f, 1.2, rng, 0.45, 1.6, PLATE) * 0.8
    x += iron(f * 2.71, 0.6, rng, 0.2, 1.0, BAR) * 0.25
    x += thud(150, 48, 0.5, 0.12, rng) * 1.1
    x += strike(0.05, rng, 1200, 12000, 0.006) * 1.2
    return hall(drive(x, 2.2), 0.25, 0.5)


def s_kinghit(rng, v):
    # 내 킹이 맞는다: 종이 왕관 · 쇠 몸이 찌그러지는 둔탁한 철 + 바스락
    x = thud(120, 40, 0.6, 0.14, rng) * 1.2
    x += iron(260, 0.8, rng, 0.25, 0.6) * 0.5
    x += paper(0.25, rng, 1500, 6000, 25, 0.06) * 0.6
    x += strike(0.04, rng, 600, 4000, 0.008) * 0.8
    return hall(drive(x, 3.0), 0.25, 0.5)


def s_hurt(rng, v):
    # 내 기물이 쓰러진다: 찌그러짐 + 낮은 쿵
    x = thud([110, 98][v], 38, 0.45, 0.1, rng) * 1.2
    x += bp(noise(0.25, rng), 300, 2500) * env_exp(0.25, 0.05) * 0.7
    x += iron(180, 0.5, rng, 0.12, 0.5) * 0.3
    return hall(drive(x, 3.5), 0.2, 0.4)


def s_kill(rng, v):
    # 처치: 주철이 깨진다 — 파편 + 낮은 쿵 + 짧은 철 울림
    x = buf(1.0)
    place(x, thud(220, 60, 0.35, 0.07, rng) * 0.9, 0)
    place(x, iron([520, 560][v], 0.5, rng, 0.12, 1.2) * 0.4, 0)
    place(x, strike(0.06, rng, 1500, 12000, 0.012) * 1.0, 0)
    place(x, shards(rng, 34, 0.45), 0.01)
    return hall(x, 0.2, 0.4)


def s_check(rng, v):
    # 체크: 공장 종 하나
    f = 440
    amps = [0.5, 1, 0.6, 0.4, 0.55, 0.3, 0.25, 0.2, 0.15, 0.1]
    taus = [2.0, 1.4, 1.0, 0.8, 0.9, 0.5, 0.45, 0.35, 0.25, 0.18]
    x = modal([f * r for r in BELL], amps, taus, 3.6, rng, 0.002)
    x += strike(0.02, rng, 1500, 8000) * 0.6
    return hall(x * np.clip(t_axis(3.6) / 0.002, 0, 1), 0.25, 0.6)


def s_parry(rng, v):
    # 받아치기: 칼날끼리 스치는 높은 쇳소리 — 두 몸이 엇갈려 운다
    x = iron(1480, 0.9, rng, 0.3, 2.0, BAR) * 0.5 + iron(1560, 0.9, rng, 0.28, 2.0, BAR) * 0.45
    s = bp(noise(0.12, rng), 3000, 11000) * env_exp(0.12, 0.03, 0.002)
    x = place(x, s * 0.6, 0)
    x += strike(0.02, rng, 2000, 12000) * 1.0
    return hall(x, 0.2, 0.45)


def s_stun(rng, v):
    # 경직: 맞은 쇠가 휘청이며 떨린다 (울림에 떨림)
    t = t_axis(0.9)
    x = iron(330, 0.9, rng, 0.35, 0.9, BAR) * (1 + 0.6 * np.sin(2 * np.pi * 11 * t)) * 0.6
    x += thud(160, 70, 0.3, 0.06, rng) * 0.7
    x = place(x, ratchet(rng, 5, 0.3, 1800, 1.6, gain_curve=lambda p: 1 - 0.7 * p) * 0.5, 0.15)
    return hall(x, 0.2, 0.4)


def s_push(rng, v):
    # 밀림: 무거운 쇠가 판 위를 긁고 간다
    d = 0.45
    t = t_axis(d)
    scr = bp(noise(d, rng), 600, 3500) * (np.clip(t / 0.03, 0, 1) * np.exp(-t / 0.11))
    scr *= 1 + 0.4 * np.sin(2 * np.pi * 37 * t)
    x = scr * 0.7 + thud(180, 90, d, 0.1, rng) * 0.6
    x = place(x, thud(200, 80, 0.2, 0.04, rng) * 0.7, 0.3)
    return hall(x, 0.15, 0.3)


def s_wind(rng, v):
    # 태엽을 감는다: 래칫이 점점 빨라지고 마지막에 스프링이 찬다
    x = buf(0.6)
    place(x, ratchet(rng, [6, 5][v], 0.36, [2300, 2500][v], 0.75), 0)
    place(x, iron(1900, 0.3, rng, 0.08, 1.5, BAR) * 0.25, 0.4)
    return hall(x, 0.1, 0.2)


def s_tick(rng, v):
    return tick(rng, [2800, 3050][v], 0.025, 0.004) * 0.9


def s_coin(rng, v):
    # 나사가 쏟아진다: 작은 쇠 핑 셋
    x = buf(0.5)
    base = [2900, 3150, 2700][v]
    for i in range(3):
        f = base * rng.uniform(0.9, 1.25)
        p = modal([f, f * 2.41, f * 3.9], [1, 0.4, 0.2], [0.09, 0.05, 0.03], 0.3, rng)
        place(x, p * (1 - 0.2 * i), i * 0.045 + rng.uniform(0, 0.012))
    x += strike(0.5, rng, 3000, 12000, 0.002) * 0.3
    return hall(x, 0.12, 0.25)


def s_spend(rng, v):
    # 나사를 셈해 넘긴다: 탁탁 두 번 (작게 떨어지는 소리)
    x = buf(0.35)
    for i, at in enumerate((0, 0.06)):
        f = 2300 * (1 - 0.08 * i)
        place(x, modal([f, f * 2.2], [1, 0.4], [0.04, 0.02], 0.15, rng) + thud(500, 300, 0.04, 0.008, rng) * 0.3, at)
    return hall(x, 0.1, 0.2)


def s_buy(rng, v):
    # 산다: 서랍 래칫 → 나사 쏟아짐 → 무게 실린 걸쇠
    x = buf(0.9)
    place(x, ratchet(rng, 4, 0.12, 1900), 0)
    place(x, s_coin(rng, 0)[: int(0.5 * SR)] * 0.8, 0.12)
    place(x, thud(190, 90, 0.25, 0.05, rng) * 0.8 + iron(520, 0.3, rng, 0.08, 1.0) * 0.3, 0.36)
    return hall(x, 0.15, 0.3)


def s_loss(rng, v):
    # 잃는다: 나사가 바닥으로 굴러 떨어진다 (내려가는 핑 + 쿵)
    x = buf(0.9)
    for i in range(5):
        f = 2400 * (0.86 ** i)
        place(x, modal([f, f * 2.3], [1, 0.4], [0.07, 0.04], 0.25, rng) * (1 - 0.12 * i), i * 0.07)
    place(x, thud(150, 55, 0.4, 0.08, rng) * 0.9, 0.36)
    return hall(x, 0.18, 0.35)


def s_rare(rng, v):
    # 귀한 것: 황동 종 막대 다섯이 흩뿌려진다 (장3화음 · 쇠 배음)
    x = buf(1.6)
    root = 880
    for i, n in enumerate((0, 4, 7, 12, 16)):
        f = root * 2 ** (n / 12)
        p = modal([f, f * 2.76, f * 5.4], [1, 0.25, 0.08], [0.6, 0.2, 0.08], 1.2, rng)
        place(x, p * 0.6 + strike(0.01, rng, 3000, 12000) * 0.2, i * 0.045)
    return hall(x, 0.3, 0.6)


def s_jackpot(rng, v):
    # 큰 보상: 쏟아지는 나사 + 종 막대 계단 + 증기 내뿜음
    x = buf(2.0)
    place(x, hiss(0.7, rng, 2000, 9000, 0.02) * 0.35, 0)
    for k in range(10):
        place(x, s_coin(rng, k % 3)[: int(0.45 * SR)] * 0.6, 0.04 + k * 0.06 + rng.uniform(0, 0.02))
    root = 659.25
    for i, n in enumerate((0, 4, 7, 12, 16, 19, 24)):
        f = root * 2 ** (n / 12)
        place(x, modal([f, f * 2.76], [1, 0.2], [0.7, 0.2], 1.2, rng) * 0.45, 0.08 + i * 0.07)
    return hall(x, 0.3, 0.6)


def s_stamp(rng, v):
    # 도장 압인: 두꺼운 종이에 쇠 도장이 내려찍힌다
    x = thud([150, 135][v], 45, 0.4, 0.07, rng) * 1.2
    x += paper(0.12, rng, 800, 5000, 30, 0.02) * 0.8
    x += strike(0.03, rng, 400, 3000, 0.006) * 0.8
    return hall(drive(x, 2.0), 0.18, 0.3)


def s_awaken(rng, v):
    # 깨어난다 / 승격: 증기가 차오르고 종이 친다
    x = buf(1.8)
    d = 0.5
    t = t_axis(d)
    rise = bp(noise(d, rng), 1200, 8000) * (t / d) ** 2
    place(x, rise * 0.6, 0)
    f = 659.25
    place(x, modal([f * r for r in BELL], [0.4, 1, 0.5, 0.35, 0.5, 0.25, 0.2, 0.15, 0.1, 0.08], [1.4, 1.0, 0.7, 0.6, 0.7, 0.4, 0.3, 0.25, 0.2, 0.15], 1.3, rng) * 0.7, d)
    place(x, thud(160, 60, 0.3, 0.06, rng) * 0.6, d)
    return hall(x, 0.3, 0.6)


def s_card(rng, v):
    # 명령서를 뽑는다: 종이가 미끄러져 넘어간다
    d = 0.18
    t = t_axis(d)
    x = paper(d, rng, [2200, 2600][v], 8000, 30, 0.06) * (np.sin(np.pi * t / d) ** 0.7)
    x += thud(600, 350, 0.04, 0.01, rng) * 0.15
    return hall(x, 0.06, 0.15)


def s_cast(rng, v):
    # 즉시 명령서: 종이 탁 + 황동 반짝
    x = buf(0.8)
    place(x, paper(0.08, rng, 1500, 7000, 20, 0.015) * 1.0, 0)
    place(x, thud(500, 200, 0.06, 0.012, rng) * 0.5, 0)
    for i, n in enumerate((0, 7, 12)):
        f = 1318.5 * 2 ** (n / 12)
        place(x, modal([f, f * 2.76], [1, 0.2], [0.35, 0.1], 0.6, rng) * 0.35, 0.05 + i * 0.04)
    return hall(x, 0.2, 0.4)


def s_deny(rng, v):
    # 안 된다: 잠긴 걸쇠를 두 번 덜컥 (낮고 짧게)
    x = buf(0.35)
    for at in (0, 0.09):
        place(x, thud(240, 140, 0.08, 0.015, rng) * 0.9 + iron(310, 0.1, rng, 0.02, 0.5) * 0.4 + strike(0.015, rng, 800, 4000) * 0.4, at)
    return hall(drive(x, 2.0), 0.08, 0.2)


def s_open(rng, v):
    # 창이 열린다: 철 덧문 — 짧은 래칫 + 미끄러짐
    x = buf(0.5)
    place(x, ratchet(rng, 4, 0.14, 1700, 1.0), 0)
    d = 0.18
    t = t_axis(d)
    place(x, bp(noise(d, rng), 900, 4000) * np.sin(np.pi * t / d) * 0.35, 0.1)
    place(x, thud(220, 120, 0.12, 0.025, rng) * 0.5, 0.26)
    return hall(x, 0.15, 0.3)


def s_close(rng, v):
    # 창이 닫힌다: 덧문이 내려와 걸린다
    x = buf(0.4)
    d = 0.1
    t = t_axis(d)
    place(x, bp(noise(d, rng), 900, 4000) * np.sin(np.pi * t / d) * 0.3, 0)
    place(x, thud(200, 90, 0.2, 0.04, rng) * 0.8 + iron(380, 0.2, rng, 0.05, 0.8) * 0.3, 0.08)
    return hall(x, 0.15, 0.3)


def s_step(rng, v):
    # 지도에서 한 칸: 핀을 종이 지도에 꽂는다 + 걸음 쿵
    x = buf(0.5)
    place(x, paper(0.07, rng, 1500, 6000, 15, 0.015) * 0.7, 0)
    place(x, thud(170, 80, 0.25, 0.05, rng) * 0.9, 0.01)
    place(x, tick(rng, 2200, 0.04, 0.008) * 0.4, 0.0)
    return hall(x, 0.15, 0.3)


def s_slot(rng, v):
    # 사건 칸이 멈춘다: 릴 톱니가 걸리며 철컥
    x = buf(0.5)
    place(x, ratchet(rng, 3, 0.07, 2600), 0)
    place(x, thud(260, 130, 0.15, 0.03, rng) * 0.8 + iron(700, 0.25, rng, 0.06, 1.2) * 0.35, 0.08)
    return hall(x, 0.12, 0.25)


def s_boss(rng, v):
    # 반장 등장: 거대한 단조 해머 한 방 + 사슬 + 긴 공장 울림
    x = buf(3.0)
    place(x, thud(90, 30, 1.6, 0.4, rng) * 1.4, 0)
    place(x, iron(150, 2.5, rng, 0.9, 0.9) * 0.6, 0)
    place(x, iron(150 * 1.5, 2.0, rng, 0.6, 1.2, BAR) * 0.3, 0)
    place(x, strike(0.08, rng, 300, 8000, 0.015) * 1.5, 0)
    ch = buf(1.2)
    for i in range(18):
        f = rng.uniform(1800, 4200)
        place(ch, modal([f, f * 1.6], [1, 0.5], [0.04, 0.02], 0.15, rng) * rng.uniform(0.3, 1) * (1 - i / 18), 0.08 + i * 0.045 + rng.uniform(0, 0.02))
    place(x, ch * 0.5, 0.15)
    return hall(drive(x, 1.8), 0.35, 1.0, 2500)


def s_phase(rng, v):
    # 2단계: 증기 기적 + 용광로가 울컥 — 높은 기적(소리 굽이) 뒤 낮은 굉음
    d = 1.8
    t = t_axis(d)
    f = 520 + 40 * np.tanh(t * 6) - 30 * np.clip(t - 1.2, 0, None)
    ph = 2 * np.pi * np.cumsum(f) / SR
    whistle = (np.sin(ph) + 0.5 * np.sin(2 * ph + 0.3) + 0.25 * np.sin(3 * ph)) * 0.3
    whistle = whistle * np.clip(t / 0.08, 0, 1) * np.clip((d - t) / 0.5, 0, 1)
    whistle += hiss(d, rng, 2000, 9000, 0.05) * 0.5
    roar = lp(noise(d, rng), 220) * np.clip(t / 0.4, 0, 1) * np.exp(-np.clip(t - 0.6, 0, None) / 0.6) * 2.5
    x = whistle + roar
    x = place(x, thud(110, 35, 0.8, 0.25, rng) * 1.0, 0.0)
    return hall(x, 0.3, 0.8, 3000)


def s_win(rng, v):
    # 승리: 종 둘(5도) + 증기 내뿜음 + 무거운 문 걸쇠가 풀린다
    x = buf(3.0)
    place(x, ratchet(rng, 4, 0.16, 2000), 0)
    place(x, thud(160, 60, 0.4, 0.08, rng) * 0.8, 0.18)
    for i, f in enumerate((523.25, 783.99, 1046.5)):
        amps = [0.4, 1, 0.5, 0.35, 0.5, 0.25, 0.2, 0.15, 0.1, 0.08]
        place(x, modal([f * r for r in BELL], amps, [1.8, 1.4, 1.0, 0.8, 0.9, 0.5, 0.4, 0.3, 0.2, 0.15], 2.4, rng) * 0.5, 0.22 + i * 0.22)
    place(x, hiss(1.2, rng, 1500, 8000, 0.05) * 0.3, 0.3)
    return hall(x, 0.3, 0.8)


def s_lose(rng, v):
    # 패배: 태엽이 풀려 멎는다 (래칫이 느려진다) + 낮은 조종
    x = buf(3.4)
    place(x, ratchet(rng, 9, 1.4, 2000, 0.55, 0.05, lambda p: 1 - 0.6 * p), 0)
    f = 196
    amps = [0.6, 1, 0.6, 0.4, 0.5, 0.25, 0.2, 0.15, 0.1, 0.08]
    place(x, modal([f * r for r in BELL], amps, [2.4, 1.8, 1.2, 0.9, 1.0, 0.5, 0.4, 0.3, 0.2, 0.15], 2.0, rng) * 0.7, 1.4)
    place(x, thud(100, 35, 0.8, 0.25, rng) * 0.8, 1.4)
    return hall(x, 0.3, 0.9, 2500)


def s_burn(rng, v):
    # 카드가 불탄다: 확 붙는 불 + 타닥 + 종이 바스락
    d = 1.1
    t = t_axis(d)
    whoosh = lp(noise(d, rng), 1800) * (np.clip(t / 0.06, 0, 1) * np.exp(-t / 0.35))
    x = whoosh * 0.9 + crackle(d, rng, 70) * 0.7 * np.exp(-t / 0.5)
    pp = paper(0.3, rng, 1500, 6000, 25, 0.08)
    x[: len(pp)] += pp * 0.4
    return hall(x, 0.15, 0.4)


# 이름: (함수, 변형 수) — src/data/sfx.ts SFX_BANK와 같은 이름 · 같은 수
BANK = {
    'tap': (s_tap, 3), 'tick': (s_tick, 2), 'lift': (s_lift, 2), 'land': (s_land, 3),
    'submit': (s_submit, 1), 'open': (s_open, 1), 'close': (s_close, 1), 'deny': (s_deny, 1),
    'card': (s_card, 2), 'cast': (s_cast, 1), 'burn': (s_burn, 1),
    'hit': (s_hit, 3), 'crit': (s_crit, 2), 'kinghit': (s_kinghit, 1), 'hurt': (s_hurt, 2), 'kill': (s_kill, 2),
    'check': (s_check, 1), 'parry': (s_parry, 1), 'stun': (s_stun, 1), 'push': (s_push, 1), 'threat': (s_threat, 2),
    'wind': (s_wind, 2), 'coin': (s_coin, 3), 'spend': (s_spend, 1), 'buy': (s_buy, 1), 'loss': (s_loss, 1),
    'rare': (s_rare, 1), 'jackpot': (s_jackpot, 1), 'stamp': (s_stamp, 2), 'awaken': (s_awaken, 1),
    'step': (s_step, 1), 'slot': (s_slot, 1), 'boss': (s_boss, 1), 'phase': (s_phase, 1), 'win': (s_win, 1), 'lose': (s_lose, 1),
}


# ---------------------------------------------------------------- 크기 맞춤
def k_weight(x):
    # ITU-R BS.1770 K-가중 (44.1 kHz 근사: pyloudnorm 계수 공식)
    import pyloudnorm as pyln
    y = x.copy()
    for f in pyln.Meter(SR)._filters.values():
        y = signal.lfilter(f.b, f.a, y)
    return y


def loudness(x):
    """소리 나는 구간만의 K-가중 평균 제곱 → LUFS (짧은 소리용 — 400 ms 게이트 없이)."""
    y = k_weight(x)
    env = np.sqrt(signal.sosfilt(signal.butter(1, 20, fs=SR, output='sos'), y ** 2).clip(0))
    on = env > env.max() * 10 ** (-30 / 20)
    ms = np.mean(y[on] ** 2) if on.any() else np.mean(y ** 2)
    return -0.691 + 10 * np.log10(ms + 1e-12)


def true_peak(x):
    return np.abs(signal.resample_poly(x, 4, 1)).max()


def finish(x):
    x = np.asarray(hp(np.asarray(x, dtype=np.float64), 35, 2))
    # 끝 잘라내기: 첨두보다 −42 dB 아래로 내려간 꼬리는 버리고 15 ms로 닫는다
    a = np.abs(x)
    idx = np.where(a > a.max() * 10 ** (-42 / 20))[0]
    x = x[: idx[-1] + 1] if len(idx) else x
    n = min(len(x), int(0.015 * SR))
    x[-n:] *= np.linspace(1, 0, n) ** 2
    # 크기: 목표 LUFS까지 올리되, 첨두를 넘는 몫은 부드러운 제한기로 누른다 (최대 +6 dB까지만 눌러 담는다)
    g = 10 ** ((TARGET_LUFS - loudness(x)) / 20)
    ceil = 10 ** (PEAK_DB / 20)
    gp = ceil / (true_peak(x) + 1e-12)
    x = x * min(g, gp * 2.0)
    over = np.abs(x) > ceil * 0.7
    if over.any():
        k = ceil * 0.7
        y = np.where(over, np.sign(x) * (k + (ceil - k) * np.tanh((np.abs(x) - k) / (ceil - k))), x)
        x = y
    return x * min(1.0, ceil / (true_peak(x) + 1e-12))


def encode(wav, base):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'libvorbis', '-q:a', '0', base + '.ogg'], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-c:a', 'aac', '-b:a', '40k', '-movflags', '+faststart', base + '.m4a'], check=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    out = args[0] if args else 'public/audio/sfx'
    keep = sys.argv[sys.argv.index('--wav') + 1] if '--wav' in sys.argv else None
    os.makedirs(out, exist_ok=True)
    if keep:
        os.makedirs(keep, exist_ok=True)
    report = []
    with tempfile.TemporaryDirectory() as tmp:
        for name, (fn, n) in BANK.items():
            for v in range(n):
                rng = np.random.default_rng(sum(map(ord, name)) * 131 + v)
                x = finish(fn(rng, v))
                fname = f'{name}{v + 1}' if n > 1 else name
                wav = os.path.join(keep or tmp, fname + '.wav')
                sf.write(wav, x.astype(np.float32), SR, subtype='PCM_16')
                encode(wav, os.path.join(out, fname))
                report.append((fname, len(x) / SR, loudness(x), 20 * np.log10(true_peak(x))))
    for r in report:
        print(f'{r[0]:10s} {r[1]:5.2f}s  {r[2]:6.1f} LUFS  peak {r[3]:5.1f} dB')


if __name__ == '__main__':
    main()
