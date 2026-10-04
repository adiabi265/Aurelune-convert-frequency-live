"""Aurelune 3.17 - live mixer: meters every source (music, brainwave layers, beat, breath pad, sleep noise, bowls,
Gateway journey) and keeps all added sounds together a safe distance under the music (Auto-Mix), so nothing that
Aurelune adds ever drowns the music or gets uncomfortably loud. Runs before the ear guard and the limiter."""
import numpy as np

SOURCES = ('music', 'bin', 'beat', 'pad', 'sleep', 'bowls', 'gw')
NO_MUSIC = 10 ** (-45 / 20)      # long-term music RMS below this = "no music playing"
CAP_SOLO = 10 ** (-18 / 20)      # additions alone (no music): at most -18 dBFS RMS
CAP_ABS = 10 ** (-14 / 20)       # never louder than -14 dBFS RMS in total


def _rms(v):
    return float(np.sqrt(np.mean(v * v))) if v is not None and v.size else 0.0


def db(x):
    return float(20 * np.log10(max(1e-6, x)))


class AutoMix:
    def __init__(self, sr):
        self.sr = sr
        self.rms = {k: 0.0 for k in SOURCES}
        self.adds = 0.0          # RMS of all additions together (before the auto gain)
        self.mus_long = 0.0      # ~8 s music loudness (no pumping in quiet passages)
        self.g, self.red, self.out, self.cap = 1.0, 0.0, 0.0, CAP_SOLO

    def music_present(self):
        return self.mus_long > NO_MUSIC

    def process(self, music, adds, s):
        n = music.shape[1]
        dt = n / self.sr
        a = min(1.0, dt / 0.4)
        r = _rms(music)
        self.rms['music'] += (r - self.rms['music']) * a
        if r > NO_MUSIC:
            self.mus_long += (r - self.mus_long) * min(1.0, dt / (1.5 if r > self.mus_long else 8.0))   # rise fast, fall slow
        else:
            self.mus_long += (0.0 - self.mus_long) * min(1.0, dt / 20.0)
        total = None
        for k in SOURCES[1:]:
            v = adds.get(k)
            self.rms[k] += (_rms(v) - self.rms[k]) * a
            if v is not None:
                total = v if total is None else total + v
        self.adds += (_rms(total) - self.adds) * a
        if self.music_present():
            gap = 10 ** (-min(20.0, max(0.0, float(s.get('mix_gap_db', 6.0)))) / 20)
            cap = self.mus_long * gap
        else:
            cap = CAP_SOLO
        self.cap = cap = min(CAP_ABS, cap)
        want = 1.0
        if total is not None and s.get('mix_auto', True) and self.adds > cap:
            want = cap / self.adds
        k = min(1.0, dt / 0.3) if want < self.g else min(1.0, dt / 2.5)
        g_new = self.g + (want - self.g) * k
        ramp = self.g + (g_new - self.g) * (np.arange(1, n + 1) / n)
        self.g = g_new
        self.red = -db(g_new) if g_new < 0.9999 else 0.0
        if total is None:
            return music
        return music + total * ramp[None, :]

    def meter_out(self, y, dt):
        self.out += (_rms(y) - self.out) * min(1.0, dt / 0.4)

    def status(self, s):
        lv = {k: (db(v) if v > 1e-5 else None) for k, v in self.rms.items()}
        return {'db': lv, 'adds_db': db(self.adds) if self.adds > 1e-5 else None, 'out_db': db(self.out) if self.out > 1e-5 else None,
                'cap_db': db(self.cap), 'auto': bool(s.get('mix_auto', True)), 'auto_red_db': self.red,
                'music': self.music_present(), 'gap_db': float(s.get('mix_gap_db', 6.0))}
