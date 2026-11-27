// Phone view for Telestrations: pick a word, then draw or guess each page.
import { esc, countdown, setHtmlKeepingInputs, nameOf as nameOfP } from '../../js/ui.js';
import { COLORS, drawStyles, mountPad, paintAll } from './draw.js';

const pad = { key: '', strokes: [], color: COLORS[0], width: 10 };
let lastKey = '';
let lastGuess = { key: '', text: '' };

// Save a draft every couple of seconds, and hand in whatever you have just before the timer ends,
// so a drawing or guess is never lost.
let saveTimer = 0, sendTimer = 0, lastDraft = '', handIn = null, hurriedStep = '', saveNow = null;
function stopSaving() { clearInterval(saveTimer); clearTimeout(sendTimer); saveTimer = sendTimer = 0; lastDraft = ''; handIn = null; saveNow = null; }
function keepSaving(s, current, submit, sendAction) {
  stopSaving();
  saveNow = () => {
    const d = JSON.stringify(current());
    if (d !== lastDraft) { lastDraft = d; sendAction('game:draft', current()); }
  };
  saveTimer = setInterval(saveNow, 2000);
  handIn = () => { stopSaving(); submit(); };
  const left = (s.deadline || 0) - Date.now() - 1000;
  sendTimer = setTimeout(() => handIn?.(), Math.max(0, left));
}
// Phone going to sleep or switching apps: save right away.
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow?.(); });

export function renderPlayer(el, ctx) {
  const { state: s, priv = {}, me, players, sendAction, media } = ctx;
  drawStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; lastKey = ''; return; }
  const isVip = players[0]?.id === me;
  const seated = s.seats.includes(me);
  const done = !!s.done[me];

  // The TV said "stop waiting": hand in whatever is on this phone right now.
  if (s.phase === 'play' && s.hurry && !done && handIn && hurriedStep !== `${priv.game}-${s.step}`) { hurriedStep = `${priv.game}-${s.step}`; handIn(); }

  // Only rebuild the screen when something that matters to this phone changed,
  // so other players finishing doesn't interrupt your drawing.
  const key = [s.phase, s.step, s.task, done, priv.game, priv.step, priv.media || priv.text || '', priv.chosen || '', s.revealBook, s.revealPage].join('|');
  if (key === lastKey) {
    const t = el.querySelector('.timer');
    if (t) t.dataset.deadline = s.deadline;
    return;
  }
  lastKey = key;
  if (s.phase !== 'play') stopSaving();

  if (!seated) {
    el.innerHTML = '<div class="center"><div class="display-l">Watching this game</div><p class="muted">You joined after it started. Watch the TV!</p></div>';
    return;
  }

  if (s.phase === 'choose') {
    el.innerHTML = priv.chosen
      ? `<div class="center"><div class="display-l">Your word</div><div class="ts-prompt">${esc(priv.chosen)}</div><p class="muted">Waiting for everyone to choose.</p></div>`
      : `<div class="display-l">Pick a word to draw</div>${(priv.options || []).map((w) => `<button class="choice-btn" data-word="${esc(w)}">${esc(w)}</button>`).join('')}`;
    el.querySelectorAll('[data-word]').forEach((b) => (b.onclick = () => sendAction('game:choose', { word: b.dataset.word })));
    return;
  }

  if (s.phase === 'play') {
    const head = `<div class="game-head"><span>Page ${s.step + 1} of ${s.steps}</span>${countdown(s.deadline)}</div>`;
    if (done || priv.step !== s.step) {
      const canBack = done && priv.step === s.step && !s.hurry && s.deadline - Date.now() > 3000;
      el.innerHTML = `${head}<div class="center"><div class="display-l">Sent!</div><p class="muted">Waiting for the others…</p>
        ${canBack ? `<button class="btn btn-ghost" id="ts-back">Back: change my ${s.task === 'draw' ? 'drawing' : 'guess'}</button>` : ''}</div>`;
      el.querySelector('#ts-back')?.addEventListener('click', () => { lastKey = ''; sendAction('game:unsend'); });
      return;
    }
    if (s.task === 'draw') {
      const padKey = `${priv.game}-${s.step}`;
      if (pad.key !== padKey) Object.assign(pad, { key: padKey, strokes: [] });
      el.innerHTML = `${head}
        <p class="center" style="margin:0 0 .5rem">Draw: <span class="ts-prompt">${esc(priv.text)}</span></p>
        <div class="ts-pad"><canvas></canvas></div>
        <div class="ts-tools">
          ${COLORS.map((c) => `<button class="ts-swatch ${pad.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}
        </div>
        <div class="ts-tools">
          ${[[5, 'Thin'], [10, 'Medium'], [24, 'Thick']].map(([w, l]) => `<button class="ts-size ${pad.width === w ? 'on' : ''}" data-width="${w}">${l}</button>`).join('')}
          <button class="ts-size" id="ts-undo">Undo</button><button class="ts-size" id="ts-clear">Clear</button>
        </div>
        <button class="btn btn-primary btn-big" id="ts-send" style="width:100%">I'm done drawing</button>`;
      const p = mountPad(el.querySelector('.ts-pad'), pad);
      el.querySelectorAll('[data-color]').forEach((b) => (b.onclick = () => { pad.color = b.dataset.color; el.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b)); }));
      el.querySelectorAll('[data-width]').forEach((b) => (b.onclick = () => { pad.width = Number(b.dataset.width); el.querySelectorAll('[data-width]').forEach((x) => x.classList.toggle('on', x === b)); }));
      el.querySelector('#ts-undo').onclick = () => { pad.strokes.pop(); p.repaint(); };
      el.querySelector('#ts-clear').onclick = () => { pad.strokes = []; p.repaint(); };
      el.querySelector('#ts-send').onclick = () => { stopSaving(); sendAction('game:draw', { strokes: pad.strokes }); };
      keepSaving(s, () => ({ strokes: pad.strokes }), () => sendAction('game:draw', { strokes: pad.strokes }), sendAction);
      pad.onStroke = () => saveNow?.();
      return;
    }
    // guess
    setHtmlKeepingInputs(el, `${head}
      <p class="center" style="margin:0 0 .5rem">What is this?</p>
      <canvas class="ts-art" width="800" height="600" data-media="${priv.media}"></canvas>
      <form id="ts-guess" class="stack" style="margin-top:1rem">
        <input id="ts-guess-text" class="big-text-input" maxlength="50" autocomplete="off" placeholder="Your guess" required>
        <button class="btn btn-primary btn-big">Send guess</button>
      </form>`);
    paintAll(el, (id) => {
      const strokes = media(id);
      if (!strokes) lastKey = ''; // re-render once the drawing arrives
      return strokes;
    });
    const gi = el.querySelector('#ts-guess-text');
    if (lastGuess.key === `${priv.game}-${s.step}` && !gi.value) gi.value = lastGuess.text;
    el.querySelector('#ts-guess').onsubmit = (e) => { e.preventDefault(); stopSaving(); lastGuess = { key: `${priv.game}-${s.step}`, text: gi.value }; sendAction('game:guess', { text: gi.value }); };
    const guessText = () => el.querySelector('#ts-guess-text')?.value || '';
    keepSaving(s, () => ({ text: guessText() }), () => sendAction('game:guess', { text: guessText() }), sendAction);
    let typing = 0;
    el.querySelector('#ts-guess-text').addEventListener('input', () => { clearTimeout(typing); typing = setTimeout(() => saveNow?.(), 500); });
    return;
  }

  if (s.phase === 'reveal') {
    el.innerHTML = `<div class="center"><div class="display-l">Look at the TV!</div>
      <p class="muted">Sketchbook ${s.revealBook + 1} of ${s.books.length}</p>
      ${isVip ? '<div class="row-center"><button class="btn btn-ghost" id="ts-prev">Back</button><button class="btn btn-primary btn-big" id="ts-next">Next</button></div>' : ''}</div>`;
    el.querySelector('#ts-next')?.addEventListener('click', () => sendAction('game:reveal-next'));
    el.querySelector('#ts-prev')?.addEventListener('click', () => sendAction('game:reveal-prev'));
    return;
  }

  // The end: every sketchbook, start to finish, to scroll through on your phone.
  const books = s.books || [];
  el.innerHTML = `<div class="center"><div class="display-l">That's a wrap!</div><p class="muted">Every sketchbook, start to finish:</p></div>
    ${books.map((b, k) => `<div class="ts-book"><h3>${k + 1}. ${esc(nameOfP(b.owner, players))}'s sketchbook</h3>
      <div class="ts-book-pages"><div class="ts-mini word">${esc(b.word)}</div>${b.pages.map((pg) => pg.type === 'draw'
        ? `<div class="ts-mini"><canvas class="ts-art" width="400" height="300" data-media="${pg.media}"></canvas><small>${esc(nameOfP(pg.by, players))}</small></div>`
        : `<div class="ts-mini word">${pg.text ? esc(pg.text) : '<em>(no guess)</em>'}<small>${esc(nameOfP(pg.by, players))}</small></div>`).join('')}</div></div>`).join('')}
    ${isVip ? '<div class="row-center" style="margin-top:1rem"><button class="btn btn-primary btn-big" id="ts-again">Play again</button></div>' : ''}`;
  paintAll(el, (id) => { const st = media(id); if (!st) lastKey = ''; return st; });
  el.querySelector('#ts-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
