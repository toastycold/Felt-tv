// Phone view for Codenames. Spymasters see the key; guessers tap words.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { codenamesStyles } from './styles.js';

const label = (t) => (t === 'red' ? 'Red' : 'Blue');

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  codenamesStyles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Shuffling…</p>'; return; }

  const team = ['red', 'blue'].find((t) => s.teams[t].includes(me)) || '';
  const isSpy = team && s.spymasters[team] === me;
  const isVip = players[0]?.id === me;
  const badge = team ? `<span class="cn-badge ${team}">${label(team)} ${isSpy ? 'spymaster' : 'guesser'}</span>` : '';

  if (s.phase === 'setup') {
    setHtmlKeepingInputs(el, `
      <div class="cn cn-phone sheet">
        <div class="cn-phone-status"><h2>Pick your team</h2><p>${badge}</p></div>
        <div class="cn-actions">
          <button class="btn btn-red btn-big" data-team="red" ${team === 'red' ? 'disabled' : ''}>Join Red</button>
          <button class="btn btn-blue btn-big" data-team="blue" ${team === 'blue' ? 'disabled' : ''}>Join Blue</button>
        </div>
        ${team && !isSpy ? '<div class="cn-actions"><button class="btn btn-ghost" id="cn-spy">Be the spymaster</button></div>' : ''}
        ${s.error ? `<p class="cn-error">${esc(s.error)}</p>` : ''}
        ${isVip ? '<div class="cn-actions"><button class="btn btn-primary btn-big" id="cn-begin">Deal the cards</button></div>' : '<p class="center muted">The VIP or host starts the game.</p>'}
      </div>`);
    el.querySelectorAll('[data-team]').forEach((b) => (b.onclick = () => sendAction('game:join-team', { team: b.dataset.team })));
    el.querySelector('#cn-spy')?.addEventListener('click', () => sendAction('game:become-spymaster'));
    el.querySelector('#cn-begin')?.addEventListener('click', () => sendAction('game:begin'));
    return;
  }

  const over = s.phase === 'over';
  const myTurn = team === s.turn;
  const canGuess = s.phase === 'guess' && myTurn && !isSpy;
  const canClue = s.phase === 'clue' && myTurn && isSpy;

  let status;
  if (over) status = s.winner === team ? 'You win! 🎉' : `${label(s.winner)} wins`;
  else if (canClue) status = 'Give your team a clue';
  else if (canGuess) status = `${s.clue.word} · ${s.clue.number}`;
  else if (s.phase === 'clue') status = `Waiting for ${esc(nameOf(s.spymasters[s.turn], players))}'s clue`;
  else status = `${label(s.turn)} is guessing: ${esc(s.clue.word)} ${s.clue.number}`;

  const showKey = isSpy || over;
  setHtmlKeepingInputs(el, `
    <div class="cn cn-phone">
      <div class="cn-phone-status"><p>${badge}</p><h2>${status}</h2>
        ${canGuess ? `<p class="muted">${s.clue.number === 0 ? 'Guess as many as you like' : `${s.guessesLeft} guess${s.guessesLeft === 1 ? '' : 'es'} left`}</p>` : ''}
        ${over ? `<p class="muted">${esc(s.reason)}</p>` : ''}
      </div>
      ${canClue ? `
        <form class="cn-clue-form" id="cn-clue">
          <input id="cn-word" placeholder="One word" maxlength="24" autocomplete="off" autocapitalize="characters" required>
          <select id="cn-num">${Array.from({ length: 10 }, (_, n) => `<option ${n === 1 ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <button class="btn btn-primary btn-big">Give clue</button>
        </form>
        ${s.error ? `<p class="cn-error">${esc(s.error)}</p>` : ''}` : ''}
      <div class="cn-grid">
        ${s.words.map((w, i) => {
          const key = priv.key || s.keyShown;
          const color = key?.[i];
          const cls = color && (s.revealed[i] || showKey) ? `k-${color} ${s.revealed[i] ? 'done' : ''}` : '';
          const enabled = canGuess && !s.revealed[i];
          return `<button class="cn-card ${cls}" data-i="${i}" ${enabled ? '' : 'disabled'}>${esc(w)}</button>`;
        }).join('')}
      </div>
      <div class="cn-actions">
        ${canGuess ? '<button class="btn btn-ghost" id="cn-end">End our turn</button>' : ''}
        ${over && isVip ? '<button class="btn btn-primary btn-big" id="cn-new">New game</button>' : ''}
      </div>
    </div>`);

  el.querySelectorAll('button[data-i]:not([disabled])').forEach((b) => {
    b.onclick = () => {
      if (!confirm(`Pick ${b.textContent}?`)) return;
      sendAction('game:guess', { index: Number(b.dataset.i) });
    };
  });
  const form = el.querySelector('#cn-clue');
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    sendAction('game:clue', { word: el.querySelector('#cn-word').value, number: Number(el.querySelector('#cn-num').value) });
    el.querySelector('#cn-word').value = '';
  };
  el.querySelector('#cn-end')?.addEventListener('click', () => sendAction('game:end-turn'));
  el.querySelector('#cn-new')?.addEventListener('click', () => sendAction('game:new-game'));
}
