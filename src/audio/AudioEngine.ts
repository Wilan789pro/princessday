/**
 * Tiny synthesized sound design (Web Audio, no files needed).
 * Nothing plays until init() is called from a user gesture (autoplay rules).
 * Drop-in real audio files later in src/assets/sounds if preferred.
 */

type Ctx = AudioContext;

class AudioEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientNodes: AudioScheduledSourceNode[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  private lastTick = 0;
  enabled = true;

  /** Must be called inside a click/tap handler. Safe to call repeatedly. */
  init() {
    try {
      // iOS: play through the silent switch like a media app.
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      /* ignore */
    }
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.08);
      if (on && this.ctx.state === 'suspended') void this.ctx.resume();
    }
  }

  private ready(): Ctx | null {
    if (!this.ctx || !this.master || !this.enabled) return null;
    return this.ctx;
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine', dest?: AudioNode) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest ?? this.master!);
    o.start(start);
    o.stop(start + dur + 0.05);
    return o;
  }

  // ---------------------------------------------------------------- ambience
  startAmbient() {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.ambientGain) return;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.07;
    lfoGain.gain.value = 380;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    lp.connect(g).connect(this.master);
    // D add9 – airy and calm
    const freqs = [73.42, 146.83, 220.0, 329.63, 369.99];
    const nodes: AudioScheduledSourceNode[] = [lfo];
    freqs.forEach((f, i) => {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = i < 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = i < 2 ? 0.16 : 0.05;
        o.connect(og).connect(lp);
        o.start();
        nodes.push(o);
      }
    });
    g.gain.setTargetAtTime(0.12, ctx.currentTime, 2.5);
    this.ambientGain = g;
    this.ambientNodes = nodes;
  }

  /** level: 0..1 relative to normal ambience. */
  setAmbient(level: number, seconds = 1.5) {
    if (!this.ctx || !this.ambientGain) return;
    const t = this.ctx.currentTime;
    this.ambientGain.gain.cancelScheduledValues(t);
    this.ambientGain.gain.setTargetAtTime(Math.max(0.0001, 0.12 * level), t, seconds / 3);
  }

  stopAmbient() {
    this.setAmbient(0, 1);
    const nodes = this.ambientNodes;
    this.ambientNodes = [];
    this.ambientGain = null;
    setTimeout(() => nodes.forEach((n) => n.stop()), 1500);
  }

  // ---------------------------------------------------------------- effects
  /** Clock tick, throttled so very fast rewinds don't become noise. */
  tick(minGapMs = 70) {
    const ctx = this.ready();
    if (!ctx) return;
    const nowMs = performance.now();
    if (nowMs - this.lastTick < minGapMs) return;
    this.lastTick = nowMs;
    const t = ctx.currentTime;
    this.tone(2600, t, 0.035, 0.06, 'square');
    this.tone(1300, t, 0.05, 0.05, 'sine');
  }

  /** Reverse-swell "time rewinding" sound. */
  rewind(durationSec: number) {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + durationSec * 0.35);
    bp.frequency.exponentialRampToValueAtTime(500, t + durationSec);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + durationSec * 0.3);
    g.gain.exponentialRampToValueAtTime(0.05, t + durationSec * 0.85);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + durationSec + 0.1);
    // descending "tape" tone
    const o = ctx.createOscillator();
    const og = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(880, t + durationSec * 0.3);
    o.frequency.exponentialRampToValueAtTime(55, t + durationSec);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.05, t + durationSec * 0.3);
    og.gain.exponentialRampToValueAtTime(0.0001, t + durationSec);
    o.connect(lp).connect(og).connect(this.master!);
    o.start(t);
    o.stop(t + durationSec + 0.1);
  }

  /** Bright sapphire flash: shimmer + low bloom. */
  flash() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    [1046.5, 1318.5, 1568, 1975.5, 2637].forEach((f, i) => this.tone(f, t + i * 0.03, 2.6, 0.06, 'sine'));
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 1.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 2.1);
  }

  /** Crystal ping; index walks a pentatonic scale. */
  chime(index = 0) {
    const ctx = this.ready();
    if (!ctx) return;
    const scale = [659.25, 783.99, 880, 987.77, 1174.66, 1318.5, 1567.98];
    const f = scale[((index % scale.length) + scale.length) % scale.length];
    const t = ctx.currentTime;
    this.tone(f, t, 1.8, 0.09, 'sine');
    this.tone(f * 2.01, t, 0.9, 0.025, 'sine');
    this.tone(f * 3.98, t, 0.4, 0.01, 'triangle');
  }

  /** Soft click for UI buttons. */
  click() {
    const ctx = this.ready();
    if (!ctx) return;
    this.tone(1800, ctx.currentTime, 0.06, 0.03, 'sine');
  }

  /** Cinematic swell for reveals. */
  swell(duration = 3) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    [146.83, 220, 293.66, 440].forEach((f) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + duration * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + duration + 0.1);
    });
  }

  /** Heavy lock disengaging. */
  clunk() {
    const ctx = this.ready();
    if (!ctx || !this.noiseBuffer) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 0.55);
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.value = 2400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.25, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(hp).connect(ng).connect(this.master!);
    n.start(t);
    n.stop(t + 0.2);
  }

  /** Charging hum, rising in pitch. */
  charge(duration = 2.5) {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    o.frequency.exponentialRampToValueAtTime(240, t + duration);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(200, t);
    lp.frequency.exponentialRampToValueAtTime(1800, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + duration * 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.2);
    o.connect(lp).connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + duration + 0.3);
  }

  /** Golden fanfare when the chamber opens. */
  golden() {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    const notes = [293.66, 369.99, 440, 587.33, 739.99, 880, 1174.66];
    notes.forEach((f, i) => {
      this.tone(f, t + i * 0.11, 3.2, 0.06, 'triangle');
      this.tone(f * 2, t + i * 0.11, 1.6, 0.02, 'sine');
    });
    this.swell(4.5);
  }
}

export const audio = new AudioEngine();
