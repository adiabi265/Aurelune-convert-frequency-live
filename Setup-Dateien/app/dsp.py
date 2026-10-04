"""
Aurelune Studio – DSP core
 * PhaseLockedPitchShifter: phase-locked phase vocoder (Laroche/Dolson) with 87.5 % overlap,
   stereo-coherent, transient phase reset – at ratio 1 it reconstructs the input bit-exactly
   (up to float rounding), so the A/B "original" is really the original.
 * TuningDetector: measures the tuning reference (A4) from true partial frequencies
 * SpectrumProbe: independent analysis of any signal (used on the OUTPUT as proof)
 * SincResampler: Kaiser-windowed sinc (64 taps) for sample-rate / clock-drift conversion
 * Limiter: 1-hop look-ahead peak limiter (prevents clipping after pitch shifting)
"""
import numpy as np

TWO_PI = 2 * np.pi


def princarg(x):
    return x - TWO_PI * np.round(x / TWO_PI)


def find_peaks(mag, thr):
    m = mag[2:-2]
    cond = (m > mag[1:-3]) & (m >= mag[3:-1]) & (m > mag[:-4]) & (m >= mag[4:]) & (m > thr)
    return np.nonzero(cond)[0] + 2


class TuningDetector:
    """Circular (cents mod 100) statistics of partial frequencies, magnitude weighted."""

    def __init__(self, sr, hop, tau=6.0, base=440.0, follow_slow_s=None, settle_s=6.0):
        self.sr, self.hop, self.base = sr, hop, base
        # precision mode: follow fast while settling, then hold the (constant) recording tuning steady
        self.follow_slow = (1.0 - np.exp(-hop / (sr * follow_slow_s))) if follow_slow_s else None
        self.settle_frames = int(settle_s * sr / hop)
        self.decay = np.exp(-hop / (sr * tau))
        self.reset()

    def reset(self):
        self.vec = 0j
        self.weight = 0.0
        self.silent_frames = 0
        self.locked_ref = None
        self.lock_frames = 0
        self.far_frames = 0

    def update(self, freqs, mags, frame_rms):
        silence_limit = int(1.5 * self.sr / self.hop)
        if frame_rms < 1e-4:
            self.silent_frames += 1
            if self.silent_frames == silence_limit:  # new song / pause -> re-measure
                self.vec, self.weight, self.locked_ref = 0j, 0.0, None
            return
        self.silent_frames = 0
        sel = (freqs > 60) & (freqs < 4000)
        f, w = freqs[sel], mags[sel]
        if w.size:  # emphasise strong partials (fundamentals/octaves) -> no bias from 5th/7th harmonics
            w = w * (w / w.max()) ** 1.5
        self.vec *= self.decay
        self.weight *= self.decay
        if f.size:
            cents = 1200 * np.log2(f / self.base)
            self.vec += np.sum(w * np.exp(1j * TWO_PI * cents / 100.0))
            self.weight += float(np.sum(w))
        conf, ref = self.estimate()
        if self.locked_ref is None:
            if conf > 0.65 and self.weight > 1e-3:
                self.locked_ref = ref
                self.lock_frames = self.far_frames = 0
        else:
            if conf < 0.25:
                self.locked_ref = None
            elif conf > 0.45:
                a = 0.02
                if self.follow_slow is not None:
                    self.lock_frames += 1
                    far = abs(1200 * np.log2(ref / self.locked_ref)) > 8.0
                    self.far_frames = self.far_frames + 1 if far else 0
                    if self.far_frames > self.settle_frames // 2:   # song changed without a pause
                        self.lock_frames = self.far_frames = 0
                    if self.lock_frames > self.settle_frames:
                        a = self.follow_slow
                self.locked_ref *= (ref / self.locked_ref) ** a

    def estimate(self):
        if self.weight <= 0:
            return 0.0, self.base
        conf = abs(self.vec) / self.weight
        dev = np.angle(self.vec) / TWO_PI * 100.0
        return float(conf), float(self.base * 2 ** (dev / 1200.0))


class CenteredTuning:
    """432-Lock: tuning of the moment that is being PLAYED, measured symmetrically (Hann window)
    look_s seconds before and after it - possible because the audio is delayed by look_s.
    Same interface as TuningDetector (update / estimate / reset / silent_frames / weight)."""

    def __init__(self, sr, hop, look_s, base=440.0):
        self.sr, self.hop, self.base = sr, hop, base
        self.n = max(5, int(round(2 * look_s * sr / hop)) + 1)
        self.win = np.hanning(self.n + 2)[1:-1]
        self.reset()

    def reset(self):
        self.vec = np.zeros(self.n, dtype=complex)
        self.w = np.zeros(self.n)
        self.i = 0
        self.silent_frames = 0
        self.weight = 0.0
        self.locked_ref = None

    def update(self, freqs, mags, frame_rms):
        v, ww = 0j, 0.0
        if frame_rms < 1e-4:
            self.silent_frames += 1
        else:
            self.silent_frames = 0
            sel = (freqs > 60) & (freqs < 4000)
            f, w = freqs[sel], mags[sel]
            if w.size:
                w = w * (w / w.max()) ** 1.5
                v = complex(np.sum(w * np.exp(1j * TWO_PI * (1200 * np.log2(f / self.base)) / 100.0)))
                ww = float(np.sum(w))
        self.vec[self.i], self.w[self.i] = v, ww
        self.i = (self.i + 1) % self.n
        c, r = self.estimate()
        self.locked_ref = r if c > 0.35 and self.weight > 1e-3 else None

    def estimate(self):
        order = (np.arange(self.n) + self.i) % self.n           # oldest .. newest
        V = complex(np.dot(self.win, self.vec[order]))
        self.weight = W = float(np.dot(self.win, self.w[order]))
        if W <= 1e-9:
            return 0.0, self.base
        return float(abs(V) / W), float(self.base * 2 ** (np.angle(V) / TWO_PI * 100.0 / 1200.0))


def hann(N):
    return 0.5 - 0.5 * np.cos(TWO_PI * np.arange(N) / N)


class PhaseLockedPitchShifter:
    def __init__(self, sr=48000, fft_size=4096, ratio=1.0, overlap=8):
        self.sr = sr
        self.N = fft_size
        self.H = fft_size // overlap
        self.K = fft_size // 2 + 1
        self.win = hann(self.N)
        s = sum(self.win[(m * self.H + self.H // 2) % self.N] ** 2 for m in range(overlap))
        self.norm = 1.0 / s
        self.ratio = ratio
        self.inbuf = np.zeros((2, self.N))
        self.ola = np.zeros((2, self.N))
        self.prev_ph = np.zeros(self.K)
        self.prev_mag = np.zeros(self.K)
        self.prev_bins = np.zeros(0, dtype=np.int64)
        self.prev_theta = np.zeros(0)
        self.bins = np.arange(self.K)
        self.detector = TuningDetector(sr, self.H)
        self.last_mag = np.zeros(self.K)

    @property
    def latency(self):
        return self.N

    def _regions(self, mag, peaks):
        if peaks.size < 2:
            return np.zeros(self.K, dtype=np.int64)
        lo, hi = peaks[0], peaks[-1]
        j = np.arange(lo + 1, hi)
        seg = np.searchsorted(peaks, j, side='right') - 1
        mins = np.full(peaks.size - 1, np.inf)
        np.minimum.at(mins, seg, mag[j])
        hit = mag[j] == mins[seg]
        _, first = np.unique(seg[hit], return_index=True)
        bounds = j[hit][first]
        if bounds.size != peaks.size - 1:  # degenerate (adjacent peaks) -> midpoints
            bounds = (peaks[:-1] + peaks[1:] + 1) // 2
        return np.searchsorted(bounds, self.bins, side='right')

    def process_hop(self, x):
        """x: (2, H) float -> (2, H) float"""
        H, N, K = self.H, self.N, self.K
        self.inbuf[:, :-H] = self.inbuf[:, H:]
        self.inbuf[:, -H:] = x
        X = np.fft.rfft(self.inbuf * self.win, axis=1)
        mag = np.abs(X[0]) + np.abs(X[1])
        ph = np.angle(X[0] + X[1])
        self.last_mag = mag
        p = self.ratio
        peaks = find_peaks(mag, mag.max() * 1e-7 + 1e-12)
        # transient (onset) detection -> phase reset keeps attacks crisp
        tot = float(mag.sum()) + 1e-12
        flux = float(np.maximum(mag - self.prev_mag * 1.5, 0).sum()) / tot
        self.prev_mag = mag
        Y = np.zeros((2, K), dtype=complex)
        if peaks.size:
            omega_h = TWO_PI * peaks * H / N
            adv = omega_h + princarg(ph[peaks] - self.prev_ph[peaks] - omega_h)
            freqs = adv / (TWO_PI * H) * self.sr
            rms = float(np.sqrt(np.mean(x * x)))
            self.detector.update(freqs, mag[peaks], rms)

            kt = np.rint(peaks * p).astype(np.int64)
            shift = kt - peaks
            theta_prev = np.zeros(peaks.size)
            if self.prev_bins.size and flux < 0.35:
                idx = np.searchsorted(self.prev_bins, kt)
                lo = np.clip(idx - 1, 0, self.prev_bins.size - 1)
                hi = np.clip(idx, 0, self.prev_bins.size - 1)
                use_hi = np.abs(self.prev_bins[hi] - kt) < np.abs(self.prev_bins[lo] - kt)
                best = np.where(use_hi, hi, lo)
                ok = np.abs(self.prev_bins[best] - kt) <= 3
                theta_prev[ok] = self.prev_theta[best[ok]]
            theta = princarg(theta_prev + (p - 1.0) * adv)
            reg = self._regions(mag, peaks)
            rot = np.exp(1j * theta)[reg]
            dest = self.bins + shift[reg]
            valid = (dest >= 0) & (dest < K)
            d = dest[valid]
            for c in range(2):
                v = (X[c] * rot)[valid]
                Y[c] = np.bincount(d, weights=v.real, minlength=K) + 1j * np.bincount(d, weights=v.imag, minlength=K)
            self.prev_bins, self.prev_theta = kt, theta
        else:
            self.detector.update(np.zeros(0), np.zeros(0), 0.0)
            self.prev_bins, self.prev_theta = np.zeros(0, dtype=np.int64), np.zeros(0)
        self.prev_ph = ph
        y = np.fft.irfft(Y, n=N, axis=1) * (self.win * self.norm)
        self.ola += y
        out = self.ola[:, :H].copy()
        self.ola[:, :-H] = self.ola[:, H:]
        self.ola[:, -H:] = 0
        return out


class SpectrumProbe:
    """Independent measurement of a signal: tuning (A4), strongest tone, display spectrum."""

    def __init__(self, sr, hop, N=8192, bands=240, fmin=40.0, fmax=12000.0):
        self.sr, self.H, self.N = sr, hop, N
        self.K = N // 2 + 1
        self.win = hann(N)
        self.buf = np.zeros(N)
        self.prev_ph = np.zeros(self.K)
        self.detector = TuningDetector(sr, hop, tau=1.5)   # fast: proof reacts within ~2 s
        self.freq = np.arange(self.K) * sr / N
        edges = np.geomspace(fmin, fmax, bands + 1)
        self.edge_bins = np.clip(np.round(edges * N / sr).astype(int), 1, self.K - 1)
        self.spec = np.zeros(bands)
        self.peak = (0.0, 0.0)
        self.count = 0
        self.hist = np.zeros(100)  # tuning fingerprint: partial deviation (cents mod 100, rel. 440 Hz)
        self.hist_decay = np.exp(-hop / (sr * 1.5))

    def push(self, x):
        """x: (2, n) or (n,) – any length; analysed in steps of self.H"""
        m = x.mean(axis=0) if x.ndim == 2 else x
        self.pend = np.concatenate([getattr(self, 'pend', np.zeros(0)), m])
        while self.pend.size >= self.H:
            blk, self.pend = self.pend[:self.H], self.pend[self.H:]
            self._frame(blk)

    def _frame(self, m):
        H = self.H
        self.buf[:-H] = self.buf[H:]
        self.buf[-H:] = m
        X = np.fft.rfft(self.buf * self.win)
        mag = np.abs(X)
        ph = np.angle(X)
        peaks = find_peaks(mag, mag.max() * 1e-6 + 1e-12)
        rms = float(np.sqrt(np.mean(m * m)))
        if peaks.size:
            omega_h = TWO_PI * peaks * H / self.N
            adv = omega_h + princarg(ph[peaks] - self.prev_ph[peaks] - omega_h)
            freqs = adv / (TWO_PI * H) * self.sr
            self.detector.update(freqs, mag[peaks], rms)
            hs = (freqs > 60) & (freqs < 4000)
            for d in getattr(self, 'extra', ()):
                d.update(freqs, mag[peaks], rms)
            self.hist *= self.hist_decay
            if hs.any() and rms > 1e-4:
                w = mag[peaks][hs]
                w = w * (w / w.max()) ** 1.5
                c = np.mod(1200 * np.log2(freqs[hs] / 440.0) + 50.0, 100.0)
                self.hist += np.bincount(np.minimum(c.astype(int), 99), weights=w, minlength=100)
            sel = (freqs > 50) & (freqs < 5000)
            if sel.any():
                i = int(np.argmax(np.where(sel, mag[peaks], 0)))
                self.peak = (float(freqs[i]), float(mag[peaks][i]))
        else:
            self.detector.update(np.zeros(0), np.zeros(0), rms)
            for d in getattr(self, 'extra', ()):
                d.update(np.zeros(0), np.zeros(0), rms)
        self.prev_ph = ph
        self.count += 1
        if self.count % 2 == 0:  # display spectrum (dB, max per log band)
            e = self.edge_bins
            bandmax = np.maximum.reduceat(mag, e[:-1])
            db = 20 * np.log10(bandmax / (self.N / 4) + 1e-9)
            self.spec = np.maximum(db, self.spec - 3.0)

    def hist_bytes(self):
        m = self.hist.max()
        if m <= 0:
            return [0] * 100
        h = np.convolve(np.concatenate([self.hist[-2:], self.hist, self.hist[:2]]), [1, 2, 3, 2, 1], 'valid') / 9
        return np.clip(h / h.max() * 255, 0, 255).astype(int).tolist()

    def spectrum_bytes(self, floor=-90.0):
        return np.clip((self.spec - floor) / -floor * 255, 0, 255).astype(int).tolist()


class SincResampler:
    """Streaming Kaiser-windowed sinc resampler with variable ratio (out/in)."""

    def __init__(self, channels=2, nominal_ratio=1.0, taps=64, phases=1024, beta=8.6):
        self.T, self.P = taps, phases
        cut = min(1.0, nominal_ratio) * 0.92
        k = np.arange(taps) - taps // 2 + 1                     # tap offsets
        frac = np.arange(phases + 1)[:, None] / phases          # fractional positions
        u = k[None, :] - frac                                    # distance to sample
        w = np.kaiser(2 * 10000 + 1, beta)
        wi = np.clip(np.round((u / (taps / 2) + 1) * 10000).astype(int), 0, 20000)
        tab = cut * np.sinc(cut * u) * w[wi]
        tab /= tab.sum(axis=1, keepdims=True)                   # unity DC gain on every phase
        self.tab = tab
        self.koff = k
        self.hist = np.zeros((channels, taps))
        self.pos = float(taps)  # first output position in buffer coordinates

    def process(self, x, ratio):
        buf = np.concatenate([self.hist, x], axis=1)
        n = buf.shape[1]
        step = 1.0 / ratio
        lim = n - self.T // 2 - 1
        count = int(np.floor((lim - self.pos) / step)) + 1 if self.pos <= lim else 0
        if count <= 0:
            self.hist = buf[:, -self.T:]
            self.pos -= n - self.T
            return np.zeros((buf.shape[0], 0))
        t = self.pos + step * np.arange(count)
        i = np.floor(t).astype(np.int64)
        f = (t - i) * self.P
        pi = f.astype(np.int64)
        a = (f - pi)[:, None]
        wts = self.tab[pi] + (self.tab[pi + 1] - self.tab[pi]) * a        # (count, T), interpolated phases
        win = np.lib.stride_tricks.sliding_window_view(buf, self.T, axis=1)  # no copy
        out = np.einsum('cnt,nt->cn', win[:, i + self.koff[0]], wts)
        self.pos = t[-1] + step - (n - self.T)
        self.hist = buf[:, -self.T:]
        return out


class Limiter:
    """Look-ahead (one block) peak limiter, ceiling −0.3 dBFS, smooth release."""

    def __init__(self, ceiling=0.966, release=0.9995):
        self.ceiling, self.release = ceiling, release
        self.gain = 1.0
        self.prev = None
        self.reduction_db = 0.0

    def process(self, x):
        if self.prev is None:
            self.prev = x
            return np.zeros((x.shape[0], 0))
        blk, self.prev = self.prev, x
        n = blk.shape[1]
        if n == 0:
            return blk
        peak = max(float(np.max(np.abs(blk))), float(np.max(np.abs(x))) if x.size else 0.0)
        target = min(1.0, self.ceiling / peak) if peak > 0 else 1.0
        g0 = self.gain
        if target < g0:
            g1 = target                                          # attack within this block
        else:
            g1 = min(target, 1.0 - (1.0 - g0) * self.release ** n)  # slow release
        ramp = g0 + (g1 - g0) * (np.arange(1, n + 1) / n)
        self.gain = g1
        self.reduction_db = -20 * np.log10(max(g1, 1e-6))
        out = blk * ramp
        np.clip(out, -1.0, 1.0, out=out)
        return out


class BinauralGenerator:
    """Layered binaural beats (brainwave mode).

    Each layer plays carrier - beat/2 on the LEFT ear and carrier + beat/2 on the RIGHT ear; the brain
    perceives the difference as the beat (needs stereo headphones). Phase-continuous float64 synthesis
    keeps every beat frequency exact, gain changes are 2 s linear fades, presets cross-fade through
    silence, and an optional pink-noise bed (seamless loop) can be laid underneath.
    Carriers sit on the A=432 Hz scale.
    """
    # v3.8: every preset has its OWN carriers and a beat cluster around ONE target rhythm (4 layers).
    # Before, all presets shared the same 8 carriers and 8 beats smeared over a wide range -> they all
    # sounded alike and no single rhythm stood out. Carriers are notes of the A=432 Hz scale.
    PRESETS = {
        'delta': ((108.0, 1.5), (144.16, 2.0), (162.0, 2.0), (216.0, 2.5)),       # deep, ~2 Hz
        'theta': ((144.16, 5.5), (192.43, 6.0), (216.0, 6.0), (256.87, 6.5)),     # ~6 Hz
        'alpha': ((216.0, 9.5), (256.87, 10.0), (324.0, 10.0), (432.0, 10.5)),    # bright, ~10 Hz
        'gateway': ((108.0, 1.5), (162.0, 4.0), (216.0, 7.0), (324.0, 7.5)),     # Focus 10: ~7-7.5 Hz resonance (CIA Gateway report) + theta 4 + delta 1.5
    }
    CARRIERS = tuple(c for c, _ in PRESETS['gateway'])

    def __init__(self, sr, fade_s=2.0, seed=None):
        self.sr = sr
        self.step = 1.0 / (fade_s * sr)
        self.gain = 0.0
        self.preset = None
        self.ph = np.zeros((2, 4))
        self.noise = self._pink(seed=seed)
        self.npos = 0

    @property
    def active(self):
        return self.gain > 0.0

    def layers(self, preset=None):
        lay = self.PRESETS.get(preset or self.preset or 'gateway', self.PRESETS['gateway'])
        return [(fc - b / 2.0, fc + b / 2.0, b) for fc, b in lay]

    def _pink(self, n=1 << 19, seed=None):
        rng = np.random.default_rng(seed)
        f = np.fft.rfftfreq(n, 1.0 / self.sr)
        amp = np.zeros_like(f)
        band = (f >= 20) & (f <= 12000)
        amp[band] = 1.0 / np.sqrt(f[band])
        out = np.empty((2, n))
        for c in range(2):  # independent L/R noise, periodic -> loops without a click
            x = np.fft.irfft(amp * np.exp(1j * rng.uniform(0, TWO_PI, f.size)), n)
            out[c] = x / (np.sqrt(np.mean(x ** 2)) + 1e-12)
        return out

    def process(self, n, on, preset, level, noise):
        want = preset if preset in self.PRESETS else 'gateway'
        if self.preset is None:
            self.preset = want
        switching = want != self.preset
        target = float(level) if (on and not switching) else 0.0
        if self.gain == 0.0 and (target == 0.0 or switching):
            if switching:  # faded out -> swap preset, next call fades the new one in
                self.preset = want
                self.ph[:] = 0.0
            return np.zeros((2, n))
        d = target - self.gain
        k = np.arange(1, n + 1)
        step = self.step * max(float(level), 0.02)   # a full fade always takes fade_s
        g = self.gain + np.sign(d) * np.minimum(step * k, abs(d))
        self.gain = float(g[-1])
        lay = self.layers(self.preset)
        w = (TWO_PI / self.sr) * np.array([[l[0] for l in lay], [l[1] for l in lay]])  # rad/sample
        ph = self.ph[:, :, None] + w[:, :, None] * k                                      # (2, L, n)
        sig = np.sin(ph).sum(axis=1) / len(lay)
        self.ph = np.mod(ph[:, :, -1], TWO_PI)
        if noise > 0:
            N = self.noise.shape[1]
            idx = (self.npos + np.arange(n)) % N
            sig = sig + 0.25 * float(noise) * self.noise[:, idx]
            self.npos = (self.npos + n) % N
        return sig * g
