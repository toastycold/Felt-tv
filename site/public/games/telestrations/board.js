// TV view for Telestrations.
import { esc, nameOf, countdown } from '../../js/ui.js';
import { drawStyles, paintAll } from './draw.js';

function entryHtml(book, index, players, dim = false) {
  if (index === 0) {
    return `<div class="ts-entry ${dim ? 'dim' : ''}"><div class="words">${esc(book.word)}</div><div class="by">${esc(nameOf(book.owner, players))}'s word</div></div>`;
  }
  const page = book.pages[index - 1];
  const who = esc(nameOf(page.by, players));
  if (page.type === 'draw') {
    return `<div class="ts-entry ${dim ? 'dim' : ''}"><canvas class="ts-art" width="800" height="600" data-media="${page.media}"></canvas><div class="by">${who} drew this</div></div>`;
  }
  return `<div class="ts-entry ${dim ? 'dim' : ''}"><div class="words">${page.text ? esc(page.text) : '<em>(no guess)</em>'}</div><div class="by">${who} guessed</div></div>`;
}

export function renderBoard(el, { state: s, players, sendAction, media }) {
  drawStyles();
  if (!s.phase || s.phase === 'lobby') { el.innerHTML = ''; return; }
  let body;

  if (s.phase === 'choose') {
    body = `<div class="display-xl center">Pick your secret word</div>
      <p class="lede center">Choose one of the two words on your phone. Don't let anyone see!</p>
      <div class="ts-chips">${s.seats.map((id) => `<span class="${s.done[id] ? 'in' : ''}">${esc(nameOf(id, players))}</span>`).join('')}</div>
      <div class="row-center"><button class="btn btn-ghost" id="ts-skip">Stop waiting</button></div>`;
  } else if (s.phase === 'play') {
    body = `<div class="row-center">${countdown(s.deadline)}</div>
      <div class="display-xl center">${s.task === 'draw' ? 'Draw!' : 'Guess the drawing!'}</div>
      <p class="lede center">Page ${s.step + 1} of ${s.steps}. ${s.task === 'draw' ? 'Draw what your phone shows you.' : 'Type what you think it is.'}</p>
      <div class="ts-chips">${s.seats.map((id) => `<span class="${s.done[id] ? 'in' : ''}">${esc(nameOf(id, players))}</span>`).join('')}</div>
      <div class="row-center"><button class="btn btn-ghost" id="ts-skip">Stop waiting</button></div>`;
  } else if (s.phase === 'reveal') {
    const book = s.books[s.revealBook];
    body = `<div class="center muted">Sketchbook ${s.revealBook + 1} of ${s.books.length}: ${esc(nameOf(book.owner, players))}'s</div>
      <div class="ts-reveal" style="margin-top:1rem">
        ${s.revealPage > 0 ? entryHtml(book, s.revealPage - 1, players, true) : '<div></div>'}
        ${entryHtml(book, s.revealPage, players)}
      </div>
      <div class="row-center" style="margin-top:1.5rem">
        <button class="btn btn-ghost" id="ts-prev">Back</button>
        <button class="btn btn-primary btn-big" id="ts-next">${s.revealPage < book.pages.length ? 'Next page' : s.revealBook < s.books.length - 1 ? 'Next sketchbook' : 'Finish'}</button>
      </div>`;
  } else {
    body = `<div class="display-xl center">That's every sketchbook!</div>
      <div class="row-center"><button class="btn btn-primary btn-big" id="ts-again">Play again</button></div>`;
  }

  el.innerHTML = body;
  paintAll(el, media);
  el.querySelector('#ts-skip')?.addEventListener('click', () => sendAction('game:skip-wait'));
  el.querySelector('#ts-next')?.addEventListener('click', () => sendAction('game:reveal-next'));
  el.querySelector('#ts-prev')?.addEventListener('click', () => sendAction('game:reveal-prev'));
  el.querySelector('#ts-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
