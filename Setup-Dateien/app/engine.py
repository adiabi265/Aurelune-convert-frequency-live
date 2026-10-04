"""Aurelune Studio – real-time audio engine.

Signal path:  VB-CABLE (system default output)  ->  InputStream (CABLE Output)
              -> phase-locked pitch shifter (+ tuning measurement of the original)
              -> independent measurement of the RESULT (proof)  -> look-ahead limiter
              -> 64-tap sinc resampler (sample-rate / clock-drift)  -> OutputStream (main speakers,
                 e.g. "SteelSeries Sonar - Gaming" so the Sonar EQ stays active)
"""
import sys
import threading
import queue
from collections import deque
import time
import numpy as np
import sounddevice as sd

from dsp import PhaseLockedPitchShifter, SincResampler, SpectrumProbe, Limiter, BinauralGenerator, TuningDetector, CenteredTuning

PROFILES = {'music': (4096, 8), 'voice': (2048, 4), 'precision': (8192, 8)}


def is_cable(name):
    """Only the VB-Audio cable (or BlackHole on macOS) is our virtual cable.
    SteelSeries Sonar, Nahimic, Voicemeeter … are normal outputs."""
    n = (name or '').lower()
    return ('cable' in n and ('vb-audio' in n or n.startswith('cable'))) or 'blackhole' in n


is_virtual = is_cable


def refresh_portaudio():
    """PortAudio only enumerates devices once – refresh so new/enabled devices appear."""
    try:
        sd._terminate()
        sd._initialize()
    except Exception:
        pass


def list_devices(refresh=False):
    if refresh:
        refresh_portaudio()
    apis = sd.query_hostapis()
    preferred = None
    if sys.platform.startswith('win'):
        for i, a in enumerate(apis):
            if 'WASAPI' in a['name']:
                preferred = i
    devs = sd.query_devices()
    ins, outs = [], []
    for i, d in enumerate(devs):
        if preferred is not None and d['hostapi'] != preferred:
            continue
        item = {'index': i, 'name': d['name'], 'sr': int(d['default_samplerate']), 'virtual': is_cable(d['name'])}
        if d['max_input_channels'] > 0:
            ins.append(item)
        if d['max_output_channels'] > 0:
            outs.append(item)
    return {'inputs': ins, 'outputs': outs}


def wrap50(c):
    return (c + 50.0) % 100.0 - 50.0


class Engine:
    def __init__(self):
        self.settings = {'enabled': True, 'target_a4': 432.0, 'auto': True, 'manual_ref': 440.0, 'quality': 'music',
                         'binaural': False, 'bin_preset': 'gateway', 'bin_level': 0.2, 'bin_noise': 0.3,
                         'precision': True, 'lock_s': 1.5}
        self.running = False
        self.lock = threading.Lock()
        self.istream = self.ostream = None
        self.worker = None
        self.devices = ('', '')
        self._reset_stats()

    def _reset_stats(self):
        self.underruns = 0
        self.overflows = 0
        self.level_in = 0.0
        self.level_out = 0.0
        self.ratio = 1.0
        self.fill_avg = 0.0
        self.drift_i = 0.0
        self.precise = False
        self.probe_ahead = None
        self.ff_ref = None
        self.delay = None
        self.look = 0
        self.cpu = 0.0
        self.last_audio = 0.0

    # ---------- control ----------
    def start(self, in_idx, out_idx):
        self.stop()
        self._reset_stats()
        in_info, out_info = sd.query_devices(in_idx), sd.query_devices(out_idx)
        if in_info['name'] == out_info['name'] or (is_cable(out_info['name']) and not is_cable(in_info['name'])) or \
                (is_cable(out_info['name']) and is_cable(in_info['name'])):
            raise RuntimeError('E_FEEDBACK')
        self.in_sr = int(in_info['default_samplerate'])
        self.out_sr = int(out_info['default_samplerate'])
        self.in_ch = max(1, min(2, in_info['max_input_channels']))
        self.out_ch = max(1, min(2, out_info['max_output_channels']))
        N, ov = PROFILES.get(self.settings['quality'], PROFILES['music'])
        self.precise = bool(self.settings.get('precision'))
        if self.precise:
            N, ov = PROFILES['precision']
        self.shifter = PhaseLockedPitchShifter(self.in_sr, N, 1.0, ov)
        H = self.shifter.H
        self.probe_in = SpectrumProbe(self.in_sr, 1024)    # analysis hop 1024 (~21 ms) – light on CPU
        self.probe_out = SpectrumProbe(self.in_sr, 1024)
        if self.precise:
            # look-ahead: the song is analysed 1.5 s before it is played, long integration, then held steady
            lock_s = min(3.0, max(0.5, float(self.settings.get('lock_s') or 1.5)))
            self.look = int(self.in_sr * lock_s)
            self.delay = deque()
            self.probe_ahead = SpectrumProbe(self.in_sr, 1024)
            # 432-Lock: fast detector (tau 1.5 s) whose window is centred on the played audio by the 1.5 s
            # look-ahead -> the correction follows the song's real tuning moment by moment (sim: <1 cent)
            self.probe_ahead.detector = CenteredTuning(self.in_sr, 1024, lock_s)   # symmetric window around the played moment
            self.probe_out.detector = TuningDetector(self.in_sr, 1024, tau=2.0)   # proof reacts within ~2 s
        self.limiter = Limiter()
        self.binaural = BinauralGenerator(self.in_sr)
        self.resampler = SincResampler(2, self.out_sr / self.in_sr)
        self.q = queue.Queue(maxsize=800)
        self.ring = np.zeros((2, self.out_sr * 2), dtype=np.float32)
        self.r_pos = self.w_pos = self.fill = 0
        self.target_fill = int(self.out_sr * 0.04)  # 40 ms safety cushion
        self.fill_avg = float(self.target_fill)
        self.priming = True
        self.running = True
        self.worker = threading.Thread(target=self._work, daemon=True)
        self.worker.start()
        extra = {}
        if sys.platform.startswith('win'):
            try:
                extra['extra_settings'] = sd.WasapiSettings(auto_convert=True)
            except Exception:
                pass
        try:
            self.ostream = sd.OutputStream(device=out_idx, samplerate=self.out_sr, channels=self.out_ch,
                                           dtype='float32', latency='low', callback=self._out_cb, **extra)
            self.istream = sd.InputStream(device=in_idx, samplerate=self.in_sr, channels=self.in_ch,
                                          dtype='float32', latency='low', callback=self._in_cb, **extra)
            self.ostream.start()
            self.istream.start()
        except Exception:
            self.stop()
            raise
        self.devices = (in_info['name'], out_info['name'])

    def stop(self):
        self.running = False
        for s in (self.istream, self.ostream):
            if s is not None:
                try:
                    s.stop(); s.close()
                except Exception:
                    pass
        self.istream = self.ostream = None
        if self.worker is not None:
            self.worker.join(timeout=1)
            self.worker = None

    def update(self, patch):
        old = (self.settings.get('target_a4'), self.settings.get('enabled'))
        self.settings.update({k: v for k, v in patch.items() if k in self.settings})
        if self.running and old != (self.settings.get('target_a4'), self.settings.get('enabled')):
            self.probe_out.detector.reset()   # measure the new result from scratch (no stale proof)

    # ---------- audio callbacks ----------
    def _in_cb(self, indata, frames, t, status):
        try:
            self.q.put_nowait(indata.copy())
        except queue.Full:
            self.overflows += 1

    def _out_cb(self, outdata, frames, t, status):
        with self.lock:
            if self.priming and self.fill >= self.target_fill:
                self.priming = False
            if self.priming or self.fill < frames:
                if not self.priming:
                    self.underruns += 1
                    self.priming = True
                outdata.fill(0)
                return
            idx = (self.r_pos + np.arange(frames)) % self.ring.shape[1]
            block = self.ring[:, idx]
            self.r_pos = (self.r_pos + frames) % self.ring.shape[1]
            self.fill -= frames
        if self.out_ch == 1:
            outdata[:, 0] = 0.5 * (block[0] + block[1])
        else:
            outdata[:, 0] = block[0]
            outdata[:, 1] = block[1]
            if outdata.shape[1] > 2:
                outdata[:, 2:] = 0

    # ---------- processing thread ----------
    def current_reference(self):
        s = self.settings
        det = self.probe_ahead.detector if self.precise else self.shifter.detector
        if not s['auto']:
            return float(s['manual_ref']), 'manual'
        if self.precise:
            if self.ff_ref is not None:
                return float(self.ff_ref), 'measured'
            return 440.0, 'fallback'
        if det.locked_ref is not None:
            return float(det.locked_ref), 'measured'
        return 440.0, 'fallback'

    def _write_ring(self, y):
        n = y.shape[1]
        if n == 0:
            return
        size = self.ring.shape[1]
        with self.lock:
            if self.fill + n > size:
                drop = self.fill + n - size
                self.r_pos = (self.r_pos + drop) % size
                self.fill -= drop
                self.overflows += 1
            idx = (self.w_pos + np.arange(n)) % size
            self.ring[:, idx] = y
            self.w_pos = (self.w_pos + n) % size
            self.fill += n

    def _work(self):
        acc = np.zeros((2, 0))
        while self.running:
            try:
                blk = self.q.get(timeout=0.2)
            except queue.Empty:
                continue
            x = blk.T.astype(np.float64)
            if x.shape[0] == 1:
                x = np.vstack([x, x])
            acc = np.concatenate([acc, x[:2]], axis=1)
            H = self.shifter.H
            while acc.shape[1] >= H and self.running:
                t0 = time.perf_counter()
                hop, acc = acc[:, :H], acc[:, H:]
                if self.precise:            # analyse now, play 1.5 s later
                    self.probe_ahead.push(hop)
                    d = self.probe_ahead.detector
                    c, e = d.estimate()
                    if c > 0.35 and d.weight > 1e-3:      # hold the last good value through drums / pauses
                        self.ff_ref = e
                    self.delay.append(hop)
                    if len(self.delay) * H <= self.look:
                        continue
                    hop = self.delay.popleft()
                ref, _ = self.current_reference()
                target = self.settings['target_a4'] / ref if self.settings['enabled'] else 1.0
                target = min(2.0, max(0.5, target))
                self.ratio *= (target / self.ratio) ** 0.15  # smooth glide (~70 ms)
                if abs(self.ratio / target - 1) < 1e-7:
                    self.ratio = target
                self.shifter.ratio = self.ratio
                y = self.shifter.process_hop(hop)
                self.probe_in.push(hop)
                self.probe_out.push(y)
                s = self.settings
                if s.get('binaural') or self.binaural.active:   # brainwave layers on top (after the proof)
                    y = y + self.binaural.process(y.shape[1], bool(s.get('binaural')), s.get('bin_preset'),
                                                  min(0.5, max(0.0, float(s.get('bin_level', 0.2)))),
                                                  min(1.0, max(0.0, float(s.get('bin_noise', 0.3)))))
                y = self.limiter.process(y)
                # clock drift compensation between the two devices
                # Clock drift between the two devices is only ~10-100 ppm. A slow, damped PI loop on the
                # averaged buffer fill corrects it without turning normal buffer jitter into pitch wobble.
                hop_s = H / self.in_sr
                self.fill_avg += (self.fill - self.fill_avg) * (hop_s / 3.0)      # ~3 s average
                err = (self.fill_avg - self.target_fill) / self.out_sr            # seconds
                self.drift_i = float(np.clip(self.drift_i - err * hop_s * 1e-3, -3e-4, 3e-4))
                corr = float(np.clip(self.drift_i - err * 0.05, -3e-4, 3e-4))     # max +-0.5 cents (clock drift is <100 ppm)
                rr = self.out_sr / self.in_sr * (1.0 + corr)
                out = self.resampler.process(y, rr).astype(np.float32)
                self._write_ring(out)
                pk = float(np.max(np.abs(hop)))
                if pk > 1e-4:
                    self.last_audio = time.time()
                self.level_in = max(pk, self.level_in * 0.85)
                self.level_out = max(float(np.max(np.abs(out))) if out.size else 0.0, self.level_out * 0.85)
                dt = time.perf_counter() - t0
                self.cpu = 0.95 * self.cpu + 0.05 * (dt / (H / self.in_sr))

    # ---------- status ----------
    def status(self, spectrum=True):
        if not self.running:
            return {'running': False}
        det = self.probe_ahead.detector if self.precise else self.shifter.detector
        conf, est = det.estimate()
        ref, source = self.current_reference()
        enabled = bool(self.settings['enabled'])
        expected = self.settings['target_a4'] if enabled else ref
        oconf, oest = self.probe_out.detector.estimate()
        dev = wrap50(1200 * np.log2(oest / expected))
        out_a4 = expected * 2 ** (dev / 1200)
        lat = (self.shifter.N - self.shifter.H) / self.in_sr + self.shifter.H / self.in_sr + self.target_fill / self.out_sr
        lat += self.look / self.in_sr
        try:
            lat += (self.istream.latency or 0) + (self.ostream.latency or 0)
        except Exception:
            pass
        r = {
            'running': True, 'devices': self.devices, 'enabled': enabled,
            'estimate': est, 'confidence': conf, 'locked': det.locked_ref, 'reference': ref, 'source': source,
            'silent': det.silent_frames > 10 or time.time() - self.last_audio > 1.0,
            'applied_cents': float(1200 * np.log2(self.ratio)), 'latency_ms': lat * 1000,
            'buffer_ms': self.fill / self.out_sr * 1000, 'underruns': self.underruns, 'overflows': self.overflows,
            'level_in': self.level_in, 'level_out': self.level_out, 'cpu': self.cpu,
            'sr': [self.in_sr, self.out_sr], 'fft': [self.shifter.N, self.shifter.N // self.shifter.H],
            'target_a4': float(self.settings['target_a4']), 'expected_a4': float(expected),
            'out_a4': float(out_a4), 'out_conf': oconf, 'out_dev': float(dev),
            'peak_out': self.probe_out.peak[0], 'peak_in': self.probe_in.peak[0],
            'limiter_db': self.limiter.reduction_db,
        }
        r['precision'] = self.precise
        r['binaural'] = {'on': bool(self.settings.get('binaural')), 'preset': self.binaural.preset,
                         'gain': self.binaural.gain, 'mono': self.out_ch == 1,
                         'layers': self.binaural.layers(self.settings.get('bin_preset'))}
        if spectrum:
            r['spec_out'] = self.probe_out.spectrum_bytes()
            r['spec_in'] = self.probe_in.spectrum_bytes()
            r['hist_out'] = self.probe_out.hist_bytes()
            r['hist_in'] = self.probe_in.hist_bytes()
        return r
