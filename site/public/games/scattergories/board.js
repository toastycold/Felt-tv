// TV view for Scattergories.
import { esc, nameOf, injectStyles, countdown, scoreboard } from '../../js/ui.js';
import { PER_ROUND, ROUNDS } from './engine.js';

export const REASON = { empty: 'blank', letter: 'wrong letter', duplicate: 'matched someone' };

export function scatterStyles() {
  injectStyles('scatter', `
    /* The letter, as a chunky game tile */
    .sg-letter { width: 6.5rem; height: 6.5rem; flex: none; display: grid; place-items: center; background: var(--card); color: var(--red); border-radius: 22px;
      font: 900 4.6rem/1 var(--display); box-shadow: 0 7px 0 var(--card-edge), inset 0 0 0 4px var(--gold); transform: rotate(-4deg); }
    .sg-letter.sm { width: 3.4rem; height: 3.4rem; font-size: 2.3rem; border-radius: 13px; box-shadow: 0 4px 0 var(--card-edge), inset 0 0 0 3px var(--gold); }

    /* Answer pad: cream paper, red header strip, ruled lines, a red margin */
    .sg-pad { background: var(--card); color: var(--ink); border-radius: 14px; overflow: hidden; box-shadow: 0 8px 0 var(--card-edge), 0 14px 30px rgba(0,0,0,.25); text-align: left; }
    .sg-pad-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; background: var(--red); color: #fff; padding: .45rem 1rem;
      font: 800 1.05rem var(--display); }
    .sg-pad-head small { font: 700 .85rem var(--body); opacity: .9; }
    .sg-rows { list-style: none; margin: 0; padding: .3rem 0; counter-reset: sg; }
    .sg-row { display: grid; grid-template-columns: 2.4rem 1fr; align-items: center; min-height: 2.6rem; border-bottom: 1.5px solid #c9d8e6;
      background: linear-gradient(90deg, transparent 2.4rem, #e9a39a 2.4rem, #e9a39a calc(2.4rem + 2px), transparent calc(2.4rem + 2px)); }
    .sg-row:last-child { border-bottom: 0; }
    .sg-num { text-align: center; font: 800 1rem var(--display); color: var(--ink-soft); }
    .sg-cat-name { padding: .2rem .8rem; font: 700 1.25rem/1.2 var(--body); }

    /* TV, answering */
    .sg-tv { display: grid; grid-template-columns: auto 1fr; gap: 2rem; align-items: start; max-width: 1150px; margin: 0 auto; }
    .sg-side { display: grid; justify-items: center; gap: 1rem; padding-top: .5rem; }
    .sg-side .timer { font-size: 2.6rem; }
    .sg-tv .sg-rows { columns: 2; column-gap: 0; column-rule: 1.5px solid #c9d8e6; }
    .sg-tv .sg-row { break-inside: avoid; min-height: clamp(2.6rem, 7.2vh, 3.8rem); }
    .sg-tv .sg-cat-name { font-size: clamp(1.25rem, 3.6vh, 1.8rem); }
    .sg-tv .sg-pad-head { font-size: clamp(1.05rem, 3vh, 1.4rem); }
    .sg-chips { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1.2rem 0 .6rem; }
    .sg-chips span { padding: .35rem .85rem; border-radius: 99px; background: var(--felt-deep); font-weight: 700; }
    .sg-chips span.in { background: var(--gold); color: var(--ink); }
    .sg-chips span.in::before { content: '✓ '; }

    /* Review: one category at a time */
    .sg-review-top { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-bottom: .6rem; }
    .sg-dots { display: flex; gap: 5px; }
    .sg-dots i { width: 12px; height: 12px; border-radius: 50%; background: var(--felt-deep); }
    .sg-dots i.done { background: rgba(242,194,48,.5); } .sg-dots i.now { background: var(--gold); transform: scale(1.3); }
    .sg-cat-card { max-width: 900px; margin: 0 auto 1rem; }
    .sg-cat-card .sg-cat-name { font: 900 clamp(1.6rem, 5vh, 2.6rem)/1.15 var(--display); padding: .6rem 1rem; text-align: center; }
    .sg-answers { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .8rem; max-width: 1050px; margin: 0 auto 1rem; }
    .sg-ans { background: var(--card); color: var(--ink); border-radius: 12px; padding: .7rem .9rem; box-shadow: 0 4px 0 var(--card-edge); border-left: 7px solid #3fa66a; text-align: left; }
    .sg-ans .t { font: 800 1.45rem/1.15 var(--display); }
    .sg-ans .by { font-size: .9rem; color: var(--ink-soft); margin-top: .15rem; }
    .sg-ans.out { border-left-color: var(--red); opacity: .7; } .sg-ans.out .t { text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 3px; }
    .sg-ans .flag { display: inline-block; margin-top: .3rem; font-size: .8rem; font-weight: 800; padding: 1px 8px; border-radius: 99px; background: #f3d7d3; color: #8c2a23; }
    .sg-ans:not(.out) .flag { background: #f6e7b4; color: #6b5310; }

    /* Phone */
    .sg-phone-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .4rem 0 .7rem;
      background: var(--felt); }
    .sg-phone-top .timer { font-size: 1.8rem; }
    .sg-phone-top p { margin: 0; font-weight: 700; }
    .sg-phone .sg-row { grid-template-columns: 2rem 1fr; background: linear-gradient(90deg, transparent 2rem, #e9a39a 2rem, #e9a39a calc(2rem + 2px), transparent calc(2rem + 2px)); padding: .35rem 0; }
    .sg-phone .sg-field { padding: 0 .7rem; }
    .sg-phone .sg-field span { display: block; font: 700 .88rem/1.2 var(--body); color: var(--ink-soft); }
    .sg-phone .sg-field input { width: 100%; border: 0; border-radius: 0; background: transparent; padding: .25rem 0 .1rem; font: 800 1.2rem var(--display); color: #1d3f8f; outline: none; }
    .sg-phone .sg-field input::placeholder { color: #b9b1a0; font-weight: 600; }
    .sg-phone .sg-row:focus-within { background-color: #fff6d9; }
    .sg-phone .sg-done { width: 100%; margin-top: 1rem; }
    .sg-phone-ans { display: flex; justify-content: space-between; align-items: center; gap: .6rem; }
    .sg-phone-ans .btn { padding: .4rem .7rem; font-size: .9rem; color: var(--ink); border-color: var(--ink-soft); }
    .sg-phone-ans .btn.on { background: var(--red); border-color: var(--red); color: #fff; }
    @media (max-width: 800px) { .sg-tv { grid-template-columns: 1fr; } .sg-tv .sg-rows { columns: 1; } }
  `);
}

/** Progress dots for the review: one per category. */
export const dots = (s) => `<div class="sg-dots">${Array.from({ length: PER_ROUND }, (_, k) => `<i class="${k < s.review ? 'done' : k === s.review ? 'now' : ''}"></i>`).join('')}</div>`;

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
    body = `<div class="sg-tv">
        <div class="sg-side"><div class="sg-letter">${s.letter}</div>${countdown(s.deadline)}</div>
        <div class="sg-pad"><div class="sg-pad-head"><span>Everything starts with ${s.letter}</span><small>Fill these in on your phone</small></div>
          <ol class="sg-rows">${s.categories.map((c, k) => `<li class="sg-row"><span class="sg-num">${k + 1}</span><span class="sg-cat-name">${esc(c)}</span></li>`).join('')}</ol></div>
      </div>
      <div class="sg-chips">${players.map((p) => `<span class="${s.submitted[p.id] ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      <div class="row-center"><button class="btn btn-ghost" id="sg-stop">Stop the timer</button></div>`;
  } else if (s.phase === 'review') {
    body = `<div class="sg-review-top"><div class="sg-letter sm">${s.letter}</div><div><div class="muted">Category ${s.review + 1} of ${PER_ROUND}</div>${dots(s)}</div></div>
      <div class="sg-pad sg-cat-card"><div class="sg-cat-name">${esc(s.categories[s.review])}</div></div>
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
