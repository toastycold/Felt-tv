// Phone view for Mafia: your secret role and your night/day choices.
import { esc, nameOf } from '../../js/ui.js';
import { roleWithArticle } from './engine.js';
import { mafiaStyles, ROLE_BLURB } from './shared.js';

let roleShown = false;

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
  const roleCard = roleShown || s.phase === 'roles' || s.phase === 'over'
    ? `<div class="mf-role ${role}"><div>You are</div><h2>${roleWithArticle(role) || '…'}</h2><div>${ROLE_BLURB[role] || ''}</div>${team}
        ${s.phase !== 'roles' && s.phase !== 'over' ? '<div><button class="btn btn-ghost" id="mf-hide" style="margin-top:.5rem">Hide</button></div>' : ''}</div>`
    : '<div class="mf-cover"><button class="btn btn-ghost" id="mf-show">Show my role</button></div>';

  let action = '';
  if (dead && s.phase !== 'over') {
    action = '<div class="display-l center">You’re dead</div><p class="center muted">No talking about your role! You can still watch.</p>';
  } else switch (s.phase) {
    case 'roles':
      action = s.ready.includes(me) ? '<p class="center muted">Waiting for everyone…</p>' : '<button class="btn btn-primary btn-big" id="mf-ready" style="width:100%">Got it</button>';
      break;
    case 'night': {
      if (s.nightDone.includes(me) || priv.night !== s.day) {
        action = `<div class="display-l center">Done for tonight</div>${priv.pick ? `<p class="center muted">You picked ${n(priv.pick)}.</p>` : ''}<p class="center muted">Keep a straight face.</p>`;
        break;
      }
      const prompts = {
        kill: ['Who should the Mafia eliminate?', (id) => !(priv.team || []).includes(id) && id !== me],
        save: ['Who will you protect tonight?', () => true],
        check: ['Who will you investigate?', (id) => id !== me],
        suspect: ['Who do you suspect most?', (id) => id !== me],
      };
      const [title, allowed] = prompts[priv.task] || ['Waiting…', () => false];
      const picks = priv.mafiaPicks || {};
      action = `<div class="display-l">${title}</div>
        ${priv.task === 'kill' && Object.keys(picks).length ? `<p class="small muted">Team picks: ${Object.entries(picks).map(([who, t]) => `${n(who)} → ${n(t)}`).join(', ')}</p>` : ''}
        ${alive.filter(allowed).map((id) => `<button class="choice-btn mf-pick" data-pick="${id}">${n(id)}${id === me ? ' (you)' : ''}</button>`).join('')}`;
      break;
    }
    case 'morning':
      action = '<p class="center">Look at the TV.</p>' + (isVip ? '<div class="row-center"><button class="btn btn-primary" id="mf-day">Start the day</button></div>' : '');
      break;
    case 'day': {
      const mine = s.votes[me];
      action = `<div class="display-l">Vote someone out</div>
        <p class="small muted">${mine ? `You voted ${mine === 'skip' ? 'to skip' : `for ${n(mine)}`}. You can change it until everyone votes.` : 'Everyone can see your vote on the TV.'}</p>
        ${alive.filter((id) => id !== me).map((id) => `<button class="choice-btn mf-pick ${mine === id ? 'picked' : ''}" data-vote="${id}">${n(id)}</button>`).join('')}
        <button class="choice-btn mf-pick ${mine === 'skip' ? 'picked' : ''}" data-vote="skip">Skip, nobody today</button>`;
      break;
    }
    case 'verdict':
      action = '<p class="center">Look at the TV.</p>' + (isVip ? '<div class="row-center"><button class="btn btn-primary" id="mf-night">Night falls…</button></div>' : '');
      break;
    case 'over':
      action = `<div class="display-l center">${s.winner === 'town' ? 'The town wins!' : 'The Mafia wins!'}</div>`
        + (isVip ? '<div class="row-center"><button class="btn btn-primary btn-big" id="mf-again">Play again</button></div>' : '');
      break;
  }

  const checks = Object.entries(priv.checks || {});
  el.innerHTML = `${roleCard}<div style="margin-top:1rem">${action}</div>
    ${checks.length ? `<div class="mf-note"><strong>Your investigations:</strong> ${checks.map(([id, r]) => `${n(id)} is ${r}`).join('; ')}</div>` : ''}`;

  el.querySelector('#mf-show')?.addEventListener('click', () => { roleShown = true; renderPlayer(el, ctx); });
  el.querySelector('#mf-hide')?.addEventListener('click', () => { roleShown = false; renderPlayer(el, ctx); });
  el.querySelector('#mf-ready')?.addEventListener('click', () => sendAction('game:ready'));
  el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
    el.querySelectorAll('[data-pick]').forEach((x) => (x.disabled = true));
    sendAction('game:night', { id: b.dataset.pick });
  }));
  el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => sendAction('game:vote', { id: b.dataset.vote })));
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
      const picks = priv.mafiaPicks || {};
      const line = (label, who, pick, extra = '') => `<li><b>${label}</b> ${who.map(n).join(', ') || '<span class="muted">nobody alive</span>'}: ${pick ? n(pick) : '<span class="muted">waiting…</span>'}${extra}</li>`;
      const mafiaPick = Object.values(picks);
      const check = priv.check;
      body = `<p class="muted">Script: “Everyone close your eyes… Mafia, open your eyes and choose…”</p>
        <ul class="mf-script">
          <li><b>Mafia</b> ${ofRole('mafia').map(n).join(', ')}: ${mafiaPick.length ? Object.entries(picks).map(([a, t]) => `${n(a)} → ${n(t)}`).join(', ') : '<span class="muted">waiting…</span>'}</li>
          ${line('Doctor', ofRole('doctor'), priv.save, priv.lastSaved ? ` <span class="muted">(can't save ${n(priv.lastSaved)} again)</span>` : '')}
          ${line('Detective', ofRole('detective'), check, check ? ` → <b>${roles[check] === 'mafia' ? 'Mafia' : 'not Mafia'}</b>` : '')}
        </ul>
        <p>${s.nightDone.length} of ${alive.length} phones done.</p>
        ${btn('mf-wake', s.nightDone.length >= alive.length ? 'Morning! See what happened' : 'End the night now', s.nightDone.length >= alive.length)}`;
      break;
    }
    case 'morning': {
      const m = s.morning;
      body = `<div class="mf-note"><b>${m.killed ? `${n(m.killed)} was killed (${ROLE_NAME[m.role]})` : m.saved ? 'The Mafia attacked, but the Doctor saved them' : 'Nobody was attacked'}</b></div>
        <p class="muted">Tell the story your way, then put it on the TV.</p>
        ${s.shown ? '' : btn('mf-show', 'Show it on the TV')}${btn('mf-day', 'Start the day', s.shown)}`;
      break;
    }
    case 'day':
      body = `<p>${Object.keys(s.votes).length} of ${alive.length} have voted. Votes show on the TV as they come in.</p>${btn('mf-close', 'Close the vote', false)}`;
      break;
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
