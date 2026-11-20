// TV shows everyone's board; each phone plays its own game.
import { esc, nameOf, injectStyles } from '../../js/ui.js';
import { Tetris, paint, bevel, W, H, COLORS } from './game.js';

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
  `);
}

// ---------------- TV ----------------
let tvKey = '';
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
        <div class="tt-place"></div><canvas width="${W * 12}" height="${H * 12}"></canvas>
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
      <div class="tt-play"><canvas id="tt-me" width="${W * 24}" height="${H * 24}"></canvas>
        <div class="tt-side">Next<canvas id="tt-next" width="96" height="96"></canvas><span id="tt-level">Level 1</span></div></div>
      <div class="tt-pad">
        <button data-k="left" aria-label="Left">◀</button><button data-k="rotate" aria-label="Rotate">⟳</button>
        <button data-k="down" aria-label="Down">▼</button><button data-k="right" aria-label="Right">▶</button>
        <button class="wide" data-k="drop">Drop ⤓</button><button class="wide" data-k="rotate">Rotate ⟳</button>
      </div></div>`;
    wirePad(el);
  }

  if (s.phase === 'countdown') return;

  if (!game || gameRound !== s.round) {
    gameRound = s.round;
    applied = s.junk?.[me] || 0;
    game = new Tetris({
      onLock: () => { dirty = true; snap(true); },
      onClear: (n) => send?.('game:cleared', { lines: n }),
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
  const n = el.querySelector('#tt-next');
  const preview = { I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]], S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]] }[game.next];
  const ctx = n.getContext('2d');
  ctx.clearRect(0, 0, n.width, n.height);
  ctx.fillStyle = '#0f2f24'; ctx.fillRect(0, 0, n.width, n.height);
  const sz = 20, ox = (n.width - 4 * sz) / 2 + (game.next === 'O' ? 0 : game.next === 'I' ? 0 : sz / 2), oy = (n.height - 2 * sz) / 2;
  ctx.fillStyle = COLORS[game.next];
  preview.forEach(([x, y]) => bevel(ctx, ox + x * sz, oy + y * sz, sz, sz, COLORS[game.next]));
}

function act(k) {
  if (!game || game.over) return;
  if (k === 'left') game.move(-1);
  else if (k === 'right') game.move(1);
  else if (k === 'rotate') game.rotate();
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
      const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'rotate', ArrowDown: 'down', ' ': 'drop' }[e.key];
      if (k && game) { e.preventDefault(); act(k); }
    });
  }
}
