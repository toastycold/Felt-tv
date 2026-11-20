// TV view for Quiplash.
import { esc, nameOf, injectStyles, countdown, scoreboard } from '../../js/ui.js';

export function quiplashStyles() {
  injectStyles('quiplash', `
    .ql { text-align: center; }
    .ql-prompt { font: 800 clamp(1.8rem, 4.2vw, 3.2rem)/1.12 var(--display); max-width: 22ch; margin: .5rem auto 1.5rem; }
    .ql-vs { display: grid; grid-template-columns: 1fr auto 1fr; gap: 1.25rem; align-items: stretch; max-width: 1000px; margin: 0 auto 1.25rem; }
    .ql-vs .vs { align-self: center; font: 800 1.6rem var(--display); color: var(--gold); }
    .ql-answer {
      background: var(--card); color: var(--ink); border-radius: 18px; padding: 1.4rem 1.25rem; box-shadow: 0 6px 0 var(--card-edge);
      font: 700 clamp(1.25rem, 2.6vw, 2rem)/1.2 var(--body); display: flex; flex-direction: column; justify-content: center; gap: .6rem; min-height: 9rem;
    }
    .ql-answer.blank { color: var(--ink-soft); font-style: italic; }
    .ql-answer.win { background: var(--gold); box-shadow: 0 6px 0 var(--gold-edge); }
    .ql-answer .by { font: 700 1rem var(--body); color: var(--ink-soft); }
    .ql-answer .pts { font: 800 1.6rem var(--display); }
    .ql-banner { display: inline-block; background: var(--red); color: #fff; padding: .4rem 1.2rem; border-radius: 99px; font: 800 1.4rem var(--display); transform: rotate(-3deg); margin-bottom: 1rem; }
    .ql-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; max-width: 1100px; margin: 0 auto 1.25rem; }
    .ql-grid .ql-answer { min-height: 6rem; }
    .ql-chips { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1rem 0; }
    .ql-chips span { padding: .35rem .85rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .ql-chips span.in { background: var(--gold); color: var(--ink); }
    @media (max-width: 700px) { .ql-vs { grid-template-columns: 1fr; } }
  `);
}

const answerText = (t) => (t ? esc(t) : 'No answer');

export function renderBoard(el, { state: s, players, sendAction }) {
  quiplashStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const name = (id) => esc(nameOf(id, players));
  const rows = () => players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 }));
  const roundLabel = s.round >= 3 ? 'Final round' : `Round ${s.round}`;
  const head = `<div class="game-head"><span>${roundLabel}</span>${countdown(s.deadline)}</div>`;
  let body = '';

  if (s.phase === 'answer') {
    const done = (id) => s.prompts.filter((p) => p.authors.includes(id)).every((p) => p.answers[id]);
    body = `<div class="display-xl">Answer your prompts</div>
      <p class="lede">Check your phone. You've each got two. Funny beats clever.</p>
      <div class="ql-chips">${players.map((p) => `<span class="${done(p.id) ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      <button class="btn btn-ghost" id="ql-skip">Stop waiting</button>`;
  } else if (s.phase === 'vote' || s.phase === 'matchup-result') {
    const prompt = s.prompts[s.order[s.matchup]];
    const r = s.phase === 'matchup-result' ? s.result : null;
    const card = (a) => {
      const win = r && r.counts[a] > r.counts[prompt.authors.find((x) => x !== a)];
      return `<div class="ql-answer ${prompt.answers[a] ? '' : 'blank'} ${win ? 'win' : ''}">
        <div>${answerText(prompt.answers[a])}</div>
        ${r ? `<div class="by">${name(a)} · ${r.counts[a]} vote${r.counts[a] === 1 ? '' : 's'}</div><div class="pts">+${r.points[a]}</div>` : ''}
      </div>`;
    };
    body = `${r?.quiplash ? `<div class="ql-banner">Quiplash! ${name(r.quiplash)} got every vote</div>` : ''}
      <div class="muted">Matchup ${s.matchup + 1} of ${s.order.length}</div>
      <div class="ql-prompt">${esc(prompt.text)}</div>
      <div class="ql-vs">${card(prompt.authors[0])}<div class="vs">vs</div>${card(prompt.authors[1])}</div>
      ${r ? '<button class="btn btn-primary" id="ql-next">Next matchup</button>' : '<p class="lede">Vote on your phone!</p>'}`;
  } else if (s.phase === 'scores') {
    body = `<div class="display-xl">Scores after ${roundLabel.toLowerCase()}</div>${scoreboard(rows())}
      <p class="muted">${s.round === 1 ? 'Round 2 points are doubled.' : 'Next: the final round. Everyone answers the same prompt.'}</p>
      <button class="btn btn-primary btn-big" id="ql-next">${s.round === 1 ? 'Start round 2' : 'Start the final round'}</button>`;
  } else if (s.phase === 'final-answer') {
    body = `<div class="ql-prompt">${esc(s.final.text)}</div>
      <p class="lede">Everyone answers this one. Type it on your phone.</p>
      <div class="ql-chips">${players.map((p) => `<span class="${s.final.answers[p.id] ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      <button class="btn btn-ghost" id="ql-skip">Stop waiting</button>`;
  } else if (s.phase === 'final-vote' || s.phase === 'final-result') {
    const result = s.phase === 'final-result';
    const entries = Object.entries(s.final.answers);
    if (result) entries.sort((a, b) => (s.final.counts[b[0]] || 0) - (s.final.counts[a[0]] || 0));
    body = `<div class="ql-prompt">${esc(s.final.text)}</div>
      <div class="ql-grid">${entries.map(([id, t]) => `<div class="ql-answer">${esc(t)}${result ? `<div class="by">${name(id)} · +${(s.final.counts[id] || 0) * 300}</div>` : ''}</div>`).join('')}</div>
      ${result ? '<button class="btn btn-primary btn-big" id="ql-next">Final scores</button>' : '<p class="lede">Vote for your favorite on your phone.</p>'}`;
  } else if (s.phase === 'over') {
    body = `<div class="display-xl">Final scores</div>${scoreboard(rows())}
      <button class="btn btn-primary btn-big" id="ql-again">Play again</button>`;
  }

  el.innerHTML = `<div class="ql">${head}${body}</div>`;
  el.querySelector('#ql-skip')?.addEventListener('click', () => sendAction('game:skip-wait'));
  el.querySelector('#ql-next')?.addEventListener('click', () => sendAction('game:next'));
  el.querySelector('#ql-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
