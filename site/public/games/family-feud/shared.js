import { esc, nameOf } from '../../js/ui.js';

export const DEFAULT_NAMES = { red: 'Red family', blue: 'Blue family' };
/** The family's chosen name, already escaped for HTML. */
export const teamName = (s, t) => esc(s.names?.[t] || DEFAULT_NAMES[t] || '');

export function boardHtml(s) {
  const rows = Math.ceil(s.board.length / 2);
  return `<div class="ff-board" style="--rows:${rows}">${s.board.map((a, i) => a
    ? `<div class="ff-tile shown ${a.late ? 'late' : ''}"><span>${esc(a.text)}</span><span class="pts">${a.points}</span></div>`
    : `<div class="ff-tile hidden"><span class="n">${i + 1}</span></div>`).join('')}</div>`;
}

export function strikesHtml(s, fresh) {
  return `<div class="ff-strikes">${Array.from({ length: s.strikes }, (_, i) => `<span class="ff-x ${fresh && i === s.strikes - 1 ? 'new' : ''}">✕</span>`).join('')}</div>`;
}

/** What just happened, in one line. */
export function lastHtml(s, players) {
  if (s.last) {
    const who = esc(nameOf(s.last.by, players));
    const what = `"${esc(s.last.text)}"`;
    if (s.last.hit) return `<span class="hit">${who} said ${what}. It's on the board!</span>`;
    if (s.last.already) return `<span class="miss">${who} said ${what}. That one's already up. Try again.</span>`;
    return `<span class="miss">${who} said ${what}. Not on the board!</span>`;
  }
  return esc(s.message || '');
}
