// Splendor rules. Runs on the host screen.
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import { COLORS, GOLD, buildDecks, allNobles } from './cards.js';

const ALL = [...COLORS, GOLD];
const WIN_POINTS = 15;
const MAX_TOKENS = 10;
const MAX_RESERVED = 3;
const zero = () => Object.fromEntries(ALL.map((c) => [c, 0]));
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/** What a player would pay for a card, or null if they can't afford it. */
export function paymentFor(player, card) {
  const pay = zero();
  let goldNeeded = 0;
  for (const c of COLORS) {
    const need = Math.max(0, (card.cost[c] || 0) - (player.bonus[c] || 0));
    const use = Math.min(need, player.tokens[c]);
    pay[c] = use;
    goldNeeded += need - use;
  }
  if (goldNeeded > player.tokens[GOLD]) return null;
  pay[GOLD] = goldNeeded;
  return pay;
}

export default class SplendorEngine extends BaseGameEngine {
  onInit() {
    this.state = {
      phase: 'lobby',      // lobby | turn | discard | over
      seats: [], turn: 0,
      bank: zero(), market: { 1: [], 2: [], 3: [] }, decks: { 1: [], 2: [], 3: [] },
      nobles: [], players: {},
      finalRound: false, winner: '', log: [], error: null,
    };
  }

  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = this.players.slice(0, 4).map((p) => p.id);
    const n = s.seats.length;
    const gems = n <= 2 ? 4 : n === 3 ? 5 : 7;
    s.bank = { ...Object.fromEntries(COLORS.map((c) => [c, gems])), [GOLD]: 5 };
    const decks = buildDecks();
    for (const t of [1, 2, 3]) {
      s.decks[t] = shuffle(decks[t]);
      s.market[t] = s.decks[t].splice(0, 4);
    }
    s.nobles = shuffle(allNobles()).slice(0, n + 1);
    s.players = Object.fromEntries(s.seats.map((id) => [id, {
      tokens: zero(), bonus: Object.fromEntries(COLORS.map((c) => [c, 0])),
      points: 0, cards: 0, reserved: [], nobles: [],
    }]));
    Object.assign(s, { phase: 'turn', turn: 0, finalRound: false, winner: '', log: [], error: null });
    this.sync();
  }

  get current() { return this.state.seats[this.state.turn]; }
  log(text) { this.state.log.unshift(text); this.state.log.length = Math.min(this.state.log.length, 6); }
  fail(id, text) { this.state.error = { to: id, text }; }
  nameOf(id) { return this.players.find((p) => p.id === id)?.name || 'Someone'; }

  findMarketCard(cardId) {
    for (const t of [1, 2, 3]) {
      const i = this.state.market[t].findIndex((c) => c.id === cardId);
      if (i !== -1) return { tier: t, index: i, card: this.state.market[t][i] };
    }
    return null;
  }

  refill(tier, index) {
    const s = this.state;
    const next = s.decks[tier].shift();
    if (next) s.market[tier][index] = next;
    else s.market[tier].splice(index, 1);
  }

  // ---------- actions ----------
  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    s.error = null;

    if (type === 'game:play-again') {
      if (s.phase === 'over' && (meta.isBoard || meta.isVip)) this.onGameStart();
      return;
    }
    if (type === 'game:skip' && meta.isBoard && (s.phase === 'turn' || s.phase === 'discard')) {
      // Host skips a player who left or is stuck. Extra gems go back automatically.
      const pl = s.players[this.current];
      while (sum(pl.tokens) > MAX_TOKENS) {
        const c = COLORS.reduce((best, x) => (pl.tokens[x] > pl.tokens[best] ? x : best), COLORS[0]);
        pl.tokens[c] -= 1; s.bank[c] += 1;
      }
      this.log(`${this.nameOf(this.current)} was skipped`);
      this.endTurn();
      this.sync();
      return;
    }
    if (me !== this.current) return;
    const pl = s.players[me];

    if (s.phase === 'discard') {
      if (type !== 'game:discard') return;
      const give = p.tokens || {};
      const excess = sum(pl.tokens) - MAX_TOKENS;
      const total = ALL.reduce((a, c) => a + Math.max(0, give[c] | 0), 0);
      if (total !== excess || ALL.some((c) => (give[c] | 0) > pl.tokens[c] || (give[c] | 0) < 0)) {
        this.fail(me, `Return exactly ${excess} gem${excess === 1 ? '' : 's'}.`);
      } else {
        for (const c of ALL) { pl.tokens[c] -= give[c] | 0; s.bank[c] += give[c] | 0; }
        this.endTurn();
      }
      this.sync();
      return;
    }
    if (s.phase !== 'turn') return;

    let done = false;
    switch (type) {
      case 'game:take': done = this.take(me, pl, p.colors || []); break;
      case 'game:reserve': done = this.reserve(me, pl, p); break;
      case 'game:buy': done = this.buy(me, pl, p.cardId); break;
      case 'game:pass': this.log(`${this.nameOf(me)} passed`); done = true; break;
      default: return;
    }
    if (done) {
      if (sum(pl.tokens) > MAX_TOKENS) s.phase = 'discard';
      else this.endTurn();
    }
    this.sync();
  }

  take(me, pl, colors) {
    const s = this.state;
    if (!colors.every((c) => COLORS.includes(c))) return false;
    if (colors.length === 2 && colors[0] === colors[1]) {
      const c = colors[0];
      if (s.bank[c] < 4) { this.fail(me, 'You can only take 2 of the same gem when there are 4 or more left.'); return false; }
      s.bank[c] -= 2; pl.tokens[c] += 2;
      this.log(`${this.nameOf(me)} took 2 ${c}`);
      return true;
    }
    const unique = [...new Set(colors)];
    if (unique.length !== colors.length || !colors.length || colors.length > 3) { this.fail(me, 'Take 3 different gems, or 2 of the same.'); return false; }
    if (colors.some((c) => s.bank[c] < 1)) { this.fail(me, 'One of those gems has run out.'); return false; }
    const available = COLORS.filter((c) => s.bank[c] > 0).length;
    if (colors.length < Math.min(3, available)) { this.fail(me, `Take ${Math.min(3, available)} different gems.`); return false; }
    for (const c of colors) { s.bank[c] -= 1; pl.tokens[c] += 1; }
    this.log(`${this.nameOf(me)} took ${colors.join(', ')}`);
    return true;
  }

  reserve(me, pl, { cardId, tier }) {
    const s = this.state;
    if (pl.reserved.length >= MAX_RESERVED) { this.fail(me, 'You can only hold 3 reserved cards.'); return false; }
    let card;
    if (cardId) {
      const found = this.findMarketCard(cardId);
      if (!found) return false;
      card = found.card;
      this.refill(found.tier, found.index);
    } else if ([1, 2, 3].includes(tier) && s.decks[tier].length) {
      card = s.decks[tier].shift();
    } else return false;
    pl.reserved.push(card);
    if (s.bank[GOLD] > 0) { s.bank[GOLD] -= 1; pl.tokens[GOLD] += 1; }
    this.log(`${this.nameOf(me)} reserved a ${cardId ? card.color : `tier ${card.tier}`} card`);
    return true;
  }

  buy(me, pl, cardId) {
    const s = this.state;
    const fromMarket = this.findMarketCard(cardId);
    const reservedIndex = pl.reserved.findIndex((c) => c.id === cardId);
    const card = fromMarket?.card || pl.reserved[reservedIndex];
    if (!card) return false;
    const pay = paymentFor(pl, card);
    if (!pay) { this.fail(me, "You can't afford that card yet."); return false; }
    for (const c of ALL) { pl.tokens[c] -= pay[c]; s.bank[c] += pay[c]; }
    if (fromMarket) this.refill(fromMarket.tier, fromMarket.index);
    else pl.reserved.splice(reservedIndex, 1);
    pl.bonus[card.color] += 1;
    pl.points += card.points;
    pl.cards += 1;
    this.log(`${this.nameOf(me)} bought a ${card.color} card${card.points ? ` (+${card.points})` : ''}`);
    return true;
  }

  endTurn() {
    const s = this.state;
    const me = this.current;
    const pl = s.players[me];
    // A noble visits if you meet their requirements (one per turn).
    const ni = s.nobles.findIndex((n) => Object.entries(n.need).every(([c, k]) => pl.bonus[c] >= k));
    if (ni !== -1) {
      const [noble] = s.nobles.splice(ni, 1);
      pl.nobles.push(noble);
      pl.points += noble.points;
      this.log(`A noble visited ${this.nameOf(me)} (+3)`);
    }
    if (pl.points >= WIN_POINTS && !s.finalRound) {
      s.finalRound = true;
      this.log(`${this.nameOf(me)} reached ${WIN_POINTS}! Finishing the round.`);
    }
    s.phase = 'turn';
    s.turn = (s.turn + 1) % s.seats.length;
    if (s.finalRound && s.turn === 0) this.finish();
  }

  finish() {
    const s = this.state;
    const ranked = [...s.seats].sort((a, b) =>
      s.players[b].points - s.players[a].points || s.players[a].cards - s.players[b].cards);
    s.winner = ranked[0];
    s.phase = 'over';
  }

  onPlayerLeave(id) {
    // Leaving players keep their seat (they can rejoin from the same tab).
    // If it's their turn, the board can skip them.
    this.sync();
  }
}
