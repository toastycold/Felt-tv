// TV and phone views for Dots and Boxes.
import { esc, nameOf, injectStyles } from '../../js/ui.js';
import { COLORS } from './engine.js';

const GAP = 60, M = 16;

function styles() {
  injectStyles('dots', `
    .db { text-align: center; }
    .db svg { display: block; margin: .4rem auto; width: min(100%, 62vh); height: auto; touch-action: manipulation; }
    .db-phone svg { width: 100%; }
    .db-edge-hit { stroke: transparent; stroke-width: 36; stroke-linecap: round; cursor: pointer; }
    @media (hover: hover) { .db-edge-hit:hover + .db-edge-ghost { stroke: rgba(242,194,48,.9); } }
    .db-edge-ghost { stroke: rgba(255,255,255,.08); stroke-width: 8; stroke-linecap: round; pointer-events: none; }
    .db-last { filter: drop-shadow(0 0 6px #fff); }
    .db-scores { display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem .8rem; margin: .3rem 0; }
    .db-chip { display: inline-flex; align-items: center; gap: .4rem; padding: .25rem .7rem; border-radius: 999px; background: rgba(0,0,0,.22);
      font: 700 1rem var(--body); }
    .db-chip i { width: .9rem; height: .9rem; border-radius: 50%; display: inline-block; }
    .db-chip b { font: 800 1.15rem var(--display); }
    .db-chip.turn { box-shadow: 0 0 0 3px var(--gold); }
    .db-msg { font: 700 clamp(1rem, 3vh, 1.3rem) var(--body); margin: .35rem 0; min-height: 1.5rem; }
    .db-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .6rem; margin-top: .4rem; }
    .db-zoomwrap { overflow: auto; max-height: 62vh; border-radius: 12px; background: rgba(0,0,0,.15); -webkit-overflow-scrolling: touch; }
    .db-phone .db-zoomwrap svg { width: calc(100% * var(--z, 1)); max-width: none; margin: 0; }
    .db-zoom { display: flex; justify-content: center; align-items: center; gap: .5rem; margin: .3rem 0; font-weight: 700; }
    .db-zoom button { font: 800 1.3rem/1 var(--display); width: 2.8rem; height: 2.8rem; border-radius: 50%; border: 0; background: var(--card); color: var(--ink); }
    .db-zoom button:disabled { opacity: .35; }
    .db-phone h2 { font: 800 1.35rem/1.2 var(--display); margin: .3rem 0; }
  `);
}

function svgHtml(s, players, { clickable = false } = {}) {
  const { R, C } = s;
  const w = C * GAP + 2 * M, hgt = R * GAP + 2 * M;
  const X = (c) => M + c * GAP, Y = (r) => M + r * GAP;
  let boxes = '', lines = '', hits = '', dots = '';
  s.boxes.forEach((o, b) => {
    if (o < 0) return;
    const r = Math.floor(b / C), c = b % C;
    const initial = esc((nameOf(s.seats[o], players) || '?')[0] || '?');
    boxes += `<rect x="${X(c) + 4}" y="${Y(r) + 4}" width="${GAP - 8}" height="${GAP - 8}" rx="6" fill="${COLORS[o]}" opacity=".55"/>
      <text x="${X(c) + GAP / 2}" y="${Y(r) + GAP / 2 + 9}" text-anchor="middle" font-size="26" font-weight="800" fill="#fff" font-family="var(--display)">${initial}</text>`;
  });
  const edge = (kind, i, x1, y1, x2, y2) => {
    const owner = s[kind][i];
    const isLast = s.last && s.last.kind === kind && s.last.i === i;
    if (owner >= 0) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COLORS[owner]}" stroke-width="8" stroke-linecap="round" class="${isLast ? 'db-last' : ''}"/>`;
    } else if (clickable) {
      hits += `<line class="db-edge-hit" data-kind="${kind}" data-i="${i}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="db-edge-ghost" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    } else {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(255,255,255,.07)" stroke-width="6" stroke-linecap="round"/>`;
    }
  };
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) edge('h', r * C + c, X(c), Y(r), X(c + 1), Y(r));
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) edge('v', r * (C + 1) + c, X(c), Y(r), X(c), Y(r + 1));
  for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) dots += `<circle cx="${X(c)}" cy="${Y(r)}" r="6" fill="var(--card)"/>`;
  return `<svg viewBox="0 0 ${w} ${hgt}">${boxes}${lines}${hits}${dots}</svg>`;
}

function scoresHtml(s, players) {
  return `<div class="db-scores">${s.seats.map((id, k) => `<span class="db-chip ${s.phase === 'play' && s.turn === k ? 'turn' : ''}">
    <i style="background:${COLORS[k]}"></i>${esc(nameOf(id, players))} <b>${s.scores[id] || 0}</b></span>`).join('')}</div>`;
}

function statusText(s, players) {
  if (s.phase === 'over') {
    const w = Array.isArray(s.winner) ? s.winner : [s.winner];
    return w.length > 1 ? `It's a tie between ${w.map((id) => esc(nameOf(id, players))).join(' and ')}!` : `${esc(nameOf(w[0], players))} wins with ${s.scores[w[0]]} boxes!`;
  }
  const who = esc(nameOf(s.seats[s.turn], players));
  if (s.last?.made) return `${esc(nameOf(s.last.by, players))} closed ${s.last.made === 2 ? 'two boxes' : 'a box'} and goes again!`;
  return `${who}'s turn`;
}

export function renderBoard(el, { state: s, players, sendAction }) {
  styles();
  if (!s.seats?.length) { el.innerHTML = '<p class="center muted">Drawing dots…</p>'; return; }
  el.innerHTML = `<div class="db">
    ${scoresHtml(s, players)}
    <p class="db-msg">${statusText(s, players)}</p>
    ${svgHtml(s, players)}
    <div class="db-actions">${s.phase === 'over' ? '<button class="btn btn-primary btn-big" id="db-again">Play again</button>' : '<button class="btn btn-ghost" id="db-skip">Skip their turn</button>'}</div></div>`;
  el.querySelector('#db-again')?.addEventListener('click', () => sendAction('game:again'));
  el.querySelector('#db-skip')?.addEventListener('click', () => sendAction('game:skip'));
}

const ZOOMS = [1, 1.5, 2, 2.75];
let zoom = 0;
let sent = '';   // the line we just played, until the TV confirms it (stops double taps)

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  styles();
  if (!s.seats?.length) { el.innerHTML = '<p class="center muted">Drawing dots…</p>'; return; }
  const mySeat = s.seats.indexOf(me);
  const myTurn = s.phase === 'play' && s.seats[s.turn] === me;
  const isVip = players[0]?.id === me;
  const big = s.R >= 7;            // only the biggest boards need zooming
  if (!big) zoom = 0;
  if (sent && (!myTurn || s[sent.split(':')[0]]?.[+sent.split(':')[1]] >= 0)) sent = '';
  const oldWrap = el.querySelector('.db-zoomwrap');
  const scroll = oldWrap ? [oldWrap.scrollLeft, oldWrap.scrollTop] : null;
  let headline;
  if (s.phase === 'over') headline = statusText(s, players);
  else if (mySeat < 0) headline = 'This game already started. Watch the TV!';
  else if (myTurn) headline = 'Your turn! Tap a line.';
  else headline = statusText(s, players);
  el.innerHTML = `<div class="db db-phone">
    ${mySeat >= 0 ? `<p><span class="db-chip"><i style="background:${COLORS[mySeat]}"></i>You · <b>${s.scores[me] || 0}</b></span></p>` : ''}
    <h2>${headline}</h2>
    ${big ? `<div class="db-zoom"><button id="db-out" aria-label="Zoom out" ${zoom === 0 ? 'disabled' : ''}>−</button>
      <span>Zoom ${ZOOMS[zoom]}×</span><button id="db-in" aria-label="Zoom in" ${zoom === ZOOMS.length - 1 ? 'disabled' : ''}>+</button></div>` : ''}
    <div class="db-zoomwrap" style="--z:${ZOOMS[zoom]}">${svgHtml(s, players, { clickable: myTurn && !sent })}</div>
    <div class="db-actions">
      ${s.phase === 'over' && isVip ? '<button class="btn btn-primary btn-big" id="db-again">Play again</button>' : ''}
    </div>
    ${scoresHtml(s, players)}</div>`;
  const wrap = el.querySelector('.db-zoomwrap');
  if (scroll) [wrap.scrollLeft, wrap.scrollTop] = scroll;
  if (big) {
    const setZoom = (z) => {
      const fx = (wrap.scrollLeft + wrap.clientWidth / 2) / wrap.scrollWidth, fy = (wrap.scrollTop + wrap.clientHeight / 2) / wrap.scrollHeight;
      zoom = z;
      wrap.style.setProperty('--z', ZOOMS[zoom]);
      // Keep the same spot in the middle of the view.
      wrap.scrollLeft = fx * wrap.scrollWidth - wrap.clientWidth / 2;
      wrap.scrollTop = fy * wrap.scrollHeight - wrap.clientHeight / 2;
      el.querySelector('.db-zoom span').textContent = `Zoom ${ZOOMS[zoom]}×`;
      el.querySelector('#db-out').disabled = zoom === 0;
      el.querySelector('#db-in').disabled = zoom === ZOOMS.length - 1;
    };
    el.querySelector('#db-in').onclick = () => zoom < ZOOMS.length - 1 && setZoom(zoom + 1);
    el.querySelector('#db-out').onclick = () => zoom > 0 && setZoom(zoom - 1);
  }
  // One tap plays the line. Draw it right away in my color so it feels instant, then tell the TV.
  const svg = wrap.querySelector('svg');
  svg?.addEventListener('click', (e) => {
    const ln = e.target.closest?.('.db-edge-hit');
    if (!ln || sent || !myTurn) return;
    const kind = ln.dataset.kind, i = Number(ln.dataset.i);
    sent = `${kind}:${i}`;
    const drawn = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for (const a of ['x1', 'y1', 'x2', 'y2']) drawn.setAttribute(a, ln.getAttribute(a));
    Object.entries({ stroke: COLORS[mySeat], 'stroke-width': 8, 'stroke-linecap': 'round', class: 'db-last' }).forEach(([k, v]) => drawn.setAttribute(k, v));
    svg.insertBefore(drawn, svg.querySelector('circle'));
    svg.querySelectorAll('.db-edge-hit').forEach((x) => x.remove());   // no more taps until the TV answers
    el.querySelector('h2').textContent = 'Nice!';
    sendAction('game:line', { kind, i });
    const mine = sent;
    setTimeout(() => { if (sent === mine) { sent = ''; renderPlayer(el, { state: s, me, players, sendAction }); } }, 4000);   // never got through
  });
  el.querySelector('#db-again')?.addEventListener('click', () => sendAction('game:again'));
}
