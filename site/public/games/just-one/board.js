// TV view for Just One. The guesser can see the TV, so the mystery word
// and the clues only appear once it's safe.
import { esc, nameOf } from '../../js/ui.js';
import { justOneStyles } from './styles.js';
import { rating } from './engine.js';

const REASON = { duplicate: 'matched another clue', word: 'too close to the word', manual: 'removed by the group' };

export function renderBoard(el, { state: s, players, sendAction }) {
  justOneStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const guesser = esc(nameOf(s.guesser, players));
  const meta = `<div class="jo-meta"><span>Card ${Math.min(s.round, s.total)} of ${s.total}</span><span>Score ${s.score}</span></div>`;

  if (s.phase === 'over') {
    el.innerHTML = `<div class="jo">
      <div class="jo-big">${s.score} / ${s.total}</div>
      <p class="lede">${rating(s.score)}</p>
      <ul class="jo-history">${s.history.map((h) => `<li><span>${esc(h.word)}</span><span class="jo-outcome ${h.outcome}">${h.outcome === 'correct' ? '✓' : h.outcome === 'skip' ? 'skipped' : `✗ ${esc(h.guess)}`}</span></li>`).join('')}</ul>
      <div class="jo-row"><button class="btn btn-primary btn-big" id="jo-again">Play again</button></div>
    </div>`;
    el.querySelector('#jo-again').onclick = () => sendAction('game:play-again');
    return;
  }

  let body = '';
  if (s.phase === 'clues') {
    const givers = players.filter((p) => p.id !== s.guesser);
    const any = Object.keys(s.clues).length > 0;
    body = `
      <div class="jo-big">${guesser} is guessing</div>
      <p class="lede">${guesser}, look away from the phones. Everyone else: write one clue word.</p>
      <div class="jo-givers">${givers.map((p) => `<span class="jo-giver ${s.clues[p.id] ? 'in' : ''}">${esc(p.name)}${s.clues[p.id] ? ' ✓' : ''}</span>`).join('')}</div>
      ${any ? '<div class="jo-row"><button class="btn btn-ghost" id="jo-force">Stop waiting and check clues</button></div>' : ''}`;
  } else if (s.phase === 'review') {
    body = `<div class="jo-big">Checking clues…</div>
      <p class="lede">Clue-givers are crossing out matches on their phones. ${guesser}, no peeking.</p>`;
  } else if (s.phase === 'guess') {
    const kept = Object.entries(s.clues).filter(([id]) => !s.removed[id]);
    const out = Object.keys(s.removed).length;
    body = `<div class="lede">${guesser}, what's the word?</div>
      <div class="jo-clues">${kept.map(([, c]) => `<div class="jo-clue">${esc(c)}</div>`).join('') || '<div class="jo-big">Every clue was removed!</div>'}</div>
      ${out ? `<p class="muted">${out} clue${out === 1 ? '' : 's'} removed</p>` : ''}`;
  } else if (s.phase === 'result') {
    const head = { correct: 'Got it!', wrong: 'Not quite', skip: 'Skipped' }[s.outcome];
    body = `<div class="jo-big jo-outcome ${s.outcome}">${head}</div>
      <div class="jo-word">${esc(s.word)}</div>
      ${s.outcome === 'wrong' ? `<p class="lede">${guesser} guessed “${esc(s.guess)}”. That costs the next card too.</p>` : ''}
      <div class="jo-clues">${Object.entries(s.clues).map(([id, c]) => `<div class="jo-clue ${s.removed[id] ? 'out' : ''}"><span class="t">${esc(c)}</span><small>${esc(nameOf(id, players))}${s.removed[id] ? ` · ${REASON[s.removed[id]]}` : ''}</small></div>`).join('')}</div>
      <div class="jo-row"><button class="btn btn-primary btn-big" id="jo-next">${s.cardsLeft ? 'Next card' : 'See final score'}</button></div>`;
  }

  el.innerHTML = `<div class="jo">${meta}${body}</div>`;
  el.querySelector('#jo-force')?.addEventListener('click', () => sendAction('game:force-review'));
  el.querySelector('#jo-next')?.addEventListener('click', () => sendAction('game:next'));
}
