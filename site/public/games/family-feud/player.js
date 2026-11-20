// Phone view for Family Feud: pick a team, then type answers when it's your turn.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { feudStyles } from './styles.js';
import { teamName, boardHtml, strikesHtml, lastHtml } from './shared.js';

const answerForm = (id, button) => `
  <form id="${id}">
    <input class="big-text-input" id="ff-text" maxlength="40" autocomplete="off" placeholder="Your answer" required>
    <button class="btn btn-primary btn-big">${button}</button>
  </form>`;

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  feudStyles();
  if (!s.teams || s.phase === 'lobby') { el.innerHTML = '<p class="center muted">Setting up the stage…</p>'; return; }
  const team = ['red', 'blue'].find((t) => s.teams[t].includes(me)) || '';
  const isVip = players[0]?.id === me;
  const badge = team ? `<span class="ff-badge ${team}">${teamName(s, team)}</span>` : '';

  if (s.phase === 'setup') {
    setHtmlKeepingInputs(el, `
      <div class="ff ff-phone sheet">
        <h2>Pick your family</h2><p>${badge}</p>
        <div class="ff-actions">
          <button class="btn btn-red btn-big" data-team="red" ${team === 'red' ? 'disabled' : ''}>Join ${teamName(s, 'red')}</button>
          <button class="btn btn-blue btn-big" data-team="blue" ${team === 'blue' ? 'disabled' : ''}>Join ${teamName(s, 'blue')}</button>
        </div>
        ${team ? `<form id="ff-name"><label for="ff-name-in">Name your family</label>
          <input class="big-text-input" id="ff-name-in" maxlength="20" autocomplete="off" placeholder="Your family name">
          <button class="btn btn-${team}">Save name</button></form>` : ''}
        ${s.error ? `<p class="ff-error">${esc(s.error)}</p>` : ''}
        ${isVip ? '<div class="ff-actions"><button class="btn btn-primary btn-big" id="ff-begin">Start the show</button></div>' : '<p class="muted">The VIP or the TV starts the show.</p>'}
      </div>`);
    el.querySelectorAll('[data-team]').forEach((b) => (b.onclick = () => sendAction('game:join-team', { team: b.dataset.team })));
    el.querySelector('#ff-begin')?.addEventListener('click', () => sendAction('game:begin'));
    const nameForm = el.querySelector('#ff-name');
    if (nameForm) nameForm.onsubmit = (e) => {
      e.preventDefault();
      const input = el.querySelector('#ff-name-in');
      sendAction('game:team-name', { name: input.value });
      input.value = '';
    };
    return;
  }

  const other = s.control === 'red' ? 'blue' : 'red';
  let action = '';
  let headline = '';
  if (s.phase === 'faceoff') {
    const mine = s.faceoff.red === me || s.faceoff.blue === me;
    const done = (s.faceoff.done || []).includes(me);
    if (mine && !done) { headline = "You're in the face-off!"; action = answerForm('ff-form', 'Lock it in'); }
    else if (mine) headline = 'Locked in. Watch the TV.';
    else headline = `Face-off: ${esc(nameOf(s.faceoff.red, players))} vs ${esc(nameOf(s.faceoff.blue, players))}`;
  } else if (s.phase === 'play') {
    if (s.current === me) { headline = 'Your turn! Name an answer.'; action = answerForm('ff-form', 'Survey says…'); }
    else if (team === s.control) headline = `${esc(nameOf(s.current, players))} is guessing. Help them out!`;
    else headline = `${teamName(s, s.control)} is guessing. Get ready to steal!`;
  } else if (s.phase === 'steal') {
    if (team === other) { headline = 'Steal! Talk it over, then one of you types it.'; action = answerForm('ff-form', 'Steal it'); }
    else headline = `${teamName(s, other)} is trying to steal…`;
  } else if (s.phase === 'reveal') {
    headline = esc(s.message);
    if (isVip) action = '<div class="ff-actions"><button class="btn btn-primary btn-big" id="ff-next">Next round</button></div>';
  } else if (s.phase === 'over') {
    headline = s.winner === 'tie' ? "It's a tie!" : s.winner === team ? 'Your family wins! 🦃' : `${teamName(s, s.winner)} won`;
    if (isVip) action = '<div class="ff-actions"><button class="btn btn-primary btn-big" id="ff-new">Play again</button></div>';
  }

  setHtmlKeepingInputs(el, `
    <div class="ff ff-phone">
      <p>${badge} <span class="muted">${teamName(s, 'red')} ${s.scores.red} · ${teamName(s, 'blue')} ${s.scores.blue}</span></p>
      <h2>${headline}</h2>
      ${s.phase === 'play' ? `<p class="ff-msg">${lastHtml(s, players)}</p>` : ''}
      ${action}
      <p class="ff-q">${esc(s.question)}</p>
      ${boardHtml(s)}
      ${strikesHtml(s, false)}
    </div>`);

  const form = el.querySelector('#ff-form');
  if (form) {
    const type = s.phase === 'faceoff' ? 'game:faceoff' : s.phase === 'steal' ? 'game:steal' : 'game:guess';
    form.onsubmit = (e) => {
      e.preventDefault();
      const input = el.querySelector('#ff-text');
      if (!input.value.trim()) return;
      sendAction(type, { text: input.value });
      input.value = '';
    };
  }
  el.querySelector('#ff-next')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#ff-new')?.addEventListener('click', () => sendAction('game:new-game'));
}
