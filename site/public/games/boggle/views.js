// TV and phone views for Boggle.
import { esc, nameOf, injectStyles, countdown, scoreboard, setHtmlKeepingInputs } from '../../js/ui.js';

function styles() {
  injectStyles('boggle', `
    .bg { text-align: center; }
    .bg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(.3rem, 1.2vh, .7rem); width: min(56vh, 92vw); margin: .6rem auto;
      padding: clamp(.4rem, 1.5vh, .9rem); background: #0f2f24; border-radius: 18px; box-shadow: inset 0 0 0 4px rgba(255,255,255,.08); }
    .bg-die { aspect-ratio: 1; display: grid; place-items: center; border-radius: 14%; background: var(--card); color: var(--ink);
      font: 800 clamp(1.6rem, 7vh, 3.6rem)/1 var(--display); box-shadow: 0 4px 0 var(--card-edge, #cdbf98); }
    .bg-die.qu { font-size: clamp(1.2rem, 5vh, 2.6rem); }
    .bg-top { display: flex; justify-content: center; align-items: center; gap: 1.2rem; font: 700 1.1rem var(--body); }
    .bg-top .timer { font: 800 clamp(1.6rem, 6vh, 2.6rem) var(--display); color: var(--gold); }
    .bg-counts { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem .9rem; margin: .4rem 0; font-weight: 700; }
    .bg-counts b { color: var(--gold); }
    .bg-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: .8rem; text-align: left; margin: .6rem 0; }
    .bg-player { background: rgba(0,0,0,.2); border-radius: 12px; padding: .6rem .8rem; }
    .bg-player h3 { margin: 0 0 .3rem; font: 800 1.1rem var(--display); display: flex; justify-content: space-between; }
    .bg-player ul { list-style: none; margin: 0; padding: 0; columns: 2; font: 600 .95rem var(--body); }
    .bg-player li.shared { opacity: .45; text-decoration: line-through; }
    .bg-player li span { color: var(--gold); font-size: .8rem; margin-left: .2rem; }
    .bg-missed { font-weight: 700; } .bg-missed b { color: var(--gold); letter-spacing: .04em; }
    .bg-actions { display: flex; flex-wrap: wrap; gap: .6rem; justify-content: center; margin-top: .6rem; }
    .bg-phone .bg-grid { width: min(88vw, 22rem); }
    .bg-phone form { display: grid; grid-template-columns: 1fr auto; gap: .5rem; margin: .6rem 0; }
    .bg-phone input { text-transform: uppercase; }
    .bg-note { min-height: 1.4rem; font-weight: 700; }
    .bg-note.ok { color: #8be38b; } .bg-note.bad { color: #ffb3ad; }
    .bg-mine { display: flex; flex-wrap: wrap; gap: .3rem; justify-content: center; }
    .bg-mine span { background: rgba(255,255,255,.12); border-radius: 999px; padding: .15rem .6rem; font-weight: 700; font-size: .9rem; }
  `);
}

const gridHtml = (board) => `<div class="bg-grid">${board.map((f) => `<div class="bg-die ${f === 'QU' ? 'qu' : ''}">${f === 'QU' ? 'Qu' : f}</div>`).join('')}</div>`;

let endTimer = null;

export function renderBoard(el, { state: s, players, sendAction }) {
  styles();
  if (!s.board?.length) { el.innerHTML = '<p class="center muted">Shaking the cubes…</p>'; return; }
  clearTimeout(endTimer);

  if (s.phase === 'play') {
    // The TV ends the round when time runs out, even if the host page was reloaded.
    endTimer = setTimeout(() => sendAction('game:end-round'), Math.max(0, s.deadline - Date.now()) + 600);
    el.innerHTML = `<div class="bg">
      <div class="bg-top"><span>Round ${s.round}</span>${countdown(s.deadline)}<span>Find words on your phone!</span></div>
      ${gridHtml(s.board)}
      <div class="bg-counts">${players.map((p) => `<span>${esc(p.name)} <b>${s.counts?.[p.id] || 0}</b></span>`).join('')}</div>
      <div class="bg-actions"><button class="btn btn-ghost" id="bg-end">End round now</button></div></div>`;
    el.querySelector('#bg-end').onclick = () => sendAction('game:end-round');
    return;
  }

  const res = s.results || {};
  const roundPts = (id) => (res[id] || []).reduce((n, x) => n + x.pts, 0);
  el.innerHTML = `<div class="bg">
    <div class="bg-top"><span>Round ${s.round} results</span></div>
    <div class="bg-results">${players.map((p) => `<div class="bg-player"><h3><span>${esc(p.name)}</span><span>+${roundPts(p.id)}</span></h3>
      <ul>${(res[p.id] || []).map((x) => `<li class="${x.shared ? 'shared' : ''}">${esc(x.word)}${x.pts ? `<span>${x.pts}</span>` : ''}</li>`).join('') || '<li class="muted">No words</li>'}</ul></div>`).join('')}</div>
    ${s.missed?.length ? `<p class="bg-missed">Nobody found: ${s.missed.map((w) => `<b>${esc(w)}</b>`).join(', ')}</p>` : ''}
    <p class="muted">Crossed-out words were found by more than one person, so they don't score.</p>
    ${scoreboard(players.map((p) => ({ name: p.name, score: s.scores[p.id] || 0 })))}
    <div class="bg-actions"><button class="btn btn-primary btn-big" id="bg-next">Next round</button></div></div>`;
  el.querySelector('#bg-next').onclick = () => sendAction('game:next-round');
}

export function renderPlayer(el, { state: s, priv = {}, me, players, sendAction }) {
  styles();
  if (!s.board?.length) { el.innerHTML = '<p class="center muted">Shaking the cubes…</p>'; return; }
  const isVip = players[0]?.id === me;
  const found = priv.found || [];

  if (s.phase === 'play') {
    const note = priv.note || '';
    setHtmlKeepingInputs(el, `<div class="bg bg-phone">
      <div class="bg-top">${countdown(s.deadline)}<span>${found.length} word${found.length === 1 ? '' : 's'}</span></div>
      ${gridHtml(s.board)}
      <form id="bg-form"><input class="big-text-input" id="bg-word" maxlength="16" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="Type a word">
        <button class="btn btn-primary">Add</button></form>
      <p class="bg-note ${note.startsWith('✓') ? 'ok' : 'bad'}">${esc(note)}</p>
      <div class="bg-mine">${found.map((w) => `<span>${esc(w)}</span>`).join('')}</div></div>`);
    const form = el.querySelector('#bg-form');
    form.onsubmit = (e) => {
      e.preventDefault();
      const input = el.querySelector('#bg-word');
      if (input.value.trim()) sendAction('game:word', { word: input.value });
      input.value = '';
      input.focus();
    };
    return;
  }

  const mine = s.results?.[me] || [];
  const pts = mine.reduce((n, x) => n + x.pts, 0);
  setHtmlKeepingInputs(el, `<div class="bg bg-phone">
    <h2>Time's up!</h2>
    <p>You scored <b>${pts}</b> this round. Total: <b>${s.scores?.[me] || 0}</b></p>
    <div class="bg-mine">${mine.map((x) => `<span style="${x.shared ? 'opacity:.45;text-decoration:line-through' : ''}">${esc(x.word)}</span>`).join('')}</div>
    ${isVip ? '<div class="bg-actions"><button class="btn btn-primary btn-big" id="bg-next">Next round</button></div>' : '<p class="muted">Look at the TV for everyone\'s words.</p>'}</div>`);
  el.querySelector('#bg-next')?.addEventListener('click', () => sendAction('game:next-round'));
}
