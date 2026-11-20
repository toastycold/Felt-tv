// TV view for Scrabble.
import { esc, nameOf } from '../../js/ui.js';
import { boardHtml, scrabbleStyles } from './shared.js';

export function renderBoard(el, { state: s, players, sendAction }) {
  scrabbleStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const current = s.seats[s.turn];
  const last = s.lastMove;

  el.innerHTML = `<div class="sc-layout">
    ${boardHtml(s.board, { recent: last?.positions || [] })}
    <div>
      <div class="display-l">${s.phase === 'over' ? `${esc(nameOf(s.winner, players))} wins!` : `${esc(nameOf(current, players))}'s turn`}</div>
      ${s.seats.map((id) => `<div class="sc-score ${s.phase === 'play' && id === current ? 'now' : ''}">
        <span>${esc(nameOf(id, players))}</span>
        <span>${s.scores[id]}${s.phase === 'over' && s.finalAdjust[id] ? ` <small class="muted">(${s.finalAdjust[id] > 0 ? '+' : ''}${s.finalAdjust[id]})</small>` : ''}</span></div>`).join('')}
      <p class="muted">${s.bagCount} tiles left in the bag</p>
      ${last ? `<p>Last play: <strong>${last.words.map((w) => esc(w.word)).join(', ')}</strong> for ${last.score}${last.bingo ? ' · Bingo! +50' : ''}</p>` : ''}
      <ul style="list-style:none;padding:0;opacity:.8">${s.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="row-center" style="justify-content:flex-start">
        ${s.phase === 'over' ? '<button class="btn btn-primary btn-big" id="sc-again">Play again</button>' : '<button class="btn btn-ghost" id="sc-skip">Skip this turn</button>'}
      </div>
    </div>
  </div>`;
  el.querySelector('#sc-again')?.addEventListener('click', () => sendAction('game:play-again'));
  el.querySelector('#sc-skip')?.addEventListener('click', () => { if (confirm(`Skip ${nameOf(current, players)}'s turn?`)) sendAction('game:skip'); });
}
