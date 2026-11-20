// TV view for Scattergories.
import { esc, nameOf, injectStyles, countdown, scoreboard } from '../../js/ui.js';
import { PER_ROUND, ROUNDS } from './engine.js';

export const REASON = { empty: 'blank', letter: 'wrong letter', duplicate: 'matched someone' };

export function scatterStyles() {
  injectStyles('scatter', `
    .sg-top { display: flex; align-items: center; gap: 1.5rem; justify-content: center; margin-bottom: 1rem; }
    .sg-letter { width: 6.5rem; height: 6.5rem; display: grid; place-items: center; background: var(--card); color: var(--ink); border-radius: 18px; font: 800 4.4rem/1 var(--display); box-shadow: 0 7px 0 var(--card-edge); transform: rotate(-4deg); }
    .sg-list { columns: 2; column-gap: 2.5rem; max-width: 900px; margin: 0 auto; padding-left: 1.5rem; font-size: 1.35rem; }
    .sg-list li { margin-bottom: .45rem; break-inside: avoid; }
    .sg-chips { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1.25rem 0; }
    .sg-chips span { padding: .35rem .85rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .sg-chips span.in { background: var(--gold); color: var(--ink); }
    .sg-cat { text-align: center; }
    .sg-answers { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .8rem; max-width: 1050px; margin: 1rem auto; }
    .sg-ans { background: var(--card); color: var(--ink); border-radius: 14px; padding: .8rem 1rem; box-shadow: 0 4px 0 var(--card-edge); }
    .sg-ans .t { font: 800 1.45rem/1.15 var(--display); }
    .sg-ans .by { font-size: .9rem; color: var(--ink-soft); margin-top: .2rem; }
    .sg-ans.out { opacity: .5; } .sg-ans.out .t { text-decoration: line-through; }
    .sg-ans .flag { display: inline-block; margin-top: .3rem; font-size: .8rem; font-weight: 700; padding: 1px 8px; border-radius: 99px; background: #eadfbf; }
    .sg-phone-list { display: flex; flex-direction: column; gap: .55rem; }
    .sg-phone-list label { font-weight: 700; font-size: .95rem; }
    .sg-phone-list input { width: 100%; padding: .65rem .8rem; font: 700 1.1rem var(--body); border-radius: 10px; border: 2px solid var(--card-edge); background: #fffaf0; color: var(--ink); margin-top: .2rem; }
    .sg-phone-ans { display: flex; justify-content: space-between; align-items: center; gap: .6rem; }
    .sg-phone-ans .btn { padding: .4rem .7rem; font-size: .9rem; color: var(--ink); border-color: var(--ink-soft); }
    .sg-phone-ans .btn.on { background: var(--red); border-color: var(--red); color: #fff; }
    @media (max-width: 800px) { .sg-list { columns: 1; } }
  `);
}

export function answerCards(s, players, { phone = false, me = '' } = {}) {
  const k = s.review;
  return Object.entries(s.answers).map(([id, list]) => {
    const key = `${k}:${id}`;
    const auto = s.auto[key];
    const votes = (s.challenges[key] || []).length;
    const others = Object.keys(s.answers).length - 1;
    const out = auto || (others > 0 && votes >= Math.ceil(others / 2));
    const flag = auto ? REASON[auto] : votes ? `${votes} challenge${votes > 1 ? 's' : ''}` : '';
    const mineChallenged = (s.challenges[key] || []).includes(me);
    return `<div class="sg-ans ${out ? 'out' : ''}">
      <div class="${phone ? 'sg-phone-ans' : ''}">
        <div><div class="t">${esc(list[k] || '—')}</div><div class="by">${esc(nameOf(id, players))}</div></div>
        ${phone && id !== me && !auto ? `<button class="btn ${mineChallenged ? 'on' : ''}" data-challenge="${id}">${mineChallenged ? 'Challenged' : 'Challenge'}</button>` : ''}
      </div>
      ${flag ? `<span class="flag">${flag}</span>` : ''}
    </div>`;
  }).join('');
}

export function renderBoard(el, { state: s, players, sendAction }) {
  scatterStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const rows = () => players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 }));
  let body = '';

  if (s.phase === 'answer') {
    body = `<div class="sg-top"><div class="sg-letter">${s.letter}</div>${countdown(s.deadline)}</div>
      <ol class="sg-list">${s.categories.map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
      <div class="sg-chips">${players.map((p) => `<span class="${s.submitted[p.id] ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      <div class="row-center"><button class="btn btn-ghost" id="sg-stop">Stop the timer</button></div>`;
  } else if (s.phase === 'review') {
    body = `<div class="sg-cat">
        <div class="muted">Category ${s.review + 1} of ${PER_ROUND} · letter ${s.letter}</div>
        <div class="display-xl">${esc(s.categories[s.review])}</div>
      </div>
      <div class="sg-answers">${answerCards(s, players)}</div>
      <p class="center muted">Think an answer is a stretch? Challenge it on your phone. Half the table throws it out.</p>
      <div class="row-center">
        ${s.review ? '<button class="btn btn-ghost" id="sg-prev">Back</button>' : ''}
        <button class="btn btn-primary btn-big" id="sg-next">${s.review < PER_ROUND - 1 ? 'Next category' : 'Score the round'}</button>
      </div>`;
  } else {
    body = `<div class="display-xl center">${s.phase === 'over' ? 'Final scores' : `After round ${s.round} of ${ROUNDS}`}</div>
      ${scoreboard(rows())}
      <div class="row-center"><button class="btn btn-primary btn-big" id="${s.phase === 'over' ? 'sg-again' : 'sg-round'}">${s.phase === 'over' ? 'Play again' : 'Next round'}</button></div>`;
  }
  el.innerHTML = `<div class="game-head"><span>Round ${s.round} of ${ROUNDS}</span><span></span></div>${body}`;
  el.querySelector('#sg-stop')?.addEventListener('click', () => sendAction('game:stop-early'));
  el.querySelector('#sg-next')?.addEventListener('click', () => sendAction('game:next-category'));
  el.querySelector('#sg-prev')?.addEventListener('click', () => sendAction('game:prev-category'));
  el.querySelector('#sg-round')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#sg-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
