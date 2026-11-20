// TV view for Codenames. Never shows the secret key until the game is over.
import { esc, nameOf } from '../../js/ui.js';
import { codenamesStyles } from './styles.js';

const label = (t) => (t === 'red' ? 'Red' : 'Blue');

export function renderBoard(el, { state: s, players, sendAction }) {
  codenamesStyles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Shuffling…</p>'; return; }

  if (s.phase === 'setup') {
    el.innerHTML = `
      <div class="cn">
        <p class="lede">Pick a team and a spymaster on your phones. Each team needs one spymaster and at least one guesser.</p>
        <div class="cn-teams">
          ${['red', 'blue'].map((t) => `
            <div class="cn-team ${t}">
              <h2>${label(t)} team</h2>
              <ul>${s.teams[t].map((id) => `<li>${esc(nameOf(id, players))}${s.spymasters[t] === id ? '<span class="cn-role">Spymaster</span>' : ''}</li>`).join('') || '<li>Nobody yet</li>'}</ul>
            </div>`).join('')}
        </div>
        ${s.error ? `<p class="cn-error">${esc(s.error)}</p>` : ''}
        <div class="cn-actions"><button class="btn btn-primary btn-big" id="cn-begin">Deal the cards</button></div>
      </div>`;
    el.querySelector('#cn-begin').onclick = () => sendAction('game:begin');
    return;
  }

  const left = (t) => s.left?.[t] ?? 0;
  const over = s.phase === 'over';
  let middle;
  if (over) middle = `<div class="cn-clue">${label(s.winner)} wins!</div><div class="who">${esc(s.reason)}</div>`;
  else if (s.phase === 'clue') middle = `<div class="who">${label(s.turn)}'s turn</div><div class="cn-clue">Waiting for ${esc(nameOf(s.spymasters[s.turn], players))}…</div>`;
  else middle = `<div class="who">${label(s.turn)} is guessing · ${s.clue.number === 0 ? 'unlimited' : `${s.guessesLeft} guess${s.guessesLeft === 1 ? '' : 'es'} left`}</div>
    <div class="cn-clue">${esc(s.clue.word)}<span class="n">${s.clue.number}</span></div>`;

  el.innerHTML = `
    <div class="cn">
      <div class="cn-head">
        <div class="cn-count red">${left('red')}<small>Red left</small></div>
        <div class="cn-turn">${middle}</div>
        <div class="cn-count blue">${left('blue')}<small>Blue left</small></div>
      </div>
      <div class="cn-grid">
        ${s.words.map((w, i) => {
          const show = s.revealed[i] || over;
          const cls = show ? `k-${s.keyShown[i]} ${s.revealed[i] ? 'done' : 'hidden-key'}` : '';
          return `<div class="cn-card ${cls}">${esc(w)}</div>`;
        }).join('')}
      </div>
      <div class="cn-actions">
        ${s.phase === 'guess' ? '<button class="btn btn-ghost" id="cn-end">End their turn</button>' : ''}
        ${over ? `<span class="muted">Wins: Red ${s.wins.red} · Blue ${s.wins.blue}</span><button class="btn btn-primary btn-big" id="cn-new">New game</button>` : ''}
      </div>
    </div>`;

  el.querySelector('#cn-end')?.addEventListener('click', () => sendAction('game:end-turn'));
  el.querySelector('#cn-new')?.addEventListener('click', () => sendAction('game:new-game'));
}
