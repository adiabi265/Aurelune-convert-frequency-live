"""Aurelune 3.15 - Gateway / SeptaSync style brainwave journeys ("Brainwave-Player").

Seven tone layers run at the same time (SeptaSync idea: several beats in different bands at once, like the
Gateway tapes that stack Hemi-Sync layers). The target layer is played twice: as a binaural beat (needs
headphones) AND as an isochronic pulse (works on speakers too) - same beat frequency, so both push in the same
direction. Under it a pink "surf" noise swells slowly (the Gateway tapes use surf sound, too).

All numbers are real, exact and shown live in the app: left/right tone in Hz, beat in Hz. The carriers are
harmonics of 27 Hz (= 432 Hz scale) so the stack stays consonant. The Monroe Institute does not publish its exact
Hemi-Sync mixes - the stages below follow the published ranges (Focus 10 ~ theta + delta, higher Focus levels
deeper delta with some gamma), not a copy of the tapes.
"""
import numpy as np

TWO_PI = 2.0 * np.pi

# slot: (key, kind, carrier Hz, label)
SLOTS = (
    ('delta', 'bin', 108.0, {'de': 'Delta', 'en': 'Delta'}),
    ('theta', 'bin', 162.0, {'de': 'Theta', 'en': 'Theta'}),
    ('alpha', 'bin', 216.0, {'de': 'Alpha', 'en': 'Alpha'}),
    ('target', 'bin', 135.0, {'de': 'Ziel · binaural', 'en': 'Target · binaural'}),
    ('iso', 'iso', 270.0, {'de': 'Ziel · isochron', 'en': 'Target · isochronic'}),
    ('extra', 'bin', 189.0, {'de': 'Schumann / Beta', 'en': 'Schumann / beta'}),
    ('gamma', 'bin', 324.0, {'de': 'Gamma', 'en': 'Gamma'}),
)
SLOT_KEYS = tuple(s[0] for s in SLOTS)


def _st(key, name, sub, dur, **lay):
    """lay: slot -> (beat_from, beat_to, gain) or (beat, gain). 'iso' follows 'target' unless given."""
    if 'iso' not in lay and 'target' in lay:
        tg = lay['target']
        lay['iso'] = (tg[0], tg[1] if len(tg) == 3 else tg[0], 0.75)
    layers = {}
    for k in SLOT_KEYS:
        v = lay.get(k)
        if v is None:
            layers[k] = (0.0, 0.0, 0.0)
        elif len(v) == 2:
            layers[k] = (float(v[0]), float(v[0]), float(v[1]))
        else:
            layers[k] = (float(v[0]), float(v[1]), float(v[2]))
    return {'key': key, 'name': name, 'sub': sub, 'dur': int(dur), 'layers': layers}


STAGES = {
    'tune': lambda d: _st('tune', {'de': 'Einstimmung · Resonant Tuning', 'en': 'Resonant tuning'},
                          {'de': 'Alpha 10 Hz · ankommen, langsam atmen', 'en': 'Alpha 10 Hz · arrive, breathe slowly'}, d,
                          target=(12.0, 10.0, 1.0), alpha=(10.0, 0.9), theta=(7.83, 0.35), extra=(14.0, 12.0, 0.3)),
    'f3': lambda d: _st('f3', {'de': 'Focus 3 · Übergang', 'en': 'Focus 3 · transition'},
                        {'de': 'Alpha → Theta 10 → 7,83 Hz', 'en': 'Alpha → theta 10 → 7.83 Hz'}, d,
                        target=(10.0, 7.83, 1.0), alpha=(10.0, 8.0, 0.8), theta=(6.0, 0.6), delta=(3.0, 0.3), extra=(7.83, 0.4)),
    'f10': lambda d: _st('f10', {'de': 'Focus 10 · Körper schläft, Geist wach', 'en': 'Focus 10 · mind awake, body asleep'},
                         {'de': 'Theta 4 Hz + Delta 1,5 Hz', 'en': 'Theta 4 Hz + delta 1.5 Hz'}, d,
                         target=(5.0, 4.0, 1.0), delta=(1.5, 1.0), theta=(4.0, 0.9), alpha=(7.5, 0.5), extra=(7.0, 0.55)),
    'f12': lambda d: _st('f12', {'de': 'Focus 12 · Erweiterte Wahrnehmung', 'en': 'Focus 12 · expanded awareness'},
                         {'de': 'Theta 6 Hz + Delta + Gamma 40 Hz', 'en': 'Theta 6 Hz + delta + gamma 40 Hz'}, d,
                         target=(4.0, 6.0, 1.0), delta=(1.5, 0.8), theta=(4.0, 0.9), alpha=(10.0, 0.5), extra=(16.0, 0.3), gamma=(40.0, 0.35)),
    'f15': lambda d: _st('f15', {'de': 'Focus 15 · Zeitlosigkeit', 'en': 'Focus 15 · no time'},
                         {'de': 'Delta 1 Hz + Theta 3 Hz + Gamma', 'en': 'Delta 1 Hz + theta 3 Hz + gamma'}, d,
                         target=(6.0, 3.0, 1.0), delta=(1.0, 1.0), theta=(3.0, 0.8), extra=(7.83, 0.3), gamma=(40.0, 0.3)),
    'f21': lambda d: _st('f21', {'de': 'Focus 21 · Tiefste Stille', 'en': 'Focus 21 · deepest stillness'},
                         {'de': 'Delta 1,5 Hz · Theta 4 Hz · Gamma 40 Hz', 'en': 'Delta 1.5 Hz · theta 4 Hz · gamma 40 Hz'}, d,
                         target=(3.0, 1.5, 1.0), delta=(1.0, 0.9), theta=(4.0, 0.6), extra=(7.83, 0.3), gamma=(40.0, 0.4)),
    'back': lambda d: _st('back', {'de': 'Rückkehr · wach & klar', 'en': 'Return · awake & clear'},
                          {'de': 'Delta → Alpha/Beta 2 → 12 Hz', 'en': 'Delta → alpha/beta 2 → 12 Hz'}, d,
                          target=(2.0, 12.0, 1.0), alpha=(10.0, 0.8), theta=(6.0, 0.3), extra=(14.0, 0.5)),
}


def _journey(name, sub, emoji, plan):
    return {'name': name, 'sub': sub, 'emoji': emoji, 'tracks': [STAGES[k](d) for k, d in plan]}


JOURNEYS = {
    'gateway': _journey({'de': 'Gateway-Meditation', 'en': 'Gateway meditation'},
                        {'de': '7 Schichten · Isochron + Binaural · Focus 10 → 21 · 52 min', 'en': '7 layers · isochronic + binaural · Focus 10 → 21 · 52 min'},
                        '🌀', [('tune', 240), ('f3', 240), ('f10', 720), ('f12', 600), ('f15', 600), ('f21', 480), ('back', 240)]),
    'gateway_short': _journey({'de': 'Gateway kurz', 'en': 'Gateway short'},
                              {'de': 'Die gleiche Reise in 25 min', 'en': 'The same journey in 25 min'},
                              '⚡', [('tune', 120), ('f3', 120), ('f10', 420), ('f12', 300), ('f15', 300), ('f21', 120), ('back', 120)]),
    'focus10': _journey({'de': 'Nur Focus 10', 'en': 'Focus 10 only'},
                        {'de': 'Körper schläft, Geist wach · 30 min', 'en': 'Mind awake, body asleep · 30 min'},
                        '🧘', [('tune', 180), ('f3', 180), ('f10', 1260), ('back', 180)]),
}


def info():
    out = []
    for jid, j in JOURNEYS.items():
        out.append({'id': jid, 'name': j['name'], 'sub': j['sub'], 'emoji': j['emoji'],
                    'total': sum(t['dur'] for t in j['tracks']),
                    'tracks': [{'key': t['key'], 'name': t['name'], 'sub': t['sub'], 'dur': t['dur'],
                                'target': [t['layers']['target'][0], t['layers']['target'][1]]} for t in j['tracks']]})
    return {'journeys': out, 'slots': [{'key': k, 'kind': kind, 'carrier': fc, 'name': nm} for k, kind, fc, nm in SLOTS]}


def targets(jid, track, pos):
    """-> (beats[7], gains[7]) for the position inside a track."""
    t = JOURNEYS[jid]['tracks'][track]
    x = min(1.0, max(0.0, pos / max(1.0, t['dur'])))
    beats, gains = [], []
    for k in SLOT_KEYS:
        a, b, g = t['layers'][k]
        beats.append(a + (b - a) * x)
        gains.append(g)
    return np.array(beats), np.array(gains)


class GatewayPlayer:
    """Seven layers + surf. Beats and gains glide (tau ~5 s) -> stage changes and skips never click."""
    TAU = 5.0

    def __init__(self, sr, seed=11):
        self.sr = sr
        self.beat = np.zeros(7)
        self.g = np.zeros(7)
        self.master = 0.0
        self.ph = np.zeros((7, 3))                 # left, right, pulse phase
        self.ph[:, 0] = self.ph[:, 1] = np.pi * np.arange(7) * np.arange(1, 8) / 7.0
        self.carrier = np.array([s[2] for s in SLOTS])
        self.kind = [s[1] for s in SLOTS]
        rng = np.random.default_rng(seed)
        n = 1 << 18
        f = np.fft.rfftfreq(n, 1.0 / sr)
        amp = np.zeros_like(f)
        band = (f >= 40) & (f <= 9000)
        amp[band] = 1.0 / np.sqrt(f[band])
        self.noise = np.empty((2, n))
        for c in range(2):
            x = np.fft.irfft(amp * np.exp(1j * rng.uniform(0, TWO_PI, f.size)), n)
            self.noise[c] = x / (np.sqrt(np.mean(x ** 2)) + 1e-12)
        self.npos = 0
        self.surf_ph = 0.0
        self.now = None                            # live info for the UI
        self.done = False

    @property
    def active(self):
        return self.master > 0.0

    def process(self, n, s, t_play, mus_rms):
        st = s.get('gw') if isinstance(s.get('gw'), dict) else None
        self.done = False
        playing = False
        bt = gt = None
        if st and st.get('id') in JOURNEYS:
            j = JOURNEYS[st['id']]
            tr = min(max(0, int(st.get('track', 0))), len(j['tracks']) - 1)
            pos = float(st.get('pos0', 0.0)) + (0.0 if st.get('paused') else t_play - float(t_play if st.get('t0') is None else st['t0']))
            while pos >= j['tracks'][tr]['dur'] and not st.get('paused'):   # auto-advance, written back to the settings
                pos -= j['tracks'][tr]['dur']
                tr += 1
                if tr >= len(j['tracks']):
                    self.done = True
                    break
                st.update(track=tr, pos0=pos, t0=t_play)
            if not self.done:
                bt, gt = targets(st['id'], tr, pos)
                playing = not st.get('paused')
                self.now = {'id': st['id'], 'track': tr, 'pos': pos, 'dur': j['tracks'][tr]['dur'], 'paused': bool(st.get('paused'))}
            else:
                self.now = None
        else:
            self.now = None
        if not playing and self.master == 0.0:
            return None
        if playing:
            a = 1.0 - np.exp(-n / (self.TAU * self.sr))
            new = self.g < 1e-4                    # a layer that comes in starts right on its target beat
            self.beat = np.where(new, bt, self.beat + (bt - self.beat) * a)
            self.g = self.g + (gt - self.g) * a
            if not np.any(self.g > 1e-3):
                self.g = gt * a
        step = n / (1.5 * self.sr)                 # master fade 1.5 s (pause / play / stop)
        m0 = self.master
        self.master = float(np.clip(m0 + np.clip((1.0 if playing else 0.0) - m0, -step, step), 0.0, 1.0))
        ramp = m0 + (self.master - m0) * (np.arange(1, n + 1) / n)
        # loudness: gw_level sets a floor (-40 ... -12 dBFS RMS); with music it follows the music (about -14 dB)
        lv = min(1.0, max(0.0, float(s.get('gw_level', 0.5))))
        rms = min(0.2, max(10 ** ((-40 + 28 * lv) / 20), mus_rms * 10 ** (-14 / 20) * (0.5 + lv)))
        gw = self.g / (np.sqrt(np.sum(self.g ** 2)) + 1e-9)       # constant total loudness of the 7 layers
        phones = bool(s.get('gw_phones', True))
        k = TWO_PI / self.sr * np.arange(1, n + 1)
        L = np.zeros(n)
        R = np.zeros(n)
        for i in range(7):
            if self.g[i] < 1e-4:
                continue
            fc, b = self.carrier[i], self.beat[i]
            if self.kind[i] == 'iso':
                pc = self.ph[i, 0] + k * fc
                pb = self.ph[i, 2] + k * b
                self.ph[i, 0], self.ph[i, 2] = pc[-1] % TWO_PI, pb[-1] % TWO_PI
                x = np.sin(pc) * (0.5 - 0.5 * np.cos(pb)) ** 2 * (0.707 / 0.61) * 1.0
                L += x * gw[i]
                R += x * gw[i]
                continue
            pl = self.ph[i, 0] + k * (fc - b / 2.0)
            pr = self.ph[i, 1] + k * (fc + b / 2.0)
            self.ph[i, 0], self.ph[i, 1] = pl[-1] % TWO_PI, pr[-1] % TWO_PI
            if phones:                             # binaural: left and right differ by exactly the beat
                L += np.sin(pl) * gw[i]
                R += np.sin(pr) * gw[i]
            else:                                  # speakers: monaural (both tones in both ears -> real beat)
                x = 0.5 * (np.sin(pl) + np.sin(pr))
                L += x * gw[i]
                R += x * gw[i]
        out = np.vstack([L, R]) * (rms / 0.707)
        surf = min(1.0, max(0.0, float(s.get('gw_surf', 0.5))))
        if surf > 0:
            idx = (self.npos + np.arange(n)) % self.noise.shape[1]
            self.npos = int((self.npos + n) % self.noise.shape[1])
            sp = self.surf_ph + TWO_PI * 0.1 * np.arange(1, n + 1) / self.sr     # one wave every 10 s
            self.surf_ph = float(sp[-1] % TWO_PI)
            sw = 0.25 + 0.75 * (0.5 - 0.5 * np.cos(sp)) ** 1.5
            out = out + self.noise[:, idx] * sw * (rms * 0.8 * surf)
        if self.master == 0.0:
            self.g[:] = 0.0
        return out * ramp

    def layers_now(self, s):
        phones = bool(s.get('gw_phones', True))
        tot = np.sqrt(np.sum(self.g ** 2)) + 1e-9
        out = []
        for i, (key, kind, fc, nm) in enumerate(SLOTS):
            b = float(self.beat[i])
            l, r = (fc, fc) if kind == 'iso' else (fc - b / 2.0, fc + b / 2.0)
            out.append({'key': key, 'kind': kind if kind == 'iso' else ('bin' if phones else 'mon'), 'name': nm,
                        'left': round(l, 3), 'right': round(r, 3), 'beat': round(b, 3),
                        'share': float(self.g[i] / tot) if self.g[i] > 1e-4 else 0.0})
        return out

    def status(self, s):
        return {'now': self.now, 'master': self.master, 'layers': self.layers_now(s)}