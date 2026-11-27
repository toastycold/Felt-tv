// TV view for Family Feud. Shows only answers that have been revealed.
import { esc, nameOf } from '../../js/ui.js';
import { spriteHtml, poseFor } from '../../js/people.js';
import { feudStyles } from './styles.js';
import { teamName, boardHtml, strikesHtml, lastHtml, fmBoardHtml, fmLiveHtml, runFmClock } from './shared.js';

let seenStrikes = 0;

/** One family lined up on its side of the board, facing the middle. */
function sideHtml(s, team, players) {
  const ids = s.teams[team] || [];
  const size = ids.length > 4 ? 52 : 68;
  return `<div class="ff-side ${team}">${ids.map((id) => {
    const p = players.find((x) => x.id === id) || {};
    const turn = s.current === id || (s.phase === 'faceoff' && (s.faceoff?.red === id || s.faceoff?.blue === id));
    return `<figure class="ff-fam ${turn ? 'up' : ''}">
      <span class="ff-flip">${spriteHtml(p.person, poseFor(s, id), size) || `<span class="ff-noface" style="--s:${size}px"></span>`}</span>
      <figcaption>${esc(nameOf(id, players))}</figcaption></figure>`;
  }).join('')}</div>`;
}

/** The show's moment: giant red X's over everything, plus a buzzer. */
function bigStrike(count) {
  document.querySelector('.ff-bigx')?.remove();
  const o = document.createElement('div');
  o.className = 'ff-bigx';
  o.innerHTML = Array.from({ length: count }, () => '<span>✕</span>').join('');
  document.body.appendChild(o);
  setTimeout(() => o.remove(), 1600);
  buzz();
}

/** The "ding!" when an answer flips over. */
let ctxDing = null;
export function ding() {
  try {
    ctxDing = ctxDing || new (window.AudioContext || window.webkitAudioContext)();
    if (ctxDing.state === 'suspended') ctxDing.resume();
    const a = ctxDing, t = a.currentTime + 0.01;
    for (const [f, d] of [[1318.5, 0], [1760, 0.09]]) {
      const o = a.createOscillator(), g = a.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.35, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
      o.connect(g).connect(a.destination); o.start(t + d); o.stop(t + d + 1);
    }
  } catch { /* no sound */ }
}
let seenRevealed = -1, seenQuestion = '';

export function buzz() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    gain.connect(ctx.destination);
    for (const f of [110, 116]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    }
    setTimeout(() => ctx.close(), 1200);
  } catch { /* no sound available */ }
}

export function renderBoard(el, { state: s, players, sendAction }) {
  feudStyles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Setting up the stage…</p>'; return; }
  const names = (t) => s.teams[t].map((id) => `<li>${esc(nameOf(id, players))}</li>`).join('') || '<li class="muted">Nobody yet</li>';

  if (s.phase === 'setup') {
    el.innerHTML = `
      <div class="ff">
        <p class="ff-q">Survey says… pick a family and give it a name on your phone.</p>
        <div class="ff-teams">
          ${['red', 'blue'].map((t) => `<div class="ff-team ${t}"><h2>${teamName(s, t)}</h2><ul>${names(t)}</ul></div>`).join('')}
        </div>
        ${s.error ? `<p class="ff-error">${esc(s.error)}</p>` : ''}
        <div class="ff-actions"><button class="btn btn-primary btn-big" id="ff-begin">Start the show</button></div>
      </div>`;
    el.querySelector('#ff-begin').onclick = () => sendAction('game:begin');
    return;
  }

  if (s.phase === 'fm') { renderFastMoney(el, s, players, sendAction); return; }
  runFmClock(s);

  const revealed = (s.board || []).filter(Boolean).length;
  if (s.question !== seenQuestion) { seenQuestion = s.question; seenRevealed = revealed; }
  if (revealed > seenRevealed && seenRevealed >= 0 && s.phase !== 'reveal') ding();
  seenRevealed = revealed;

  const fresh = s.strikes > seenStrikes;
  seenStrikes = s.strikes;
  if (fresh) bigStrike(s.strikes);
  const over = s.phase === 'over';
  const roundLabel = over ? 'Final scores' : `Round ${s.round} of ${s.rounds}${s.mult > 1 ? ` · ${s.mult === 2 ? 'Double' : 'Triple'} points` : ''}`;

  let status = '';
  if (s.phase === 'faceoff') {
    const done = s.faceoff.done || [];
    status = `<div class="ff-vs">
        <span class="red ${done.includes(s.faceoff.red) ? 'done' : ''}">${esc(nameOf(s.faceoff.red, players))}</span>
        <span>vs</span>
        <span class="blue ${done.includes(s.faceoff.blue) ? 'done' : ''}">${esc(nameOf(s.faceoff.blue, players))}</span></div>
      <p class="ff-msg">${s.faceoff.turn ? `${teamName(s, s.faceoff.turn)}, your turn to answer!` : 'Face-off! First to type an answer on the board wins control.'}</p>
      ${s.message ? `<p class="ff-msg">${esc(s.message)}</p>` : ''}`;
  } else if (s.phase === 'play') {
    status = `<p class="ff-msg">${lastHtml(s, players)}</p>
      <p class="ff-msg"><b>${esc(nameOf(s.current, players))}</b>, it's your turn to guess for ${teamName(s, s.control)}.</p>`;
  } else if (s.phase === 'steal') {
    status = `<p class="ff-msg">${esc(s.message)}</p>
      <p class="ff-msg">${teamName(s, s.control === 'red' ? 'blue' : 'red')}, huddle up. One of you types your answer.</p>`;
  } else {
    status = `<p class="ff-msg">${s.last ? `${lastHtml(s, players)}<br>` : ''}${esc(s.message)}</p>`;
    if (over) status += `<p class="ff-q">${s.winner === 'tie' ? "It's a tie!" : `${teamName(s, s.winner)} win${/s$/i.test(s.names?.[s.winner] || 'family') ? '' : 's'}!`}</p>`;
  }

  el.innerHTML = `
    <div class="ff">
      <div class="ff-head">
        <div class="ff-score red ${s.control === 'red' && s.phase === 'play' ? 'ctrl' : ''}">${s.scores.red}<small>${teamName(s, 'red')}</small></div>
        <div class="ff-bank"><b>${s.bank * (s.mult || 1)}</b><span>${roundLabel}</span></div>
        <div class="ff-score blue ${s.control === 'blue' && s.phase === 'play' ? 'ctrl' : ''}">${s.scores.blue}<small>${teamName(s, 'blue')}</small></div>
      </div>
      <p class="ff-q">${esc(s.question)}</p>
      <div class="ff-stage">${sideHtml(s, 'red', players)}<div class="ff-center">${boardHtml(s)}${strikesHtml(s, fresh)}</div>${sideHtml(s, 'blue', players)}</div>
      ${status}
      <div class="ff-actions">
        ${s.phase === 'faceoff' && !s.board.some(Boolean) ? '<button class="btn btn-ghost" id="ff-skip-survey">Seen it! New survey</button>' : ''}
        ${s.phase === 'faceoff' ? '<button class="btn btn-ghost" id="ff-skip">Skip face-off</button>' : ''}
        ${s.phase === 'play' ? '<button class="btn btn-ghost" id="ff-time">Time\'s up (strike)</button>' : ''}
        ${s.phase === 'play' && s.strikes ? '<button class="btn btn-ghost" id="ff-undo">Take back a strike</button>' : ''}
        ${s.phase === 'reveal' ? '<button class="btn btn-primary btn-big" id="ff-next">Next round</button>' : ''}
        ${over && s.winner !== 'tie' ? '<button class="btn btn-primary btn-big" id="ff-fm">Play Fast Money!</button>' : ''}
        ${over ? `<button class="btn ${s.winner === 'tie' ? 'btn-primary btn-big' : 'btn-ghost'}" id="ff-new">Play again</button>` : ''}
      </div>
    </div>`;

  const on = (id, action) => el.querySelector(id)?.addEventListener('click', () => sendAction(action));
  on('#ff-begin', 'game:begin');
  on('#ff-skip', 'game:skip-faceoff');
  on('#ff-skip-survey', 'game:skip-survey');
  on('#ff-time', 'game:time-up');
  on('#ff-undo', 'game:undo-strike');
  on('#ff-next', 'game:next-round');
  on('#ff-new', 'game:new-game');
  on('#ff-fm', 'game:fast-money');
}

let seenDup = 0, fmSeenShown = '';
function renderFastMoney(el, s, players, sendAction) {
  const fm = s.fm;
  const name = (id) => esc(nameOf(id, players));
  const fam = teamName(s, fm.team);
  const solo = fm.p1 === fm.p2;
  if (fm.dup && fm.dup.k !== seenDup) { seenDup = fm.dup.k; buzz(); }
  if (!fm.dup) seenDup = 0;
  // a ding for each answer worth points as it flips, a buzz for a zero
  const turnNow = fm.step.endsWith('2') ? 1 : 0;
  const key = `${turnNow}:${fm.shown[turnNow]}`;
  if (fm.step.startsWith('reveal') && key !== fmSeenShown && fm.shown[turnNow] > 0) {
    const a = fm.a[turnNow][fm.shown[turnNow] - 1];
    if (a?.points) ding(); else buzz();
  }
  fmSeenShown = key;
  let top = '', actions = '';
  switch (fm.step) {
    case 'pick':
      top = `<p class="fm-q">${fam}, pick your two Fast Money players. Tap "I'll play" on your phones.</p>`;
      break;
    case 'ready1':
      top = `<p class="fm-q">${name(fm.p1)} goes first. 60 seconds on the clock. Whatever's left, plus 5 bonus seconds, goes to ${solo ? 'your second try' : name(fm.p2)}.</p>
        ${solo ? '' : `<p class="fm-look">${name(fm.p2)}, turn away from the TV and cover your ears!</p>`}`;
      actions = '<button class="btn btn-primary btn-big" id="fm-start">Start the clock</button>';
      break;
    case 'ready2':
      top = `<p class="fm-q">${solo ? `${name(fm.p2)}, your second try` : `${name(fm.p2)}, come on back`}! You have ${Math.round((fm.left + 5000) / 1000)} seconds (what's left plus 5 bonus seconds). Don't repeat ${solo ? 'your first' : `${name(fm.p1)}'s`} answers.</p>`;
      actions = '<button class="btn btn-primary btn-big" id="fm-start">Start the clock</button>';
      break;
    case 'play1': case 'play2': {
      top = `<div class="center"><span class="fm-clock" data-fm-clock></span> <b class="fm-who">${name(s.current)}</b></div>
        ${fm.step === 'play1' && !solo ? `<p class="fm-look">${name(fm.p2)}, no peeking!</p>` : ''}
        ${fm.dup ? `<p class="center fm-dup">Duplicate! "${esc(fm.dup.text)}" was already said. Try again!</p>` : ''}`;
      actions = '<button class="btn btn-ghost" id="fm-stop">End turn now</button>';
      break;
    }
    case 'reveal1': case 'reveal2':
      top = `<p class="fm-q">${name(fm.step === 'reveal1' ? fm.p1 : fm.p2)}'s answers. Survey says…</p>`;
      break;
    case 'done':
      top = fm.won
        ? `<p class="fm-big win">🎉 ${fam} won Fast Money! 🎉</p>`
        : `<p class="fm-big lose">So close! ${fm.total} points, ${200 - fm.total} short.</p>`;
      actions = '<button class="btn btn-primary btn-big" id="ff-new">Play again</button>';
      break;
  }
  el.innerHTML = `<div class="ff">
    <div class="fm-title">FAST MONEY</div>
    ${top}
    ${['play1', 'reveal1'].includes(fm.step) ? fmLiveHtml(s, 0) : ['play2', 'reveal2'].includes(fm.step) ? fmLiveHtml(s, 1) : fm.step === 'done' ? fmBoardHtml(s, players) : ''}
    <div class="ff-actions">${actions}</div></div>`;
  runFmClock(s);
  const on = (id, action) => el.querySelector(id)?.addEventListener('click', () => sendAction(action));
  on('#fm-start', 'game:fm-start');
  on('#fm-stop', 'game:fm-stop');
  on('#ff-new', 'game:new-game');
}
