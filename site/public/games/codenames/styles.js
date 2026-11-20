import { injectStyles } from '../../js/ui.js';

export function codenamesStyles() {
  injectStyles('codenames', `
    .cn { --cn-red: var(--red, #d6453d); --cn-blue: var(--blue, #2f6fb5); }
    .cn-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .cn-count { font: 800 2.4rem/1 var(--display); }
    .cn-count.red { color: #ff8a80; } .cn-count.blue { color: #8ab8ff; text-align: right; }
    .cn-count small { display: block; font: 600 .9rem var(--body); opacity: .8; }
    .cn-turn { text-align: center; }
    .cn-turn .who { font: 700 1.1rem var(--body); }
    .cn-clue { font: 800 2.6rem/1.1 var(--display); letter-spacing: .02em; }
    .cn-clue .n { display: inline-grid; place-items: center; min-width: 1.4em; margin-left: .3em; border-radius: 10px; background: var(--gold); color: var(--ink); }
    .cn-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .6rem; }
    .cn-card {
      position: relative; min-height: 4.6rem; padding: .4rem; border-radius: 10px; border: 0;
      background: var(--card); color: var(--ink); font: 700 clamp(.85rem, 1.7vw, 1.35rem) var(--body);
      text-transform: uppercase; letter-spacing: .03em; display: grid; place-items: center; text-align: center;
      box-shadow: 0 3px 0 var(--card-edge);
    }
    .cn-card.k-red { background: var(--cn-red); color: #fff; box-shadow: 0 3px 0 #8f2a24; }
    .cn-card.k-blue { background: var(--cn-blue); color: #fff; box-shadow: 0 3px 0 #1d4679; }
    .cn-card.k-neutral { background: #cbbf9f; color: #5f5643; box-shadow: 0 3px 0 #9c9175; }
    .cn-card.k-assassin { background: #2a2724; color: #f7f0dc; box-shadow: 0 3px 0 #000; }
    .cn-card.hidden-key { opacity: .5; }
    .cn-card.done::after { content: ''; position: absolute; inset: 0; border-radius: inherit; background: repeating-linear-gradient(45deg, transparent 0 8px, rgba(0,0,0,.12) 8px 10px); }
    button.cn-card:not(:disabled) { cursor: pointer; }
    button.cn-card:not(:disabled):active { transform: translateY(2px); box-shadow: 0 1px 0 var(--card-edge); }
    .cn-teams { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    .cn-team { border-radius: 16px; padding: 1.25rem; color: #fff; }
    .cn-team.red { background: var(--cn-red); } .cn-team.blue { background: var(--cn-blue); }
    .cn-team h2 { font: 800 2rem var(--display); margin: 0 0 .75rem; }
    .cn-team ul { list-style: none; margin: 0; padding: 0; font-size: 1.25rem; }
    .cn-team li { padding: .35rem 0; border-top: 1px solid rgba(255,255,255,.25); }
    .cn-role { font-size: .85rem; background: rgba(0,0,0,.25); padding: 2px 8px; border-radius: 99px; margin-left: .4rem; }
    .cn-error { background: var(--card); color: #a3261f; padding: .6rem 1rem; border-radius: 10px; font-weight: 700; }
    .cn-phone .cn-grid { gap: .35rem; }
    .cn-phone .cn-card { min-height: 3.4rem; font-size: .7rem; padding: .2rem; letter-spacing: 0; }
    .cn-phone-status { text-align: center; margin: .25rem 0 .9rem; }
    .cn-phone-status h2 { font: 800 1.6rem var(--display); margin: 0; }
    .cn-badge { display: inline-block; padding: 3px 12px; border-radius: 99px; color: #fff; font-weight: 700; }
    .cn-badge.red { background: var(--cn-red); } .cn-badge.blue { background: var(--cn-blue); }
    .cn-clue-form { display: grid; grid-template-columns: 1fr 5rem; gap: .5rem; margin-bottom: .9rem; }
    .cn-clue-form input, .cn-clue-form select { font: 700 1.2rem var(--body); padding: .7rem; border-radius: 10px; border: 2px solid var(--card-edge); background: var(--card); color: var(--ink); }
    .cn-clue-form button { grid-column: 1 / -1; }
    .cn-actions { display: flex; gap: .5rem; justify-content: center; margin-top: 1rem; flex-wrap: wrap; }
    @media (max-width: 700px) { .cn-teams { grid-template-columns: 1fr; } .cn-count { font-size: 1.6rem; } .cn-clue { font-size: 1.6rem; } }
  `);
}
