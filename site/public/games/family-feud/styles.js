import { injectStyles } from '../../js/ui.js';

export function feudStyles() {
  injectStyles('family-feud', `
    .ff { --ff-red: #e0574e; --ff-blue: #4a8ad6; --ff-tile: #173a8c; --ff-tile-hi: #2856c4; }
    .ff-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; margin-bottom: .4rem; }
    .ff-score { font: 800 clamp(1.8rem, 5vh, 3rem)/1 var(--display); }
    .ff-score small { display: block; font: 700 .95rem var(--body); opacity: .85; }
    .ff-score.red { color: #ff9a92; } .ff-score.blue { color: #9cc4ff; text-align: right; }
    .ff-score.ctrl::after { content: 'playing'; display: inline-block; margin-left: .5rem; vertical-align: middle; font: 700 .8rem var(--body);
      background: var(--gold); color: var(--ink); border-radius: 999px; padding: .15rem .55rem; }
    .ff-score.blue.ctrl::after { margin: 0 .5rem 0 0; }
    .ff-bank { text-align: center; }
    .ff-bank b { display: block; font: 800 clamp(1.6rem, 4.5vh, 2.6rem)/1 var(--display); color: var(--gold); }
    .ff-bank span { font: 700 .9rem var(--body); opacity: .85; }
    .ff-q { text-align: center; font: 800 clamp(1.2rem, min(3vw, 5vh), 2.3rem)/1.15 var(--display); margin: 0 auto .6rem; max-width: 30ch; }
    .ff-board { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: column; grid-template-rows: repeat(var(--rows), auto); gap: clamp(.3rem, 1vh, .6rem);
      background: #0d1f4d; border: 4px solid var(--gold); border-radius: 18px; padding: clamp(.4rem, 1.5vh, .9rem); }
    .ff-tile { display: flex; align-items: center; justify-content: space-between; min-height: clamp(2.2rem, 7vh, 3.6rem); padding: .2rem 1rem;
      background: linear-gradient(#2148a8, var(--ff-tile)); border-radius: 10px; color: #fff; font: 800 clamp(1rem, min(2vw, 4vh), 1.6rem) var(--display);
      box-shadow: inset 0 0 0 2px rgba(255,255,255,.15); }
    .ff-tile.hidden { justify-content: center; }
    .ff-tile.hidden .n { display: grid; place-items: center; width: clamp(1.7rem, 5vh, 2.4rem); height: clamp(1.7rem, 5vh, 2.4rem); border-radius: 50%; background: #0d1f4d; color: var(--gold); }
    .ff-tile .pts { min-width: 2.6rem; text-align: center; background: #0d1f4d; color: var(--gold); border-radius: 8px; padding: .1rem .4rem; }
    .ff-tile.shown { background: linear-gradient(#3a68d8, var(--ff-tile-hi)); animation: ff-flip .45s ease; }
    .ff-tile.late { opacity: .6; animation: none; }
    @keyframes ff-flip { from { transform: rotateX(90deg); } to { transform: none; } }
    .ff-strikes { display: flex; justify-content: center; gap: .6rem; margin-top: .4rem; }
    .ff-strikes:empty { display: none; }
    .ff-x { font: 900 clamp(2.2rem, 8vh, 3.6rem)/1 var(--display); color: #ff4b3e; text-shadow: 0 3px 0 #6b0f0a; }
    .ff-x.new { animation: ff-x .5s ease; }
    @keyframes ff-x { from { transform: scale(2.6); opacity: 0; } to { transform: none; opacity: 1; } }
    .ff-bigx { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; gap: 2vw;
      background: rgba(0,0,0,.35); pointer-events: none; animation: ff-bigx-out 1.6s ease forwards; }
    .ff-bigx span { font: 900 min(42vh, 26vw)/1 var(--display); color: #ff2a1a;
      text-shadow: 0 0 .06em #fff, 0 .04em 0 #7a0c05, 0 0 .3em rgba(255,40,20,.6); animation: ff-bigx-in .25s ease-out; }
    @keyframes ff-bigx-in { from { transform: scale(2); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes ff-bigx-out { 0%, 75% { opacity: 1; } 100% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .ff-bigx, .ff-bigx span { animation: none; } }
    .ff-stage { display: grid; grid-template-columns: auto 1fr auto; gap: .8rem; align-items: center; }
    .ff-center { min-width: 0; }
    .ff-side { display: flex; flex-direction: column; flex-wrap: wrap; align-content: center; justify-content: center;
      gap: .1rem .3rem; max-height: 62vh; min-width: 4rem; }
    .ff-side.red { flex-wrap: wrap-reverse; }
    .ff-fam { margin: 0; display: flex; flex-direction: column; align-items: center; border-radius: 12px; padding: .1rem .2rem; }
    .ff-fam figcaption { font: 700 .8rem var(--body); margin-top: -.3rem; white-space: nowrap; }
    .ff-side.red figcaption { color: #ff9a92; } .ff-side.blue figcaption { color: #9cc4ff; }
    .ff-flip { display: block; line-height: 0; }
    .ff-side.blue .ff-flip { transform: scaleX(-1); }
    .ff-fam.up { background: rgba(242,194,48,.22); box-shadow: 0 0 0 2px var(--gold); }
    .ff-noface { display: block; width: var(--s); height: calc(var(--s) * .6); }
    .ff-msg { text-align: center; font: 700 clamp(1rem, 3vh, 1.25rem) var(--body); margin: .35rem 0; }
    .ff-msg .hit { color: #8be38b; } .ff-msg .miss { color: #ff9a92; }
    .ff-vs { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin: .3rem 0; font: 800 clamp(1.2rem, 4vh, 1.6rem) var(--display); }
    .ff-vs .red { color: #ff9a92; } .ff-vs .blue { color: #9cc4ff; }
    .ff-vs .done::after { content: ' ✓'; color: #8be38b; }
    .ff-actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: .5rem; }
    .ff-teams { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .ff-team { border-radius: 14px; padding: 1rem; background: rgba(0,0,0,.18); }
    .ff-team.red h2 { color: #ff9a92; } .ff-team.blue h2 { color: #9cc4ff; }
    .ff-team ul { list-style: none; padding: 0; margin: 0; font: 700 1.2rem var(--body); }
    .ff-error { text-align: center; color: #ffb3ad; font-weight: 700; }
    .ff-badge { display: inline-block; border-radius: 999px; padding: .2rem .7rem; font-weight: 800; color: #fff; }
    .ff-badge.red { background: var(--ff-red); } .ff-badge.blue { background: var(--ff-blue); }
    .ff-phone { text-align: center; }
    .ff-phone h2 { font: 800 1.6rem/1.2 var(--display); margin: .6rem 0; }
    .ff-phone .ff-q { font-size: 1.25rem; margin: .8rem 0; }
    .ff-phone form { display: grid; gap: .6rem; margin-top: .8rem; }
    .ff-phone .ff-board { grid-template-columns: 1fr; grid-auto-flow: row; padding: .5rem; gap: .35rem; border-width: 3px; }
    .ff-phone .ff-tile { min-height: 2.4rem; font-size: 1rem; padding: .2rem .7rem; }
    .ff-phone .ff-x { font-size: 2.2rem; }
    
  `);
}
