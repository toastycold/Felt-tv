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

/**
 * Fast Money board: player 1's answers on the left, player 2's on the right, total at the bottom.
 * Player 1's column stays covered while player 2 plays (like the show).
 */
export function fmBoardHtml(s, players) {
  const fm = s.fm;
  const cover1 = ['ready2', 'play2', 'reveal2'].includes(fm.step);
  const cell = (t, i) => {
    const a = fm.a[t][i];
    const shown = fm.shown[t];
    const textOn = shown >= 2 * i + 1, ptsOn = shown >= 2 * i + 2;
    if (t === 0 && cover1) return '<div class="fm-cell covered"><span></span><span class="pts"></span></div>';
    const txt = a && textOn ? esc(a.text || '—') : '';
    const pts = a && ptsOn ? a.points : '';
    return `<div class="fm-cell ${textOn ? 'shown' : ''} ${ptsOn && a?.points === 0 ? 'zero' : ''}"><span>${txt}</span><span class="pts">${pts}</span></div>`;
  };
  const rows = [0, 1, 2, 3, 4].map((i) => `${cell(0, i)}${cell(1, i)}`).join('');
  return `<div class="fm-board">
    <div class="fm-names"><span>${esc(nameOf(fm.p1, players) || 'Player 1')}</span><span>${fm.p2 && fm.p2 !== fm.p1 ? esc(nameOf(fm.p2, players)) : 'Second try'}</span></div>
    <div class="fm-grid">${rows}</div>
    <div class="fm-total ${fm.total >= 200 ? 'win' : ''}">Total <b>${fm.total}</b><small>/ 200</small></div></div>`;
}

/** Seconds left on the Fast Money clock. */
export function fmLeft(s) { return Math.max(0, Math.ceil(((s.fm?.endsAt || 0) - Date.now()) / 1000)); }

/** Keep any [data-fm-clock] element counting down between state updates. */
let clockTimer = 0;
export function runFmClock(s) {
  clearInterval(clockTimer);
  if (!s.fm || !s.fm.step.startsWith('play')) return;
  const paint = () => document.querySelectorAll('[data-fm-clock]').forEach((n) => {
    const left = fmLeft(s);
    n.textContent = left;
    n.classList.toggle('low', left <= 5);
  });
  paint();
  clockTimer = setInterval(paint, 250);
}
