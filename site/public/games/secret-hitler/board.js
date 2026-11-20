// TV view for Secret Hitler. Never shows anyone's role until the game is over.
import { esc, nameOf } from '../../js/ui.js';
import { shStyles, tracksHtml, peopleHtml, ballotsHtml, lastVoteHtml, POWER_TEXT } from './shared.js';

export function renderBoard(el, { state: s, players, sendAction }) {
  shStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  let headline = '', sub = '', buttons = '';

  switch (s.phase) {
    case 'roles':
      headline = 'Check your secret role';
      sub = `Look at your phone without letting anyone see. ${s.ready.length} of ${s.seats.length} ready.`;
      buttons = '<button class="btn btn-ghost" id="sh-start">Start now</button>';
      break;
    case 'nominate':
      headline = `${n(s.president)} is President`;
      sub = 'The President is choosing a Chancellor.';
      break;
    case 'vote':
      headline = `Vote: ${n(s.president)} and ${n(s.chancellor)}?`;
      sub = `Vote Ja or Nein on your phone. ${s.voted.length} of ${s.seats.length - s.dead.length} voted.`;
      break;
    case 'vote-result':
      headline = s.voteResult === 'passed' ? 'The government is elected!' : 'The vote failed';
      sub = `${n(s.president)} as President, ${n(s.chancellor)} as Chancellor.`;
      buttons = '<button class="btn btn-primary" id="sh-continue">Continue</button>';
      break;
    case 'president':
      headline = 'Legislative session';
      sub = `${n(s.president)} is discarding one of three policies…`;
      break;
    case 'chancellor':
      headline = 'Legislative session';
      sub = `${n(s.chancellor)} is choosing which policy to pass…`;
      break;
    case 'veto':
      headline = 'Veto requested';
      sub = `${n(s.chancellor)} wants to veto. ${n(s.president)} must agree or refuse.`;
      break;
    case 'power':
      headline = 'Presidential power';
      sub = `${POWER_TEXT[s.power]}. ${n(s.president)} is deciding…`;
      break;
    case 'over':
      headline = s.winner === 'liberal' ? 'Liberals win!' : 'Fascists win!';
      sub = esc(s.winReason);
      buttons = '<button class="btn btn-primary btn-big" id="sh-again">Play again</button>';
      break;
  }

  el.innerHTML = `
    <div class="sh-layout">
      <div>${tracksHtml(s)}</div>
      <div>
        <div class="display-l">${headline}</div>
        <p class="lede" style="margin-left:0">${sub}</p>
        ${s.phase === 'vote' || s.phase === 'vote-result' ? ballotsHtml(s, players) : peopleHtml(s, players)}
        <div class="row-center">${buttons}</div>
        ${s.phase !== 'vote' && s.phase !== 'vote-result' ? lastVoteHtml(s, players) : ''}
        <ul class="sk-log" style="list-style:none;padding:0;opacity:.8">${s.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      </div>
    </div>`;
  el.querySelector('#sh-start')?.addEventListener('click', () => sendAction('game:start-now'));
  el.querySelector('#sh-continue')?.addEventListener('click', () => sendAction('game:continue'));
  el.querySelector('#sh-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
