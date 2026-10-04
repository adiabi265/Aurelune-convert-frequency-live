/*
 * Phase-locked phase vocoder pitch shifter (Laroche & Dolson style).
 * - Peak picking + "region of influence" shifting keeps partials coherent
 *   (much less phasiness than a classic bin-by-bin vocoder).
 * - Stereo is processed with ONE shared phase rotation per region, so the
 *   stereo image (inter-channel phase) stays intact.
 * - Hann windows, 75 % overlap, perfect reconstruction when ratio = 1.
 */
const TWO_PI = Math.PI * 2;
function princarg(x) { return x - TWO_PI * Math.round(x / TWO_PI); }

class PhaseLockedPitchShifter {
  constructor(fftSize = 4096, overlap = 4, ratio = 1) {
    const N = fftSize;
    this.N = N; this.H = N / overlap; this.half = N >> 1; this.ratio = ratio;
    this.win = new Float64Array(N);
    for (let n = 0; n < N; n++) this.win[n] = 0.5 - 0.5 * Math.cos(TWO_PI * n / N);
    let s = 0;
    for (let m = 0; m < overlap; m++) { const w = this.win[(m * this.H + (this.H >> 1)) % N]; s += w * w; }
    this.norm = 1 / s;

    // FFT tables
    const bits = Math.round(Math.log2(N));
    this.rev = new Uint32Array(N);
    for (let i = 0; i < N; i++) { let r = 0, x = i; for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; } this.rev[i] = r; }
    this.cosT = new Float64Array(N >> 1); this.sinT = new Float64Array(N >> 1);
    for (let k = 0; k < N >> 1; k++) { this.cosT[k] = Math.cos(TWO_PI * k / N); this.sinT[k] = Math.sin(TWO_PI * k / N); }
    this.re = new Float64Array(N); this.im = new Float64Array(N);

    this.inL = new Float32Array(N); this.inR = new Float32Array(N); this.inCount = 0;
    this.olaL = new Float64Array(N); this.olaR = new Float64Array(N);
    this.ringSize = N * 4;
    this.ringL = new Float32Array(this.ringSize); this.ringR = new Float32Array(this.ringSize);
    this.rRead = 0; this.rWrite = this.H; this.rFill = this.H; // pre-roll

    const K = this.half + 1;
    this.XLr = new Float64Array(K); this.XLi = new Float64Array(K);
    this.XRr = new Float64Array(K); this.XRi = new Float64Array(K);
    this.YLr = new Float64Array(K); this.YLi = new Float64Array(K);
    this.YRr = new Float64Array(K); this.YRi = new Float64Array(K);
    this.mag = new Float64Array(K); this.phS = new Float64Array(K); this.prevPhS = new Float64Array(K);
    this.peaks = new Int32Array(K); this.bounds = new Int32Array(K + 1);
    this.curBins = new Int32Array(K); this.curTheta = new Float64Array(K);
    this.prevBins = new Int32Array(K); this.prevTheta = new Float64Array(K); this.prevCount = 0;
  }

  get latency() { return this.N; }

  fft(inverse) {
    const { N, re, im, rev, cosT, sinT } = this;
    for (let i = 0; i < N; i++) { const j = rev[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let size = 2; size <= N; size <<= 1) {
      const hs = size >> 1, step = N / size;
      for (let i = 0; i < N; i += size) {
        for (let j = 0, k = 0; j < hs; j++, k += step) {
          const wr = cosT[k], wi = inverse ? sinT[k] : -sinT[k];
          const a = i + j, b = a + hs;
          const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        }
      }
    }
  }

  frame() {
    const { N, H, half, win, re, im, inL, inR, XLr, XLi, XRr, XRi, YLr, YLi, YRr, YRi, mag, phS, prevPhS } = this;
    const p = this.ratio;
    // Pack L (real) + R (imag) into one complex FFT
    for (let n = 0; n < N; n++) { re[n] = inL[n] * win[n]; im[n] = inR[n] * win[n]; }
    this.fft(false);
    let maxMag = 0;
    for (let k = 0; k <= half; k++) {
      const nk = k === 0 ? 0 : N - k;
      const lr = 0.5 * (re[k] + re[nk]), li = 0.5 * (im[k] - im[nk]);
      const rr = 0.5 * (im[k] + im[nk]), ri = -0.5 * (re[k] - re[nk]);
      XLr[k] = lr; XLi[k] = li; XRr[k] = rr; XRi[k] = ri;
      const m = Math.hypot(lr, li) + Math.hypot(rr, ri);
      mag[k] = m; if (m > maxMag) maxMag = m;
      phS[k] = Math.atan2(li + ri, lr + rr);
      YLr[k] = 0; YLi[k] = 0; YRr[k] = 0; YRi[k] = 0;
    }

    // Peak picking
    const thr = maxMag * 1e-7 + 1e-12;
    let np = 0;
    const peaks = this.peaks;
    for (let k = 2; k < half - 1; k++) {
      const m = mag[k];
      if (m > thr && m > mag[k - 1] && m >= mag[k + 1] && m > mag[k - 2] && m >= mag[k + 2]) peaks[np++] = k;
    }

    if (np > 0) {
      const bounds = this.bounds;
      bounds[0] = 0;
      for (let i = 1; i < np; i++) {
        let lo = peaks[i - 1], best = lo + 1, bm = Infinity;
        for (let k = lo + 1; k < peaks[i]; k++) if (mag[k] < bm) { bm = mag[k]; best = k; }
        bounds[i] = best;
      }
      bounds[np] = half + 1;

      const prevBins = this.prevBins, prevTheta = this.prevTheta, prevCount = this.prevCount;
      let j = 0;
      for (let i = 0; i < np; i++) {
        const kp = peaks[i];
        const omegaH = TWO_PI * kp * H / N;
        const adv = omegaH + princarg(phS[kp] - prevPhS[kp] - omegaH); // true phase advance per hop
        const kt = Math.round(kp * p);
        const shift = kt - kp;
        let thetaPrev = 0;
        if (prevCount > 0) {
          while (j + 1 < prevCount && Math.abs(prevBins[j + 1] - kt) <= Math.abs(prevBins[j] - kt)) j++;
          if (Math.abs(prevBins[j] - kt) <= 3) thetaPrev = prevTheta[j];
        }
        const theta = princarg(thetaPrev + (p - 1) * adv);
        this.curBins[i] = kt; this.curTheta[i] = theta;
        const c = Math.cos(theta), s = Math.sin(theta);
        const k0 = bounds[i], k1 = bounds[i + 1];
        for (let k = k0; k < k1; k++) {
          const kk = k + shift;
          if (kk < 0 || kk > half) continue;
          YLr[kk] += XLr[k] * c - XLi[k] * s; YLi[kk] += XLr[k] * s + XLi[k] * c;
          YRr[kk] += XRr[k] * c - XRi[k] * s; YRi[kk] += XRr[k] * s + XRi[k] * c;
        }
      }
    }
    // swap peak memory
    let t = this.prevBins; this.prevBins = this.curBins; this.curBins = t;
    let t2 = this.prevTheta; this.prevTheta = this.curTheta; this.curTheta = t2;
    this.prevCount = np;
    prevPhS.set(phS);

    // Rebuild packed spectrum Z = YL + j*YR (both Hermitian)
    re[0] = YLr[0]; im[0] = YRr[0];
    re[half] = YLr[half]; im[half] = YRr[half];
    for (let k = 1; k < half; k++) {
      re[k] = YLr[k] - YRi[k]; im[k] = YLi[k] + YRr[k];
      re[N - k] = YLr[k] + YRi[k]; im[N - k] = -YLi[k] + YRr[k];
    }
    this.fft(true);
    const g = this.norm / N, olaL = this.olaL, olaR = this.olaR;
    for (let n = 0; n < N; n++) { const w = win[n] * g; olaL[n] += re[n] * w; olaR[n] += im[n] * w; }
    // Emit H finished samples
    const { ringL, ringR, ringSize } = this;
    for (let n = 0; n < H; n++) {
      ringL[this.rWrite] = olaL[n]; ringR[this.rWrite] = olaR[n];
      this.rWrite = (this.rWrite + 1) % ringSize;
    }
    this.rFill = Math.min(this.rFill + H, ringSize);
    olaL.copyWithin(0, H); olaR.copyWithin(0, H);
    olaL.fill(0, N - H); olaR.fill(0, N - H);
  }

  process(inLeft, inRight, outLeft, outRight, len) {
    const { N, H, inL, inR, ringL, ringR, ringSize } = this;
    const base = N - H;
    for (let i = 0; i < len; i++) {
      inL[base + this.inCount] = inLeft ? inLeft[i] : 0;
      inR[base + this.inCount] = inRight ? inRight[i] : 0;
      if (++this.inCount === H) {
        this.frame();
        inL.copyWithin(0, H); inR.copyWithin(0, H);
        this.inCount = 0;
      }
      if (this.rFill > 0) {
        outLeft[i] = ringL[this.rRead]; outRight[i] = ringR[this.rRead];
        this.rRead = (this.rRead + 1) % ringSize; this.rFill--;
      } else { outLeft[i] = 0; outRight[i] = 0; }
    }
  }
}

if (typeof registerProcessor === 'function') {
  class PitchShifterProcessor extends AudioWorkletProcessor {
    constructor(options) {
      super();
      const o = (options && options.processorOptions) || {};
      this.fftSize = o.fftSize || 4096;
      this.overlap = o.overlap || 4;
      this.shifter = new PhaseLockedPitchShifter(this.fftSize, this.overlap, o.ratio || 1);
      this.port.onmessage = (e) => {
        const d = e.data || {};
        if (typeof d.ratio === 'number' && isFinite(d.ratio)) this.shifter.ratio = Math.min(2, Math.max(0.5, d.ratio));
        if (d.fftSize && d.fftSize !== this.fftSize) {
          this.fftSize = d.fftSize;
          this.shifter = new PhaseLockedPitchShifter(this.fftSize, this.overlap, this.shifter.ratio);
        }
      };
    }
    process(inputs, outputs) {
      const input = inputs[0] || [];
      const out = outputs[0];
      const L = input[0] || null;
      const R = input[1] || input[0] || null;
      const oL = out[0], oR = out[1] || new Float32Array(oL.length);
      this.shifter.process(L, R, oL, oR, oL.length);
      return true;
    }
  }
  registerProcessor('pitch-shifter', PitchShifterProcessor);
}
if (typeof module !== 'undefined') module.exports = { PhaseLockedPitchShifter };
