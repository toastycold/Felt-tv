// TV view for Mafia: the narrator. Never reveals a living player's role.
import { esc, nameOf } from '../../js/ui.js';
import { roleWithArticle } from './engine.js';
import { mafiaStyles, peopleHtml } from './shared.js';

export function renderBoard(el, { state: s, players, sendAction }) {
  mafiaStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  const aliveCount = s.seats.length - s.dead.length;
  let stage = '', below = '', buttons = '';

  const narr = s.narrator ? n(s.narrator) : '';
  const hold = s.narrator && !s.shown;
  switch (s.phase) {
    case 'setup':
      stage = `<div class="mf-stage night"><h2>Who's narrating?</h2>
        <p>${s.narrator ? `<b>${narr}</b> will narrate. They'll see every role and run the night, so they don't play.` : 'The TV narrates, so everyone plays. Or someone can tap <b>I\'ll narrate</b> on their phone to run the game themselves.'}</p></div>`;
      buttons = `${s.narrator ? '<button class="btn btn-ghost" id="mf-nonarr">Let the TV narrate</button>' : ''}<button class="btn btn-primary btn-big" id="mf-deal">Deal the roles</button>`;
      below = s.error ? `<p class="center" style="color:#ffb3ad;font-weight:700">${esc(s.error)}</p>` : '';
      break;
    case 'roles':
      stage = `<div class="mf-stage night"><h2>Welcome to town</h2><p>Check your secret role on your phone. Don't let anyone see. ${s.ready.length} of ${s.seats.length} ready.</p></div>`;
      buttons = '<button class="btn btn-ghost" id="mf-start">Start the first night</button>';
      below = peopleHtml(s, players);
      break;
    case 'night':
      stage = s.narrator
        ? `<div class="mf-stage night"><h2>Night ${s.day}</h2><p>Close your eyes and listen to ${narr}. Open them only when you're told to, and do your task on your phone.</p></div>`
        : `<div class="mf-stage night"><h2>Night ${s.day}</h2><p>Everyone, look at your phone and do your night task. Keep your poker face.</p></div>`;
      below = peopleHtml(s, players, { done: true });
      buttons = s.narrator ? `<span class="muted">${s.nightDone.length} of ${aliveCount} done</span>` : `<span class="muted">${s.nightDone.length} of ${aliveCount} done</span><button class="btn btn-ghost" id="mf-wake">Wake the town now</button>`;
      break;
    case 'morning': {
      const m = s.morning;
      if (hold) { stage = `<div class="mf-stage day"><h2>Morning in town</h2><p>${narr} has news about last night…</p></div>`; below = peopleHtml(s, players); break; }
      stage = m.killed
        ? `<div class="mf-stage death"><h2>${n(m.killed)} didn't survive the night</h2><p>They were ${m.role === 'mafia' ? 'a member of the Mafia' : roleWithArticle(m.role)}.</p></div>`
        : m.saved
          ? '<div class="mf-stage saved"><h2>Everyone woke up!</h2><p>The Mafia struck, but the Doctor got there first.</p></div>'
          : '<div class="mf-stage day"><h2>A quiet night</h2><p>Nobody was attacked.</p></div>';
      buttons = s.narrator ? '' : '<button class="btn btn-primary btn-big" id="mf-day">Start the day</button>';
      below = peopleHtml(s, players);
      break;
    }
    case 'day':
      stage = `<div class="mf-stage day"><h2>Day ${s.day}: who's the Mafia?</h2><p>Talk it over, then vote on your phone. Votes show up here as they come in.</p></div>`;
      below = peopleHtml(s, players, { votes: true });
      buttons = `<span class="muted">${Object.keys(s.votes).length} of ${aliveCount} voted${s.votes && Object.values(s.votes).includes('skip') ? ` · ${Object.values(s.votes).filter((v) => v === 'skip').length} skip` : ''}</span>
        ${s.narrator ? '' : '<button class="btn btn-ghost" id="mf-close">Close the vote</button>'}`;
      break;
    case 'verdict': {
      const v = s.verdict;
      if (hold) { stage = `<div class="mf-stage day"><h2>The votes are in</h2><p>${narr} will reveal the town's decision…</p></div>`; below = peopleHtml(s, players, { votes: true }); break; }
      stage = v.out
        ? `<div class="mf-stage death"><h2>The town voted out ${n(v.out)}</h2><p>They were ${v.role === 'mafia' ? 'Mafia! 🎉' : `${roleWithArticle(v.role)}… oops.`}</p></div>`
        : '<div class="mf-stage day"><h2>No decision</h2><p>The town couldn’t agree, so nobody was voted out.</p></div>';
      below = peopleHtml(s, players, { votes: true });
      buttons = s.narrator ? '' : '<button class="btn btn-primary btn-big" id="mf-night">Night falls…</button>';
      break;
    }
    case 'over':
      stage = s.winner === 'town'
        ? '<div class="mf-stage town-wins"><h2>The town wins!</h2><p>Every member of the Mafia has been found.</p></div>'
        : '<div class="mf-stage mafia-wins"><h2>The Mafia wins!</h2><p>They now control the town.</p></div>';
      below = peopleHtml(s, players);
      buttons = '<button class="btn btn-primary btn-big" id="mf-again">Play again</button>';
      break;
  }

  if (hold) s = { ...s, log: s.log.slice(1) };
  el.innerHTML = `<div class="mf">${stage}<div class="row-center" style="margin-bottom:1rem">${buttons}</div>${below}
    <ul style="list-style:none;padding:0;opacity:.8;margin-top:1rem">${s.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
  el.querySelector('#mf-deal')?.addEventListener('click', () => sendAction('game:deal'));
  el.querySelector('#mf-nonarr')?.addEventListener('click', () => sendAction('game:no-narrator'));
  el.querySelector('#mf-start')?.addEventListener('click', () => sendAction('game:start-now'));
  el.querySelector('#mf-wake')?.addEventListener('click', () => { if (confirm('Wake the town before everyone is done?')) sendAction('game:wake-up'); });
  el.querySelector('#mf-day')?.addEventListener('click', () => sendAction('game:start-day'));
  el.querySelector('#mf-close')?.addEventListener('click', () => sendAction('game:close-vote'));
  el.querySelector('#mf-night')?.addEventListener('click', () => sendAction('game:next-night'));
  el.querySelector('#mf-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
