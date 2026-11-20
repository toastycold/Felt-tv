// Helpers used by both the board (TV) and player (phone) views.
export function nameOf(id, players) {
  if (id === 'cpu') return 'Computer';
  return players.find((p) => p.id === id)?.name || 'Player';
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let styled = false;
export function injectStyles() {
  if (styled) return;
  styled = true;
  const css = `
    .ttt-wrap { display: grid; grid-template-columns: auto 1fr; gap: 2.5rem; align-items: center; justify-content: center; }
    .ttt-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); gap: 12px; width: min(68vh, 90vw); aspect-ratio: 1; }
    .ttt-cell {
      background: var(--card); border: 0; border-radius: 16px; color: var(--ink); box-shadow: 0 5px 0 var(--card-edge);
      font: 800 clamp(2.5rem, 10vh, 7rem)/1 var(--display); display: grid; place-items: center; padding: 0;
    }
    .ttt-cell.X { color: var(--blue); } .ttt-cell.O { color: var(--red); }
    .ttt-cell.win { background: var(--gold); box-shadow: 0 5px 0 var(--gold-edge); }
    button.ttt-cell:not(:disabled) { cursor: pointer; }
    button.ttt-cell:not(:disabled):active { transform: translateY(3px); box-shadow: 0 2px 0 var(--card-edge); }
    .ttt-side { min-width: 260px; }
    .ttt-status { font: 800 2.4rem/1.1 var(--display); margin-bottom: 1.25rem; }
    .ttt-seat { display: flex; justify-content: space-between; padding: .75rem 1.1rem; border-radius: 12px; background: var(--felt-deep); margin-bottom: .5rem; font-size: 1.25rem; border: 2px solid transparent; }
    .ttt-seat.active { border-color: var(--gold); }
    .ttt-phone-grid { width: 100%; }
    .ttt-phone-status { font: 800 1.7rem var(--display); text-align: center; margin: .5rem 0 1.1rem; }
    @media (max-width: 800px) { .ttt-wrap { grid-template-columns: 1fr; } }
  `;
  const el = document.createElement('style');
  el.textContent = css;
  document.head.appendChild(el);
}
