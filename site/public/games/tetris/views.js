// TV shows everyone's board; each phone plays its own game.
import { esc, nameOf, injectStyles } from '../../js/ui.js';
import { Tetris, paint, bevel, W, H, COLORS, PREVIEW } from './game.js';

function styles() {
  injectStyles('tetris', `
    .tt { text-align: center; }
    .tt-boards { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(.6rem, 2vw, 1.6rem); }
    .tt-p { display: flex; flex-direction: column; align-items: center; gap: .2rem; }
    .tt-p canvas { height: var(--bh, 60vh); width: auto; aspect-ratio: 1 / 2; border-radius: 8px; box-shadow: 0 0 0 3px rgba(255,255,255,.1); }
    .tt-p.dead canvas { filter: grayscale(1) brightness(.6); }
    .tt-p.win canvas { box-shadow: 0 0 0 4px var(--gold); }
    .tt-name { font: 800 1.05rem var(--display); }
    .tt-stat { font: 700 .85rem var(--body); opacity: .85; }
    .tt-place { font: 800 .95rem var(--display); color: var(--gold); min-height: 1.2rem; }
    .tt-log { min-height: 1.4rem; font: 700 clamp(.9rem, 2.6vh, 1.15rem) var(--body); color: #ffb37a; margin: .3rem 0; }
    .tt-count { position: fixed; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 900;
      font: 900 30vh/1 var(--display); color: var(--gold); text-shadow: 0 .04em 0 rgba(0,0,0,.4); }
    .tt-actions { display: flex; justify-content: center; gap: .6rem; margin-top: .6rem; }
    /* phone */
    .tt-phone { user-select: none; -webkit-user-select: none; touch-action: manipulation; }
    .tt-phone .tt-top { display: flex; justify-content: space-between; align-items: center; font: 700 .95rem var(--body); margin-bottom: .3rem; }
    .tt-phone .tt-play { display: flex; justify-content: center; gap: .6rem; align-items: flex-start; }
    .tt-phone #tt-me { height: min(56vh, 30rem); width: auto; aspect-ratio: 1 / 2; border-radius: 8px; }
    .tt-phone .tt-side { display: flex; flex-direction: column; gap: .4rem; align-items: center; font: 700 .8rem var(--body); }
    .tt-phone #tt-next { width: 3.6rem; height: 3.6rem; border-radius: 8px; }
    .tt-pad { display: grid; grid-template-columns: repeat(4, 1fr); gap: .45rem; margin-top: .6rem; }
    .tt-pad button { font: 800 1.6rem/1 var(--display); padding: .9rem 0; border-radius: 14px; border: 0; background: var(--card); color: var(--ink);
      box-shadow: 0 4px 0 var(--card-edge, #cdbf98); touch-action: none; }
    .tt-pad button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--card-edge, #cdbf98); }
    .tt-pad .wide { grid-column: span 2; background: var(--gold); }
    .tt-junk { color: #ffb37a; font-weight: 800; min-height: 1.2rem; }
    .tt-phone #tt-hold { width: 3.6rem; height: 3.6rem; border-radius: 8px; }
    .tt-phone #tt-hold.used { opacity: .45; }
    .tt-pad .hold { grid-column: span 2; }
    /* line-clear effects */
    .tt-wrap { position: relative; display: inline-block; line-height: 0; }
    .tt-pop { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); pointer-events: none; white-space: nowrap; line-height: 1;
      font: 900 1.6rem var(--display); color: #fff; text-shadow: 0 3px 0 rgba(0,0,0,.45); animation: tt-pop 900ms ease-out forwards; z-index: 2; }
    .tt-pop.n2 { color: #9be7ff; } .tt-pop.n3 { color: #ffd34d; font-size: 2rem; }
    .tt-pop.n4 { font-size: 2.6rem; background: linear-gradient(90deg,#ff5b5b,#ffb43a,#ffe14d,#5be37a,#4ac8ff,#b46bff); -webkit-background-clip: text; background-clip: text;
      color: transparent; text-shadow: none; filter: drop-shadow(0 3px 0 rgba(0,0,0,.5)); animation: tt-pop4 1400ms ease-out forwards; }
    @keyframes tt-pop { 0% { transform: translate(-50%,-30%) scale(.4); opacity: 0 } 18% { transform: translate(-50%,-50%) scale(1.15); opacity: 1 }
      70% { opacity: 1 } 100% { transform: translate(-50%,-110%) scale(1); opacity: 0 } }
    @keyframes tt-pop4 { 0% { transform: translate(-50%,-50%) scale(.2) rotate(-12deg); opacity: 0 } 15% { transform: translate(-50%,-50%) scale(1.35) rotate(4deg); opacity: 1 }
      30% { transform: translate(-50%,-50%) scale(1) rotate(-2deg) } 80% { opacity: 1 } 100% { transform: translate(-50%,-90%) scale(1.1); opacity: 0 } }
    .tt-shake { animation: tt-shake 420ms ease-out; }
    @keyframes tt-shake { 0%,100% { transform: none } 15% { transform: translate(-6px, 3px) rotate(-1deg) } 30% { transform: translate(6px,-3px) rotate(1deg) }
      45% { transform: translate(-4px, 2px) } 60% { transform: translate(4px,-1px) } 80% { transform: translate(-2px, 1px) } }
    .tt-glow { animation: tt-glow 1200ms ease-out; }
    @keyframes tt-glow { 0% { box-shadow: 0 0 0 6px #fff, 0 0 40px 12px #ffe14d } 100% { box-shadow: 0 0 0 3px rgba(255,255,255,.1) } }
    @media (prefers-reduced-motion: reduce) { .tt-shake, .tt-glow { animation: none } }
  `);
}

// ---------------- Line-clear celebration (TV and phone) ----------------
const CLEAR_WORDS = ['', 'Single', 'Double!', 'Triple!', 'TETRIS!'];
function celebrate(wrap, canvas, n) {
  if (!wrap || !n) return;
  const pop = document.createElement('div');
  pop.className = `tt-pop n${n}`;
  pop.textContent = CLEAR_WORDS[n];
  wrap.appendChild(pop);
  setTimeout(() => pop.remove(), n === 4 ? 1500 : 1000);
  if (n >= 3) { canvas.classList.remove('tt-shake'); void canvas.offsetWidth; canvas.classList.add('tt-shake'); }
  if (n === 4) { canvas.classList.remove('tt-glow'); void canvas.offsetWidth; canvas.classList.add('tt-glow'); }
}

// ---------------- TV ----------------
let tvKey = '', tvFx = -1;
export function renderBoard(el, { state: s, players, sendAction }) {
  styles();
  if (!s.boards || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Stacking blocks…</p>'; return; }
  const ids = Object.keys(s.boards);
  const key = `${s.round}:${ids.join(',')}:${s.phase === 'over'}`;
  const bh = ids.length <= 2 ? 62 : ids.length <= 4 ? 52 : ids.length <= 6 ? 40 : 30;
  if (tvKey !== key || !el.querySelector('.tt')) {
    tvKey = key;
    el.innerHTML = `<div class="tt" style="--bh:${bh}vh">
      <div class="tt-log" id="tt-log"></div>
      <div class="tt-boards">${ids.map((id) => `<div class="tt-p" data-id="${id}">
        <div class="tt-place"></div><div class="tt-wrap"><canvas width="${W * 12}" height="${H * 12}"></canvas></div>
        <div class="tt-name">${esc(nameOf(id, players))}</div><div class="tt-stat"></div></div>`).join('')}</div>
      <div class="tt-actions">${s.phase === 'over' ? '<button class="btn btn-primary btn-big" id="tt-again">Play again</button>' : ''}</div></div>`;
    el.querySelector('#tt-again')?.addEventListener('click', () => sendAction('game:again'));
  }
  for (const id of ids) {
    const box = el.querySelector(`.tt-p[data-id="${id}"]`);
    const b = s.boards[id];
    const dead = s.dead.includes(id);
    box.classList.toggle('dead', dead);
    box.classList.toggle('win', s.phase === 'over' && s.winner === id && !s.solo);
    paint(box.querySelector('canvas'), b.cells);
    box.querySelector('.tt-stat').textContent = `${b.score.toLocaleString()} pts · ${b.lines} lines`;
    box.querySelector('.tt-place').textContent = s.solo ? (dead ? 'Game over' : '') : s.places[id] === 1 ? '🏆 Winner' : dead ? `Out · #${s.places[id]}` : '';
  }
  if (tvFx === -1) tvFx = s.fx?.k || 0; // don't replay an old clear after a page reload
  if (s.fx && s.fx.k !== tvFx) {
    tvFx = s.fx.k;
    const box = el.querySelector(`.tt-p[data-id="${s.fx.id}"]`);
    if (box) celebrate(box.querySelector('.tt-wrap'), box.querySelector('canvas'), s.fx.n);
  }
  el.querySelector('#tt-log').textContent = s.log?.[0] || (s.phase === 'play' ? (s.solo ? 'Go for a high score!' : 'Clear 2+ lines at once to send junk rows!') : '');
  countdownOverlay(s);
}

function countdownOverlay(s) {
  let o = document.querySelector('.tt-count');
  if (s.phase !== 'countdown') { o?.remove(); return; }
  if (!o) { o = document.createElement('div'); o.className = 'tt-count'; document.body.appendChild(o); }
  const tick = () => {
    const left = Math.ceil((s.startAt - Date.now()) / 1000);
    if (left <= 0 || !document.body.contains(o)) { o.remove(); return; }
    o.textContent = left > 3 ? 3 : left;
    setTimeout(tick, 200);
  };
  tick();
}

// ---------------- Phone ----------------
let flashes = [];
window.__ttGame = () => game; // handy for testing
let game = null, gameRound = 0, applied = 0, raf = 0, lastDrop = 0, lastSnap = 0, dirty = false, send = null;
let phoneKey = '';

function stopGame() { cancelAnimationFrame(raf); raf = 0; game = null; }

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  styles();
  send = sendAction;
  if (!s.boards || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Stacking blocks…</p>'; return; }
  const mine = s.boards[me];
  const isVip = players[0]?.id === me;

  if (!mine) { el.innerHTML = '<div class="sheet center"><h2>This game already started</h2><p class="muted">Watch the TV. You can jump in next round.</p></div>'; return; }

  if (s.phase === 'over' || s.dead.includes(me)) {
    if (game && !game.over) game.over = true;
    stopGame();
    const key = `over:${s.round}:${s.phase}:${s.places[me] || ''}`;
    if (phoneKey === key) return;
    phoneKey = key;
    const place = s.places[me];
    el.innerHTML = `<div class="tt tt-phone sheet center">
      <h2>${s.solo ? 'Game over!' : s.winner === me ? 'You win! 🏆' : `You placed #${place || '?'}`}</h2>
      <p>${mine.score.toLocaleString()} points · ${mine.lines} lines</p>
      ${s.phase !== 'over' ? '<p class="muted">Watch the TV to see who wins.</p>' : isVip ? '<div class="tt-actions"><button class="btn btn-primary btn-big" id="tt-again">Play again</button></div>' : '<p class="muted">The VIP or the TV can start another round.</p>'}</div>`;
    el.querySelector('#tt-again')?.addEventListener('click', () => sendAction('game:again'));
    return;
  }

  // Build the controller once per round.
  const key = `play:${s.round}`;
  if (phoneKey !== key || !el.querySelector('#tt-me')) {
    phoneKey = key;
    stopGame();
    el.innerHTML = `<div class="tt tt-phone">
      <div class="tt-top"><span id="tt-score">0</span><span class="tt-junk" id="tt-junk"></span><span id="tt-lines">Lines 0</span></div>
      <div class="tt-play"><div class="tt-wrap" id="tt-wrap"><canvas id="tt-me" width="${W * 24}" height="${H * 24}"></canvas></div>
        <div class="tt-side">Hold<canvas id="tt-hold" width="96" height="96"></canvas>Next<canvas id="tt-next" width="96" height="96"></canvas><span id="tt-level">Level 1</span></div></div>
      <div class="tt-pad">
        <button data-k="left" aria-label="Left">◀</button><button data-k="rotate" aria-label="Rotate">⟳</button>
        <button data-k="down" aria-label="Down">▼</button><button data-k="right" aria-label="Right">▶</button>
        <button class="hold" data-k="hold">Hold</button><button class="wide" data-k="drop">Drop ⤓</button>
      </div></div>`;
    wirePad(el);
  }

  if (s.phase === 'countdown') return;

  if (!game || gameRound !== s.round) {
    gameRound = s.round;
    applied = s.junk?.[me] || 0;
    game = new Tetris({
      onLock: () => { dirty = true; snap(true); },
      onClear: (n, rows) => { flashes.push({ rows, n, t: performance.now() }); celebrate(el.querySelector('#tt-wrap'), el.querySelector('#tt-me'), n); send?.('game:cleared', { lines: n }); },
      onTopOut: () => { snap(true); send?.('game:topout', { score: game?.score || 0 }); },
    });
    lastDrop = performance.now();
    loop(el);
  }
  // Junk rows sent by other players.
  const owed = (s.junk?.[me] || 0) - applied;
  if (owed > 0 && game) {
    applied += owed;
    game.addJunk(owed);
    const j = el.querySelector('#tt-junk');
    if (j) { j.textContent = `+${owed} junk!`; setTimeout(() => { j.textContent = ''; }, 1500); }
    dirty = true;
  }
}

function snap(force) {
  if (!game || !send) return;
  const now = performance.now();
  if (!force && (!dirty || now - lastSnap < 400)) return;
  lastSnap = now;
  dirty = false;
  send('game:snap', { cells: game.snapshot(), score: game.score, lines: game.lines, level: game.level });
}

function loop(el) {
  const frame = (t) => {
    if (!game) return;
    if (!game.over && t - lastDrop > game.interval) { game.step(); lastDrop = t; dirty = true; }
    draw(el);
    snap(false);
    if (!game.over) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

function draw(el) {
  const c = el.querySelector('#tt-me');
  if (!c || !game) return;
  const gy = game.ghostY();
  const ghost = game.piece.blocks.map(([x, y]) => [game.piece.x + x, gy + y]);
  paint(c, game.snapshot(), { ghost });
  el.querySelector('#tt-score').textContent = game.score.toLocaleString();
  el.querySelector('#tt-lines').textContent = `Lines ${game.lines}`;
  el.querySelector('#tt-level').textContent = `Level ${game.level}`;
  drawFlashes(c);
  preview(el.querySelector('#tt-next'), game.next);
  const h = el.querySelector('#tt-hold');
  preview(h, game.held);
  h.classList.toggle('used', !game.canHold);
}

/** Cleared rows burst white and shrink away; a Tetris flashes the whole board in rainbow colors. */
function drawFlashes(c) {
  const now = performance.now();
  flashes = flashes.filter((f) => now - f.t < (f.n === 4 ? 650 : 380));
  if (!flashes.length) return;
  const ctx = c.getContext('2d');
  const cw = c.width / W, ch = c.height / H;
  for (const f of flashes) {
    const k = (now - f.t) / (f.n === 4 ? 650 : 380);
    if (f.n === 4) {
      const hue = (k * 720) % 360;
      ctx.fillStyle = `hsla(${hue}, 90%, 65%, ${0.35 * (1 - k)})`;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    for (const r of f.rows) {
      const shrink = k * c.width / 2;
      ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
      ctx.fillRect(shrink, r * ch - k * ch * 0.4, c.width - shrink * 2, ch * (1 + k * 0.8));
    }
  }
}

function preview(n, kind) {
  const ctx = n.getContext('2d');
  ctx.clearRect(0, 0, n.width, n.height);
  ctx.fillStyle = '#0f2f24'; ctx.fillRect(0, 0, n.width, n.height);
  if (!kind) return;
  const sz = 20, ox = (n.width - 4 * sz) / 2 + (kind === 'O' || kind === 'I' ? 0 : sz / 2), oy = (n.height - 2 * sz) / 2;
  PREVIEW[kind].forEach(([x, y]) => bevel(ctx, ox + x * sz, oy + y * sz, sz, sz, COLORS[kind]));
}

function act(k) {
  if (!game || game.over) return;
  if (k === 'left') game.move(-1);
  else if (k === 'right') game.move(1);
  else if (k === 'rotate') game.rotate();
  else if (k === 'hold') { if (game.hold()) lastDrop = performance.now(); }
  else if (k === 'down') { if (game.step()) game.score += 1; lastDrop = performance.now(); }
  else if (k === 'drop') { game.hardDrop(); lastDrop = performance.now(); }
  dirty = true;
}

function wirePad(el) {
  el.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    let hold = null;
    const start = (e) => {
      e.preventDefault();
      act(k);
      if (k === 'left' || k === 'right' || k === 'down') {
        hold = setTimeout(function rep() { act(k); hold = setTimeout(rep, k === 'down' ? 45 : 80); }, 220);
      }
    };
    const end = () => { clearTimeout(hold); hold = null; };
    b.addEventListener('pointerdown', start);
    b.addEventListener('pointerup', end);
    b.addEventListener('pointerleave', end);
    b.addEventListener('pointercancel', end);
  });
  if (!window.__ttKeys) {
    window.__ttKeys = true;
    window.addEventListener('keydown', (e) => {
      const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', ' ': 'drop', c: 'hold', C: 'hold', Shift: 'hold' }[e.key];
      if (k && game) { e.preventDefault(); act(k); }
    });
  }
}
