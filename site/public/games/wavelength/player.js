// Phone view for Wavelength.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { dialSvg, wavelengthStyles, wireDrag } from './dial.js';
import { rating } from './board.js';

let draft = null; // { round, value } — where this phone's needle is, before the server catches up

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  wavelengthStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const isVip = players[0]?.id === me;
  let html;

  if (s.phase === 'over') {
    html = `<div class="display-l">${s.score} points</div><p>${rating(s.score, s.history.length)}</p>
      ${isVip ? '<button class="btn btn-primary btn-big" id="wl-again">Play again</button>' : ''}`;
  } else if (s.phase === 'clues') {
    if (!priv.spectrum) {
      html = '<div class="display-l">Everyone is writing clues…</div><p class="muted">You\'ll get a card next round.</p>';
    } else if (s.written.includes(me)) {
      html = `<div class="display-l">Clue sent!</div>
        <div class="wl-clue">${esc(priv.clue)}</div>
        ${dialSvg({ spectrum: priv.spectrum, target: priv.target })}
        <p class="muted">Waiting for ${players.length - s.written.length} more…</p>`;
    } else {
      html = `<div class="display-l">Your secret card</div>
        <p class="muted">Only you can see this target. Write a clue that points to it.</p>
        ${dialSvg({ spectrum: priv.spectrum, target: priv.target })}
        <form id="wl-clue" class="stack">
          <input id="wl-clue-text" class="big-text-input" maxlength="60" placeholder="Your clue" autocomplete="off" required>
          <button class="btn btn-primary btn-big">Send clue</button>
        </form>
        ${priv.skipped ? '<p class="muted small">You already used your skip.</p>' : '<button class="btn btn-ghost" id="wl-skip">Skip this card (once)</button>'}`;
    }
  } else if (s.phase === 'guess' && me === s.psychic) {
    const locked = Object.values(s.guesses).filter((g) => g.locked).length;
    html = `<div class="wl-clue">${esc(s.clue)}</div>
      <p>It's your clue! No hints now. ${locked} locked in so far.</p>
      ${dialSvg({ spectrum: s.spectrum, target: priv.target ?? null })}
      <button class="btn btn-ghost" id="wl-reveal">Reveal now</button>`;
  } else if (s.phase === 'guess') {
    const mine = s.guesses[me];
    if (!draft || draft.round !== s.round) draft = { round: s.round, value: mine?.value ?? 50 };
    if (mine && mine.locked) draft.value = mine.value;
    html = `<div class="wl-clue">${esc(s.clue)}</div>
      <p class="muted">${esc(nameOf(s.psychic, players))}'s clue. ${mine?.locked ? 'Locked in.' : 'Drag the needle to where you think it points.'}</p>
      ${dialSvg({ spectrum: s.spectrum, needle: draft.value, drag: !mine?.locked })}
      ${mine?.locked
        ? '<p>Waiting for the others…</p><button class="btn btn-ghost" id="wl-unlock">Change my guess</button>'
        : '<button class="btn btn-primary btn-big" id="wl-lock">Lock it in</button>'}`;
  } else {
    // reveal: keep your own needle up next to the team's
    const mine = s.guesses[me];
    const canNext = s.next === me;
    html = `<div class="wl-clue">${esc(s.clue)}</div>
      ${dialSvg({ spectrum: s.spectrum, target: s.target, team: s.teamGuess, needle: mine ? mine.value : null })}
      <p class="wl-legend">${mine ? 'Black is your guess, <b class="wl-blue">blue</b> is the team\'s.' : '<b class="wl-blue">Blue</b> is the team\'s guess.'}</p>
      <div class="display-l">+${s.points}</div>
      <p class="muted">${canNext ? "You're the psychic next! The TV starts the round." : s.next ? `${esc(nameOf(s.next, players))} is the psychic next.` : ''}</p>`;
  }

  setHtmlKeepingInputs(el, `<div class="wl">
    <div class="game-head"><span>Clue ${Math.max(1, Math.min(s.round, s.total))} of ${s.total}</span><span>Score ${s.score}</span></div>
    ${html}</div>`);

  if (s.phase === 'guess' && me !== s.psychic && !s.guesses[me]?.locked) {
    wireDrag(el, draft.value, (v) => { draft.value = v; }, (v) => sendAction('game:dial', { value: v, lock: false }));
  }
  el.querySelector('#wl-lock')?.addEventListener('click', () => sendAction('game:dial', { value: draft.value, lock: true }));
  el.querySelector('#wl-unlock')?.addEventListener('click', () => sendAction('game:dial', { value: s.guesses[me].value, lock: false }));
  const clueForm = el.querySelector('#wl-clue');
  if (clueForm) clueForm.onsubmit = (e) => { e.preventDefault(); sendAction('game:clue', { text: el.querySelector('#wl-clue-text').value }); };
  el.querySelector('#wl-skip')?.addEventListener('click', () => sendAction('game:skip-card'));
  el.querySelector('#wl-reveal')?.addEventListener('click', () => sendAction('game:reveal'));
  el.querySelector('#wl-next')?.addEventListener('click', () => sendAction('game:next'));
  el.querySelector('#wl-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
