import { injectStyles } from '../../js/ui.js';

export function justOneStyles() {
  injectStyles('just-one', `
    .jo { text-align: center; }
    .jo-meta { display: flex; justify-content: space-between; font-weight: 700; opacity: .85; margin-bottom: 1rem; }
    .jo-big { font: 800 clamp(2rem, 5vw, 3.6rem)/1.05 var(--display); margin: .5rem 0 1rem; }
    .jo-word {
      display: inline-block; background: var(--card); color: var(--ink); border-radius: 14px;
      padding: .6rem 1.4rem; font: 800 clamp(2rem, 7vw, 4rem)/1.1 var(--display); text-transform: uppercase;
      box-shadow: 0 5px 0 var(--card-edge); margin: .5rem 0 1rem; transform: rotate(-1.5deg);
    }
    .jo-givers { display: flex; flex-wrap: wrap; gap: .5rem; justify-content: center; margin: 1rem 0; }
    .jo-giver { padding: .4rem .9rem; border-radius: 99px; background: rgba(0,0,0,.25); font-weight: 700; }
    .jo-giver.in { background: var(--gold); color: var(--ink); }
    .jo-clues { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin: 1.25rem 0; }
    .jo-clue {
      background: var(--card); color: var(--ink); border-radius: 12px; padding: .9rem 1.4rem;
      font: 800 clamp(1.4rem, 3.4vw, 2.6rem) var(--display); box-shadow: 0 4px 0 var(--card-edge);
    }
    .jo-clue:nth-child(odd) { transform: rotate(-1.2deg); } .jo-clue:nth-child(even) { transform: rotate(1.4deg); }
    .jo-clue.out { opacity: .5; }
    .jo-clue.out .t { text-decoration: line-through; }
    .jo-clue small { display: block; font: 600 .8rem var(--body); text-decoration: none; opacity: .8; }
    .jo-outcome.correct { color: #8be38b; } .jo-outcome.wrong { color: #ff9b8f; } .jo-outcome.skip { color: var(--gold); }
    .jo-form { display: flex; flex-direction: column; gap: .6rem; margin: 1rem 0; }
    .jo-form input { font: 700 1.4rem var(--body); padding: .8rem 1rem; border-radius: 12px; border: 2px solid var(--card-edge); background: var(--card); color: var(--ink); text-align: center; }
    .jo-review { list-style: none; padding: 0; margin: 1rem 0; display: grid; gap: .5rem; }
    .jo-review button {
      width: 100%; display: flex; justify-content: space-between; align-items: center; padding: .8rem 1rem;
      border-radius: 12px; border: 0; background: var(--card); color: var(--ink); font: 700 1.2rem var(--body); cursor: pointer;
    }
    .jo-review button.out span:first-child { text-decoration: line-through; opacity: .5; }
    .jo-review small { font-weight: 600; opacity: .7; }
    .jo-history { list-style: none; padding: 0; max-width: 520px; margin: 1rem auto; text-align: left; }
    .jo-history li { display: flex; justify-content: space-between; padding: .4rem 0; border-bottom: 1px solid rgba(255,255,255,.15); }
    .jo-row { display: flex; gap: .5rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
  `);
}
