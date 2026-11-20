// TV view for Wavelength. Targets stay hidden until each reveal.
import { esc, nameOf } from '../../js/ui.js';
import { spriteHtml } from '../../js/people.js';
import { dialSvg, wavelengthStyles } from './dial.js';

const RESULT = { 4: 'Bullseye!', 3: 'So close!', 2: 'In the zone', 0: 'Missed it' };

export function rating(score, total) {
  const avg = score / Math.max(total, 1);
  if (avg >= 3.2) return 'You share one brain.';
  if (avg >= 2.4) return 'Totally on the same wavelength.';
  if (avg >= 1.6) return 'Mostly in sync.';
  if (avg >= 0.8) return 'Some static on the line.';
  return 'Different frequencies entirely.';
}

/** A character (or initial) above each player's dot. */
export function marksFor(s, players, size = 56) {
  return Object.entries(s.guesses || {}).map(([id, g]) => {
    const p = players.find((x) => x.id === id);
    const pic = spriteHtml(p?.person, 'idle', size) || `<span class="wl-init">${esc((p?.name || '?')[0])}</span>`;
    return { value: g.value, html: `${pic}<small>${esc(p?.name || '')}</small>` };
  });
}

const average = (s) => {
  const v = Object.values(s.guesses || {}).map((g) => g.value);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};

export function renderBoard(el, { state: s, players, sendAction }) {
  wavelengthStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const head = `<div class="game-head"><span>Clue ${Math.max(1, Math.min(s.round, s.total))} of ${s.total}</span><span>Team score ${s.score}</span></div>`;

  if (s.phase === 'over') {
    el.innerHTML = `<div class="wl">${head}
      <div class="display-xl">${s.score} points</div>
      <p class="lede">${rating(s.score, s.history.length)}</p>
      <div class="row-center"><button class="btn btn-primary btn-big" id="wl-again">Play again</button></div></div>`;
    el.querySelector('#wl-again').onclick = () => sendAction('game:play-again');
    return;
  }

  let body;
  if (s.phase === 'clues') {
    body = `<div class="display-l">Everyone, write your clue</div>
      <p class="lede">Your phone shows your own secret spectrum and target. Give a clue that points to the target. You can skip one card if it's a tough one.</p>
      <div class="wl-who">${players.map((p) => `<span class="${s.written.includes(p.id) ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      ${s.written.length && s.written.length < players.length ? '<button class="btn btn-ghost" id="wl-go">Start with the clues we have</button>' : ''}`;
  } else if (s.phase === 'guess') {
    const avg = average(s);
    body = `<div class="wl-clue">${esc(s.clue)}</div>
      ${dialSvg({ spectrum: s.spectrum, needle: avg, marks: marksFor(s, players) })}
      <p class="wl-legend">${esc(nameOf(s.psychic, players))}'s clue. Drag the needle on your phone. ${avg !== null ? 'The needle here is the team\'s average.' : ''}</p>
      <div class="wl-who">${players.filter((p) => p.id !== s.psychic).map((p) => `<span class="${s.guesses[p.id]?.locked ? 'in' : ''}">${esc(p.name)}</span>`).join('')}</div>
      ${Object.keys(s.guesses).length ? '<button class="btn btn-ghost" id="wl-reveal">Reveal now</button>' : ''}`;
  } else {
    const next = s.next ? esc(nameOf(s.next, players)) : '';
    body = `<div class="wl-clue">${esc(s.clue)}</div>
      ${dialSvg({ spectrum: s.spectrum, target: s.target, needle: s.teamGuess, marks: marksFor(s, players) })}
      <div class="display-l">${RESULT[s.points]} +${s.points}</div>
      <div class="row-center">${next ? `<span class="muted">${next} starts the next round, or</span>` : ''}
        <button class="btn btn-primary" id="wl-next">${s.queue.length || s.cycle < s.cycles ? 'Next round' : 'Final score'}</button></div>`;
  }
  el.innerHTML = `<div class="wl">${head}${body}</div>`;
  el.querySelector('#wl-go')?.addEventListener('click', () => sendAction('game:start-guessing'));
  el.querySelector('#wl-reveal')?.addEventListener('click', () => sendAction('game:reveal'));
  el.querySelector('#wl-next')?.addEventListener('click', () => sendAction('game:next'));
}
