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
 * Fast Money, one player's turn: every question, with that player's answers appearing as they type them.
 * Points flip over one at a time after the turn.
 */
export function fmLiveHtml(s, t) {
  const fm = s.fm;
  const now = fm.order?.[0];
  const playing = fm.step === `play${t + 1}`;
  const rows = fm.qs.map((q, i) => {
    const a = fm.a[t][i];
    const ptsOn = fm.shown[t] > i;
    const active = playing && now === i;
    return `<div class="fm-row ${active ? 'now' : ''}">
      <span class="fm-qtext">${i + 1}. ${esc(q)}</span>
      <span class="fm-ans ${a ? 'in' : ''}">${a ? esc(a.text || '(passed)') : active ? '<i>thinking…</i>' : ''}</span>
      <span class="pts ${ptsOn ? 'on' : ''} ${ptsOn && !a?.points ? 'zero' : ''}">${ptsOn ? a?.points ?? 0 : ''}</span></div>`;
  }).join('');
  return `<div class="fm-board fm-live">${rows}
    <div class="fm-total ${fm.total >= 200 ? 'win' : ''}">Total <b>${fm.total}</b><small>/ 200</small></div></div>`;
}

/** Fast Money summary at the end: both players' answers side by side for every question. */
export function fmBoardHtml(s, players) {
  const fm = s.fm;
  const cell = (t, i) => {
    const a = fm.a[t][i];
    if (!a || fm.shown[t] <= i) return '<div class="fm-cell"><span></span><span class="pts"></span></div>';
    return `<div class="fm-cell shown ${a.points === 0 ? 'zero' : ''}"><span>${esc(a.text || '—')}</span><span class="pts">${a.points}</span></div>`;
  };
  const rows = fm.qs.map((q, i) => `<div class="fm-q-label">${i + 1}. ${esc(q)}</div>${cell(0, i)}${cell(1, i)}`).join('');
  return `<div class="fm-board">
    <div class="fm-names fm-sum"><span></span><span>${esc(nameOf(fm.p1, players) || 'Player 1')}</span><span>${fm.p2 && fm.p2 !== fm.p1 ? esc(nameOf(fm.p2, players)) : 'Second try'}</span></div>
    <div class="fm-grid fm-sum">${rows}</div>
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
