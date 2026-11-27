// Phone view for Skyjo: your grid plus the draw/swap controls.
import { esc, nameOf } from '../../js/ui.js';
import { cardHtml, gridHtml, gridSum, skyjoStyles, totalsTable } from './shared.js';

let tossing = false; // after drawing from the deck: "toss it and flip one" mode

export function renderPlayer(el, ctx) {
  const { state: s, me, players, sendAction } = ctx;
  skyjoStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const grid = s.grids[me];
  const isVip = players[0]?.id === me;
  if (!grid) { el.innerHTML = '<p class="center">You joined mid-game. You can play from the next game.</p>'; return; }

  const myTurn = s.phase === 'play' && s.seats[s.turn] === me;
  if (!myTurn || s.step !== 'deck') tossing = false;
  let status = '', controls = '', tappable = () => false, action = null;

  if (s.phase === 'setup') {
    const flipped = grid.filter((c) => c.v !== null).length;
    status = flipped < 2 ? `Flip ${2 - flipped} card${flipped === 1 ? '' : 's'}` : 'Waiting for the others…';
    if (flipped < 2) { tappable = (c) => c.v === null; action = 'game:flip'; }
  } else if (s.phase === 'play' && !myTurn) {
    status = `${esc(nameOf(s.seats[s.turn], players))}'s turn${s.closer ? ' · last turns!' : ''}`;
  } else if (myTurn && s.step === 'choose') {
    status = s.closer ? 'Your last turn!' : 'Your turn';
    const top = s.discard[s.discard.length - 1];
    controls = `<div class="sk-center">
      <button class="btn btn-primary btn-big" id="sk-deck">Draw from deck</button>
      ${top !== undefined ? `<button class="btn btn-ghost btn-big" id="sk-discard">Take the ${top}</button>` : ''}
    </div>`;
  } else if (myTurn && (s.step === 'deck' || s.step === 'discard')) {
    status = tossing ? 'Tap a face-down card to flip it' : 'Tap a card to swap it out';
    controls = `<div class="sk-center">${cardHtml(s.drawn, { cls: 'sk-hand' })}
      ${s.step === 'deck' ? `<button class="btn btn-ghost" id="sk-toss">${tossing ? 'Swap instead' : 'Toss it and flip one'}</button>` : ''}
    </div>`;
    if (tossing) { tappable = (c) => c.v === null; action = 'game:toss-and-flip'; }
    else { tappable = () => true; action = 'game:swap'; }
  } else if (s.phase === 'round-over' || s.phase === 'over') {
    status = s.phase === 'over' ? 'Game over' : `Round ${s.round} done`;
    controls = totalsTable(s, players, nameOf)
      + (isVip ? `<div class="row-center"><button class="btn btn-primary btn-big" id="${s.phase === 'over' ? 'sk-again' : 'sk-next'}">${s.phase === 'over' ? 'Play again' : 'Deal the next round'}</button></div>` : '');
  }

  el.innerHTML = `
    <div class="game-head"><span>Round ${s.round} · total ${s.totals[me]}</span><span>showing ${gridSum(grid)}</span></div>
    <div class="display-l sk-status">${status}</div>
    ${controls}
    ${gridHtml(grid, { tappable })}`;

  el.querySelectorAll('button[data-i]').forEach((b) => (b.onclick = () => {
    el.querySelectorAll('button[data-i]').forEach((x) => (x.disabled = true));
    sendAction(action, { index: Number(b.dataset.i) });
  }));
  el.querySelector('#sk-deck')?.addEventListener('click', () => sendAction('game:draw-deck'));
  el.querySelector('#sk-discard')?.addEventListener('click', () => sendAction('game:take-discard'));
  el.querySelector('#sk-toss')?.addEventListener('click', () => { tossing = !tossing; renderPlayer(el, ctx); });
  el.querySelector('#sk-next')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#sk-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
