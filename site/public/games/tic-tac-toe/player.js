// What each phone shows while the game is running.
import { nameOf, esc, injectStyles } from './shared.js';

export function renderPlayer(el, { state, me, players, sendAction }) {
  injectStyles();
  const s = state;
  if (!s.cells) {
    el.innerHTML = '<p class="muted center">Loading…</p>';
    return;
  }

  const myMark = ['X', 'O'].find((m) => s.seats[m] === me);
  const myTurn = s.phase === 'playing' && myMark === s.turn;

  let status;
  if (s.phase === 'over') {
    if (s.winner === 'draw') status = "It's a draw!";
    else if (s.winner === myMark) status = 'You win! 🎉';
    else status = `${esc(nameOf(s.seats[s.winner], players))} wins`;
  } else if (!myMark) {
    status = 'Watching — look at the big screen';
  } else {
    status = myTurn ? `Your turn (${myMark})` : `Waiting for ${esc(nameOf(s.seats[s.turn], players))}…`;
  }

  el.innerHTML = `
    <div class="ttt-phone-status">${status}</div>
    ${myMark ? `
      <div class="ttt-grid ttt-phone-grid">
        ${s.cells.map((c, i) => `<button class="ttt-cell ${c} ${s.line.includes(i) ? 'win' : ''}" data-i="${i}" ${myTurn && !c ? '' : 'disabled'}>${c}</button>`).join('')}
      </div>` : ''}
    ${s.phase === 'over' && myMark ? '<p class="center"><button class="btn btn-primary btn-big" id="ttt-rematch">Play again</button></p>' : ''}`;

  el.querySelectorAll('button[data-i]').forEach((b) => {
    b.onclick = () => {
      el.querySelectorAll('button[data-i]').forEach((x) => (x.disabled = true)); // avoid double taps
      sendAction('game:move', { index: Number(b.dataset.i) });
    };
  });
  const rematch = el.querySelector('#ttt-rematch');
  if (rematch) rematch.onclick = () => sendAction('game:rematch');
}
