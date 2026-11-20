// Phone view for Splendor: your gems and cards, plus controls to take, reserve and buy.
import { esc, nameOf } from '../../js/ui.js';
import { COLORS, GOLD } from './cards.js';
import { gem, cardHtml, deckHtml, splendorStyles } from './shared.js';
import { paymentFor } from './engine.js';

const ALL = [...COLORS, GOLD];
let ui = { key: '', picks: [], selected: null, give: {} };

export function renderPlayer(el, ctx) {
  const { state: s, me, players, sendAction } = ctx;
  splendorStyles();
  if (!s.phase || s.phase === 'lobby' || !s.players) { el.innerHTML = ''; return; }
  const rerender = () => renderPlayer(el, ctx);

  // Reset local selections whenever the turn moves on.
  const key = `${s.turn}|${s.phase}|${s.log.length}|${s.log[0] || ''}`;
  if (ui.key !== key) ui = { key, picks: [], selected: null, give: {} };

  const pl = s.players[me];
  const myTurn = s.seats[s.turn] === me && s.phase !== 'over';
  const isVip = players[0]?.id === me;
  const total = pl ? ALL.reduce((a, c) => a + pl.tokens[c], 0) : 0;

  // ----- header -----
  let html = '';
  if (pl) {
    html += `<div class="sp-me">
      <h3><span>${pl.points} points</span><span class="small muted">${total}/10 gems</span></h3>
      <div class="sp-line"><span class="label">Gems</span>${ALL.filter((c) => pl.tokens[c]).map((c) => gem(c, pl.tokens[c], 'sm')).join('') || '<span class="small muted">none yet</span>'}</div>
      <div class="sp-line"><span class="label">Cards</span>${COLORS.filter((c) => pl.bonus[c]).map((c) => gem(c, pl.bonus[c], 'sm bonus')).join('') || '<span class="small muted">none yet</span>'}</div>
    </div>`;
  } else {
    html += '<div class="sp-me"><h3>Watching</h3><p class="small muted">Splendor seats 4. You can follow along here.</p></div>';
  }

  if (s.phase === 'over') {
    html += `<div class="display-l center">${s.winner === me ? 'You win! 🎉' : `${esc(nameOf(s.winner, players))} wins`}</div>`;
    if (isVip) html += '<div class="row-center"><button class="btn btn-primary btn-big" id="sp-again">Play again</button></div>';
  } else if (!myTurn) {
    html += `<p class="center"><strong>${esc(nameOf(s.seats[s.turn], players))}</strong> is taking their turn${s.finalRound ? ' · final round' : ''}.</p>`;
  } else {
    html += `<div class="display-l center" style="margin:.25rem 0">${s.phase === 'discard' ? 'Too many gems' : 'Your turn'}</div>`;
  }
  if (s.error?.to === me) html += `<div class="sp-err">${esc(s.error.text)}</div>`;

  // ----- discard -----
  if (myTurn && s.phase === 'discard') {
    const excess = total - 10;
    const chosen = ALL.reduce((a, c) => a + (ui.give[c] || 0), 0);
    html += `<p>Return ${excess} gem${excess > 1 ? 's' : ''} to the bank. Tap to choose.</p>
      <div class="sp-picker">${ALL.map((c) => `<button data-give="${c}" ${pl.tokens[c] - (ui.give[c] || 0) <= 0 ? 'disabled' : ''}>${gem(c, pl.tokens[c] - (ui.give[c] || 0))}${ui.give[c] ? `<span class="sel">-${ui.give[c]}</span>` : ''}</button>`).join('')}</div>
      <div class="row-center"><button class="btn btn-ghost" id="sp-give-reset">Reset</button><button class="btn btn-primary btn-big" id="sp-give" ${chosen === excess ? '' : 'disabled'}>Return ${chosen}/${excess}</button></div>`;
  }

  // ----- take gems -----
  if (myTurn && s.phase === 'turn') {
    const count = (c) => ui.picks.filter((x) => x === c).length;
    html += `<div class="sp-section">Take gems: 3 different, or 2 of one color (if 4+ are left)</div>
      <div class="sp-picker">${COLORS.map((c) => `<button data-pick="${c}" ${s.bank[c] - count(c) <= 0 && !count(c) ? 'disabled' : ''}>${gem(c, s.bank[c] - count(c))}${count(c) ? `<span class="sel">+${count(c)}</span>` : ''}</button>`).join('')}
        <span>${gem(GOLD, s.bank[GOLD])}</span></div>
      ${ui.picks.length ? `<div class="row-center"><button class="btn btn-ghost" id="sp-clear">Clear</button><button class="btn btn-primary" id="sp-take">Take ${ui.picks.length} gem${ui.picks.length > 1 ? 's' : ''}</button></div>` : ''}`;
  }

  // ----- selected card sheet -----
  if (ui.selected) {
    const sel = ui.selected;
    let card = null, where = '';
    if (sel.tier) where = 'deck';
    else {
      for (const t of [1, 2, 3]) card ||= s.market[t].find((c) => c.id === sel.id);
      if (card) where = 'market';
      else if (pl) { card = pl.reserved.find((c) => c.id === sel.id); where = card ? 'reserved' : ''; }
    }
    if (where) {
      const canAct = myTurn && s.phase === 'turn' && pl;
      const pay = card && pl ? paymentFor(pl, card) : null;
      const payText = pay ? ALL.filter((c) => pay[c]).map((c) => gem(c, pay[c], 'sm')).join('') || 'free!' : '';
      html += `<div class="sp-sheet">
        ${where === 'deck' ? deckHtml(sel.tier, s.decks[sel.tier].length) : cardHtml(card)}
        <div class="btns">
          ${where === 'deck' ? `<strong>Tier ${sel.tier} deck</strong><span class="small">Reserve the top card without seeing it.</span>` : ''}
          ${canAct && where !== 'deck' ? (pay ? `<span class="small">You'd pay: ${payText}</span><button class="btn btn-primary" id="sp-buy">Buy</button>` : '<span class="small">You can\'t afford this yet.</span>') : ''}
          ${canAct && where !== 'reserved' ? `<button class="btn btn-ghost" id="sp-reserve" ${pl.reserved.length >= 3 ? 'disabled' : ''}>Reserve${s.bank[GOLD] ? ' (+1 gold)' : ''}</button>` : ''}
          <button class="link" id="sp-close">Close</button>
        </div>
      </div>`;
    }
  }

  // ----- market -----
  const affordable = (c) => pl && paymentFor(pl, c);
  html += `<div class="sp-phone">
    ${[3, 2, 1].map((t) => `<div class="sp-row">${deckHtml(t, s.decks[t].length, `data-tier="${t}"`)}${s.market[t].map((c) => cardHtml(c, { attrs: `data-card="${c.id}"`, cls: `${ui.selected?.id === c.id ? 'selected' : ''} ${myTurn && affordable(c) ? 'can-buy' : ''}` })).join('')}</div>`).join('')}
    ${pl?.reserved.length ? `<div class="sp-section">Your reserved cards</div><div class="sp-row">${pl.reserved.map((c) => cardHtml(c, { attrs: `data-card="${c.id}"`, cls: `${ui.selected?.id === c.id ? 'selected' : ''} ${myTurn && affordable(c) ? 'can-buy' : ''}` })).join('')}</div>` : ''}
  </div>`;

  el.innerHTML = html;

  // ----- wiring -----
  el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
    const c = b.dataset.pick;
    const p = ui.picks;
    const dup = p.length === 2 && p[0] === p[1];
    if (p.includes(c)) {
      if (p.length === 1 && s.bank[c] >= 4) ui.picks = [c, c];
      else if (dup) ui.picks = [];
      else ui.picks = p.filter((x) => x !== c);
    } else if (dup) ui.picks = [c];
    else if (p.length < 3) ui.picks = [...p, c];
    rerender();
  }));
  el.querySelector('#sp-clear')?.addEventListener('click', () => { ui.picks = []; rerender(); });
  el.querySelector('#sp-take')?.addEventListener('click', () => sendAction('game:take', { colors: ui.picks }));
  el.querySelectorAll('[data-card]').forEach((d) => (d.onclick = () => { ui.selected = { id: d.dataset.card }; rerender(); }));
  el.querySelectorAll('[data-tier]').forEach((d) => (d.onclick = () => { ui.selected = { tier: Number(d.dataset.tier) }; rerender(); }));
  el.querySelector('#sp-close')?.addEventListener('click', () => { ui.selected = null; rerender(); });
  el.querySelector('#sp-buy')?.addEventListener('click', () => sendAction('game:buy', { cardId: ui.selected.id }));
  el.querySelector('#sp-reserve')?.addEventListener('click', () =>
    sendAction('game:reserve', ui.selected.tier ? { tier: ui.selected.tier } : { cardId: ui.selected.id }));
  el.querySelectorAll('[data-give]').forEach((b) => (b.onclick = () => {
    const c = b.dataset.give;
    const excess = total - 10;
    const chosen = ALL.reduce((a, x) => a + (ui.give[x] || 0), 0);
    if (chosen < excess) { ui.give[c] = (ui.give[c] || 0) + 1; rerender(); }
  }));
  el.querySelector('#sp-give-reset')?.addEventListener('click', () => { ui.give = {}; rerender(); });
  el.querySelector('#sp-give')?.addEventListener('click', () => sendAction('game:discard', { tokens: ui.give }));
  el.querySelector('#sp-again')?.addEventListener('click', () => sendAction('game:play-again'));
}
