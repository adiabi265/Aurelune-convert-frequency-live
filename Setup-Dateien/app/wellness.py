"""Aurelune 3.14 - wellness audio (runs inside the engine, after the proof measurement).

FocusModulator  amplitude modulation of the music itself (focus = beta 16 Hz, calm = alpha 10 Hz, deep = theta 6 Hz)
breath swell    the music swells with a 6-breaths-per-minute pattern (4 s in / 6 s out), optional soft breath tone
BeatGenerator   one beat that can glide: binaural (headphones), monaural or isochronic (works on speakers)
sessions        timed plans: lead-in -> course (e.g. 10 Hz -> theta -> delta) -> fade-out
SleepNoise      pink / brown noise, optional gentle pulses after ~30 min (experimental)
Spatial8D       the sound slowly circles around the head (level + time difference + darker behind)
Bowls           singing bowls / gongs by modal synthesis - added after the pitch shifter, so exact in Hz
EarGuard        hearing protection: tames sudden loud jumps and caps the loudness
Everything is phase-continuous and ramped, so no clicks.
"""
import threading
import time

import numpy as np

TWO_PI = 2.0 * np.pi
MOD_HZ = {'focus': 16.0, 'calm': 10.0, 'deep': 6.0}

# Sessions: (seconds, beat from, beat to). The first step is the lead-in (alpha 10 Hz), as listening before a
# task and listening longer worked better in the meta-analysis (Garcia-Argibay 2019).
SESSIONS = {
    'focus':    {'name': {'de': 'Fokus', 'en': 'Focus'}, 'emoji': '🎯', 'mod': 'focus', 'fade': 90,
                 'steps': [(180, 10, 10), (300, 10, 16), (1320, 16, 16)]},
    'relax':    {'name': {'de': 'Entspannen', 'en': 'Relax'}, 'emoji': '🌿', 'mod': 'calm', 'fade': 90,
                 'steps': [(180, 12, 10), (420, 10, 8), (600, 8, 8)]},
    'meditate': {'name': {'de': 'Meditation', 'en': 'Meditation'}, 'emoji': '🧘', 'mod': None, 'fade': 120,
                 'steps': [(180, 10, 10), (600, 10, 6), (720, 6, 6)]},
    'nap':      {'name': {'de': 'Power-Nap', 'en': 'Power nap'}, 'emoji': '⚡', 'mod': None, 'fade': 20,
                 'steps': [(120, 10, 10), (480, 10, 5), (360, 5, 5), (240, 5, 14)]},
    'sleep':    {'name': {'de': 'Einschlafen', 'en': 'Fall asleep'}, 'emoji': '🌙', 'mod': None, 'fade': 300,
                 'steps': [(180, 10, 10), (600, 10, 6), (600, 6, 2.5), (1320, 2.5, 1.5)]},
    'gamma':    {'name': {'de': '40 Hz Gamma', 'en': '40 Hz gamma'}, 'emoji': '✨', 'mod': None, 'fade': 30,
                 'mode': 'isochronic', 'steps': [(60, 10, 40), (1740, 40, 40)]},
}


def session_info():
    out = []
    for k, s in SESSIONS.items():
        out.append({'id': k, 'name': s['name'], 'emoji': s['emoji'], 'mode': s.get('mode'),
                    'total': int(sum(x[0] for x in s['steps'])), 'steps': [list(x) for x in s['steps']]})
    return out


def session_beat(sid, elapsed):
    """-> (beat Hz, gain 0..1, step index, done)"""
    s = SESSIONS.get(sid)
    if not s:
        return 10.0, 0.0, 0, True
    total = sum(x[0] for x in s['steps'])
    if elapsed >= total:
        return float(s['steps'][-1][2]), 0.0, len(s['steps']) - 1, True
    t = max(0.0, elapsed)
    for i, (d, a, b) in enumerate(s['steps']):
        if t < d:
            beat = a + (b - a) * (t / d)
            break
        t -= d
    g = min(1.0, max(0.0, elapsed) / 8.0, (total - elapsed) / max(1.0, s['fade']))
    return float(beat), float(max(0.0, g)), i, False


def breath_shape(phase, inhale=0.4):
    """0..1: rises while breathing in (40 %), falls while breathing out (60 %) - smooth cosine curves."""
    p = np.mod(phase, 1.0)
    up = 0.5 - 0.5 * np.cos(np.pi * np.minimum(p / inhale, 1.0))
    down = 0.5 + 0.5 * np.cos(np.pi * np.clip((p - inhale) / (1 - inhale), 0.0, 1.0))
    return np.where(p < inhale, up, down)


def _ramp(a, b, n):
    return a + (b - a) * (np.arange(1, n + 1) / n)


class FocusModulator:
    def __init__(self, sr):
        self.sr, self.ph, self.f, self.d = sr, 0.0, 16.0, 0.0

    def process(self, y, on, mode, depth):
        n = y.shape[1]
        f_new = MOD_HZ.get(mode, 16.0)
        d_new = (0.6 * min(1.0, max(0.0, float(depth)))) if on else 0.0
        if self.d == 0.0 and d_new == 0.0:
            self.f = f_new
            return y
        f = _ramp(self.f, f_new, n)
        ph = self.ph + np.cumsum(TWO_PI * f / self.sr)
        d = _ramp(self.d, d_new, min(n, max(1, n)))       # depth changes glide over the block
        self.ph, self.f, self.d = float(np.mod(ph[-1], TWO_PI)), f_new, d_new
        m = 1.0 - d * (0.5 - 0.5 * np.cos(ph))             # dips at the modulation rate, max -8 dB
        return y * (m * (1.0 / (1.0 - 0.5 * d)))[None, :]  # keep the average loudness


class BeatGenerator:
    """One beat (Hz) that can glide phase-continuously. RMS at gain 1 = 0.354 (like the brainwave layers)."""
    def __init__(self, sr):
        self.sr = sr
        self.beat = None
        self.fc = 216.0
        self.ph_l = self.ph_r = self.ph_c = self.ph_b = 0.0
        self.gain = 0.0
        self.mode = 'isochronic'

    def process(self, n, on, mode, beat, fc, level):
        target = float(level) if on else 0.0
        if self.gain == 0.0 and target == 0.0:
            self.beat, self.fc, self.mode = float(beat), float(fc), mode
            return None
        if mode != self.mode and self.gain > 0.0:      # switch the mode through silence
            target = 0.0
        elif mode != self.mode:
            self.mode = mode
        if self.beat is None:
            self.beat = float(beat)
        b = _ramp(self.beat, float(beat), n)
        c = _ramp(self.fc, float(fc), n)
        k = TWO_PI / self.sr
        g = self.gain + np.clip(target - self.gain, -n / (2.0 * self.sr), n / (2.0 * self.sr)) * (np.arange(1, n + 1) / n)
        self.beat, self.fc, self.gain = float(beat), float(fc), float(g[-1])
        if self.mode == 'isochronic':
            pc = self.ph_c + np.cumsum(k * c)
            pb = self.ph_b + np.cumsum(k * b)
            self.ph_c, self.ph_b = float(np.mod(pc[-1], TWO_PI)), float(np.mod(pb[-1], TWO_PI))
            env = (0.5 - 0.5 * np.cos(pb)) ** 2          # smooth pulses (no clicks), RMS of env ~ 0.61
            s = np.sin(pc) * env * (0.5 / 0.61)
            return np.vstack([s, s]) * g
        pl = self.ph_l + np.cumsum(k * (c - b / 2.0))
        pr = self.ph_r + np.cumsum(k * (c + b / 2.0))
        self.ph_l, self.ph_r = float(np.mod(pl[-1], TWO_PI)), float(np.mod(pr[-1], TWO_PI))
        if self.mode == 'monaural':                     # both tones in both ears -> the beat is real (speakers ok)
            s = 0.5 * (np.sin(pl) + np.sin(pr)) * 0.707
            return np.vstack([s, s]) * g
        return np.vstack([0.5 * np.sin(pl), 0.5 * np.sin(pr)]) * g   # binaural: needs headphones


def _noise(sr, color, n=1 << 19, seed=7):
    rng = np.random.default_rng(seed + (1 if color == 'brown' else 0))
    f = np.fft.rfftfreq(n, 1.0 / sr)
    amp = np.zeros_like(f)
    band = (f >= 20) & (f <= 14000)
    amp[band] = 1.0 / (f[band] if color == 'brown' else np.sqrt(f[band]))
    out = np.empty((2, n))
    for c in range(2):
        x = np.fft.irfft(amp * np.exp(1j * rng.uniform(0, TWO_PI, f.size)), n)
        out[c] = x / (np.sqrt(np.mean(x ** 2)) + 1e-12)
    return out


class SleepNoise:
    """Pink / brown noise bed. Optional gentle pulses (5 short 50 ms swells, 1 s apart, then 6 s rest) after a delay -
    loosely after the acoustic slow-wave studies (Ngo 2013, closed-loop there; here open-loop = experiment)."""
    def __init__(self, sr):
        self.sr, self.loops, self.pos, self.gain = sr, {}, 0, 0.0

    def process(self, n, on, color, level, pulses, start_t, delay_min, t_now):
        target = 0.25 * min(1.0, max(0.0, float(level))) if on else 0.0
        if self.gain == 0.0 and target == 0.0:
            return None
        color = 'brown' if color == 'brown' else 'pink'
        if color not in self.loops:
            self.loops[color] = _noise(self.sr, color)
        L = self.loops[color]
        idx = (self.pos + np.arange(n)) % L.shape[1]
        self.pos = int((self.pos + n) % L.shape[1])
        g = self.gain + np.clip(target - self.gain, -n / (3.0 * self.sr) * 0.25, n / (3.0 * self.sr) * 0.25) * (np.arange(1, n + 1) / n)
        self.gain = float(g[-1])
        x = L[:, idx]
        if pulses and on and start_t:
            tt = t_now + np.arange(n) / self.sr - (float(start_t) + float(delay_min) * 60.0)
            if tt[-1] > 0:
                c = np.mod(np.maximum(tt, 0.0), 11.0)
                k = np.floor(c)
                frac = c - k
                env = np.where((k < 5) & (frac < 0.05) & (tt > 0), np.sin(np.pi * frac / 0.05) ** 2, 0.0)
                x = x * (1.0 + 1.0 * env)        # +6 dB swell for 50 ms
        return x * g

    def pulses_active(self, on, pulses, start_t, delay_min, t_now):
        return bool(on and pulses and start_t and t_now > float(start_t) + float(delay_min) * 60.0)


class Spatial8D:
    """8D sound: the centre of the mix circles around the head. Level difference (ILD), time difference
    (ITD, up to 0.6 ms) and a slightly darker sound behind the head; the stereo width is partly kept."""
    def __init__(self, sr):
        self.sr, self.ph, self.mix = sr, 0.0, 0.0
        self.hist = np.zeros((2, 64))
        self.last = np.zeros(2)

    def process(self, y, on, period, depth):
        n = y.shape[1]
        target = min(1.0, max(0.0, float(depth))) if on else 0.0
        if self.mix == 0.0 and target == 0.0:
            self.hist = np.concatenate([self.hist, y], axis=1)[:, -64:]
            return y
        mix = self.mix + np.clip(target - self.mix, -n / (2.0 * self.sr), n / (2.0 * self.sr)) * (np.arange(1, n + 1) / n)
        self.mix = float(mix[-1])
        w = TWO_PI / max(4.0, float(period)) / self.sr
        th = self.ph + w * np.arange(1, n + 1)
        self.ph = float(np.mod(th[-1], TWO_PI))
        p, back = np.sin(th), np.maximum(0.0, -np.cos(th))
        buf = np.concatenate([self.hist, y], axis=1)
        mid = 0.5 * (buf[0] + buf[1])
        side = 0.5 * (y[0] - y[1])
        itd = 0.0006 * self.sr
        base = 64 + np.arange(n)

        def delayed(d):
            pos = base - d
            i0 = np.floor(pos).astype(int)
            f = pos - i0
            return mid[i0] * (1 - f) + mid[np.minimum(i0 + 1, mid.size - 1)] * f
        mL, mR = delayed(np.maximum(0.0, p) * itd), delayed(np.maximum(0.0, -p) * itd)
        dark = 0.6 * back
        mL = mL * (1 - dark) + dark * 0.5 * (mL + np.concatenate([[self.last[0]], mL[:-1]]))
        mR = mR * (1 - dark) + dark * 0.5 * (mR + np.concatenate([[self.last[1]], mR[:-1]]))
        self.last = np.array([mL[-1], mR[-1]])
        gb = 1.0 - 0.15 * back
        out = np.vstack([np.sqrt(1 - 0.9 * p) * mL * gb + 0.35 * side, np.sqrt(1 + 0.9 * p) * mR * gb - 0.35 * side])
        self.hist = buf[:, -64:]
        return y * (1 - mix) + out * mix


BOWL = {'r': (1.0, 2.71, 5.15, 8.17, 11.7), 'a': (1.0, 0.55, 0.3, 0.16, 0.08), 'd': (9.0, 6.0, 3.5, 2.2, 1.4),
        'beat': (0.6, 1.1, 1.8, 2.5, 3.0), 'len': 14.0}
GONG = {'r': (1.0, 1.52, 2.03, 2.48, 2.96, 3.55, 4.13, 4.79, 5.6, 6.4), 'd': (18, 15, 13, 11, 9.5, 8, 7, 6, 5, 4),
        'len': 20.0}


def synth_strike(sr, freq, kind='bowl'):
    """Stereo buffer of one strike. The fundamental is exactly `freq` (beating pairs are symmetric around it)."""
    P = GONG if kind == 'gong' else BOWL
    n = int(P['len'] * sr)
    t = np.arange(n) / sr
    out = np.zeros((2, n))
    for i, r in enumerate(P['r']):
        f = freq * r
        if f > 16000:
            break
        if kind == 'gong':
            a, bt = 1.0 / (1.0 + 0.35 * i), 0.3 + 0.25 * i
            att = 1.0 - np.exp(-t / (0.004 + 0.03 * i))          # high partials bloom a little later
        else:
            a, bt = P['a'][i], P['beat'][i]
            att = 1.0 - np.exp(-t / 0.003)
        env = att * np.exp(-t / P['d'][i]) * a
        ph = np.random.default_rng(i + int(freq)).uniform(0, TWO_PI, 2)
        out[0] += env * 0.5 * (np.sin(TWO_PI * (f - bt / 2) * t + ph[0]) + np.sin(TWO_PI * (f + bt / 2) * t + ph[1]))
        out[1] += env * 0.5 * (np.sin(TWO_PI * (f - bt / 2) * t + ph[1]) + np.sin(TWO_PI * (f + bt / 2) * t + ph[0]))
    fade = np.minimum(1.0, (n - np.arange(n)) / (0.5 * sr))
    return out * fade / (np.max(np.abs(out)) + 1e-9) * 0.5


class Bowls:
    def __init__(self, sr):
        self.sr, self.voices, self.lock = sr, [], threading.Lock()

    def strike(self, freq, kind='bowl', level=0.6):
        buf = synth_strike(self.sr, float(freq), kind) * min(1.0, max(0.0, float(level)))
        with self.lock:
            self.voices = (self.voices + [[buf, 0]])[-8:]

    def process(self, n):
        with self.lock:
            if not self.voices:
                return None
            out = np.zeros((2, n))
            keep = []
            for v in self.voices:
                buf, p = v
                seg = buf[:, p:p + n]
                out[:, :seg.shape[1]] += seg
                v[1] = p + n
                if v[1] < buf.shape[1]:
                    keep.append(v)
            self.voices = keep
            return out


class EarGuard:
    """Hearing protection on the final mix: sudden jumps (> +6 dB over the last 10 s, e.g. a loud ad) are tamed
    within ~20 ms and released over ~2 s; the loudness (RMS) never exceeds the chosen maximum."""
    def __init__(self, sr):
        self.sr, self.long, self.g, self.red = sr, -20.0, 1.0, 0.0
        self.loud_s, self.day = 0.0, time.strftime('%Y-%m-%d')

    def process(self, y, on, max_db, tame):
        n = y.shape[1]
        rms = float(np.sqrt(np.mean(y * y))) + 1e-9
        db = 20 * np.log10(rms)
        dt = n / self.sr
        if db > -50:
            self.long += (db - self.long) * min(1.0, dt / 10.0)
        if db > -18:
            self.loud_s += dt
        d = time.strftime('%Y-%m-%d')
        if d != self.day:
            self.day, self.loud_s = d, 0.0
        if not on:
            want = 1.0
        else:
            cap = float(max_db)
            if tame and db > -30:
                cap = min(cap, max(self.long + 6.0, -24.0))
            want = min(1.0, 10 ** ((cap - db) / 20)) if db > cap else 1.0
        k = min(1.0, dt / 0.02) if want < self.g else min(1.0, dt / 2.0)
        g_new = self.g + (want - self.g) * k
        g = _ramp(self.g, g_new, n)
        self.g = g_new
        self.red = float(-20 * np.log10(max(1e-6, g_new)))
        if abs(g_new - 1.0) < 1e-6 and abs(g[0] - 1.0) < 1e-6:
            return y
        return y * g[None, :]


class Wellness:
    def __init__(self, sr):
        self.sr = sr
        self.mod = FocusModulator(sr)
        self.beat = BeatGenerator(sr)
        self.breath_tone = BeatGenerator(sr)
        self.sleep = SleepNoise(sr)
        self.space = Spatial8D(sr)
        self.bowls = Bowls(sr)
        self.ear = EarGuard(sr)
        self.bg = 1.0
        self.tone_g = 0.0
        self.tone_ph = np.zeros(2)
        self.ses = {'id': None, 'beat': None, 'step': 0, 'elapsed': 0.0, 'total': 0}
        self.done = None
        self.beat_eff = None

    def process(self, y, s, t_play, mus_rms):
        """y = music after the pitch shift (proof already measured). t_play = when this block will be heard."""
        n = y.shape[1]
        ses = s.get('session') or None
        sinfo = SESSIONS.get(ses['id']) if isinstance(ses, dict) and ses.get('id') in SESSIONS else None
        # 1) the music itself: focus modulation, breathing swell, 8D
        mod_on, mod_mode = bool(s.get('mod_on')), s.get('mod_mode', 'focus')
        if not mod_on and sinfo and sinfo.get('mod') and s.get('ses_mod', True):
            mod_on, mod_mode = True, sinfo['mod']
        y = self.mod.process(y, mod_on, mod_mode, s.get('mod_depth', 0.5))
        if s.get('breath_on') or self.bg != 1.0 or self.tone_g > 0:
            t = t_play + np.arange(n) / self.sr - float(s.get('breath_t0') or 0.0)
            v = breath_shape(t * float(s.get('breath_bpm', 6.0)) / 60.0)
            depth = min(0.6, max(0.0, float(s.get('breath_depth', 0.35)))) if s.get('breath_on') else 0.0
            tgt = 1.0 - depth * (1.0 - v)
            bg = self.bg + (tgt - self.bg) * np.minimum(1.0, np.arange(1, n + 1) / (0.05 * self.sr))
            self.bg = float(bg[-1]) if s.get('breath_on') or abs(bg[-1] - 1) > 1e-4 else 1.0
            y = y * bg[None, :]
            tone_t = 0.06 if (s.get('breath_on') and s.get('breath_tone')) else 0.0
            if tone_t > 0 or self.tone_g > 0:
                g = self.tone_g + np.clip(tone_t - self.tone_g, -n / self.sr * 0.03, n / self.sr * 0.03) * (np.arange(1, n + 1) / n)
                self.tone_g = float(g[-1]) if self.tone_g + abs(tone_t - self.tone_g) > 1e-5 else 0.0
                f0 = float(s.get('target_a4', 432.0)) / 2.0                 # A3 of the chosen tuning + fifth
                k = TWO_PI / self.sr * np.arange(1, n + 1)
                p0, p1 = self.tone_ph[0] + k * f0, self.tone_ph[1] + k * f0 * 1.5
                self.tone_ph = np.mod([p0[-1], p1[-1]], TWO_PI)
                pad = (np.sin(p0) + 0.5 * np.sin(p1)) * g * (0.3 + 0.7 * v)
                y = y + np.vstack([pad, pad])
        y = self.space.process(y, bool(s.get('space_on')), s.get('space_period', 12.0), s.get('space_depth', 0.8))
        # 2) added sounds: beat (session / isochronic / 40 Hz), sleep noise, bowls
        beat_on, beat_hz, mode, sg = bool(s.get('beat_on')), float(s.get('beat_hz', 10.0)), s.get('beat_mode', 'isochronic'), 1.0
        if sinfo:
            el = t_play - float(ses.get('t0') or t_play)
            b, sg, step, done = session_beat(ses['id'], el)
            self.ses = {'id': ses['id'], 'beat': b, 'step': step, 'elapsed': el, 'total': int(sum(x[0] for x in sinfo['steps']))}
            if done:
                self.done = ses['id']
            beat_on, beat_hz, mode = True, b, sinfo.get('mode') or ses.get('mode') or mode
        else:
            self.ses = {'id': None, 'beat': None, 'step': 0, 'elapsed': 0.0, 'total': 0}
        a4 = float(s.get('target_a4', 432.0))
        fc = a4 if (mode == 'isochronic' and beat_hz >= 20) else a4 / 2.0
        lvl = max(0.08, mus_rms * 10 ** (-14 / 20) / 0.354) * 2.0 * min(1.0, max(0.0, float(s.get('beat_level', 0.5)))) * sg
        self.beat_eff = beat_hz if beat_on else None
        b = self.beat.process(n, beat_on, mode, beat_hz, fc, min(0.6, lvl))
        if b is not None:
            y = y + b
        z = self.sleep.process(n, bool(s.get('sleep_on')), s.get('sleep_color', 'pink'), s.get('sleep_level', 0.3),
                               bool(s.get('sleep_pulses', True)), s.get('sleep_t0'), s.get('sleep_delay', 30), t_play)
        if z is not None:
            y = y + z
        w = self.bowls.process(n)
        if w is not None:
            y = y + w
        return y

    def guard(self, y, s):
        return self.ear.process(y, bool(s.get('ear_on', True)), float(s.get('ear_max_db', -10.0)), bool(s.get('ear_tame', True)))

    def status(self, s, now):
        return {'session': self.ses, 'beat': self.beat_eff, 'beat_gain': self.beat.gain, 'mod_depth': self.mod.d,
                'mod_hz': self.mod.f, 'space': self.space.mix, 'ear_red_db': self.ear.red, 'loud_min': self.ear.loud_s / 60.0,
                'sleep_gain': self.sleep.gain,
                'pulses': self.sleep.pulses_active(bool(s.get('sleep_on')), bool(s.get('sleep_pulses', True)),
                                                    s.get('sleep_t0'), s.get('sleep_delay', 30), now),
                'done': self.done, 'bowls': len(self.bowls.voices)}
