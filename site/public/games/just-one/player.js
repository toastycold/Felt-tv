// Phone view for Just One.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { justOneStyles } from './styles.js';
import { rating } from './engine.js';

const REASON = { duplicate: 'match', word: 'too close', manual: 'removed' };

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  justOneStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const isGuesser = me === s.guesser;
  const isVip = players[0]?.id === me;
  const guesser = esc(nameOf(s.guesser, players));
  let html = '';

  if (s.phase === 'over') {
    html = `<div class="jo-big">${s.score} / ${s.total}</div><p>${rating(s.score)}</p>
      ${isVip ? '<div class="jo-row"><button class="btn btn-primary btn-big" id="jo-again">Play again</button></div>' : ''}`;
  } else if (s.phase === 'result') {
    const head = { correct: 'Got it!', wrong: 'Not quite', skip: 'Skipped' }[s.outcome];
    html = `<div class="jo-big jo-outcome ${s.outcome}">${head}</div>
      <div class="jo-word">${esc(s.word)}</div>
      ${isVip ? `<div class="jo-row"><button class="btn btn-primary btn-big" id="jo-next">${s.cardsLeft ? 'Next card' : 'See final score'}</button></div>` : ''}`;
  } else if (isGuesser) {
    if (s.phase === 'guess') {
      html = `<div class="jo-big">Your guess</div>
        <p class="muted">Read the clues on the TV.</p>
        <form class="jo-form" id="jo-guess">
          <input id="jo-guess-text" placeholder="The word is…" maxlength="40" autocomplete="off" required>
          <button class="btn btn-primary btn-big">Guess</button>
        </form>
        <button class="btn btn-ghost" id="jo-skip">Skip this one</button>`;
    } else {
      html = `<div class="jo-big">You're guessing</div>
        <p>Don't look at anyone's phone. The clues will show up on the TV.</p>
        <p class="muted">${s.phase === 'review' ? 'Clue-givers are checking for matches…' : 'Waiting for clues…'}</p>`;
    }
  } else if (s.phase === 'clues') {
    const mine = s.clues[me];
    const givers = players.filter((p) => p.id !== s.guesser);
    const waiting = givers.filter((p) => !s.clues[p.id]).length;
    html = `<p class="muted">The word for ${guesser} is</p>
      <div class="jo-word">${esc(priv.word)}</div>
      <form class="jo-form" id="jo-clue">
        <input id="jo-clue-text" placeholder="One-word clue" maxlength="24" autocomplete="off" required>
        <button class="btn btn-primary btn-big">${mine ? 'Change my clue' : 'Submit clue'}</button>
      </form>
      ${mine ? `<p>Your clue: <strong>${esc(mine)}</strong></p><p class="muted">Waiting on ${waiting} more…</p>` : '<p class="muted">Matching clues get thrown out, so be original.</p>'}
      ${isVip && Object.keys(s.clues).length && waiting ? '<button class="btn btn-ghost" id="jo-force">Stop waiting and check clues</button>' : ''}`;
  } else if (s.phase === 'review') {
    html = `<p class="muted">The word is <strong>${esc(priv.word)}</strong></p>
      <div class="jo-big">Check the clues</div>
      <p class="muted">Tap any clue that's too similar to another or to the word. Matches are already crossed out.</p>
      <ul class="jo-review">${Object.entries(s.clues).map(([id, c]) => `
        <li><button data-id="${id}" class="${s.removed[id] ? 'out' : ''}">
          <span>${esc(c)}</span><small>${s.removed[id] ? REASON[s.removed[id]] : esc(nameOf(id, players))}</small>
        </button></li>`).join('')}</ul>
      <button class="btn btn-primary btn-big" id="jo-show">Show clues to ${guesser}</button>`;
  } else if (s.phase === 'guess') {
    html = `<p class="muted">The word is</p><div class="jo-word">${esc(priv.word)}</div>
      <div class="jo-big">${guesser} is guessing…</div>`;
  }

  setHtmlKeepingInputs(el, `<div class="jo">
    <div class="jo-meta"><span>Card ${Math.min(s.round, s.total)} of ${s.total}</span><span>Score ${s.score}</span></div>
    ${html}</div>`);

  const clueForm = el.querySelector('#jo-clue');
  if (clueForm) clueForm.onsubmit = (e) => {
    e.preventDefault();
    const input = el.querySelector('#jo-clue-text');
    sendAction('game:clue', { text: input.value });
    input.value = '';
    input.blur();
  };
  const guessForm = el.querySelector('#jo-guess');
  if (guessForm) guessForm.onsubmit = (e) => {
    e.preventDefault();
    sendAction('game:guess', { text: el.querySelector('#jo-guess-text').value });
  };
  el.querySelectorAll('.jo-review button').forEach((b) => (b.onclick = () => sendAction('game:toggle-clue', { id: b.dataset.id })));
  el.querySelector('#jo-show')?.addEventListener('click', () => sendAction('game:show-clues'));
  el.querySelector('#jo-skip')?.addEventListener('click', () => sendAction('game:skip'));
  el.querySelector('#jo-force')?.addEventListener('click', () => sendAction('game:force-review'));
  el.querySelector('#jo-next')?.addEventListener('click', () => sendAction('game:next'));
  el.querySelector('#jo-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
