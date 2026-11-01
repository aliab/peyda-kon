// Canvas particles: star bursts on correct taps and confetti on level-up.
const COLORS = ['#ff5d8f', '#ffd23f', '#3bceac', '#4dabf7', '#9b5de5', '#ff8a3d', '#7ed957'];
const pick = (a) => a[(Math.random() * a.length) | 0];
const rand = (a, b) => a + Math.random() * (b - a);

export class FX {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.p = [];
    this.raf = 0;
    this.last = 0;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = innerWidth;
    this.h = innerHeight;
    this.c.width = Math.round(this.w * dpr);
    this.c.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  burst(x, y) {
    const unit = Math.min(this.w, this.h);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rand(-0.2, 0.2);
      const v = rand(0.5, 1.3) * unit;
      this.p.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - unit * 0.3,
        g: unit * 1.6, drag: 2.2, life: rand(0.7, 1.1), age: 0,
        size: rand(0.025, 0.045) * unit, rot: rand(0, 6), vr: rand(-8, 8),
        color: pick(COLORS), shape: Math.random() < 0.6 ? 'star' : 'dot',
      });
    }
    this._start();
  }

  confetti() {
    const unit = Math.min(this.w, this.h);
    for (let i = 0; i < 170; i++) {
      this.p.push({
        x: rand(0, this.w), y: rand(-this.h * 0.6, -10), vx: rand(-60, 60), vy: rand(0.25, 0.5) * this.h,
        g: unit * 0.15, drag: 0.3, life: rand(3, 4.2), age: 0, sway: rand(1, 3), phase: rand(0, 6),
        size: rand(0.018, 0.03) * unit, rot: rand(0, 6), vr: rand(-6, 6),
        color: pick(COLORS), shape: 'rect',
      });
    }
    this._start();
  }

  _start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this._tick(t));
  }

  _tick(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    const g = this.g;
    g.clearRect(0, 0, this.w, this.h);
    this.p = this.p.filter((p) => (p.age += dt) < p.life && p.y < this.h + 50);
    for (const p of this.p) {
      p.vx -= p.vx * p.drag * dt;
      p.vy += p.g * dt - p.vy * p.drag * dt;
      p.x += (p.vx + (p.sway ? Math.sin(p.age * 4 + p.phase) * p.sway * 40 : 0)) * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      g.globalAlpha = Math.min(1, (p.life - p.age) * 3);
      g.fillStyle = p.color;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      if (p.shape === 'rect') {
        g.scale(1, Math.cos(p.age * p.sway * 3));
        g.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      } else if (p.shape === 'star') {
        star(g, p.size);
      } else {
        g.beginPath();
        g.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }
    g.globalAlpha = 1;
    if (this.p.length) this.raf = requestAnimationFrame((n) => this._tick(n));
    else { this.raf = 0; g.clearRect(0, 0, this.w, this.h); }
  }
}

function star(g, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
