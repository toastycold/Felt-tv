// Phone view for Quiplash.
import { esc, setHtmlKeepingInputs, countdown, scoreboard } from '../../js/ui.js';
import { quiplashStyles } from './board.js';

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  quiplashStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const isVip = players[0]?.id === me;
  let html = '';

  if (s.phase === 'answer') {
    const mine = s.prompts.map((p, i) => ({ ...p, i })).filter((p) => p.authors.includes(me));
    const next = mine.find((p) => !p.answers[me]);
    if (next) {
      const n = mine.indexOf(next) + 1;
      html = `<p class="muted">Prompt ${n} of ${mine.length}</p>
        <div class="display-l">${esc(next.text)}</div>
        <form id="ql-form" class="stack" data-index="${next.i}">
          <input id="ql-text-${next.i}" class="big-text-input" maxlength="80" autocomplete="off" placeholder="Your answer" required>
          <button class="btn btn-primary btn-big">Send</button>
        </form>`;
    } else {
      html = `<div class="display-l">All done!</div><p class="muted">Waiting for everyone else to finish.</p>`;
    }
  } else if (s.phase === 'vote') {
    const prompt = s.prompts[s.order[s.matchup]];
    if (prompt.authors.includes(me)) {
      html = `<div class="display-l">That's yours!</div><p class="muted">Sit back while everyone votes.</p>`;
    } else if (s.votes[me]) {
      html = `<div class="display-l">Vote counted</div><p class="muted">Watch the TV.</p>`;
    } else {
      html = `<p class="muted">Which is funnier?</p><div class="display-l">${esc(prompt.text)}</div>
        ${prompt.authors.map((a) => `<button class="choice-btn" data-vote="${a}">${prompt.answers[a] ? esc(prompt.answers[a]) : '<em>No answer</em>'}</button>`).join('')}`;
    }
  } else if (s.phase === 'matchup-result') {
    const pts = s.result?.points?.[me];
    html = pts !== undefined ? `<div class="display-l">+${pts}</div>${s.result.quiplash === me ? '<p>Quiplash! Everyone picked yours.</p>' : ''}` : '<div class="display-l">Look at the TV</div>';

  } else if (s.phase === 'scores' || s.phase === 'over') {
    html = `<div class="display-l">${s.phase === 'over' ? 'Final scores' : 'Scores'}</div>${scoreboard(players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 })))}`;
    if (isVip && s.phase === 'scores') html += `<button class="btn btn-primary btn-big" id="ql-next">${s.round === 1 ? 'Start round 2' : 'Start the final round'}</button>`;
    if (isVip && s.phase === 'over') html += '<button class="btn btn-primary btn-big" id="ql-again">Play again</button>';
  } else if (s.phase === 'final-answer') {
    html = s.final.answers[me]
      ? `<div class="display-l">Sent!</div><p class="muted">Your answer: ${esc(s.final.answers[me])}</p>`
      : `<p class="muted">Final round. Everyone answers this one.</p><div class="display-l">${esc(s.final.text)}</div>
        <form id="ql-final" class="stack">
          <input id="ql-final-text" class="big-text-input" maxlength="80" autocomplete="off" placeholder="Your answer" required>
          <button class="btn btn-primary btn-big">Send</button>
        </form>`;
  } else if (s.phase === 'final-vote') {
    const options = Object.entries(s.final.answers).filter(([id]) => id !== me);
    html = s.final.votes[me]
      ? '<div class="display-l">Vote counted</div>'
      : `<p class="muted">Pick your favorite (not your own)</p><div class="display-l">${esc(s.final.text)}</div>
        ${options.map(([id, t]) => `<button class="choice-btn" data-final="${id}">${esc(t)}</button>`).join('') || '<p>No other answers to vote for.</p>'}`;
  } else if (s.phase === 'final-result') {
    html = `<div class="display-l">+${(s.final.counts?.[me] || 0) * 300}</div><p class="muted">Look at the TV.</p>`;
    if (isVip) html += '<button class="btn btn-primary btn-big" id="ql-next">Final scores</button>';
  }

  setHtmlKeepingInputs(el, `<div class="ql"><div class="game-head"><span>${s.round >= 3 ? 'Final round' : `Round ${s.round}`}</span>${countdown(s.deadline)}</div>${html}</div>`);

  const form = el.querySelector('#ql-form');
  if (form) form.onsubmit = (e) => {
    e.preventDefault();
    const i = Number(form.dataset.index);
    sendAction('game:answer', { index: i, text: el.querySelector(`#ql-text-${i}`).value });
    form.querySelector('button').disabled = true;
  };
  const finalForm = el.querySelector('#ql-final');
  if (finalForm) finalForm.onsubmit = (e) => {
    e.preventDefault();
    sendAction('game:final-answer', { text: el.querySelector('#ql-final-text').value });
    finalForm.querySelector('button').disabled = true;
  };
  el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => { sendAction('game:vote', { choice: b.dataset.vote }); el.querySelectorAll('[data-vote]').forEach((x) => (x.disabled = true)); b.classList.add('picked'); }));
  el.querySelectorAll('[data-final]').forEach((b) => (b.onclick = () => { sendAction('game:final-vote', { choice: b.dataset.final }); el.querySelectorAll('[data-final]').forEach((x) => (x.disabled = true)); b.classList.add('picked'); }));
  el.querySelector('#ql-next')?.addEventListener('click', () => sendAction('game:next'));
  el.querySelector('#ql-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
