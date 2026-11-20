// TV view for Hangman. Never shows the word until the round ends.
import { esc, nameOf, scoreboard } from '../../js/ui.js';
import { hangmanStyles, artHtml, wordHtml, usedHtml } from './shared.js';

export function lastLine(s, players) {
  if (!s.last) return '';
  const who = esc(nameOf(s.last.by, players));
  if (s.last.solve) return s.last.hit ? `<span class="hit">${who} solved it!</span>` : `<span class="miss">${who} guessed "${esc(s.last.text)}". Nope!</span>`;
  if (s.last.hit) return `<span class="hit">${who} found ${s.last.count} ${esc(s.last.text)}${s.last.count > 1 ? "'s" : ''}!</span>`;
  return `<span class="miss">No ${esc(s.last.text)}. That's a miss!</span>`;
}

export function renderBoard(el, { state: s, players, sendAction }) {
  hangmanStyles();
  if (!s.order || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Sharpening pencils…</p>'; return; }
  const rows = players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 }));
  const setter = esc(nameOf(s.setter, players));

  if (s.phase === 'pick') {
    el.innerHTML = `<div class="hm">
      <p class="hm-cat">Round ${s.round} of ${s.rounds}</p>
      <p class="hm-big">${setter} is picking a secret word…</p>
      <p class="muted">Everyone else, no peeking at their phone!</p>
      ${scoreboard(rows)}</div>`;
    return;
  }

  if (s.phase === 'over') {
    const w = Array.isArray(s.winner) ? s.winner : [s.winner];
    el.innerHTML = `<div class="hm">
      <p class="hm-big">${w.length > 1 ? "It's a tie!" : `${esc(nameOf(w[0], players))} wins!`}</p>
      ${scoreboard(rows)}
      <div class="hm-actions"><button class="btn btn-primary btn-big" id="hm-again">Play again</button></div></div>`;
    el.querySelector('#hm-again').onclick = () => sendAction('game:play-again');
    return;
  }

  let status;
  if (s.phase === 'guess') status = `<p class="hm-msg">${lastLine(s, players)}</p>
    <p class="hm-msg"><b>${esc(nameOf(s.current, players))}</b>, pick a letter or solve it.</p>`;
  else status = `<p class="hm-msg">${lastLine(s, players)}</p>
    <p class="hm-big">${s.solvedBy ? `${esc(nameOf(s.solvedBy, players))} got it!` : `${setter} stumped everyone!`}</p>`;

  el.innerHTML = `<div class="hm">
    <p class="hm-cat">Round ${s.round} of ${s.rounds} · ${setter}'s word${s.category ? ` · Hint: <b>${esc(s.category)}</b>` : ''}</p>
    <div class="hm-top">${artHtml(s.misses, s.maxMisses)}<div>${wordHtml(s, true)}${usedHtml(s)}
      <p class="hm-score">${s.maxMisses - s.misses} miss${s.maxMisses - s.misses === 1 ? '' : 'es'} left</p></div></div>
    ${status}
    <div class="hm-actions">
      ${s.phase === 'guess' ? '<button class="btn btn-ghost" id="hm-skip">Skip their turn</button>' : ''}
      ${s.phase === 'result' ? `<button class="btn btn-primary btn-big" id="hm-next">${s.round >= s.rounds ? 'Final scores' : 'Next round'}</button>` : ''}
    </div>
    ${s.phase === 'result' ? scoreboard(rows) : ''}
  </div>`;
  el.querySelector('#hm-skip')?.addEventListener('click', () => sendAction('game:skip-turn'));
  el.querySelector('#hm-next')?.addEventListener('click', () => sendAction('game:next-round'));
}
