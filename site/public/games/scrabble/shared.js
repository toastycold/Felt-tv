import { injectStyles } from '../../js/ui.js';
import { SIZE, CENTER, PREMIUM, VALUES } from './rules.js';

const LABEL = { TW: 'TW', DW: 'DW', TL: 'TL', DL: 'DL' };

/** pending: { pos -> { l, blank } } tiles being placed (phone only). */
export function boardHtml(board, { pending = {}, recent = [], tappable = false } = {}) {
  let html = '';
  for (let pos = 0; pos < SIZE * SIZE; pos++) {
    const t = board[pos] || pending[pos];
    const prem = PREMIUM[pos];
    const cls = ['sc-cell', prem ? `p-${prem}` : '', pos === CENTER ? 'center' : '', t ? 'filled' : '',
      pending[pos] ? 'pending' : '', recent.includes(pos) ? 'recent' : ''].join(' ');
    const inner = t
      ? `<span class="l">${t.l}</span>${t.blank ? '' : `<span class="v">${VALUES[t.l]}</span>`}`
      : pos === CENTER ? '★' : prem ? LABEL[prem] : '';
    html += tappable ? `<button class="${cls}" data-pos="${pos}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
  }
  return `<div class="sc-board">${html}</div>`;
}

export function tileHtml(letter, attrs = '', cls = '') {
  return `<button class="sc-tile ${cls}" ${attrs}><span class="l">${letter === '?' ? '' : letter}</span><span class="v">${VALUES[letter] || ''}</span></button>`;
}

export function scrabbleStyles() {
  injectStyles('scrabble', `
    .sc-board { display: grid; grid-template-columns: repeat(15, 1fr); gap: 2px; background: #1a3d2e; padding: 4px; border-radius: 10px; aspect-ratio: 1; }
    .sc-cell { position: relative; background: #e6dcc1; border: 0; padding: 0; border-radius: 3px; display: grid; place-items: center;
      font: 700 clamp(.4rem, 1.2vw, .7rem) var(--body); color: rgba(0,0,0,.45); aspect-ratio: 1; min-width: 0; }
    .sc-cell.p-TW { background: #d6453d; color: #fff; } .sc-cell.p-DW { background: #f0a39a; color: #6b1d16; }
    .sc-cell.p-TL { background: #2f6fb5; color: #fff; } .sc-cell.p-DL { background: #9cc3ea; color: #12324d; }
    .sc-cell.center { background: #f0a39a; color: #6b1d16; font-size: 1rem; }
    .sc-cell.filled { background: #f7e7b8; color: var(--ink); box-shadow: inset 0 -2px 0 #c9b27a; }
    .sc-cell.pending { background: var(--gold); box-shadow: inset 0 -2px 0 var(--gold-edge); }
    .sc-cell.recent { outline: 2px solid var(--gold); outline-offset: -2px; }
    .sc-cell .l, .sc-tile .l { font: 800 clamp(.7rem, 2.2vw, 1.5rem)/1 var(--display); color: var(--ink); }
    .sc-cell .v { position: absolute; right: 2px; bottom: 1px; font-size: clamp(.3rem, .7vw, .55rem); color: var(--ink); }
    button.sc-cell { cursor: pointer; }
    .sc-rack { display: grid; grid-template-columns: repeat(7, 1fr); gap: .35rem; margin: .75rem 0; }
    .sc-tile { position: relative; aspect-ratio: 1; border: 0; border-radius: 8px; background: #f7e7b8; box-shadow: 0 4px 0 #c9b27a; cursor: pointer; display: grid; place-items: center; }
    .sc-tile .l { font-size: 1.6rem; }
    .sc-tile .v { position: absolute; right: 4px; bottom: 2px; font-size: .7rem; color: var(--ink); }
    .sc-tile.sel { outline: 3px solid var(--gold); transform: translateY(-4px); }
    .sc-tile.used { visibility: hidden; }
    .sc-tile.swap { outline: 3px solid var(--red); }
    .sc-layout { display: grid; grid-template-columns: minmax(0, 620px) 1fr; gap: 2rem; align-items: start; justify-content: center; }
    .sc-score { display: flex; justify-content: space-between; padding: .6rem .9rem; border-radius: 12px; background: var(--felt-deep); margin-bottom: .45rem; font-size: 1.2rem; font-weight: 700; border: 3px solid transparent; }
    .sc-score.now { border-color: var(--gold); }
    .sc-phone-board { overflow: auto; margin: 0 -1rem; padding: 0 1rem; }
    .sc-phone-board.zoom .sc-board { width: 560px; }
    .sc-phone-board .sc-cell { font-size: .45rem; }
    .sc-phone-board .sc-cell .l { font-size: .85rem; }
    .sc-phone-board.zoom .sc-cell .l { font-size: 1.1rem; }
    .sc-err { background: var(--red); color: #fff; border-radius: 10px; padding: .5rem .8rem; font-weight: 700; margin: .5rem 0; }
    .sc-tools { display: flex; gap: .4rem; flex-wrap: wrap; justify-content: center; }
    .sc-tools .btn { padding: .5rem .8rem; }
    @media (max-width: 900px) { .sc-layout { grid-template-columns: 1fr; } }
  `);
}
