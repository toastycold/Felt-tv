// What the TV shows while the game is running.
import { nameOf, esc, injectStyles } from './shared.js';

export function renderBoard(el, { state, players, sendAction }) {
  injectStyles();
  const s = state;
  if (!s.cells) {
    el.innerHTML = '<p class="muted">Loading…</p>';
    return;
  }

  let status;
  if (s.phase === 'over') {
    status = s.winner === 'draw' ? "It's a draw!" : `${esc(nameOf(s.seats[s.winner], players))} wins! 🎉`;
  } else {
    status = `${esc(nameOf(s.seats[s.turn], players))}'s turn (${s.turn})`;
  }

  el.innerHTML = `
    <div class="ttt-wrap">
      <div class="ttt-grid">
        ${s.cells.map((c, i) => `<div class="ttt-cell ${c} ${s.line.includes(i) ? 'win' : ''}">${c}</div>`).join('')}
      </div>
      <div class="ttt-side">
        <div class="ttt-status">${status}</div>
        ${['X', 'O'].map((m) => `
          <div class="ttt-seat ${s.phase === 'playing' && s.turn === m ? 'active' : ''}">
            <span><strong>${m}</strong> · ${esc(nameOf(s.seats[m], players))}</span><span>${s.scores[m]}</span>
          </div>`).join('')}
        <p class="muted">Round ${s.round} · Draws: ${s.scores.draw}</p>
        ${s.phase === 'over' ? '<button class="btn btn-primary btn-big" id="ttt-rematch">Play again</button>' : ''}
      </div>
    </div>`;

  const rematch = el.querySelector('#ttt-rematch');
  if (rematch) rematch.onclick = () => sendAction('game:rematch');
}
