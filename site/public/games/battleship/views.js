// TV and phone views for Battleship.
import { esc, nameOf, injectStyles, setHtmlKeepingInputs } from '../../js/ui.js';
import { N, FLEET } from './engine.js';
import { playShot, playWin } from './sound.js';

// Painted art (art/*.webp). Turned on once the images exist.
export const ART_READY = true;
const art = (n) => `games/battleship/art/${n}.webp`;
const SHIP_ART = { Carrier: 'ship-carrier', Battleship: 'ship-battleship', Cruiser: 'ship-cruiser', Submarine: 'ship-submarine', Destroyer: 'ship-destroyer' };

/** Ship pictures laid over the grid. ships: [{ name, cells }]. dim = sunk enemy ships. */
function shipsLayer(ships, dim = false) {
  if (!ART_READY || !ships?.length) return '';
  return `<div class="bs-ships">${ships.map((sh) => {
    const cells = [...sh.cells].sort((a, b) => a - b);
    const r = Math.floor(cells[0] / N), c = cells[0] % N, len = cells.length;
    const across = cells.length < 2 || cells[1] - cells[0] === 1;
    const style = across
      ? `left:${c * 10}%;top:${r * 10}%;width:${len * 10}%;height:10%`
      : `left:${(c + 1) * 10}%;top:${r * 10}%;width:${len * 10}%;height:10%;transform:rotate(90deg);transform-origin:0 0`;
    return `<img class="bs-ship ${dim ? 'dim' : ''}" src="${art(SHIP_ART[sh.name])}" alt="" style="${style}">`;
  }).join('')}</div>`;
}

const label = (t) => (t === 'red' ? 'Red' : 'Blue');
const other = (t) => (t === 'red' ? 'blue' : 'red');
const coord = (i) => `${'ABCDEFGHIJ'[Math.floor(i / N)]}${(i % N) + 1}`;

function styles() {
  injectStyles('battleship', `
    .bs { text-align: center; }
    .bs-seas { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; align-items: start; }
    .bs-sea h3 { margin: 0 0 .15rem; font: 800 1.1rem var(--display); }
    .bs-sea.red h3 { color: #ff9a92; } .bs-sea.blue h3 { color: #9cc4ff; }
    .bs-sea.target { outline: 3px solid var(--gold); outline-offset: 6px; border-radius: 10px; }
    .bs-gridwrap { position: relative; width: min(100%, 54vh); margin: 0 auto; }
    .bs-grid { display: grid; grid-template-columns: 1.3em repeat(10, 1fr); grid-template-rows: 1.3em; gap: 2px; width: 100%;
      font: 700 clamp(.55rem, 1.6vh, .8rem) var(--body); }
    .bs-lab { display: grid; place-items: center; opacity: .7; }
    .bs-cell { aspect-ratio: 1; border-radius: 3px; background: #1d5a8a; display: grid; place-items: center; border: 0; padding: 0; color: #fff; font: inherit; }
    .bs-cell.ship { background: #8a9aa6; }
    .bs-cell.miss::after { content: ''; width: 30%; height: 30%; border-radius: 50%; background: rgba(255,255,255,.75); }
    .bs-cell.hit { background: #e0574e; } .bs-cell.hit::after { content: '✕'; font-weight: 900; }
    .bs-cell.sunk { background: #5a1410; }
    .bs-cell.pick { box-shadow: inset 0 0 0 3px var(--gold); background: #2b77b3; }
    button.bs-cell:not(:disabled) { cursor: pointer; }
    .bs-ships { position: absolute; left: calc(1.3em + 2px); top: calc(1.3em + 2px); right: 0; bottom: 0; pointer-events: none; }
    .bs-ship { position: absolute; object-fit: fill; padding: 1.2% .4%; box-sizing: border-box; filter: drop-shadow(0 2px 2px rgba(0,0,0,.5)); }
    .bs-ship.dim { filter: grayscale(.7) brightness(.55); }
    /* One big ocean painting sits under the whole 10×10 area; thin grid lines are drawn on top. */
    .art .bs-grid { position: relative; gap: 0; }
    .art .bs-grid::before { content: ''; position: absolute; left: 1.3em; top: 1.3em; right: 0; bottom: 0;
      background: url(games/battleship/art/ocean-square.webp) center / 100% 100% no-repeat; border-radius: 4px;
      box-shadow: 0 0 0 2px rgba(255,255,255,.25), 0 6px 18px rgba(0,0,0,.35); }
    .art .bs-cell { position: relative; background: transparent; border-radius: 0; box-shadow: inset -1px -1px 0 rgba(255,255,255,.16); }
    .art .bs-ships { left: 1.3em; top: 1.3em; }
    .art .bs-cell.ship { background: transparent; }
    /* Your own fleet stays covered so nobody can peek over your shoulder; press and hold to look. */
    .bs-mine.covered .bs-ships { visibility: hidden; }
    .bs-mine.covered .bs-cell.ship:not(.hit) { background: #1d5a8a; }
    .bs-mine.covered .art .bs-cell.ship:not(.hit) { background: transparent; }
    .bs-peek { touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .art .bs-cell.miss::after { content: ''; width: 90%; height: 90%; border-radius: 0; background: url(games/battleship/art/splash.webp) center / contain no-repeat; }
    .art .bs-cell.hit { background: rgba(224,87,78,.25); }
    .art .bs-cell.hit::after { content: ''; position: relative; z-index: 2; width: 110%; height: 110%; background: url(games/battleship/art/explosion.webp) center / contain no-repeat; }
    .art .bs-cell.sunk { background: rgba(0,0,0,.35); }
    .art .bs-ships { z-index: 1; }
    .art .bs-cell.pick { box-shadow: inset 0 0 0 3px var(--gold); }
    .bs-fleet { display: flex; flex-wrap: wrap; justify-content: center; gap: .25rem .6rem; margin-top: .35rem; font: 700 .85rem var(--body); }
    .bs-fleet .gone { text-decoration: line-through; opacity: .45; }
    .bs-msg { font: 700 clamp(1rem, 3vh, 1.3rem) var(--body); margin: .3rem 0; }
    .bs-msg .hit { color: #ff9a92; } .bs-msg .miss { color: #cfe3ff; }
    .bs-actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: .6rem; }
    .bs-big { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; pointer-events: none; background: rgba(0,0,0,.3);
      animation: bs-out 1.5s ease forwards; }
    .bs-big span { font: 900 min(22vh, 14vw)/1 var(--display); color: #fff; text-shadow: 0 .05em 0 rgba(0,0,0,.4); animation: bs-in .25s ease-out; text-align: center; }
    .bs-big.hit span { color: #ff5a4a; } .bs-big.miss span { color: #cfe3ff; } .bs-big.sunk span { color: var(--gold); font-size: min(14vh, 9vw); }
    @keyframes bs-in { from { transform: scale(1.8); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes bs-out { 0%, 70% { opacity: 1; } 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .bs-big, .bs-big span { animation: none; } }
    .bs-badge { display: inline-block; border-radius: 999px; padding: .2rem .7rem; font-weight: 800; color: #fff; }
    .bs-badge.red { background: #e0574e; } .bs-badge.blue { background: #4a8ad6; }
    .bs-phone .bs-grid { width: 100%; }
    .bs-phone h3 { margin: 1.1rem 0 .3rem; font: 800 1.1rem var(--display); }
    .bs-phone .bs-actions { margin-bottom: .4rem; }
    .bs-phone h2 { font: 800 1.4rem/1.2 var(--display); margin: .4rem 0; }
    .bs-teams { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left; }
    .bs-teams ul { list-style: none; padding: 0; margin: 0; font: 700 1.15rem var(--body); }
  `);
}

/** One 10×10 sea. fleet = ships to draw (own side or end of game). */
function gridHtml(s, team, { fleet = null, clickable = false, pick = -1 } = {}) {
  const shots = new Map((s.shots?.[team] || []).map((x) => [x.i, x.hit]));
  const sunk = new Set((s.sunk?.[team] || []).flatMap((x) => x.cells));
  const ships = new Set((fleet || []).flatMap((x) => x.cells));
  let html = '<span></span>' + Array.from({ length: N }, (_, c) => `<span class="bs-lab">${c + 1}</span>`).join('');
  for (let r = 0; r < N; r++) {
    html += `<span class="bs-lab">${'ABCDEFGHIJ'[r]}</span>`;
    for (let c = 0; c < N; c++) {
      const i = r * N + c;
      const cls = [ships.has(i) ? 'ship' : '', shots.has(i) ? (shots.get(i) ? 'hit' : 'miss') : '', sunk.has(i) ? 'sunk' : '', i === pick ? 'pick' : ''].join(' ');
      html += clickable
        ? `<button class="bs-cell ${cls}" data-i="${i}" ${shots.has(i) ? 'disabled' : ''} aria-label="${coord(i)}"></button>`
        : `<span class="bs-cell ${cls}"></span>`;
    }
  }
  const shipsHere = fleet || (s.sunk?.[team] || []);
  return `<div class="bs-gridwrap ${ART_READY ? 'art' : ''}"><div class="bs-grid">${html}</div>${shipsLayer(shipsHere, !fleet)}</div>`;
}

/** Your own fleet, covered until you press and hold "Peek". */
const mine = (s, team, fleet) => `<div class="bs-mine covered">${gridHtml(s, team, { fleet })}</div>
  <div class="bs-actions"><button type="button" class="btn btn-ghost bs-peek">Hold to peek at your ships</button></div>`;

function wirePeek(el) {
  el.querySelectorAll('.bs-peek').forEach((b) => {
    const box = b.parentElement.previousElementSibling;
    const show = (e) => { e.preventDefault(); box.classList.remove('covered'); };
    const hide = () => box.classList.add('covered');
    b.addEventListener('pointerdown', show);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((t) => b.addEventListener(t, hide));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

const fleetHtml = (s, team) => `<div class="bs-fleet">${FLEET.map((f) => `<span class="${(s.sunk?.[team] || []).some((x) => x.name === f.name) ? 'gone' : ''}">${f.name}</span>`).join('')}</div>`;

function lastHtml(s, players) {
  if (!s.last) return '';
  const who = esc(nameOf(s.last.by, players));
  if (s.last.sunk) return `<span class="hit">${who} fired at ${coord(s.last.i)} and sank ${label(other(s.last.team))}'s ${esc(s.last.sunk)}!</span>`;
  return s.last.hit ? `<span class="hit">${who} fired at ${coord(s.last.i)}. Hit!</span>` : `<span class="miss">${who} fired at ${coord(s.last.i)}. Miss.</span>`;
}

let seenShot = 0;
function bigMoment(s) {
  if (!s.last || s.last.at === seenShot) return;
  const first = !seenShot;
  seenShot = s.last.at;
  if (first && Date.now() - s.last.at > 3000) return;
  document.querySelector('.bs-big')?.remove();
  const o = document.createElement('div');
  const kind = s.last.sunk ? 'sunk' : s.last.hit ? 'hit' : 'miss';
  o.className = `bs-big ${kind}`;
  playShot(kind);
  if (s.phase === 'over') setTimeout(playWin, 2300);
  o.innerHTML = `<span>${s.last.sunk ? `Sunk the<br>${esc(s.last.sunk)}!` : s.last.hit ? 'HIT!' : 'Miss'}</span>`;
  // Show the big word when the shell lands, in time with the sound.
  setTimeout(() => { document.body.appendChild(o); setTimeout(() => o.remove(), 1500); }, 700);
}

export function renderBoard(el, { state: s, players, sendAction }) {
  styles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Launching the fleet…</p>'; return; }
  const names = (t) => s.teams[t].map((id) => `<li>${esc(nameOf(id, players))}</li>`).join('') || '<li class="muted">Nobody yet</li>';

  if (s.phase === 'setup') {
    el.innerHTML = `<div class="bs">
      <p class="bs-msg">${s.locked ? 'Teams are locked! Shuffle your ships until you like them, then tap Ready.'
        : 'Pick a team on your phone. When everyone is set, tap "Place our ships". Teams lock after that.'}</p>
      <div class="bs-teams">${['red', 'blue'].map((t) => `<div><h2 style="color:${t === 'red' ? '#ff9a92' : '#9cc4ff'}">${label(t)} fleet ${s.ready[t] ? '✓ Ready' : ''}</h2><ul>${names(t)}</ul></div>`).join('')}</div></div>`;
    return;
  }

  bigMoment(s);
  const over = s.phase === 'over';
  el.innerHTML = `<div class="bs">
    <p class="bs-msg">${over ? `<b>${label(s.winner)} fleet wins!</b>` : `<b>${esc(nameOf(s.current, players))}</b> (${label(s.turn)}) is aiming at ${label(other(s.turn))}'s waters…`}</p>
    <div class="bs-seas">${['red', 'blue'].map((t) => `<div class="bs-sea ${t} ${!over && other(s.turn) === t ? 'target' : ''}">
      <h3>${label(t)}'s waters</h3>${gridHtml(s, t, { fleet: over ? s.reveal?.[t] : null })}${fleetHtml(s, t)}</div>`).join('')}</div>
    <p class="bs-msg">${lastHtml(s, players)}</p>
    <div class="bs-actions">
      ${!over ? '<button class="btn btn-ghost" id="bs-pass">Let a teammate shoot</button>' : '<button class="btn btn-primary btn-big" id="bs-new">New battle</button>'}
    </div></div>`;
  el.querySelector('#bs-pass')?.addEventListener('click', () => sendAction('game:pass-turn'));
  el.querySelector('#bs-new')?.addEventListener('click', () => sendAction('game:new-game'));
}

let picked = -1;

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  styles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Launching the fleet…</p>'; return; }
  const team = priv.team || ['red', 'blue'].find((t) => s.teams[t].includes(me)) || '';
  const isVip = players[0]?.id === me;
  const badge = team ? `<span class="bs-badge ${team}">${label(team)} fleet</span>` : '';

  if (s.phase === 'setup') {
    setHtmlKeepingInputs(el, `<div class="bs bs-phone">
      <p>${badge}</p>
      ${s.locked ? '' : `<div class="bs-actions">
        <button class="btn btn-red" data-team="red" ${team === 'red' ? 'disabled' : ''}>Join Red</button>
        <button class="btn btn-blue" data-team="blue" ${team === 'blue' ? 'disabled' : ''}>Join Blue</button>
      </div>
      ${team ? `<div class="bs-actions"><button class="btn btn-primary btn-big" id="bs-lock">Place our ships</button></div>
        <p class="muted">Teams lock once anyone taps this.</p>` : ''}
      ${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}`}
      ${team && s.locked ? `<h2>Your fleet</h2>${mine(s, team, priv.fleet)}
        <div class="bs-actions"><button class="btn btn-ghost" id="bs-shuffle">Shuffle ships</button>
        <button class="btn btn-primary btn-big" id="bs-ready" ${s.ready[team] ? 'disabled' : ''}>${s.ready[team] ? 'Ready ✓' : "We're ready"}</button></div>
        <p class="muted">${s.ready[other(team)] ? `${label(other(team))} is ready.` : `Waiting on ${label(other(team))}…`}</p>` : ''}
    </div>`);
    el.querySelectorAll('[data-team]').forEach((b) => (b.onclick = () => sendAction('game:join-team', { team: b.dataset.team })));
    wirePeek(el);
    el.querySelector('#bs-lock')?.addEventListener('click', () => sendAction('game:lock'));
    el.querySelector('#bs-shuffle')?.addEventListener('click', () => sendAction('game:shuffle'));
    el.querySelector('#bs-ready')?.addEventListener('click', () => sendAction('game:ready'));
    return;
  }

  const over = s.phase === 'over';
  const myShot = !over && s.turn === team && s.current === me;
  if (!myShot) picked = -1;
  let headline;
  if (over) headline = s.winner === team ? 'Victory! 🎉' : `${label(s.winner)} fleet wins`;
  else if (myShot) headline = picked >= 0 ? `Fire at ${coord(picked)}?` : 'Your shot! Tap a square.';
  else if (s.turn === team) headline = `${esc(nameOf(s.current, players))} is aiming. Help them out!`;
  else headline = `${label(s.turn)} is aiming at you…`;

  setHtmlKeepingInputs(el, `<div class="bs bs-phone">
    <p>${badge}</p><h2>${headline}</h2>
    <p class="bs-msg">${lastHtml(s, players)}</p>
    ${team ? `<h3>${label(other(team))}'s waters</h3>${gridHtml(s, other(team), { clickable: myShot, pick: picked, fleet: over ? s.reveal?.[other(team)] : null })}${fleetHtml(s, other(team))}
      ${myShot ? `<div class="bs-actions"><button class="btn btn-primary btn-big" id="bs-fire" ${picked < 0 ? 'disabled' : ''}>Fire!</button></div>` : ''}
      <h3>Your fleet</h3>${mine(s, team, priv.fleet)}` : '<p class="muted">You joined late, so you\'re watching this battle.</p>'}
    ${over && isVip ? '<div class="bs-actions"><button class="btn btn-primary btn-big" id="bs-new">New battle</button></div>' : ''}
  </div>`);
  wirePeek(el);
  el.querySelectorAll('button.bs-cell:not(:disabled)').forEach((b) => (b.onclick = () => {
    picked = Number(b.dataset.i);
    renderPlayer(el, { state: s, priv, me, players, sendAction });
  }));
  el.querySelector('#bs-fire')?.addEventListener('click', () => {
    if (picked < 0) return;
    sendAction('game:fire', { index: picked });
    picked = -1;
  });
  el.querySelector('#bs-new')?.addEventListener('click', () => sendAction('game:new-game'));
}
