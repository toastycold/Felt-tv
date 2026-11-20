// Phone view for Trolley Problem: choose, then predict the majority.
import { esc, scoreboard } from '../../js/ui.js';
import { trolleyStyles } from './board.js';

let draft = { round: 0, choice: '' };

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  trolleyStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const isVip = players[0]?.id === me;
  if (draft.round !== s.round) draft = { round: s.round, choice: '' };
  const mine = s.votes[me];

  if (s.phase === 'over') {
    el.innerHTML = `<div class="display-l center">Final scores</div>${scoreboard(players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 })))}
      ${isVip ? '<div class="row-center"><button class="btn btn-primary btn-big" id="tp-again">Play again</button></div>' : ''}`;
    el.querySelector('#tp-again')?.addEventListener('click', () => sendAction('game:play-again'));
    return;
  }

  if (s.phase === 'reveal') {
    const right = s.majority === 'tie' || mine?.predict === s.majority;
    el.innerHTML = `<div class="center">
      <div class="display-l">${mine ? (right ? 'You called it! +1' : 'Wrong guess') : 'You sat this one out'}</div>
      <p>Your score: <strong>${s.scores[me] || 0}</strong></p>
      ${isVip ? `<button class="btn btn-primary btn-big" id="tp-next">${s.round >= s.total ? 'Final scores' : 'Next trolley'}</button>` : '<p class="muted">Look at the TV.</p>'}
    </div>`;
    el.querySelector('#tp-next')?.addEventListener('click', () => sendAction('game:next'));
    return;
  }

  if (mine) {
    el.innerHTML = `<div class="center"><div class="display-l">Locked in</div>
      <p>You chose to <strong>${mine.choice === 'pull' ? 'pull the lever' : 'do nothing'}</strong> and guessed most people would <strong>${mine.predict === 'pull' ? 'pull it' : 'do nothing'}</strong>.</p>
      <p class="muted">Waiting for everyone else…</p></div>`;
    return;
  }

  const option = (key, label, sub, picked) => `<button class="choice-btn ${picked === key ? 'picked' : ''}" data-v="${key}">${label}<small>${esc(sub)}</small></button>`;
  if (!draft.choice) {
    el.innerHTML = `<div class="display-l">What do you do?</div>
      ${option('stay', 'Do nothing', `It hits: ${s.dilemma.stay}`)}
      ${option('pull', 'Pull the lever', `It hits: ${s.dilemma.pull}`)}`;
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { draft.choice = b.dataset.v; renderPlayer(el, { state: s, me, players, sendAction }); }));
  } else {
    el.innerHTML = `<div class="display-l">What will most people do?</div>
      <p class="muted">Guess right to score a point.</p>
      ${option('stay', 'Most will do nothing', s.dilemma.stay)}
      ${option('pull', 'Most will pull the lever', s.dilemma.pull)}
      <button class="btn btn-ghost" id="tp-back">Change my answer</button>`;
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => sendAction('game:vote', { choice: draft.choice, predict: b.dataset.v })));
    el.querySelector('#tp-back').onclick = () => { draft.choice = ''; renderPlayer(el, { state: s, me, players, sendAction }); };
  }
}
