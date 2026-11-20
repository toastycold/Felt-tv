// Builds the playable network from map-data: places become interchange dots, and each railroad
// gets its own run of dots between places, spaced by real distance.
import { PLACES, RAILROADS, REGIONS } from './map-data.js';

export const MILES_PER_DOT = 49.8;
export { REGIONS };

function miles([la1, lo1], [la2, lo2]) {
  const R = 3959, r = Math.PI / 180;
  const a = Math.sin(((la2 - la1) * r) / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(((lo2 - lo1) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Map projection used by the TV and phones: x 0..1000, y 0..620. */
export function project(lat, lon) {
  const lat0 = 37.5, x = (lon + 96.5) * Math.cos(lat0 * Math.PI / 180), y = lat;
  return [500 + x * 19.6, 620 - (y - 24.2) * 24.5];
}

export function buildNetwork() {
  const nodes = [];   // { id, x, y, place?, region?, pop? }
  const byPlace = {};
  for (const [name, [lat, lon, region, pop]] of Object.entries(PLACES)) {
    const [x, y] = project(lat, lon);
    const id = nodes.length;
    nodes.push({ id, x, y, place: name, region: region || null, pop: pop || 0, city: !!region });
    byPlace[name] = id;
  }
  const edges = [];   // { id, a, b, rr }
  const adj = nodes.map(() => []);
  const pairCount = {};
  const addEdge = (a, b, rr) => {
    const id = edges.length;
    edges.push({ id, a, b, rr });
    adj[a].push(id); adj[b].push(id);
  };
  const problems = [];
  RAILROADS.forEach((rr, ri) => {
    rr.index = ri;
    for (const strand of rr.routes) {
      for (let k = 0; k < strand.length - 1; k++) {
        const A = strand[k], B = strand[k + 1];
        if (!(A in byPlace) || !(B in byPlace)) { problems.push(`${rr.id}: unknown place ${A in byPlace ? B : A}`); continue; }
        const key = [A, B].sort().join('|');
        const lane = (pairCount[key] = (pairCount[key] || 0) + 1) - 1;
        const pa = PLACES[A], pb = PLACES[B];
        const steps = Math.max(1, Math.round((miles(pa, pb) * 1.15) / MILES_PER_DOT));
        const na = nodes[byPlace[A]], nb = nodes[byPlace[B]];
        // Parallel lines between the same two places bow apart so you can see each one.
        const dx = nb.x - na.x, dy = nb.y - na.y, len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const bow = lane === 0 ? 0 : (lane % 2 ? 1 : -1) * Math.ceil(lane / 2) * Math.min(9, len * 0.12);
        let prev = byPlace[A];
        for (let s = 1; s < steps; s++) {
          const t = s / steps, curve = Math.sin(Math.PI * t) * bow;
          const id = nodes.length;
          nodes.push({ id, x: na.x + dx * t + nx * curve, y: na.y + dy * t + ny * curve, place: null, region: null, rr: rr.id });
          adj.push([]);
          addEdge(prev, id, rr.id);
          prev = id;
        }
        addEdge(prev, byPlace[B], rr.id);
      }
    }
  });
  const cities = nodes.filter((n) => n.city).map((n) => n.place);
  return { nodes, edges, adj, byPlace, cities, problems, railroads: RAILROADS };
}
