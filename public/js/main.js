import { Sound } from './audio.js';
import { FX } from './fx.js';
import { OBJECTS, NUMBERS, PALETTES, CHARACTERS, numberSVG, characterSVG } from './data.js';

const ROUNDS_PER_LEVEL = 5;
const IDLE_NUDGE_MS = 6000;
const IDLE_HINT_MS = 5000;

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fa = (n) => n.toLocaleString('fa-IR');
const shuffle = (a, rnd = Math.random) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// Seeded RNG so a resize re-lays out the same scene instead of reshuffling it.
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const el = {
  items: $('#items'), scene: $('#scene'), doodles: $('#doodles'),
  target: $('#target'), targetCard: $('#targetCard'), progress: $('#progress'), levelNum: $('#levelNum'),
  wipe: $('#wipe'), curtainText: $('#wipe .curtainText'), runner: $('#wipe .runner'),
  cheer: $('#cheer'), start: $('#start'), playBtn: $('#playBtn'), installBtn: $('#installBtn'), muteBtn: $('#muteBtn'),
  restartBtn: $('#restartBtn'), resumeInfo: $('#resumeInfo'), record: $('#record'),
};

const sound = new Sound();
const fx = new FX($('#fx'));

const state = {
  level: Math.max(1, parseInt(localStorage.getItem('pk-level'), 10) || 1),
  best: Math.max(1, parseInt(localStorage.getItem('pk-best'), 10) || 1),
  started: false,
  progress: 0,
  target: null,
  lastTarget: null,
  nodes: [],
  seed: 1,
  locked: true,
  wrongs: 0,
  timers: [],
};

const itemCount = (level) => Math.min(3 + level, 12); // 4 items on level 1, up to 12
const poolFor = (level) => (level >= 3 ? [...OBJECTS, ...NUMBERS] : OBJECTS);
const palette = (level) => PALETTES[(level - 1) % PALETTES.length];

// ---------- rendering ----------

function makeFace(def) {
  const f = document.createElement('div');
  f.className = 'face';
  if (def.num != null) f.innerHTML = numberSVG(def.num, def.color);
  else f.textContent = def.emoji;
  return f;
}

function applyLevelLook() {
  const p = palette(state.level);
  const s = document.documentElement.style;
  s.setProperty('--bg1', p.bg1);
  s.setProperty('--bg2', p.bg2);
  s.setProperty('--panel', p.panel);
  s.setProperty('--rim', p.rim);
  el.levelNum.textContent = fa(state.level);
}

function renderProgress() {
  el.progress.replaceChildren(
    ...Array.from({ length: ROUNDS_PER_LEVEL }, (_, i) => {
      const s = document.createElement('span');
      s.className = 'slot' + (i < state.progress ? ' on' : '');
      return s;
    }),
  );
}

function renderTarget(def) {
  el.target.replaceChildren(makeFace(def));
  restartAnim(el.targetCard, 'swap');
}

function restartAnim(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

function renderItems(defs) {
  state.seed = (Math.random() * 1e9) | 0;
  const rnd = seeded(state.seed);
  state.nodes = defs.map((def, i) => {
    const b = document.createElement('button');
    b.className = 'item enter';
    b.setAttribute('aria-label', def.emoji || String(def.num));
    b._def = def;
    b._jx = rnd() * 2 - 1;
    b._jy = rnd() * 2 - 1;
    b.style.setProperty('--rot', `${(rnd() * 24 - 12).toFixed(1)}deg`);
    b.style.setProperty('--d', `${i * 70}ms`);
    b.style.setProperty('--bd', `${(2.2 + rnd() * 1.2).toFixed(2)}s`);
    b.style.setProperty('--bdl', `${(-rnd() * 3).toFixed(2)}s`);
    const tilt = document.createElement('div');
    tilt.className = 'tilt';
    const bob = document.createElement('div');
    bob.className = 'bob';
    bob.append(makeFace(def));
    tilt.append(bob);
    b.append(tilt);
    b.addEventListener('animationend', (e) => { if (e.animationName === 'popIn') b.classList.remove('enter'); });
    sound.pop(i * 0.07, 520 + i * 45);
    return b;
  });
  el.items.replaceChildren(...state.nodes);
  layout();
}

function layout() {
  const W = el.items.clientWidth;
  const H = el.items.clientHeight;
  drawDoodles();
  const n = state.nodes.length;
  if (!n || !W || !H) return;
  // Grid with the biggest possible cells, then scatter items inside random cells.
  let best = null;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const s = Math.min(W / cols, H / rows);
    if (!best || s > best.s) best = { cols, rows, s };
  }
  const { cols, rows } = best;
  const cw = W / cols;
  const ch = H / rows;
  const size = Math.min(Math.min(cw, ch) * 0.76, Math.min(W, H) * 0.45);
  const cells = shuffle([...Array(cols * rows).keys()], seeded(state.seed));
  state.nodes.forEach((node, i) => {
    const c = cells[i];
    const fx = (cw - size) / 2;
    const fy = (ch - size) / 2;
    const x = (c % cols) * cw + cw / 2 + node._jx * fx * 0.9 - size / 2;
    const y = Math.floor(c / cols) * ch + ch / 2 + node._jy * fy * 0.9 - size / 2;
    Object.assign(node.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
    node.style.setProperty('--s', `${size}px`);
  });
}

// Hand-drawn style swirls, x's and dashed trails like a kids' activity book.
function drawDoodles() {
  const W = el.scene.clientWidth;
  const H = el.scene.clientHeight;
  if (!W || !H) return;
  const rnd = seeded(state.seed + 7);
  const unit = Math.min(W, H);
  const parts = [];
  const count = Math.round((W * H) / (unit * unit * 0.09)) + 4;
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = rnd() * H;
    const k = rnd();
    const r = unit * (0.025 + rnd() * 0.02);
    if (k < 0.4) {
      let d = '';
      for (let a = 0; a <= Math.PI * 4.2; a += 0.35) {
        const rr = (r * a) / (Math.PI * 4.2);
        d += `${d ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
      }
      parts.push(`<path d="${d}"/>`);
    } else if (k < 0.7) {
      const s = r * 0.6;
      parts.push(`<path d="M${x - s} ${y - s}L${x + s} ${y + s}M${x + s} ${y - s}L${x - s} ${y + s}"/>`);
    } else {
      const x2 = x + (rnd() - 0.5) * unit * 0.5;
      const y2 = y + (rnd() - 0.5) * unit * 0.5;
      const cx = (x + x2) / 2 + (rnd() - 0.5) * unit * 0.3;
      const cy = (y + y2) / 2 + (rnd() - 0.5) * unit * 0.3;
      parts.push(`<path class="dash" d="M${x} ${y}Q${cx} ${cy} ${x2} ${y2}"/>`);
    }
  }
  el.doodles.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.doodles.innerHTML = parts.join('');
}

// ---------- game flow ----------

function clearTimers() {
  state.timers.forEach(clearTimeout);
  state.timers = [];
}

function armIdle() {
  clearTimers();
  state.timers.push(setTimeout(() => {
    if (state.locked) return;
    restartAnim(el.targetCard, 'wiggle');
    sound.hint();
    state.timers.push(setTimeout(showHint, IDLE_HINT_MS));
  }, IDLE_NUDGE_MS));
}

function showHint() {
  const n = state.nodes.find((x) => x._def.id === state.target.id);
  if (n && !state.locked) n.classList.add('hint');
}

function newRound() {
  state.wrongs = 0;
  const pool = poolFor(state.level);
  let target;
  do target = pool[(Math.random() * pool.length) | 0];
  while (target.id === state.lastTarget);
  state.lastTarget = target.id;
  state.target = target;
  const others = shuffle(pool.filter((p) => p.id !== target.id)).slice(0, itemCount(state.level) - 1);
  renderTarget(target);
  renderItems(shuffle([target, ...others]));
}

function play() {
  state.locked = false;
  armIdle();
}

async function clearItems() {
  state.nodes.forEach((n, i) => {
    n.classList.remove('enter');
    n.style.setProperty('--d', `${i * 30}ms`);
    n.classList.add('leave');
  });
  await wait(300 + state.nodes.length * 30);
  state.nodes = [];
  el.items.replaceChildren();
}

function onPointerDown(e) {
  const btn = e.target.closest('.item');
  if (!btn || state.locked || btn.classList.contains('leave')) return;
  e.preventDefault();
  if (btn._def.id === state.target.id) onCorrect(btn);
  else onWrong(btn);
}

function onWrong(btn) {
  sound.wrong();
  if (navigator.vibrate) navigator.vibrate(60);
  restartAnim(btn.querySelector('.face'), 'shake');
  restartAnim(el.targetCard, 'wiggle');
  state.wrongs++;
  if (state.wrongs >= 2) showHint();
  armIdle();
}

async function onCorrect(btn) {
  state.locked = true;
  clearTimers();
  sound.correct();
  if (navigator.vibrate) navigator.vibrate(25);
  btn.classList.remove('hint');
  btn.classList.add('win');
  state.nodes.forEach((n) => n !== btn && n.classList.add('dim'));
  restartAnim(el.targetCard, 'happy');
  const r = btn.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  fx.burst(x, y);
  await wait(450);
  await flyStar(x, y);
  state.progress++;
  await wait(250);
  if (state.progress >= ROUNDS_PER_LEVEL) {
    await levelComplete();
  } else {
    await clearItems();
    newRound();
    play();
  }
}

function flyStar(x, y) {
  const slot = el.progress.children[state.progress];
  const r = slot.getBoundingClientRect();
  const tx = r.left + r.width / 2;
  const ty = r.top + r.height / 2;
  const mx = (x + tx) / 2;
  const my = Math.min(y, ty) - Math.min(innerWidth, innerHeight) * 0.2;
  const s = document.createElement('div');
  s.className = 'flyStar';
  s.textContent = '⭐';
  document.body.append(s);
  const at = (px, py, sc, rot) => ({ transform: `translate(${px}px, ${py}px) translate(-50%, -50%) scale(${sc}) rotate(${rot}deg)` });
  const a = s.animate([at(x, y, 0.6, 0), { ...at(mx, my, 1.8, 180), offset: 0.5 }, at(tx, ty, 1, 360)], {
    duration: 700,
    easing: 'ease-in-out',
    fill: 'forwards',
  });
  return a.finished.then(() => {
    s.remove();
    slot.classList.add('on');
    sound.starPop(state.progress);
  });
}

async function levelComplete() {
  sound.cheer();
  fx.confetti();
  el.cheer.hidden = false;
  restartAnim(el.cheer, 'show');
  await wait(2000);
  await wipeTransition();
}

// A funny character runs across dragging a curtain that "wipes" the screen.
async function wipeTransition() {
  const next = state.level + 1;
  const w = el.wipe;
  w.style.setProperty('--curtain', palette(state.level).curtain);
  el.runner.innerHTML = characterSVG(CHARACTERS[(state.level - 1) % CHARACTERS.length]);
  el.curtainText.innerHTML = `<span>مرحله</span><b>${fa(next)}</b>`;
  el.curtainText.classList.remove('show');
  w.hidden = false;
  w.className = 'running';
  const opts = { duration: 1100, easing: 'cubic-bezier(.55,0,.35,1)', fill: 'forwards' };
  sound.whoosh(1.1);
  sound.steps(9);
  const inAnim = w.animate([{ transform: 'translateX(calc(-100% - 8vmin))' }, { transform: 'translateX(0)' }], opts);
  await inAnim.finished;

  // Screen is covered: swap to the new level behind the curtain.
  state.level = next;
  localStorage.setItem('pk-level', String(next));
  if (next > state.best) {
    state.best = next;
    localStorage.setItem('pk-best', String(next));
  }
  state.progress = 0;
  state.nodes = [];
  el.items.replaceChildren();
  el.cheer.hidden = true;
  applyLevelLook();
  renderProgress();
  w.className = 'cheering';
  el.curtainText.classList.add('show');
  sound.tada();
  await wait(1500);

  w.className = 'running';
  sound.whoosh(1.1);
  sound.steps(9);
  const outAnim = w.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(calc(100% + 8vmin))' }], opts);
  await wait(250);
  newRound();
  await outAnim.finished;
  w.hidden = true;
  inAnim.cancel();
  outAnim.cancel();
  play();
}

// ---------- start / platform ----------

function renderStartScreen() {
  // Older saves only stored the level, so count it toward the record too.
  state.best = Math.max(state.best, state.level);
  const resuming = state.level > 1;
  el.resumeInfo.hidden = !resuming;
  el.resumeInfo.querySelector('b').textContent = fa(state.level);
  el.restartBtn.hidden = !resuming;
  el.record.hidden = state.best <= 1;
  el.record.querySelector('b').textContent = fa(state.best);
}

async function start({ fromBeginning = false } = {}) {
  if (state.started) return;
  state.started = true;
  if (fromBeginning) {
    state.level = 1;
    state.progress = 0;
    localStorage.setItem('pk-level', '1');
  }
  sound.unlock();
  sound.startMusic();
  const de = document.documentElement;
  if (de.requestFullscreen && !matchMedia('(display-mode: fullscreen)').matches) {
    de.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  keepAwake();
  el.start.classList.add('hide');
  await wait(450);
  el.start.hidden = true;
  applyLevelLook();
  renderProgress();
  newRound();
  play();
}

let wakeLock = null;
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* not allowed, fine */ }
}

function updateMuteBtn() {
  el.muteBtn.textContent = sound.muted ? '🔇' : '🔊';
}

el.playBtn.addEventListener('click', () => start());
el.restartBtn.addEventListener('click', () => start({ fromBeginning: true }));
el.items.addEventListener('pointerdown', onPointerDown);
el.muteBtn.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.muted);
  updateMuteBtn();
});
updateMuteBtn();

new ResizeObserver(() => layout()).observe(el.items);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) sound.pause();
  else if (el.start.hidden) {
    sound.resume();
    keepAwake();
  }
});

// Stop the browser from zooming, scrolling, selecting or opening menus on little fingers.
for (const ev of ['gesturestart', 'gesturechange', 'contextmenu', 'dblclick', 'selectstart']) {
  document.addEventListener(ev, (e) => e.preventDefault());
}
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

let installEvt = null;
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installEvt = e;
  el.installBtn.hidden = false;
});
el.installBtn.addEventListener('click', async () => {
  if (!installEvt) return;
  installEvt.prompt();
  await installEvt.userChoice;
  installEvt = null;
  el.installBtn.hidden = true;
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

applyLevelLook();
renderProgress();
renderStartScreen();
