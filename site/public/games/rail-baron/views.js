// TV and phone views for Rail Baron.
import { esc, nameOf, injectStyles } from '../../js/ui.js';
import { RR, RR_IDS, NET, payoff, ABBR } from './rules.js';
const ab = (r) => ABBR[r] || r;
import { REGIONS } from './network.js';
import { mapHtml, MAP_CSS, SEAT_COLORS, rrName, VIEW } from './mapview.js';
import { spriteHtml } from '../../js/people.js';

const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;
const colorOf = (s, id) => SEAT_COLORS[s.seats.indexOf(id)] || '#999';
const diceHtml = (d) => d ? `<span class="rb-dice">${d.white.map((x) => `<b>${x}</b>`).join('')}<b class="red">${d.red}</b></span>` : '';

function styles() {
  injectStyles('rail-baron', `
    ${MAP_CSS}
    .rb { text-align: left; }
    .rb-tv { display: grid; grid-template-columns: minmax(0, 1fr) clamp(14rem, 24vw, 20rem); gap: .8rem; align-items: start; }
    .rb-side { display: flex; flex-direction: column; gap: .45rem; }
    .rb-player { border-radius: 10px; background: rgba(0,0,0,.22); padding: .35rem .6rem; border-left: 6px solid var(--c); font: 600 .82rem/1.3 var(--body); }
    .rb-player.now { box-shadow: 0 0 0 2px var(--gold); background: rgba(242,194,48,.12); }
    .rb-player.out { opacity: .45; }
    .rb-player .top { display: flex; justify-content: space-between; align-items: center; font: 800 1rem var(--display); }
    .rb-player .top .sprite { margin: -.5rem .2rem -.4rem -.3rem; vertical-align: middle; }
    .rb-player .cash { color: var(--gold); }
    .rb-tag { display: inline-block; font: 800 .7rem var(--body); padding: .05rem .35rem; border-radius: 6px; background: rgba(255,255,255,.15); margin-left: .25rem; }
    .rb-tag.decl { background: #e0574e; color: #fff; }
    .rb-rrgrid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
    .rb-rrgrid span { font: 800 .58rem var(--body); text-align: center; padding: .12rem 0; border-radius: 4px; background: rgba(255,255,255,.08); color: #ddd; }
    .rb-status { font: 700 clamp(.95rem, 2.6vh, 1.2rem) var(--body); margin: .2rem 0 .4rem; }
    .rb-log { font: 600 .8rem/1.35 var(--body); opacity: .85; list-style: none; padding: 0; margin: 0; }
    .rb-log li:first-child { opacity: 1; font-weight: 800; }
    .rb-dice { display: inline-flex; gap: .2rem; vertical-align: middle; margin-left: .3rem; }
    .rb-dice b { display: inline-grid; place-items: center; width: 1.45em; height: 1.45em; border-radius: 5px; background: var(--card); color: var(--ink); font: 900 .95em var(--display); }
    .rb-dice b.red { background: #e0574e; color: #fff; }
    .rb-setup { max-width: 40rem; margin: 0 auto; text-align: left; }
    .rb-setup label { display: flex; gap: .6rem; align-items: flex-start; margin: .6rem 0; font-weight: 700; }
    .rb-setup input { width: 1.3rem; height: 1.3rem; margin-top: .15rem; }
    .rb-actions { display: flex; flex-wrap: wrap; gap: .5rem; margin: .5rem 0; }
    .rb-actions.center { justify-content: center; }
    /* phone */
    .rb-phone h2 { font: 800 1.35rem/1.2 var(--display); margin: .3rem 0; }
    .rb-me { display: flex; justify-content: space-between; align-items: center; border-left: 6px solid var(--c); padding: .3rem .6rem; border-radius: 10px; background: rgba(0,0,0,.2); font-weight: 700; }
    .rb-me .cash { font: 800 1.3rem var(--display); color: var(--gold); }
    .rb-card { background: rgba(0,0,0,.22); border-radius: 12px; padding: .7rem; margin: .5rem 0; }
    .rb-opt { display: block; width: 100%; text-align: left; border: 2px solid transparent; background: var(--card); color: var(--ink); border-radius: 12px; padding: .6rem .7rem; margin: .4rem 0; font: 600 .9rem/1.35 var(--body); }
    .rb-opt b { font: 800 1.05rem var(--display); }
    .rb-opt.pick { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(242,194,48,.45); }
    .rb-opt small { display: block; opacity: .75; }
    .rb-mapwrap { overflow: auto; max-height: 52vh; border-radius: 12px; }
    .rb-mapwrap .rb-map { width: calc(100% * var(--z, 1)); max-width: none; }
    .rb-zoom { display: flex; align-items: center; justify-content: center; gap: .5rem; margin: .3rem 0; font-weight: 700; }
    .rb-zoom button { width: 2.6rem; height: 2.6rem; border-radius: 50%; border: 0; background: var(--card); color: var(--ink); font: 800 1.3rem var(--display); }
    .rb-mine { font: 600 .85rem/1.5 var(--body); }
    .rb-bid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .4rem; }
  `);
}

function playersHtml(s, players) {
  const cur = s.seats[s.turn];
  return s.seats.map((id) => {
    const p = s.p[id];
    if (!p) return '';
    const trains = p.superchief ? '<span class="rb-tag">Superchief</span>' : p.express ? '<span class="rb-tag">Express</span>' : '';
    return `<div class="rb-player ${id === cur && s.phase === 'play' ? 'now' : ''} ${p.out ? 'out' : ''}" style="--c:${colorOf(s, id)}">
      <div class="top"><span>${spriteHtml(players.find((x) => x.id === id)?.person, s.phase === 'over' ? (s.winner === id ? 'cheering' : 'idle') : p.out ? 'eliminated' : id === cur ? 'waving' : 'idle', 34)}${esc(nameOf(id, players))}${p.declared ? '<span class="rb-tag decl">Declared</span>' : ''}</span><span class="cash">${money(p.cash)}</span></div>
      <div>Home: ${esc(p.home)}${trains}</div>
      <div>${p.out ? 'Out of the game' : p.dest ? `To ${esc(p.dest)}${p.declared && p.alt ? ` (alt. ${esc(p.alt)})` : ''}` : `At ${esc(p.city || '')}`}</div>
      <div>${p.rrs.length ? p.rrs.map(ab).join(' · ') : 'No railroads yet'}</div></div>`;
  }).join('');
}

function rrGridHtml(s) {
  return `<div class="rb-rrgrid">${RR_IDS.map((r) => {
    const o = s.owners[r];
    return `<span title="${esc(rrName(r))}" style="${o ? `background:${colorOf(s, o)};color:#fff` : ''}">${ab(r)}</span>`;
  }).join('')}</div>`;
}

function statusLine(s, players) {
  const cur = s.seats[s.turn];
  const who = esc(nameOf(cur, players));
  const p = s.p[cur];
  switch (s.step) {
    case 'declare': return `${who} has ${money(p.cash)}. Will they declare?`;
    case 'dest': return `${who} is rolling for a destination…`;
    case 'pick-region': return `${who} rolled their own region and may pick any region.`;
    case 'roll': return `${who} is headed to <b>${esc(p.dest)}</b> (pays ${money(payoff(p.tripFrom, p.declared ? p.alt || p.dest : p.dest))}). Rolling…`;
    case 'route': return `${who} rolled ${s.moveRoll}${diceHtml(s.dice)} and is picking a route.`;
    case 'buy': return `${who} reached ${esc(s.arrived?.city)} and collected ${money(s.arrived?.pay)}. Buying?`;
    case 'sell': return `${who} owes ${money(s.owe)} in fees and must sell a railroad.`;
    case 'auction': {
      const a = s.auction;
      return `Auction: ${esc(rrName(a.rr))}. High bid ${a.bidder ? `${money(a.high)} by ${esc(nameOf(a.bidder, players))}` : 'none yet'}. ${esc(nameOf(a.order[a.at], players))} to bid.`;
    }
    default: return '';
  }
}

// ---------------- TV ----------------
export function renderBoard(el, { state: s, players, sendAction }) {
  styles();
  if (s.phase === 'lobby' || !s.seats?.length) { el.innerHTML = '<p class="center muted">Laying track…</p>'; return; }
  if (s.phase === 'setup') {
    el.innerHTML = `<div class="rb rb-setup">
      <h2>Rail Baron</h2>
      <p>${s.seats.length} barons are at the table. Pick any optional rules, then start. Home cities are rolled at the start.</p>
      <label><input type="checkbox" data-opt="cheaperSuperchief" ${s.options.cheaperSuperchief ? 'checked' : ''}>
        <span>Cheaper Superchief with more players<br><small class="muted">$36,000 with 4 players, $32,000 with 5, $28,000 with 6</small></span></label>
      <label><input type="checkbox" data-opt="netWorthGoal" ${s.options.netWorthGoal ? 'checked' : ''}>
        <span>Win on net worth instead of $200,000 cash<br><small class="muted">$300,000 with 3 players, $250,000 with 4, $225,000 with 5, $200,000 with 6 (cash plus railroads and trains)</small></span></label>
      <div class="rb-actions"><button class="btn btn-primary btn-big" id="rb-begin">All aboard!</button></div></div>`;
    el.querySelectorAll('[data-opt]').forEach((c) => (c.onchange = () => sendAction('game:option', { key: c.dataset.opt, value: c.checked })));
    el.querySelector('#rb-begin').onclick = () => sendAction('game:begin');
    return;
  }
  const cur = s.seats[s.turn];
  const p = s.p[cur];
  const route = s.step === 'route' && s.routes?.length ? { from: p.pos, edges: s.routes[0].edges, steps: s.routes[0].steps } : null;
  const over = s.phase === 'over';
  el.innerHTML = `<div class="rb rb-tv">
    <div>
      <p class="rb-status">${over ? `<b>${esc(nameOf(s.winner, players))} is the Rail Baron!</b>` : statusLine(s, players)}</p>
      ${mapHtml(s, players, { route })}
    </div>
    <div class="rb-side">
      ${playersHtml(s, players)}
      ${rrGridHtml(s)}
      <ul class="rb-log">${s.log.slice(0, 4).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
      ${over ? '<button class="btn btn-primary" id="rb-new">New game</button>' : ''}
    </div></div>`;
  el.querySelector('#rb-new')?.addEventListener('click', () => sendAction('game:new-game'));
}

// ---------------- Phone ----------------
let pickKey = '', zoom = 0, pickBuy = '';
const ZOOMS = [1, 1.6, 2.4, 3.4];

export function renderPlayer(el, { state: s, me, players, sendAction }) {
  styles();
  if (s.phase === 'lobby' || !s.seats?.length) { el.innerHTML = '<p class="center muted">Laying track…</p>'; return; }
  const isVip = players[0]?.id === me;
  if (s.phase === 'setup') {
    el.innerHTML = `<div class="rb rb-phone sheet center"><h2>Rail Baron</h2>
      <p>${isVip ? 'Choose optional rules on the TV, then start.' : 'Waiting for the game to start…'}</p>
      ${isVip ? '<div class="rb-actions center"><button class="btn btn-primary btn-big" id="rb-begin">All aboard!</button></div>' : ''}</div>`;
    el.querySelector('#rb-begin')?.addEventListener('click', () => sendAction('game:begin'));
    return;
  }
  const mine = s.p[me];
  const cur = s.seats[s.turn];
  const myTurn = s.phase === 'play' && cur === me;
  const wrap = el.querySelector('.rb-mapwrap');
  const scroll = wrap ? [wrap.scrollLeft, wrap.scrollTop] : null;

  let panel = '';
  let route = null;
  if (s.phase === 'over') {
    panel = `<h2>${s.winner === me ? 'You are the Rail Baron! 🚂' : `${esc(nameOf(s.winner, players))} wins!`}</h2>
      ${isVip ? '<div class="rb-actions"><button class="btn btn-primary btn-big" id="rb-new">New game</button></div>' : ''}`;
  } else if (!mine) {
    panel = '<h2>This game already started. Watch the TV!</h2>';
  } else if (s.step === 'auction' && s.auction?.order[s.auction.at] === me) {
    const a = s.auction;
    const min = Math.max(RR[a.rr].price / 2, a.high + 500);
    panel = `<h2>Auction: ${esc(rrName(a.rr))}</h2>
      <p>List price ${money(RR[a.rr].price)}. High bid: ${a.bidder ? `${money(a.high)} (${esc(nameOf(a.bidder, players))})` : 'none'}.</p>
      <div class="rb-bid">${[0, 1000, 5000].map((x) => min + x).filter((x) => x <= mine.cash).map((x) => `<button class="btn btn-primary" data-bid="${x}">Bid ${money(x)}</button>`).join('')}</div>
      <div class="rb-actions"><button class="btn btn-ghost" id="rb-pass">Pass</button></div>`;
  } else if (myTurn) {
    switch (s.step) {
      case 'declare':
        panel = `<h2>Declare?</h2><p>You have ${money(mine.cash)}. Declare and race home to <b>${esc(mine.home)}</b>${mine.city === mine.home ? ' (you\'re already there, so you win!)' : ''}? Anyone who lands on or passes your spot collects $50,000 from you.</p>
          <div class="rb-actions"><button class="btn btn-primary btn-big" data-declare="1">Declare!</button><button class="btn btn-ghost" data-declare="0">Not yet</button></div>`;
        break;
      case 'dest':
        panel = `<h2>Roll for your destination</h2><p>You're in ${esc(mine.city)}.</p><div class="rb-actions"><button class="btn btn-primary btn-big" id="rb-rolldest">Roll destination</button></div>`;
        break;
      case 'pick-region':
        panel = `<h2>You rolled your own region</h2><p>Pick any region to roll a city in:</p>
          <div class="rb-actions">${REGIONS.map((r) => `<button class="btn btn-ghost" data-region="${esc(r)}">${esc(r)}</button>`).join('')}</div>`;
        break;
      case 'roll':
        panel = `<h2>Headed to ${esc(mine.dest)}</h2><p>${mine.declared ? `Racing home! Alternate destination: ${esc(mine.alt)}.` : `This trip pays ${money(payoff(mine.tripFrom, mine.dest))}.`}</p>
          <div class="rb-actions"><button class="btn btn-primary btn-big" id="rb-roll">Roll the dice</button></div>`;
        break;
      case 'route': {
        if (!s.routes.some((r) => r.key === pickKey)) pickKey = s.routes[0]?.key || '';
        const sel = s.routes.find((r) => r.key === pickKey);
        if (sel) route = { from: mine.pos, edges: sel.edges, steps: sel.steps };
        panel = `<h2>You rolled ${s.moveRoll}${diceHtml(s.dice)}</h2>
          ${s.bonus != null ? `<p class="muted">You'll get a bonus roll of ${s.bonus} after this.</p>` : ''}
          ${s.routes.map((r) => `<button class="rb-opt ${r.key === pickKey ? 'pick' : ''}" data-route="${r.key}"><b>${esc(r.label)}</b>
            <small>${r.total} dots to ${esc(mine.dest)} · moving ${r.steps} now${r.steps >= r.total ? ' (arrive!)' : ''}</small>
            <small>Fees this turn so far: ${money(r.fee)} · ${r.rrs.map(ab).join(', ')}</small></button>`).join('')}
          ${s.error ? `<p class="error">${esc(s.error)}</p>` : ''}
          <p class="muted small">Want another way? Tap any city or town on the map to route through it.</p>
          <div class="rb-actions"><button class="btn btn-primary btn-big" id="rb-go">Go!</button></div>`;
        break;
      }
      case 'buy': {
        const opts = s.buyOpts || [];
        panel = `<h2>You collected ${money(s.arrived?.pay)}!</h2><p>Buy one thing? You have ${money(mine.cash)}.</p>
          ${opts.map((o) => `<button class="rb-opt ${pickBuy === o.id ? 'pick' : ''}" data-buy="${o.id}"><b>${esc(o.name)}</b> · ${money(o.price)}
            <small>${o.id === 'express' ? 'Bonus roll whenever you roll doubles' : o.id === 'superchief' ? 'A bonus roll every turn' : `${ab(o.id)} · you ride it for just the $1,000 bank fee, others pay you`}</small></button>`).join('') || '<p class="muted">Nothing you can afford right now.</p>'}
          <div class="rb-actions">${pickBuy ? '<button class="btn btn-primary btn-big" id="rb-buy">Buy it</button>' : ''}<button class="btn btn-ghost" id="rb-nobuy">No thanks</button></div>`;
        break;
      }
      case 'sell':
        panel = `<h2>You owe ${money(s.owe)}</h2><p>You have ${money(mine.cash)}. Sell a railroad to the bank for half price, or auction it.</p>
          ${mine.rrs.map((r) => `<div class="rb-card"><b>${esc(rrName(r))}</b> (${money(RR[r].price)})
            <div class="rb-actions"><button class="btn btn-ghost" data-sell="${r}" data-how="bank">Bank: ${money(RR[r].price / 2)}</button>
            <button class="btn btn-primary" data-sell="${r}" data-how="auction">Auction</button></div></div>`).join('')}`;
        break;
      default:
        panel = '<h2>Your turn</h2>';
    }
  } else {
    panel = `<p class="rb-status">${statusLine(s, players)}</p>`;
  }

  const myRRs = mine?.rrs?.length ? mine.rrs.map((r) => esc(rrName(r))).join(', ') : 'none yet';
  el.innerHTML = `<div class="rb rb-phone">
    ${mine ? `<div class="rb-me" style="--c:${colorOf(s, me)}"><span>${esc(nameOf(me, players))}${mine.declared ? ' <span class="rb-tag decl">Declared</span>' : ''}<br><small>Home: ${esc(mine.home)}${mine.dest ? ` · To ${esc(mine.dest)}` : ''}</small></span><span class="cash">${money(mine.cash)}</span></div>` : ''}
    ${panel}
    <div class="rb-zoom"><button id="rb-out" aria-label="Zoom out">−</button><span>Map ${ZOOMS[zoom]}×</span><button id="rb-in" aria-label="Zoom in">+</button></div>
    <div class="rb-mapwrap" style="--z:${ZOOMS[zoom]}">${mapHtml(s, players, { route, pickable: myTurn && s.step === 'route' })}</div>
    ${mine ? `<p class="rb-mine">Your railroads: ${myRRs}${mine.superchief ? ' · Superchief' : mine.express ? ' · Express' : ''}</p>` : ''}
  </div>`;

  const w = el.querySelector('.rb-mapwrap');
  if (scroll) [w.scrollLeft, w.scrollTop] = scroll;
  else if (mine && zoom > 0) centerOn(w, mine.pos);
  const rerender = () => renderPlayer(el, { state: s, me, players, sendAction });
  el.querySelector('#rb-in').onclick = () => { if (zoom < ZOOMS.length - 1) { zoom += 1; rerender(); if (mine) centerOn(el.querySelector('.rb-mapwrap'), mine.pos); } };
  el.querySelector('#rb-out').onclick = () => { if (zoom > 0) { zoom -= 1; rerender(); } };
  el.querySelector('#rb-new')?.addEventListener('click', () => sendAction('game:new-game'));
  el.querySelector('#rb-begin')?.addEventListener('click', () => sendAction('game:begin'));
  el.querySelectorAll('[data-declare]').forEach((b) => (b.onclick = () => sendAction('game:declare', { yes: b.dataset.declare === '1' })));
  el.querySelector('#rb-rolldest')?.addEventListener('click', () => sendAction('game:roll-dest'));
  el.querySelectorAll('[data-region]').forEach((b) => (b.onclick = () => sendAction('game:pick-region', { region: b.dataset.region })));
  el.querySelector('#rb-roll')?.addEventListener('click', () => sendAction('game:roll'));
  el.querySelectorAll('[data-route]').forEach((b) => (b.onclick = () => { pickKey = b.dataset.route; rerender(); }));
  if (myTurn && s.step === 'route') el.querySelectorAll('.rb-mapwrap [data-city]').forEach((g) => g.addEventListener('click', () => { pickKey = 'via'; sendAction('game:via', { city: g.dataset.city }); }));
  el.querySelector('#rb-go')?.addEventListener('click', () => { sendAction('game:route', { key: pickKey }); pickKey = ''; });
  el.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => { pickBuy = pickBuy === b.dataset.buy ? '' : b.dataset.buy; rerender(); }));
  el.querySelector('#rb-buy')?.addEventListener('click', () => { const item = pickBuy; pickBuy = ''; sendAction('game:buy', { item }); });
  el.querySelector('#rb-nobuy')?.addEventListener('click', () => { pickBuy = ''; sendAction('game:buy', { item: null }); });
  el.querySelectorAll('[data-sell]').forEach((b) => (b.onclick = () => {
    if (confirm(b.dataset.how === 'bank' ? `Sell the ${rrName(b.dataset.sell)} to the bank for half price?` : `Put the ${rrName(b.dataset.sell)} up for auction? You can't take it back.`)) sendAction('game:sell', { rr: b.dataset.sell, how: b.dataset.how });
  }));
  el.querySelectorAll('[data-bid]').forEach((b) => (b.onclick = () => sendAction('game:bid', { amount: Number(b.dataset.bid) })));
  el.querySelector('#rb-pass')?.addEventListener('click', () => sendAction('game:pass-bid'));
}

function centerOn(wrap, node) {
  if (!wrap) return;
  const n = NET.nodes[node];
  wrap.scrollLeft = ((n.x - VIEW.x0) / VIEW.w) * wrap.scrollWidth - wrap.clientWidth / 2;
  wrap.scrollTop = ((n.y - VIEW.y0) / VIEW.h) * wrap.scrollHeight - wrap.clientHeight / 2;
}
