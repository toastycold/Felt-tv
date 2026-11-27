// Phone view for Imposter: your secret word (or the Imposter screen), your clue, your vote.
import { esc, nameOf } from '../../js/ui.js';
import { imposterStyles } from './shared.js';

let typingKey = '';

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  imposterStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  const playing = s.order?.includes(me);
  // Same-looking cover for everyone; hold it to see your word (or that you're the Imposter).
  const secret = priv.imposter
    ? `<div class="im-secret imp"><div><div class="w">You're the Imposter!</div><div class="c">Category: ${esc(priv.category)}. Blend in.</div></div></div>`
    : `<div class="im-secret"><div><div class="c">The secret word is</div><div class="w">${esc(priv.word || '')}</div><div class="c">Category: ${esc(priv.category || '')}</div></div></div>`;
  const cover = `<div class="im-peek"><div class="im-peek-card" hidden>${secret}</div>
    <div class="im-secret"><button class="btn btn-ghost im-hold">Hold to see your word</button></div></div>`;

  let body = '';
  const typing = (key, label, placeholder, action) => {
    if (typingKey === key && el.querySelector('#im-form')) return true;   // keep the keyboard up
    typingKey = key;
    body = `${cover}<form id="im-form"><h2>${label}</h2>
      ${priv.note ? `<p class="small muted">${esc(priv.note)}</p>` : ''}
      <input class="big-text-input" id="im-text" maxlength="30" autocomplete="off" autocapitalize="off" placeholder="${placeholder}">
      <button class="btn btn-primary btn-big">${action}</button></form>`;
    return false;
  };

  if (!playing && ['clues', 'vote', 'guess'].includes(s.phase)) body = '<h2>Watching this round</h2><p class="muted">You joined partway through. You\'re in next round.</p>';
  else switch (s.phase) {
    case 'clues':
      if (s.order[s.turn] === me) { if (typing(`clue:${s.round}:${priv.note || ''}`, 'Your turn! Give one word.', 'One-word clue', 'Give clue')) return; }
      else body = `${cover}<h2>${n(s.order[s.turn])} is giving a clue</h2><p class="muted">${s.clues[me] ? `Your clue: <b>${esc(s.clues[me])}</b>` : `You go ${ordinal(s.order.indexOf(me) + 1)}.`}</p>`;
      break;
    case 'vote': {
      const locked = s.votes[me];
      const lean = s.leans?.[me];
      if (locked) { body = `${cover}<h2>Vote locked in</h2><p>You voted for <b>${n(locked)}</b>.</p>`; break; }
      body = `${cover}<h2>Who's the Imposter?</h2><p class="small muted">Tap a name (the TV shows it), then lock it in.</p>
        ${s.order.filter((id) => id !== me).map((id) => `<button class="choice-btn ${lean === id ? 'picked' : ''}" data-vote="${id}">${n(id)}<small>${esc(s.clues[id] || 'no clue')}</small></button>`).join('')}
        ${lean ? `<button class="btn btn-primary btn-big im-lock" id="im-lock">Lock in: ${n(lean)}</button>` : ''}`;
      break;
    }
    case 'guess':
      if (priv.imposter) { if (typing(`guess:${s.round}`, "You've been caught! Guess the word to win anyway.", 'The secret word', 'Guess')) return; }
      else body = `${cover}<h2>${n(s.accused)} is guessing the word…</h2>`;
      break;
    case 'reveal':
      body = `<h2>The word was ${esc(s.word)}</h2><p class="muted">Look at the TV.</p>`;
      break;
    case 'over':
      body = '<h2>Game over!</h2><p class="muted">Final scores are on the TV.</p>';
      break;
  }
  if (!body.includes('im-form')) typingKey = '';
  el.innerHTML = `<div class="im-phone">${body}</div>`;

  const hold = el.querySelector('.im-hold');
  if (hold) {
    const card = el.querySelector('.im-peek-card');
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); card.hidden = false; });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((t) => hold.addEventListener(t, () => { card.hidden = true; }));
    hold.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  const form = el.querySelector('#im-form');
  if (form) {
    const input = form.querySelector('#im-text');
    input.focus();
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
