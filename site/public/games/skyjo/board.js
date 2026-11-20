// TV view for Skyjo.
import { esc, nameOf } from '../../js/ui.js';
import { cardHtml, gridHtml, gridSum, skyjoStyles, totalsTable } from './shared.js';

export function renderBoard(el, { state: s, players, sendAction }) {
  skyjoStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const current = s.seats[s.turn];

  let status;
  if (s.phase === 'setup') status = 'Everyone: flip two of your cards on your phone.';
  else if (s.phase === 'play') status = `${esc(nameOf(current, players))}'s turn${s.closer ? ' · last turns!' : ''}`;
  else if (s.phase === 'round-over') status = `Round ${s.round} is over`;
  else status = `Game over! ${esc(nameOf([...s.seats].sort((a, b) => s.totals[a] - s.totals[b])[0], players))} wins with the lowest score.`;

  const end = s.phase === 'round-over' || s.phase === 'over';
  el.innerHTML = `
    <div class="game-head"><span>Round ${s.round}</span><span></span></div>
    <div class="display-l center">${status}</div>
    ${end ? totalsTable(s, players, nameOf) : `
      <div class="sk-center">
        <div class="sk-pile">${cardHtml(null)}${s.deckCount} in deck</div>
        <div class="sk-pile">${s.discard.length ? cardHtml(s.discard[s.discard.length - 1]) : '<div class="sk-card sk-gone"></div>'}Discard</div>
        ${s.drawn !== null ? `<div class="sk-pile">${cardHtml(s.drawn, { cls: 'sk-hand' })}In hand</div>` : ''}
      </div>`}
    <div class="sk-table">
      ${s.seats.map((id) => `<div class="sk-seat ${s.phase === 'play' && id === current ? 'now' : ''}">
        <h4><span>${esc(nameOf(id, players))}</span><span>${end ? s.roundScores[id] : `showing ${gridSum(s.grids[id])}`}</span></h4>
        ${gridHtml(s.grids[id], { small: true })}
      </div>`).join('')}
    </div>
    <ul class="sk-log">${s.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <div class="row-center" style="margin-top:1rem">
      ${s.phase === 'round-over' ? '<button class="btn btn-primary btn-big" id="sk-next">Deal the next round</button>' : ''}
      ${s.phase === 'over' ? '<button class="btn btn-primary btn-big" id="sk-again">Play again</button>' : ''}
      ${s.phase === 'play' ? '<button class="btn btn-ghost" id="sk-skip">Skip this turn</button>' : ''}
    </div>`;
  el.querySelector('#sk-next')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#sk-again')?.addEventListener('click', () => sendAction('game:play-again'));
  el.querySelector('#sk-skip')?.addEventListener('click', () => { if (confirm(`Skip ${nameOf(current, players)}'s turn?`)) sendAction('game:skip'); });
}
