// Phone view for Scattergories.
import { esc, setHtmlKeepingInputs, countdown, scoreboard } from '../../js/ui.js';
import { scatterStyles, answerCards, dots } from './board.js';
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
      html = `<div class="sg-phone">
        <div class="sg-phone-top"><div class="sg-letter sm">${s.letter}</div><p>Everything starts with ${s.letter}</p>${countdown(s.deadline)}</div>
        <div class="sg-pad"><ol class="sg-rows sg-phone-list">${s.categories.map((c, k) => `
          <li class="sg-row"><span class="sg-num">${k + 1}</span><label class="sg-field"><span>${esc(c)}</span>
            <input id="sg-${k}" maxlength="40" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="${s.letter}…" ${firstRender ? `value="${esc(saved[k] || '')}" data-reset="1"` : ''}></label></li>`).join('')}
        </ol></div>
        <button class="btn btn-primary btn-big sg-done" id="sg-done">I'm done</button></div>`;
    }
  } else if (s.phase === 'review') {
    html = `<div class="sg-review-top"><div class="sg-letter sm">${s.letter}</div><div><div class="muted">Category ${s.review + 1} of ${PER_ROUND}</div>${dots(s)}</div></div>
      <div class="sg-pad sg-cat-card"><div class="sg-cat-name">${esc(s.categories[s.review])}</div></div>
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
    input.onkeydown = (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = el.querySelector(`#sg-${Number(input.id.slice(3)) + 1}`);
      if (next) next.focus(); else input.blur();
    };
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
