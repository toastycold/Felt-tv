// Rail Baron rules helpers: destination tables, payoffs, routes and fees.
import { buildNetwork, REGIONS } from './network.js';
import { CUSTOM_PAYOFFS } from './payoffs.js';

export const NET = buildNetwork();
export const RR = Object.fromEntries(NET.railroads.map((r) => [r.id, r]));
export const RR_IDS = NET.railroads.map((r) => r.id);
export const START_CASH = 20000, EXPRESS = 4000, SUPERCHIEF = 40000, ROVER = 50000;
export const BANK_FEE = 1000, OWNER_FEE = 5000, OWNER_FEE_ALL_SOLD = 10000, WIN_CASH = 200000;

// ---------- destination tables: the 1977 rulebook's, see tables.js ----------
export { REGION_TABLE, CITY_TABLES, ABBR } from './tables.js';
import { REGION_TABLE, CITY_TABLES } from './tables.js';

export const roll3 = (rand = Math.random) => ({ white: [1 + Math.floor(rand() * 6), 1 + Math.floor(rand() * 6)], red: 1 + Math.floor(rand() * 6) });
export const lookup = (table, dice) => table[dice.red % 2 ? 'odd' : 'even'][dice.white[0] + dice.white[1]];
export const regionOf = (city) => NET.nodes[NET.byPlace[city]]?.region;

// ---------- distances and payoffs ----------
const dist = {};
function bfs(src) {
  const d = new Array(NET.nodes.length).fill(-1);
  d[src] = 0;
  const q = [src];
  for (let i = 0; i < q.length; i++) {
    const v = q[i];
    for (const e of NET.adj[v]) { const E = NET.edges[e]; const w = E.a === v ? E.b : E.a; if (d[w] < 0) { d[w] = d[v] + 1; q.push(w); } }
  }
  return d;
}
for (const c of NET.cities) dist[c] = bfs(NET.byPlace[c]);

/** Payoff for a trip between two cities. Your own chart numbers (payoffs.js) win if present. */
export function payoff(from, to) {
  const custom = CUSTOM_PAYOFFS[`${from}|${to}`] ?? CUSTOM_PAYOFFS[`${to}|${from}`];
  if (typeof custom === 'number') return custom;
  const dots = dist[from]?.[NET.byPlace[to]] ?? 0;
  return Math.max(1500, Math.round(dots * 2) * 500);
}

// ---------- routes ----------
const other = (E, v) => (E.a === v ? E.b : E.a);

/** Cheapest path by a cost function, never reusing edges in `blocked`. Returns edge ids or null. */
export function findPath(from, to, blocked, cost) {
  const n = NET.nodes.length;
  const best = new Float64Array(n).fill(Infinity), via = new Int32Array(n).fill(-1);
  best[from] = 0;
  const open = [[0, from]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, v] = open.splice(bi, 1)[0];
    if (c > best[v]) continue;
    if (v === to) break;
    for (const e of NET.adj[v]) {
      if (blocked.has(e) || e === via[v]) continue;
      const E = NET.edges[e], w = other(E, v), nc = c + cost(E, v, via[v] >= 0 ? NET.edges[via[v]] : null);
      if (nc < best[w]) { best[w] = nc; via[w] = e; open.push([nc, w]); }
    }
  }
  if (!Number.isFinite(best[to])) return null;
  const path = [];
  for (let v = to; v !== from; ) { const e = via[v]; path.push(e); v = other(NET.edges[e], v); }
  return path.reverse();
}

/** Nodes visited by following a list of edges from a start node. */
export function walk(from, edges) {
  const nodes = [from];
  let v = from;
  for (const e of edges) { v = other(NET.edges[e], v); nodes.push(v); }
  return nodes;
}

/**
 * Fees for one turn's movement. owners: rr -> player id. Returns { total, bank, owners: {id: amount} }.
 * grand: { rr, owner } when the "established rate" protection applies.
 */
export function turnFees(me, rrsUsed, owners, allSold, grand) {
  const res = { total: 0, bank: 0, owners: {} };
  if (!rrsUsed.length) return res;
  if (rrsUsed.some((rr) => !owners[rr] || owners[rr] === me)) res.bank = BANK_FEE;
  for (const rr of rrsUsed) {
    const o = owners[rr];
    if (!o || o === me || res.owners[o]) continue;
    const protectedRate = grand && rrsUsed.length === 1 && rrsUsed[0] === grand.rr && grand.owner === o;
    res.owners[o] = allSold && !protectedRate ? OWNER_FEE_ALL_SOLD : OWNER_FEE;
  }
  res.total = res.bank + Object.values(res.owners).reduce((a, b) => a + b, 0);
  return res;
}

/**
 * Route choices to show the player. Each: { key, label, edges, total, steps, fee, rrs }.
 * steps = how many dots this move covers (the roll, or fewer if it reaches the end).
 */
export function routeOptions({ me, from, to, used, roll, owners, allSold, grand, chase = null, via = null }) {
  const blocked = new Set(used);
  const foreign = (rr) => owners[rr] && owners[rr] !== me;
  const switchCost = (E, prev) => (prev && prev.rr !== E.rr ? 0.35 : 0);
  const variants = [
    { key: 'short', label: 'Fewest dots', cost: (E, v, prev) => 1 + switchCost(E, prev) * 0.1 },
    { key: 'cheap', label: 'Cheapest fees', cost: (E, v, prev) => 1 + (foreign(E.rr) ? 2.6 : 0) + switchCost(E, prev) * (foreign(E.rr) ? 3 : 1) },
    { key: 'mine', label: 'Stay on your lines', cost: (E, v, prev) => (owners[E.rr] === me ? 0.45 : foreign(E.rr) ? 4 : 1.3) + switchCost(E, prev) },
  ];
  const out = [];
  const add = (key, label, edges) => {
    if (!edges) return;
    const sig = edges.join(',');
    if (out.some((o) => o.sig === sig)) return;
    const steps = Math.min(roll, edges.length);
    const move = edges.slice(0, steps);
    const rrs = [...new Set(move.map((e) => NET.edges[e].rr))];
    const fee = turnFees(me, rrs, owners, allSold, grand).total;
    out.push({ key, label, sig, edges, total: edges.length, steps, fee, rrs });
  };
  for (const v of variants) add(v.key, v.label, findPath(from, to, blocked, v.cost));
  // A genuinely different way: steer off the main route's railroads.
  if (out[0]) {
    const mainRRs = new Set(out[0].rrs.length ? out[0].edges.map((e) => NET.edges[e].rr) : []);
    add('alt', 'A different way', findPath(from, to, blocked, (E, v, prev) => 1 + (mainRRs.has(E.rr) ? 3 : 0) + switchCost(E, prev) * 0.2));
  }
  const through = (node, key, label) => {
    const leg1 = findPath(from, node, blocked, variants[0].cost);
    if (!leg1) return;
    const leg2 = findPath(node, to, new Set([...blocked, ...leg1]), variants[0].cost);
    if (leg2) add(key, label, [...leg1, ...leg2]);
  };
  if (via != null && via !== from && via !== to) through(via, 'via', `Through ${NET.nodes[via].place}`);
  if (chase != null && chase.node !== from) through(chase.node, 'chase', `Catch ${chase.name} (rover!)`);
  return out.map(({ sig, ...o }) => o);
}
