// TV view for Imposter: the category, everyone's clues in turn, the vote and the big reveal.
import { esc, nameOf, scoreboard } from '../../js/ui.js';
import { spriteHtml } from '../../js/people.js';
import { imposterStyles } from './shared.js';

export function renderBoard(el, { state: s, players, sendAction }) {
  imposterStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const n = (id) => esc(nameOf(id, players));
  const person = (id) => players.find((p) => p.id === id)?.person;
  const voters = {};
  for (const [v, t] of Object.entries(s.votes || {})) if (t !== '-') (voters[t] ||= []).push({ v, locked: true });
  for (const [v, t] of Object.entries(s.leans || {})) (voters[t] ||= []).push({ v, locked: false });
  const cards = () => `<div class="im-clues">${s.order.map((id, i) => {
    const clue = s.clues[id];
    const now = s.phase === 'clues' && i === s.turn;
    return `<div class="im-card ${now ? 'now' : ''} ${s.phase === 'clues' && i > s.turn ? 'later' : ''} ${s.phase === 'reveal' && id === s.imposter ? 'caught' : ''}">
      <div class="im-name">${spriteHtml(person(id), now ? 'thinking' : 'idle', 48)}<span>${n(id)}</span></div>
      <div class="im-clue">${clue ? esc(clue) : now ? '<i>thinking…</i>' : s.phase === 'clues' ? '' : '<i>no clue</i>'}</div>
      ${(voters[id] || []).length ? `<div class="im-chips">${voters[id].map((x) => `<span class="im-chip ${x.locked ? '' : 'lean'}">${n(x.v)}${x.locked ? ' 🔒' : ''}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('')}</div>`;
  const rows = () => [...players].sort((a, b) => (s.scores[b.id] || 0) - (s.scores[a.id] || 0)).map((p) => ({ name: p.name, score: s.scores[p.id] || 0 }));
  const head = `<div class="im-head"><div class="im-cat"><small>Round ${s.round} of ${s.total} · the category is</small>${esc(s.category)}</div></div>`;
  let body = '', actions = '';
  switch (s.phase) {
    case 'clues':
      body = `${head}<div class="im-say">${n(s.order[s.turn])}, give a one-word clue on your phone.</div>${cards()}`;
      actions = '<button class="btn btn-ghost" id="im-skip">Skip this turn</button>';
      break;
    case 'vote': {
      const locked = Object.values(s.votes).filter((t) => t !== '-').length;
      body = `${head}<div class="im-say">Who's the Imposter? Talk it over, then vote on your phone. ${locked} of ${s.order.length} locked in.</div>${cards()}`;
      actions = '<button class="btn btn-ghost" id="im-close">Close the vote</button>';
      break;
    }
    case 'guess':
      body = `<div class="im-big">You caught <b>${n(s.accused)}</b>!</div>
        <div class="im-result">But they can still win: ${n(s.accused)}, guess the secret word on your phone…</div>${cards()}`;
      break;
    case 'reveal': {
      const res = {
        caught: [`${n(s.imposter)} was the Imposter, and guessed "${esc(s.guess)}". Wrong! Everyone else scores.`, 'win'],
        guessed: [s.accused ? `${n(s.imposter)} was caught, but guessed the word! The Imposter wins.` : `${n(s.imposter)}, the Imposter, figured out the word! The Imposter wins.`, 'lose'],
        wrong: [`${n(s.accused)} wasn't the Imposter! ${n(s.imposter)} got away with it.`, 'lose'],
        blurted: [`${n(s.imposter)}, the Imposter, guessed "${esc(s.guess)}" early. Wrong! Everyone else scores.`, 'win'],
        tie: [`The vote was split, so ${n(s.imposter)}, the Imposter, slipped away.`, 'lose'],
      }[s.result] || ['', ''];
      body = `<div class="im-big">The word was <b>${esc(s.word)}</b></div><div class="im-result ${res[1]}">${res[0]}</div>${cards()}
        <div style="margin-top:1rem">${scoreboard(rows())}</div>`;
      actions = `<button class="btn btn-primary btn-big" id="im-next">${s.round >= s.total ? 'Final scores' : 'Next round'}</button>`;
      break;
    }
    case 'over':
      body = `<div class="im-big">Final scores</div>${scoreboard(rows())}`;
      actions = '<button class="btn btn-primary btn-big" id="im-again">Play again</button>';
      break;
  }
  el.innerHTML = `<div class="im">${body}<div class="im-actions">${actions}</div></div>`;
  const on = (id, a) => el.querySelector(id)?.addEventListener('click', () => sendAction(a));
  on('#im-skip', 'game:skip-turn'); on('#im-close', 'game:close-vote'); on('#im-next', 'game:next'); on('#im-again', 'game:again');
}
