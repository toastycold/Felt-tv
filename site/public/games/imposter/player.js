// Phone view for Imposter: your secret word (or the Imposter screen), your clue, your vote.
import { esc, nameOf } from '../../js/ui.js';
import { imposterStyles } from './shared.js';

let typingKey = '';
let flipped = false, flipTimer = 0;

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  imposterStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  const playing = s.order?.includes(me);
  // Every phone looks the same: a face-down card you tap to flip (it flips back by itself), and the same guess box.
  const face = priv.imposter
    ? `<div class="w">You're the Imposter!</div><div class="c">Category: ${esc(priv.category)}. Blend in, and guess the word below if you figure it out.</div>`
    : `<div class="c">The secret word is</div><div class="w">${esc(priv.word || '…')}</div><div class="c">Category: ${esc(priv.category || '')}</div>`;
  const card = `<button type="button" class="im-secret im-flip ${flipped ? 'up' : ''}" id="im-flip">
      <span class="back">Tap to see your word</span><span class="front">${face}</span></button>`;
  const guessBox = `<form id="im-final" class="im-final"><label>Know the secret word? Lock in a final answer:</label>
      <div class="im-final-row"><input id="im-final-text" maxlength="30" autocomplete="off" autocapitalize="off" placeholder="Final answer">
      <button class="btn btn-ghost">Lock in</button></div>${priv.guessed ? `<p class="small muted">Locked in: ${esc(priv.guessed)}</p>` : ''}</form>`;

  let body = '';
  const typing = (key, label, placeholder, action) => {
    // keep the keyboard up while typing, unless this phone's secret card changed underneath
    key = `${key}:${priv.word || ''}:${priv.imposter ? 1 : 0}:${priv.guessed || ''}`;
    if (typingKey === key && el.querySelector('#im-form')) return true;
    typingKey = key;
    body = `${card}<form id="im-form"><h2>${label}</h2>
      ${priv.note ? `<p class="small muted">${esc(priv.note)}</p>` : ''}
      <input class="big-text-input" id="im-text" maxlength="30" autocomplete="off" autocapitalize="off" placeholder="${placeholder}">
      <button class="btn btn-primary btn-big">${action}</button></form>${guessBox}`;
    return false;
  };

  if (!playing && ['clues', 'vote', 'guess'].includes(s.phase)) body = '<h2>Watching this round</h2><p class="muted">You joined partway through. You\'re in next round.</p>';
  else switch (s.phase) {
    case 'clues':
      if (s.order[s.turn] === me) { if (typing(`clue:${s.round}:${priv.note || ''}`, 'Your turn! Give one word.', 'One-word clue', 'Give clue')) return; }
      else body = `${card}<h2>${n(s.order[s.turn])} is giving a clue</h2><p class="muted">${s.clues[me] ? `Your clue: <b>${esc(s.clues[me])}</b>` : `You go ${ordinal(s.order.indexOf(me) + 1)}.`}</p>${guessBox}`;
      break;
    case 'vote': {
      const locked = s.votes[me];
      const lean = s.leans?.[me];
      if (locked) { body = `${card}<h2>Vote locked in</h2><p>You voted for <b>${n(locked)}</b>.</p>${guessBox}`; break; }
      body = `${card}<h2>Who's the Imposter?</h2><p class="small muted">Tap a name (the TV shows it), then lock it in.</p>
        ${s.order.filter((id) => id !== me).map((id) => `<button class="choice-btn ${lean === id ? 'picked' : ''}" data-vote="${id}">${n(id)}<small>${esc(s.clues[id] || 'no clue')}</small></button>`).join('')}
        ${lean ? `<button class="btn btn-primary btn-big im-lock" id="im-lock">Lock in: ${n(lean)}</button>` : ''}${guessBox}`;
      break;
    }
    case 'guess':
      if (priv.imposter) { if (typing(`guess:${s.round}`, "You've been caught! Guess the word to win anyway.", 'The secret word', 'Guess')) return; }
      else body = `${card}<h2>${n(s.accused)} is guessing the word…</h2>`;
      break;
    case 'reveal':
      body = `<h2>The word was ${esc(s.word)}</h2><p class="muted">Look at the TV.</p>`;
      break;
    case 'over':
      body = '<h2>Game over!</h2><p class="muted">Final scores are on the TV.</p>';
      break;
  }
  if (!body.includes('im-form')) typingKey = '';
  // Redraws happen as clues come in: keep anything typed in the final-answer box.
  const prev = el.querySelector('#im-final-text');
  const keep = prev ? { v: prev.value, f: document.activeElement === prev } : null;
  el.innerHTML = `<div class="im-phone">${body}</div>`;
  const now = el.querySelector('#im-final-text');
  if (keep && now) { now.value = keep.v; if (keep.f) now.focus(); }

  // Tap the card to see your word; it turns back over after 3 seconds.
  el.querySelector('#im-flip')?.addEventListener('click', (e) => {
    flipped = !flipped;
    e.currentTarget.classList.toggle('up', flipped);
    clearTimeout(flipTimer);
    if (flipped) flipTimer = setTimeout(() => { flipped = false; el.querySelector('#im-flip')?.classList.remove('up'); }, 3000);
  });
  const fin = el.querySelector('#im-final');
  if (fin) fin.onsubmit = (e) => {
    e.preventDefault();
    const v = fin.querySelector('#im-final-text').value.trim();
    if (v) sendAction('game:guess', { text: v });
  };
  const form = el.querySelector('#im-form');
  if (form) {
    const input = form.querySelector('#im-text');
    if (!keep?.f) input.focus();
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!input.value.trim()) return;
      sendAction(s.phase === 'guess' ? 'game:guess' : 'game:clue', { text: input.value });
      form.querySelector('button').disabled = true;
    };
  }
  el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => sendAction('game:lean', { id: b.dataset.vote })));
  el.querySelector('#im-lock')?.addEventListener('click', () => { el.querySelector('#im-lock').disabled = true; sendAction('game:vote', { id: s.leans[me] }); });
}

const ordinal = (k) => `${k}${['th', 'st', 'nd', 'rd'][k % 100 > 10 && k % 100 < 14 ? 0 : Math.min(k % 10, 4) % 4] || 'th'}`;
