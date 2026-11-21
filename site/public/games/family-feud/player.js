// Phone view for Family Feud: pick a team, then type answers when it's your turn.
import { esc, nameOf, setHtmlKeepingInputs } from '../../js/ui.js';
import { feudStyles } from './styles.js';
import { teamName, boardHtml, strikesHtml, lastHtml, fmBoardHtml, runFmClock } from './shared.js';

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

  if (s.phase === 'fm') { renderFastMoney(el, s, me, players, sendAction, team, isVip); return; }
  runFmClock(s);

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
    if (isVip) action = `<div class="ff-actions">${s.winner !== 'tie' ? '<button class="btn btn-primary btn-big" id="ff-fm">Play Fast Money!</button>' : ''}
      <button class="btn ${s.winner === 'tie' ? 'btn-primary btn-big' : 'btn-ghost'}" id="ff-new">Play again</button></div>`;
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
  el.querySelector('#ff-fm')?.addEventListener('click', () => sendAction('game:fast-money'));
}

let fmKey = '';
function renderFastMoney(el, s, me, players, sendAction, team, isVip) {
  const fm = s.fm;
  const name = (id) => esc(nameOf(id, players));
  const step = fm.step;
  const playing = (step === 'play1' && me === fm.p1) || (step === 'play2' && me === fm.p2);
  const hideFromMe = me === fm.p2 && fm.p1 !== fm.p2 && ['ready1', 'play1', 'reveal1'].includes(step);
  let body = '';

  if (playing) {
    const qi = fm.order[0];
    const key = `${step}:${qi}:${fm.dup?.k || 0}`;
    if (fmKey === key && el.querySelector('#fm-form')) return;   // keep the keyboard up while typing
    fmKey = key;
    el.innerHTML = `<div class="ff ff-phone">
      <p><span class="fm-clock" data-fm-clock></span></p>
      <p class="muted">Question ${5 - fm.order.length + 1} of 5</p>
      <p class="ff-q">${esc(fm.qs[qi])}</p>
      ${fm.dup ? `<p class="fm-dup">Duplicate! Try another answer.</p>` : ''}
      <form id="fm-form"><input class="big-text-input" id="fm-text" maxlength="40" autocomplete="off" autocapitalize="off" placeholder="Your answer" enterkeyhint="next">
        <button class="btn btn-primary btn-big">Answer</button>
        <button type="button" class="btn btn-ghost fm-pass" id="fm-pass">Pass (come back to it)</button></form></div>`;
    runFmClock(s);
    const input = el.querySelector('#fm-text');
    input.focus();
    el.querySelector('#fm-form').onsubmit = (e) => { e.preventDefault(); if (input.value.trim()) sendAction('game:fm-answer', { q: qi, text: input.value }); };
    el.querySelector('#fm-pass').onclick = () => sendAction('game:fm-answer', { q: qi, text: '' });
    return;
  }
  fmKey = '';

  if (hideFromMe) {
    body = `<div class="fm-cover">Look away from the TV and cover your ears!<br><br>${name(fm.p1)} is answering. You're up next.</div>`;
  } else if (step === 'pick') {
    const mine = team === fm.team;
    const picked = [fm.p1, fm.p2].includes(me);
    body = `<h2>Fast Money!</h2>
      ${mine && !picked ? '<p>Your family needs two players.</p><div class="ff-actions"><button class="btn btn-primary btn-big" id="fm-join">I\'ll play</button></div>'
        : mine ? `<p>You're player ${fm.p1 === me ? 1 : 2}! Waiting for one more…</p>` : `<p>${teamName(s, fm.team)} is picking two players.</p>`}`;
  } else if (step === 'ready1' || step === 'ready2') {
    const up = step === 'ready1' ? fm.p1 : fm.p2;
    body = up === me
      ? `<h2>You're up!</h2><p>${step === 'ready1' ? '20' : '25'} seconds for 5 questions. Type fast! Pass if you're stuck and come back to it.</p>
         ${step === 'ready2' ? `<p>Don't repeat ${fm.p1 === fm.p2 ? 'your first' : `${name(fm.p1)}'s`} answers.</p>` : ''}
         <div class="ff-actions"><button class="btn btn-primary btn-big" id="fm-start">Start my clock</button></div>`
      : `<h2>${name(up)} is about to play Fast Money</h2>`;
  } else if (step === 'play1' || step === 'play2') {
    body = `<h2>${name(s.current)} is answering…</h2><p><span class="fm-clock" data-fm-clock></span></p>`;
  } else if (step === 'reveal1' || step === 'reveal2') {
    body = '<h2>Survey says…</h2><p>Watch the TV!</p>';
  } else if (step === 'done') {
    body = `<h2>${fm.won ? '🎉 Fast Money won! 🎉' : `${fm.total} points. So close!`}</h2>
      ${isVip ? '<div class="ff-actions"><button class="btn btn-primary btn-big" id="ff-new">Play again</button></div>' : ''}`;
  }
  el.innerHTML = `<div class="ff ff-phone">${body}${hideFromMe || step === 'pick' ? '' : fmBoardHtml(s, players)}</div>`;
  runFmClock(s);
  el.querySelector('#fm-join')?.addEventListener('click', () => sendAction('game:fm-join'));
  el.querySelector('#fm-start')?.addEventListener('click', () => sendAction('game:fm-start'));
  el.querySelector('#ff-new')?.addEventListener('click', () => sendAction('game:new-game'));
}
