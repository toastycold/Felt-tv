// Phone view for Mafia: your secret role and your night/day choices.
import { esc, nameOf } from '../../js/ui.js';
import { roleWithArticle } from './engine.js';
import { mafiaStyles, ROLE_BLURB } from './shared.js';



export function renderPlayer(el, ctx) {
  const { state: s, priv = {}, me, players, sendAction } = ctx;
  mafiaStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  if (s.phase === 'setup') {
    const isVip0 = players[0]?.id === me;
    const iNarrate = s.narrator === me;
    el.innerHTML = `<div class="center"><div class="display-l">${iNarrate ? "You're the narrator" : s.narrator ? `${n(s.narrator)} is narrating` : 'The TV is narrating'}</div>
      <p class="muted">The narrator sees every role and runs the night, so they don't play.</p>
      <div class="row-center"><button class="btn ${iNarrate ? 'btn-ghost' : 'btn-primary'} btn-big" id="mf-narrate">${iNarrate ? "Never mind, I'll play" : "I'll narrate"}</button></div>
      ${isVip0 || iNarrate ? '<div class="row-center" style="margin-top:.8rem"><button class="btn btn-primary btn-big" id="mf-deal">Deal the roles</button></div>' : ''}
      ${s.error ? `<p style="color:#ffb3ad;font-weight:700">${esc(s.error)}</p>` : ''}</div>`;
    el.querySelector('#mf-narrate').onclick = () => sendAction('game:narrate');
    el.querySelector('#mf-deal')?.addEventListener('click', () => sendAction('game:deal'));
    return;
  }
  if (s.narrator === me) return renderNarrator(el, ctx);
  if (!s.seats.includes(me)) { el.innerHTML = '<div class="center"><div class="display-l">Watching</div><p class="muted">This game started before you joined.</p></div>'; return; }
  const isVip = !s.narrator && players[0]?.id === me;
  const dead = s.dead.includes(me);
  const alive = s.seats.filter((id) => !s.dead.includes(id));
  const role = priv.role;

  const team = (priv.team || []).length ? `<p>Your Mafia team: ${priv.team.map(n).join(', ')}</p>` : '';
  const checks = Object.entries(priv.checks || {});
  const secrets = `${team}${checks.length ? `<p><b>Your investigations:</b> ${checks.map(([id, r]) => `${n(id)} is ${r}`).join('; ')}</p>` : ''}`;
  const card = `<div class="mf-role ${role}"><div>You are</div><h2>${roleWithArticle(role) || '…'}</h2><div>${ROLE_BLURB[role] || ''}</div>${secrets}</div>`;
  // Your role shows until you tap "Got it". After that it's hidden; press and hold to peek.
  const openCard = (s.phase === 'roles' && !s.ready.includes(me)) || s.phase === 'over';
  const roleCard = openCard ? card
    : `<div class="mf-peekbox"><div class="mf-peek-card" hidden>${card}</div>
        <div class="mf-cover"><button class="btn btn-ghost mf-peek">Hold to see your role</button></div></div>`;

  let action = '';
  if (dead && s.phase !== 'over') {
    action = '<div class="display-l center">You’re dead</div><p class="center muted">No talking about your role! You can still watch.</p>';
  } else switch (s.phase) {
    case 'roles':
      action = s.ready.includes(me) ? '<p class="center muted">Waiting for everyone…</p>' : '<button class="btn btn-primary btn-big" id="mf-ready" style="width:100%">Got it</button>';
      break;
    case 'night': {
      if (s.nightDone.includes(me) || priv.night !== s.day) {
        action = '<div class="display-l center">Done for tonight</div><p class="center muted">Keep a straight face.</p>';
        break;
      }
      // Every role sees the same question and the same list, so a peek at someone's phone gives nothing away.
      // Mafia only: a tiny dot next to a name for each teammate who picked them, and a faint mark on teammates.
      const picks = priv.task === 'kill' ? priv.mafiaPicks || {} : {};
      const dots = {};
      for (const [who, t] of Object.entries(picks)) if (who !== me) dots[t] = (dots[t] || 0) + 1;
      const mate = new Set(priv.task === 'kill' ? priv.team || [] : []);
      action = `<div class="display-l">Who do you suspect?</div>
        ${priv.note ? `<p class="small muted">${esc(priv.note)}</p>` : ''}
        ${alive.map((id) => `<button class="choice-btn mf-pick" data-pick="${id}">${n(id)}${id === me ? ' (you)' : ''}${mate.has(id) ? '<i class="mf-mate"></i>' : ''}${'<i class="mf-dot"></i>'.repeat(dots[id] || 0)}</button>`).join('')}`;
      break;
    }
    case 'morning':
      action = '<p class="center">Look at the TV.</p>';
      break;
    case 'day': {
      const locked = s.votes[me];
      const lean = s.leans?.[me];
      const label = (id) => (id === 'skip' ? 'skip today' : n(id));
      if (locked) {
        action = `<div class="display-l">Vote locked in</div><p class="center">You voted ${locked === 'skip' ? 'to skip' : `for <b>${n(locked)}</b>`}.</p><p class="center muted">Waiting for the town…</p>`;
        break;
      }
      action = `<div class="display-l">Vote someone out</div>
        <p class="small muted">Tap a name (the TV shows it), then lock it in. Locked votes can't change.</p>
        ${alive.filter((id) => id !== me).map((id) => `<button class="choice-btn mf-pick ${lean === id ? 'picked' : ''}" data-vote="${id}">${n(id)}</button>`).join('')}
        <button class="choice-btn mf-pick ${lean === 'skip' ? 'picked' : ''}" data-vote="skip">Skip, nobody today</button>
        ${lean ? `<button class="btn btn-primary btn-big mf-lock" id="mf-lock">Lock in: ${label(lean)}</button>` : ''}`;
      break;
    }
    case 'verdict':
      action = '<p class="center">Look at the TV.</p>';
      break;
    case 'over':
      action = `<div class="display-l center">${s.winner === 'town' ? 'The town wins!' : 'The Mafia wins!'}</div>`
        + (isVip ? '<div class="row-center"><button class="btn btn-primary btn-big" id="mf-again">Play again</button></div>' : '');
      break;
  }

  el.innerHTML = `${roleCard}<div style="margin-top:1rem">${action}</div>`;

  const peek = el.querySelector('.mf-peek');
  if (peek) {
    const box = el.querySelector('.mf-peek-card');
    const show = (e) => { e.preventDefault(); box.hidden = false; };
    const hide = () => { box.hidden = true; };
    peek.addEventListener('pointerdown', show);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((t) => peek.addEventListener(t, hide));
    peek.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  el.querySelector('#mf-ready')?.addEventListener('click', () => sendAction('game:ready'));
  el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
    el.querySelectorAll('[data-pick]').forEach((x) => (x.disabled = true));
    sendAction('game:night', { id: b.dataset.pick });
  }));
  el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => sendAction('game:lean', { id: b.dataset.vote })));
  el.querySelector('#mf-lock')?.addEventListener('click', () => { el.querySelector('#mf-lock').disabled = true; sendAction('game:vote', { id: s.leans[me] }); });
  el.querySelector('#mf-day')?.addEventListener('click', () => sendAction('game:start-day'));
  el.querySelector('#mf-night')?.addEventListener('click', () => sendAction('game:next-night'));
  el.querySelector('#mf-again')?.addEventListener('click', () => sendAction('game:play-again'));
}

// ---------- the narrator's phone: sees everything, runs the show ----------
function renderNarrator(el, ctx) {
  const { state: s, priv = {}, players, sendAction } = ctx;
  const n = (id) => esc(nameOf(id, players));
  const roles = priv.roles || {};
  const alive = s.seats.filter((id) => !s.dead.includes(id));
  const ofRole = (r) => alive.filter((id) => roles[id] === r);
  const btn = (id, label, primary = true) => `<button class="btn ${primary ? 'btn-primary' : 'btn-ghost'} btn-big" id="${id}" style="width:100%;margin:.3rem 0">${label}</button>`;
  let body = '';
  switch (s.phase) {
    case 'roles':
      body = `<p>${s.ready.length} of ${s.seats.length} have checked their role.</p>${btn('mf-start', 'Start the first night')}`;
      break;
    case 'night': {
      // Everyone's pick tonight, real tasks and cover taps alike.
      const picks = { ...(priv.suspects || {}), ...(priv.mafiaPicks || {}) };
      for (const id of ofRole('doctor')) if (priv.save) picks[id] = priv.save;
      for (const id of ofRole('detective')) if (priv.check) picks[id] = priv.check;
      const what = { mafia: 'kill', doctor: 'save', detective: 'check', villager: 'suspects' };
      const order = ['mafia', 'doctor', 'detective', 'villager'];
      const rows = [...alive].sort((a, b) => order.indexOf(roles[a]) - order.indexOf(roles[b])).map((id) => {
        const t = picks[id];
        const extra = roles[id] === 'detective' && t ? ` → <b>${roles[t] === 'mafia' ? 'Mafia' : 'not Mafia'}</b>` : roles[id] === 'doctor' && priv.lastSaved ? ` <span class="muted">(can't save ${n(priv.lastSaved)} again)</span>` : '';
        return `<li><b>${n(id)}</b> <span class="muted">${ROLE_NAME[roles[id]]}, ${what[roles[id]]}</span>: ${t ? n(t) : '<span class="muted">waiting…</span>'}${extra}</li>`;
      }).join('');
      body = `<ul class="mf-script">${rows}</ul>
        <p>${s.nightDone.length} of ${alive.length} phones done.</p>
        ${btn('mf-wake', s.nightDone.length >= alive.length ? 'Morning! See what happened' : 'End the night now', s.nightDone.length >= alive.length)}`;
      break;
    }
    case 'morning': {
      const m = s.morning;
      body = `<div class="mf-note"><b>${m.killed ? `${n(m.killed)} was killed (${ROLE_NAME[m.role]})` : m.saved ? `The Mafia attacked ${n(m.savedWho)}, but the Doctor saved them` : 'Nobody was attacked'}</b></div>
        <p class="muted">Tell the story your way, then put it on the TV.</p>
        ${s.shown ? '' : btn('mf-show', 'Show it on the TV')}${btn('mf-day', 'Start the day', s.shown)}`;
      break;
    }
    case 'day': {
      const rows = alive.map((id) => {
        const v = s.votes[id], l = s.leans?.[id];
        const who = (t) => (t === 'skip' ? 'skip' : n(t));
        return `<li><b>${n(id)}</b> <span class="muted">${ROLE_NAME[roles[id]]}</span>: ${v ? `<b>${who(v)}</b> 🔒` : l ? `${who(l)} <span class="muted">(not locked)</span>` : '<span class="muted">thinking…</span>'}</li>`;
      }).join('');
      body = `<p>${Object.keys(s.votes).length} of ${alive.length} locked in. More than half on one name ends the vote.</p><ul class="mf-script">${rows}</ul>${btn('mf-close', 'Close the vote', false)}`;
      break;
    }
    case 'verdict': {
      const v = s.verdict;
      body = `<div class="mf-note"><b>${v.out ? `${n(v.out)} is voted out (${ROLE_NAME[v.role]})` : 'No decision, nobody is out'}</b></div>
        ${s.shown ? '' : btn('mf-show', 'Reveal on the TV')}${btn('mf-night', 'Night falls…', s.shown)}`;
      break;
    }
    case 'over':
      body = `<div class="display-l center">${s.winner === 'town' ? 'The town wins!' : 'The Mafia wins!'}</div>${btn('mf-again', 'Play again')}`;
      break;
  }
  el.innerHTML = `<div class="mf-role narrator"><div>You are</div><h2>the Narrator</h2><div>Only you can see this screen.</div></div>
    <div style="margin-top:.8rem">${body}</div>
    <div class="mf-note" style="margin-top:.8rem"><b>Who's who</b><br>${s.seats.map((id) => `${s.dead.includes(id) ? '<s>' : ''}${n(id)}: ${ROLE_NAME[roles[id]] || '?'}${s.dead.includes(id) ? '</s>' : ''}`).join('<br>')}</div>`;
  const on = (id, action) => el.querySelector(`#${id}`)?.addEventListener('click', () => sendAction(action));
  on('mf-start', 'game:start-now'); on('mf-wake', 'game:wake-up'); on('mf-show', 'game:show'); on('mf-day', 'game:start-day');
  on('mf-close', 'game:close-vote'); on('mf-night', 'game:next-night'); on('mf-again', 'game:play-again');
}
const ROLE_NAME = { mafia: 'Mafia', doctor: 'Doctor', detective: 'Detective', villager: 'Villager' };
