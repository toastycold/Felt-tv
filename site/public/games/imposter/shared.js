import { injectStyles } from '../../js/ui.js';

export function imposterStyles() {
  injectStyles('imposter', `
    .im { text-align: center; }
    .im-head { display: flex; justify-content: center; align-items: baseline; gap: 1.2rem; flex-wrap: wrap; margin-bottom: .4rem; }
    .im-cat { font: 900 clamp(1.8rem, 6vh, 3rem)/1.1 var(--display); }
    .im-cat small { display: block; font: 700 clamp(.9rem, 2.4vh, 1.1rem) var(--body); opacity: .75; }
    .im-say { font: 800 clamp(1.1rem, 3.2vh, 1.5rem) var(--display); color: var(--gold); margin: .4rem 0 1rem; }
    .im-clues { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .8rem; max-width: 1100px; margin: 0 auto; }
    .im-card { position: relative; background: var(--card); color: var(--ink); border-radius: 14px; padding: .7rem .8rem 1rem; box-shadow: 0 5px 0 var(--card-edge); }
    .im-card.now { box-shadow: 0 5px 0 var(--card-edge), 0 0 0 4px var(--gold); }
    .im-card.later { opacity: .55; }
    .im-card.caught { box-shadow: 0 5px 0 #8c2a23, 0 0 0 4px #d6453d; }
    .im-name { display: flex; align-items: center; justify-content: center; gap: .3rem; font: 800 1.05rem var(--display); }
    .im-name .sprite { margin: -.6rem -.3rem -.5rem -.5rem; }
    .im-clue { font: 900 clamp(1.4rem, 4.2vh, 2.1rem)/1.15 var(--display); margin-top: .35rem; min-height: 1.2em; word-break: break-word; }
    .im-clue i { font: italic 600 1rem var(--body); color: var(--ink-soft); }
    .im-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: .25rem; margin-top: .4rem; }
    .im-chip { font-size: .78rem; font-weight: 800; padding: 1px 8px; border-radius: 99px; background: #d6453d; color: #fff; }
    .im-chip.lean { background: transparent; color: #d6453d; box-shadow: inset 0 0 0 1.5px #d6453d; }
    .im-big { font: 900 clamp(2rem, 7vh, 3.6rem)/1.1 var(--display); margin: .3rem 0; }
    .im-big b { color: var(--gold); }
    .im-result { font: 800 clamp(1.2rem, 3.6vh, 1.7rem) var(--display); margin-bottom: .6rem; }
    .im-result.win { color: #8be38b; } .im-result.lose { color: #ff9a92; }
    .im-actions { display: flex; justify-content: center; gap: .6rem; margin-top: 1rem; flex-wrap: wrap; }
    /* phone */
    .im-secret { border-radius: 16px; background: linear-gradient(135deg, #2b3d6b, #1a2445); color: #fff; padding: 1rem; min-height: 6.5rem; display: grid; place-items: center; }
    .im-secret .w { font: 900 2.2rem/1.1 var(--display); }
    .im-secret .c { font: 700 .95rem var(--body); opacity: .8; }
    
    .im-flip { width: 100%; border: 0; cursor: pointer; font: inherit; }
    .im-flip .front { display: none; } .im-flip.up .back { display: none; } .im-flip.up .front { display: block; }
    .im-flip .back { font: 800 1.15rem var(--display); opacity: .9; }
    .im-flip.up { background: linear-gradient(135deg, #2b3d6b, #1a2445); }
    .im-final { margin-top: 1.2rem; padding-top: .8rem; border-top: 1px dashed rgba(255,255,255,.25); text-align: left; }
    .im-final label { font-size: .85rem; opacity: .8; }
    .im-final-row { display: flex; gap: .4rem; margin-top: .3rem; }
    .im-final-row input { flex: 1; min-width: 0; padding: .55rem .7rem; border-radius: 10px; border: 0; font: 700 1rem var(--body); }
    .im-phone .choice-btn small { display: block; font-weight: 600; opacity: .7; }
    .im-phone .im-lock { width: 100%; margin-top: .6rem; }
    .im-phone form { display: grid; gap: .6rem; margin-top: .6rem; }
  `);
}
