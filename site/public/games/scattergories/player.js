// Phone view for Scattergories.
import { esc, setHtmlKeepingInputs, countdown, scoreboard } from '../../js/ui.js';
import { scatterStyles, answerCards } from './board.js';
import { PER_ROUND } from './engine.js';

let saveTimer = null;
let shownRound = 0;

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  scatterStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  const isVip = players[0]?.id === me;
  let html;

  if (s.phase === 'answer') {
    const saved = priv.round === s.round ? priv.answers || [] : [];
    const inputs = [...el.querySelectorAll('.sg-phone-list input')];
    // Fill from saved answers on a fresh round, or after a refresh once they arrive.
    const firstRender = shownRound !== s.round || !inputs.length || (inputs.every((i) => !i.value) && saved.some(Boolean));
    shownRound = s.round;
    if (s.submitted[me]) {
      html = `<div class="center"><div class="display-l">Done!</div><p class="muted">Waiting for the timer or the others.</p>
        <button class="btn btn-ghost" id="sg-edit">Keep editing</button></div>`;
    } else {
      html = `<div class="row-center" style="justify-content:space-between"><div class="display-l" style="margin:0">Letter ${s.letter}</div>${countdown(s.deadline)}</div>
        <div class="sg-phone-list">${s.categories.map((c, k) => `
          <label>${k + 1}. ${esc(c)}<input id="sg-${k}" maxlength="40" autocomplete="off" autocapitalize="words" ${firstRender ? `value="${esc(saved[k] || '')}" data-reset="1"` : ''}></label>`).join('')}
        </div>
        <button class="btn btn-primary btn-big" id="sg-done" style="width:100%;margin-top:1rem">I'm done</button>`;
    }
  } else if (s.phase === 'review') {
    html = `<p class="muted center">Category ${s.review + 1} of ${PER_ROUND} · ${s.letter}</p>
      <div class="display-l center">${esc(s.categories[s.review])}</div>
      <div class="stack">${answerCards(s, players, { phone: true, me })}</div>
      ${isVip ? `<div class="row-center" style="margin-top:1rem"><button class="btn btn-primary btn-big" id="sg-next">${s.review < PER_ROUND - 1 ? 'Next category' : 'Score the round'}</button></div>` : ''}`;
  } else {
    html = `<div class="display-l center">${s.phase === 'over' ? 'Final scores' : `Round ${s.round}: +${s.roundPoints[me] ?? 0}`}</div>
      ${scoreboard(players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 })))}
      ${isVip ? `<div class="row-center"><button class="btn btn-primary btn-big" id="${s.phase === 'over' ? 'sg-again' : 'sg-round'}">${s.phase === 'over' ? 'Play again' : 'Next round'}</button></div>` : ''}`;
  }

  setHtmlKeepingInputs(el, html);

  const collect = () => Array.from({ length: PER_ROUND }, (_, k) => el.querySelector(`#sg-${k}`)?.value || '');
  el.querySelectorAll('.sg-phone-list input').forEach((input) => {
    delete input.dataset.reset;
    input.oninput = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => sendAction('game:answers', { answers: collect(), done: false }), 900);
    };
  });
  el.querySelector('#sg-done')?.addEventListener('click', () => { clearTimeout(saveTimer); sendAction('game:answers', { answers: collect(), done: true }); });
  el.querySelector('#sg-edit')?.addEventListener('click', () => sendAction('game:answers', { answers: priv.answers || [], done: false }));
  el.querySelectorAll('[data-challenge]').forEach((b) => (b.onclick = () => sendAction('game:challenge', { id: b.dataset.challenge })));
  el.querySelector('#sg-next')?.addEventListener('click', () => sendAction('game:next-category'));
  el.querySelector('#sg-round')?.addEventListener('click', () => sendAction('game:next-round'));
  el.querySelector('#sg-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
