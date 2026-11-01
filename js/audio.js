// All sounds are synthesised with Web Audio: no files to download, works offline.
const AC = window.AudioContext || window.webkitAudioContext;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

const MUSIC_VOL = 0.2;
const BPM = 128;
// 8 bars of eighth notes over C - Am - F - G. null = rest.
const MELODY = [
  76, 79, 84, 79, 76, null, 79, null,
  81, 84, 81, 76, 72, null, 76, null,
  77, 81, 84, 81, 77, 79, 81, null,
  79, 83, 86, 83, 79, null, null, null,
  84, 83, 84, 79, 76, 79, 84, null,
  81, 79, 81, 76, 81, null, 84, null,
  77, null, 81, null, 84, 81, 77, null,
  79, 81, 83, 86, 83, null, 79, null,
];
const ROOTS = [48, 45, 41, 43];
const CHORDS = [[0, 4, 7], [0, 3, 7], [0, 4, 7], [0, 4, 7]];
const BASS = [0, null, 12, null, 7, null, 12, null];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('pk-muted') === '1';
    this.musicWanted = false;
    this.timer = null;
    this.lastWrong = 0;
  }

  get now() { return this.ctx.currentTime; }

  unlock() {
    if (!AC) return;
    if (!this.ctx) {
      // iOS: play even when the ringer switch is on silent
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* unsupported */ }
      const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 10;
      comp.ratio.value = 4;
      comp.connect(ctx.destination);
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(comp);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(this.master);
      this.music = ctx.createGain();
      this.music.gain.value = 0;
      this.music.connect(this.master);
      this.noiseBuf = this._noise(1);
      this.applauseBuf = this._applause(4.2);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    const b = this.ctx.createBufferSource();
    b.buffer = this.ctx.createBuffer(1, 1, 22050);
    b.connect(this.ctx.destination);
    b.start(0);
  }

  pause() { if (this.ctx) this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ctx) this.ctx.resume().catch(() => {}); }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('pk-muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 1, this.now, 0.05);
  }

  // ---------- building blocks ----------

  _tone(freq, { at = this.now, type = 'sine', dur = 0.3, vol = 0.3, attack = 0.005, to = null, dest = this.sfx } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g);
    g.connect(dest);
    o.start(at);
    o.stop(at + dur + 0.05);
    return o;
  }

  _noiseHit({ at = this.now, dur = 0.1, vol = 0.2, type = 'bandpass', freq = 2000, q = 1, dest = this.sfx } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest);
    s.start(at, Math.random() * 0.5);
    s.stop(at + dur + 0.02);
  }

  _noise(sec) {
    const ctx = this.ctx;
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  // A crowd clapping: hundreds of tiny filtered noise bursts at random times.
  _applause(dur) {
    const ctx = this.ctx;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(2, len, sr);
    const envAt = (t) => Math.min(1, t / 0.15) * (t > dur - 1.8 ? Math.max(0, (dur - t) / 1.8) : 1);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const claps = Math.floor(dur * 95);
      for (let i = 0; i < claps; i++) {
        const t = Math.random() * dur;
        if (Math.random() > envAt(t)) continue;
        const start = Math.floor(t * sr);
        const amp = 0.25 + Math.random() * 0.6;
        const decay = sr * (0.003 + Math.random() * 0.006);
        const a = 0.25 + Math.random() * 0.6; // per-hand tone colour
        const n = Math.min(len - start, Math.floor(decay * 7));
        let y = 0;
        for (let j = 0; j < n; j++) {
          y += a * ((Math.random() * 2 - 1) - y);
          d[start + j] += y * amp * Math.exp(-j / decay);
        }
      }
      for (let k = 0; k < len; k++) d[k] += (Math.random() * 2 - 1) * 0.035 * envAt(k / sr);
    }
    return buf;
  }

  _bell(f, at, vol) {
    this._tone(f, { at, dur: 1.1, vol });
    this._tone(f * 2.76, { at, dur: 0.3, vol: vol * 0.25 });
    this._tone(f * 5.4, { at, dur: 0.12, vol: vol * 0.1 });
  }

  // ---------- game sounds ----------

  correct() {
    if (!this.ctx) return;
    const t = this.now;
    this._bell(1318.5, t, 0.3); // "dl-"
    this._bell(1975.5, t + 0.09, 0.28); // "-ing!"
    [2637, 3136, 3951].forEach((f, i) => this._tone(f, { at: t + 0.2 + i * 0.05, type: 'triangle', dur: 0.18, vol: 0.06 }));
  }

  wrong() {
    if (!this.ctx) return;
    const n = performance.now();
    if (n - this.lastWrong < 250) return;
    this.lastWrong = n;
    const ctx = this.ctx;
    const t = this.now;
    // cartoon "boi-oi-oing"
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(420, t);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.5);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 16;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(45, t);
    lg.gain.linearRampToValueAtTime(5, t + 0.5);
    lfo.connect(lg);
    lg.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g);
    g.connect(this.sfx);
    o.start(t);
    lfo.start(t);
    o.stop(t + 0.6);
    lfo.stop(t + 0.6);
    this._tone(180, { at: t, dur: 0.12, vol: 0.25, to: 90 }); // "bonk"
  }

  pop(delay = 0, pitch = 600) {
    if (!this.ctx) return;
    this._tone(pitch, { at: this.now + delay, dur: 0.09, vol: 0.1, to: pitch * 2.2 });
  }

  starPop(i) {
    if (!this.ctx) return;
    const f = [784, 880, 988, 1175, 1319][i % 5];
    this._tone(f, { type: 'triangle', dur: 0.25, vol: 0.18 });
    this._tone(f * 2, { at: this.now + 0.05, dur: 0.2, vol: 0.06 });
  }

  hint() {
    if (!this.ctx) return;
    const t = this.now;
    [1568, 2093, 1568, 2093].forEach((f, i) => this._tone(f, { at: t + i * 0.09, type: 'triangle', dur: 0.15, vol: 0.07 }));
  }

  whoosh(dur = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = this.now;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(350, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.55);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  // Footsteps for the running character
  steps(count = 8, gap = 0.11) {
    if (!this.ctx) return;
    const t = this.now;
    for (let i = 0; i < count; i++) this._tone(i % 2 ? 260 : 330, { at: t + i * gap, dur: 0.07, vol: 0.12, to: 140 });
  }

  // "Ta-da!" when the new level appears
  tada() {
    if (!this.ctx) return;
    const t = this.now;
    this._tone(300, { at: t, type: 'triangle', dur: 0.35, vol: 0.2, to: 900 });
    this._bell(1046.5, t + 0.3, 0.2);
    this._bell(1568, t + 0.3, 0.16);
  }

  _fanfare(at) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2600;
    lp.connect(this.sfx);
    [[72, 0, 0.16], [76, 0.14, 0.16], [79, 0.28, 0.16], [84, 0.42, 0.8]].forEach(([m, d, len]) => {
      this._tone(mtof(m), { at: at + d, type: 'square', dur: len, vol: 0.07, dest: lp });
      this._tone(mtof(m), { at: at + d, type: 'triangle', dur: len, vol: 0.14 });
    });
  }

  _whistle(at) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(1900, at);
    o.frequency.linearRampToValueAtTime(2800, at + 0.25);
    o.frequency.linearRampToValueAtTime(2300, at + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.05, at + 0.04);
    g.gain.setValueAtTime(0.05, at + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.62);
    o.connect(g);
    g.connect(this.sfx);
    o.start(at);
    o.stop(at + 0.7);
  }

  // Many voices going "yaaaay" through a vowel formant
  _crowdYay(at, dur = 1.5) {
    const ctx = this.ctx;
    const form = ctx.createBiquadFilter();
    form.type = 'bandpass';
    form.frequency.value = 950;
    form.Q.value = 2.2;
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 700;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    form.connect(out);
    body.connect(out);
    out.connect(this.sfx);
    for (let i = 0; i < 9; i++) {
      const start = at + rand(0, 0.25);
      const base = rand(230, 460);
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * 0.85, start);
      o.frequency.linearRampToValueAtTime(base * 1.3, start + 0.35);
      o.frequency.linearRampToValueAtTime(base * 0.9, start + dur);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rand(4.5, 6.5);
      const lg = ctx.createGain();
      lg.gain.value = base * 0.03;
      lfo.connect(lg);
      lg.connect(o.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.045, start + 0.12);
      g.gain.setValueAtTime(0.045, start + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g);
      g.connect(form);
      g.connect(body);
      o.start(start);
      lfo.start(start);
      o.stop(start + dur + 0.05);
      lfo.stop(start + dur + 0.05);
    }
  }

  // Level complete: crowd applause + cheers + fanfare
  cheer() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = this.now;
    this.duck(4.2);
    const s = ctx.createBufferSource();
    s.buffer = this.applauseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'peaking';
    f.frequency.value = 1800;
    f.gain.value = 5;
    const g = ctx.createGain();
    g.gain.value = 0.85;
    s.connect(f);
    f.connect(g);
    g.connect(this.sfx);
    s.start(t);
    this._fanfare(t);
    this._crowdYay(t + 0.15);
    this._whistle(t + 0.6);
    this._whistle(t + 1.7);
  }

  // ---------- background music ----------

  duck(sec) {
    if (!this.ctx) return;
    const g = this.music.gain;
    const t = this.now;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(MUSIC_VOL * 0.15, t + 0.15);
    g.setValueAtTime(MUSIC_VOL * 0.15, t + sec);
    g.linearRampToValueAtTime(this.musicWanted ? MUSIC_VOL : 0, t + sec + 0.8);
  }

  startMusic() {
    if (!this.ctx) return;
    this.musicWanted = true;
    const g = this.music.gain;
    g.cancelScheduledValues(this.now);
    g.setTargetAtTime(MUSIC_VOL, this.now, 0.4);
    if (!this.timer) {
      this.step = 0;
      this.next = this.now + 0.1;
      this.timer = setInterval(() => this._schedule(), 30);
    }
  }

  _schedule() {
    if (this.ctx.state !== 'running') return;
    const spb = 60 / BPM / 2;
    if (this.next < this.now - 0.3) this.next = this.now + 0.05; // recovered from a pause
    while (this.next < this.now + 0.15) {
      this._musicStep(this.step, this.next);
      this.next += spb;
      this.step = (this.step + 1) % MELODY.length;
    }
  }

  _musicStep(s, t) {
    const dest = this.music;
    const bar = s >> 3;
    const i = s & 7;
    const root = ROOTS[bar % 4];
    const b = BASS[i];
    if (b != null) this._tone(mtof(root + b), { at: t, type: 'triangle', dur: 0.22, vol: 0.26, dest });
    if (i % 2) CHORDS[bar % 4].forEach((c) => this._tone(mtof(root + 24 + c), { at: t, type: 'triangle', dur: 0.1, vol: 0.035, dest }));
    if (i === 0 || i === 4) this._tone(150, { at: t, dur: 0.14, vol: 0.3, to: 45, dest });
    if (i === 2 || i === 6) this._noiseHit({ at: t, dur: 0.09, vol: 0.12, freq: 1800, q: 0.8, dest });
    if (i % 2) this._noiseHit({ at: t, dur: 0.035, vol: 0.06, type: 'highpass', freq: 7000, dest });
    const m = MELODY[s];
    if (m != null) {
      // marimba-ish: fundamental plus a quick, bright overtone
      this._tone(mtof(m), { at: t, dur: 0.38, vol: 0.16, dest });
      this._tone(mtof(m) * 4, { at: t, dur: 0.05, vol: 0.03, dest });
    }
  }
}
