// Phone view for Secret Hitler: your hidden role plus whatever decision is yours to make.
import { esc, nameOf } from '../../js/ui.js';
import { shStyles, POWER_TEXT, lastVoteHtml } from './shared.js';

let roleShown = false;
const ROLE_NAME = { liberal: 'Liberal', fascist: 'Fascist', hitler: 'Hitler' };

export function renderPlayer(el, ctx) {
  const { state: s, priv = {}, me, players, sendAction } = ctx;
  shStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  const seated = s.seats.includes(me);
  const dead = s.dead.includes(me);
  const isVip = players[0]?.id === me;
  if (!seated) { el.innerHTML = '<div class="center"><div class="display-l">Watching</div><p class="muted">This game started before you joined.</p></div>'; return; }

  // ----- role card (hidden until tapped so nobody sees over your shoulder) -----
  const teamText = (priv.team || []).length
    ? `<p>Your team: ${priv.team.map((t) => `${n(t.id)}${t.role === 'hitler' ? ' (Hitler)' : ''}`).join(', ')}</p>`
    : priv.role === 'hitler' ? '<p>You don\'t know who the Fascists are. They know you.</p>' : '';
  const roleCard = roleShown || s.phase === 'roles'
    ? `<div class="sh-role ${priv.role}"><div>You are</div><h2>${ROLE_NAME[priv.role] || '…'}</h2>
        <div>Party: ${priv.role === 'liberal' ? 'Liberal' : 'Fascist'}</div>${teamText}
        ${s.phase !== 'roles' ? '<button class="btn btn-ghost" id="sh-hide" style="margin-top:.5rem">Hide</button>' : ''}</div>`
    : '<div class="sh-cover"><button class="btn btn-ghost" id="sh-show">Show my role</button></div>';

  let action = '';
  if (dead && s.phase !== 'over') {
    action = '<div class="display-l center">You were executed</div><p class="center muted">You can\'t vote or talk about your role. Watch the TV.</p>';
  } else switch (s.phase) {
    case 'roles':
      action = s.ready.includes(me)
        ? '<p class="center muted">Waiting for everyone to check their role…</p>'
        : '<button class="btn btn-primary btn-big" id="sh-ready" style="width:100%">Got it</button>';
      break;
    case 'nominate':
      if (me === s.president) {
        const alive = s.seats.filter((id) => !s.dead.includes(id));
        const eligible = alive.filter((id) => id !== s.president && id !== s.lastChancellor && !(alive.length > 5 && id === s.lastPresident));
        action = `<div class="display-l">You're President. Pick a Chancellor.</div>
          ${eligible.map((id) => `<button class="choice-btn" data-pick="${id}">${n(id)}</button>`).join('')}`;
      } else action = `<p class="center">${n(s.president)} is picking a Chancellor.</p>`;
      break;
    case 'vote': {
      const voted = s.voted.includes(me);
      action = `<div class="display-l center">${n(s.president)} as President, ${n(s.chancellor)} as Chancellor?</div>
        ${voted ? '<p class="center muted">Vote cast. You can change it until everyone votes.</p>' : ''}
        <div class="sh-vote"><button class="ja" data-vote="ja">Ja!</button><button class="nein" data-vote="nein">Nein</button></div>`;
      break;
    }
    case 'vote-result':
      action = `<div class="display-l center">${s.voteResult === 'passed' ? 'Elected!' : 'Vote failed'}</div><p class="center muted">You voted ${s.votes?.[me] === 'ja' ? 'Ja' : 'Nein'}.</p>
        ${isVip ? '<div class="row-center"><button class="btn btn-primary" id="sh-continue">Continue</button></div>' : ''}`;
      break;
    case 'president':
      action = me === s.president && priv.hand?.length === 3
        ? `<div class="display-l center">Discard one policy</div><p class="center muted">The other two go to ${n(s.chancellor)}.</p>
          <div class="sh-cards">${priv.hand.map((c, i) => `<button class="sh-policy ${c}" data-discard="${i}">${c === 'L' ? 'Liberal' : 'Fascist'}</button>`).join('')}</div>`
        : `<p class="center">${n(s.president)} is choosing a policy to discard.</p>`;
      break;
    case 'chancellor':
      action = me === s.chancellor && priv.hand?.length === 2
        ? `<div class="display-l center">Pass one policy</div>
          <div class="sh-cards">${priv.hand.map((c, i) => `<button class="sh-policy ${c}" data-enact="${i}">${c === 'L' ? 'Liberal' : 'Fascist'}</button>`).join('')}</div>
          ${s.fascist >= 5 && !s.vetoAsked ? '<div class="row-center"><button class="btn btn-ghost" id="sh-veto">Ask to veto both</button></div>' : ''}`
        : `<p class="center">${n(s.chancellor)} is choosing which policy to pass.</p>`;
      break;
    case 'veto':
      action = me === s.president
        ? `<div class="display-l center">${n(s.chancellor)} wants to veto</div><div class="row-center">
            <button class="btn btn-primary" data-veto="yes">Agree to veto</button><button class="btn btn-ghost" data-veto="no">Refuse</button></div>`
        : '<p class="center">Waiting for the President to answer the veto.</p>';
      break;
    case 'power':
      if (me !== s.president) { action = `<p class="center">${POWER_TEXT[s.power]}.</p>`; break; }
      if (s.power === 'peek') {
        action = `<div class="display-l center">Top 3 policies</div>
          <div class="sh-cards">${(priv.peek || []).map((c) => `<div class="sh-policy ${c}">${c === 'L' ? 'Liberal' : 'Fascist'}</div>`).join('')}</div>
          <button class="btn btn-primary btn-big" data-power="ok" style="width:100%">Done</button>`;
      } else {
        const targets = s.seats.filter((id) => id !== me && !s.dead.includes(id) && !(s.power === 'investigate' && s.investigated.includes(id)));
        const verb = { investigate: 'Investigate', 'special-election': 'Make President', execute: 'Execute' }[s.power];
        action = `<div class="display-l">${POWER_TEXT[s.power].replace('President', 'You')}</div>
          ${targets.map((id) => `<button class="choice-btn" data-power="${id}">${verb}: ${n(id)}</button>`).join('')}`;
      }
      break;
    case 'over':
      action = `<div class="display-l center">${s.winner === 'liberal' ? 'Liberals win!' : 'Fascists win!'}</div><p class="center">${esc(s.winReason)}</p>
        ${isVip ? '<div class="row-center"><button class="btn btn-primary btn-big" id="sh-again">Play again</button></div>' : ''}`;
      break;
  }

  const investigations = Object.entries(priv.investigations || {});
  el.innerHTML = `
    ${roleCard}
    <div style="margin-top:1rem">${action}</div>
    ${s.phase !== 'vote' && s.phase !== 'vote-result' ? lastVoteHtml(s, players) : ''}
    ${investigations.length ? `<p class="small muted" style="margin-top:1rem">Your investigations: ${investigations.map(([id, party]) => `${n(id)} is ${party}`).join('; ')}</p>` : ''}`;

  el.querySelector('#sh-show')?.addEventListener('click', () => { roleShown = true; renderPlayer(el, ctx); });
  el.querySelector('#sh-hide')?.addEventListener('click', () => { roleShown = false; renderPlayer(el, ctx); });
  el.querySelector('#sh-ready')?.addEventListener('click', () => sendAction('game:ready'));
  el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => sendAction('game:nominate', { id: b.dataset.pick })));
  el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => { sendAction('game:vote', { vote: b.dataset.vote }); el.querySelectorAll('[data-vote]').forEach((x) => x.classList.toggle('picked', x === b)); }));
  el.querySelector('#sh-continue')?.addEventListener('click', () => sendAction('game:continue'));
  el.querySelectorAll('[data-discard]').forEach((b) => (b.onclick = () => sendAction('game:discard', { index: Number(b.dataset.discard) })));
  el.querySelectorAll('[data-enact]').forEach((b) => (b.onclick = () => sendAction('game:enact', { index: Number(b.dataset.enact) })));
  el.querySelector('#sh-veto')?.addEventListener('click', () => sendAction('game:veto'));
  el.querySelectorAll('[data-veto]').forEach((b) => (b.onclick = () => sendAction('game:veto-answer', { accept: b.dataset.veto === 'yes' })));
  el.querySelectorAll('[data-power]').forEach((b) => (b.onclick = () => {
    if (s.power === 'execute' && !confirm(`Execute ${nameOf(b.dataset.power, players)}?`)) return;
    sendAction('game:power', b.dataset.power === 'ok' ? {} : { id: b.dataset.power });
  }));
  el.querySelector('#sh-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
