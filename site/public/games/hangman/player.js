// Phone view for Hangman: set the secret word, or pick letters on your turn.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { hangmanStyles, artHtml, wordHtml, usedHtml } from './shared.js';
import { lastLine } from './board.js';

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  hangmanStyles();
  if (!s.order || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Sharpening pencils…</p>'; return; }
  const isVip = players[0]?.id === me;
  const myScore = `<p class="hm-score">Your score: ${s.scores?.[me] || 0}</p>`;
  let body = '';

  if (s.phase === 'pick') {
    if (s.setter === me) {
      body = `<h2 class="hm-big">Pick a secret word</h2>
        <p class="muted">Don't let anyone see your screen!</p>
        <form id="hm-set">
          <input class="big-text-input" id="hm-word" maxlength="30" autocomplete="off" autocapitalize="off" placeholder="Word or short phrase" required>
          <input class="big-text-input" id="hm-cat" maxlength="24" autocomplete="off" placeholder="Hint (optional), like Food">
          <button class="btn btn-primary btn-big">Use this word</button>
        </form>
        ${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}`;
    } else body = `<h2 class="hm-big">${esc(nameOf(s.setter, players))} is picking a word…</h2>`;
  } else if (s.phase === 'guess') {
    const mine = s.current === me;
    const setter = s.setter === me;
    body = `${wordHtml(s)}${artHtml(s.misses, s.maxMisses)}
      <p class="hm-msg">${lastLine(s, players)}</p>
      ${setter ? '<h2 class="hm-big">It\'s your word. Sit back and watch!</h2>' : mine ? `
        <h2 class="hm-big">Your turn!</h2>
        <div class="hm-keys">${'abcdefghijklmnopqrstuvwxyz'.split('').map((l) => `<button data-l="${l}" ${s.guessed.includes(l) ? 'disabled' : ''}>${l}</button>`).join('')}</div>
        <form id="hm-solve"><input class="big-text-input" id="hm-guess" maxlength="30" autocomplete="off" placeholder="Know it? Type the whole thing">
          <button class="btn btn-ghost">Solve</button></form>`
        : `<h2 class="hm-big">${esc(nameOf(s.current, players))} is guessing…</h2>${usedHtml(s)}`}`;
  } else if (s.phase === 'result') {
    body = `${wordHtml(s)}<h2 class="hm-big">${s.solvedBy === me ? 'You solved it! 🎉' : s.solvedBy ? `${esc(nameOf(s.solvedBy, players))} solved it` : s.setter === me ? 'You stumped them! 🎉' : 'Stumped!'}</h2>
      `;
  } else if (s.phase === 'over') {
    const w = Array.isArray(s.winner) ? s.winner : [s.winner];
    body = `<h2 class="hm-big">${w.includes(me) ? (w.length > 1 ? 'You tied for first!' : 'You win! 🏆') : `${esc(nameOf(w[0], players))} wins`}</h2>
      ${isVip ? '<div class="hm-actions"><button class="btn btn-primary btn-big" id="hm-again">Play again</button></div>' : ''}`;
  }

  setHtmlKeepingInputs(el, `<div class="hm hm-phone">${myScore}${body}</div>`);

  const set = el.querySelector('#hm-set');
  if (set) set.onsubmit = (e) => { e.preventDefault(); sendAction('game:set-word', { text: el.querySelector('#hm-word').value, category: el.querySelector('#hm-cat').value }); };
  el.querySelectorAll('[data-l]:not([disabled])').forEach((b) => (b.onclick = () => sendAction('game:letter', { letter: b.dataset.l })));
  const solve = el.querySelector('#hm-solve');
  if (solve) solve.onsubmit = (e) => {
    e.preventDefault();
    const v = el.querySelector('#hm-guess').value.trim();
    if (v && confirm(`Solve with "${v}"? A wrong answer counts as a miss.`)) sendAction('game:solve', { text: v });
  };
  el.querySelector('#hm-next')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#hm-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
