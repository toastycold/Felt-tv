// TV view for Splendor: nobles, the three card rows, the gem bank and every player's tableau.
import { esc, nameOf } from '../../js/ui.js';
import { COLORS, GOLD } from './cards.js';
import { gem, cardHtml, deckHtml, nobleHtml, splendorStyles } from './shared.js';

export function playerPanel(s, id, players, { now = false } = {}) {
  const pl = s.players[id];
  return `<div class="sp-player ${now ? 'now' : ''}">
    <h4><span>${esc(nameOf(id, players))}</span><span>${pl.points} pts</span></h4>
    <div class="sp-line"><span class="label">Gems</span>${[...COLORS, GOLD].filter((c) => pl.tokens[c]).map((c) => gem(c, pl.tokens[c], 'sm')).join('') || '<span class="small muted">none</span>'}</div>
    <div class="sp-line"><span class="label">Cards</span>${COLORS.filter((c) => pl.bonus[c]).map((c) => gem(c, pl.bonus[c], 'sm bonus')).join('') || '<span class="small muted">none</span>'}</div>
    ${pl.reserved.length || pl.nobles.length ? `<div class="sp-line small muted">${pl.reserved.length ? `${pl.reserved.length} reserved` : ''}${pl.nobles.length ? ` · ${pl.nobles.length} noble${pl.nobles.length > 1 ? 's' : ''}` : ''}</div>` : ''}
  </div>`;
}

export function renderBoard(el, { state: s, players, sendAction }) {
  splendorStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const current = s.seats[s.turn];
  const watchers = players.filter((p) => !s.seats.includes(p.id));

  let banner = '';
  if (s.phase === 'over') {
    banner = `<div class="sp-banner">${esc(nameOf(s.winner, players))} wins with ${s.players[s.winner].points} points! <button class="btn btn-primary" id="sp-again" style="margin-left:1rem">Play again</button></div>`;
  } else {
    banner = `<div class="sp-banner">${esc(nameOf(current, players))}'s turn${s.phase === 'discard' ? ' (returning gems)' : ''}${s.finalRound ? ' · Final round!' : ''}</div>`;
  }

  el.innerHTML = `
    ${banner}
    <div class="sp-table">
      <div>
        <div class="sp-nobles">${s.nobles.map(nobleHtml).join('')}</div>
        ${[3, 2, 1].map((t) => `<div class="sp-row">${deckHtml(t, s.decks[t].length)}${s.market[t].map((c) => cardHtml(c)).join('')}</div>`).join('')}
      </div>
      <div>
        <div class="sp-bank">${[...COLORS, GOLD].map((c) => gem(c, s.bank[c])).join('')}</div>
        <div class="sp-players">${s.seats.map((id, i) => playerPanel(s, id, players, { now: i === s.turn && s.phase !== 'over' })).join('')}</div>
        <ul class="sp-log">${s.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        ${watchers.length ? `<p class="small muted">Watching: ${watchers.map((p) => esc(p.name)).join(', ')}</p>` : ''}
        ${s.phase !== 'over' ? '<button class="btn btn-ghost small" id="sp-skip">Skip this turn</button>' : ''}
      </div>
    </div>`;
  el.querySelector('#sp-again')?.addEventListener('click', () => sendAction('game:play-again'));
  el.querySelector('#sp-skip')?.addEventListener('click', () => {
    if (confirm(`Skip ${nameOf(current, players)}'s turn?`)) sendAction('game:skip');
  });
}
