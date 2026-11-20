// Rail Baron rules. Runs on the host screen. Everything is public (it's an open-information game).
import { BaseGameEngine } from '../../js/engine-base.js';
import { shuffle } from '../../js/ui.js';
import {
  NET, RR, RR_IDS, REGION_TABLE, CITY_TABLES, roll3, lookup, regionOf, payoff, routeOptions, turnFees, walk,
  START_CASH, EXPRESS, SUPERCHIEF, ROVER, WIN_CASH,
} from './rules.js';
import { REGIONS } from './network.js';

const money = (n) => `$${n.toLocaleString('en-US')}`;
const SC_DISCOUNT = { 4: 36000, 5: 32000, 6: 28000 };
const NET_WORTH_TARGET = { 2: 300000, 3: 300000, 4: 250000, 5: 225000, 6: 200000 };

export default class RailBaronEngine extends BaseGameEngine {
  onInit() {
    this.rand = Math.random;
    this.state = {
      phase: 'lobby',        // lobby | setup | play | over
      options: { cheaperSuperchief: false, netWorthGoal: false },
      seats: [], turn: 0, step: '', p: {}, owners: {}, allSold: false,
      dice: null, moveRoll: 0, bonus: null, bonusUsed: false, turnRRs: [], routes: [],
      arrived: null, buyFor: null, owe: 0, auction: null, regionRoll: null,
      log: [], winner: '', dead: [], round: 0,
    };
  }

  // ---------- helpers ----------
  P(id) { return this.state.p[id]; }
  cur() { return this.P(this.state.seats[this.state.turn]); }
  name(id) { return this.players.find((x) => x.id === id)?.name || 'Someone'; }
  say(msg) { this.state.log.unshift(msg); this.state.log = this.state.log.slice(0, 12); }
  active() { return this.state.seats.filter((id) => !this.P(id).out); }
  scPrice() { const n = this.state.seats.length; return this.state.options.cheaperSuperchief ? (SC_DISCOUNT[n] || SUPERCHIEF) : SUPERCHIEF; }
  worth(pl) {
    if (!this.state.options.netWorthGoal) return pl.cash;
    return pl.cash + pl.rrs.reduce((n, r) => n + RR[r].price, 0) + (pl.express ? EXPRESS : 0) + (pl.superchief ? this.scPrice() : 0);
  }
  target() { return this.state.options.netWorthGoal ? (NET_WORTH_TARGET[this.state.seats.length] || WIN_CASH) : WIN_CASH; }

  rollDestination(regionOverride) {
    const s = this.state;
    const pl = this.cur();
    let region = regionOverride;
    if (!region) {
      const d = roll3(this.rand);
      region = lookup(REGION_TABLE, d);
      s.regionRoll = { dice: d, region };
      if (pl.city && region === regionOf(pl.city)) {
        s.step = 'pick-region';
        this.say(`${this.name(pl.id)} rolled ${region}, their own region, so they may pick any region.`);
        return null;
      }
    }
    const d2 = roll3(this.rand);
    const city = lookup(CITY_TABLES[region], d2);
    s.dice = d2;
    return city;
  }

  // ---------- lifecycle ----------
  onGameStart() {
    super.onGameStart();
    const s = this.state;
    s.seats = shuffle(this.players.map((x) => x.id)).slice(0, 6);
    s.phase = 'setup';
    this.sync();
  }

  begin() {
    const s = this.state;
    s.p = {};
    const homes = new Set();
    for (const id of s.seats) {
      let home;
      do { home = lookup(CITY_TABLES[lookup(REGION_TABLE, roll3(this.rand))], roll3(this.rand)); } while (homes.has(home));
      homes.add(home);
      s.p[id] = {
        id, cash: START_CASH, home, city: home, pos: NET.byPlace[home], dest: null, alt: null, tripFrom: null, used: [],
        express: false, superchief: false, rrs: [], declared: false, out: false, grand: null,
      };
      this.say(`${this.name(id)}'s home city is ${home}.`);
    }
    Object.assign(s, { phase: 'play', owners: {}, allSold: false, turn: 0, winner: '', dead: [], round: s.round + 1 });
    this.startTurn();
  }

  startTurn() {
    const s = this.state;
    const pl = this.cur();
    Object.assign(s, { buyOpts: [], fees: null, turnRRs: [], bonus: null, bonusUsed: false, routes: [], arrived: null, buyFor: null, owe: 0, auction: null, dice: null, regionRoll: null });
    if (pl.dest) { s.step = 'roll'; return; }
    this.needDestination(false);
  }

  /** Ready to start a new trip. withBonus = the bonus roll will move toward it right away. */
  needDestination(withBonus) {
    const s = this.state;
    const pl = this.cur();
    s.pendingBonusTrip = withBonus;
    if (!pl.declared && this.worth(pl) >= this.target()) { s.step = 'declare'; return; }
    s.step = 'dest';
  }

  setDestination(city) {
    const s = this.state;
    const pl = this.cur();
    if (city === pl.city) {
      this.say(`${this.name(pl.id)} rolled ${city}, where they already are, and loses the turn.`);
      return this.endTurn();
    }
    pl.tripFrom = pl.city;
    pl.used = [];
    if (pl.declared) { pl.alt = city; pl.dest = pl.home; this.say(`${this.name(pl.id)} declared! They're racing home to ${pl.home}. (Alternate destination: ${city}.)`); }
    else { pl.dest = city; this.say(`${this.name(pl.id)} is headed to ${city}. The trip pays ${money(payoff(pl.city, city))}.`); }
    if (s.pendingBonusTrip) { s.pendingBonusTrip = false; this.prepareMove(s.bonus); s.bonus = null; s.bonusUsed = true; }
    else s.step = 'roll';
  }

  prepareMove(steps, via = null) {
    const s = this.state;
    const pl = this.cur();
    s.moveRoll = steps;
    const declared = this.active().map((id) => this.P(id)).find((q) => q.declared && q.id !== pl.id);
    s.routes = routeOptions({
      me: pl.id, from: pl.pos, to: NET.byPlace[pl.dest], used: pl.used, roll: steps, owners: s.owners, allSold: s.allSold, grand: pl.grand,
      chase: declared ? { node: declared.pos, name: this.name(declared.id) } : null, via,
    });
    if (via != null) { const v = s.routes.find((r) => r.key === 'via'); if (v) s.routes = [v, ...s.routes.filter((r) => r !== v)]; }
    if (!s.routes.length) {
      // The destination changed mid-trip (a rover play or an ended declaration) and the used track boxes the
      // pawn in. Let it reuse track rather than strand it.
      if (typeof process !== 'undefined' && process.env?.RB_DEBUG) console.log('boxed in', pl.id, pl.dest, pl.used.length);
      pl.used = [];
      s.routes = routeOptions({ me: pl.id, from: pl.pos, to: NET.byPlace[pl.dest], used: [], roll: steps, owners: s.owners, allSold: s.allSold, grand: pl.grand });
    }
    s.step = 'route';
  }

  move(option) {
    const s = this.state;
    const pl = this.cur();
    const edges = option.edges.slice(0, option.steps);
    const nodes = walk(pl.pos, edges);
    for (let k = 0; k < edges.length; k++) {
      const e = edges[k], node = nodes[k + 1];
      pl.used.push(e);
      const rr = NET.edges[e].rr;
      if (!s.turnRRs.includes(rr)) s.turnRRs.push(rr);
      pl.pos = node;
      // Rover play: first pawn onto or through a declared player's dot.
      for (const id of this.active()) {
        const q = this.P(id);
        if (q.id !== pl.id && q.declared && q.pos === node) {
          const take = Math.min(ROVER, q.cash);
          q.cash -= take; pl.cash += take;
          q.declared = false; q.dest = q.alt;
          this.say(`ROVER! ${this.name(pl.id)} caught ${this.name(q.id)} and collects ${money(take)}. ${this.name(q.id)} must now go to ${q.alt}.`);
        }
      }
    }
    pl.city = NET.nodes[pl.pos].place || null;
    if (pl.pos === NET.byPlace[pl.dest]) return this.arrive();
    if (s.bonus != null && !s.bonusUsed) { s.bonusUsed = true; const b = s.bonus; s.bonus = null; this.say(`Bonus roll: ${b}!`); return this.prepareMove(b); }
    this.endTurn();
  }

  arrive() {
    const s = this.state;
    const pl = this.cur();
    pl.city = pl.dest;
    if (pl.declared && pl.dest === pl.home) {
      pl.dest = null;
      s.arrived = { city: pl.home, home: true };
      return this.endTurn();
    }
    const pay = payoff(pl.tripFrom, pl.dest);
    pl.cash += pay;
    s.arrived = { city: pl.dest, pay };
    this.say(`${this.name(pl.id)} reached ${pl.dest} and collects ${money(pay)}.`);
    pl.dest = null; pl.alt = null; pl.used = [];
    s.step = 'buy';
    s.buyOpts = this.buyOptions(pl);
  }

  afterBuy() {
    const s = this.state;
    if (s.bonus != null && !s.bonusUsed) return this.needDestination(true);
    this.endTurn();
  }

  buyOptions(pl) {
    const s = this.state;
    const opts = RR_IDS.filter((r) => !s.owners[r] && RR[r].price <= pl.cash).map((r) => ({ id: r, name: RR[r].name, price: RR[r].price }));
    if (!pl.express && !pl.superchief && pl.cash >= EXPRESS) opts.push({ id: 'express', name: 'Express', price: EXPRESS });
    if (!pl.superchief && pl.cash >= this.scPrice()) opts.push({ id: 'superchief', name: 'Superchief', price: this.scPrice() });
    return opts;
  }

  endTurn() {
    const s = this.state;
    const pl = this.cur();
    const fees = turnFees(pl.id, s.turnRRs, s.owners, s.allSold, pl.grand);
    if (pl.grand && !(s.turnRRs.length === 1 && s.turnRRs[0] === pl.grand.rr)) pl.grand = s.turnRRs.length ? null : pl.grand;
    s.fees = fees;
    s.owe = fees.total;
    return this.collect();
  }

  collect() {
    const s = this.state;
    const pl = this.cur();
    if (s.owe > pl.cash) {
      if (pl.rrs.length) { s.step = 'sell'; return; }
      // Broke with nothing left to sell: pay what you can and leave the game.
      this.payFees(pl.cash);
      pl.out = true;
      s.dead.push(pl.id);
      this.say(`${this.name(pl.id)} can't pay and is out of the game.`);
      const left = this.active();
      if (left.length === 1) return this.finish(left[0]);
      return this.next();
    }
    this.payFees(s.owe);
    if (s.owe) this.say(`${this.name(pl.id)} paid ${money(s.owe)} in fees.`);
    s.owe = 0;
    if (pl.declared && this.worth(pl) < this.target()) {
      pl.declared = false;
      if (pl.dest === pl.home && pl.alt) pl.dest = pl.alt;
      this.say(`${this.name(pl.id)} dropped below ${money(this.target())}, so the declaration ends.`);
    }
    if (pl.declared && pl.city === pl.home && !pl.dest && this.worth(pl) >= this.target()) return this.finish(pl.id);
    this.next();
  }

  payFees(amount) {
    const s = this.state;
    const pl = this.cur();
    let left = amount;
    pl.cash -= Math.min(pl.cash, amount);
    for (const [owner, fee] of Object.entries(s.fees?.owners || {})) {
      const paid = Math.min(fee, left);
      if (this.P(owner) && !this.P(owner).out) this.P(owner).cash += paid;
      left -= paid;
    }
  }

  next() {
    const s = this.state;
    for (let k = 0; k < s.seats.length; k++) {
      s.turn = (s.turn + 1) % s.seats.length;
      if (!this.cur().out) break;
    }
    this.startTurn();
  }

  finish(id) {
    const s = this.state;
    s.phase = 'over';
    s.winner = id;
    s.step = '';
    this.say(`${this.name(id)} made it home and is the RAIL BARON!`);
  }

  markOwned(rr, id) {
    const s = this.state;
    for (const pid of s.seats) this.P(pid).rrs = this.P(pid).rrs.filter((r) => r !== rr);
    if (id) { s.owners[rr] = id; this.P(id).rrs.push(rr); } else delete s.owners[rr];
    if (!s.allSold && RR_IDS.every((r) => s.owners[r])) {
      s.allSold = true;
      this.say('Every railroad is owned! Fees to other owners are now $10,000.');
      // Established rate: anyone already sitting on a line's dot keeps the old fee while they stay on that line.
      for (const pid of this.active()) {
        const q = this.P(pid);
        const last = q.used[q.used.length - 1];
        if (q.dest && last != null && !NET.nodes[q.pos].place) {
          const lineRR = NET.edges[last].rr;
          if (s.owners[lineRR] && s.owners[lineRR] !== pid) q.grand = { rr: lineRR, owner: s.owners[lineRR] };
        }
      }
    }
  }

  // ---------- auctions ----------
  startAuction(rr, seller) {
    const s = this.state;
    const i = s.seats.indexOf(seller);
    const order = [];
    for (let k = 1; k < s.seats.length; k++) { const id = s.seats[(i + k) % s.seats.length]; if (!this.P(id).out) order.push(id); }
    s.auction = { rr, seller, high: 0, bidder: '', order, at: 0, passes: 0 };
    s.step = 'auction';
    this.say(`${this.name(seller)} is auctioning the ${RR[rr].name}. Minimum bid ${money(RR[rr].price / 2)}.`);
    if (!order.length) this.closeAuction();
  }

  closeAuction() {
    const s = this.state;
    const a = s.auction;
    const seller = this.P(a.seller);
    if (a.bidder) {
      this.P(a.bidder).cash -= a.high; seller.cash += a.high;
      this.markOwned(a.rr, a.bidder);
      this.say(`${this.name(a.bidder)} wins the ${RR[a.rr].name} for ${money(a.high)}.`);
    } else {
      seller.cash += RR[a.rr].price / 2;
      this.markOwned(a.rr, null);
      this.say(`No bids. The bank buys the ${RR[a.rr].name} for ${money(RR[a.rr].price / 2)}.`);
    }
    s.auction = null;
    // Back to paying the fees the auction was for.
    const sellerIsCurrent = a.seller === this.cur().id;
    if (sellerIsCurrent) this.collect();
  }

  // ---------- actions ----------
  processAction(type, p, meta) {
    const s = this.state;
    const me = meta.playerId;
    const host = meta.isBoard || meta.isVip;
    const pl = s.phase === 'play' ? this.cur() : null;
    s.error = '';
    const mine = pl && pl.id === me;

    switch (type) {
      case 'game:option':
        if (s.phase !== 'setup' || !host || !(p.key in s.options)) return;
        s.options[p.key] = !!p.value;
        break;
      case 'game:begin':
        if (s.phase !== 'setup' || !host) return;
        this.begin();
        break;

      case 'game:declare':
        if (s.phase !== 'play' || s.step !== 'declare' || !mine) return;
        if (p.yes) {
          if (pl.city === pl.home) { pl.declared = true; this.finish(pl.id); break; }
          pl.declared = true;
        }
        s.step = 'dest';
        break;
      case 'game:roll-dest': {
        if (s.phase !== 'play' || s.step !== 'dest' || !mine) return;
        const city = this.rollDestination();
        if (city) this.setDestination(city);
        break;
      }
      case 'game:pick-region': {
        if (s.phase !== 'play' || s.step !== 'pick-region' || !mine || !REGIONS.includes(p.region)) return;
        this.setDestination(this.rollDestination(p.region));
        break;
      }
      case 'game:roll': {
        if (s.phase !== 'play' || s.step !== 'roll' || !mine) return;
        const d = roll3(this.rand);
        s.dice = d;
        const doubles = d.white[0] === d.white[1];
        const boxcars = doubles && d.white[0] === 6;
        if (boxcars || (pl.express && doubles) || pl.superchief) s.bonus = d.red;
        this.prepareMove(d.white[0] + d.white[1]);
        break;
      }
      case 'game:via': {
        if (s.phase !== 'play' || s.step !== 'route' || !mine || !(p.city in NET.byPlace)) return;
        this.prepareMove(s.moveRoll, NET.byPlace[p.city]);
        if (!s.routes.some((r) => r.key === 'via')) s.error = `There's no way through ${p.city} without reusing track this trip.`;
        break;
      }
      case 'game:route': {
        if (s.phase !== 'play' || s.step !== 'route' || !mine) return;
        const opt = s.routes.find((r) => r.key === p.key) || s.routes[0];
        if (!opt) return;
        this.move(opt);
        break;
      }
      case 'game:buy': {
        if (s.phase !== 'play' || s.step !== 'buy' || !mine) return;
        if (p.item) {
          const o = this.buyOptions(pl).find((x) => x.id === p.item);
          if (!o) return;
          pl.cash -= o.price;
          if (o.id === 'express') pl.express = true;
          else if (o.id === 'superchief') { pl.superchief = true; pl.express = false; }
          else this.markOwned(o.id, pl.id);
          this.say(`${this.name(pl.id)} bought the ${o.name} for ${money(o.price)}.`);
        }
        this.afterBuy();
        break;
      }
      case 'game:sell': {
        if (s.phase !== 'play' || s.step !== 'sell' || !mine || !pl.rrs.includes(p.rr)) return;
        if (p.how === 'auction') { this.startAuction(p.rr, pl.id); break; }
        pl.cash += RR[p.rr].price / 2;
        this.markOwned(p.rr, null);
        this.say(`${this.name(pl.id)} sold the ${RR[p.rr].name} to the bank for ${money(RR[p.rr].price / 2)}.`);
        this.collect();
        break;
      }
      case 'game:bid': {
        const a = s.auction;
        if (s.step !== 'auction' || !a || a.order[a.at] !== me) return;
        const min = Math.max(RR[a.rr].price / 2, a.high + 500);
        const amount = Math.round(Number(p.amount) / 500) * 500;
        if (!(amount >= min) || amount > this.P(me).cash) return;
        a.high = amount; a.bidder = me; a.passes = 0;
        a.at = (a.at + 1) % a.order.length;
        if (a.order.length === 1) this.closeAuction();
        break;
      }
      case 'game:pass-bid': {
        const a = s.auction;
        if (s.step !== 'auction' || !a || a.order[a.at] !== me) return;
        a.passes += 1;
        a.at = (a.at + 1) % a.order.length;
        if (a.order[a.at] === a.bidder && a.bidder) a.at = (a.at + 1) % a.order.length;
        const needed = a.bidder ? a.order.length - 1 : a.order.length;
        if (a.passes >= needed) this.closeAuction();
        break;
      }
      case 'game:new-game':
        if (s.phase !== 'over' || !host) return;
        s.phase = 'setup';
        break;
      default:
        return;
    }
    this.sync();
  }
}
