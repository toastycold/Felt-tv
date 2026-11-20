import { injectStyles, esc } from '../../js/ui.js';

export function cardColor(v) {
  if (v === null || v === undefined) return 'back';
  if (v < 0) return 'neg';
  if (v === 0) return 'zero';
  if (v <= 4) return 'low';
  if (v <= 8) return 'mid';
  return 'high';
}

export function cardHtml(v, { attrs = '', cls = '' } = {}) {
  const c = cardColor(v);
  return `<div class="sk-card sk-${c} ${cls}" ${attrs}>${v === null || v === undefined ? '' : v}</div>`;
}

export function gridHtml(grid, { tappable = () => false, small = false } = {}) {
  return `<div class="sk-grid ${small ? 'small' : ''}">${grid.map((c, i) =>
    c.gone ? '<div class="sk-card sk-gone"></div>'
      : tappable(c, i) ? `<button class="sk-card sk-${cardColor(c.v)} tap" data-i="${i}">${c.v ?? ''}</button>`
        : cardHtml(c.v)).join('')}</div>`;
}

export const gridSum = (grid) => grid.reduce((a, c) => a + (c.gone || c.v === null ? 0 : c.v), 0);

export function skyjoStyles() {
  injectStyles('skyjo', `
    .sk-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: .45rem; }
    .sk-card {
      aspect-ratio: 3 / 4; border-radius: 10px; display: grid; place-items: center; border: 0; padding: 0;
      font: 800 clamp(1.3rem, 5vw, 2.2rem) var(--display); color: #fff; box-shadow: 0 3px 0 rgba(0,0,0,.3);
    }
    .sk-grid.small { gap: .25rem; }
    .sk-grid.small .sk-card { font-size: 1.25rem; border-radius: 6px; box-shadow: 0 2px 0 rgba(0,0,0,.3); }
    .sk-back { background: repeating-linear-gradient(135deg, #3b6fb0 0 8px, #335f98 8px 16px); }
    .sk-neg { background: #3b3b8f; } .sk-zero { background: #4fa3d1; } .sk-low { background: #3e9b57; }
    .sk-mid { background: #e0b326; color: var(--ink); } .sk-high { background: #d6453d; }
    .sk-gone { background: transparent; box-shadow: none; border: 2px dashed var(--felt-line); }
    .sk-card.tap { cursor: pointer; outline: 3px solid var(--gold); outline-offset: 1px; }
    .sk-card.tap:active { transform: translateY(2px); }
    .sk-table { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 250px)); gap: 1rem; justify-content: center; }
    .sk-seat { background: var(--felt-deep); border-radius: 14px; padding: .7rem; border: 3px solid transparent; }
    .sk-seat.now { border-color: var(--gold); }
    .sk-seat h4 { display: flex; justify-content: space-between; margin: 0 0 .5rem; font: 800 1.05rem var(--display); }
    .sk-center { display: flex; gap: 1.25rem; align-items: center; justify-content: center; margin: .5rem 0 1rem; }
    .sk-center .sk-card { width: 4.4rem; font-size: 2rem; }
    .sk-pile { text-align: center; font-size: .85rem; opacity: .85; }
    .sk-pile .sk-card { margin-bottom: .3rem; }
    .sk-hand { outline: 4px solid var(--gold); }
    .sk-status { text-align: center; margin-bottom: .75rem; }
    .sk-log { list-style: none; padding: 0; margin: .5rem 0 0; opacity: .8; font-size: .9rem; text-align: center; }
    .sk-totals th, .sk-totals td { padding: .35rem .8rem; text-align: right; }
    .sk-totals th:first-child, .sk-totals td:first-child { text-align: left; }
    .sk-totals { margin: 0 auto 1rem; border-collapse: collapse; font-size: 1.1rem; }
    .sk-totals tr + tr { border-top: 1px solid var(--felt-line); }
  `);
}

export function totalsTable(s, players, nameOf) {
  const rows = [...s.seats].sort((a, b) => s.totals[a] - s.totals[b]);
  return `<table class="sk-totals"><tr><th>Player</th><th>This round</th><th>Total</th></tr>
    ${rows.map((id) => `<tr><td>${esc(nameOf(id, players))}${id === s.closer ? ' (ended it)' : ''}</td><td>${s.roundScores[id] ?? ''}</td><td><strong>${s.totals[id]}</strong></td></tr>`).join('')}</table>`;
}
