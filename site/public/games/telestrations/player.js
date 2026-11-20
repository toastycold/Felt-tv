// Phone view for Telestrations: pick a word, then draw or guess each page.
import { esc, countdown, setHtmlKeepingInputs } from '../../js/ui.js';
import { COLORS, drawStyles, mountPad, paintAll } from './draw.js';

const pad = { key: '', strokes: [], color: COLORS[0], width: 10 };
let lastKey = '';

export function renderPlayer(el, ctx) {
  const { state: s, priv = {}, me, players, sendAction, media } = ctx;
  drawStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; lastKey = ''; return; }
  const isVip = players[0]?.id === me;
  const seated = s.seats.includes(me);
  const done = !!s.done[me];

  // Only rebuild the screen when something that matters to this phone changed,
  // so other players finishing doesn't interrupt your drawing.
  const key = [s.phase, s.step, s.task, done, priv.game, priv.step, priv.media || priv.text || '', priv.chosen || '', s.revealBook, s.revealPage].join('|');
  if (key === lastKey) {
    const t = el.querySelector('.timer');
    if (t) t.dataset.deadline = s.deadline;
    return;
  }
  lastKey = key;

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
      el.innerHTML = `${head}<div class="center"><div class="display-l">Sent!</div><p class="muted">Waiting for the others…</p></div>`;
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
      el.querySelector('#ts-send').onclick = () => sendAction('game:draw', { strokes: pad.strokes });
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
    el.querySelector('#ts-guess').onsubmit = (e) => { e.preventDefault(); sendAction('game:guess', { text: el.querySelector('#ts-guess-text').value }); };
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

  el.innerHTML = `<div class="center"><div class="display-l">That's a wrap!</div>${isVip ? '<button class="btn btn-primary btn-big" id="ts-again">Play again</button>' : ''}</div>`;
  el.querySelector('#ts-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
