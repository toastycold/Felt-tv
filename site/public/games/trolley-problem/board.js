// TV view for Trolley Problem.
import { esc, nameOf, injectStyles, scoreboard } from '../../js/ui.js';
import { sceneHtml, sceneCss } from './scene.js';

export function trolleyStyles() {
  injectStyles('trolley', `
    .tp { text-align: center; }
    .tp-tracks { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin: 1rem 0 1.5rem; text-align: left; }
    .tp-track { background: var(--card); color: var(--ink); border-radius: 18px; padding: 1.4rem 1.5rem; box-shadow: 0 6px 0 var(--card-edge); position: relative; }
    .tp-track h3 { font: 700 1rem var(--body); color: var(--ink-soft); margin: 0 0 .5rem; }
    .tp-track p { font: 800 clamp(1.3rem, 2.6vw, 2.1rem)/1.15 var(--display); margin: 0; }
    .tp-track.lose { outline: 4px solid var(--red); }
    .tp-track .rails { height: 10px; margin: 1rem 0 0; background: repeating-linear-gradient(90deg, var(--ink-soft) 0 6px, transparent 6px 18px); border-top: 3px solid var(--ink-soft); border-bottom: 3px solid var(--ink-soft); opacity: .5; }
    .tp-count { font: 800 3rem/1 var(--display); color: var(--ink); margin-top: .8rem; }
    .tp-names { color: var(--ink-soft); font-size: .95rem; margin-top: .3rem; min-height: 1.2em; }
    .tp-voters { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; }
    .tp-voter { padding: .35rem .85rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .tp-voter.in { background: var(--gold); color: var(--ink); }
    @media (max-width: 700px) { .tp-tracks { grid-template-columns: 1fr; } }
    .tp-twist { font: 800 clamp(1rem, 3vh, 1.4rem) var(--display); color: var(--gold); margin: 0 0 .4rem; }
    .tp-foot { display: flex; align-items: center; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-top: .8rem; }
    .tp-foot .scoreboard { margin: 0; }
    .tp-verdict { font: 900 clamp(1.4rem, 4.5vh, 2.2rem) var(--display); margin: .7rem 0 .2rem; }
    ${sceneCss}
  `);
}

export function trackCards(s, players, reveal) {
  const counts = { stay: 0, pull: 0 };
  const names = { stay: [], pull: [] };
  for (const [id, v] of Object.entries(s.votes)) { counts[v.choice]++; names[v.choice].push(nameOf(id, players)); }
  const card = (key, title) => `
    <div class="tp-track ${reveal && (s.majority === key) ? 'lose' : ''}">
      <h3>${title}</h3>
      <p>${esc(s.dilemma[key])}</p>
      <div class="rails"></div>
      ${reveal ? `<div class="tp-count">${counts[key]}</div><div class="tp-names">${names[key].map(esc).join(', ')}</div>` : ''}
    </div>`;
  return `<div class="tp-tracks">${card('stay', 'Do nothing, and it hits')}${card('pull', 'Pull the lever, and it hits')}</div>`;
}

export function renderBoard(el, { state: s, players, sendAction }) {
  trolleyStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const rows = () => players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 }));

  if (s.phase === 'over') {
    el.innerHTML = `<div class="tp"><div class="display-xl">Final scores</div>${scoreboard(rows())}
      <div class="row-center"><button class="btn btn-primary btn-big" id="tp-again">Play again</button></div></div>`;
    el.querySelector('#tp-again').onclick = () => sendAction('game:play-again');
    return;
  }

  const reveal = s.phase === 'reveal';
  const counts = { stay: 0, pull: 0 }, names = { stay: [], pull: [] };
  for (const [id, v] of Object.entries(s.votes)) { counts[v.choice]++; names[v.choice].push(nameOf(id, players)); }
  let footer;
  if (reveal) {
    const verdict = s.majority === 'tie' ? 'A perfect split! The trolley slams on the brakes. Everyone scores.' : s.majority === 'pull' ? 'Most of you pulled the lever.' : 'Most of you did nothing.';
    footer = `<div class="tp-verdict">${verdict}</div>
      <p class="muted" style="margin:0">A point for everyone who predicted the majority.</p>
      <div class="tp-foot">${scoreboard(rows())}
      <button class="btn btn-primary btn-big" id="tp-next">${s.round >= s.total ? 'Final scores' : 'Next trolley'}</button></div>`;
  } else {
    footer = `<p class="lede" style="margin:.7rem 0 .4rem">Pull the lever or do nothing? Decide on your phone, then guess what most people picked.</p>
      <div class="tp-voters">${players.map((p) => `<span class="tp-voter ${s.votes[p.id] ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      ${Object.keys(s.votes).length ? '<div class="row-center" style="margin-top:.8rem"><button class="btn btn-ghost" id="tp-reveal">Reveal now</button></div>' : ''}`;
  }

  el.innerHTML = `<div class="tp">
    <div class="game-head"><span>Trolley ${s.round} of ${s.total}</span><span></span></div>
    ${s.dilemma?.twist ? `<p class="tp-twist">${esc(s.dilemma.twist)}</p>` : ''}
    ${sceneHtml(s, reveal ? { outcome: s.majority, counts, names } : {})}
    ${footer}
  </div>`;
  el.querySelector('#tp-next')?.addEventListener('click', () => sendAction('game:next'));
  el.querySelector('#tp-reveal')?.addEventListener('click', () => sendAction('game:reveal'));
}
