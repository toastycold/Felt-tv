// Phone view for Scrabble: your rack and a board you can place tiles on.
import { esc, nameOf } from '../../js/ui.js';
import { boardHtml, tileHtml, scrabbleStyles } from './shared.js';

// Local move-in-progress. Reset whenever the turn or rack changes.
let ui = { key: '', selected: null, placed: [], swapping: false, swap: [], zoom: false };

export function renderPlayer(el, ctx) {
  const { state: s, priv = {}, me, players, sendAction } = ctx;
  scrabbleStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const rerender = () => renderPlayer(el, ctx);
  const rack = priv.rack || [];
  const seated = s.seats.includes(me);
  const myTurn = s.phase === 'play' && s.seats[s.turn] === me;
  const isVip = players[0]?.id === me;

  const key = `${s.turn}|${s.log.length}|${s.log[0] || ''}|${rack.join('')}`;
  if (ui.key !== key) ui = { ...ui, key, selected: null, placed: [], swapping: false, swap: [] };
  if (!myTurn) { ui.placed = []; ui.selected = null; ui.swapping = false; }

  const usedRack = ui.placed.map((t) => t.rack);
  const pending = Object.fromEntries(ui.placed.map((t) => [t.pos, { l: t.letter || rack[t.rack], blank: rack[t.rack] === '?' }]));

  let status;
  if (!seated) status = 'Watching';
  else if (s.phase === 'over') status = s.winner === me ? 'You win! 🎉' : `${esc(nameOf(s.winner, players))} wins`;
  else if (myTurn) status = ui.swapping ? 'Tap tiles to exchange' : 'Your turn';
  else status = `${esc(nameOf(s.seats[s.turn], players))}'s turn`;

  el.innerHTML = `
    <div class="game-head"><span>You: ${s.scores[me] ?? 0}</span><span>${s.bagCount} in bag</span></div>
    <div class="display-l center" style="margin:.25rem 0 .5rem">${status}</div>
    ${s.error?.to === me ? `<div class="sc-err">${esc(s.error.text)}</div>` : ''}
    <div class="sc-phone-board ${ui.zoom ? 'zoom' : ''}">${boardHtml(s.board, { pending, recent: s.lastMove?.positions || [], tappable: myTurn && !ui.swapping })}</div>
    ${seated ? `<div class="sc-rack">${rack.map((l, i) => tileHtml(l, `data-rack="${i}"`,
      [usedRack.includes(i) ? 'used' : '', ui.selected === i ? 'sel' : '', ui.swap.includes(i) ? 'swap' : ''].join(' '))).join('')}</div>` : ''}
    <div class="sc-tools">
      ${myTurn && !ui.swapping ? `
        <button class="btn btn-primary" id="sc-play" ${ui.placed.length ? '' : 'disabled'}>Play word</button>
        <button class="btn btn-ghost" id="sc-recall" ${ui.placed.length ? '' : 'disabled'}>Take back</button>
        <button class="btn btn-ghost" id="sc-shuffle">Shuffle</button>
        <button class="btn btn-ghost" id="sc-swap">Exchange</button>
        <button class="btn btn-ghost" id="sc-pass">Pass</button>` : ''}
      ${myTurn && ui.swapping ? `
        <button class="btn btn-primary" id="sc-swap-go" ${ui.swap.length ? '' : 'disabled'}>Exchange ${ui.swap.length}</button>
        <button class="btn btn-ghost" id="sc-swap-cancel">Cancel</button>` : ''}
      <button class="btn btn-ghost" id="sc-zoom">${ui.zoom ? 'Fit board' : 'Zoom board'}</button>
      ${s.phase === 'over' && isVip ? '<button class="btn btn-primary" id="sc-again">Play again</button>' : ''}
    </div>
    ${myTurn && !ui.swapping ? '<p class="small muted center" style="margin-top:.5rem">Tap a tile, then tap a square. Tap a placed tile to take it back.</p>' : ''}`;

  // Rack taps
  el.querySelectorAll('[data-rack]').forEach((b) => (b.onclick = () => {
    const i = Number(b.dataset.rack);
    if (!myTurn) return;
    if (ui.swapping) ui.swap = ui.swap.includes(i) ? ui.swap.filter((x) => x !== i) : [...ui.swap, i];
    else ui.selected = ui.selected === i ? null : i;
    rerender();
  }));
  // Board taps: place the selected tile, or pick a pending tile back up
  el.querySelectorAll('[data-pos]').forEach((b) => (b.onclick = () => {
    const pos = Number(b.dataset.pos);
    const existing = ui.placed.find((t) => t.pos === pos);
    if (existing) { ui.placed = ui.placed.filter((t) => t !== existing); rerender(); return; }
    if (ui.selected === null || s.board[pos]) return;
    let letter = '';
    if (rack[ui.selected] === '?') {
      letter = (prompt('Which letter should the blank tile be?') || '').trim().toUpperCase().slice(0, 1);
      if (!/^[A-Z]$/.test(letter)) return;
    }
    ui.placed.push({ rack: ui.selected, pos, letter });
    ui.selected = null;
    rerender();
  }));
  el.querySelector('#sc-play')?.addEventListener('click', () =>
    sendAction('game:play', { tiles: ui.placed.map((t) => ({ rack: t.rack, pos: t.pos, letter: t.letter })) }));
  el.querySelector('#sc-recall')?.addEventListener('click', () => { ui.placed = []; rerender(); });
  el.querySelector('#sc-shuffle')?.addEventListener('click', () => {
    // Shuffles how the rack looks on this phone only.
    const tiles = [...el.querySelectorAll('.sc-rack .sc-tile')];
    tiles.sort(() => Math.random() - 0.5).forEach((t) => t.parentElement.appendChild(t));
  });
  el.querySelector('#sc-swap')?.addEventListener('click', () => { ui.swapping = true; ui.placed = []; ui.swap = []; rerender(); });
  el.querySelector('#sc-swap-cancel')?.addEventListener('click', () => { ui.swapping = false; rerender(); });
  el.querySelector('#sc-swap-go')?.addEventListener('click', () => sendAction('game:exchange', { indices: ui.swap }));
  el.querySelector('#sc-pass')?.addEventListener('click', () => { if (confirm('Pass your turn?')) sendAction('game:pass'); });
  el.querySelector('#sc-zoom')?.addEventListener('click', () => { ui.zoom = !ui.zoom; rerender(); });
  el.querySelector('#sc-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
